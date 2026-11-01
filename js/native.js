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
