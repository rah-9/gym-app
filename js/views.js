/* Screens: Today, Report and Plan. Each returns an HTML string; render() puts it on the page. */
import { WORKOUTS, WARMUP, HABITS, MEALS, GOALS } from './data.js';
import { S } from './store.js';
import {
  planFor, workoutKeyFor, schedule, dayRead, dayStats, dayStatus, hasProgress, mainExercises, bonusExercises,
  weightHint, musclesFor, nextUp, programWeek, counts, stepsPct, STEP_GOAL, STATUS_LABEL, WEEK_ORDER,
  streak, monthStats, notesForDay, nextSameWorkout, sessionMinutes, bestKg, requiredItems, EX_NAMES, bodyStats, deadlineText, WATER_GOAL, TREATS, treatInfo, treatPoints, ptsLabel, walkMinutes, treatsOn, balanceFor, balanceDone, penaltyWeek, stepGoalFor, treatDays, badges, kgHistory, makeupFor, makeupTicked, isMissedWorkout, missedWeek, MISSED_POINTS, MAKEUP_PER_DAY, makeupQueue
} from './plan.js';
import { reportData, bestLabel } from './report.js';
import * as notify from './notify.js';
import { $, esc, fmt, keyOf, fromKey, addDays, todayKey, weekStartOf, weekDays, dow, num, restLabel, clockTime, DAY_NAMES, DAY_SHORT } from './util.js';

export const ui = { view: 'today', selDate: todayKey(), reportWs: weekStartOf(todayKey()), open: {} };

// Each workout has its own colour so every day of the week feels different.
export const DAY_COLORS = {
  chest: '#f9a8d4', push: '#f9a8d4', arms: '#c4b5fd', back: '#a5b4fc', shoulders: '#fcd34d',
  armsplus: '#ddd6fe', legday: '#93c5fd', legs: '#93c5fd', rest: '#cbd5e1',
  pushA: '#f9a8d4', pullA: '#a5b4fc', legsA: '#93c5fd', shoback: '#c4b5fd', chestarms: '#fbcfe8', legsB: '#7dd3fc'
};
const dayColor = (k) => DAY_COLORS[workoutKeyFor(k)] || '#b9a8ff';

// A different line every day of the year.
const LINES = [
  'Discipline is choosing what you want most over what you want now.',
  'You do not have to be extreme, just consistent.',
  'The body you want is built on days you did not feel like it.',
  'Small steps every day add up to big results.',
  'Show up. The rest follows.',
  'Strength is earned one rep at a time.',
  'Progress, not perfection.',
  'Your only competition is who you were yesterday.',
  'Sweat now, shine later.',
  'Motivation gets you started. Habit keeps you going.',
  'Every workout is a deposit in your future self.',
  'Hard days build strong people.',
  'One more set than yesterday is how you win.',
  'Make today count. Tomorrow will thank you.'
];
function dailyLine(k) {
  const d = fromKey(k), start = new Date(d.getFullYear(), 0, 0);
  return LINES[Math.floor((d - start) / 864e5) % LINES.length];
}
function greeting() {
  const h = new Date().getHours();
  return (h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ', Rahul';
}

export function render() {
  document.documentElement.style.setProperty('--day', dayColor(ui.selDate));
  const v = $('#view');
  v.innerHTML = ui.view === 'report' ? renderReport() : ui.view === 'plan' ? renderPlan() : renderToday();
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.view === ui.view);
    b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false');
  });
}

export function stepsNote(v, goal) {
  const n = parseInt(v, 10) || 0, g = goal || STEP_GOAL, extra = g - STEP_GOAL;
  const why = extra > 0 ? ' Today: ' + num(STEP_GOAL) + ' + ' + num(extra) + ' balance steps.' : '';
  if (!n) return 'Goal ' + num(g) + '.' + (why || ' Copy the number from your phone\'s step counter.');
  if (n >= g) return 'Goal hit. ' + num(n) + ' steps.' + (extra > 0 ? ' Balance steps done.' : '');
  return num(g - n) + ' more to reach ' + num(g) + '.' + why;
}

const workoutOptions = (selected) => Object.values(WORKOUTS).filter((w) => !w.old || w.key === selected)
  .map((w) => '<option value="' + w.key + '"' + (w.key === selected ? ' selected' : '') + '>' + esc(w.focus) + '</option>').join('');

/* ---------- Today ---------- */
function checkbox(action, id, on, label) {
  return '<button type="button" class="tick' + (on ? ' on' : '') + '" data-action="' + action + '" data-id="' + esc(id) +
    '" role="checkbox" aria-checked="' + on + '" aria-label="' + esc(label) + '"></button>';
}

// "Works: Chest, Front shoulders · also Triceps" plus the goal tag.
function works(e) {
  const g = GOALS[e.goal];
  if (!(e.main && e.main.length) && !g) return '';
  return '<div class="works">' + (g ? '<span class="goal g-' + e.goal + '">' + esc(g.label) + '</span>' : '') +
    (e.main && e.main.length ? '<span class="wk">Works <b>' + e.main.map(esc).join(', ') + '</b>' +
      (e.also && e.also.length ? '<span class="also"> &middot; also ' + e.also.map(esc).join(', ') + '</span>' : '') + '</span>' : '') +
    '</div>';
}

// Compact card: name, sets x reps, machine, then set buttons + kg + video link.
// Tap the name to open the tip, what it works and the rest timer. The "up next" card opens by itself.
function exerciseCard(e, d, isBonus, isNext) {
  const done = !!d.done[e.id];
  const sets = d.sets[e.id] || [];
  const open = ui.open[e.id] != null ? ui.open[e.id] : isNext;
  const dosage = e.id === 'warmup' ? esc(e.reps) : e.sets + ' &times; ' + esc(e.reps);
  let dots = '';
  if (e.id !== 'warmup') {
    for (let i = 0; i < e.sets; i++) {
      dots += '<button type="button" class="set' + (sets[i] ? ' on' : '') + '" data-action="set" data-id="' + esc(e.id) +
        '" data-i="' + i + '" aria-label="Set ' + (i + 1) + '">' + (i + 1) + '</button>';
    }
  }
  const hasKg = !(e.id === 'warmup' || /plank|pushup/.test(e.id));
  const last = hasKg ? weightHint(ui.selDate, e) : null;
  const kgField = hasKg
    ? '<label class="kg"><input type="number" inputmode="decimal" min="0" step="0.5" data-kg="' + esc(e.id) +
      '" value="' + esc(d.kg[e.id] || '') + '" placeholder="' + (last ? last.kg : '0') + '" aria-label="' + esc(e.name) + ' weight"><span>kg</span></label>'
    : '';
  const todayKg = parseFloat(d.kg[e.id]);
  const isPR = hasKg && todayKg > 0 && last && last.best != null && todayKg > last.best;
  let lastNote = '';
  if (isPR) lastNote = '<span class="hint pr"><b>New best ' + todayKg + ' kg</b><small>previous best ' + last.best + ' kg</small></span>';
  else if (last && !(todayKg > 0)) {
    lastNote = last.status === 'stay'
      ? '<span class="hint stay"><b>Stay at ' + last.kg + ' kg</b><small>last time ' + last.setsDone + ' of ' + e.sets + ' sets, finish them all first</small></span>'
      : '<span class="hint up"><b>&#8593; Go up to ' + last.next + ' kg</b><small>' + (last.status === 'push' ? 'same ' + last.kg + ' kg 3 times, time to push' : 'last time ' + last.kg + ' kg, all sets done') + '</small></span>';
  } else if (last) lastNote = '<span class="hint"><small>last time ' + last.kg + ' kg' + (last.best && last.best !== last.kg ? ', best ' + last.best : '') + '</small></span>';
  const watch = e.video ? '<a class="watch" href="' + esc(e.video) + '" target="_blank" rel="noopener" aria-label="Watch how to do ' + esc(e.name) + '">How to <span aria-hidden="true">&#8599;</span></a>' : '';
  const tools = (!done || open) && (dots || kgField || watch)
    ? '<div class="tools">' + (dots ? '<div class="dots">' + dots + '</div>' : '') + kgField + lastNote + watch + '</div>' : '';
  const more = open
    ? '<div class="more">' + (e.tip ? '<p class="tip">' + esc(e.tip) + '</p>' : '') + works(e) + kgSpark(e.id) +
      (e.rest ? '<button type="button" class="chip" data-action="rest" data-sec="' + e.rest + '" data-name="' + esc(e.name) + '">Start rest timer, ' + restLabel(e.rest) + '</button>' : '') + '</div>'
    : '';
  return '<li class="card ex' + (done ? ' done' : '') + (isBonus ? ' bonus' : '') + (isNext ? ' next' : '') + (open ? ' open' : '') + (ui.justDone === e.id ? ' just-done' : '') + '">' +
    '<div class="row">' + checkbox('done', e.id, done, 'Mark ' + e.name + ' done') +
    '<button type="button" class="ex-main" data-action="expand" data-id="' + esc(e.id) + '" aria-expanded="' + open + '">' +
    '<span class="ex-text">' + (isNext ? '<span class="upnext">Up next</span>' : '') +
    '<span class="name">' + (isBonus ? '<span class="tag">Bonus</span>' : '') + esc(e.name) + '</span>' +
    '<span class="ex-sub"><b>' + dosage + '</b>' + (e.rest ? '<span>rest ' + restLabel(e.rest) + '</span>' : /\([A-D]1\)/.test(e.name) ? '<span>superset, no rest</span>' : '') + '</span>' +
    (done && !open ? '' : '<span class="machine">' + esc(e.machine) + '</span>') + '</span>' +
    '<span class="chev" aria-hidden="true"></span></button></div>' + tools + more + '</li>';
}

