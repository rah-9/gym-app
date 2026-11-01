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
/* Deload and lighter days change the number of sets, not the exercises.
   Deload: every 7th program week, half the sets (rounded up), same weights.
   Lighter day: chosen from the daily check-in, one set less on every exercise. */
export const DELOAD_EVERY = 7;
export function isDeload(k) { const w = programWeek(k); return w > 0 && w % DELOAD_EVERY === 0; }
export const isLighter = (k) => !!((S.days[k] || {}).lighter);
export function dayMode(k) { return isDeload(k) ? 'deload' : isLighter(k) ? 'light' : ''; }
const ADJ = {};
export function planFor(k) {
  const key = workoutKeyFor(k), base = WORKOUTS[key];
  if (!base || base.rest) return base;
  const mode = dayMode(k);
  if (!mode) return base;
  const ck = key + '|' + mode;
  if (!ADJ[ck]) {
    ADJ[ck] = Object.assign({}, base, {
      mode,
      exercises: base.exercises.map((e) => Object.assign({}, e, {
        baseSets: e.sets,
        sets: mode === 'deload' ? Math.max(1, Math.ceil(e.sets / 2)) : Math.max(1, e.sets - 1)
      }))
    });
  }
  return ADJ[ck];
}

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
// Top of the rep range: '8-10' -> 10, '12 each arm' -> 12, '15/12/10/10' -> 15.
export function repTop(reps) {
  const r = String(reps || '');
  const m = r.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return +m[2];
  const n = r.match(/\d+/);
  return n ? +n[0] : null;
}

/* Progressive overload advice from the last session of this exercise (double progression):
   with reps logged: every set reached the top of the rep range -> go up; otherwise stay and add reps.
   without reps: every set ticked -> go up; sets left -> stay.
   push = same weight 3 sessions in a row with every set done. */
