/* Weekly report: numbers, plain text, Word (.doc) and PDF downloads. */
import { S } from './store.js';
import { planFor, dayRead, dayStats, dayStatus, counts, streak, bestStreak, monthStats, totalWorkoutDays, workedOut, EX_NAMES, STATUS_LABEL, STEP_GOAL, bodyStats, deadlineText, sessionMinutes, penaltyWeek } from './plan.js';
import { esc, fmt, fromKey, addDays, todayKey, weekDays, dow, num, download, toast, DAY_NAMES, DAY_SHORT } from './util.js';

const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

function bestWeights(ws) {
  let out = {};
  weekDays(ws).forEach(function (k) {
    let kg = dayRead(k).kg;
    Object.keys(kg).forEach(function (id) {
      let v = parseFloat(kg[id]);
      if (!isNaN(v) && v > 0 && (out[id] == null || v > out[id])) out[id] = v;
    });
  });
  return out;
}

export function reportData(ws) {
  let today = todayKey();
  let days = weekDays(ws);
  let total = 0, done = 0, sets = 0, bonus = 0, habitsDone = 0, habitsTotal = 0, mealsDone = 0, mealsTotal = 0;
  let trained = 0, fullDays = 0, trainDays = 0, stepsTotal = 0, stepsDays = 0, stepsGoal = 0;
  let rows = [], missed = [], todo = [];
  days.forEach(function (k) {
    let p = planFor(k), st = dayStats(k), future = k > today;
    rows.push({ k: k, p: p, st: st, status: dayStatus(k) });
    sets += st.sets; bonus += st.bonusDone;
    if (future || (!counts(k) && k !== today)) return;
    habitsDone += st.habitsDone; habitsTotal += st.habitsTotal;
    mealsDone += st.mealsDone; mealsTotal += st.mealsTotal;
    if (st.steps > 0) { stepsTotal += st.steps; stepsDays++; if (st.steps >= STEP_GOAL) stepsGoal++; }
    if (p.rest) return;
    let w = workedOut(k);
    // Today joins the count once you train, so an unstarted today is not counted as missed.
    if (k < today || w) { trainDays++; total += st.total; done += st.done; }
    if (w) trained++;
    if (st.pct === 100) fullDays++;
    if (st.missed.length) (k === today ? todo : missed).push({ k: k, items: st.missed });
  });
  let thisW = bestWeights(ws), lastW = bestWeights(addDays(ws, -7));
  let weights = Object.keys(thisW).map(function (id) {
    return { id: id, name: EX_NAMES[id] || id, now: thisW[id], last: lastW[id] };
  }).sort(function (a, b) { return a.name.localeCompare(b.name); });
  let body = Object.keys(S.body).filter(function (k) { return k >= ws && k <= addDays(ws, 6); }).sort()
    .map(function (k) { return { k: k, kg: S.body[k] }; });
  let prevBody = Object.keys(S.body).filter(function (k) { return k < ws; }).sort();
  let lastBody = prevBody.length ? S.body[prevBody[prevBody.length - 1]] : null;
  let score = total ? Math.round(done / total * 100) : 0;
  let asOf = addDays(ws, 6) < today ? addDays(ws, 6) : today;
  let verdict;
  let inProgress = addDays(ws, 6) >= today;
  if (!trainDays) verdict = inProgress ? 'New week. Today is ' + planFor(today).focus + '.' : 'No workouts logged this week.';
  else if (inProgress) verdict = 'Week in progress: ' + trained + ' of ' + trainDays + ' training days done so far. Keep going.';
  else if (score >= 90) verdict = 'Strong week. Where you hit the top reps on every set, add a little weight next week.';
  else if (score >= 70) verdict = 'Good week. Close the gaps listed under missed and you are on track.';
  else if (score >= 40) verdict = 'About half done. Pick the days you missed most and block that time next week.';
  else verdict = 'Rough week. Restart Monday with just the main exercises, no bonus, and build back up.';
  return {
    ws: ws, we: addDays(ws, 6), rows: rows, missed: missed, todo: todo, score: score,
    total: total, done: done, trained: trained, fullDays: fullDays, trainDays: trainDays, sets: sets, bonus: bonus,
    asOf: asOf, month: monthStats(asOf), best: bestStreak(asOf), totalDays: totalWorkoutDays(), bodyStats: bodyStats(asOf), penalty: penaltyWeek(ws),
    habitsPct: habitsTotal ? Math.round(habitsDone / habitsTotal * 100) : 0,
    mealsPct: mealsTotal ? Math.round(mealsDone / mealsTotal * 100) : 0,
    stepsTotal: stepsTotal, stepsDays: stepsDays, stepsGoal: stepsGoal,
    stepsAvg: stepsDays ? Math.round(stepsTotal / stepsDays) : 0,
    weights: weights, body: body, lastBody: lastBody, verdict: verdict, streak: streak(asOf)
  };
}

