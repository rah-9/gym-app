package com.rahul.gymlog;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Handles notification buttons and alarms in the background, so the app does not have to open. */
public class FitReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction() == null ? "" : i.getAction();
        switch (a) {
            case Intent.ACTION_BOOT_COMPLETED:
            case "android.intent.action.MY_PACKAGE_REPLACED":
                FitNotify.rescheduleAll(c); break;
            case FitNotify.A_PLAN: FitNotify.firePlan(c); break;
            case FitNotify.A_WATER: FitNotify.fireWater(c); break;
            case FitNotify.A_WATER_ADD: FitNotify.addWater(c, i.getIntExtra("n", 1)); break;
            case FitNotify.A_UNDO: FitNotify.undo(c); break;
            case FitNotify.A_WATER_SNOOZE: FitNotify.snoozeWater(c, i.getIntExtra("n", 30)); break;
            case FitNotify.A_SET: FitNotify.tick(c, i.getStringExtra("id"), false); break;
            case FitNotify.A_ITEM: FitNotify.tick(c, i.getStringExtra("id"), true); break;
            case FitNotify.A_REST_OVER:
                FitNotify.prefs(c).edit().putLong("restEnd", 0).apply();
                FitNotify.postWorkout(c, true);
                break;
            case FitNotify.A_START: FitNotify.startWorkout(c, i.getIntExtra("n", 0)); break;
            case FitNotify.A_SNOOZE: FitNotify.snoozePlanned(c, i.getStringExtra("item"), i.getIntExtra("n", 60), i.getIntExtra("nid", 0)); break;
            default: break;
        }
    }
}
