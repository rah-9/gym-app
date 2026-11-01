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
    </queries>
    <uses-permission android:name="android.permission.health.READ_STEPS" />

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
    </application>`);
  fs.writeFileSync(man, x);
}

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
fs.writeFileSync(gradle, g);

// App icon from the website icon (ImageMagick on the build machine).
const src = path.resolve(root, '../icons/icon-512.png');
const sizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const res = path.join(root, 'android/app/src/main/res');
try {
  for (const [d, s] of Object.entries(sizes)) {
    const dir = path.join(res, 'mipmap-' + d);
    for (const n of ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']) {
      execSync(`convert "${src}" -resize ${s}x${s} "${path.join(dir, n)}"`);
    }
  }
  fs.rmSync(path.join(res, 'mipmap-anydpi-v26'), { recursive: true, force: true });
} catch (e) { console.warn('icon step skipped:', e.message); }

console.log('Android project patched.');