export function reportText(r) {
  let L = [];
  L.push('GYM REPORT: ' + fmt(r.ws) + ' to ' + fmt(r.we));
  L.push('');
  L.push('Workout score: ' + r.score + '% (' + r.done + ' of ' + r.total + ' items)');
  L.push('Workout days this week: ' + r.trained + ' of ' + r.trainDays + ' (' + r.fullDays + ' fully finished)');
  L.push('Workout days in ' + r.month.name + ': ' + r.month.worked + ' of ' + r.month.planned + ' training days so far');
  L.push('Total workout days: ' + r.totalDays);
  L.push('Sets ticked: ' + r.sets + ', bonus exercises: ' + r.bonus);
  L.push('Steps: ' + num(r.stepsTotal) + ' total, ' + num(r.stepsAvg) + ' a day on average, ' + num(STEP_GOAL) + ' goal hit on ' + r.stepsGoal + ' days');
  L.push('Habits: ' + r.habitsPct + '%, diet on plan: ' + r.mealsPct + '%');
  L.push('Streak: ' + r.streak + ' workout days in a row (Sundays skipped)');
  L.push('Best streak: ' + bestLabel(r.best));
  L.push('');
  L.push('DAY BY DAY');
  r.rows.forEach(function (row) {
    L.push('- ' + DAY_SHORT[dow(row.k)] + ' ' + fmt(row.k) + ' (' + row.p.short + '): ' +
      STATUS_LABEL[row.status] + (row.p.rest ? '' : ', ' + row.st.done + '/' + row.st.total) + (row.st.steps ? ', ' + num(row.st.steps) + ' steps' : ''));
  });
  if (r.missed.length) {
    L.push(''); L.push('MISSED');
    r.missed.forEach(function (m) { L.push('- ' + DAY_SHORT[dow(m.k)] + ': ' + m.items.join(', ')); });
  }
  if (r.weights.length) {
    L.push(''); L.push('WEIGHTS (best this week vs last week)');
    r.weights.forEach(function (w) {
      L.push('- ' + w.name + ': ' + w.now + ' kg' + (w.last != null ? ' (last ' + w.last + ' kg)' : ''));
    });
  }
  const dtx = deadlineText(r.bodyStats);
  if (dtx) { L.push(''); L.push('GOAL: ' + dtx.head); L.push(dtx.body); }
  if (r.body.length) {
    L.push(''); L.push('BODY WEIGHT');
    r.body.forEach(function (b) { L.push('- ' + fmt(b.k) + ': ' + b.kg + ' kg'); });
  }
  L.push(''); L.push(r.verdict);
  return L.join('\n');
}


export function bestLabel(b) {
  if (!b.days) return '0 days';
  return b.days + (b.days === 1 ? ' day' : ' days') + ' (' + fmt(b.from) + (b.from !== b.to ? ' to ' + fmt(b.to) : '') + ')';
}

function summaryRows(r) {
  return [
    ['Workout score', r.score + '% (' + r.done + ' of ' + r.total + ' items)'],
    ['Workout days this week', r.trained + ' of ' + r.trainDays + ' (' + r.fullDays + ' fully finished)'],
    ['Workout days in ' + r.month.name, r.month.worked + ' of ' + r.month.planned + ' training days so far'],
    ['Total workout days', String(r.totalDays)],
    ['Streak', r.streak + ' workout days in a row (Sundays skipped)'],
    ['Best streak', bestLabel(r.best)],
    ['Sets ticked', r.sets + ' (bonus exercises: ' + r.bonus + ')'],
    ['Steps', num(r.stepsTotal) + ' total, ' + num(r.stepsAvg) + ' a day, ' + num(STEP_GOAL) + ' hit on ' + r.stepsGoal + ' days'],
    ['Habits', r.habitsPct + '%'],
    ['Diet on plan (optional)', r.mealsPct + '%']
  ];
}
function bodyLine(r) {
  if (!r.body.length) return 'No weigh in this week.';
  let lastB = r.body[r.body.length - 1].kg;
  let s = 'Latest ' + lastB + ' kg on ' + fmt(r.body[r.body.length - 1].k) + '.';
  if (r.lastBody != null) {
    let diff = Math.round((lastB - r.lastBody) * 10) / 10;
    s += diff < 0 ? ' Down ' + Math.abs(diff) + ' kg since the previous weigh in.' : diff > 0 ? ' Up ' + diff + ' kg since the previous weigh in.' : ' Same as the previous weigh in.';
  }
  return s;
}
function weightChange(w) {
  if (w.last == null) return 'new';
  let ch = Math.round((w.now - w.last) * 10) / 10;
  return (ch > 0 ? '+' : '') + ch + ' kg';
}

