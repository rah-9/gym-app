package com.rahul.gymlog;

import android.content.Context;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** The app's side of FitNotify: send state and planned reminders, collect taps made in the notification panel. */
@CapacitorPlugin(name = "FitNotify")
public class FitNotifyPlugin extends Plugin {

    @Override
    public void load() {
        FitNotify.live = this;
        FitNotify.channels(getContext());
    }

    @Override
    protected void handleOnDestroy() {
        if (FitNotify.live == this) FitNotify.live = null;
    }

    void ping() { notifyListeners("queued", new JSObject()); }

    @PluginMethod
    public void sync(PluginCall call) {
        JSObject s = call.getObject("state");
        if (s == null) { call.reject("state missing"); return; }
        try {
            FitNotify.saveState(getContext(), new JSONObject(s.toString()));
        } catch (JSONException e) { call.reject("bad state"); return; }
        FitNotify.afterSync(getContext());
        call.resolve();
    }

    @PluginMethod
    public void plan(PluginCall call) {
        JSArray items = call.getArray("items");
        FitNotify.prefs(getContext()).edit().putString("plan", items == null ? "[]" : items.toString()).apply();
        FitNotify.schedulePlan(getContext());
        call.resolve();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSONArray q = FitNotify.drain(getContext());
        JSObject r = new JSObject();
        try { r.put("events", new JSArray(q.toString())); } catch (JSONException e) { r.put("events", new JSArray()); }
        call.resolve(r);
    }

    @PluginMethod
    public void show(PluginCall call) {
        FitNotify.show(getContext(), call.getInt("id", FitNotify.ID_SHOW), call.getString("title", "FitTrack"), call.getString("body", ""));
        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        FitNotify.cancel(getContext(), call.getInt("id", FitNotify.ID_SHOW));
        call.resolve();
    }

    @PluginMethod
    public void restStart(PluginCall call) {
        Context c = getContext();
        FitNotify.startRest(c, call.getLong("end", System.currentTimeMillis()), call.getString("name", "Rest"));
        FitNotify.postWorkout(c, false);
        call.resolve();
    }

    @PluginMethod
    public void restStop(PluginCall call) {
        FitNotify.stopRest(getContext());
        FitNotify.postWorkout(getContext(), false);
        call.resolve();
    }
}
