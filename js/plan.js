/* Plan logic: which workout a day gets, what counts as done, streaks and last weights. */
import { WORKOUTS, SCHEDULE, WARMUP, HABITS, MEALS, PROGRAM_START } from './data.js';
import { S, dayHasProgress } from './store.js';
import { addDays, todayKey, dow, fromKey } from './util.js';

export const STEP_GOAL = 10000;
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first

/* ---------- schedule ---------- */

// The user's own week (from the Plan tab) or the default one.
export function schedule() {
  const s = S.settings.schedule;
  if (Array.isArray(s) && s.length === 7 && s.every((k) => WORKOUTS[k])) return s;
  return SCHEDULE;
}

export function setScheduleDay(dayIndex, key) {
  if (!WORKOUTS[key]) return;
  const s = schedule().slice();
  s[dayIndex] = key;
  S.settings.schedule = s;
  // Upcoming days with nothing ticked move to the new workout.
  const today = todayKey();
  Object.keys(S.days).forEach((k) => {
    if (k >= today && dow(k) === dayIndex && !hasProgress(k)) S.days[k].plan = key;
  });
}

export function resetSchedule() {
  SCHEDULE.forEach((key, i) => setScheduleDay(i, key));
  delete S.settings.schedule;
}

// A day that already has data keeps the workout it was logged under,
// so changing the schedule never rewrites history.
export function workoutKeyFor(k) {
  const d = S.days[k];
  if (d && d.plan && WORKOUTS[d.plan]) return d.plan;
  return schedule()[dow(k)];
}
export const planFor = (k) => WORKOUTS[workoutKeyFor(k)];

/* ---------- day records ---------- */
const EMPTY = Object.freeze({ done: {}, sets: {}, kg: {}, habits: {}, meals: {}, note: '' });
export const dayRead = (k) => S.days[k] || EMPTY;

export function dayWrite(k) {
  let d = S.days[k];
  if (!d) d = S.days[k] = { plan: workoutKeyFor(k), done: {}, sets: {}, kg: {}, habits: {}, meals: {}, note: '' };
  ['done', 'sets', 'kg', 'habits', 'meals'].forEach((f) => { d[f] = d[f] || {}; });
  if (!d.plan) d.plan = workoutKeyFor(k);
  return d;
}

export const hasProgress = (k) => dayHasProgress(S.days[k]);

/* ---------- exercises ---------- */
export const mainExercises = (p) => [WARMUP].concat(p.exercises.filter((e) => !e.bonus));
export const bonusExercises = (p) => p.exercises.filter((e) => e.bonus);

export function findEx(k, id) {
  if (id === 'warmup') return WARMUP;
  const p = planFor(k);
  return p.rest ? null : p.exercises.find((e) => e.id === id) || null;
}

export const EX_NAMES = (() => {
  const m = {};
  Object.values(WORKOUTS).forEach((p) => { if (!p.rest) p.exercises.forEach((e) => { m[e.id] = e.name; }); });
  return m;
})();

export function requiredItems(k) {
  const p = planFor(k);
  if (p.rest) return p.tasks.map((t) => ({ id: t.id, name: t.name }));
  const items = mainExercises(p).map((e) => ({ id: e.id, name: e.name }));
  items.push({ id: 'cardio', name: 'Cardio: ' + p.cardio.name });
  return items;
}

// The first main item not ticked yet, for the "Up next" highlight and the notification.
export function nextUp(k) {
  const d = dayRead(k);
  return requiredItems(k).find((it) => !d.done[it.id]) || null;
}

export function lastKg(k, id) {
  for (let i = 1; i <= 90; i++) {
    const kk = addDays(k, -i), d = S.days[kk];
    if (d && d.kg && d.kg[id]) { const v = parseFloat(d.kg[id]); if (v > 0) return { kg: v, k: kk }; }
  }
  return null;
}

// Last weight used, and a suggested next weight when every set was finished that day.
export function weightHint(k, e) {
  const last = lastKg(k, e.id);
  if (!last) return null;
  const done = ((S.days[last.k] || {}).sets || {})[e.id] || [];
  const allSets = e.sets > 1 && done.length >= e.sets && done.slice(0, e.sets).every(Boolean);
  const step = last.kg < 10 ? 1 : 2.5;
  return { kg: last.kg, k: last.k, allSets, next: Math.round((last.kg + step) * 10) / 10 };
}

// Main muscles a workout trains, short names, in order of first use.
export function musclesFor(p) {
  if (p.rest) return [];
  const seen = new Set();
  mainExercises(p).forEach((e) => (e.main || []).forEach((m) => {
    const short = m.replace(/\s*\(.*\)/, '');
    if (short !== 'Whole body') seen.add(short);
  }));
  return Array.from(seen);
}

/* ---------- stats ---------- */
export function dayStats(k) {
  const d = dayRead(k), p = planFor(k), req = requiredItems(k);
  let done = 0;
  const missed = [];
  req.forEach((it) => { if (d.done[it.id]) done++; else missed.push(it.name); });
  let sets = 0;
  Object.keys(d.sets).forEach((id) => { (d.sets[id] || []).forEach((v) => { if (v) sets++; }); });
  const bonusDone = p.rest ? 0 : bonusExercises(p).filter((e) => d.done[e.id]).length;
  return {
    total: req.length, done, pct: req.length ? Math.round(done / req.length * 100) : 0,
    missed, sets, bonusDone,
    habitsDone: HABITS.filter((h) => d.habits[h.id]).length, habitsTotal: HABITS.length,
    mealsDone: MEALS.filter((m) => d.meals[m.id]).length, mealsTotal: MEALS.length,
    steps: parseInt(d.steps, 10) || 0
  };
}

// Days before the program start only count if something was ticked on them.
export function counts(k) {
  if (k >= PROGRAM_START) return true;
  const d = dayRead(k);
  return Object.keys(d.done).some((id) => d.done[id]);
}

export function dayStatus(k) {
  const today = todayKey(), p = planFor(k), st = dayStats(k);
  if (k > today) return 'upcoming';
  if (!counts(k) && k !== today) return 'pre';
  if (p.rest) return st.done > 0 ? 'done' : (k === today ? 'today' : 'rest');
  if (st.pct === 100) return 'done';
  if (k === today) return 'today';
  return st.done > 0 ? 'partial' : 'missed';
}
export const STATUS_LABEL = { done: 'Done', partial: 'Partial', missed: 'Missed', upcoming: 'Upcoming', today: 'Today', rest: 'Rest', pre: 'Before start' };

// Full training days in a row. Rest days don't break it; today only adds once complete.
export function streak() {
  const today = todayKey();
  let k = today, count = 0;
  for (let i = 0; i < 400; i++) {
    if (!counts(k) && k !== today) break;
    if (!planFor(k).rest) {
      if (dayStats(k).pct === 100) count++;
      else if (k !== today) break;
    }
    k = addDays(k, -1);
  }
  return count;
}

export function programWeek(k) {
  const diff = Math.round((fromKey(k) - fromKey(PROGRAM_START)) / 864e5);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

export function stepsPct(v) { return Math.min(100, Math.round((parseInt(v, 10) || 0) / STEP_GOAL * 100)); }
