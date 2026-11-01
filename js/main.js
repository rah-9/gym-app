/* App start-up and all tap/typing handlers. */
import { S, save, backupNow, checkBackupSchedule, autoRestore, restoreLatest, importBackup, exportBackup, wipeAll, requestPersistentStorage } from './store.js';
import { planFor, dayWrite, dayStats, nextUp, findEx, hasProgress, setScheduleDay, resetSchedule, STEP_GOAL, stepsPct, streak, monthStats, bestKg, sessionMinutes, EX_NAMES, WATER_GOAL, noteTarget, treatInfo, treatPoints, ptsLabel, balanceFor, stepGoalFor, treatDays } from './plan.js';
import { reportData, reportText, docReport, pdfReport } from './report.js';
import { foodInfo } from './track.js';
import { ui, render, stepsNote, daySheetHtml, noteStatus, sessionLabel, treatSheetHtml } from './views.js';
import { startRest, addRest, setRestEnd, stopRest } from './timer.js';
import { initLock, isUnlocked, showLock, lockNow, recordActivity } from './lock.js';
import * as notify from './notify.js';
import { $, todayKey, addDays, weekStartOf, toast, download, fmt, dow, DAY_NAMES } from './util.js';

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
  d.celebrated = true;
  if (d.start && !d.end && k === todayKey()) d.end = Date.now();
  save();
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
      (sessionMinutes(k) != null ? '<div><b>' + sessionMinutes(k) + '</b><span>minutes</span></div>' : '<div><b>' + st.done + '</b><span>items done</span></div>') +
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
  const colors = ['#ffffff', '#e4e4ea', '#b9a8ff', '#d9d0ff', '#f5c451', '#c9c9d1'];
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

// Bottom sheet with one day's details, opened from the Report calendar.
function openSheet(k) {
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = daySheetHtml(k);
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  el.addEventListener('click', (ev) => {
    if (ev.target === el) return close();
    const b = ev.target.closest('[data-sheet]');
    if (!b) return;
    close();
    if (b.dataset.sheet === 'open') { ui.selDate = b.dataset.k; ui.view = 'today'; ui.open = {}; render(); top(); }
  });
}

function openTreatSheet() {
  const el = document.createElement('div');
  el.className = 'sheet';
  el.innerHTML = treatSheetHtml();
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  const close = () => { el.classList.remove('show'); setTimeout(() => el.remove(), 250); };
  el.addEventListener('click', (ev) => {
    if (ev.target === el || ev.target.closest('[data-sheet]')) return close();
    const b = ev.target.closest('[data-treat]');
    if (!b) return;
    const info = treatInfo(b.dataset.treat), d = dayWrite(ui.selDate);
    d.treats = (d.treats || []).concat([{ id: info.id, kcal: info.kcal, at: Date.now() }]);
    d.habits.nojunk = false;
    save(); close(); render();
    const days = treatDays(ui.selDate, d.treats[d.treats.length - 1]);
    toast(info.name + ' logged, ' + ptsLabel(treatPoints(info.kcal)) + '. Balance plan ' + (days[0] === todayKey() ? 'added to today' : 'starts tomorrow') + (days.length > 1 ? ', over 2 days' : '') + '.');
  });
}

// Keep the session time on the hero ticking while the app is open.
setInterval(() => {
  const s = $('#sess');
  if (s) s.textContent = sessionLabel(ui.selDate);
}, 30000);

function markJustDone(id, on) {
  if (!on) return;
  ui.justDone = id;
  setTimeout(() => { if (ui.justDone === id) ui.justDone = null; }, 700);
}

// The session clock starts at the first tick of the day and stops when the day is finished.
function stamp(d, on) {
  if (!on || ui.selDate !== todayKey()) return;
  if (!d.start) d.start = Date.now();
  d.lastTick = Date.now();
}