export function weightHint(k, e) {
  const last = lastKg(k, e.id);
  if (!last) return null;
  const ld = S.days[last.k] || {};
  const lastEx = findEx(last.k, e.id);
  const planned = lastEx ? lastEx.sets : e.sets;
  const setsDone = ((ld.sets || {})[e.id] || []).slice(0, planned).filter(Boolean).length;
  const allSets = !!((ld.done || {})[e.id]) || (planned > 0 && setsDone >= planned);
  const reps = ((ld.reps || {})[e.id] || []).slice(0, planned).map((v) => parseInt(v, 10) || 0);
  const logged = reps.filter((v) => v > 0);
  const top = repTop(e.reps);
  const byReps = !!top && logged.length > 0;
  const allTop = byReps && logged.length >= planned && logged.every((v) => v >= top);
  const effort = (ld.effort || {})[e.id] || '';
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
  const ready = byReps ? allTop : allSets;
  return {
    kg: last.kg, k: last.k, allSets, setsDone, next, best: best ? best.kg : null, top, byReps, reps: logged, effort, planned,
    status: ready ? (streakSame >= 3 && !byReps ? 'push' : 'up') : 'stay'
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

export function stepsPct(v, goal) { return Math.min(100, Math.round((parseInt(v, 10) || 0) / (goal || STEP_GOAL) * 100)); }

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

/* Balance plan v2
   - Logged before 6 PM: the plan is for the same day. Logged at or after 6 PM: it starts tomorrow.
   - Big items (4+ points, like a whole pizza) spread over 2 days, others 1 day.
   - The plan burns back about 30% of the extra calories, at most 350 kcal a day. Burning it all off
     is not the goal (that habit is linked to more overeating); eating normally at the next meal is.
   - Activities are picked at random for each day from low-impact options, so it is not always steps.
     kcal per minute is scaled from Harvard Health's 30-minute table (84 kg) to about 110 kg. */
export const BALANCE_ACTS = [
  { id: 'steps', name: 'Extra walking', kind: 'steps', perStep: 0.055, how: 'Anywhere. Split it into 2 or 3 short walks.' },
  { id: 'incline', name: 'Incline treadmill walk', rate: 9, how: 'Gym. Incline 8 to 12, speed 4 to 5 km/h.' },
  { id: 'bike', name: 'Spin bike, steady', rate: 12, how: 'Gym. A pace where you can still talk.' },
  { id: 'stairs', name: 'Stair climbing, slow', rate: 10, how: 'Home or office stairs. Hold the rail, walk down easy.' },
  { id: 'march', name: 'Low-impact home cardio', rate: 9, how: 'March in place, step-touch, arm circles. No jumping.' },
  { id: 'circuit', name: 'Bodyweight circuit', rate: 8, how: 'Chair squats, wall push-ups, glute bridges, marching. 40 s on, 20 s off.' },
  { id: 'dance', name: 'Dance to music', rate: 9, how: 'Any upbeat songs at home. Just keep moving.' }
];
const LATE_HOUR = 18, BALANCE_SHARE = 0.3, DAY_CAP = 350;

function seeded(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Days a treat logged on day k asks for a balance.
export function treatDays(k, t) {
  const hr = t.at > 1e11 ? new Date(t.at).getHours() : 12;
  const start = hr < LATE_HOUR ? k : addDays(k, 1);
  const n = treatPoints(t.kcal) >= 4 ? 2 : 1;
  return Array.from({ length: n }, (_, i) => addDays(start, i));
}
export const treatsOn = (k) => ((S.days[k] || {}).treats || []);

// Today's balance plan: which treats it is for, the kcal to balance, and 1 or 2 random activities.
export function balanceFor(k) {
  let kcal = 0;
  const from = [];
  for (let i = 0; i <= 2; i++) {
    const kk = addDays(k, -i);
    treatsOn(kk).forEach((t) => {
      const days = treatDays(kk, t);
      if (!days.includes(k)) return;
      kcal += t.kcal * BALANCE_SHARE / days.length;
      from.push({ k: kk, name: treatInfo(t.id).name, kcal: t.kcal, points: treatPoints(t.kcal), days: days.length, late: days[0] !== kk, at: t.at });
    });
  }
  if (!from.length) return null;
  kcal = Math.min(DAY_CAP, Math.max(60, Math.round(kcal / 10) * 10));
  const r = seeded('balance|' + k); // same activities all day, even if you log more later
  const pool = BALANCE_ACTS.slice(), n = kcal > 150 ? 2 : 1, share = Math.round(kcal / n);
  const tasks = [];
  for (let i = 0; i < n; i++) {
    const a = pool.splice(Math.floor(r() * pool.length), 1)[0];
    tasks.push(a.kind === 'steps'
      ? { id: 'act-steps', act: a, kind: 'steps', steps: Math.min(3000, Math.max(1000, Math.round(share / a.perStep / 500) * 500)), kcal: share }
      : { id: 'act-' + a.id, act: a, kind: 'time', minutes: Math.min(30, Math.max(10, Math.round(share / a.rate / 5) * 5)), kcal: share });
  }
  const noJunk = from.every((f) => f.k !== k); // a junk-free day only makes sense for treats from earlier days
  return { kcal, from, tasks, noJunk };
}

// Step goal for a day: 10,000 plus any extra steps from the balance plan (temporary, that day only).
export function stepGoalFor(k) {
  const b = balanceFor(k), t = b && b.tasks.find((x) => x.kind === 'steps');
  return STEP_GOAL + (t ? t.steps : 0);
}

export function balanceDone(k) {
  const b = balanceFor(k);
  if (!b) return null;
  const d = S.days[k] || {}, ticks = d.balanceDone || {};
  // Every task can be ticked by hand; the steps task also ticks itself once the raised step goal is reached.
  const tasks = b.tasks.map((t) => ({ id: t.id, done: !!ticks[t.id] || (t.kind === 'steps' && (parseInt(d.steps, 10) || 0) >= stepGoalFor(k)) }));
  if (b.noJunk) tasks.push({ id: 'nojunk', done: !!(d.habits || {}).nojunk && !treatsOn(k).length });
  const done = tasks.filter((t) => t.done).length;
  return { tasks, done, total: tasks.length, complete: done === tasks.length };
}

// Points for treats in a week and how many were earned back. Status per treat:
// done (all balance days finished), owed (a balance day passed unfinished), pending (still to come).
export function penaltyWeek(ws) {
  const today = todayKey();
  let points = 0, back = 0, kcal = 0;
  const items = [];
  for (let i = 0; i < 7; i++) {
    const k = addDays(ws, i);
    treatsOn(k).forEach((t) => {
      const p = treatPoints(t.kcal), days = treatDays(k, t);
      let ratio = 0, past = 0, pending = false;
      days.forEach((kk) => {
        if (kk > today) { pending = true; return; }
        const bd = balanceDone(kk);
        if (bd && bd.total) { ratio += bd.done / bd.total; if (kk < today) past++; }
        if (kk === today && !(bd && bd.complete)) pending = true;
      });
      const earned = Math.round(p * ratio / days.length);
      const status = earned >= p ? 'done' : pending ? 'pending' : 'owed';
      points += p; back += earned; kcal += t.kcal;
      items.push({ k, name: treatInfo(t.id).name, kcal: t.kcal, points: p, earned, status, days });
    });
  }
  return { items, points, back, net: points - back, kcal };
}

/* ---------- badges ---------- */
export function badges() {
  const keys = Object.keys(S.days).sort();
  const today = todayKey();
  const best = bestStreak().days;
  const stepsMax = Math.max(0, ...keys.map((k) => parseInt(S.days[k].steps, 10) || 0));
  const waterDays = keys.filter((k) => (S.days[k].water || 0) >= WATER_GOAL).length;
  let perfectWeek = false, cleanWeek = false;
  for (let w = 1; w <= 12; w++) {
    const ws = addDays(today, -7 * w - ((fromKey(today).getDay() + 6) % 7));
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    const train = days.filter((k) => !planFor(k).rest);
    const doneAll = train.every((k) => dayStats(k).pct === 100);
    const worked = train.filter((k) => workedOut(k)).length;
    if (doneAll) perfectWeek = true;
    if (worked >= 4 && days.every((k) => !treatsOn(k).length)) cleanWeek = true;
  }
  let pr = 0;
  const seen = {};
  keys.forEach((k) => Object.keys(S.days[k].kg || {}).forEach((id) => {
    const v = parseFloat(S.days[k].kg[id]);
    if (!(v > 0)) return;
    if (seen[id] != null && v > seen[id]) pr++;
    seen[id] = Math.max(seen[id] || 0, v);
  }));
  const balanced = keys.some((k) => { const b = balanceDone(k); return b && b.complete; });
  const bs = bodyStats(), lost = bs.current != null ? bs.lost : 0;
  return [
    { id: 'first', name: 'First workout', desc: 'Log your first workout day', on: totalWorkoutDays() >= 1 },
    { id: 's3', name: '3 in a row', desc: '3 day streak', on: best >= 3 },
    { id: 's7', name: 'Full week', desc: '7 day streak', on: best >= 7 },
    { id: 's14', name: 'Two weeks strong', desc: '14 day streak', on: best >= 14 },
    { id: 's30', name: 'Unstoppable', desc: '30 day streak', on: best >= 30 },
    { id: 'perfect', name: 'Perfect week', desc: 'Every item done on all 6 days', on: perfectWeek },
    { id: 'steps', name: '10k club', desc: '10,000 steps in a day', on: stepsMax >= 10000 },
    { id: 'steps15', name: 'Long walker', desc: '15,000 steps in a day', on: stepsMax >= 15000 },
    { id: 'water', name: 'Hydrated', desc: 'Water goal on 7 days', on: waterDays >= 7 },
    { id: 'pr', name: 'Getting stronger', desc: 'Beat a personal best', on: pr >= 1 },
    { id: 'pr10', name: 'Strength streak', desc: '10 personal bests', on: pr >= 10 },
    { id: 'clean', name: 'Clean week', desc: '4+ workouts and no junk all week', on: cleanWeek },
    { id: 'balance', name: 'Made it right', desc: 'Finish a balance plan', on: balanced },
    { id: 'kg2', name: 'First 2 kg', desc: 'Lose 2 kg', on: lost >= 2 },
    { id: 'kg5', name: 'Down 5 kg', desc: 'Lose 5 kg', on: lost >= 5 },
    { id: 'kg10', name: 'Down 10 kg', desc: 'Lose 10 kg', on: lost >= 10 }
  ];
}

// Last few weights for one exercise, oldest first, for the small history chart.
export function kgHistory(id, upTo, n) {
  return Object.keys(S.days).filter((k) => k <= upTo && parseFloat(((S.days[k] || {}).kg || {})[id]) > 0).sort()
    .slice(-(n || 6)).map((k) => ({ k, kg: parseFloat(S.days[k].kg[id]) }));
}


/* ---------- missed workout make-ups ----------
   Only a fully missed training day counts: not a single real exercise ticked (warm up or cardio
   alone does not save it). Partly done days never trigger this.
   A missed day costs 5 penalty points and adds 3 make-up items, one on each of the next 3
   training days (rest days skipped): the 2 main lifts of the missed workout, then 15 min cardio.
   At most 2 make-up items land on one day so it stays doable. Finishing them earns the points back. */
export const MISSED_POINTS = 5;

export const MAKEUP_PER_DAY = 3;

export function isMissedWorkout(k) {
  const first = firstWorkoutDay();
  return !!first && k > first && k < todayKey() && k >= PROGRAM_START && !planFor(k).rest && !workedOut(k);
}

function makeupItems(m) {
  const p = planFor(m);
  const lifts = mainExercises(p).filter((e) => e.id !== 'warmup' && !/plank|crunch|leg-raise/.test(e.id)).slice(0, 2);
  const items = lifts.map((e) => ({ kind: 'ex', exId: e.id, name: e.name, detail: e.sets + ' x ' + e.reps + ', ' + e.machine }));
  items.push({ kind: 'cardio', name: 'Extra cardio, 15 min', detail: (p.cardio ? p.cardio.name : 'Incline walk or spin bike') + ', easy to moderate pace' });
  return items.map((it, i) => Object.assign(it, { id: 'mk-' + m + '-' + i, from: m }));
}

/* Every missed day gets its own make-up items, placed in a queue:
   oldest missed day first, next training days after it, up to MAKEUP_PER_DAY a day.
   A day you also miss passes its items on to the next training day, so nothing is dropped.
   An item you already ticked stays on the day you ticked it. */
let mkCache = null;
function makeupPlan() {
  const today = todayKey();
  const sig = today + '|' + JSON.stringify(S.settings.schedule || '') + '|' + Object.keys(S.days).length + '|' +
    Object.keys(S.days).filter((k) => k >= addDays(today, -150)).map((k) => { const d = S.days[k]; return k + (d.plan || "") + (workedOut(k) ? 1 : 0) + JSON.stringify(d.makeupDone || {}); }).join(',');
  if (mkCache && mkCache.sig === sig) return mkCache;
  const first = firstWorkoutDay();
  const byDay = {}, items = [];
  if (first) {
    let m = first > addDays(today, -150) ? first : addDays(today, -150);
    for (; m < today; m = addDays(m, 1)) {
      if (!isMissedWorkout(m)) continue;
      makeupItems(m).forEach((it) => {
        let day = null;
        for (let i = 1; i <= 45 && !day; i++) { const kk = addDays(m, i); if (makeupTicked(kk, it.id)) day = kk; }
        for (let i = 1; i <= 60 && !day; i++) {
          const kk = addDays(m, i);
          if (planFor(kk).rest || isMissedWorkout(kk)) continue;
          if ((byDay[kk] || []).length >= MAKEUP_PER_DAY) continue;
          day = kk;
        }
        it.day = day;
        if (day) (byDay[day] = byDay[day] || []).push(it);
        items.push(it);
      });
    }
  }
  mkCache = { sig, byDay, items };
  return mkCache;
}

// Make-up items due on day k.
export function makeupFor(k) {
  return (makeupPlan().byDay[k] || []).slice();
}
// Make-up items still queued on days after k.
export function makeupQueue(k) {
  return makeupPlan().items.filter((it) => it.day && it.day > k).length;
}
export const makeupTicked = (k, id) => !!(((S.days[k] || {}).makeupDone || {})[id]);

// Missed workout days in a week with their make-up progress.
export function missedWeek(ws) {
  const today = todayKey();
  const all = makeupPlan().items;
  const items = [];
  let points = 0, back = 0;
  for (let i = 0; i < 7; i++) {
    const m = addDays(ws, i);
    if (!isMissedWorkout(m)) continue;
    const mk = all.filter((it) => it.from === m);
    const done = mk.filter((it) => it.day && makeupTicked(it.day, it.id)).length;
    const pending = mk.some((it) => it.day && it.day >= today && !makeupTicked(it.day, it.id));
    const earned = mk.length ? Math.round(MISSED_POINTS * done / mk.length) : 0;
    points += MISSED_POINTS; back += earned;
    items.push({ k: m, name: planFor(m).focus, done, total: mk.length, earned, status: done === mk.length ? 'done' : pending ? 'pending' : 'owed', days: mk.map((it) => it.day).filter(Boolean) });
  }
  return { items, points, back, net: points - back };
}
