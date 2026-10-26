/* Screens: Today, Report and Plan. Each returns an HTML string; render() puts it on the page. */
import { WORKOUTS, WARMUP, HABITS, MEALS, GOALS } from './data.js';
import { S } from './store.js';
import {
  planFor, workoutKeyFor, schedule, dayRead, dayStats, dayStatus, hasProgress, mainExercises, bonusExercises,
  weightHint, musclesFor, nextUp, programWeek, counts, stepsPct, STEP_GOAL, STATUS_LABEL, WEEK_ORDER,
  streak, monthStats
} from './plan.js';
import { reportData, bestLabel } from './report.js';
import * as notify from './notify.js';
import { $, esc, fmt, keyOf, fromKey, addDays, todayKey, weekStartOf, weekDays, dow, num, restLabel, clockTime, DAY_NAMES, DAY_SHORT } from './util.js';

export const ui = { view: 'today', selDate: todayKey(), reportWs: weekStartOf(todayKey()) };

export function render() {
  const v = $('#view');
  v.innerHTML = ui.view === 'report' ? renderReport() : ui.view === 'plan' ? renderPlan() : renderToday();
  document.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.view === ui.view);
    b.setAttribute('aria-current', b.dataset.view === ui.view ? 'page' : 'false');
  });
}

export function stepsNote(v) {
  const n = parseInt(v, 10) || 0;
  if (!n) return 'Goal ' + num(STEP_GOAL) + ' a day. Copy the number from your phone\'s step counter.';
  if (n >= STEP_GOAL) return 'Goal hit. ' + num(n) + ' steps.';
  return num(STEP_GOAL - n) + ' more to reach ' + num(STEP_GOAL) + '.';
}

const workoutOptions = (selected) => Object.values(WORKOUTS)
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

function exerciseCard(e, d, isBonus, isNext) {
  const done = !!d.done[e.id];
  const sets = d.sets[e.id] || [];
  let dots = '';
  if (e.id !== 'warmup') {
    for (let i = 0; i < e.sets; i++) {
      dots += '<button type="button" class="set' + (sets[i] ? ' on' : '') + '" data-action="set" data-id="' + esc(e.id) +
        '" data-i="' + i + '" aria-label="Set ' + (i + 1) + '">' + (i + 1) + '</button>';
    }
  }
  const hasKg = !(e.id === 'warmup' || /plank/.test(e.id));
  const last = hasKg ? weightHint(ui.selDate, e) : null;
  const kgField = hasKg
    ? '<label class="kg"><input type="number" inputmode="decimal" min="0" step="0.5" data-kg="' + esc(e.id) +
      '" value="' + esc(d.kg[e.id] || '') + '" placeholder="' + (last ? last.kg : '0') + '" aria-label="' + esc(e.name) + ' weight"><span>kg</span></label>'
    : '';
  const lastNote = !last ? '' : last.allSets && !d.kg[e.id]
    ? '<span class="last up-hint">Last time ' + last.kg + ' kg, all sets done. If the reps felt easy, try <b>' + last.next + ' kg</b>.</span>'
    : '<span class="last">Last time ' + last.kg + ' kg (' + DAY_SHORT[dow(last.k)] + ' ' + fmt(last.k) + ')</span>';
  const restBtn = e.rest ? '<button type="button" class="chip" data-action="rest" data-sec="' + e.rest + '" data-name="' + esc(e.name) + '">Rest ' + restLabel(e.rest) + '</button>' : '';
  const video = e.video ? '<div class="watchrow"><a class="watch" href="' + esc(e.video) + '" target="_blank" rel="noopener">Watch how to do it <span aria-hidden="true">&#8599;</span></a></div>' : '';
  const tools = dots || kgField || restBtn
    ? '<div class="tools">' + (dots ? '<div class="dots">' + dots + '</div>' : '') + kgField + restBtn + lastNote + '</div>' : '';
  return '<li class="card' + (done ? ' done' : '') + (isBonus ? ' bonus' : '') + (isNext ? ' next' : '') + '">' +
    '<div class="row">' + checkbox('done', e.id, done, 'Mark ' + e.name + ' done') +
    '<div class="body">' + (isNext ? '<span class="upnext">Up next</span>' : '') +
    '<div class="name">' + (isBonus ? '<span class="tag">Bonus</span>' : '') + esc(e.name) + '</div>' +
    '<div class="machine">' + esc(e.machine) + '</div>' + works(e) +
    '<div class="meta"><span class="sets-reps">' + (e.id === 'warmup' ? esc(e.reps) : e.sets + ' &times; ' + esc(e.reps)) + '</span>' +
    (e.rest ? '<span class="muted">rest ' + restLabel(e.rest) + '</span>' : '') + '</div>' +
    (e.tip ? '<div class="tip">' + esc(e.tip) + '</div>' : '') +
    '</div></div>' + tools + video + '</li>';
}

function simpleCard(action, id, on, name, detail, info) {
  return '<li class="card' + (on ? ' done' : '') + '"><div class="row">' + checkbox(action, id, on, name) +
    '<div class="body"><div class="name">' + esc(name) + '</div>' + (info ? works(info) : '') + (detail ? '<div class="tip">' + esc(detail) + '</div>' : '') + '</div></div></li>';
}

