/* Tracking what you actually did: sets per muscle, daily check-in, strength trend,
   weekly activity minutes, protein and calories. Plain functions over the saved days. */
import { S } from './store.js';
import { planFor, dayRead, makeupFor, makeupTicked, findEx, isDeload, EX_NAMES } from './plan.js';
import { WORKOUTS } from './data.js';
import { addDays, todayKey, weekDays } from './util.js';

/* ---------- weekly sets per muscle ----------
   A set counts for a muscle when that muscle is a main mover of the exercise (direct sets).
   Targets: about 10 to 20 hard sets a week for the big muscles (ACSM 2026: 10+; Pelland 2024: more helps, with diminishing returns). */
export const GROUPS = [
  { id: 'chest', name: 'Chest', re: /chest/i, min: 10, max: 20 },
  { id: 'back', name: 'Back', re: /lats|mid back|upper back/i, min: 10, max: 20 },
  { id: 'front', name: 'Front shoulders', re: /front shoulders|shoulders \(front/i, min: 4, max: 16, note: 'every chest press also works them' },
  { id: 'side', name: 'Side shoulders', re: /side shoulders|\+ side\)/i, min: 8, max: 20 },
  { id: 'rear', name: 'Rear shoulders', re: /rear shoulders/i, min: 6, max: 20 },
  { id: 'biceps', name: 'Biceps', re: /biceps/i, min: 8, max: 20, note: 'every pulldown and row also works them' },
  { id: 'triceps', name: 'Triceps', re: /triceps/i, min: 8, max: 20, note: 'every press also works them' },
  { id: 'quads', name: 'Quads', re: /quads/i, min: 10, max: 20 },
  { id: 'hams', name: 'Hamstrings', re: /hamstrings/i, min: 8, max: 20 },
  { id: 'glutes', name: 'Glutes', re: /glutes/i, min: 8, max: 20 },
  { id: 'calves', name: 'Calves', re: /calves/i, min: 6, max: 16 },
  { id: 'abs', name: 'Abs', re: /abs\b|core \(abs\)/i, min: 6, max: 16 },
  { id: 'traps', name: 'Traps', re: /traps/i, min: 2, max: 16, note: 'rows and face pulls also work them' }
];

// Fractional counting (as in Pelland 2024): the first main muscle gets the full set, a second main muscle half.
function groupsOf(e) {
  const out = {};
  (e.main || []).forEach((m, i) => GROUPS.forEach((g) => { if (g.re.test(m)) out[g.id] = Math.max(out[g.id] || 0, i === 0 ? 1 : 0.5); }));
  return out;
}

function setsDoneOn(k, e) {
  const d = dayRead(k);
  const arr = (d.sets[e.id] || []).slice(0, e.sets).filter(Boolean).length;
  if (arr) return arr;
  return d.done[e.id] ? e.sets : 0;
}

// Sets done and sets planned per muscle for the week starting ws (Monday).
export function weekVolume(ws) {
  const done = {}, plan = {};
  GROUPS.forEach((g) => { done[g.id] = 0; plan[g.id] = 0; });
  weekDays(ws).forEach((k) => {
    const p = planFor(k);
    if (!p || p.rest) return;
    p.exercises.forEach((e) => {
      const gs = groupsOf(e), n = setsDoneOn(k, e);
      Object.keys(gs).forEach((g) => { done[g] += n * gs[g]; if (!e.bonus) plan[g] += e.sets * gs[g]; });
    });
    // Make-up lifts count too.
    makeupFor(k).forEach((it) => {
      if (it.kind !== 'ex' || !makeupTicked(k, it.id)) return;
      const src = findEx(it.from, it.exId);
      if (src) { const gs = groupsOf(src); Object.keys(gs).forEach((g) => { done[g] += src.sets * gs[g]; }); }
    });
  });
  return GROUPS.map((g) => ({
    id: g.id, name: g.name, done: Math.round(done[g.id]), plan: Math.round(plan[g.id]), min: g.min, max: g.max, note: g.note || '',
    status: Math.round(done[g.id]) < g.min ? 'low' : Math.round(done[g.id]) > g.max ? 'high' : 'ok'
  }));
}

/* ---------- daily check-in ---------- */
export const CHECK_FIELDS = {
  sleep: { label: 'Sleep', opts: [[4, 'Under 5 h'], [5, '5 h'], [6, '6 h'], [7, '7 h'], [8, '8 h'], [9, '9 h+']] },
  sore: { label: 'Soreness', opts: [[1, '1 none'], [2, '2'], [3, '3'], [4, '4'], [5, '5 very']] },
  energy: { label: 'Energy', opts: [[1, '1 low'], [2, '2'], [3, '3'], [4, '4'], [5, '5 high']] },
  pain: { label: 'Joint pain', opts: [[0, 'No'], [1, 'Yes']] }
};
export const checkOf = (k) => (dayRead(k).check || {});
export function checkComplete(c) { return ['sleep', 'sore', 'energy', 'pain'].every((f) => c[f] != null); }
// Reasons to suggest a lighter day.
export function lighterReasons(c) {
  const r = [];
  if (c.sleep != null && c.sleep < 6) r.push('short sleep');
  if (c.sore >= 4) r.push('very sore');
  if (c.energy != null && c.energy <= 2) r.push('low energy');
  if (c.pain === 1) r.push('joint pain');
  return r;
}

