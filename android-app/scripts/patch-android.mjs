// Adds Health Connect permissions, the privacy rationale screen, minSdk 26 and the app icon.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const man = path.join(root, 'android/app/src/main/AndroidManifest.xml');
let x = fs.readFileSync(man, 'utf8');

if (!x.includes('READ_STEPS')) {
  x = x.replace('<application', `<queries>
        <package android:name="com.google.android.apps.healthdata" />
        <intent>
            <action android:name="android.intent.action.MAIN" />
            <category android:name="android.intent.category.LAUNCHER" />
        </intent>
    </queries>
    <uses-permission android:name="android.permission.health.READ_STEPS" />
    <uses-permission android:name="android.permission.health.READ_EXERCISE" />
    <uses-permission android:name="android.permission.health.READ_ACTIVE_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_TOTAL_CALORIES_BURNED" />
    <uses-permission android:name="android.permission.health.READ_DISTANCE" />
    <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />

    <application`);
  x = x.replace('</application>', `    <activity
            android:name="com.fit_up.health.capacitor.PermissionsRationaleActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
            </intent-filter>
        </activity>
        <activity-alias
            android:name="ViewPermissionUsageActivity"
            android:exported="true"
            android:targetActivity="com.fit_up.health.capacitor.PermissionsRationaleActivity"
            android:permission="android.permission.START_VIEW_PERMISSION_USAGE">
            <intent-filter>
                <action android:name="android.intent.action.VIEW_PERMISSION_USAGE" />
                <category android:name="android.intent.category.HEALTH_PERMISSIONS" />
            </intent-filter>
        </activity-alias>
        <receiver android:name=".FitReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
        <receiver android:name=".SummaryReceiver" android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>
    </application>`);
  x = x.replace('<manifest xmlns:android="http://schemas.android.com/apk/res/android"', '<manifest xmlns:android="http://schemas.android.com/apk/res/android" xmlns:tools="http://schemas.android.com/tools"');
  // File sharing for saved reports and for handing a downloaded update to the installer.
  if (!x.includes('androidx.core.content.FileProvider')) {
    x = x.replace('</application>', `    <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths" />
        </provider>
    </application>`);
  }
  fs.writeFileSync(man, x);
}
const xmlDir = path.join(root, 'android/app/src/main/res/xml');
fs.mkdirSync(xmlDir, { recursive: true });
fs.writeFileSync(path.join(xmlDir, 'file_paths.xml'), `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <cache-path name="my_cache_images" path="." />
    <files-path name="my_files" path="." />
</paths>
`);

// Our own plugin: phone usage, sleep estimate, daily summary notifications.
const javaDir = path.join(root, 'android/app/src/main/java/com/rahul/gymlog');
for (const f of fs.readdirSync(path.join(root, 'native'))) fs.copyFileSync(path.join(root, 'native', f), path.join(javaDir, f));
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package com.rahul.gymlog;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhoneUsagePlugin.class);
        registerPlugin(FitNotifyPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        registerPlugin(FileSavePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

// Health Connect needs Android 8 (API 26) or newer.
const vars = path.join(root, 'android/variables.gradle');
let v = fs.readFileSync(vars, 'utf8');
v = v.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 26');
fs.writeFileSync(vars, v);

// Version code from the build number so every new APK installs over the old one.
const gradle = path.join(root, 'android/app/build.gradle');
let g = fs.readFileSync(gradle, 'utf8');
const run = parseInt(process.env.GITHUB_RUN_NUMBER || '1', 10);
g = g.replace(/versionCode\s+\d+/, 'versionCode ' + run).replace(/versionName\s+"[^"]*"/, 'versionName "1.' + run + '"');
// Always sign with the key saved in android-app/signing, so every new APK installs over the last one.
// (Without this, the build machine made a new random key each time and Android refused the update.)
if (!g.includes('signingConfigs')) {
  g = g.replace(/android\s*\{/, `android {
    signingConfigs {
        fixed {
            storeFile file('../../signing/debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`);
  g = g.replace(/buildTypes\s*\{/, `buildTypes {
        debug {
            signingConfig signingConfigs.fixed
        }`);
}
fs.writeFileSync(gradle, g);

// App icon from the website icon (ImageMagick on the build machine).
const src = path.resolve(root, '../icons/icon-512.png');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const res = path.join(root, 'android/app/src/main/res');
try {
  // Small white notification icon from the monochrome badge.
  const badge = path.resolve(root, '../icons/badge-96.png');
  for (const [d, s] of Object.entries({ mdpi: 24, hdpi: 36, xhdpi: 48, xxhdpi: 72, xxxhdpi: 96 })) {
    const dir = path.join(res, 'drawable-' + d);
    fs.mkdirSync(dir, { recursive: true });
    execSync(`convert "${badge}" -resize ${s}x${s} "${path.join(dir, 'ic_stat_fit.png')}"`);
  }
  for (const [d, s] of Object.entries(sizes)) {
    const dir = path.join(res, 'mipmap-' + d);
    for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      execSync(`convert "${src}" -resize ${s}x${s} "${path.join(dir, n)}"`);
    }
  }
  fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
} catch (e) { console.warn('icon step skipped:', e.message); }

console.log('Android project patched.');