function toggleDone(id) {
  const d = dayWrite(ui.selDate);
  d.done[id] = !d.done[id];
  stamp(d, d.done[id]);
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
  stamp(d, arr[i]);
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
  'cal-day': (el) => openSheet(el.dataset.k),
  'treat-open': () => openTreatSheet(),
  'treat-del': (el) => {
    const d = dayWrite(ui.selDate);
    (d.treats || []).splice(+el.dataset.i, 1); save(); render(); toast('Removed.');
  },
  'makeup-tick': (el) => {
    const d = dayWrite(ui.selDate);
    d.makeupDone = Object.assign({}, d.makeupDone);
    d.makeupDone[el.dataset.id] = !d.makeupDone[el.dataset.id];
    save(); render(); if (d.makeupDone[el.dataset.id]) toast('Make-up done. Points coming back.');
  },
  'balance-tick': (el) => {
    const d = dayWrite(ui.selDate);
    d.balanceDone = Object.assign({}, d.balanceDone);
    d.balanceDone[el.dataset.id] = !d.balanceDone[el.dataset.id];
    save(); render(); if (d.balanceDone[el.dataset.id]) toast('Done. Points coming back.');
  },
  effort: (el) => {
    const d = dayWrite(ui.selDate);
    d.effort = Object.assign({}, d.effort);
    d.effort[el.dataset.id] = d.effort[el.dataset.id] === el.dataset.v ? '' : el.dataset.v;
    save(); render();
  },
  check: (el) => {
    const d = dayWrite(ui.selDate), f = el.dataset.f, v = +el.dataset.v;
    d.check = Object.assign({}, d.check);
    d.check[f] = v;
    if (f === 'sleep') d.habits.sleep = v >= 7;
    const c = d.check;
    if (['sleep', 'sore', 'energy', 'pain'].every((x) => c[x] != null) && ui.checkEdit === ui.selDate && f === 'pain') ui.checkEdit = null;
    save(); render();
  },
  'check-edit': () => { ui.checkEdit = ui.selDate; render(); },
  lighter: (el) => {
    const d = dayWrite(ui.selDate);
    d.lighter = el.dataset.v === '1';
    // Keep ticks consistent with the new number of sets.
    const p = planFor(ui.selDate);
    if (!p.rest) p.exercises.forEach((e) => {
      ['sets', 'reps', 'setKg'].forEach((f) => { if (d[f] && Array.isArray(d[f][e.id])) d[f][e.id] = d[f][e.id].slice(0, e.sets); });
      const arr = d.sets[e.id];
      if (arr && arr.length) d.done[e.id] = arr.length >= e.sets && arr.slice(0, e.sets).every(Boolean);
    });
    save(); render(); toast(d.lighter ? 'Lighter day: one set less on each exercise.' : 'Back to the full workout.');
  },
  food: (el) => {
    const d = dayWrite(ui.selDate), id = el.dataset.id;
    d.food = Object.assign({}, d.food);
    d.food[id] = Math.max(0, (d.food[id] || 0) + (+el.dataset.n));
    if (!d.food[id]) delete d.food[id];
    save(); render();
    const it = foodInfo(id);
    if (+el.dataset.n > 0 && it) toast('+' + it.p + ' g protein');
  },
  'food-toggle': (el) => { ui.foodOpen = !el.closest('details').open; },
  'save-me': () => {
    const h = parseFloat(($('#me-h') || {}).value), a = parseInt(($('#me-a') || {}).value, 10), sx = ($('#me-s') || {}).value || 'm';
    if (!(h >= 120 && h <= 230)) { toast('Enter height in cm, like 175.'); return; }
    if (!(a >= 14 && a <= 90)) { toast('Enter your age in years.'); return; }
    S.settings.me = { height: Math.round(h), age: a, sex: sx };
    save(); render(); toast('Saved. Calorie target updated.');
  },
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
  'save-target': () => {
    const v = parseFloat($('#targetkg').value);
    if (isNaN(v) || v < 30 || v > 250) { toast('Enter a target in kg, like 95.'); return; }
    S.settings.targetKg = Math.round(v * 10) / 10;
    const dv = ($('#targetdate') || {}).value;
    if (dv) {
      if (dv <= todayKey()) { toast('Pick a target date in the future.'); return; }
      S.settings.targetDate = dv;
    }
    save(); render();
    toast('Goal set: ' + S.settings.targetKg + ' kg' + (S.settings.targetDate ? ' by ' + fmt(S.settings.targetDate) : '') + '.');
  },
  'clear-date': () => { delete S.settings.targetDate; save(); render(); toast('Target date removed.'); },
  water: (el) => {
    const d = dayWrite(ui.selDate);
    d.water = Math.max(0, Math.min(20, (d.water || 0) + (+el.dataset.n)));
    d.waterAt = Date.now();
    d.habits.water = d.water >= WATER_GOAL;
    save(); render();
    if (+el.dataset.n > 0 && d.water === WATER_GOAL) toast('3 litres done. Water goal hit.');
  },
  'note-for': (el) => {
    const d = dayWrite(ui.selDate);
    d.noteFor = el.dataset.v; save(); render();
    const t = noteTarget(ui.selDate);
    toast(el.dataset.v === 'off' ? 'This note will not come back.' : t ? 'You will see this note on ' + DAY_NAMES[dow(t)] + ', ' + fmt(t) + '.' : 'Write a note first.');
  },
  'remind-water': (el) => { S.settings.remind = Object.assign({}, S.settings.remind, { water: +el.dataset.v }); save(); render(); },
  'remind-steps': () => { const r = S.settings.remind || {}; S.settings.remind = Object.assign({}, r, { steps: r.steps === false }); save(); render(); },
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
  else if (t.dataset.rep || t.dataset.skg) {
    const d = dayWrite(ui.selDate), f = t.dataset.rep ? 'reps' : 'setKg', id = t.dataset.rep || t.dataset.skg, i = +t.dataset.i;
    d[f] = Object.assign({}, d[f]);
    const arr = (d[f][id] || []).slice();
    while (arr.length <= i) arr.push('');
    arr[i] = t.value;
    d[f][id] = arr;
    save();
  }
  else if (t.dataset.brisk) {
    const d = dayWrite(ui.selDate);
    d.brisk = t.value === '' ? undefined : Math.max(0, parseInt(t.value, 10) || 0);
    save();
  }
  else if (t.dataset.note) {
    const d = dayWrite(ui.selDate);
    d.note = t.value; d.noteAt = Date.now(); save();
    const ns = $('#note-status'); if (ns) ns.textContent = noteStatus(d);
  }
  else if (t.dataset.steps) {
    const d = dayWrite(ui.selDate), n = parseInt(t.value, 10) || 0;
    d.steps = n > 0 ? n : '';
    d.habits.steps = n >= STEP_GOAL;
    save();
    const b = $('#steps-bar'), nt = $('#steps-note');
    if (b) b.style.width = stepsPct(n, stepGoalFor(ui.selDate)) + '%';
    if (nt) nt.textContent = stepsNote(n, stepGoalFor(ui.selDate));
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.dataset.steps || t.dataset.brisk) { render(); return; }
  if (t.dataset.rep || t.dataset.skg) return; // keep the keyboard open between set boxes
  if (t.dataset.kg) {
    // New personal best alert when you type a heavier weight than ever before.
    const v = parseFloat(t.value), best = bestKg(t.dataset.kg, ui.selDate);
    if (v > 0 && best && v > best.kg) toast('New personal best: ' + (EX_NAMES[t.dataset.kg] || 'lift') + ', ' + v + ' kg. Previous ' + best.kg + ' kg.');
    return; // no re-render here, so tapping the next box keeps the keyboard open
  }
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

/* ---------- reminders ----------
   Water: every N minutes (default 30) between 7 AM and 10 PM until 12 glasses are logged.
   Steps: every 2 hours from 5 PM until the step goal is reached.
   They show in the notification panel when notifications are on, and as a toast in the app.
   A web app can only run these while it is open or kept in the background; a fully closed app
   would need a push server. */
function nudge(tag, title, body) {
  notify.show(tag, title, body, { silent: false, renotify: true, vibrate: [80, 40, 80] });
  if (document.visibilityState === 'visible' && !$('#root').hidden) toast(body);
}
function remindTick() {
  const r = S.settings.remind || {}, now = new Date(), h = now.getHours(), t = Date.now();
  if (h < 7 || h >= 22) return; // quiet from 10 PM to 7 AM, sleep time
  const d = S.days[todayKey()] || {};
  if (S.settings.lastWaterRemind == null) { S.settings.lastWaterRemind = t; S.settings.lastStepsRemind = t; save(); return; }
  const wInt = r.water == null ? 30 : r.water;
  const water = d.water || 0;
  if (wInt > 0 && water < WATER_GOAL && t - Math.max(S.settings.lastWaterRemind || 0, d.waterAt || 0) >= wInt * 60000) {
    S.settings.lastWaterRemind = t; save();
    nudge('water', 'Drink water', 'Time for a glass of water. ' + water + ' of ' + WATER_GOAL + ' glasses today.');
  }
  const steps = parseInt(d.steps, 10) || 0;
  const goal = stepGoalFor(todayKey());
  if (r.steps !== false && h >= 17 && steps < goal && t - (S.settings.lastStepsRemind || 0) >= 120 * 60000) {
    S.settings.lastStepsRemind = t; save();
    nudge('steps', 'Time to walk', (steps ? steps.toLocaleString('en-IN') + ' of ' + goal.toLocaleString('en-IN') + ' steps. ' : 'Steps not logged yet. ') + 'A 15 minute walk adds about 1,800 steps.');
  }
}
setInterval(remindTick, 60000);
setTimeout(remindTick, 8000);
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
