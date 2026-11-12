package com.rahul.gymlog;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

/**
 * Notifications you can act on from the notification panel, without opening the app:
 *  - Water: "Drank a glass" adds a glass, reminders are spread over the day until the goal.
 *  - Workout: "Set done" / "Done" ticks the current exercise and starts the rest countdown.
 *  - Planned reminders (workout, steps, sleep) with Start / Snooze buttons.
 * The app sends its state here (sync), taps are kept in a queue, and the app applies them
 * the next time it runs (drain). Everything is stored in SharedPreferences.
 */
public class FitNotify {

    static final String PREFS = "fit_notify";
    static final String CH_REMIND = "fit_remind";
    static final String CH_WORKOUT = "fit_workout";

    static final int ID_WATER = 8100, ID_WORKOUT = 8200, ID_PLAN = 8300, ID_SHOW = 8900;

    static final String A_PLAN = "com.rahul.gymlog.PLAN";
    static final String A_WATER = "com.rahul.gymlog.WATER";
    static final String A_WATER_ADD = "com.rahul.gymlog.WATER_ADD";
    static final String A_WATER_SNOOZE = "com.rahul.gymlog.WATER_SNOOZE";
    static final String A_SET = "com.rahul.gymlog.SET_DONE";
    static final String A_ITEM = "com.rahul.gymlog.ITEM_DONE";
    static final String A_REST_OVER = "com.rahul.gymlog.REST_OVER";
    static final String A_START = "com.rahul.gymlog.START_WORKOUT";
    static final String A_SNOOZE = "com.rahul.gymlog.SNOOZE";
    static final String A_UNDO = "com.rahul.gymlog.UNDO";

    static final long MIN = 60_000L;

    /** The running plugin, so a tap can tell the open app to pick up its queue right away. */
    static FitNotifyPlugin live;

    /* ---------- storage ---------- */

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static JSONObject state(Context c) {
        try { return new JSONObject(prefs(c).getString("state", "{}")); } catch (JSONException e) { return new JSONObject(); }
    }

    static void saveState(Context c, JSONObject s) { prefs(c).edit().putString("state", s.toString()).apply(); }