export function weekCheck(ws) {
  const list = weekDays(ws).map((k) => checkOf(k)).filter((c) => Object.keys(c).length);
  const avg = (f) => { const v = list.map((c) => c[f]).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
  return {
    days: list.length, sleep: avg('sleep'), sore: avg('sore'), energy: avg('energy'),
    painDays: list.filter((c) => c.pain === 1).length,
    lighterDays: weekDays(ws).filter((k) => dayRead(k).lighter).length,
    deload: weekDays(ws).some(isDeload)
  };
}

/* ---------- strength: estimated max (Epley: kg x (1 + reps / 30)) ---------- */
export const e1rm = (kg, reps) => (kg > 0 && reps > 0 ? Math.round(kg * (1 + Math.min(reps, 15) / 30) * 10) / 10 : 0);

export function dayE1rm(k, id) {
  const d = dayRead(k);
  const reps = (d.reps || {})[id] || [], skg = (d.setKg || {})[id] || [], base = parseFloat((d.kg || {})[id]) || 0;
  let best = 0;
  reps.forEach((r, i) => {
    const kg = parseFloat(skg[i]) || base;
    best = Math.max(best, e1rm(kg, parseInt(r, 10) || 0));
  });
  return best;
}

// Main lifts with an estimated max this week, compared with the first one in the last 8 weeks.
export function strengthTrend(ws) {
  const we = addDays(ws, 6), from = addDays(ws, -56);
  const ids = new Set();
  Object.values(WORKOUTS).forEach((w) => { if (!w.rest) w.exercises.forEach((e) => { if (e.goal === 'strength') ids.add(e.id); }); });
  const out = [];
  ids.forEach((id) => {
    let first = null, now = 0;
    Object.keys(S.days).sort().forEach((k) => {
      if (k < from || k > we) return;
      const v = dayE1rm(k, id);
      if (!v) return;
      if (!first) first = { k, v };
      if (k >= ws) now = Math.max(now, v);
    });
    if (!now) return;
    const old = first.k < ws, change = old ? Math.round((now - first.v) * 10) / 10 : 0;
    out.push({ id, name: EX_NAMES[id] || id, now, first: old ? first.v : '-', firstK: first.k, change, chTxt: old ? (change > 0 ? '+' : '') + change + ' kg' : 'new' });
  });
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/* ---------- weekly activity minutes ----------
   WHO: 150 to 300 minutes of moderate activity a week. Walking at about 100 steps a minute is moderate (Tudor-Locke).
   Counted: cardio you ticked, the rest-day walk, make-up cardio, and brisk walk minutes you typed.
   When you did not type them, brisk walking is estimated from steps: half of the steps above 5,000, at 100 steps a minute. */
export const ACTIVE_GOAL = 150;
export const minutesIn = (txt) => { const m = String(txt || '').match(/(\d+)\s*(?:to\s*\d+\s*)?min/); return m ? +m[1] : 0; };
export function briskFromSteps(steps) { return Math.round(Math.max(0, (parseInt(steps, 10) || 0) - 5000) / 2 / 100); }

export function dayActive(k) {
  const d = dayRead(k), p = planFor(k);
  let cardio = 0;
  if (p && !p.rest && d.done.cardio) cardio += minutesIn(p.cardio.detail);
  if (p && p.rest && d.done.walk) cardio += 30;
  makeupFor(k).forEach((it) => { if (it.kind === 'cardio' && makeupTicked(k, it.id)) cardio += 15; });
  if (d.hc && d.hc.exMin > cardio) cardio = d.hc.exMin; // exercise your phone recorded, if more
  const typed = d.brisk !== undefined && d.brisk !== '' ? parseInt(d.brisk, 10) || 0 : null;
  const walk = typed != null ? typed : briskFromSteps(d.steps);
  return { cardio, walk, est: typed == null && walk > 0, total: cardio + walk };
}
export function weekActive(ws) {
  let cardio = 0, walk = 0, est = false;
  weekDays(ws).forEach((k) => { if (k > todayKey()) return; const a = dayActive(k); cardio += a.cardio; walk += a.walk; est = est || a.est; });
  return { cardio, walk, total: cardio + walk, est, goal: ACTIVE_GOAL };
}

/* ---------- nutrition ----------
   Protein: a 2024 meta-analysis of 47 trials in adults with overweight or obesity found more than
   1.3 g per kg a day helped keep muscle while losing weight. Values below are typical per serving; check packet labels. */
export const FOODS = [
  { id: 'soya', name: 'Soya chunks, 50 g dry', p: 26, kcal: 170, nav: false },
  { id: 'moong-chilla', name: 'Moong dal chilla x2 (60 g dal)', p: 14, kcal: 230, nav: false },
  { id: 'besan-chilla', name: 'Besan chilla x2 (50 g besan)', p: 11, kcal: 220, nav: false },
  { id: 'dal', name: 'Dal, 1 katori cooked', p: 8, kcal: 150, nav: false },
  { id: 'rajma', name: 'Rajma or chole, 1 katori', p: 9, kcal: 180, nav: false },
  { id: 'milk', name: 'Milk, 1 glass 250 ml', p: 8, kcal: 150, nav: true },
  { id: 'dahi', name: 'Dahi, 1 katori 150 g', p: 5, kcal: 90, nav: true },
  { id: 'chana', name: 'Roasted chana, 40 g', p: 8, kcal: 150, nav: false },
  { id: 'peanuts', name: 'Peanuts, 30 g', p: 8, kcal: 170, nav: true },
  { id: 'sprouts', name: 'Sprouts chaat, 1 bowl', p: 7, kcal: 120, nav: false },
  { id: 'tofu', name: 'Tofu, 100 g', p: 10, kcal: 100, nav: false },
  { id: 'paneer', name: 'Paneer, 50 g (now and then)', p: 9, kcal: 145, nav: true },
  { id: 'egg', name: 'Egg, 1 whole', p: 6, kcal: 75, nav: false, egg: true },
  { id: 'roti', name: 'Roti, 1', p: 3, kcal: 100, nav: false },
  { id: 'rice', name: 'Rice, 1 cup cooked', p: 4, kcal: 200, nav: false },
  { id: 'whey', name: 'Whey, 1 scoop (optional)', p: 24, kcal: 120, nav: true }
];
const FOOD_BY_ID = Object.fromEntries(FOODS.map((f) => [f.id, f]));
export const foodInfo = (id) => FOOD_BY_ID[id] || null;

export function latestWeight(upTo) {
  const ks = Object.keys(S.body).filter((k) => !upTo || k <= upTo).sort();
  return ks.length ? S.body[ks[ks.length - 1]] : null;
}
export const PROTEIN_PER_KG = 1.3;
export function proteinTarget(upTo) {
  const w = latestWeight(upTo) || 111;
  return Math.round(w * PROTEIN_PER_KG / 5) * 5;
}
export function dayProtein(k) {
  const f = dayRead(k).food || {};
  let p = 0, kcal = 0;
  Object.keys(f).forEach((id) => { const it = foodInfo(id); if (it && f[id] > 0) { p += it.p * f[id]; kcal += it.kcal * f[id]; } });
  return { p, kcal };
}
export function weekProtein(ws) {
  const target = proteinTarget(addDays(ws, 6));
  const vals = weekDays(ws).filter((k) => k <= todayKey()).map((k) => dayProtein(k).p).filter((v) => v > 0);
  return { days: vals.length, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, hit: vals.filter((v) => v >= target).length, target };
}

/* Calories: Mifflin-St Jeor BMR x 1.55 (moderate activity; kept conservative for fat loss).
   Deficit: about 500 kcal a day, more only if your goal date needs it, never more than 25% of maintenance or below BMR.
   It is an estimate (about 7 in 10 people with obesity are within 10%), so the weigh-in trend decides the adjustments. */
export const ACTIVITY = 1.55;
export function calorieTarget(bodyStats) {
  const me = S.settings.me || {};
  const w = latestWeight();
  if (!w || !me.height || !me.age) return null;
  const bmr = Math.round(10 * w + 6.25 * me.height - 5 * me.age + (me.sex === 'f' ? -161 : 5));
  const tdee = Math.round(bmr * ACTIVITY);
  let deficit = 500;
  if (bodyStats && bodyStats.deadline && bodyStats.deadline.kcal > 500) deficit = bodyStats.deadline.kcal;
  deficit = Math.min(deficit, Math.round(tdee * 0.25));
  const target = Math.max(bmr, Math.floor((tdee - deficit) / 50) * 50);
  let advice = '';
  if (bodyStats && bodyStats.rate != null && bodyStats.entries && bodyStats.entries.length >= 3) {
    const pctWk = bodyStats.rate / w * 100;
    if (bodyStats.rate <= 0) advice = 'No loss in your recent weigh-ins. If this lasts 2 to 3 weeks, eat about 150 to 200 kcal less.';
    else if (pctWk > 1) advice = 'Losing over 1% of your weight a week. Eat about 150 to 200 kcal more to protect muscle.';
    else advice = 'Losing at a healthy pace. Keep it here.';
  }
  return { bmr, tdee, deficit: tdee - target, target, advice, weight: w };
}

/* ---------- phone use and sleep from the Android app ---------- */
export function weekPhone(ws) {
  const list = weekDays(ws).map((k) => dayRead(k).phone).filter((p) => p && p.screenMs != null);
  if (!list.length) return { days: 0 };
  const avg = (f, src) => { const v = (src || list).map((p) => p[f]).filter((x) => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };
  return { days: list.length, screen: avg('screenMs'), free: avg('freeMs'), unlocks: avg('unlocks'), sleep: avg('sleepMs') };
}
