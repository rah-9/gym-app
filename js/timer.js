/* Rest timer bar with beep and vibration. The service worker mirrors it into a notification. */
import { $, pad, toast } from './util.js';
import { recordActivity } from './lock.js';
import * as notify from './notify.js';

const timer = { end: 0, id: null, name: '' };
let audioCtx = null;

export function startRest(sec, name) {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  timer.end = Date.now() + sec * 1000;
  timer.name = name || 'Rest';
  $('#restname').textContent = timer.name;
  $('#restbar').hidden = false;
  clearInterval(timer.id);
  tick();
  timer.id = setInterval(tick, 250);
  notify.restStart(timer.end, timer.name);
}

// Used by the +15 s button and by the +15 s action on the notification.
export function setRestEnd(end, fromWorker) {
  if (!timer.id) return;
  timer.end = end;
  tick();
  if (!fromWorker) notify.restSync(timer.end, timer.name);
}
export const addRest = (ms) => setRestEnd(timer.end + ms, false);

function tick() {
  recordActivity();
  const left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  $('#resttime').textContent = Math.floor(left / 60) + ':' + pad(left % 60);
  if (left <= 0) stopRest(true);
}

// finished: the countdown hit zero. fromWorker: the Skip button on the notification was tapped.
export function stopRest(finished, fromWorker) {
  clearInterval(timer.id);
  timer.id = null;
  $('#restbar').hidden = true;
  if (finished) {
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
    beep();
    toast('Rest over. Next set.');
  } else if (!fromWorker) {
    notify.restStop();
  }
}

function beep() {
  if (!audioCtx || document.visibilityState !== 'visible') return;
  try {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.25, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    o.start(); o.stop(audioCtx.currentTime + 0.6);
  } catch (e) { /* ignore */ }
}
