/* App start-up and all tap/typing handlers. */
import { S, save, backupNow, checkBackupSchedule, autoRestore, restoreLatest, importBackup, exportBackup, wipeAll, requestPersistentStorage } from './store.js';
import { planFor, dayWrite, dayStats, nextUp, findEx, hasProgress, setScheduleDay, resetSchedule, STEP_GOAL, stepsPct } from './plan.js';
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

function celebrate() {
  const st = dayStats(ui.selDate);
  if (st.pct === 100) toast(planFor(ui.selDate).rest ? 'Rest day done.' : 'Workout complete. Eat your protein.');
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
  save(); render(); pushProgress(); celebrate();
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
  save(); render(); pushProgress();
  if (arr[i] && !all && ex.rest) startRest(ex.rest, ex.name);
  if (all) celebrate();
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
  set: (el) => toggleSet(el.dataset.id, +el.dataset.i),
  habit: (el) => { const d = dayWrite(ui.selDate); d.habits[el.dataset.id] = !d.habits[el.dataset.id]; save(); render(); },
  meal: (el) => { const d = dayWrite(ui.selDate); d.meals[el.dataset.id] = !d.meals[el.dataset.id]; save(); render(); },
  rest: (el) => startRest(+el.dataset.sec, el.dataset.name),
  'rest-stop': () => stopRest(false),
  'rest-add': () => addRest(15000),
  pick: (el) => { ui.selDate = el.dataset.k; render(); top(); },
  shift: (el) => { ui.selDate = addDays(ui.selDate, +el.dataset.n); render(); },
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
