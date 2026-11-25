package com.rahul.gymlog;

import android.app.AlarmManager;
import android.app.AppOpsManager;
import android.app.PendingIntent;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Phone use from Android's Usage Access: screen-on time, phone-free time, unlocks, top apps,
 * and last night's sleep estimated from the longest screen-off stretch (the iSenseSleep idea:
 * screen events only, short night-time check-ins ignored).
 */
@CapacitorPlugin(name = "PhoneUsage")
public class PhoneUsagePlugin extends Plugin {

    static final String PREFS = "fittrack_summary";
    static final long MIN = 60_000L, HOUR = 3_600_000L;

    @PluginMethod
    public void hasAccess(PluginCall call) {
        JSObject r = new JSObject();
        r.put("granted", hasUsageAccess(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    /** App info page, where the three-dot menu has "Allow restricted settings" for sideloaded apps. */
    @PluginMethod
    public void openAppInfo(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, android.net.Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    /** Summary for the day that starts at dayStart (local midnight, ms). */
    @PluginMethod
    public void summary(PluginCall call) {
        Context ctx = getContext();
        if (!hasUsageAccess(ctx)) { call.reject("NO_ACCESS"); return; }
        long dayStart = call.getLong("dayStart", todayStart());
        saveTimes(ctx, call);
        try {
            call.resolve(summarize(ctx, dayStart, true));
        } catch (Exception e) {
            call.reject("Usage read failed: " + e.getMessage());
        }
    }

    /** One summary per day for the last `days` days (today included, newest first). Android keeps
        usage events for roughly a week to ten days, so older days come back empty. */
    @PluginMethod
    public void history(PluginCall call) {
        Context ctx = getContext();
        if (!hasUsageAccess(ctx)) { call.reject("NO_ACCESS"); return; }
        int days = Math.max(1, Math.min(14, call.getInt("days", 10)));
        saveTimes(ctx, call);
        new Thread(() -> {
            try {
                JSArray out = new JSArray();
                long today = todayStart();
                for (int i = 0; i < days; i++) {
                    Calendar c = Calendar.getInstance();
                    c.setTimeInMillis(today);
                    c.add(Calendar.DAY_OF_MONTH, -i);
                    out.put(summarize(ctx, c.getTimeInMillis(), true));
                }
                JSObject r = new JSObject();
                r.put("days", out);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Usage read failed: " + e.getMessage());
            }
        }).start();
    }

    /** Planned wake-up and bedtime (minutes after midnight), used when the phone cannot see the sleep. */
    static void saveTimes(Context ctx, PluginCall call) {
        Integer w = call.getInt("wakeMin"), b = call.getInt("bedMin");
        SharedPreferences.Editor e = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        if (w != null) e.putInt("wakeMin", w);
        if (b != null) e.putInt("bedMin", b);
        e.apply();
    }

    /** Daily notifications: morning sleep summary and evening screen-time summary. */
    @PluginMethod
    public void scheduleSummaries(PluginCall call) {
        SharedPreferences p = getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        p.edit()
            .putBoolean("on", call.getBoolean("enabled", true))
            .putInt("mh", call.getInt("morningHour", 8)).putInt("mm", call.getInt("morningMinute", 0))
            .putInt("nh", call.getInt("nightHour", 21)).putInt("nm", call.getInt("nightMinute", 30))
            .apply();
        scheduleAll(getContext());
        call.resolve();
    }

    /* ---------- shared logic (also used by SummaryReceiver) ---------- */

    static boolean hasUsageAccess(Context ctx) {
        AppOpsManager ops = (AppOpsManager) ctx.getSystemService(Context.APP_OPS_SERVICE);
        int mode;
        if (Build.VERSION.SDK_INT >= 29) mode = ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.getPackageName());
        else mode = ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), ctx.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    static long todayStart() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    /** Screen-on intervals [start, end] between from and to. */
    static List<long[]> screenOn(Context ctx, long from, long to) {
        if (Build.VERSION.SDK_INT < 28) return new ArrayList<>();
        UsageStatsManager um = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents ev = um.queryEvents(from, to);
        UsageEvents.Event e = new UsageEvents.Event();
        List<long[]> out = new ArrayList<>();
        long onAt = -1;
        boolean first = true;
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e);
            int t = e.getEventType();
            if (t == UsageEvents.Event.SCREEN_INTERACTIVE) {
                if (onAt < 0) onAt = e.getTimeStamp();
                first = false;
            } else if (t == UsageEvents.Event.SCREEN_NON_INTERACTIVE) {
                if (onAt >= 0) { out.add(new long[]{onAt, e.getTimeStamp()}); onAt = -1; }
                else if (first) out.add(new long[]{from, e.getTimeStamp()}); // screen was already on
                first = false;
            }
        }
        if (onAt >= 0) out.add(new long[]{onAt, to});
        return out;
    }

    static int unlocks(Context ctx, long from, long to) {
        if (Build.VERSION.SDK_INT < 28) return 0;
        UsageStatsManager um = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents ev = um.queryEvents(from, to);
        UsageEvents.Event e = new UsageEvents.Event();
        int n = 0;
        while (ev.hasNextEvent()) { ev.getNextEvent(e); if (e.getEventType() == UsageEvents.Event.KEYGUARD_HIDDEN) n++; }
        return n;
    }

    static long overlap(List<long[]> on, long a, long b) {
        long s = 0;
        for (long[] x : on) { long lo = Math.max(a, x[0]), hi = Math.min(b, x[1]); if (hi > lo) s += hi - lo; }
        return s;
    }

    /** Off-screen gaps in [a, b], ignoring screen-on blips shorter than 3 minutes. */
    static List<long[]> gaps(List<long[]> on, long a, long b) {
        List<long[]> real = new ArrayList<>();
        for (long[] x : on) if (x[1] - x[0] >= 3 * MIN && x[1] > a && x[0] < b) real.add(x);
        List<long[]> g = new ArrayList<>();
        long cur = a;
        for (long[] x : real) { if (x[0] > cur) g.add(new long[]{cur, x[0]}); cur = Math.max(cur, x[1]); }
        if (b > cur) g.add(new long[]{cur, b});
        return g;
    }

    /** Longest finished off-screen stretch of 3 h or more in [a, b]: a night's sleep. */
    static long[] sleepIn(List<long[]> on, long a, long b, long now) {
        long[] best = null;
        if (b <= a) return null;
        for (long[] g : gaps(on, a, b)) if (g[1] - g[0] >= 3 * HOUR && g[1] < now - 10 * MIN && (best == null || g[1] - g[0] > best[1] - best[0])) best = g;
        return best;
    }

    /** Home-screen apps, left out of screen time the way Digital Wellbeing does. */
    static java.util.Set<String> launchers(Context ctx) {
        java.util.Set<String> out = new java.util.HashSet<>();
        try {
            Intent home = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);
            for (android.content.pm.ResolveInfo ri : ctx.getPackageManager().queryIntentActivities(home, 0)) out.add(ri.activityInfo.packageName);
        } catch (Exception ignored) { }
        out.add("com.android.systemui");
        return out;
    }

