/* App start-up and all tap/typing handlers. */
import { S, save, backupNow, checkBackupSchedule, autoRestore, restoreLatest, importBackup, exportBackup, wipeAll, requestPersistentStorage } from './store.js';
import { planFor, dayWrite, dayStats, nextUp, findEx, hasProgress, setScheduleDay, resetSchedule, STEP_GOAL, stepsPct, streak, monthStats } from './plan.js';
import { reportData, reportText, docReport, pdfReport } from './report.js';
import { ui, render, stepsNote } from './views.js';
import { startRest, addRest, setRestEnd, stopRest } from './timer.js';
import { initLock, isUnlocked, showLock, lockNow, recordActivity } from './lock.js';
import * as notify from './notify.js';
import { $, todayKey, addDays, weekStartOf, toast, download } from './util.js';

const top = () => window.scrollTo(0, 0);

// After each tick on today's list, refresh the notification in the phone's panel.
function pushProgress() {
  if (ui.selDate !== todayKey()) return;
  const p = planFor(ui.selDate), st = dayStats(ui.selDate), nx = nextUp(ui.selDate);
  notify.workoutProgress({ title: p.rest ? 'Rest day' : p.short + ' day', done: st.done, total: st.total, pct: st.pct, next: nx && nx.name });
}

// Feedback after every tick, and a full celebration the first time a day is finished.
const CHEERS = [
  'You showed up and finished it. That is how bodies change.',
  'Every rep today was a vote for the person you are becoming.',
  'Done. Future you is already thankful.',
  'Consistency beats intensity, and you just proved it.',
  'Another brick in the wall. Keep stacking.'
];
const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

function celebrate(justTicked) {
  const k = ui.selDate, st = dayStats(k), p = planFor(k);
  if (st.pct < 100) {
    if (justTicked && !p.rest) toast('Nice. ' + st.done + ' of ' + st.total + ' done.');
    return;
  }
  const d = dayWrite(k);
  if (d.celebrated) { if (justTicked) toast(p.rest ? 'Rest day done.' : 'Workout complete.'); return; }
  d.celebrated = true; save();
  showCelebration(k, st, p);
}

function showCelebration(k, st, p) {
  const sk = streak(), m = monthStats(k);
  const milestone = !p.rest && MILESTONES.includes(sk) ? sk : 0;
  const line = p.rest ? 'Recovery is part of the plan. Muscles grow on rest days.' : CHEERS[Math.floor(Math.random() * CHEERS.length)];
  const el = document.createElement('div');
  el.className = 'celebrate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Workout complete');
  el.innerHTML = '<canvas class="confetti" aria-hidden="true"></canvas>' +
    '<div class="cel-card">' +
    '<div class="cel-check" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27 l7 7 l15 -16"/></svg></div>' +
    '<h2 class="cel-title">' + (p.rest ? 'Rest day done' : 'Workout complete') + '</h2>' +
    (milestone ? '<div class="cel-milestone">' + milestone + ' day streak</div>' : '') +
    '<p class="cel-line">' + line + '</p>' +
    (p.rest ? '' : '<div class="cel-stats">' +
      '<div><b>' + st.done + '</b><span>items done</span></div>' +
      '<div><b>' + st.sets + '</b><span>sets</span></div>' +
      '<div><b>' + sk + '</b><span>day streak</span></div>' +
      '<div><b>' + m.worked + '</b><span>days in ' + m.name + '</span></div></div>') +
    (p.rest ? '' : '<p class="cel-tip">Refuel with protein within the next hour.</p>') +
    '<div class="cel-actions"><button type="button" class="primary" data-cel="close">Keep going</button>' +
    '<button type="button" class="ghost" data-cel="report">See my week</button></div></div>';
  document.body.appendChild(el);
  try { if (navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 140]); } catch (e) { /* ignore */ }
  requestAnimationFrame(() => el.classList.add('show'));
  const stopConfetti = confetti(el.querySelector('canvas'));
  const close = (go) => {
    stopConfetti(); el.classList.remove('show');
    setTimeout(() => el.remove(), 250);
    if (go) { ui.view = 'report'; ui.reportWs = weekStartOf(k); render(); top(); }
  };
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-cel]');
    if (b) close(b.dataset.cel === 'report');
  });
}