function weekStrip(k) {
  const today = todayKey();
  const html = weekDays(weekStartOf(k)).map((dk) => {
    const st = dayStatus(dk), p = planFor(dk);
    return '<button type="button" class="day ' + st + (dk === k ? ' sel' : '') + (dk === today ? ' is-today' : '') + '" data-action="pick" data-k="' + dk + '">' +
      '<span class="dn">' + DAY_SHORT[dow(dk)] + '</span><span class="dd">' + fromKey(dk).getDate() + '</span><span class="df">' + p.short + '</span></button>';
  }).join('');
  return '<div class="weeknav"><button type="button" class="arrow" data-action="shift" data-n="-7" aria-label="Previous week">&#8249;</button>' +
    '<div class="strip">' + html + '</div>' +
    '<button type="button" class="arrow" data-action="shift" data-n="7" aria-label="Next week">&#8250;</button></div>';
}

function ring(pct) {
  const r = 26, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return '<svg class="ring" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="' + r + '" class="ring-bg"/>' +
    '<circle cx="32" cy="32" r="' + r + '" class="ring-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/>' +
    '<text x="32" y="37" text-anchor="middle">' + pct + '%</text></svg>';
}

// Streak and month count under today's title.
function heroStats() {
  const sk = streak(), m = monthStats(todayKey());
  return '<div class="hero-stats"><span><b>' + sk + '</b> day streak</span><span><b>' + m.worked + '</b> workout days in ' + esc(m.name) + '</span></div>';
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
  return '<section class="hero">' +
    '<div class="hero-top"><div class="hero-text">' +
    '<div class="eyebrow">' + DAY_NAMES[dow(k)] + ', ' + fmt(k) + (k === today ? ' &middot; today' : '') + (wk ? ' &middot; week ' + wk : '') + '</div>' +
    '<h1>' + esc(p.focus) + '</h1>' +
    '<div class="hero-sub">' + st.done + ' of ' + st.total + ' done' + (st.sets ? ' &middot; ' + st.sets + ' sets' : '') + '</div>' +
    (k === today ? heroStats() : '') +
    '</div>' + ring(st.pct) + '</div>' +
    (musclesFor(p).length ? '<div class="hero-muscles"><span>Works today</span>' + musclesFor(p).map((m) => '<i>' + esc(m) + '</i>').join('') + '</div>' : '') +
    (sub ? '<div class="hero-next">' + esc(sub) + '</div>' : '') + swap +
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
    if (sy.done === 0) msgs.push('Yesterday (' + DAY_NAMES[dow(y)] + ', ' + py.focus + ') was missed. No stress, today counts.');
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
    body += '<h2>Workout <span class="h-note">in this order</span></h2><ul class="list">' +
      mainExercises(p).map((e) => exerciseCard(e, d, false, e.id === nextId)).join('') + '</ul>';
    body += '<h2>Bonus <span class="h-note">if your body allows today</span></h2>' +
      '<ul class="list">' + bonusExercises(p).map((e) => exerciseCard(e, d, true, false)).join('') + '</ul>';
    body += '<h2>Cardio</h2><ul class="list">' + simpleCard('done', 'cardio', !!d.done.cardio, p.cardio.name, p.cardio.detail, p.cardio) + '</ul>';
  }

  const steps = d.steps || '';
  body += '<h2>Daily habits</h2><div class="card stepscard"><div class="steps-top"><label class="name" for="steps-in">Steps today</label>' +
    '<label class="kg big"><input type="number" inputmode="numeric" min="0" max="100000" step="100" id="steps-in" data-steps="1" value="' + esc(steps) + '" placeholder="0"><span>steps</span></label></div>' +
    '<div class="bar"><span id="steps-bar" style="width:' + stepsPct(steps) + '%"></span></div><div class="tip" id="steps-note">' + stepsNote(steps) + '</div></div>';
  body += '<ul class="list compact">' + HABITS.map((h) => simpleCard('habit', h.id, !!d.habits[h.id], h.name)).join('') + '</ul>';

  const mealsDone = MEALS.filter((m) => d.meals[m.id]).length;
  body += '<details class="diet"' + (S.settings.dietOpen ? ' open' : '') + '><summary data-action="diet-toggle"><span>Diet plan <span class="h-note">optional, veg ghar ka khana</span></span><span class="muted">' + mealsDone + '/' + MEALS.length + '</span></summary>' +
    '<ul class="list compact">' + MEALS.map((m) => simpleCard('meal', m.id, !!d.meals[m.id], m.name, m.detail)).join('') + '</ul></details>';

  body += '<h2>Notes</h2><textarea data-note="1" rows="3" placeholder="How did it feel? Any pain? New weights?" aria-label="Notes">' + esc(d.note || '') + '</textarea>';
  if (k !== today) body += '<button type="button" class="ghost wide" data-action="pick" data-k="' + today + '">Back to today</button>';

  return weekStrip(k) + (k === today ? notifyPrompt() + reminderHtml() : '') + hero(k) + body;
}