function simpleCard(action, id, on, name, detail, info) {
  return '<li class="card' + (on ? ' done' : '') + '"><div class="row">' + checkbox(action, id, on, name) +
    '<div class="body"><div class="name">' + esc(name) + '</div>' + (detail ? '<div class="tip">' + esc(detail) + '</div>' : '') + '</div></div></li>';
}

function weekStrip(k) {
  const today = todayKey();
  const html = weekDays(weekStartOf(k)).map((dk) => {
    const st = isMissedWorkout(dk) ? 'missed' : dayStatus(dk), p = planFor(dk);
    return '<button type="button" class="day ' + st + (dk === k ? ' sel' : '') + (dk === today ? ' is-today' : '') + '" data-action="pick" data-k="' + dk + '">' +
      '<span class="dn">' + DAY_SHORT[dow(dk)] + '</span><span class="dd">' + fromKey(dk).getDate() + (isMissedWorkout(dk) ? '<i class="xmark" aria-label="missed">&#10005;</i>' : '') + '</span><span class="df" style="--dc:' + dayColor(dk) + '">' + p.short + '</span></button>';
  }).join('');
  return '<div class="weeknav"><button type="button" class="arrow" data-action="shift" data-n="-7" aria-label="Previous week">&#8249;</button>' +
    '<div class="strip">' + html + '</div>' +
    '<button type="button" class="arrow" data-action="shift" data-n="7" aria-label="Next week">&#8250;</button></div>';
}

function ring(pct) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return '<svg class="ring' + (pct === 100 ? ' full' : '') + '" viewBox="0 0 64 64" aria-hidden="true">' +
    '<defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9a8ff"/></linearGradient></defs>' +
    '<circle cx="32" cy="32" r="' + r + '" class="ring-bg"/>' +
    '<circle cx="32" cy="32" r="' + r + '" class="ring-fg" stroke="url(#ringGrad)" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
    '<text x="32" y="37" text-anchor="middle">' + pct + '%</text></svg>';
}

// Mon to Sat as one segmented bar, coloured by how each day went.
function weekBar(k) {
  const ws = weekStartOf(k), days = weekDays(ws).filter((dk) => !planFor(dk).rest);
  const done = days.filter((dk) => dayStatus(dk) === 'done').length;
  return '<div class="weekbar"><div class="wb-segs">' + days.map((dk) =>
    '<i class="' + (isMissedWorkout(dk) ? 'missed' : dayStatus(dk)) + (dk === todayKey() ? ' now' : '') + '" title="' + DAY_SHORT[dow(dk)] + '"></i>').join('') +
    '</div><span>' + done + ' of ' + days.length + ' this week</span></div>';
}

// Lifts ready to go heavier today.
function readyToLift(k) {
  const p = planFor(k);
  if (p.rest) return 0;
  return p.exercises.filter((e) => { const h = weightHint(k, e); return h && (h.status === 'up' || h.status === 'push') && !(parseFloat(dayRead(k).kg[e.id]) > 0); }).length;
}

