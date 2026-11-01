/* Android app: everything the phone itself can tell us, plus the reminders Android delivers when the app is closed.
   - Health Connect: steps (today and last 7 days), exercise minutes and active calories today.
   - Usage Access: screen time, phone-free time, unlocks, top apps, last night's sleep estimate.
   - Scheduled reminders for the next 2 days: water, steps, workout, wind-down, bedtime, wake up.
   On the website this module does nothing. */
import { S, save } from './store.js';
import { planFor, dayWrite, dayRead, hasProgress, STEP_GOAL, stepGoalFor, WATER_GOAL } from './plan.js';
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

/* Reminders for today and the next 2 days. Rebuilt every time the app opens or you tick something,
   so a reminder for something already done is dropped. */
export async function planReminders() {
  if (!native.isNativeApp() || S.settings.notify === false) return;
  const r = S.settings.remind || {}, water = r.water == null ? 30 : r.water, stepsOn = r.steps !== false, workOn = r.workout !== false;
  const sp = sleepPlan(), now = Date.now(), today = todayKey(), list = [];
  let n = 0;
  const add = (time, title, body) => { if (time > now + 30000 && n < 400) list.push({ id: 20000 + n++, at: time, title, body }); };
  for (let i = 0; i < 3; i++) {
    const k = addDays(today, i), p = planFor(k), d = dayRead(k), isToday = k === today;
    // Workout
    if (workOn && !p.rest && !(isToday && hasProgress(k))) {
      add(at(k, '07:00'), 'Today: ' + p.focus, 'Morning window is open. ' + p.exercises.filter((e) => !e.bonus).length + ' exercises + cardio.');
      add(at(k, '18:30'), 'Still time to train', p.focus + ' is waiting. An evening session counts.');
    }
    // Water
    if (water > 0 && !(isToday && (d.water || 0) >= WATER_GOAL)) {
      for (let m = 8 * 60; m <= 21 * 60 + 30; m += water) add(at(k, '00:00', m), 'Water time', 'One glass now. Goal ' + WATER_GOAL + ' glasses a day.');
    }
    // Steps
    if (stepsOn) {
      const goal = stepGoalFor(k), have = parseInt(d.steps, 10) || 0;
      if (!(isToday && have >= goal)) ['17:00', '19:00', '21:00'].forEach((t) => add(at(k, t), 'Steps check', isToday && have ? (goal - have).toLocaleString('en-IN') + ' steps to your goal. A 15 min walk is about 1,500.' : 'Walk after dinner to close your step goal.'));
    }
    // Sleep schedule
    if (sp.on) {
      add(at(k, sp.bed, -30), 'Wind down', 'Bed at ' + clock12(sp.bed) + '. Phone away, lights low.');
      add(at(k, sp.bed), 'Time to sleep', 'Aim for ' + sleepHoursPlanned() + ' hours. Same time every night helps most.');
      add(at(addDays(k, 1), sp.wake), 'Time to wake up', 'Water first, then weigh in and do your check-in.');
    }
  }
  await native.replacePlanned(list);
}

// Phone-use numbers as text: 3 h 05 min.
export const hrs = (ms) => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };
export const timeOf = (ms) => { const d = new Date(ms); const h = d.getHours(); return ((h % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