/* ---------- shared report pieces ---------- */
// Print colours: white page, near-black header, soft violet accent, status tints.
const PC = {
  ink: '#16161a', muted: '#6f6f7a', line: '#e6e6ec', band: '#111114', bandInk: '#ffffff', bandMuted: '#b9b9c4',
  accent: '#7c6cf0', accentSoft: '#efecff', tile: '#f6f6f9', gold: '#b8860b', goldSoft: '#fdf4dc',
  done: '#eeebff', doneBorder: '#7c6cf0', partial: '#fff3da', partialBorder: '#e0a23a',
  missed: '#ffe7ec', missedBorder: '#e0708a', idle: '#f4f4f6', idleBorder: '#d9d9e0', up: '#5b4bd6', down: '#c2476a'
};
const STATUS_FILL = {
  done: [PC.done, PC.doneBorder], partial: [PC.partial, PC.partialBorder], today: [PC.partial, PC.partialBorder],
  missed: [PC.missed, PC.missedBorder]
};
const statusFill = (st) => STATUS_FILL[st] || [PC.idle, PC.idleBorder];
const k1 = (v) => (Math.round(v * 10) / 10).toFixed(1);

function kpis(r) {
  return [
    ['Workout days', r.trained + ' / ' + r.trainDays, r.fullDays + ' fully finished'],
    ['Streak', String(r.streak), 'best ' + (r.best.days || 0) + ' days'],
    [r.month.name, String(r.month.worked), 'workout days'],
    ['Score', r.score + '%', r.done + ' of ' + r.total + ' items']
  ];
}
function kpis2(r) {
  return [
    ['Sets', String(r.sets), r.bonus + ' bonus exercises'],
    ['Steps a day', r.stepsDays ? num(r.stepsAvg) : '-', 'goal hit ' + r.stepsGoal + ' days'],
    ['Habits', r.habitsPct + '%', 'water, sleep, no junk'],
    ['Total', String(r.totalDays), 'workout days ever']
  ];
}
function bodySummary(b) {
  if (!b || b.current == null) return null;
  return {
    rows: [['Start', k1(b.start) + ' kg'], ['Now', k1(b.current) + ' kg'], ['Target', b.target != null ? k1(b.target) + ' kg' : 'not set'],
      [b.lost >= 0 ? 'Lost' : 'Gained', k1(Math.abs(b.lost)) + ' kg']],
    pct: b.pct,
    deadline: deadlineText(b),
    line: b.target != null && b.toGo > 0
      ? k1(b.toGo) + ' kg to go' + (b.rate > 0 ? ', losing ' + k1(b.rate) + ' kg a week' + (b.eta ? ', goal around ' + fmt(b.eta) + ' ' + fromKey(b.eta).getFullYear() : '') : '') + '.'
      : b.target != null ? 'Target reached.' : 'Set a target weight in the app to see progress.'
  };
}
const balLabel = (st) => (st === 'done' ? 'Balance done' : st === 'owed' ? 'Not completed' : 'Balance pending');
function notesOf(r) { return weekDays(r.ws).filter((k) => (dayRead(k).note || '').trim()); }