    /** Time each app was open on screen in [from, to] (foreground events, closed when the screen turns off). */
    static Map<String, List<long[]>> appUse(Context ctx, long from, long to) {
        Map<String, List<long[]>> use = new java.util.HashMap<>();
        UsageStatsManager um = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents ev = um.queryEvents(from, to);
        UsageEvents.Event e = new UsageEvents.Event();
        Map<String, Long> open = new java.util.HashMap<>();
        java.util.Set<String> skip = launchers(ctx);
        while (ev.hasNextEvent()) {
            ev.getNextEvent(e);
            int t = e.getEventType();
            String pkg = e.getPackageName();
            long ts = e.getTimeStamp();
            if (t == 1) { // MOVE_TO_FOREGROUND / ACTIVITY_RESUMED
                if (pkg == null || skip.contains(pkg) || pkg.contains("launcher")) continue;
                for (String o : new ArrayList<>(open.keySet())) { if (!o.equals(pkg)) addUse(use, o, open.remove(o), ts); }
                if (!open.containsKey(pkg)) open.put(pkg, ts);
            } else if (t == 2 || t == 23) { // MOVE_TO_BACKGROUND / ACTIVITY_PAUSED / ACTIVITY_STOPPED
                Long st = open.remove(pkg);
                if (st != null) addUse(use, pkg, st, ts);
            } else if (Build.VERSION.SDK_INT >= 28 && (t == UsageEvents.Event.SCREEN_NON_INTERACTIVE || t == UsageEvents.Event.KEYGUARD_SHOWN)) {
                for (String o : new ArrayList<>(open.keySet())) addUse(use, o, open.remove(o), ts);
            }
        }
        for (String o : open.keySet()) addUse(use, o, open.get(o), to);
        return use;
    }

    static void addUse(Map<String, List<long[]>> use, String pkg, long a, long b) {
        if (b <= a) return;
        List<long[]> l = use.get(pkg);
        if (l == null) { l = new ArrayList<>(); use.put(pkg, l); }
        l.add(new long[]{a, b});
    }

