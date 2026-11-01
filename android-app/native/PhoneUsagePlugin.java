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

    /** Summary for the day that starts at dayStart (local midnight, ms). */
    @PluginMethod
    public void summary(PluginCall call) {
        Context ctx = getContext();
        if (!hasUsageAccess(ctx)) { call.reject("NO_ACCESS"); return; }
        long dayStart = call.getLong("dayStart", todayStart());
        try {
            call.resolve(summarize(ctx, dayStart, true));
        } catch (Exception e) {
            call.reject("Usage read failed: " + e.getMessage());
        }
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

    static JSObject summarize(Context ctx, long dayStart, boolean withApps) {
        long now = System.currentTimeMillis();
        long dayEnd = Math.min(now, dayStart + 24 * HOUR);
        long from = dayStart - 6 * HOUR;
        List<long[]> on = screenOn(ctx, from, dayEnd);
        JSObject r = new JSObject();
        long screen = overlap(on, dayStart, dayEnd);
        r.put("dayStart", dayStart);
        r.put("until", dayEnd);
        r.put("screenMs", screen);
        r.put("freeMs", Math.max(0, dayEnd - dayStart - screen));
        r.put("unlocks", unlocks(ctx, dayStart, dayEnd));

        // Sleep: longest off-screen stretch of 3 h or more between 8 PM yesterday and 1 PM today.
        long sa = dayStart - 4 * HOUR, sb = Math.min(dayEnd, dayStart + 13 * HOUR);
        long[] best = null;
        for (long[] g : gaps(on, sa, sb)) if (g[1] - g[0] >= 3 * HOUR && (best == null || g[1] - g[0] > best[1] - best[0])) best = g;
        if (best != null && best[1] < now - 10 * MIN) {
            r.put("sleepStart", best[0]); r.put("sleepEnd", best[1]); r.put("sleepMs", best[1] - best[0]);
        }
        // Longest phone-free stretch while awake today.
        long awakeFrom = best != null ? best[1] : dayStart;
        long longest = 0, ls = 0;
        for (long[] g : gaps(on, awakeFrom, dayEnd)) if (g[1] - g[0] > longest) { longest = g[1] - g[0]; ls = g[0]; }
        r.put("longestFreeMs", longest);
        r.put("longestFreeStart", ls);

        if (withApps) {
            JSArray apps = new JSArray();
            try {
                UsageStatsManager um = (UsageStatsManager) ctx.getSystemService(Context.USAGE_STATS_SERVICE);
                Map<String, UsageStats> m = um.queryAndAggregateUsageStats(dayStart, dayEnd);
                List<UsageStats> list = new ArrayList<>(m.values());
                Collections.sort(list, (x, y) -> Long.compare(y.getTotalTimeInForeground(), x.getTotalTimeInForeground()));
                PackageManager pm = ctx.getPackageManager();
                int n = 0;
                for (UsageStats u : list) {
                    if (n >= 6 || u.getTotalTimeInForeground() < MIN) break;
                    String label = u.getPackageName();
                    try { ApplicationInfo ai = pm.getApplicationInfo(u.getPackageName(), 0); label = String.valueOf(pm.getApplicationLabel(ai)); } catch (Exception ignored) { }
                    if (u.getPackageName().contains("launcher")) continue;
                    JSObject a = new JSObject();
                    a.put("name", label); a.put("ms", u.getTotalTimeInForeground());
                    apps.put(a); n++;
                }
            } catch (Exception ignored) { }
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