/* ---------- Word (.doc): styled HTML that Word opens with colours and tables ---------- */
export function docReport(r) {
  const yr = fromKey(r.ws).getFullYear();
  const td = (html, st) => '<td style="' + (st || '') + '">' + html + '</td>';
  const tile = (t, bg) => td('<div style="font-size:8.5pt;color:' + PC.muted + ';text-transform:uppercase;letter-spacing:1px">' + esc(t[0]) + '</div>' +
    '<div style="font-size:22pt;font-weight:bold;color:' + PC.ink + ';margin:2pt 0">' + esc(t[1]) + '</div><div style="font-size:8.5pt;color:' + PC.muted + '">' + esc(t[2]) + '</div>',
    'background:' + (bg || PC.tile) + ';padding:10pt;border:1px solid #ffffff;width:25%;vertical-align:top');
  const h2 = (t) => '<h2 style="font-size:13pt;color:' + PC.ink + ';margin:18pt 0 6pt;border-bottom:2px solid ' + PC.accent + ';padding-bottom:3pt">' + esc(t) + '</h2>';
  let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Gym report</title>' +
    '<style>body{font-family:Calibri,Segoe UI,Arial,sans-serif;color:' + PC.ink + ';font-size:10.5pt}table{border-collapse:collapse;width:100%}' +
    'th{background:' + PC.tile + ';color:' + PC.muted + ';font-size:9pt;text-align:left;padding:5pt 7pt;border-bottom:1px solid ' + PC.line + '}' +
    '.t td{padding:5pt 7pt;border-bottom:1px solid ' + PC.line + ';font-size:10pt}</style></head><body>';
  // header band
  h += '<table><tr>' + td('<div style="font-size:9pt;letter-spacing:2px;color:#b9a8ff">WEEKLY GYM REPORT</div>' +
    '<div style="font-size:24pt;font-weight:bold;color:#ffffff;margin:3pt 0">' + fmt(r.ws) + ' to ' + fmt(r.we) + ' ' + yr + '</div>' +
    '<div style="font-size:11pt;color:' + PC.bandMuted + '">' + esc(r.verdict) + '</div>', 'background:' + PC.band + ';padding:16pt 18pt') + '</tr></table>';
  h += '<br><table><tr>' + kpis(r).map((t, i) => tile(t, i === 1 ? PC.goldSoft : PC.accentSoft)).join('') + '</tr></table>';
  h += '<table><tr>' + kpis2(r).map((t) => tile(t)).join('') + '</tr></table>';
  // week at a glance
  h += h2('Week at a glance') + '<table><tr>' + r.rows.map((row) => {
    const f = statusFill(row.status);
    return td('<div style="font-size:8.5pt;color:' + PC.muted + '">' + DAY_SHORT[dow(row.k)] + ' ' + fmt(row.k) + '</div>' +
      '<div style="font-size:11pt;font-weight:bold;margin:2pt 0">' + esc(row.p.short) + '</div>' +
      '<div style="font-size:9pt">' + (row.p.rest ? 'Rest' : row.st.done + '/' + row.st.total) + '</div>' +
      '<div style="font-size:8.5pt;color:' + f[1] + ';font-weight:bold">' + esc(STATUS_LABEL[row.status] || '') + '</div>',
      'background:' + f[0] + ';border-top:3px solid ' + f[1] + ';padding:6pt;width:14%;vertical-align:top;border-left:2px solid #ffffff');
  }).join('') + '</tr></table>';
  // body weight
  const bs = bodySummary(r.bodyStats);
  if (bs) {
    h += h2('Body weight') + '<table><tr>' + bs.rows.map((x, i) => td('<div style="font-size:8.5pt;color:' + PC.muted + '">' + x[0] + '</div><div style="font-size:15pt;font-weight:bold">' + x[1] + '</div>',
      'background:' + (i === 3 ? PC.accentSoft : PC.tile) + ';padding:8pt;width:25%;border:1px solid #ffffff')).join('') + '</tr></table>';
    if (bs.pct != null) h += '<table style="margin-top:6pt"><tr>' + td('', 'background:' + PC.accent + ';height:8pt;width:' + Math.max(1, bs.pct) + '%') + td('', 'background:' + PC.line + ';height:8pt') + '</tr></table>' +
      '<p style="color:' + PC.muted + ';font-size:9.5pt;margin:4pt 0">' + bs.pct + '% of the way. ' + esc(bs.line) + '</p>';
    else h += '<p style="color:' + PC.muted + '">' + esc(bs.line) + '</p>';
    if (bs.deadline) {
      const dc = bs.deadline.status === 'unsafe' ? [PC.missed, PC.down] : bs.deadline.status === 'behind' ? [PC.partial, PC.partialBorder] : [PC.accentSoft, PC.accent];
      h += '<table style="margin-top:6pt"><tr>' + td('<div style="font-weight:bold;font-size:11pt;color:' + dc[1] + '">' + esc(bs.deadline.head) + '</div><div style="font-size:10pt;margin-top:2pt">' + esc(bs.deadline.body) + '</div>', 'background:' + dc[0] + ';padding:8pt 10pt;border-left:4px solid ' + dc[1]) + '</tr></table>';
    }
  }
  // weights
  h += h2('Lifting weights') + (r.weights.length ? '<table class="t"><tr><th>Exercise</th><th>This week</th><th>Last week</th><th>Change</th></tr>' + r.weights.map((w, i) => {
    const ch = weightChange(w), col = w.last == null ? PC.muted : w.now > w.last ? PC.up : w.now < w.last ? PC.down : PC.muted;
    return '<tr' + (i % 2 ? ' style="background:#fafafc"' : '') + '><td>' + esc(w.name) + '</td><td><b>' + w.now + ' kg</b></td><td>' + (w.last != null ? w.last + ' kg' : '-') + '</td><td style="color:' + col + ';font-weight:bold">' + ch + '</td></tr>';
  }).join('') + '</table>' : '<p style="color:' + PC.muted + '">No weights logged this week.</p>');
  // junk food
  h += h2('Junk food') + (r.penalty.items.length
    ? '<table><tr>' + [['Penalty', r.penalty.points + ' pts'], ['Earned back', r.penalty.back + ' pts'], ['Still owed', r.penalty.net + ' pts'], ['Extra kcal', num(r.penalty.kcal)]].map((x, i) =>
        td('<div style="font-size:8.5pt;color:' + PC.muted + '">' + x[0] + '</div><div style="font-size:15pt;font-weight:bold;color:' + (i === 2 && r.penalty.net > 0 ? PC.down : PC.ink) + '">' + x[1] + '</div>', 'background:' + (i === 2 && r.penalty.net > 0 ? PC.missed : PC.tile) + ';padding:8pt;width:25%;border:1px solid #ffffff')).join('') + '</tr></table>' +
      '<table class="t"><tr><th>Day</th><th>Food</th><th>kcal</th><th>Points</th><th>Back</th><th>Balance</th></tr>' + r.penalty.items.map((t) => '<tr><td>' + DAY_SHORT[dow(t.k)] + ' ' + fmt(t.k) + '</td><td>' + esc(t.name) + '</td><td>' + num(t.kcal) + '</td><td>' + t.points + '</td><td>' + t.earned + '</td><td style="font-weight:bold;color:' + (t.status === 'done' ? PC.up : t.status === 'owed' ? PC.down : PC.muted) + '">' + balLabel(t.status) + '</td></tr>').join('') + '</table>'
    : '<p style="color:' + PC.muted + '">Clean week. No junk food logged.</p>');
  // missed
  h += h2('Missed') + (r.missed.length ? r.missed.map((m) => '<p style="margin:3pt 0"><span style="background:' + PC.missed + ';color:' + PC.down + ';font-weight:bold;padding:1pt 6pt">' + DAY_SHORT[dow(m.k)] + '</span> ' + esc(m.items.join(', ')) + '</p>').join('') : '<p style="color:' + PC.muted + '">Nothing missed. Clean week.</p>');
  const notes = notesOf(r);
  if (notes.length) h += h2('Notes') + notes.map((k) => '<p style="margin:4pt 0;padding:6pt 8pt;background:' + PC.tile + ';border-left:3px solid ' + PC.accent + '"><b>' + DAY_SHORT[dow(k)] + ' ' + fmt(k) + ':</b> ' + esc(dayRead(k).note) + '</p>').join('');
  h += '<p style="color:' + PC.muted + ';font-size:8.5pt;margin-top:18pt">Made with Gym log on ' + fmt(todayKey()) + '.</p></body></html>';
  download('gym-report-' + r.ws + '.doc', '﻿' + h, 'application/msword');
}

