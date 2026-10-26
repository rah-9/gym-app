/* Small helpers shared by every module: dates, formatting, DOM, toast, downloads. */

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const $ = (sel, el) => (el || document).querySelector(sel);

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const pad = (n) => String(n).padStart(2, '0');

/* Dates are handled as local 'YYYY-MM-DD' keys so they sort and compare as strings. */
export const keyOf = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export function fromKey(k) { const p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
export function addDays(k, n) { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
export const todayKey = () => keyOf(new Date());
export function weekStartOf(k) { const d = fromKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); }
export function weekDays(ws) { const out = []; for (let i = 0; i < 7; i++) out.push(addDays(ws, i)); return out; }
export function fmt(k) { const d = fromKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
export const dow = (k) => fromKey(k).getDay();
export const clockTime = (ms) => { const d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

export const num = (n) => (n || 0).toLocaleString('en-IN');

export function restLabel(s) {
  if (s < 60) return s + ' s';
  return s % 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s / 60 + ' min';
}

let toastTimer = null;
export function toast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
}

export function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
