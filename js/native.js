/* Android app extras. The same code runs on the website, where all of this is skipped.
   Steps come from Health Connect (Android's health store), which your phone's step counter
   (Google Fit, Samsung Health or the phone itself) writes to. Files are saved with the share sheet. */

const cap = () => window.Capacitor;
export const isNativeApp = () => { const c = cap(); return !!(c && c.isNativePlatform && c.isNativePlatform()); };
const call = (plugin, method, opts) => cap().nativePromise(plugin, method, opts || {});

const pad = (n) => String(n).padStart(2, '0');
const localKey = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());

export async function healthAvailable() {
  if (!isNativeApp()) return false;
  try { return !!(await call('HealthPlugin', 'isHealthAvailable')).available; } catch (e) { return false; }
}
export async function stepsAllowed() {
  try { const r = await call('HealthPlugin', 'checkHealthPermissions', { permissions: ['READ_STEPS'] }); return !!(r.permissions && r.permissions.READ_STEPS); }
  catch (e) { return false; }
}
export async function askSteps() {
  const r = await call('HealthPlugin', 'requestHealthPermissions', { permissions: ['READ_STEPS'] });
  return !!(r.permissions && r.permissions.READ_STEPS);
}
export const openHealthConnect = () => call('HealthPlugin', 'openHealthConnectSettings').catch(() => call('HealthPlugin', 'showHealthConnectInPlayStore'));
export const installHealthConnect = () => call('HealthPlugin', 'showHealthConnectInPlayStore');

// Steps per day for the last `days` days, today included: { 'YYYY-MM-DD': steps }.
export async function readSteps(days) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  const r = await call('HealthPlugin', 'queryAggregated', { startDate: start.toISOString(), endDate: now.toISOString(), dataType: 'steps', bucket: 'day' });
  const out = {};
  (r.aggregatedData || []).forEach((s) => {
    const k = String(s.startDate).slice(0, 10);
    const v = Math.round(s.value || 0);
    if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = (out[k] || 0) + v;
  });
  if (!Object.keys(out).length) out[localKey(now)] = 0;
  return out;
}

// Save a file: write it to the app cache, then open the share sheet (Save to Files, Drive, WhatsApp...).
export async function saveFile(name, blob) {
  const b64 = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
  const w = await call('Filesystem', 'writeFile', { path: name, data: b64, directory: 'CACHE', recursive: true });
  await call('Share', 'share', { title: name, files: [w.uri], dialogTitle: 'Save or send ' + name });
}

/* ---------- activity from Health Connect: exercise minutes and active calories today ---------- */
export const HEALTH_PERMS = ['READ_STEPS', 'READ_WORKOUTS', 'READ_ACTIVE_CALORIES', 'READ_TOTAL_CALORIES', 'READ_DISTANCE'];
export async function healthPerms() {
  try { return (await call('HealthPlugin', 'checkHealthPermissions', { permissions: HEALTH_PERMS })).permissions || {}; } catch (e) { return {}; }
}
export async function askHealth() {
  return (await call('HealthPlugin', 'requestHealthPermissions', { permissions: HEALTH_PERMS })).permissions || {};
}
export async function readActivity() {
  const now = new Date(), start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out = { exMin: 0, kcal: 0, sessions: [] };
  try {
    const w = await call('HealthPlugin', 'queryWorkouts', { startDate: start.toISOString(), endDate: now.toISOString(), includeHeartRate: false, includeRoute: false, includeSteps: false });
    (w.workouts || []).forEach((x) => { const m = Math.round((x.duration || 0) / 60); out.exMin += m; out.sessions.push({ type: String(x.workoutType || 'Exercise').toLowerCase().replace(/_/g, ' '), min: m }); });
  } catch (e) { /* no permission or no data */ }
  try {
    const c = await call('HealthPlugin', 'queryAggregated', { startDate: start.toISOString(), endDate: now.toISOString(), dataType: 'active-calories', bucket: 'day' });
    out.kcal = Math.round((c.aggregatedData || []).reduce((a, s) => a + (s.value || 0), 0));
  } catch (e) { /* ignore */ }
  return out;
}

/* ---------- phone use (our own PhoneUsage plugin, Android Usage Access) ---------- */
export async function usageAllowed() { try { return !!(await call('PhoneUsage', 'hasAccess')).granted; } catch (e) { return false; } }
export const openUsageSettings = () => call('PhoneUsage', 'openAccessSettings');
export const openAppInfo = () => call('PhoneUsage', 'openAppInfo');
export async function usageSummary(dayStartMs) { return call('PhoneUsage', 'summary', { dayStart: dayStartMs }); }
export const scheduleSummaries = (o) => call('PhoneUsage', 'scheduleSummaries', o).catch(() => {});

/* ---------- scheduled reminders (Android delivers them even when the app is closed) ---------- */
const LN = (m, o) => call('LocalNotifications', m, o);
export async function replacePlanned(list) {
  try {
    const p = await LN('getPending');
    const old = (p.notifications || []).filter((n) => n.id >= 20000 && n.id < 30000).map((n) => ({ id: n.id }));
    if (old.length) await LN('cancel', { notifications: old });
    if (list.length) await LN('schedule', { notifications: list.map((n) => ({ id: n.id, title: n.title, body: n.body, channelId: 'fit_main', schedule: { at: new Date(n.at).toISOString(), allowWhileIdle: true } })) });
    return true;
  } catch (e) { return false; }
}