export function sessionLabel(k) {
  const m = sessionMinutes(k);
  if (m == null) return '';
  const d = dayRead(k);
  return (d.end ? 'Session ' : 'Session running ') + (m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min');
}

// Streak and month count under today's title.
function heroStats() {
  const sk = streak(), m = monthStats(todayKey());
  return '<div class="hero-stats"><span><b>' + sk + '</b> day streak</span><span><b>' + m.worked + '</b> days in ' + esc(m.name) + '</span></div>';
}

function hero(k) {
  const p = planFor(k), st = dayStats(k), today = todayKey(), wk = programWeek(k);
  const nx = nextUp(k);
  const sub = p.rest ? 'Recovery day' : st.pct === 100 ? 'All done. Great work.' : nx ? 'Up next: ' + nx.name : '';
  // Swap is allowed until something is ticked, so a missed day can be made up.
  const canSwap = k >= today && !hasProgress(k);
  const swap = canSwap
    ? '<label class="swap"><span>Change workout</span><select data-swap="1" aria-label="Workout for this day">' + workoutOptions(workoutKeyFor(k)) + '</select></label>'
    : '';
  const complete = !p.rest && st.pct === 100;
  return '<section class="hero' + (complete ? ' complete' : '') + '">' +
    (complete ? '<div class="hero-badge">Workout complete</div>' : '') +
    (k === today && !complete ? '<div class="greet">' + greeting() + '</div>' : '') +
    '<div class="hero-top"><div class="hero-text">' +
    '<div class="eyebrow">' + DAY_NAMES[dow(k)] + ', ' + fmt(k) + (k === today ? ' &middot; today' : '') + (wk ? ' &middot; week ' + wk : '') + '</div>' +
    '<h1>' + esc(p.focus) + '</h1>' +
    '<div class="hero-sub">' + st.done + ' of ' + st.total + ' done' + (st.sets ? ' &middot; ' + st.sets + ' sets' : '') +
      (sessionLabel(k) ? ' &middot; <span id="sess">' + sessionLabel(k) + '</span>' : '') + '</div>' +
    (musclesFor(p).length ? '<div class="hero-works">Works ' + musclesFor(p).map(esc).join(', ') + '</div>' : '') +
    '</div>' + ring(st.pct) + '</div>' +
    (k === today ? heroStats() : '') + (p.rest ? '' : weekBar(k)) +
    (sub ? '<div class="hero-next">' + esc(sub) + (!complete && readyToLift(k) ? '<span class="hero-lift">' + readyToLift(k) + (readyToLift(k) === 1 ? ' lift' : ' lifts') + ' ready to go heavier today</span>' : '') + '</div>' : '') + swap +
    (k === today ? '<div class="hero-quote">' + esc(dailyLine(k)) + '</div>' : '') +
    '</section>';
}

function notifyPrompt() {
  if (!notify.supported() || notify.permission() !== 'default' || S.settings.notifyAsked) return '';
  return '<div class="notice accent" role="status"><div class="notice-text"><p><b>Get alerts in your notification panel</b></p>' +
    '<p class="muted">Rest timer, "Rest over" even with the screen off, and workout progress.</p></div>' +
    '<div class="notice-actions"><button type="button" data-action="notify-on">Turn on</button>' +
    '<button type="button" class="quiet" data-action="notify-later">Not now</button></div></div>';
}

// Shown when the app opens: yesterday missed, morning window passed, items left.
function reminderHtml() {
  const today = todayKey();
  if (S.settings.dismissed === today) return '';
  const h = new Date().getHours(), msgs = [];
  const y = addDays(today, -1), py = planFor(y);
  if (!py.rest && counts(y)) {
    const sy = dayStats(y);
    if (isMissedWorkout(y)) msgs.push('Yesterday (' + DAY_NAMES[dow(y)] + ', ' + py.focus + ') was fully missed. Make-up items were added to your next 3 training days.');
    else if (sy.done === 0) msgs.push('Yesterday (' + DAY_NAMES[dow(y)] + ', ' + py.focus + ') was missed. No stress, today counts.');
    else if (sy.pct < 100) msgs.push('Yesterday was ' + sy.pct + '% done. ' + (sy.total - sy.done) + ' items were left.');
  }
  const p = planFor(today), st = dayStats(today);
  if (!p.rest) {
    if (st.done === 0) {
      if (h < 6) msgs.push('Gym window opens at 6 AM. Today is ' + p.focus + '.');
      else if (h < 10) msgs.push('Morning window is on (6 to 10 AM). Today is ' + p.focus + '.');
      else msgs.push('Nothing ticked today yet. The morning window has passed, an evening session still works.');
    } else if (st.pct < 100 && h >= 10) {
      msgs.push((st.total - st.done) + ' items left today. Finish them in the evening if your mood allows.');
    }
  }
  const yb = balanceDone(y);
  if (yb && !yb.complete) msgs.push('Yesterday\'s balance plan was not completed (' + yb.done + ' of ' + yb.total + '). Those junk food points are still owed.');
  const isSunday = dow(today) === 0;
  if (isSunday) msgs.push('Your weekly report is ready. Download it as PDF or Word from the Report tab.');
  if (!msgs.length) return '';
  return '<div class="notice" role="status"><div class="notice-text">' + msgs.map((m) => '<p>' + esc(m) + '</p>').join('') +
    '</div><div class="notice-actions">' + (isSunday ? '<button type="button" data-action="go-report">Open report</button>' : '') +
    '<button type="button" class="quiet" data-action="dismiss">Got it</button></div></div>';
}

function renderToday() {
  const k = ui.selDate, p = planFor(k), d = dayRead(k), today = todayKey();
  let body = '';
  if (p.rest) {
    body += '<h2>Rest day</h2><ul class="list">' + p.tasks.map((t) => simpleCard('done', t.id, !!d.done[t.id], t.name, t.detail, t)).join('') + '</ul>' +
      '<button type="button" class="primary wide" data-action="go-report">Open this week\'s report</button>';
  } else {
    const nx = nextUp(k);
    const nextId = nx && k === today ? nx.id : null;
    notesForDay(k).forEach((ln) => {
      body += '<div class="memo"><span class="memo-h">Note from ' + DAY_SHORT[dow(ln.k)] + ' ' + fmt(ln.k) + ' (' + esc(planFor(ln.k).short) + ')</span><p>' + esc(ln.note) + '</p></div>';
    });
    body += makeupCard(k) + balanceCard(k);
    body += '<h2>Workout <span class="h-note">top to bottom, tap a name for tips</span></h2><ul class="list">' +
      mainExercises(p).map((e) => exerciseCard(e, d, false, e.id === nextId)).join('') + '</ul>';
    body += '<h2>Bonus <span class="h-note">if your body allows today</span></h2>' +
      '<ul class="list">' + bonusExercises(p).map((e) => exerciseCard(e, d, true, false)).join('') + '</ul>';
    body += '<h2>Cardio</h2><ul class="list">' + simpleCard('done', 'cardio', !!d.done.cardio, p.cardio.name, p.cardio.detail, p.cardio) + '</ul>';
  }

  const steps = d.steps || '';
  body += '<h2>Daily habits</h2><div class="card stepscard"><div class="steps-top"><label class="name" for="steps-in">Steps today</label>' +
    '<label class="kg big"><input type="number" inputmode="numeric" min="0" max="100000" step="100" id="steps-in" data-steps="1" value="' + esc(steps) + '" placeholder="0"><span>steps</span></label></div>' +
    '<div class="bar"><span id="steps-bar" style="width:' + stepsPct(steps, stepGoalFor(k)) + '%"></span></div><div class="tip" id="steps-note">' + stepsNote(steps, stepGoalFor(k)) + '</div></div>';
  const water = d.water || 0;
  body += '<div class="card watercard"><div class="steps-top"><span class="name">Water</span>' +
    '<span class="water-ctl"><button type="button" class="wbtn" data-action="water" data-n="-1" aria-label="One glass less">&#8722;</button>' +
    '<b><span id="water-n">' + water + '</span>/' + WATER_GOAL + '</b>' +
    '<button type="button" class="wbtn plus" data-action="water" data-n="1" aria-label="One more glass">+</button></span></div>' +
    '<div class="glasses">' + Array.from({ length: WATER_GOAL }, (_, i) => '<i class="' + (i < water ? 'on' : '') + '"></i>').join('') + '</div>' +
    '<div class="tip">' + (water >= WATER_GOAL ? 'Goal hit, 3 litres. Nice.' : (WATER_GOAL - water) + ' glasses of 250 ml to go.') + '</div></div>';
  if (k === today) body += bodyCard();
  body += treatCard(k);
  body += '<div class="habits">' + HABITS.filter((h) => h.id !== 'steps' && h.id !== 'water').map((h) => {
    const on = !!d.habits[h.id];
    return '<button type="button" class="habit' + (on ? ' on' : '') + '" data-action="habit" data-id="' + esc(h.id) + '" role="checkbox" aria-checked="' + on + '">' +
      '<span class="hb-tick" aria-hidden="true"></span><span>' + esc(h.name) + '</span></button>';
  }).join('') + '</div>';

  const mealsDone = MEALS.filter((m) => d.meals[m.id]).length;
  body += '<details class="diet"' + (S.settings.dietOpen ? ' open' : '') + '><summary data-action="diet-toggle"><span>Diet plan <span class="h-note">optional, veg ghar ka khana</span></span><span class="muted">' + mealsDone + '/' + MEALS.length + '</span></summary>' +
    '<ul class="list compact">' + MEALS.map((m) => simpleCard('meal', m.id, !!d.meals[m.id], m.name, m.detail)).join('') + '</ul></details>';

  const nextK = nextSameWorkout(k), mode = d.noteFor || 'next';
  const opt = (v, label) => '<button type="button" class="seg' + (mode === v ? ' on' : '') + '" data-action="note-for" data-v="' + v + '">' + label + '</button>';
  body += '<h2>Notes</h2><textarea data-note="1" rows="3" placeholder="How did it feel? Any pain? What to change next time?" aria-label="Notes">' + esc(d.note || '') + '</textarea>' +
    '<div class="note-row"><span class="note-status" id="note-status">' + noteStatus(d) + '</span>' +
    '<span class="segs" role="group" aria-label="Show this note again"><span class="segs-l">Remind</span>' +
    opt('next', nextK ? 'Next ' + esc(p.short) + ', ' + DAY_SHORT[dow(nextK)] : 'Next time') + opt('tomorrow', 'Tomorrow') + opt('off', 'Off') + '</span></div>';
  if (k !== today) body += '<button type="button" class="ghost wide" data-action="pick" data-k="' + today + '">Back to today</button>';

  return weekStrip(k) + (k === today ? notifyPrompt() + reminderHtml() : '') + hero(k) + body;
}

/* ---------- Report ---------- */
function renderReport() {
  const r = reportData(ui.reportWs);
  const thisWeek = ui.reportWs === weekStartOf(todayKey());
  const tiles = [
    ['This week', r.trained + '<small>/' + r.trainDays + '</small>', 'workout days'],
    ['Streak', r.streak, 'Sundays skipped'],
    [r.month.name, r.month.worked, 'workout days']
  ].map((t) => '<div class="tile"><div class="tl">' + t[0] + '</div><div class="tv">' + t[1] + '</div><div class="ts">' + t[2] + '</div></div>').join('');
  const statRows = [
    ['Best streak', r.best.days ? r.best.days + ' days, ' + fmt(r.best.from) + (r.best.from !== r.best.to ? ' to ' + fmt(r.best.to) : '') : 'Starts with your first workout'],
    ['Total workout days', num(r.totalDays)],
    ['Fully finished days', r.fullDays + (thisWeek ? ' this week so far' : ' this week')],
    ['Workout score', r.score + '%, ' + r.done + ' of ' + r.total + ' items, ' + r.sets + ' sets'],
    ['Steps a day', r.stepsDays ? num(r.stepsAvg) + ', goal hit ' + r.stepsGoal + ' days' : 'Not logged'],
    ['Habits', r.habitsPct + '%'],
    ['Junk food penalty', r.penalty.points ? r.penalty.points + ' pts, ' + r.penalty.back + ' earned back' : 'Clean week, 0 pts']
  ].map((x) => '<div class="stat"><span>' + x[0] + '</span><b>' + esc(x[1]) + '</b></div>').join('');

  const rows = r.rows.map((row) => '<tr><td><b>' + DAY_SHORT[dow(row.k)] + '</b> ' + fmt(row.k) + '</td><td>' + esc(row.p.short) + '</td>' +
    '<td class="num">' + row.st.done + '/' + row.st.total + '</td>' +
    '<td><span class="pill ' + row.status + '">' + STATUS_LABEL[row.status] + '</span></td></tr>').join('');

  const missed = r.missed.length
    ? '<ul class="plain">' + r.missed.map((m) => '<li><b>' + DAY_NAMES[dow(m.k)] + ':</b> ' + m.items.map(esc).join(', ') + '</li>').join('') + '</ul>'
    : '<p class="muted">Nothing missed so far.</p>';
  const todo = r.todo.length ? '<h3>Still to do today</h3><ul class="plain">' + r.todo.map((m) => '<li>' + m.items.map(esc).join(', ') + '</li>').join('') + '</ul>' : '';

  const weights = r.weights.length
    ? '<div class="tablewrap"><table><thead><tr><th>Exercise</th><th class="num">This week</th><th class="num">Last week</th><th class="num">Change</th></tr></thead><tbody>' +
      r.weights.map((w) => {
        const ch = w.last != null ? Math.round((w.now - w.last) * 10) / 10 : null;
        const cls = ch == null ? '' : ch > 0 ? 'up' : ch < 0 ? 'down' : '';
        return '<tr><td>' + esc(w.name) + '</td><td class="num">' + w.now + ' kg</td><td class="num">' + (w.last != null ? w.last + ' kg' : '-') +
          '</td><td class="num ' + cls + '">' + (ch == null ? 'new' : (ch > 0 ? '+' : '') + ch + ' kg') + '</td></tr>';
      }).join('') + '</tbody></table></div>'
    : '<p class="muted">No weights logged this week. Type the kg on each exercise card.</p>';

  const bodyNow = S.body[todayKey()] || '';
  const bodyList = r.body.length ? '<ul class="plain">' + r.body.map((b) => '<li>' + fmt(b.k) + ': <b>' + b.kg + ' kg</b></li>').join('') + '</ul>' : '';
  let bodyChange = '';
  if (r.body.length && r.lastBody != null) {
    const diff = Math.round((r.body[r.body.length - 1].kg - r.lastBody) * 10) / 10;
    bodyChange = '<p class="' + (diff < 0 ? 'good' : 'muted') + '">' + (diff < 0 ? 'Down ' + Math.abs(diff) : diff > 0 ? 'Up ' + diff : 'No change, 0') + ' kg since the last weigh in.</p>';
  }

  return '<div class="weeknav rep"><button type="button" class="arrow" data-action="rweek" data-n="-7" aria-label="Previous week">&#8249;</button>' +
    '<div class="rtitle"><div class="eyebrow">Weekly report</div><h1>' + fmt(r.ws) + ' to ' + fmt(r.we) + '</h1></div>' +
    '<button type="button" class="arrow" data-action="rweek" data-n="7" aria-label="Next week">&#8250;</button></div>' +
    '<p class="verdict">' + esc(r.verdict) + '</p>' +
    '<div class="tiles three">' + tiles + '</div>' + monthCalendar(r.asOf) +
    '<div class="stats">' + statRows + '</div>' +
    '<h2>Day by day</h2><div class="tablewrap"><table class="days"><thead><tr><th>Day</th><th>Workout</th><th class="num">Done</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<h2>Missed</h2>' + missed + todo +
    '<h2>Weights</h2>' + weights +
    bodySection() + missedSection(r.missedW) + junkSection(r.penalty) + badgeSection() +
    '<h2>Save this report</h2><div class="saverow">' +
    '<button type="button" class="primary" data-action="pdf-report">PDF</button>' +
    '<button type="button" class="ghost" data-action="doc-report">Word</button>' +
    '<button type="button" class="ghost" data-action="copy-report">Copy text</button></div>';
}

// Month calendar: every day coloured by how it went. Green done, amber part done, coral missed.
function monthCalendar(k) {
  const d = fromKey(k), y = d.getFullYear(), m = d.getMonth(), today = todayKey();
  const first = keyOf(new Date(y, m, 1)), days = new Date(y, m + 1, 0).getDate();
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  let cells = '';
  for (let i = 0; i < lead; i++) cells += '<span class="cal-cell empty"></span>';
  for (let i = 0; i < days; i++) {
    const dk = addDays(first, i), st = dayStatus(dk), p = planFor(dk);
    const cls = isMissedWorkout(dk) ? 'missed' : p.rest && st !== 'done' ? 'rest' : st === 'today' && hasProgress(dk) ? 'partial' : st;
    cells += '<button type="button" class="cal-cell ' + cls + (dk === today ? ' is-today' : '') + '" data-action="cal-day" data-k="' + dk + '" aria-label="' + esc(fmt(dk) + ', ' + p.short + ': ' + (STATUS_LABEL[st] || '')) + '">' + (i + 1) + (isMissedWorkout(dk) ? '<i class="xmark">&#10005;</i>' : '') + '</button>';
  }
  const head = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => '<span class="cal-head">' + x + '</span>').join('');
  return '<div class="cal card"><div class="cal-top"><b>' + esc(monthStats(k).name) + ' ' + y + '</b>' +
    '<span class="cal-legend"><i class="lg done"></i>Done<i class="lg partial"></i>Part<i class="lg missed"></i>Missed</span></div>' +
    '<p class="cal-hint">Tap a day to see what you did.</p>' +
    '<div class="cal-grid">' + head + cells + '</div></div>';
}

