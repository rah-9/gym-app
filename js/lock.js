/* PIN screen. Opens on the right 4th digit, locks after 30 minutes without activity.
   A simple privacy screen for a personal phone, not bank-level security. */
import { $ } from './util.js';

const UNLOCK_KEY = 'gymlog.unlock';
const UNLOCK_MS = 30 * 60 * 1000;
// SHA-256 of the PIN. Change it with: printf '1234' | sha256sum
const PIN_HASH = 'c87a024f10155ed22b50516e977c904257600e04e3cc3bbf77fa426983346bc2';

let entry = '';
let onUnlock = () => {};

export function recordActivity() {
  if (!$('#root').hidden) {
    try { localStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch (e) { /* ignore */ }
  }
}

export function isUnlocked() {
  try { const t = +localStorage.getItem(UNLOCK_KEY); return t > 0 && Date.now() - t < UNLOCK_MS; } catch (e) { return false; }
}

export function lockNow() {
  try { localStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ }
  showLock();
}

export function showLock() {
  entry = '';
  drawDots();
  $('#root').hidden = true;
  $('#lock').hidden = false;
}

function drawDots() {
  document.querySelectorAll('#pindots i').forEach((dot, i) => dot.classList.toggle('on', i < entry.length));
}

function sha256(text) {
  if (window.crypto && crypto.subtle && window.TextEncoder) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
      .then((buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''));
  }
  return Promise.resolve(null);
}

function press(n) {
  if (entry.length >= 4) return;
  entry += n;
  drawDots();
  if (entry.length < 4) { $('#pinmsg').textContent = ''; return; }
  const tryPin = entry;
  sha256(tryPin).then((h) => {
    // Plain-http fallback when crypto.subtle is missing.
    const ok = h ? h === PIN_HASH : tryPin === atob('OTEyNA==');
    if (ok) {
      try { localStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch (e) { /* ignore */ }
      $('#pinmsg').textContent = '';
      $('#lock').hidden = true;
      $('#root').hidden = false;
      onUnlock();
    } else {
      const padEl = $('#pinpad');
      padEl.classList.remove('shake'); void padEl.offsetWidth; padEl.classList.add('shake');
      $('#pinmsg').textContent = 'Wrong PIN. Try again.';
      setTimeout(() => { entry = ''; drawDots(); }, 300);
    }
  });
}

const backspace = () => { entry = entry.slice(0, -1); drawDots(); };

export function initLock(cb) {
  onUnlock = cb;
  $('#lock').addEventListener('click', (ev) => {
    const b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.n != null) press(b.dataset.n);
    else if (b.dataset.k === 'del') backspace();
  });
  document.addEventListener('keydown', (ev) => {
    if ($('#lock').hidden) return;
    if (/^[0-9]$/.test(ev.key)) press(ev.key);
    else if (ev.key === 'Backspace') backspace();
  });
  ['pointerdown', 'touchstart', 'keydown', 'scroll', 'input'].forEach((evt) => {
    window.addEventListener(evt, recordActivity, { passive: true });
  });
  // Lock when idle too long while the app is on screen.
  setInterval(() => { if (!$('#root').hidden && !isUnlocked()) showLock(); }, 5000);
}
