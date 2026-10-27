/* Plan logic: which workout a day gets, what counts as done, streaks and last weights. */
import { WORKOUTS, SCHEDULE, WARMUP, HABITS, MEALS, PROGRAM_START } from './data.js';
import { S, dayHasProgress } from './store.js';
import { addDays, todayKey, dow, fromKey, keyOf, MONTH_NAMES } from './util.js';

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
  // First use wins, so a main exercise name is not replaced by a lighter bonus version of it.
  Object.values(WORKOUTS).forEach((p) => { if (!p.rest) p.exercises.forEach((e) => { if (!m[e.id] || !e.bonus) m[e.id] = m[e.id] && e.bonus ? m[e.id] : (m[e.id] || e.name); }); });
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

// Heaviest weight ever logged for an exercise, before day `beforeK` when given.
export function bestKg(id, beforeK) {
  let best = null;
  Object.keys(S.days).forEach((k) => {
    if (beforeK && k >= beforeK) return;
    const v = parseFloat(((S.days[k] || {}).kg || {})[id]);
    if (v > 0 && (!best || v > best.kg)) best = { kg: v, k };
  });
  return best;
}

// Progressive overload advice from the last session of this exercise:
//  up   = every set was done last time, so add the smallest jump
//  stay = sets were left last time, so keep the weight and finish them first
//  same = the same weight was used 3 sessions in a row with all sets done, push harder
export function weightHint(k, e) {
  const last = lastKg(k, e.id);
  if (!last) return null;
  const ld = S.days[last.k] || {};
  const setsDone = ((ld.sets || {})[e.id] || []).slice(0, e.sets).filter(Boolean).length;
  const allSets = !!((ld.done || {})[e.id]) || (e.sets > 0 && setsDone >= e.sets);
  const step = last.kg < 10 ? 1 : 2.5;
  const next = Math.round((last.kg + step) * 10) / 10;
  let streakSame = 0;
  for (let i = 1, kk = k; i <= 60 && streakSame < 3; i++) {
    kk = addDays(k, -i);
    const v = parseFloat(((S.days[kk] || {}).kg || {})[e.id]);
    if (!v) continue;
    if (v === last.kg) streakSame++; else break;
  }
  const best = bestKg(e.id, k);
  return {
    kg: last.kg, k: last.k, allSets, setsDone, next, best: best ? best.kg : null,
    status: allSets ? (streakSame >= 3 ? 'push' : 'up') : 'stay'
  };
}

// Notes come back once, on the day you chose: the next time this workout comes round (default),
// tomorrow, or never. noteFor: 'next' | 'tomorrow' | 'off'.
export function nextSameWorkout(k) {
  const key = workoutKeyFor(k);
  for (let i = 1; i <= 21; i++) { const kk = addDays(k, i); if (workoutKeyFor(kk) === key) return kk; }
  return null;
}
export function noteTarget(k) {
  const d = S.days[k];
  if (!d || !(d.note || '').trim()) return null;
  const mode = d.noteFor || 'next';
  if (mode === 'off') return null;
  return mode === 'tomorrow' ? addDays(k, 1) : nextSameWorkout(k);
}
export function notesForDay(k) {
  const out = [];
  for (let i = 1; i <= 21; i++) {
    const kk = addDays(k, -i);
    if (noteTarget(kk) === k) out.push({ k: kk, note: S.days[kk].note.trim() });
  }
  return out;
}
export const lastNoteFor = (k) => notesForDay(k)[0] || null;