export function noteStatus(d) {
  if (!(d.note || '').trim()) return 'Saves as you type';
  return 'Saved' + (d.noteAt ? ' at ' + clockTime(d.noteAt) : '');
}

// Day detail sheet, opened from the Report calendar.
export function daySheetHtml(k) {
  const p = planFor(k), d = dayRead(k), st = dayStats(k), status = dayStatus(k);
  const req = requiredItems(k);
  const doneList = req.filter((it) => d.done[it.id]).map((it) => it.name);
  const missList = req.filter((it) => !d.done[it.id]).map((it) => it.name);
  const kgRows = Object.keys(d.kg || {}).filter((id) => parseFloat(d.kg[id]) > 0).map((id) => {
    const best = bestKg(id, k), v = parseFloat(d.kg[id]);
    return '<li><span>' + esc(EX_NAMES[id] || id) + '</span><b>' + v + ' kg' + (best && v > best.kg ? ' <em>best</em>' : '') + '</b></li>';
  }).join('');
  const mins = sessionMinutes(k);
  const chips = [
    st.sets ? st.sets + ' sets' : '', mins != null ? mins + ' min' : '', st.steps ? num(st.steps) + ' steps' : '',
    st.bonusDone ? st.bonusDone + ' bonus' : ''
  ].filter(Boolean).map((c) => '<span>' + c + '</span>').join('');
  return '<div class="sheet-card" role="dialog" aria-label="' + esc(fmt(k)) + '">' +
    '<div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-head"><div><div class="eyebrow">' + DAY_NAMES[dow(k)] + ', ' + fmt(k) + '</div><h2>' + esc(p.focus) + '</h2></div>' +
    '<span class="pill ' + status + '">' + (STATUS_LABEL[status] || '') + '</span></div>' +
    (p.rest ? '' : '<div class="sheet-prog"><div class="bar"><span style="width:' + st.pct + '%"></span></div><span>' + st.done + ' of ' + st.total + ' done, ' + st.pct + '%</span></div>') +
    (chips ? '<div class="sheet-chips">' + chips + '</div>' : '') +
    (doneList.length ? '<h3>Done</h3><ul class="sheet-list ok">' + doneList.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    (missList.length && k <= todayKey() ? '<h3>' + (k === todayKey() ? 'Still to do' : 'Missed') + '</h3><ul class="sheet-list no">' + missList.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
    (kgRows ? '<h3>Weights</h3><ul class="sheet-kg">' + kgRows + '</ul>' : '') +
    (treatsOn(k).length ? '<h3>Junk food</h3><ul class="sheet-list no">' + treatsOn(k).map((t) => '<li>' + esc(treatInfo(t.id).name) + ', ' + num(t.kcal) + ' kcal</li>').join('') + '</ul>' : '') +
    (isMissedWorkout(k) ? '<h3>Missed workout</h3><p class="sheet-note">Fully missed, ' + MISSED_POINTS + ' penalty points. Its make-up items (2 main lifts + 15 min cardio) go on your next training days, up to ' + MAKEUP_PER_DAY + ' a day.</p>' : '') +
    (makeupFor(k).length ? '<h3>Make-up items this day</h3><ul class="sheet-list ' + (makeupFor(k).every((it) => makeupTicked(k, it.id)) ? 'ok' : 'no') + '">' + makeupFor(k).map((it) => '<li>' + esc(it.name) + (makeupTicked(k, it.id) ? ', done' : ', not done') + '</li>').join('') + '</ul>' : '') +
    (balanceDone(k) ? '<h3>Balance plan</h3><p class="sheet-note">' + (balanceDone(k).complete ? 'Completed. Points earned back.' : (k < todayKey() ? 'Not completed: ' : 'In progress: ') + balanceDone(k).done + ' of ' + balanceDone(k).total + ' done.') + '</p>' : '') +
    ((d.note || '').trim() ? '<h3>Note</h3><p class="sheet-note">' + esc(d.note) + '</p>' : '') +
    (!doneList.length && !kgRows && !(d.note || '').trim() && k <= todayKey() ? '<p class="muted">Nothing logged on this day.</p>' : '') +
    '<div class="sheet-actions"><button type="button" class="primary" data-sheet="open" data-k="' + k + '">' + (k === todayKey() ? 'Go to today' : 'Open this day') + '</button>' +
    '<button type="button" class="ghost" data-sheet="close">Close</button></div></div>';
}

/* ---------- body weight ---------- */
const kg1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

// Small weigh-in card on Today.
function bodyCard() {
  const b = bodyStats(), logged = S.body[todayKey()];
  const line = b.current == null ? 'Log your weight to start tracking.'
    : b.target == null ? 'Now ' + kg1(b.current) + ' kg. Set a target in the Report tab.'
    : b.toGo > 0 ? (deadlineText(b) ? deadlineText(b).head + (deadlineText(b).status === 'unsafe' ? ', faster than safe. See Report.' : '.') : kg1(b.toGo) + ' kg to your goal of ' + kg1(b.target) + ' kg' + (b.lost > 0 ? ', ' + kg1(b.lost) + ' kg down so far' : '') + '.')
    : 'Goal of ' + kg1(b.target) + ' kg reached. Set a new one.';
  return '<div class="card bodycard"><div class="steps-top"><span class="name">Body weight</span>' +
    '<span class="body-in"><label class="kg"><input type="number" inputmode="decimal" min="30" max="250" step="0.1" id="bodykg" value="' + esc(logged || '') + '" placeholder="' + (b.current ? kg1(b.current) : '0') + '" aria-label="Weight today"><span>kg</span></label>' +
    '<button type="button" class="chip" data-action="save-body">' + (logged ? 'Update' : 'Log') + '</button></span></div>' +
    (b.pct != null ? '<div class="bar"><span style="width:' + b.pct + '%"></span></div>' : '') +
    '<div class="tip">' + line + '</div></div>';
}

// Smooth weight trend: soft gradient line and fill, light grid, goal as a dashed line, latest value tagged.
function weightChart(b) {
  const pts = b.entries.slice(-16);
  if (pts.length < 2) return '<p class="muted small">The chart appears after your second weigh-in.</p>';
  const W = 330, H = 160, L = 34, R = 12, T = 14, B = 26;
  const vals = pts.map((p) => p.kg).concat(b.target != null ? [b.target] : []);
  const lo = Math.floor(Math.min.apply(null, vals) - 1), hi = Math.ceil(Math.max.apply(null, vals) + 1);
  const x = (i) => L + i * (W - L - R) / (pts.length - 1), y = (v) => T + (hi - v) / (hi - lo) * (H - T - B);
  const P = pts.map((p, i) => [x(i), y(p.kg)]);
  // Catmull-Rom to Bezier for a smooth curve
  let d = 'M' + P[0][0].toFixed(1) + ' ' + P[0][1].toFixed(1);
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ' C' + c1[0].toFixed(1) + ' ' + c1[1].toFixed(1) + ' ' + c2[0].toFixed(1) + ' ' + c2[1].toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
  }
  const area = d + ' L' + P[P.length - 1][0].toFixed(1) + ' ' + (H - B) + ' L' + P[0][0].toFixed(1) + ' ' + (H - B) + ' Z';
  const steps = 4, grid = Array.from({ length: steps + 1 }, (_, i) => lo + (hi - lo) * i / steps).map((v) =>
    '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" class="wc-grid"/>' +
    '<text x="' + (L - 6) + '" y="' + (y(v) + 3.5).toFixed(1) + '" text-anchor="end" class="wc-ax">' + Math.round(v) + '</text>').join('');
  const goal = b.target != null ? '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(b.target).toFixed(1) + '" y2="' + y(b.target).toFixed(1) + '" class="wc-target"/>' +
    '<rect x="' + (W - R - 58) + '" y="' + (y(b.target) - 18).toFixed(1) + '" width="58" height="15" rx="7.5" class="wc-goalbg"/>' +
    '<text x="' + (W - R - 29) + '" y="' + (y(b.target) - 7.5).toFixed(1) + '" text-anchor="middle" class="wc-goal">Goal ' + kg1(b.target) + '</text>' : '';
  const lp = P[P.length - 1], tagX = Math.min(Math.max(lp[0], L + 24), W - R - 24);
  const dots = P.map((p, i) => i === P.length - 1 ? '' : '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="2.4" class="wc-dot"/>').join('');
  return '<svg class="wchart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Weight trend">' +
    '<defs><linearGradient id="wcFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9bcff" stop-opacity="0.42"/><stop offset="1" stop-color="#c9bcff" stop-opacity="0"/></linearGradient>' +
    '<linearGradient id="wcLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f7cf5"/><stop offset="1" stop-color="#ffffff"/></linearGradient></defs>' +
    grid + goal + '<path d="' + area + '" fill="url(#wcFill)"/><path d="' + d + '" class="wc-line"/>' + dots +
    '<circle cx="' + lp[0].toFixed(1) + '" cy="' + lp[1].toFixed(1) + '" r="9" class="wc-halo"/><circle cx="' + lp[0].toFixed(1) + '" cy="' + lp[1].toFixed(1) + '" r="4.5" class="wc-last"/>' +
    '<rect x="' + (tagX - 24) + '" y="' + (lp[1] - 30).toFixed(1) + '" width="48" height="18" rx="9" class="wc-tagbg"/>' +
    '<text x="' + tagX + '" y="' + (lp[1] - 17.5).toFixed(1) + '" text-anchor="middle" class="wc-tag">' + kg1(pts[pts.length - 1].kg) + '</text>' +
    '<text x="' + L + '" y="' + (H - 8) + '" class="wc-ax">' + fmt(pts[0].k) + '</text><text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" class="wc-ax">' + fmt(pts[pts.length - 1].k) + '</text></svg>';
}

// Full body weight section for the Report tab.
export function bodySection() {
  const b = bodyStats(), logged = S.body[todayKey()];
  const tiles = b.current == null ? '' : '<div class="bw-tiles">' +
    '<div><span>Start</span><b>' + kg1(b.start) + '</b></div>' +
    '<div><span>Now</span><b>' + kg1(b.current) + '</b></div>' +
    '<div><span>Target</span><b>' + (b.target != null ? kg1(b.target) : '-') + '</b></div>' +
    '<div class="hl"><span>' + (b.lost >= 0 ? 'Lost' : 'Gained') + '</span><b>' + kg1(Math.abs(b.lost)) + '</b></div></div>';
  let pace = '';
  if (b.current != null && b.target != null && b.toGo > 0) {
    pace = '<p class="bw-pace">' + kg1(b.toGo) + ' kg to go' +
      (b.rate > 0 ? ', losing ' + kg1(b.rate) + ' kg a week' + (b.eta ? '. At this pace you reach ' + kg1(b.target) + ' kg around ' + fmt(b.eta) + ' ' + fromKey(b.eta).getFullYear() : '') + '.' : '. Weigh in once a week to see your pace and goal date.') + '</p>' +
      '<p class="muted small">A safe pace is 0.5 to 1 kg a week. Faster usually means losing muscle.</p>';
  }
  const dt = deadlineText(b);
  const dbox = dt ? '<div class="deadline ' + dt.status + '"><b>' + esc(dt.head) + '</b><p>' + esc(dt.body) + '</p></div>' : '';
  return '<h2>Body weight</h2><div class="card bwcard">' + tiles +
    (b.pct != null ? '<div class="bw-prog"><div class="bar"><span style="width:' + b.pct + '%"></span></div><span>' + b.pct + '% of the way</span></div>' : '') +
    (b.entries.length ? weightChart(b) : '') + dbox + pace +
    '<div class="bw-form"><label class="kg big"><input type="number" inputmode="decimal" min="30" max="250" step="0.1" id="bodykg" value="' + esc(logged || '') + '" placeholder="' + (b.current ? kg1(b.current) : '111') + '" aria-label="Weight today"><span>kg today</span></label>' +
    '<button type="button" class="primary" data-action="save-body">Save</button></div>' +
    '<div class="goal-form"><span class="gf-l">Goal</span><label class="kg big"><input type="number" inputmode="decimal" min="30" max="250" step="0.5" id="targetkg" value="' + esc(S.settings.targetKg || '') + '" placeholder="95" aria-label="Target weight"><span>kg</span></label>' +
    '<span class="gf-l">by</span><label class="datein"><input type="date" id="targetdate" min="' + addDays(todayKey(), 7) + '" value="' + esc(S.settings.targetDate || '') + '" aria-label="Target date"></label>' +
    '<button type="button" class="ghost" data-action="save-target">Set goal</button></div>' +
    (S.settings.targetDate ? '<button type="button" class="linkbtn" data-action="clear-date">Remove target date</button>' : '') + '</div>';
}

/* ---------- junk food and balance plan ---------- */
function treatCard(k) {
  const list = treatsOn(k);
  const pts = list.reduce((a, t) => a + treatPoints(t.kcal), 0);
  return '<div class="card treatcard"><div class="steps-top"><span class="name">Junk food' + (list.length ? ' <span class="pen">&minus;' + pts + ' pts</span>' : '') + '</span>' +
    '<button type="button" class="chip" data-action="treat-open">' + (list.length ? 'Log more' : 'Log junk food') + '</button></div>' +
    (list.length ? '<ul class="treats">' + list.map((t, i) => '<li><span>' + esc(treatInfo(t.id).name) + '</span><small>' + num(t.kcal) + ' kcal, ' + ptsLabel(treatPoints(t.kcal)) + '</small>' +
      '<button type="button" class="x" data-action="treat-del" data-i="' + i + '" aria-label="Remove">&times;</button></li>').join('') + '</ul>' +
      '<div class="tip">Before 6 PM the balance plan is added to today, after 6 PM to tomorrow. Finish it to earn the points back. Eat your next meal as normal, do not skip meals.</div>'
      : '<div class="tip">Clean so far today. If you eat something, log it honestly. No guilt, just a small plan to balance it.</div>') + '</div>';
}

function balanceCard(k) {
  const b = balanceFor(k), bd = balanceDone(k);
  if (!b || !bd) return '';
  const d = dayRead(k), steps = parseInt(d.steps, 10) || 0, ticks = d.balanceDone || {}, today = todayKey();
  const why = b.from.map((f) => esc(f.name) + ' (' + num(f.kcal) + ' kcal, ' + ptsLabel(f.points) + ')' +
    (f.k === k ? ', eaten before 6 PM today' : ', ' + DAY_SHORT[dow(f.k)] + (f.late ? ' after 6 PM' : '')) + (f.days > 1 ? ', spread over 2 days' : '')).join('; ');
  const row = (done, title, sub, btn) => '<li class="' + (done ? 'done' : '') + '"><span class="bt" aria-hidden="true"></span><div><b>' + title + '</b><small>' + sub + '</small></div>' + (btn || '') + '</li>';
  let rows = '';
  b.tasks.forEach((t) => {
    const done = bd.tasks.find((x) => x.id === t.id).done;
    if (t.kind === 'steps') rows += row(done, 'Walk ' + num(t.steps) + ' extra steps', 'Step goal today is ' + num(stepGoalFor(k)) + ', you have ' + num(steps) + '. Tick it when done, or it ticks itself from the steps box. About ' + t.kcal + ' kcal.',
      '<button type="button" class="tick' + (done ? ' on' : '') + '" data-action="balance-tick" data-id="' + t.id + '" role="checkbox" aria-checked="' + done + '" aria-label="Extra steps done"></button>');
    else rows += row(done, t.act.name + ', ' + t.minutes + ' min', esc(t.act.how) + ' About ' + t.kcal + ' kcal.',
      '<button type="button" class="tick' + (ticks[t.id] ? ' on' : '') + '" data-action="balance-tick" data-id="' + t.id + '" role="checkbox" aria-checked="' + !!ticks[t.id] + '" aria-label="' + esc(t.act.name) + ' done"></button>');
  });
  if (b.noJunk) {
    const nj = bd.tasks.find((t) => t.id === 'nojunk').done;
    rows += row(nj, 'No junk today', 'Tick at the end of the day if you stayed clean. Same as the habit below.',
      '<button type="button" class="tick' + (nj ? ' on' : '') + '" data-action="habit" data-id="nojunk" role="checkbox" aria-checked="' + nj + '" aria-label="No junk today"></button>');
  }
  const state = bd.complete ? '<p class="bal-ok">Balance done. Points earned back.</p>' : k < today ? '<p class="bal-miss">Not completed. These points stay owed.</p>' : '';
  return '<div class="balance card' + (bd.complete ? ' complete' : '') + '"><div class="bal-head"><span class="bal-tag">Balance plan</span><span class="bal-n">' + bd.done + '/' + bd.total + '</span></div>' +
    '<p class="bal-from"><b>Why:</b> ' + why + '. Burn back about ' + b.kcal + ' kcal today, roughly 30% of it. Activities change every day.</p>' +
    '<ul class="bal-list">' + rows + '</ul>' + state + '</div>';
}

// Small bar chart of the last weights for one exercise.
function kgSpark(id) {
  const h = kgHistory(id, ui.selDate, 6);
  if (h.length < 2) return '';
  const max = Math.max.apply(null, h.map((x) => x.kg)), min = Math.min.apply(null, h.map((x) => x.kg));
  return '<div class="kgspark"><span class="ks-l">Last ' + h.length + ' sessions</span><div class="ks-bars">' + h.map((x, i) => {
    const pct = max === min ? 70 : 30 + (x.kg - min) / (max - min) * 70;
    return '<span class="' + (i === h.length - 1 ? 'last' : '') + '"><i style="height:' + pct.toFixed(0) + '%"></i><em>' + x.kg + '</em></span>';
  }).join('') + '</div></div>';
}

function badgeSection() {
  const list = badges(), got = list.filter((b) => b.on).length;
  return '<h2>Badges <span class="h-note">' + got + ' of ' + list.length + ' earned</span></h2><div class="badges">' + list.map((b) =>
    '<div class="badge' + (b.on ? ' on' : '') + '"><span class="bd-i" aria-hidden="true"></span><b>' + esc(b.name) + '</b><small>' + esc(b.desc) + '</small></div>').join('') + '</div>';
}

// Make-up items from a fully missed workout day, shown at the top of the workout.
function makeupCard(k) {
  const list = makeupFor(k);
  if (!list.length) return '';
  const done = list.filter((it) => makeupTicked(k, it.id)).length, today = todayKey();
  const from = Array.from(new Set(list.map((it) => DAY_NAMES[dow(it.from)] + ' (' + planFor(it.from).short + ')'))).join(', ');
  const waiting = k >= today ? makeupQueue(k) : 0;
  const rows = list.map((it) => {
    const on = makeupTicked(k, it.id);
    return '<li class="' + (on ? 'done' : '') + '"><span class="bt" aria-hidden="true"></span><div><b>' + esc(it.name) + '</b><small>' + esc(it.detail) + '</small></div>' +
      '<button type="button" class="tick' + (on ? ' on' : '') + '" data-action="makeup-tick" data-id="' + it.id + '" role="checkbox" aria-checked="' + on + '" aria-label="' + esc(it.name) + ' done"></button></li>';
  }).join('');
  return '<div class="balance makeup card' + (done === list.length ? ' complete' : '') + '"><div class="bal-head"><span class="bal-tag mk">Make-up for missed workout</span><span class="bal-n">' + done + '/' + list.length + '</span></div>' +
    '<p class="bal-from"><b>Why:</b> you fully missed ' + esc(from) + '. Every missed day costs ' + MISSED_POINTS + ' points and gets its own make-up: 2 main lifts + 15 min cardio, up to ' + MAKEUP_PER_DAY + ' items a day on your next training days. Skip a day and its items move to the next one.' + (waiting ? ' <b>' + waiting + ' more waiting after today.</b>' : '') + '</p>' +
    '<ul class="bal-list">' + rows + '</ul>' + (done === list.length ? '<p class="bal-ok">Make-up done for today.</p>' : k < today ? '<p class="bal-miss">Not completed.</p>' : '') + '</div>';
}

function missedSection(mw) {
  if (!mw.items.length) return '<h2>Missed workouts</h2><div class="card treatsum"><b>No full misses this week.</b><span class="muted small">A day only counts as missed when nothing at all was done.</span></div>';
  return '<h2>Missed workouts</h2><div class="card treatsum"><div class="pen-tiles">' +
    '<div><span>Penalty</span><b>' + mw.points + '</b></div><div><span>Earned back</span><b>' + mw.back + '</b></div>' +
    '<div class="' + (mw.net > 0 ? 'owe' : 'ok') + '"><span>Still owed</span><b>' + mw.net + '</b></div></div>' +
    '<ul class="treats">' + mw.items.map((t) => '<li><span>' + DAY_SHORT[dow(t.k)] + ' &middot; ' + esc(t.name) + '<small class="tstat ' + t.status + '">' +
      (t.status === 'done' ? 'Make-up done' : t.status === 'pending' ? 'Make-up on ' + t.days.map((x) => DAY_SHORT[dow(x)]).join(', ') : 'Make-up not completed') + '</small></span>' +
      '<small>' + t.done + ' of ' + t.total + ' done, ' + t.earned + ' back</small></li>').join('') + '</ul></div>';
}

function junkSection(pen) {
  if (!pen.items.length) return '<h2>Junk food</h2><div class="card treatsum"><b>Clean week.</b><span class="muted small">No junk food logged, no penalty points.</span></div>';
  return '<h2>Junk food</h2><div class="card treatsum"><div class="pen-tiles">' +
    '<div><span>Penalty</span><b>' + pen.points + '</b></div><div><span>Earned back</span><b>' + pen.back + '</b></div>' +
    '<div class="' + (pen.net > 0 ? 'owe' : 'ok') + '"><span>Still owed</span><b>' + pen.net + '</b></div></div>' +
    '<ul class="treats">' + pen.items.map((t) => '<li><span>' + DAY_SHORT[dow(t.k)] + ' &middot; ' + esc(t.name) + '<small class="tstat ' + t.status + '">' +
      (t.status === 'done' ? 'Balance done' : t.status === 'pending' ? 'Balance on ' + t.days.map((x) => DAY_SHORT[dow(x)]).join(', ') : 'Balance not completed') + '</small></span>' +
      '<small>' + num(t.kcal) + ' kcal, ' + ptsLabel(t.points) + ', ' + t.earned + ' back</small></li>').join('') + '</ul>' +
    '<p class="muted small">About ' + num(pen.kcal) + ' extra kcal this week, close to ' + Math.round(walkMinutes(pen.kcal) / 60 * 10) / 10 + ' hours of brisk walking. Points come back by finishing the balance plan on the days after.</p></div>';
}

// Sheet with the junk food list. Shows the calorie cost as walking minutes before you log it.
export function treatSheetHtml() {
  return '<div class="sheet-card" role="dialog" aria-label="Log junk food"><div class="sheet-grab" aria-hidden="true"></div>' +
    '<div class="sheet-head"><div><div class="eyebrow">Log junk food</div><h2>What did you have?</h2></div></div>' +
    '<p class="muted small" style="margin:6px 0 12px">Calories are rough averages. Walking time is what it takes to burn it, just so you know the cost.</p>' +
    '<div class="treat-grid">' + TREATS.map((t) => '<button type="button" class="treat" data-treat="' + t.id + '"><b>' + esc(t.name) + '</b>' +
      '<small>' + num(t.kcal) + ' kcal &middot; ' + walkMinutes(t.kcal) + ' min walk</small><span class="tp">&minus;' + treatPoints(t.kcal) + ' pts</span></button>').join('') + '</div>' +
    '<div class="sheet-actions"><button type="button" class="ghost" data-sheet="close">Cancel</button></div></div>';
}

/* ---------- Plan ---------- */
function remindSection() {
  const r = S.settings.remind || {}, w = r.water == null ? 30 : r.water, steps = r.steps !== false;
  const seg = (v, label) => '<button type="button" class="seg' + (w === v ? ' on' : '') + '" data-action="remind-water" data-v="' + v + '">' + label + '</button>';
  return '<h2>Reminders</h2><div class="card panel">' +
    '<div class="rem-row"><div><b>Drink water</b><div class="muted small">7 AM to 10 PM, stops at ' + WATER_GOAL + ' glasses</div></div>' +
    '<span class="segs">' + seg(0, 'Off') + seg(30, '30 min') + seg(60, '1 h') + seg(90, '1.5 h') + '</span></div>' +
    '<div class="rem-row"><div><b>Walk for steps</b><div class="muted small">Every 2 hours from 5 PM until ' + num(STEP_GOAL) + ' steps</div></div>' +
    '<button type="button" class="switch' + (steps ? ' on' : '') + '" data-action="remind-steps" role="switch" aria-checked="' + steps + '" aria-label="Steps reminder"></button></div>' +
    '<p class="muted small">These come as phone notifications while the app is open or running in the background' + (notify.enabled() ? '' : '. Turn on notifications below to get them in your notification panel') + '. If the app is fully closed they cannot fire; that needs a push server.</p></div>';
}

function notifySection() {
  const perm = notify.permission();
  let status, btns = '';
  if (perm === 'unsupported') {
    status = 'This browser cannot show notifications. On iPhone, add the app to the Home Screen first (iOS 16.4 or newer), then open it from there.';
  } else if (perm === 'denied') {
    status = 'Blocked for this app. Long-press the app icon, open App info, then Notifications, and allow them. Then come back here.';
  } else if (notify.enabled()) {
    status = 'On. Workout progress and the rest timer show in your notification panel. "Rest over" arrives even with the screen off.';
    btns = '<button type="button" class="ghost" data-action="notify-test">Send a test</button><button type="button" class="ghost" data-action="notify-off">Turn off</button>';
  } else {
    status = 'Off. Turn on to see the rest timer and workout progress in your notification panel.';
    btns = '<button type="button" class="primary" data-action="notify-on">Turn on notifications</button>';
  }
  const hint = perm !== 'unsupported' && !notify.isInstalled()
    ? '<p class="muted small">Tip: open the app from its home-screen icon. Notifications work best there.</p>' : '';
  return '<h2>Notifications</h2><div class="card panel"><p class="panel-text">' + esc(status) + '</p>' +
    (btns ? '<div class="btnrow">' + btns + '</div>' : '') + '</div>' + hint;
}

function scheduleEditor() {
  const sch = schedule();
  const rows = WEEK_ORDER.map((i) => '<label class="sched-row"><span>' + DAY_NAMES[i] + '</span>' +
    '<select data-sched="' + i + '" aria-label="' + DAY_NAMES[i] + ' workout">' + workoutOptions(sch[i]) + '</select></label>').join('');
  return '<h2>Your week <span class="h-note">change any day</span></h2><div class="card sched">' + rows + '</div>' +
    (S.settings.schedule ? '<button type="button" class="ghost small-btn" data-action="sched-reset">Back to the default week</button>' : '');
}

function workoutList() {
  const sch = schedule(), todayW = workoutKeyFor(todayKey());
  return Object.values(WORKOUTS).map((p) => {
    const days = WEEK_ORDER.filter((i) => sch[i] === p.key).map((i) => DAY_SHORT[i]);
    if (!days.length) return '';
    const list = p.rest
      ? p.tasks.map((t) => '<li>' + esc(t.name) + ' <span class="muted">' + esc(t.detail) + '</span></li>').join('')
      : mainExercises(p).map((e) => '<li>' + esc(e.name) + ' <span class="muted">' + (e.id === WARMUP.id ? esc(e.reps) : e.sets + ' x ' + esc(e.reps)) + '</span>' +
          (e.id !== WARMUP.id && e.main.length ? '<span class="plan-works">' + e.main.map(esc).join(', ') + '</span>' : '') + '</li>').join('') +
        bonusExercises(p).map((e) => '<li class="b">Bonus ' + e.bonus + ': ' + esc(e.name) + ' <span class="muted">' + e.sets + ' x ' + esc(e.reps) + '</span></li>').join('') +
        '<li>Cardio: ' + esc(p.cardio.name) + ' <span class="muted">' + esc(p.cardio.detail) + '</span></li>';
    return '<details class="plan-day"' + (p.key === todayW ? ' open' : '') + '><summary><b>' + esc(p.focus) + '</b> <span class="muted">' + days.join(', ') + '</span></summary><ol>' + list + '</ol></details>';
  }).join('');
}

function goalLegend() {
  return '<details class="fold"><summary>What the tags mean</summary><ul class="legend">' + Object.keys(GOALS).map((k) =>
    '<li><span class="goal g-' + k + '">' + esc(GOALS[k].label) + '</span><span>' + esc(GOALS[k].why) + '</span></li>').join('') + '</ul>' +
    '<p class="muted small">Losing weight: every lift counts, not just cardio. Lifting keeps your muscle while the diet and steps burn fat, so the weight you lose is fat.</p></details>';
}

// One fold per workout in your week, so the list stays short.
function watchList() {
  const sch = schedule();
  return Object.values(WORKOUTS).map((p) => {
    if (p.rest || !sch.includes(p.key)) return '';
    const items = p.exercises.filter((e) => e.video);
    if (!items.length) return '';
    const days = WEEK_ORDER.filter((i) => sch[i] === p.key).map((i) => DAY_SHORT[i]).join(', ');
    return '<details class="fold"><summary>' + esc(p.focus) + ' <span class="muted">' + days + ', ' + items.length + ' videos</span></summary><ul class="watchlist">' + items.map((e) =>
      '<li><a href="' + esc(e.video) + '" target="_blank" rel="noopener">' + esc(e.name) + ' <span aria-hidden="true">&#8599;</span></a><span class="muted">' + esc(e.machine) + '</span></li>').join('') + '</ul></details>';
  }).join('');
}

function dataSection() {
  let last = '';
  if (S.settings.lastAutoBackup) {
    const t = S.settings.lastAutoBackup, k = keyOf(new Date(t));
    last = (k === todayKey() ? 'Today' : fmt(k)) + ' at ' + clockTime(t);
  }
  return '<h2>Your data</h2><div class="card panel"><div class="panel-head"><span class="dot-ok" aria-hidden="true"></span>Local auto-backup on</div>' +
    '<p class="panel-text muted">Saved on this phone (browser vault + storage) every night and after workouts. Survives closing the app and cache clears.</p>' +
    (last ? '<p class="muted small">Last backup: ' + esc(last) + '</p>' : '') +
    '<div class="btnrow"><button type="button" class="ghost" data-action="backup-now">Backup now</button>' +
    '<button type="button" class="ghost" data-action="restore-autobackup">Restore</button></div></div>' +
    '<p class="muted">Download a backup file to keep a permanent copy or move to another phone.</p>' +
    '<div class="actions"><button type="button" class="ghost" data-action="export">Download backup</button>' +
    '<label class="ghost filebtn">Restore file<input type="file" id="importfile" accept="application/json,.json" hidden></label>' +
    '<button type="button" class="ghost" data-action="lock">Lock now</button>' +
    '<button type="button" class="danger" data-action="wipe">Erase all data</button></div>';
}

function renderPlan() {
  return '<div class="eyebrow">Weekly plan</div><h1>Your split</h1>' +
    '<p class="muted">Each day starts with a fresh checklist. Bonus exercises are there every day, do them when your body allows.</p>' +
    scheduleEditor() +
    '<h2>Workouts</h2>' + workoutList() +
    '<h2>Watch list <span class="h-note">how to do each exercise</span></h2>' + watchList() +
    '<h2>Rules</h2><ul class="plain"><li>Every muscle is trained twice a week: chest Mon + Fri, back Tue + Thu, shoulders Mon + Thu, arms Mon, Tue + Fri, legs Wed + Sat, abs Mon, Wed + Fri.</li>' +
    '<li>Main lifts (marked heavy): stop 1 to 2 reps before failure. Isolation moves: take the last set close to failure, form clean.</li>' +
    '<li>Supersets (A1 + A2): one set of each back to back, then rest. Saves time and keeps the heart rate up for fat burn.</li>' +
    '<li>Hit the top reps on every set, then add the smallest weight jump next time.</li>' +
    '<li>Never lock knees on leg press. Keep your back flat on every row and pulldown.</li>' +
    '<li>Every 6 to 8 weeks, one easy week at half the sets.</li></ul>' + goalLegend() +
    remindSection() + notifySection() + dataSection();
}
