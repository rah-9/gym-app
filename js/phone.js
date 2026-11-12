/* Android app: everything the phone itself can tell us, plus the reminders Android delivers when the app is closed.
   - Health Connect: steps (today and last 7 days), exercise minutes and active calories today.
   - Usage Access: screen time, phone-free time, unlocks, top apps, last night's sleep estimate.
   - Scheduled reminders for the next 2 days: water, steps, workout, wind-down, bedtime, wake up.
   On the website this module does nothing. */
import { S, save } from './store.js';
import { planFor, dayWrite, dayRead, dayStats, hasProgress, requiredItems, findEx, isPick, pickGoal, STEP_GOAL, stepGoalFor, WATER_GOAL } from './plan.js';
import { addDays, todayKey, fromKey } from './util.js';
import * as native from './native.js';

export const SLEEP_DEFAULT = { on: true, bed: '23:00', wake: '06:30' };
export const sleepPlan = () => Object.assign({}, SLEEP_DEFAULT, S.settings.sleep || {});
const hm = (t) => { const [h, m] = String(t || '0:0').split(':').map((x) => parseInt(x, 10) || 0); return [h, m]; };
const at = (k, t, addMin) => { const [h, m] = hm(t); const d = fromKey(k); d.setHours(h, m + (addMin || 0), 0, 0); return d.getTime(); };
export const clock12 = (t) => { const [h, m] = hm(t); return ((h % 12) || 12) + ':' + String(m).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
export function sleepHoursPlanned() { const p = sleepPlan(); const [bh, bm] = hm(p.bed), [wh, wm] = hm(p.wake); let m = (wh * 60 + wm) - (bh * 60 + bm); if (m <= 0) m += 1440; return Math.round(m / 6) / 10; }

let busy = false;
export async function syncAll(ui, ask, done) {
  if (!native.isNativeApp() || busy) return;
  busy = true;
  const today = todayKey();
  try {
    const st = Object.assign({}, ui.health);
    st.avail = await native.healthAvailable();
    if (st.avail) {
      let perms = await native.healthPerms();
      if (ask === 'health' && (!perms.READ_STEPS || !perms.READ_WORKOUTS)) perms = await native.askHealth();
      st.allowed = !!perms.READ_STEPS;
      st.activity = !!perms.READ_WORKOUTS;
      if (st.allowed) {
        const map = await native.readSteps(7);
        Object.keys(map).forEach((k) => {
          const v = map[k];
          if (!v && !S.days[k]) return;
          const d = dayWrite(k);
          const typed = d.stepsSrc !== 'phone' ? parseInt(d.steps, 10) || 0 : 0;
          const val = Math.max(v, typed);
          if (val) d.steps = val;
          if (val === v && v) d.stepsSrc = 'phone';
          d.habits.steps = val >= STEP_GOAL;
        });
      }
      if (st.activity) dayWrite(today).hc = await native.readActivity();
      st.at = Date.now();
    }
    st.usage = await native.usageAllowed();
    if (st.usage) {
      const midnight = fromKey(today).getTime();
      const s = await native.usageSummary(midnight);
      const d = dayWrite(today);
      d.phone = { screenMs: s.screenMs, freeMs: s.freeMs, unlocks: s.unlocks, longestFreeMs: s.longestFreeMs, sleepMs: s.sleepMs || 0, sleepStart: s.sleepStart || 0, sleepEnd: s.sleepEnd || 0, apps: s.apps || [], at: Date.now() };
      // Yesterday's final screen time, for the report.
      const y = addDays(today, -1);
      if (S.days[y] && !(S.days[y].phone && S.days[y].phone.final)) {
        const ys = await native.usageSummary(fromKey(y).getTime());
        S.days[y].phone = Object.assign({}, S.days[y].phone, { screenMs: ys.screenMs, freeMs: ys.freeMs, unlocks: ys.unlocks, longestFreeMs: ys.longestFreeMs, final: true });
      }
      // Fill the check-in sleep from the phone if you have not picked it.
      if (s.sleepMs) {
        d.check = Object.assign({}, d.check);
        if (d.check.sleep == null || d.check.sleepSrc === 'phone') {
          d.check.sleep = Math.max(4, Math.min(9, Math.floor(s.sleepMs / 3600000 + 0.25)));
          d.check.sleepSrc = 'phone';
          d.habits.sleep = s.sleepMs >= 7 * 3600000 - 15 * 60000;
        }
      }
      const p = sleepPlan(), [wh, wm] = hm(p.wake), [bh, bm] = hm(p.bed);
      const morning = wh * 60 + wm + 30, night = bh * 60 + bm - 60;
      native.scheduleSummaries({ enabled: true, morningHour: Math.floor(morning / 60) % 24, morningMinute: morning % 60, nightHour: Math.floor((night + 1440) / 60) % 24, nightMinute: (night + 1440) % 60 });
    }
    ui.health = st;
    save();
    await planReminders();
  } catch (e) {
    ui.health = Object.assign({}, ui.health, { error: String((e && e.message) || e) });
  }
  busy = false;
  if (done) done();
}

/* ---------- water timing ----------
   Mode: 0 off, -1 smart (default), or a fixed gap in minutes.
   Smart spreads the glasses still to drink over the waking time left (wake + 30 min to 1 h before bed),
   so 12 glasses come about once an hour, never closer than 30 min or further apart than 2 h. */
export const waterMode = () => { const w = (S.settings.remind || {}).water; return w == null ? -1 : w; };
export function waterWindow() {
  const p = sleepPlan(), [wh, wm] = hm(p.wake), [bh, bm] = hm(p.bed);
  const start = wh * 60 + wm + 30;
  let end = bh * 60 + bm - 60;
  if (end <= start) end = Math.min(1439, start + 14 * 60);
  return { start, end };
}
export function waterGap(have, nowMs) {
  const mode = waterMode();
  if (mode > 0) return mode;
  const d = new Date(nowMs || Date.now()), nowMin = d.getHours() * 60 + d.getMinutes();
  const left = Math.max(1, WATER_GOAL - have);
  return Math.max(30, Math.min(120, Math.floor((waterWindow().end - nowMin) / left)));
}

/* ---------- state for the Android notification panel ---------- */
function itemSnap(k, e, d) {
  const sets = e.id !== 'warmup' ? Math.max(1, e.sets || 1) : 1;
  const arr = (d.sets[e.id] || []).slice(0, sets).map(Boolean);
  while (arr.length < sets) arr.push(false);
  return { id: e.id, name: e.name, sets, set: arr, done: !!d.done[e.id], rest: sets > 1 ? e.rest || 0 : 0, reps: sets + ' x ' + e.reps };
}
function workoutSnap(k) {
  const p = planFor(k), d = dayRead(k);
  if (isPick(p)) {
    // Pick days: the panel shows the exercises you started, the one you touched last first,
    // so "Set done" ticks what you are doing. The goal is the day's target count.
    const started = p.exercises.filter((e) => d.done[e.id] || (d.sets[e.id] || []).some(Boolean));
    started.sort((a, b) => (b.id === d.lastEx) - (a.id === d.lastEx));
    return { title: p.short + ' day', goal: pickGoal(k), items: started.map((e) => itemSnap(k, e, d)) };
  }
  return {
    title: p.short + ' day',
    items: requiredItems(k).map((it) => {
      const e = it.id === 'cardio' ? null : findEx(k, it.id);
      const sets = e && e.id !== 'warmup' ? Math.max(1, e.sets || 1) : 1;
      const arr = (d.sets[it.id] || []).slice(0, sets).map(Boolean);
      while (arr.length < sets) arr.push(false);
      const reps = e ? (e.id === 'warmup' ? e.reps : sets + ' x ' + e.reps) : p.cardio ? p.cardio.detail : '';
      return { id: it.id, name: it.name, sets, set: arr, done: !!d.done[it.id], rest: e && sets > 1 ? e.rest || 0 : 0, reps: String(reps || '') };
    })
  };
}
export function nativeState() {
  const today = todayKey(), d = dayRead(today), w = waterWindow(), workouts = {};
  for (let i = 0; i < 3; i++) { const k = addDays(today, i); if (!planFor(k).rest) workouts[k] = workoutSnap(k); }
  return {
    date: today, water: d.water || 0, waterAt: d.waterAt || 0, waterGoal: WATER_GOAL, waterMode: waterMode(),
    startMin: w.start, endMin: w.end, on: S.settings.notify !== false,
    workouts, active: !planFor(today).rest && hasProgress(today) && dayStats(today).pct < 100
  };
}
export function pushState() { if (native.isNativeApp()) native.fitSync(nativeState()); }

/* Reminders for today and the next 2 days. Rebuilt every time the app opens or you tick something,
   so a reminder for something already done is dropped. Water is run by the Android side itself,
   so a glass logged from the notification moves the next reminder. */
export async function planReminders() {
  if (!native.isNativeApp() || S.settings.notify === false) return;
  const r = S.settings.remind || {}, stepsOn = r.steps !== false, workOn = r.workout !== false;
  const sp = sleepPlan(), now = Date.now(), today = todayKey(), list = [], water = [];
  let n = 0;
  const add = (time, title, body, kind, to) => { if (time > now + 30000 && n < 400) (to || list).push({ id: 20000 + n++, at: time, title, body, kind }); };
  for (let i = 0; i < 3; i++) {
    const k = addDays(today, i), p = planFor(k), d = dayRead(k), isToday = k === today;
    // Workout
    if (workOn && !p.rest && !(isToday && hasProgress(k))) {
      add(at(k, '07:00'), 'Today: ' + p.focus, 'Morning window is open. ' + p.exercises.filter((e) => !e.bonus).length + ' exercises + cardio.', 'workout');
      add(at(k, '18:30'), 'Still time to train', p.focus + ' is waiting. An evening session counts.', 'workout');
    }
    // Water, only for an older app build that cannot run water reminders itself.
    const have = isToday ? d.water || 0 : 0;
    if (waterMode() !== 0 && have < WATER_GOAL) {
      const win = waterWindow();
      let t = Math.max(at(k, '00:00', win.start), isToday ? now : 0), got = have;
      while (got < WATER_GOAL && t <= at(k, '00:00', win.end)) { add(t, 'Drink a glass of water', got + ' of ' + WATER_GOAL + ' glasses so far.', 'water', water); got++; t += waterGap(got, t) * 60000; }
    }
    // Steps
    if (stepsOn) {
      const goal = stepGoalFor(k), have2 = parseInt(d.steps, 10) || 0;
      if (!(isToday && have2 >= goal)) ['17:00', '19:00', '21:00'].forEach((t) => add(at(k, t), 'Steps check', isToday && have2 ? (goal - have2).toLocaleString('en-IN') + ' steps to your goal. A 15 min walk is about 1,500.' : 'Walk after dinner to close your step goal.', 'steps'));
    }
    // Sleep schedule
    if (sp.on) {
      add(at(k, sp.bed, -30), 'Wind down', 'Bed at ' + clock12(sp.bed) + '. Phone away, lights low.', 'winddown');
      add(at(k, sp.bed), 'Time to sleep', 'Aim for ' + sleepHoursPlanned() + ' hours. Same time every night helps most.', 'sleep');
      add(at(addDays(k, 1), sp.wake), 'Time to wake up', 'Water first, then weigh in and do your check-in.', 'wake');
    }
  }
  native.setPlanFallback(water);
  pushState();
  await native.replacePlanned(list);
}

// Phone-use numbers as text: 3 h 05 min.
export const hrs = (ms) => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
export const timeOf = (ms) => { const d = new Date(ms); const h = d.getHours(); return ((h % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