    static String today() { return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date()); }

    static synchronized void queue(Context c, JSONObject ev) {
        JSONArray q;
        try { q = new JSONArray(prefs(c).getString("queue", "[]")); } catch (JSONException e) { q = new JSONArray(); }
        q.put(ev);
        prefs(c).edit().putString("queue", q.toString()).commit();
        if (live != null) live.ping();
    }

    static synchronized JSONArray drain(Context c) {
        JSONArray q;
        try { q = new JSONArray(prefs(c).getString("queue", "[]")); } catch (JSONException e) { q = new JSONArray(); }
        prefs(c).edit().putString("queue", "[]").commit();
        return q;
    }

    static boolean on(JSONObject s) { return s.optBoolean("on", true); }

    /* ---------- notification basics ---------- */

    static void channels(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm.getNotificationChannel(CH_REMIND) == null) {
            NotificationChannel ch = new NotificationChannel(CH_REMIND, "Reminders and rest timer", NotificationManager.IMPORTANCE_HIGH);
            ch.enableVibration(true);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(CH_WORKOUT) == null) {
            nm.createNotificationChannel(new NotificationChannel(CH_WORKOUT, "Workout in progress", NotificationManager.IMPORTANCE_LOW));
        }
    }

    static PendingIntent openApp(Context c, int req) {
        Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
        if (open == null) return null;
        open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent action(Context c, String act, int req, String id, int extra) {
        Intent i = new Intent(c, FitReceiver.class).setAction(act);
        if (id != null) i.putExtra("id", id);
        i.putExtra("n", extra);
        return PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static NotificationCompat.Builder builder(Context c, String channel, int id, String title, String text) {
        channels(c);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, channel)
            .setSmallIcon(SummaryReceiver.smallIcon(c))
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(CH_REMIND.equals(channel) ? NotificationCompat.PRIORITY_HIGH : NotificationCompat.PRIORITY_LOW);
        PendingIntent pi = openApp(c, id);
        if (pi != null) b.setContentIntent(pi);
        return b;
    }

    static void post(Context c, int id, Notification n) {
        NotificationManagerCompat m = NotificationManagerCompat.from(c);
        if (!m.areNotificationsEnabled()) return;
        try { m.notify(id, n); } catch (SecurityException ignored) { }
    }

    static void cancel(Context c, int id) { NotificationManagerCompat.from(c).cancel(id); }

    static void alarm(Context c, String act, int req, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, FitReceiver.class).setAction(act);
        PendingIntent pi = PendingIntent.getBroadcast(c, req, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        am.cancel(pi);
        if (at > 0) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }

    /** A plain one-off notification (test, "notifications are on"). */
    static void show(Context c, int id, String title, String text) {
        post(c, id, builder(c, CH_REMIND, id, title, text).setAutoCancel(true).build());
    }

    /* ---------- water ---------- */

    static int waterHave(JSONObject s) { return today().equals(s.optString("date")) ? s.optInt("water", 0) : 0; }

    static long atMinute(int dayOffset, int minute) {
        Calendar k = Calendar.getInstance();
        k.add(Calendar.DAY_OF_MONTH, dayOffset);
        k.set(Calendar.HOUR_OF_DAY, 0); k.set(Calendar.MINUTE, 0); k.set(Calendar.SECOND, 0); k.set(Calendar.MILLISECOND, 0);
        return k.getTimeInMillis() + minute * MIN;
    }

    /** Minutes between glasses: fixed, or (smart) the glasses left spread over the waking time left. */
    static int waterGap(JSONObject s, int have, long now) {
        int mode = s.optInt("waterMode", -1);
        if (mode > 0) return mode;
        int goal = s.optInt("waterGoal", 12), end = s.optInt("endMin", 1320);
        Calendar k = Calendar.getInstance();
        k.setTimeInMillis(now);
        int nowMin = k.get(Calendar.HOUR_OF_DAY) * 60 + k.get(Calendar.MINUTE);
        int left = Math.max(1, goal - have);
        return Math.max(30, Math.min(120, (end - nowMin) / left));
    }

    /** When the next water reminder is due, or 0 for none. */
    static long nextWater(Context c, JSONObject s) {
        int mode = s.optInt("waterMode", -1);
        if (mode == 0 || !on(s)) return 0;
        long now = System.currentTimeMillis();
        int start = s.optInt("startMin", 450), end = s.optInt("endMin", 1320), goal = s.optInt("waterGoal", 12);
        if (end <= start) end = Math.min(1439, start + 14 * 60);
        long tomorrow = atMinute(1, start);
        int have = waterHave(s);
        if (have >= goal) return tomorrow;
        long dayStart = atMinute(0, start), dayEnd = atMinute(0, end);
        if (now < dayStart) return dayStart;
        long snooze = prefs(c).getLong("waterSnooze", 0);
        if (snooze > now) return snooze;
        long last = Math.max(prefs(c).getLong("waterLast", 0), today().equals(s.optString("date")) ? s.optLong("waterAt", 0) : 0);
        long base = Math.max(last, dayStart);
        long next = Math.max(base + waterGap(s, have, now) * MIN, now + MIN);
        return next > dayEnd ? tomorrow : next;
    }

    static void scheduleWater(Context c) { alarm(c, A_WATER, 9001, nextWater(c, state(c))); }

    static void fireWater(Context c) {
        JSONObject s = state(c);
        prefs(c).edit().putLong("waterLast", System.currentTimeMillis()).remove("waterSnooze").apply();
        int have = waterHave(s), goal = s.optInt("waterGoal", 12);
        if (on(s) && s.optInt("waterMode", -1) != 0 && have < goal) {
            String text = have == 0 ? "Start your day with a glass. Goal " + goal + " glasses."
                : have + " of " + goal + " glasses so far. " + (goal - have) + " to go.";
            post(c, ID_WATER, builder(c, CH_REMIND, ID_WATER, "Drink a glass of water", text)
                .setAutoCancel(true)
                .addAction(0, "+1 glass", action(c, A_WATER_ADD, 9101, null, 1))
                .addAction(0, "+2 glasses", action(c, A_WATER_ADD, 9103, null, 2))
                .build());
        }
        scheduleWater(c);
    }

    /** Add (or with a negative n, take back) glasses straight from the notification. */
    static void addWater(Context c, int n) {
        JSONObject s = state(c);
        String day = today();
        int before = waterHave(s), have = Math.max(0, Math.min(20, before + n)), goal = s.optInt("waterGoal", 12);
        int delta = have - before;
        long now = System.currentTimeMillis();
        if (delta == 0) { cancel(c, ID_WATER); return; }
        try {
            s.put("date", day); s.put("water", have);
            if (delta > 0) s.put("waterAt", now);
            JSONObject ev = new JSONObject();
            ev.put("t", "water"); ev.put("date", day); ev.put("n", delta); ev.put("at", now);
            queue(c, ev);
        } catch (JSONException ignored) { }
        saveState(c, s);
        if (delta > 0) prefs(c).edit().putLong("waterLast", now).remove("waterSnooze").apply();
        String title = delta < 0 ? "Glass removed" : have >= goal ? "Water goal hit" : (delta == 1 ? "Glass logged" : delta + " glasses logged");
        String text = have >= goal && delta > 0 ? have + " of " + goal + " glasses. Well done."
            : have + " of " + goal + " glasses. Next reminder in about " + waterGap(s, have, now) + " min.";
        NotificationCompat.Builder b = builder(c, CH_WORKOUT, ID_WATER, title, text).setAutoCancel(true).setTimeoutAfter(15000);
        if (delta > 0) b.addAction(0, "Undo", action(c, A_WATER_ADD, 9102, null, -delta));
        else b.addAction(0, "+1 glass", action(c, A_WATER_ADD, 9101, null, 1));
        post(c, ID_WATER, b.build());
        scheduleWater(c);
    }

    static void snoozeWater(Context c, int minutes) {
        prefs(c).edit().putLong("waterSnooze", System.currentTimeMillis() + minutes * MIN).apply();
        cancel(c, ID_WATER);
        scheduleWater(c);
    }

    /* ---------- workout ---------- */

    static JSONObject todayWorkout(JSONObject s) {
        JSONObject all = s.optJSONObject("workouts");
        return all == null ? null : all.optJSONObject(today());
    }

    static boolean itemDone(JSONObject it) {
        if (it.optBoolean("done")) return true;
        JSONArray set = it.optJSONArray("set");
        if (set == null || set.length() == 0) return false;
        for (int i = 0; i < set.length(); i++) if (!set.optBoolean(i)) return false;
        return true;
    }

    static int setsDone(JSONObject it) {
        JSONArray set = it.optJSONArray("set");
        int n = 0;
        if (set != null) for (int i = 0; i < set.length(); i++) if (set.optBoolean(i)) n++;
        return n;
    }

    static JSONObject current(JSONObject w) {
        JSONArray items = w.optJSONArray("items");
        if (items == null) return null;
        for (int i = 0; i < items.length(); i++) { JSONObject it = items.optJSONObject(i); if (it != null && !itemDone(it)) return it; }
        return null;
    }

    static JSONObject find(JSONObject w, String id) {
        JSONArray items = w == null ? null : w.optJSONArray("items");
        if (items == null || id == null) return null;
        for (int i = 0; i < items.length(); i++) { JSONObject it = items.optJSONObject(i); if (it != null && id.equals(it.optString("id"))) return it; }
        return null;
    }

    /** The workout card in the panel: what is next, with Set done / Done buttons and the rest countdown. */
    static void postWorkout(Context c, boolean alert) {
        JSONObject s = state(c);
        if (!on(s)) return;
        JSONObject w = todayWorkout(s);
        long restEnd = prefs(c).getLong("restEnd", 0), now = System.currentTimeMillis();
        boolean resting = restEnd > now;
        String channel = alert ? CH_REMIND : CH_WORKOUT;

        if (w == null) {
            // Rest timer started in the app on a day without a planned workout.
            if (!resting && !alert) { cancel(c, ID_WORKOUT); return; }
            NotificationCompat.Builder b = builder(c, channel, ID_WORKOUT, resting ? "Resting" : "Rest over", resting ? prefs(c).getString("restName", "Rest") : "Next set.")
                .setOnlyAlertOnce(!alert).setAutoCancel(!resting);
            if (resting) b.setUsesChronometer(true).setChronometerCountDown(true).setWhen(restEnd).setShowWhen(true);
            post(c, ID_WORKOUT, b.build());
            return;
        }

        JSONArray items = w.optJSONArray("items");
        int total = items == null ? 0 : items.length(), done = 0;
        for (int i = 0; i < total; i++) if (itemDone(items.optJSONObject(i))) done++;
        JSONObject cur = current(w);
        String head = w.optString("title", "Workout");
        // Pick-your-own days: progress counts toward the day's goal (6, 7 or 8 exercises).
        int goal = w.optInt("goal", 0);
        if (goal > 0) {
            total = goal;
            done = Math.min(done, goal);
            if (done >= goal) cur = null;
            else if (cur == null) {
                NotificationCompat.Builder b = builder(c, alert ? CH_REMIND : CH_WORKOUT, ID_WORKOUT, head + " · " + done + " of " + goal + " done",
                    (goal - done) + " to go. Open the app and pick your next exercise.")
                    .setOnlyAlertOnce(!alert).setAutoCancel(false).setProgress(goal, done, false);
                if (resting) b.setUsesChronometer(true).setChronometerCountDown(true).setWhen(restEnd).setShowWhen(true).setSubText("Resting");
                if (today().equals(prefs(c).getString("undoDay", ""))) b.addAction(0, "Undo", action(c, A_UNDO, 9203, null, 0));
                post(c, ID_WORKOUT, b.build());
                return;
            }
        }

        if (cur == null) {
            if (prefs(c).getString("doneShown", "").equals(today())) { cancel(c, ID_WORKOUT); return; }
            prefs(c).edit().putString("doneShown", today()).apply();
            NotificationCompat.Builder done1 = builder(c, CH_REMIND, ID_WORKOUT, head + " complete", "All " + total + " items done. Great work. Refuel with protein.")
                .setAutoCancel(true).setTimeoutAfter(30 * MIN);
            if (today().equals(prefs(c).getString("undoDay", ""))) done1.addAction(0, "Undo", action(c, A_UNDO, 9203, null, 0));
            post(c, ID_WORKOUT, done1.build());
            return;
        }

        int sets = Math.max(1, cur.optInt("sets", 1)), sd = setsDone(cur);
        String name = cur.optString("name");
        String reps = cur.optString("reps", "");
        String title = head + " · " + done + " of " + total + " done";
        String text;
        if (resting) text = "Rest, then " + name + ": set " + (sd + 1) + " of " + sets + ".";
        else if (alert) text = "Rest over. " + name + ": set " + (sd + 1) + " of " + sets + (reps.isEmpty() ? "" : ", " + reps) + ".";
        else if (sets > 1) text = "Now: " + name + ", set " + (sd + 1) + " of " + sets + (reps.isEmpty() ? "" : " (" + reps + ")") + ".";
        else text = "Now: " + name + (reps.isEmpty() ? "" : " (" + reps + ")") + ".";

        NotificationCompat.Builder b = builder(c, channel, ID_WORKOUT, title, text)
            .setOnlyAlertOnce(!alert)
            .setAutoCancel(false)
            .setProgress(Math.max(1, total), done, false);
        if (resting) b.setUsesChronometer(true).setChronometerCountDown(true).setWhen(restEnd).setShowWhen(true).setSubText("Resting");
        String id = cur.optString("id");
        if (sets > 1) {
            b.addAction(0, "Set " + (sd + 1) + " done", action(c, A_SET, 9201, id, 0));
            b.addAction(0, "Exercise done", action(c, A_ITEM, 9202, id, 0));
        } else {
            b.addAction(0, "Done", action(c, A_ITEM, 9202, id, 0));
        }
        if (today().equals(prefs(c).getString("undoDay", ""))) b.addAction(0, "Undo", action(c, A_UNDO, 9203, null, 0));
        post(c, ID_WORKOUT, b.build());
    }

    static void tick(Context c, String id, boolean wholeItem) {
        JSONObject s = state(c), w = todayWorkout(s), it = find(w, id);
        if (it == null) return;
        long now = System.currentTimeMillis();
        try {
            JSONObject ev = new JSONObject();
            ev.put("date", today()); ev.put("id", id); ev.put("at", now);
            int sets = Math.max(1, it.optInt("sets", 1));
            JSONArray set = it.optJSONArray("set");
            if (set == null) { set = new JSONArray(); it.put("set", set); }
            while (set.length() < sets) set.put(false);
            prefs(c).edit().putString("undoDay", today()).putString("undoId", id)
                .putString("undoSet", set.toString()).putBoolean("undoDone", it.optBoolean("done")).apply();
            if (wholeItem || sets <= 1) {
                for (int i = 0; i < sets; i++) set.put(i, true);
                it.put("done", true);
                ev.put("t", "done");
            } else {
                int i = 0;
                while (i < sets && set.optBoolean(i)) i++;
                if (i >= sets) return;
                set.put(i, true);
                ev.put("t", "set"); ev.put("i", i);
                if (i == sets - 1) it.put("done", true);
            }
            queue(c, ev);
            saveState(c, s);
            // Rest between sets of the same exercise, like the in-app timer.
            int rest = it.optInt("rest", 0);
            if (!itemDone(it) && rest > 0) startRest(c, now + rest * 1000L, it.optString("name"));
            else stopRest(c);
        } catch (JSONException ignored) { }
        postWorkout(c, false);
    }

    /** Take back the last tick made from the notification. */
    static void undo(Context c) {
        SharedPreferences p = prefs(c);
        if (!today().equals(p.getString("undoDay", ""))) return;
        String id = p.getString("undoId", "");
        JSONObject s = state(c), it = find(todayWorkout(s), id);
        p.edit().remove("undoDay").remove("doneShown").apply();
        if (it == null) return;
        try {
            JSONArray set = new JSONArray(p.getString("undoSet", "[]"));
            boolean done = p.getBoolean("undoDone", false);
            it.put("set", set); it.put("done", done);
            saveState(c, s);
            JSONObject ev = new JSONObject();
            ev.put("t", "undo"); ev.put("date", today()); ev.put("id", id); ev.put("set", set); ev.put("done", done);
            ev.put("at", System.currentTimeMillis());
            queue(c, ev);
        } catch (JSONException ignored) { }
        stopRest(c);
        postWorkout(c, false);
    }

    static void startRest(Context c, long end, String name) {
        prefs(c).edit().putLong("restEnd", end).putString("restName", name == null ? "Rest" : name).apply();
        alarm(c, A_REST_OVER, 9301, end);
    }

    static void stopRest(Context c) {
        prefs(c).edit().putLong("restEnd", 0).apply();
        alarm(c, A_REST_OVER, 9301, 0);
    }

    /** After the app sends new state: refresh the workout card and the water schedule. */
    static void afterSync(Context c) {
        JSONObject s = state(c);
        if (!on(s)) { cancel(c, ID_WORKOUT); alarm(c, A_WATER, 9001, 0); return; }
        if (s.optBoolean("active", false) || prefs(c).getLong("restEnd", 0) > System.currentTimeMillis()) postWorkout(c, false);
        scheduleWater(c);
    }

    /* ---------- planned reminders ---------- */

    static JSONArray plan(Context c) {
        try { return new JSONArray(prefs(c).getString("plan", "[]")); } catch (JSONException e) { return new JSONArray(); }
    }

    static void schedulePlan(Context c) {
        JSONArray p = plan(c);
        long next = 0, now = System.currentTimeMillis();
        for (int i = 0; i < p.length(); i++) {
            long at = p.optJSONObject(i).optLong("at");
            if (at > now - MIN && (next == 0 || at < next)) next = at;
        }
        alarm(c, A_PLAN, 9002, Math.max(next, next > 0 ? now + 1000 : 0));
    }

    static void firePlan(Context c) {
        JSONArray p = plan(c), keep = new JSONArray();
        long now = System.currentTimeMillis();
        boolean active = on(state(c));
        for (int i = 0; i < p.length(); i++) {
            JSONObject it = p.optJSONObject(i);
            long at = it.optLong("at");
            if (at > now + 30_000L) { keep.put(it); continue; }
            if (active && at > now - 2 * 60 * MIN) postPlanned(c, it);
        }
        prefs(c).edit().putString("plan", keep.toString()).apply();
        schedulePlan(c);
    }

    static void postPlanned(Context c, JSONObject it) {
        int nid = ID_PLAN + (Math.abs(it.optInt("id")) % 500);
        String kind = it.optString("kind", "");
        NotificationCompat.Builder b = builder(c, CH_REMIND, nid, it.optString("title"), it.optString("body")).setAutoCancel(true);
        if (kind.equals("workout")) {
            b.addAction(0, "Start workout", action(c, A_START, 9400 + nid % 100, null, nid));
        } else if (kind.equals("steps")) {
            PendingIntent open = openApp(c, 9600 + nid % 100);
            if (open != null) b.addAction(0, "Update steps", open);
        } else if (kind.equals("wake")) {
            PendingIntent open = openApp(c, 9700 + nid % 100);
            if (open != null) b.addAction(0, "Weigh in", open);
        }
        post(c, nid, b.build());
    }

    static PendingIntent snooze(Context c, JSONObject it, int nid, int minutes) {
        Intent i = new Intent(c, FitReceiver.class).setAction(A_SNOOZE);
        i.putExtra("item", it.toString());
        i.putExtra("n", minutes);
        i.putExtra("nid", nid);
        return PendingIntent.getBroadcast(c, 9500 + nid % 100 + (minutes == 15 ? 50 : 0), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static void snoozePlanned(Context c, String item, int minutes, int nid) {
        cancel(c, nid);
        try {
            JSONObject it = new JSONObject(item);
            it.put("at", System.currentTimeMillis() + minutes * MIN);
            JSONArray p = plan(c);
            p.put(it);
            prefs(c).edit().putString("plan", p.toString()).apply();
        } catch (JSONException ignored) { }
        schedulePlan(c);
    }

    /** "Start workout" from a reminder: show the workout card with its buttons. */
    static void startWorkout(Context c, int nid) {
        cancel(c, nid);
        if (todayWorkout(state(c)) == null) { show(c, ID_SHOW, "Open the app", "Open FitTrack once today so the workout can load here."); return; }
        postWorkout(c, false);
    }

    /** After a reboot or an app update, alarms are lost: book them again. */
    static void rescheduleAll(Context c) {
        schedulePlan(c);
        scheduleWater(c);
        long restEnd = prefs(c).getLong("restEnd", 0);
        if (restEnd > System.currentTimeMillis()) alarm(c, A_REST_OVER, 9301, restEnd);
    }
}