    /** Merge overlapping intervals so two apps on screen at once are not counted twice. */
    static List<long[]> union(Map<String, List<long[]>> use) {
        List<long[]> all = new ArrayList<>();
        for (List<long[]> l : use.values()) all.addAll(l);
        Collections.sort(all, (x, y) -> Long.compare(x[0], y[0]));
        List<long[]> out = new ArrayList<>();
        for (long[] x : all) {
            if (!out.isEmpty() && x[0] <= out.get(out.size() - 1)[1]) out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], x[1]);
            else out.add(new long[]{x[0], x[1]});
        }
        return out;
    }

    /**
     * One day, counted from when you woke up to when you went to sleep (the night does not count):
     *  - sleep: last night's sleep, the longest screen-off stretch (3 h+) from 8 PM to 1 PM;
     *  - awake window: that wake-up (or the planned wake time) until tonight's sleep (or the planned
     *    bedtime for a past day, or now for today);
     *  - screen time: time apps were open on screen in the awake window, like Digital Wellbeing
     *    (home screen left out);
     *  - phone-free: the awake window minus screen time; late: phone use after the planned bedtime.
     */
    static JSObject summarize(Context ctx, long dayStart, boolean withApps) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        int wakeMin = p.getInt("wakeMin", 390), bedMin = p.getInt("bedMin", 1380);
        long now = System.currentTimeMillis();
        boolean isToday = dayStart == todayStart();
        long from = dayStart - 6 * HOUR, to = Math.min(now, dayStart + 38 * HOUR);
        List<long[]> on = screenOn(ctx, from, to);
        long[] sleep = sleepIn(on, dayStart - 4 * HOUR, Math.min(to, dayStart + 13 * HOUR), now);
        long awakeFrom = sleep != null ? sleep[1] : dayStart + wakeMin * MIN;
        long plannedBed = dayStart + (bedMin <= wakeMin ? bedMin + 1440 : bedMin) * MIN;
        long[] next = sleepIn(on, Math.max(awakeFrom + HOUR, dayStart + 18 * HOUR), Math.min(to, dayStart + 37 * HOUR), now);
        long awakeTo = next != null ? next[0] : (isToday ? now : plannedBed);
        awakeTo = Math.min(awakeTo, now);
        if (awakeTo < awakeFrom) awakeTo = awakeFrom;

        Map<String, List<long[]>> use = appUse(ctx, from, to);
        List<long[]> merged = union(use);
        long screen = overlap(merged, awakeFrom, awakeTo);
        long late = awakeTo > plannedBed ? overlap(merged, plannedBed, awakeTo) : 0;

        JSObject r = new JSObject();
        r.put("v", 2);
        r.put("dayStart", dayStart);
        r.put("until", awakeTo);
        r.put("awakeFrom", awakeFrom);
        r.put("awakeTo", awakeTo);
        r.put("awakeMs", awakeTo - awakeFrom);
        r.put("wakeSrc", sleep != null ? "phone" : "plan");
        r.put("screenMs", screen);
        r.put("freeMs", Math.max(0, awakeTo - awakeFrom - screen));
        r.put("lateMs", late);
        r.put("unlocks", unlocks(ctx, awakeFrom, awakeTo));
        r.put("final", !isToday && (next != null || now > plannedBed + 6 * HOUR));
        if (sleep != null) { r.put("sleepStart", sleep[0]); r.put("sleepEnd", sleep[1]); r.put("sleepMs", sleep[1] - sleep[0]); }

        // Longest phone-free stretch while awake.
        long longest = 0, ls = 0;
        for (long[] g : gaps(on, awakeFrom, awakeTo)) if (g[1] - g[0] > longest) { longest = g[1] - g[0]; ls = g[0]; }
        r.put("longestFreeMs", longest);
        r.put("longestFreeStart", ls);

        if (withApps) {
            List<Object[]> tot = new ArrayList<>();
            for (Map.Entry<String, List<long[]>> en : use.entrySet()) {
                long ms = overlap(en.getValue(), awakeFrom, awakeTo);
                if (ms >= MIN) tot.add(new Object[]{en.getKey(), ms});
            }
            Collections.sort(tot, (x, y) -> Long.compare((Long) y[1], (Long) x[1]));
            JSArray apps = new JSArray();
            PackageManager pm = ctx.getPackageManager();
            for (int i = 0; i < Math.min(6, tot.size()); i++) {
                String pkg = (String) tot.get(i)[0], label = pkg;
                try { ApplicationInfo ai = pm.getApplicationInfo(pkg, 0); label = String.valueOf(pm.getApplicationLabel(ai)); } catch (Exception ignored) { }
                JSObject a1 = new JSObject();
                a1.put("name", label); a1.put("ms", (Long) tot.get(i)[1]);
                apps.put(a1);
            }
            r.put("apps", apps);
        }
        return r;
    }

    static long nextAt(int h, int m) {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, h); c.set(Calendar.MINUTE, m); c.set(Calendar.SECOND, 0); c.set(Calendar.MILLISECOND, 0);
        if (c.getTimeInMillis() <= System.currentTimeMillis() + 30_000L) c.add(Calendar.DAY_OF_MONTH, 1);
        return c.getTimeInMillis();
    }

    static void scheduleAll(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        schedule(ctx, "morning", p.getBoolean("on", true), nextAt(p.getInt("mh", 8), p.getInt("mm", 0)));
        schedule(ctx, "night", p.getBoolean("on", true), nextAt(p.getInt("nh", 21), p.getInt("nm", 30)));
    }

    static void schedule(Context ctx, String kind, boolean on, long at) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(ctx, SummaryReceiver.class).setAction("com.rahul.gymlog.SUMMARY_" + kind.toUpperCase());
        i.putExtra("kind", kind);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, kind.equals("morning") ? 7101 : 7102, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.cancel(pi);
        if (on) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
    }
}