// Light confetti on a canvas: mint, teal, gold and white. Skipped when the phone asks for reduced motion.
function confetti(canvas) {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1;
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const colors = ['#3DDC97', '#7CF0C0', '#2BB8D9', '#E9C46A', '#F4F7F6'];
  const parts = Array.from({ length: 130 }, () => ({
    x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.42,
    vx: (Math.random() - 0.5) * 16 * dpr, vy: (-Math.random() * 15 - 6) * dpr,
    w: (5 + Math.random() * 5) * dpr, h: (8 + Math.random() * 6) * dpr,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, c: colors[(Math.random() * colors.length) | 0]
  }));
  let raf = 0, t0 = performance.now(), live = true;
  const step = (t) => {
    if (!live) return;
    const age = (t - t0) / 1000;
    ctx.clearRect(0, 0, W, H);
    parts.forEach((q) => {
      q.vy += 0.42 * dpr; q.vx *= 0.99; q.x += q.vx; q.y += q.vy; q.r += q.vr;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 3.2); ctx.translate(q.x, q.y); ctx.rotate(q.r);
      ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); ctx.restore();
    });
    if (age < 3.4) raf = requestAnimationFrame(step); else ctx.clearRect(0, 0, W, H);
  };
  raf = requestAnimationFrame(step);
  return () => { live = false; cancelAnimationFrame(raf); };
}

function markJustDone(id, on) {
  if (!on) return;
  ui.justDone = id;
  setTimeout(() => { if (ui.justDone === id) ui.justDone = null; }, 700);
}

function toggleDone(id) {
  const d = dayWrite(ui.selDate);
  d.done[id] = !d.done[id];
  const e = findEx(ui.selDate, id);
  if (e && e.sets > 1) {
    // Ticking the whole exercise fills every set; unticking clears them so the two never disagree.
    if (d.done[id]) { if (!d.sets[id] || !d.sets[id].some(Boolean)) d.sets[id] = Array(e.sets).fill(true); }
    else delete d.sets[id];
  }
  markJustDone(id, d.done[id]);
  save(); render(); pushProgress(); celebrate(d.done[id]);
}

function toggleSet(id, i) {
  const ex = findEx(ui.selDate, id);
  if (!ex) return;
  const d = dayWrite(ui.selDate);
  const arr = (d.sets[id] || []).slice();
  while (arr.length < ex.sets) arr.push(false);
  arr[i] = !arr[i];
  d.sets[id] = arr;
  const all = arr.every(Boolean);
  d.done[id] = all;
  markJustDone(id, all);
  save(); render(); pushProgress();
  if (arr[i] && !all && ex.rest) startRest(ex.rest, ex.name);
  if (all) celebrate(true);
}

function notifyOn() {
  notify.enable().then((p) => {
    render();
    if (p === 'granted') { toast('Notifications on.'); pushProgress(); }
    else if (p === 'denied') toast('Blocked. Allow notifications in your phone settings.');
    else if (p === 'unsupported') toast('This browser cannot show notifications.');
  });
}

let wipeArmed = false;
const ACTIONS = {
  done: (el) => toggleDone(el.dataset.id),
  expand: (el) => { const id = el.dataset.id; ui.open[id] = el.getAttribute('aria-expanded') !== 'true'; render(); },
  set: (el) => toggleSet(el.dataset.id, +el.dataset.i),
  habit: (el) => { const d = dayWrite(ui.selDate); d.habits[el.dataset.id] = !d.habits[el.dataset.id]; save(); render(); },
  meal: (el) => { const d = dayWrite(ui.selDate); d.meals[el.dataset.id] = !d.meals[el.dataset.id]; save(); render(); },
  rest: (el) => startRest(+el.dataset.sec, el.dataset.name),
  'rest-stop': () => stopRest(false),
  'rest-add': () => addRest(15000),
  pick: (el) => { ui.selDate = el.dataset.k; ui.open = {}; render(); top(); },
  shift: (el) => { ui.selDate = addDays(ui.selDate, +el.dataset.n); ui.open = {}; render(); },
  rweek: (el) => { ui.reportWs = addDays(ui.reportWs, +el.dataset.n); render(); },
  'go-report': () => { ui.view = 'report'; ui.reportWs = weekStartOf(ui.selDate); render(); top(); },
  'save-body': () => {
    const v = parseFloat($('#bodykg').value);
    if (isNaN(v) || v < 30 || v > 250) { toast('Enter your weight in kg, like 111.'); return; }
    S.body[todayKey()] = Math.round(v * 10) / 10; save(); render(); toast('Weight saved.');
  },
  'copy-report': () => {
    const txt = reportText(reportData(ui.reportWs));
    const fallback = () => download('gym-report-' + ui.reportWs + '.txt', txt);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('Report copied.'), fallback);
    else fallback();
  },
  'pdf-report': () => pdfReport(reportData(ui.reportWs)),
  'doc-report': () => { docReport(reportData(ui.reportWs)); toast('Word report downloaded.'); },
  dismiss: () => { S.settings.dismissed = todayKey(); save(); render(); },
  'diet-toggle': (el) => { S.settings.dietOpen = !el.parentElement.open; save(); },
  'notify-on': notifyOn,
  'notify-later': () => { S.settings.notifyAsked = true; save(); render(); toast('You can turn them on later in the Plan tab.'); },
  'notify-off': () => { notify.disable(); render(); toast('Notifications off.'); },
  'notify-test': () => notify.show('hello', 'Gym log', 'Notifications are working.', { silent: false, renotify: true }),
  'sched-reset': () => { resetSchedule(); save(); render(); toast('Default week restored.'); },
  'backup-now': () => { toast(backupNow('manual') ? 'Backup saved on this phone.' : 'Nothing to back up yet.'); render(); },
  'restore-autobackup': () => {
    restoreLatest((date, count) => confirm('Restore auto-backup from ' + date + ' (' + count + ' days of data)?')).then((res) => {
      if (res.ok) { render(); toast('Restored ' + res.count + ' days from auto-backup.'); }
      else if (res.reason === 'none') toast('No auto-backup found in this browser yet.');
    });
  },
  export: () => download('gym-backup-' + todayKey() + '.json', exportBackup(), 'application/json'),
  lock: () => { stopRest(false); lockNow(); },
  wipe: (el) => {
    if (!wipeArmed) {
      wipeArmed = true;
      el.textContent = 'Tap again to erase everything';
      setTimeout(() => { wipeArmed = false; render(); }, 4000);
      return;
    }
    wipeArmed = false;
    wipeAll(); notify.close('workout'); render(); toast('All data erased.');
  }
};

