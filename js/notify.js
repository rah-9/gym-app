/* Phone notifications through the service worker, so they land in the notification panel
   of the installed app (Android Chrome, and iPhone on iOS 16.4+ once added to the Home Screen).
   Shows: workout progress after each tick, the rest timer, and "Rest over" with the screen off. */
import { S, save } from './store.js';

const ICON = '/icons/icon-192.png';
const BADGE = '/icons/badge-96.png';

let handlers = {};

export const supported = () => 'Notification' in window && 'serviceWorker' in navigator;
export const permission = () => (supported() ? Notification.permission : 'unsupported');
export const enabled = () => permission() === 'granted' && S.settings.notify !== false;
export const isInstalled = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const ready = () => (supported() ? navigator.serviceWorker.ready : Promise.reject(new Error('no sw')));

// Register the worker and listen for taps on notification buttons (+15 s, Skip).
export function init(on) {
  handlers = on || {};
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => { /* offline or blocked */ });
  navigator.serviceWorker.addEventListener('message', (ev) => {
    const m = ev.data || {};
    if (m.type === 'rest-sync' && handlers.restSync) handlers.restSync(m.end);
    if (m.type === 'rest-cancel' && handlers.restCancel) handlers.restCancel();
  });
}

// Must run from a tap: browsers only show the permission prompt after a user gesture.
export function enable() {
  if (!supported()) return Promise.resolve('unsupported');
  return Notification.requestPermission().then((p) => {
    S.settings.notify = p === 'granted';
    S.settings.notifyAsked = true;
    save();
    if (p === 'granted') {
      show('hello', 'Notifications are on', 'Workout progress and the rest timer will show here.', { silent: false });
    }
    return p;
  });
}

export function disable() {
  S.settings.notify = false;
  save();
  ['workout', 'rest', 'hello'].forEach(close);
  post({ type: 'rest-stop' });
}

export function show(tag, title, body, opts) {
  if (!enabled()) return Promise.resolve();
  const o = Object.assign({ tag, body, icon: ICON, badge: BADGE, silent: true, renotify: false, data: { url: '/' } }, opts || {});
  return ready().then((reg) => reg.showNotification(title, o)).catch(() => { /* ignore */ });
}

export function close(tag) {
  if (!supported()) return;
  ready().then((reg) => reg.getNotifications({ tag })).then((list) => list.forEach((n) => n.close())).catch(() => {});
}

function post(msg) {
  if (!supported()) return;
  ready().then((reg) => { if (reg.active) reg.active.postMessage(msg); }).catch(() => {});
}

/* ---------- workout progress ---------- */
// info: { title, done, total, pct, next } built by the caller from today's plan.
export function workoutProgress(info) {
  if (!enabled()) return;
  if (info.done === 0) { close('workout'); return; }
  const complete = info.pct === 100;
  show('workout',
    complete ? info.title + ' done' : info.title + ' · ' + info.done + ' of ' + info.total,
    complete ? 'Workout complete. Eat your protein.' : (info.next ? 'Up next: ' + info.next : 'Almost there.'),
    { silent: !complete, renotify: complete, vibrate: complete ? [120, 60, 120] : undefined });
}

/* ---------- rest timer (the worker counts down, so it works with the screen off) ---------- */
export function restStart(end, name) { if (enabled()) post({ type: 'rest-start', end, name, icon: ICON, badge: BADGE }); }
export function restSync(end, name) { if (enabled()) post({ type: 'rest-sync', end, name }); }
export function restStop() { post({ type: 'rest-stop' }); }
