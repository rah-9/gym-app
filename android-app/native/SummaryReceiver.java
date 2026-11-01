package com.rahul.gymlog;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Posts the morning sleep summary and the evening screen-time summary, then books the next one. */
public class SummaryReceiver extends BroadcastReceiver {

    static final String CHANNEL = "fit_summary";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String action = intent.getAction() == null ? "" : intent.getAction();
        if (action.equals(Intent.ACTION_BOOT_COMPLETED) || action.equals("android.intent.action.MY_PACKAGE_REPLACED")) {
            PhoneUsagePlugin.scheduleAll(ctx);
            return;
        }
        String kind = intent.getStringExtra("kind");
        try {
            if (PhoneUsagePlugin.hasUsageAccess(ctx)) {
                long day = PhoneUsagePlugin.todayStart();
                if ("morning".equals(kind)) {
                    JSObject t = PhoneUsagePlugin.summarize(ctx, day, false);
                    JSObject y = PhoneUsagePlugin.summarize(ctx, day - 24 * PhoneUsagePlugin.HOUR, false);
                    String sleep = t.has("sleepMs")
                        ? "You slept about " + dur(t.getLong("sleepMs")) + " (" + clock(t.getLong("sleepStart")) + " to " + clock(t.getLong("sleepEnd")) + ")."
                        : "Could not spot a clear sleep stretch last night.";
                    post(ctx, 7201, "Good morning. Sleep check", sleep + " Screen time yesterday " + dur(y.getLong("screenMs")) + ".");
                } else {
                    JSObject t = PhoneUsagePlugin.summarize(ctx, day, false);
                    post(ctx, 7202, "Phone today: " + dur(t.getLong("screenMs")),
                        "Phone-free " + dur(t.getLong("freeMs")) + " so far, " + t.getInteger("unlocks") + " unlocks. Put it away an hour before bed for better sleep.");
                }
            }
        } catch (Exception ignored) { }
        PhoneUsagePlugin.scheduleAll(ctx);
    }

    static String dur(long ms) {
        long m = Math.max(0, ms / 60000L);
        return (m / 60) + " h " + (m % 60) + " min";
    }

    static String clock(long ms) {
        return new SimpleDateFormat("h:mm a", Locale.getDefault()).format(new Date(ms));
    }

    static int smallIcon(Context ctx) {
        int id = ctx.getResources().getIdentifier("ic_stat_fit", "drawable", ctx.getPackageName());
        return id != 0 ? id : ctx.getApplicationInfo().icon;
    }

    static void post(Context ctx, int id, String title, String text) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Daily summaries", NotificationManager.IMPORTANCE_DEFAULT));
        }
        if (!NotificationManagerCompat.from(ctx).areNotificationsEnabled()) return;
        Intent open = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        PendingIntent pi = open == null ? null : PendingIntent.getActivity(ctx, id, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(smallIcon(ctx))
            .setContentTitle(title)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setAutoCancel(true);
        if (pi != null) b.setContentIntent(pi);
        try { NotificationManagerCompat.from(ctx).notify(id, b.build()); } catch (SecurityException ignored) { }
    }
}