document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-action],[data-view]');
  if (!el) return;
  if (el.dataset.view) { ui.view = el.dataset.view; render(); top(); return; }
  const fn = ACTIONS[el.dataset.action];
  if (fn) fn(el);
});

document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (t.dataset.kg) { dayWrite(ui.selDate).kg[t.dataset.kg] = t.value; save(); }
  else if (t.dataset.note) { dayWrite(ui.selDate).note = t.value; save(); }
  else if (t.dataset.steps) {
    const d = dayWrite(ui.selDate), n = parseInt(t.value, 10) || 0;
    d.steps = n > 0 ? n : '';
    d.habits.steps = n >= STEP_GOAL;
    save();
    const b = $('#steps-bar'), nt = $('#steps-note');
    if (b) b.style.width = stepsPct(n) + '%';
    if (nt) nt.textContent = stepsNote(n);
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.steps) { render(); return; }
  if (t.dataset.swap) {
    if (hasProgress(ui.selDate)) return;
    dayWrite(ui.selDate).plan = t.value;
    save(); render(); toast('Switched to ' + planFor(ui.selDate).focus + '.');
    return;
  }
  if (t.dataset.sched != null) {
    setScheduleDay(+t.dataset.sched, t.value);
    save(); render(); toast('Week updated.');
    return;
  }
  if (t.id === 'importfile' && t.files[0]) {
    const fr = new FileReader();
    fr.onload = () => {
      try { importBackup(fr.result); render(); toast('Backup restored.'); }
      catch (e) { toast('That file is not a gym backup.'); }
    };
    fr.readAsText(t.files[0]);
  }
});

/* ---------- start-up ---------- */
function showApp() {
  recordActivity();
  ui.selDate = todayKey();
  ui.reportWs = weekStartOf(ui.selDate);
  requestPersistentStorage();
  render();
}

// A new day starts a fresh list: move to it when the date changes while the app stays open.
let lastDay = todayKey();
function checkNewDay() {
  const now = todayKey();
  if (now === lastDay) return;
  if (ui.selDate === lastDay) ui.selDate = now;
  lastDay = now;
  notify.close('workout');
  if (!$('#root').hidden) render();
}

notify.init({
  restSync: (end) => setRestEnd(end, true),
  restCancel: () => stopRest(false, true)
});
initLock(showApp);
requestPersistentStorage();
autoRestore().then((restored) => { if (restored && !$('#root').hidden) render(); });

setInterval(() => { checkNewDay(); checkBackupSchedule(); }, 30000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (!isUnlocked()) { showLock(); return; }
  checkNewDay();
  checkBackupSchedule();
});

if (isUnlocked()) {
  $('#lock').hidden = true;
  $('#root').hidden = false;
  showApp();
} else {
  showLock();
}
