package com.rahul.gymlog;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * In-app updates: read version.json from the GitHub release, download the new APK and hand it to
 * Android's installer. The APK is signed with the same key every build, so it installs over the
 * current app and keeps all data.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    @PluginMethod
    public void info(PluginCall call) {
        JSObject r = new JSObject();
        try {
            PackageInfo pi = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
            r.put("versionCode", Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode);
            r.put("versionName", pi.versionName);
        } catch (Exception e) { r.put("versionCode", 0); r.put("versionName", "?"); }
        call.resolve(r);
    }

    @PluginMethod
    public void check(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url missing"); return; }
        new Thread(() -> {
            try {
                HttpURLConnection h = open(url + (url.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis());
                InputStream in = h.getInputStream();
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                in.close();
                call.resolve(new JSObject(out.toString("UTF-8")));
            } catch (Exception e) {
                call.reject("Update check failed: " + e.getMessage());
            }
        }).start();
    }

    /** Download and open the installer. First time only, Android asks to allow installs from this app. */
    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (url == null) { call.reject("url missing"); return; }
        Context c = getContext();
        if (Build.VERSION.SDK_INT >= 26 && !c.getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + c.getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            c.startActivity(s);
            JSObject r = new JSObject();
            r.put("needsPermission", true);
            call.resolve(r);
            return;
        }
        new Thread(() -> {
            try {
                File dir = new File(c.getCacheDir(), "updates");
                if (!dir.exists()) dir.mkdirs();
                File apk = new File(dir, "gymlog.apk");
                HttpURLConnection h = open(url);
                long total = h.getContentLengthLong(), got = 0;
                int lastPct = -1;
                InputStream in = h.getInputStream();
                OutputStream out = new FileOutputStream(apk);
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                    got += n;
                    int pct = total > 0 ? (int) (got * 100 / total) : -1;
                    if (pct != lastPct && pct % 10 == 0) {
                        lastPct = pct;
                        JSObject p = new JSObject();
                        p.put("pct", pct);
                        notifyListeners("progress", p);
                    }
                }
                out.close();
                in.close();
                Uri uri = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                c.startActivity(i);
                JSObject r = new JSObject();
                r.put("started", true);
                call.resolve(r);
            } catch (Exception e) {
                call.reject("Download failed: " + e.getMessage());
            }
        }).start();
    }

    private static HttpURLConnection open(String url) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
        h.setInstanceFollowRedirects(true);
        h.setConnectTimeout(15000);
        h.setReadTimeout(30000);
        h.setRequestProperty("Cache-Control", "no-cache");
        h.setRequestProperty("User-Agent", "FitTrack-Android");
        int code = h.getResponseCode();
        if (code >= 300 && code < 400) {
            // Follow redirects by hand too, in case the platform stops at one.
            String loc = h.getHeaderField("Location");
            h.disconnect();
            h = (HttpURLConnection) new URL(loc).openConnection();
            h.setConnectTimeout(15000);
            h.setReadTimeout(30000);
            code = h.getResponseCode();
        }
        if (code != 200) throw new Exception("HTTP " + code);
        return h;
    }
}