/* ---------- Report ---------- */
function renderReport() {
  const r = reportData(ui.reportWs);
  const thisWeek = ui.reportWs === weekStartOf(todayKey());
  const tiles = [
    ['Workout days', r.trained + '/' + r.trainDays, (thisWeek ? 'this week so far, ' : 'this week, ') + r.fullDays + ' fully done'],
    ['In ' + r.month.name, r.month.worked, 'of ' + r.month.planned + ' training days so far'],
    ['Total', r.totalDays, 'workout days ever'],
    ['Streak', r.streak, 'days in a row, Sundays skipped'],
    ['Best streak', r.best.days, r.best.days ? fmt(r.best.from) + (r.best.from !== r.best.to ? ' to ' + fmt(r.best.to) : '') : 'starts with your first workout'],
    ['Workout score', r.score + '%', r.done + ' of ' + r.total + ' items, ' + r.sets + ' sets'],
    ['Steps a day', num(r.stepsAvg), num(STEP_GOAL) + ' goal hit ' + r.stepsGoal + ' days'],
    ['Habits', r.habitsPct + '%', 'water, steps, sleep, no junk']
  ].map((t) => '<div class="tile"><div class="tl">' + t[0] + '</div><div class="tv">' + t[1] + '</div><div class="ts">' + t[2] + '</div></div>').join('');

  const rows = r.rows.map((row) => '<tr><td><b>' + DAY_SHORT[dow(row.k)] + '</b> ' + fmt(row.k) + '</td><td>' + esc(row.p.short) + '</td>' +
    '<td class="num">' + row.st.done + '/' + row.st.total + '</td><td class="num">' + (row.st.steps ? num(row.st.steps) : '-') + '</td>' +
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
  const saveBtns = '<button type="button" class="primary" data-action="pdf-report">Download PDF</button>' +
    '<button type="button" class="ghost" data-action="doc-report">Download Word</button>';

  return '<div class="weeknav rep"><button type="button" class="arrow" data-action="rweek" data-n="-7" aria-label="Previous week">&#8249;</button>' +
    '<div class="rtitle"><div class="eyebrow">Weekly report</div><h1>' + fmt(r.ws) + ' to ' + fmt(r.we) + '</h1></div>' +
    '<button type="button" class="arrow" data-action="rweek" data-n="7" aria-label="Next week">&#8250;</button></div>' +
    '<p class="verdict">' + esc(r.verdict) + '</p>' +
    '<div class="saverow">' + saveBtns + '<button type="button" class="ghost" data-action="copy-report">Copy text</button></div>' +
    '<div class="tiles">' + tiles + '</div>' +
    '<h2>Day by day</h2><div class="tablewrap"><table><thead><tr><th>Day</th><th>Focus</th><th class="num">Items</th><th class="num">Steps</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '<h2>Missed</h2>' + missed + todo +
    '<h2>Weights</h2>' + weights +
    '<h2>Body weight</h2><div class="weigh"><label class="kg big"><input type="number" inputmode="decimal" min="30" max="250" step="0.1" id="bodykg" value="' + esc(bodyNow) + '" placeholder="111" aria-label="Body weight"><span>kg today</span></label>' +
    '<button type="button" class="primary" data-action="save-body">Save</button></div>' + bodyList + bodyChange +
    '<div class="actions">' + saveBtns + '</div>';
}

/* ---------- Plan ---------- */
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
  return '<h2>What the tags mean</h2><ul class="legend">' + Object.keys(GOALS).map((k) =>
    '<li><span class="goal g-' + k + '">' + esc(GOALS[k].label) + '</span><span>' + esc(GOALS[k].why) + '</span></li>').join('') + '</ul>' +
    '<p class="muted small">Losing weight: every lift counts, not just cardio. Lifting keeps your muscle while the diet and steps burn fat, so the weight you lose is fat.</p>';
}

function watchList() {
  const seen = {};
  return Object.values(WORKOUTS).map((p) => {
    if (p.rest) return '';
    const items = p.exercises.filter((e) => { if (seen[e.id] || !e.video) return false; seen[e.id] = 1; return true; });
    if (!items.length) return '';
    return '<h3>' + esc(p.focus) + '</h3><ul class="watchlist">' + items.map((e) =>
      '<li><a href="' + esc(e.video) + '" target="_blank" rel="noopener">' + esc(e.name) + ' <span aria-hidden="true">&#8599;</span></a><span class="muted">' + esc(e.machine) + '</span></li>').join('') + '</ul>';
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
    '<h2>Workouts</h2>' + workoutList() + goalLegend() +
    notifySection() +
    '<h2>Watch list</h2><p class="muted">How to do each exercise. Opens YouTube.</p>' + watchList() +
    '<h2>Rules</h2><ul class="plain"><li>Last 1 to 2 reps hard, form clean. Never to failure for now.</li>' +
    '<li>Hit the top reps on every set, then add the smallest weight jump next time.</li>' +
    '<li>Never lock knees on leg press. Keep your back flat on every row and pulldown.</li>' +
    '<li>Every 6 to 8 weeks, one easy week at half the sets.</li></ul>' +
    dataSection();
}