/* ---------- body weight ---------- */
// Start = your set start weight or first weigh-in. Rate = kg per week over about the last 4 weeks.
export function bodyStats(upTo) {
  const end = upTo || todayKey();
  const entries = Object.keys(S.body).filter((k) => k <= end && S.body[k] > 0).sort().map((k) => ({ k, kg: +S.body[k] }));
  const target = parseFloat(S.settings.targetKg) || null;
  if (!entries.length) return { entries, target, current: null };
  const first = entries[0], last = entries[entries.length - 1];
  const start = parseFloat(S.settings.startKg) || first.kg;
  const current = last.kg;
  const lost = Math.round((start - current) * 10) / 10;
  const toGo = target != null ? Math.round((current - target) * 10) / 10 : null;
  const pct = target != null && start > target ? Math.max(0, Math.min(100, Math.round((start - current) / (start - target) * 100))) : null;
  const from = entries.filter((e) => e.k <= addDays(last.k, -21)).pop() || first;
  const days = Math.round((fromKey(last.k) - fromKey(from.k)) / 864e5);
  const rate = days >= 6 ? Math.round((from.kg - current) / days * 7 * 10) / 10 : null; // kg lost per week
  let eta = null;
  if (toGo != null && toGo > 0 && rate && rate > 0) eta = addDays(last.k, Math.round(toGo / rate * 7));
  return { entries, target, start, current, last: last.k, lost, toGo, pct, rate, eta, deadline: deadlinePlan(current, toGo, rate) };
}

/* Target date: how fast you need to lose to hit it, and whether that is safe.
   Safe ceiling = 1% of body weight a week, never above 1 kg (common medical guidance is 0.5 to 1 kg a week).
   1 kg of body fat is about 7,700 kcal. */
function deadlinePlan(current, toGo, rate) {
  const date = S.settings.targetDate;
  if (!date || toGo == null || toGo <= 0) return null;
  const today = todayKey();
  const safeMax = Math.min(1, Math.round(current * 0.01 * 10) / 10);
  const safeDate = addDays(today, Math.ceil(toGo / safeMax * 7));
  if (date <= today) return { date, overdue: true, safeMax, safeDate };
  const days = Math.round((fromKey(date) - fromKey(today)) / 864e5);
  const weeks = days / 7;
  const need = Math.round(toGo / weeks * 100) / 100;
  const realistic = Math.round((current - safeMax * weeks) * 10) / 10;
  const kcal = Math.round(Math.min(need, safeMax) * 7700 / 7 / 50) * 50; // daily deficit to aim for, capped at the safe pace
  const status = need > safeMax * 1.1 ? 'unsafe' : rate != null && rate >= need * 0.9 ? 'on' : rate != null ? 'behind' : 'unknown';
  return { date, days, weeks, need, safeMax, safeDate, realistic, kcal, status };
}

// One plain sentence about the target date, used in the app and in every report.
export function deadlineText(b) {
  const dl = b && b.deadline;
  if (!dl) return null;
  const r1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  const D = (k) => { const d = fromKey(k); return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getFullYear(); };
  if (dl.overdue) return { status: 'unsafe', head: 'Target date ' + D(dl.date) + ' has passed', body: 'At a safe ' + r1(dl.safeMax) + ' kg a week you can reach ' + r1(b.target) + ' kg around ' + D(dl.safeDate) + '. Set a new date.' };
  const head = r1(b.toGo) + ' kg by ' + D(dl.date) + ' = ' + r1(dl.need) + ' kg a week';
  if (dl.status === 'unsafe') return { status: 'unsafe', head, body: 'That is faster than the safe ' + r1(dl.safeMax) + ' kg a week and would mostly cost muscle. By ' + D(dl.date) + ' a realistic weight is ' + r1(dl.realistic) + ' kg. At the safe pace, ' + r1(b.target) + ' kg comes around ' + D(dl.safeDate) + '.' };
  if (dl.status === 'on') return { status: 'on', head, body: 'You are on track at ' + r1(b.rate) + ' kg a week. Keep a deficit of about ' + dl.kcal + ' kcal a day.' };
  if (dl.status === 'behind') return { status: 'behind', head, body: 'You are losing ' + r1(b.rate) + ' kg a week, a bit behind. Aim for a deficit of about ' + dl.kcal + ' kcal a day: more steps, no junk, protein every meal.' };
  return { status: 'unknown', head, body: 'Doable and safe. Aim for a deficit of about ' + dl.kcal + ' kcal a day. Weigh in weekly to check your pace.' };
}

export const WATER_GOAL = 12; // glasses of 250 ml = 3 litres