let pdfLoading = null;
function loadJsPdf() {
  if (window.jspdf) return Promise.resolve();
  if (pdfLoading) return pdfLoading;
  pdfLoading = new Promise(function (res, rej) {
    let sc = document.createElement('script');
    sc.src = JSPDF_URL; sc.onload = res; sc.onerror = function () { pdfLoading = null; rej(); };
    document.head.appendChild(sc);
  });
  return pdfLoading;
}

export function pdfReport(r) {
  toast('Making PDF...');
  loadJsPdf().then(function () {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 40, CW = W - 2 * M;
    let y = 0;
    const font = (size, style, color) => { doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(color || PC.ink); };
    const need = (h) => { if (y + h > H - 50) { doc.addPage(); y = M; } };
    const heading = (t) => {
      y += 18; need(40);
      font(12.5, 'bold'); doc.text(t, M, y + 12);
      doc.setFillColor(PC.accent); doc.rect(M, y + 18, 26, 2.5, 'F');
      y += 30;
    };
    const tile = (x, w, h, t, fill, big) => {
      doc.setFillColor(fill || PC.tile); doc.roundedRect(x, y, w, h, 8, 8, 'F');
      font(7.5, 'bold', PC.muted); doc.text(String(t[0]).toUpperCase(), x + 12, y + 18);
      font(big || 22, 'bold', PC.ink); doc.text(String(t[1]), x + 12, y + 18 + (big || 22) + 2);
      font(8, 'normal', PC.muted); doc.text(doc.splitTextToSize(String(t[2]), w - 24)[0] || '', x + 12, y + h - 12);
    };

    // Header band
    doc.setFillColor(PC.band); doc.rect(0, 0, W, 128, 'F');
    doc.setFillColor('#2a2540'); doc.circle(W - 40, 10, 90, 'F');
    doc.setFillColor('#1c1a2b'); doc.circle(W - 120, 120, 60, 'F');
    font(8.5, 'bold', '#b9a8ff'); doc.text('WEEKLY GYM REPORT', M, 40);
    font(24, 'bold', PC.bandInk); doc.text(fmt(r.ws) + ' to ' + fmt(r.we) + ' ' + fromKey(r.ws).getFullYear(), M, 70);
    font(10.5, 'normal', PC.bandMuted);
    doc.splitTextToSize(r.verdict, CW - 40).slice(0, 2).forEach((l, i) => doc.text(l, M, 94 + i * 14));
    y = 148;

    // KPI tiles
    const tw = (CW - 3 * 10) / 4;
    kpis(r).forEach((t, i) => tile(M + i * (tw + 10), tw, 78, t, i === 1 ? PC.goldSoft : PC.accentSoft));
    y += 88;
    kpis2(r).forEach((t, i) => tile(M + i * (tw + 10), tw, 62, t, PC.tile, 16));
    y += 62;

    // Week at a glance
    heading('Week at a glance');
    const dw = (CW - 6 * 6) / 7;
    r.rows.forEach((row, i) => {
      const x = M + i * (dw + 6), f = statusFill(row.status);
      doc.setFillColor(f[0]); doc.roundedRect(x, y, dw, 74, 7, 7, 'F');
      doc.setFillColor(f[1]); doc.rect(x + 8, y, dw - 16, 3, 'F');
      font(7.5, 'bold', PC.muted); doc.text(DAY_SHORT[dow(row.k)].toUpperCase() + ' ' + fromKey(row.k).getDate(), x + 8, y + 18);
      font(10.5, 'bold', PC.ink); doc.text(row.p.short, x + 8, y + 34);
      font(9, 'normal', PC.ink); doc.text(row.p.rest ? 'Rest' : row.st.done + ' / ' + row.st.total, x + 8, y + 49);
      font(7.5, 'bold', f[1]); doc.text((STATUS_LABEL[row.status] || '').toUpperCase(), x + 8, y + 64);
    });
    y += 74;

    // Body weight
    const bs = bodySummary(r.bodyStats), b = r.bodyStats;
    if (bs) {
      heading('Body weight');
      const bw = (CW - 3 * 8) / 4;
      bs.rows.forEach((x, i) => {
        doc.setFillColor(i === 3 ? PC.accentSoft : PC.tile); doc.roundedRect(M + i * (bw + 8), y, bw, 46, 7, 7, 'F');
        font(7.5, 'bold', PC.muted); doc.text(x[0].toUpperCase(), M + i * (bw + 8) + 10, y + 16);
        font(14, 'bold', PC.ink); doc.text(x[1], M + i * (bw + 8) + 10, y + 36);
      });
      y += 56;
      if (bs.pct != null) {
        doc.setFillColor(PC.line); doc.roundedRect(M, y, CW, 7, 3.5, 3.5, 'F');
        doc.setFillColor(PC.accent); doc.roundedRect(M, y, Math.max(7, CW * bs.pct / 100), 7, 3.5, 3.5, 'F');
        y += 18;
      }
      font(9.5, 'normal', PC.muted); doc.text(doc.splitTextToSize((bs.pct != null ? bs.pct + '% of the way. ' : '') + bs.line, CW), M, y + 4); y += 14;
      if (bs.deadline) {
        const dc = bs.deadline.status === 'unsafe' ? [PC.missed, PC.down] : bs.deadline.status === 'behind' ? [PC.partial, PC.partialBorder] : [PC.accentSoft, PC.accent];
        const lines = doc.splitTextToSize(bs.deadline.body, CW - 24);
        const hh = 24 + lines.length * 12;
        need(hh + 6); y += 4;
        doc.setFillColor(dc[0]); doc.roundedRect(M, y, CW, hh, 6, 6, 'F'); doc.setFillColor(dc[1]); doc.rect(M, y, 3.5, hh, 'F');
        font(10, 'bold', dc[1]); doc.text(bs.deadline.head, M + 12, y + 15);
        font(9, 'normal', PC.ink); lines.forEach((l, i) => doc.text(l, M + 12, y + 28 + i * 12));
        y += hh + 4;
      }
      // trend chart
      const pts = b.entries.slice(-16);
      if (pts.length >= 2) {
        need(120); y += 6;
        const ch = 96, vals = pts.map((p) => p.kg).concat(b.target != null ? [b.target] : []);
        const lo = Math.min.apply(null, vals) - 1, hi = Math.max.apply(null, vals) + 1;
        const X = (i) => M + 34 + i * (CW - 44) / (pts.length - 1), Y = (v) => y + 6 + (hi - v) / (hi - lo) * (ch - 20);
        doc.setFillColor('#fbfbfd'); doc.roundedRect(M, y, CW, ch, 8, 8, 'F');
        font(7.5, 'normal', PC.muted); doc.text(k1(hi - 1), M + 6, Y(hi - 1) + 3); doc.text(k1(lo + 1), M + 6, Y(lo + 1) + 3);
        if (b.target != null) {
          doc.setDrawColor('#b3a8f0'); doc.setLineDashPattern([3, 3], 0); doc.setLineWidth(1);
          doc.line(M + 34, Y(b.target), W - M - 10, Y(b.target)); doc.setLineDashPattern([], 0);
          font(7.5, 'bold', PC.accent); doc.text('goal ' + k1(b.target), W - M - 10, Y(b.target) - 4, { align: 'right' });
        }
        doc.setDrawColor(PC.accent); doc.setLineWidth(2);
        for (let i = 1; i < pts.length; i++) doc.line(X(i - 1), Y(pts[i - 1].kg), X(i), Y(pts[i].kg));
        pts.forEach((p, i) => { doc.setFillColor(i === pts.length - 1 ? PC.accent : '#ffffff'); doc.setDrawColor(PC.accent); doc.setLineWidth(1.2); doc.circle(X(i), Y(p.kg), i === pts.length - 1 ? 3.5 : 2.5, 'FD'); });
        font(7.5, 'normal', PC.muted); doc.text(fmt(pts[0].k), M + 34, y + ch - 5); doc.text(fmt(pts[pts.length - 1].k), W - M - 10, y + ch - 5, { align: 'right' });
        y += ch;
      }
    }

    // Lifting weights table
    heading('Lifting weights');
    if (r.weights.length) {
      const cols = [{ l: 'Exercise', w: CW - 240 }, { l: 'This week', w: 80, r: 1 }, { l: 'Last week', w: 80, r: 1 }, { l: 'Change', w: 80, r: 1 }];
      const row = (vals, opts) => {
        need(22); let x = M;
        if (opts.fill) { doc.setFillColor(opts.fill); doc.rect(M, y, CW, 22, 'F'); }
        vals.forEach((v, i) => {
          const c = cols[i];
          font(opts.head ? 7.5 : 9.5, opts.head || i === 1 ? 'bold' : 'normal', opts.head ? PC.muted : (i === 3 ? opts.chColor : PC.ink));
          const s = doc.splitTextToSize(String(v), c.w - 12)[0] || '';
          if (c.r) doc.text(s, x + c.w - 8, y + 15, { align: 'right' }); else doc.text(s, x + 8, y + 15);
          x += c.w;
        });
        y += 22;
      };
      row(cols.map((c) => c.l.toUpperCase()), { head: true, fill: PC.tile });
      r.weights.forEach((w, i) => row([w.name, w.now + ' kg', w.last != null ? w.last + ' kg' : '-', weightChange(w)],
        { fill: i % 2 ? '#fafafc' : null, chColor: w.last == null ? PC.muted : w.now > w.last ? PC.up : w.now < w.last ? PC.down : PC.muted }));
    } else { font(9.5, 'normal', PC.muted); doc.text('No weights logged this week.', M, y + 4); y += 12; }

    // Junk food
    heading('Junk food');
    const pen = r.penalty;
    if (pen.items.length) {
      const pw = (CW - 3 * 8) / 4;
      [['Penalty', pen.points + ' pts'], ['Earned back', pen.back + ' pts'], ['Still owed', pen.net + ' pts'], ['Extra kcal', num(pen.kcal)]].forEach((x, i) => {
        const owe = i === 2 && pen.net > 0;
        doc.setFillColor(owe ? PC.missed : PC.tile); doc.roundedRect(M + i * (pw + 8), y, pw, 46, 7, 7, 'F');
        font(7.5, 'bold', PC.muted); doc.text(x[0].toUpperCase(), M + i * (pw + 8) + 10, y + 16);
        font(14, 'bold', owe ? PC.down : PC.ink); doc.text(x[1], M + i * (pw + 8) + 10, y + 36);
      });
      y += 56;
      pen.items.forEach((t) => {
        need(18); font(9.5, 'normal', PC.ink);
        doc.text(DAY_SHORT[dow(t.k)] + ' ' + fmt(t.k) + '   ' + t.name, M, y + 10);
        font(9, 'normal', PC.muted); doc.text(num(t.kcal) + ' kcal, ' + t.points + ' pts, ' + t.earned + ' back', W - M - 110, y + 10, { align: 'right' });
        font(8.5, 'bold', t.status === 'done' ? PC.up : t.status === 'owed' ? PC.down : PC.muted); doc.text(balLabel(t.status), W - M, y + 10, { align: 'right' });
        y += 16;
      });
    } else { font(9.5, 'normal', PC.muted); doc.text('Clean week. No junk food logged.', M, y + 4); y += 12; }

    // Missed
    heading('Missed');
    if (r.missed.length) {
      r.missed.forEach((m) => {
        const lines = doc.splitTextToSize(m.items.join(', '), CW - 58);
        need(lines.length * 13 + 8);
        doc.setFillColor(PC.missed); doc.roundedRect(M, y - 1, 44, 16, 4, 4, 'F');
        font(8, 'bold', PC.down); doc.text(DAY_SHORT[dow(m.k)].toUpperCase(), M + 22, y + 10, { align: 'center' });
        font(9.5, 'normal', PC.ink); lines.forEach((l, i) => doc.text(l, M + 54, y + 10 + i * 13));
        y += lines.length * 13 + 8;
      });
    } else { font(9.5, 'normal', PC.muted); doc.text('Nothing missed. Clean week.', M, y + 4); y += 12; }

    // Notes
    const notes = notesOf(r);
    if (notes.length) {
      heading('Notes');
      notes.forEach((k) => {
        const lines = doc.splitTextToSize(DAY_SHORT[dow(k)] + ' ' + fmt(k) + ':  ' + dayRead(k).note, CW - 24);
        need(lines.length * 13 + 14);
        doc.setFillColor(PC.tile); doc.rect(M, y, CW, lines.length * 13 + 10, 'F');
        doc.setFillColor(PC.accent); doc.rect(M, y, 3, lines.length * 13 + 10, 'F');
        font(9.5, 'normal', PC.ink); lines.forEach((l, i) => doc.text(l, M + 12, y + 15 + i * 13));
        y += lines.length * 13 + 16;
      });
    }

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i); font(8, 'normal', PC.muted);
      doc.text('Gym log  |  ' + fmt(r.ws) + ' to ' + fmt(r.we), M, H - 22);
      doc.text('Page ' + i + ' of ' + pages, W - M, H - 22, { align: 'right' });
    }
    doc.save('gym-report-' + r.ws + '.pdf');
    toast('PDF downloaded.');
  }).catch(function () { toast('Could not load the PDF maker. Check internet, or use Word.'); });
}