// Session length in minutes from the first tick to the finish (or now if still going).
export function sessionMinutes(k) {
  const d = S.days[k];
  if (!d || !d.start) return null;
  const end = d.end || (k === todayKey() ? Date.now() : d.lastTick || d.start);
  return Math.max(0, Math.round((end - d.start) / 60000));
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

/* ---------- workout days and streaks ----------
   A workout day is a training day (not a rest day) where at least one real exercise was done:
   the exercise ticked, or at least one of its sets ticked. Warm up and cardio alone do not count,
   and you do not need to finish every exercise for the day to count.
   Rest days (Sunday) never add to a streak and never break it.
   Today only adds once you train; an unfinished today never breaks the streak. */
export function workedOut(k) {
  const p = planFor(k), d = S.days[k];
  if (!p || p.rest || !d) return false;
  return p.exercises.some((e) => !!(d.done && d.done[e.id]) || ((d.sets && d.sets[e.id]) || []).some(Boolean));
}

function firstWorkoutDay() {
  return Object.keys(S.days).filter(workedOut).sort()[0] || null;
}

const cap = (end) => { const today = todayKey(); return !end || end > today ? today : end; };

// Workout days in a row, ending on `end` (default today).
export function streak(end) {
  const today = todayKey(), first = firstWorkoutDay();
  if (!first) return 0;
  let k = cap(end), count = 0;
  while (k >= first) {
    if (!planFor(k).rest) {
      if (workedOut(k)) count++;
      else if (k !== today) break;
    }
    k = addDays(k, -1);
  }
  return count;
}

// Longest streak up to `end` (default today), with the first and last day of it.
export function bestStreak(end) {
  const today = todayKey(), last = cap(end), first = firstWorkoutDay();
  const best = { days: 0, from: null, to: null };
  if (!first || first > last) return best;
  let run = 0, from = null;
  for (let k = first; k <= last; k = addDays(k, 1)) {
    if (planFor(k).rest) continue;
    if (workedOut(k)) {
      if (!run) from = k;
      run++;
      if (run > best.days) { best.days = run; best.from = from; best.to = k; }
    } else if (k !== today) run = 0;
  }
  return best;
}

// Workout days in the calendar month of `k`, up to today, against training days so far.
// A training day counts as "so far" once it has passed, or today once you train.
export function monthStats(k) {
  const d = fromKey(k), today = todayKey();
  const start = keyOf(new Date(d.getFullYear(), d.getMonth(), 1));
  const end = keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  let worked = 0, planned = 0;
  for (let x = start; x <= end && x <= today; x = addDays(x, 1)) {
    const w = workedOut(x);
    if (w) worked++;
    if (planFor(x).rest || (!counts(x) && !w)) continue;
    if (x < today || w) planned++;
  }
  return { worked, planned, name: MONTH_NAMES[d.getMonth()] };
}

// Every workout day ever logged.
export const totalWorkoutDays = () => Object.keys(S.days).filter(workedOut).length;

export function programWeek(k) {
  const diff = Math.round((fromKey(k) - fromKey(PROGRAM_START)) / 864e5);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

export function stepsPct(v) { return Math.min(100, Math.round((parseInt(v, 10) || 0) / STEP_GOAL * 100)); }

/* ---------- treats, penalty points and the balance plan ----------
   Logging junk food costs penalty points (1 point per 250 kcal rounded, min 1, max 8 for one item).
   Instead of burning the food off, which research links to more overeating and weight cycling,
   the next 1 to 3 days get a small, capped balance plan: a few extra steps, a little extra
   easy cardio, and junk-free days. Never skip meals. Finishing the balance plan earns the
   points back. Calories are rough averages for Indian portions. */
export const TREATS = [
  { id: 'pizza-whole', name: 'Pizza, whole medium', kcal: 1800 },
  { id: 'pizza-half', name: 'Pizza, half', kcal: 900 },
  { id: 'pizza-slice', name: 'Pizza, 1 slice', kcal: 250 },
  { id: 'burger', name: 'Burger', kcal: 500 },
  { id: 'fries', name: 'French fries, medium', kcal: 350 },
  { id: 'samosa', name: 'Samosa, 1', kcal: 260 },
  { id: 'pakora', name: 'Pakora / bhajji plate', kcal: 400 },
  { id: 'chips', name: 'Chips or namkeen pack', kcal: 270 },
  { id: 'mithai', name: 'Sweets / mithai, 2 pieces', kcal: 300 },
  { id: 'cake', name: 'Cake or pastry slice', kcal: 350 },
  { id: 'icecream', name: 'Ice cream cup', kcal: 250 },
  { id: 'chocolate', name: 'Chocolate bar', kcal: 230 },
  { id: 'colddrink', name: 'Cold drink, 500 ml', kcal: 210 },
  { id: 'sugar-tea', name: 'Extra sugary tea or coffee', kcal: 120 }
];
const TREAT_BY_ID = Object.fromEntries(TREATS.map((t) => [t.id, t]));
export const treatInfo = (id) => TREAT_BY_ID[id] || { id, name: id, kcal: 0 };
export const treatPoints = (kcal) => Math.max(1, Math.min(8, Math.round(kcal / 250)));
export const ptsLabel = (n) => n + (n === 1 ? ' pt' : ' pts');
export const walkMinutes = (kcal) => Math.round(kcal / 5); // brisk walk at about 110 kg: roughly 5 kcal a minute

// What one treat asks of the following days.
function treatPlan(kcal) {
  const p = treatPoints(kcal);
  if (p <= 1) return { days: 1, steps: 1500, cardio: 0, noJunk: 1 };
  if (p <= 3) return { days: 2, steps: 2000, cardio: 0, noJunk: 1 };
  return { days: 3, steps: 2500, cardio: 10, noJunk: 3 };
}
export const treatsOn = (k) => ((S.days[k] || {}).treats || []);

// Today's balance plan from treats in the last 3 days. Capped so it never becomes punishment.
export function balanceFor(k) {
  let steps = 0, cardio = 0, noJunk = false;
  const from = [];
  for (let i = 1; i <= 3; i++) {
    const kk = addDays(k, -i);
    treatsOn(kk).forEach((t) => {
      const pl = treatPlan(t.kcal);
      if (i > pl.days) return;
      steps += pl.steps; if (i <= 2) cardio += pl.cardio; if (i <= pl.noJunk) noJunk = true;
      from.push({ k: kk, name: treatInfo(t.id).name });
    });
  }
  steps = Math.min(steps, 3000); cardio = Math.min(cardio, 20);
  if (!steps && !cardio && !noJunk) return null;
  return { steps, cardio, noJunk, from };
}

// Balance tasks done on day k: extra steps, extra cardio, junk-free.
export function balanceDone(k) {
  const b = balanceFor(k);
  if (!b) return null;
  const d = S.days[k] || {}, tasks = [];
  if (b.steps) tasks.push({ id: 'steps', done: (parseInt(d.steps, 10) || 0) >= STEP_GOAL + b.steps });
  if (b.cardio) tasks.push({ id: 'cardio', done: !!d.balanceCardio });
  if (b.noJunk) tasks.push({ id: 'nojunk', done: !!(d.habits || {}).nojunk && !treatsOn(k).length });
  return { tasks, done: tasks.filter((t) => t.done).length, total: tasks.length };
}

// Points for treats eaten in a week, and how many were earned back by the balance days after them.
export function penaltyWeek(ws) {
  const today = todayKey();
  let points = 0, back = 0, kcal = 0;
  const items = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    treatsOn(k).forEach((t) => {
      const p = treatPoints(t.kcal), pl = treatPlan(t.kcal);
      let ratio = 0, n = 0;
      for (let j = 1; j <= pl.days; j++) {
        const kk = addDays(k, j);
        if (kk > today) continue;
        const bd = balanceDone(kk);
        if (bd && bd.total) { ratio += bd.done / bd.total; n++; }
      }
      const earned = Math.round(p * (n ? ratio / pl.days : 0));
      points += p; back += earned; kcal += t.kcal;
      items.push({ k, name: treatInfo(t.id).name, kcal: t.kcal, points: p, earned });
    });
  }
  return { items, points, back, net: points - back, kcal };
}
