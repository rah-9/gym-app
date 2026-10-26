/* Weekly report: numbers, plain text, Word (.doc) and PDF downloads. */
import { S } from './store.js';
import { planFor, dayRead, dayStats, dayStatus, counts, streak, bestStreak, monthStats, totalWorkoutDays, workedOut, EX_NAMES, STATUS_LABEL, STEP_GOAL } from './plan.js';
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
  if (!trainDays) verdict = 'The week has not started yet. Monday is ' + planFor(ws).focus + '.';
  else if (score >= 90) verdict = 'Strong week. Where you hit the top reps on every set, add a little weight next week.';
  else if (score >= 70) verdict = 'Good week. Close the gaps listed under missed and you are on track.';
  else if (score >= 40) verdict = 'About half done. Pick the days you missed most and block that time next week.';
  else verdict = 'Rough week. Restart Monday with just the main exercises, no bonus, and build back up.';
  return {
    ws: ws, we: addDays(ws, 6), rows: rows, missed: missed, todo: todo, score: score,
    total: total, done: done, trained: trained, fullDays: fullDays, trainDays: trainDays, sets: sets, bonus: bonus,
    asOf: asOf, month: monthStats(asOf), best: bestStreak(asOf), totalDays: totalWorkoutDays(),
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

export function docReport(r) {
  let yr = fromKey(r.ws).getFullYear();
  let cell = function (v) { return '<td>' + esc(v) + '</td>'; };
  let h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Gym report</title>' +
    '<style>body{font-family:Calibri,Arial,sans-serif;color:#1f1f1f;font-size:11pt}h1{font-size:22pt;margin:0 0 2pt}h2{font-size:13pt;margin:18pt 0 6pt}' +
    '.sub{color:#6b6f72;margin:0 0 10pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d5d8dc;padding:4pt 6pt;font-size:10.5pt;text-align:left;vertical-align:top}th{background:#f1f3f4}.v{background:#f6f8fc;padding:8pt;border:1px solid #e1e4e8}</style></head><body>';
  h += '<h1>Gym report</h1><p class="sub">' + fmt(r.ws) + ' to ' + fmt(r.we) + ' ' + yr + '</p><p class="v">' + esc(r.verdict) + '</p>';
  h += '<h2>Summary</h2><table>' + summaryRows(r).map(function (x) { return '<tr><th>' + esc(x[0]) + '</th>' + cell(x[1]) + '</tr>'; }).join('') + '</table>';
  h += '<h2>Day by day</h2><table><tr><th>Day</th><th>Focus</th><th>Items</th><th>Steps</th><th>Status</th></tr>' + r.rows.map(function (row) {
    return '<tr>' + cell(DAY_SHORT[dow(row.k)] + ' ' + fmt(row.k)) + cell(row.p.focus) + cell(row.st.done + '/' + row.st.total) + cell(row.st.steps ? num(row.st.steps) : '-') + cell(STATUS_LABEL[row.status]) + '</tr>';
  }).join('') + '</table>';
  h += '<h2>Missed</h2>' + (r.missed.length ? '<ul>' + r.missed.map(function (m) { return '<li><b>' + DAY_NAMES[dow(m.k)] + ':</b> ' + esc(m.items.join(', ')) + '</li>'; }).join('') + '</ul>' : '<p>Nothing missed.</p>');
  h += '<h2>Weights</h2>' + (r.weights.length ? '<table><tr><th>Exercise</th><th>This week</th><th>Last week</th><th>Change</th></tr>' + r.weights.map(function (w) {
    return '<tr>' + cell(w.name) + cell(w.now + ' kg') + cell(w.last != null ? w.last + ' kg' : '-') + cell(weightChange(w)) + '</tr>';
  }).join('') + '</table>' : '<p>No weights logged.</p>');
  h += '<h2>Body weight</h2><p>' + esc(bodyLine(r)) + '</p>';
  let notes = weekDays(r.ws).filter(function (k) { return (dayRead(k).note || '').trim(); });
  if (notes.length) h += '<h2>Notes</h2><ul>' + notes.map(function (k) { return '<li><b>' + DAY_SHORT[dow(k)] + ':</b> ' + esc(dayRead(k).note) + '</li>'; }).join('') + '</ul>';
  h += '</body></html>';
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
    let doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    let W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48, y = M, CW = W - 2 * M;
    let INK = '#1f1f1f', MUTED = '#6b6f72', LINE = '#e1e4e8';
    function need(h) { if (y + h > H - M) { doc.addPage(); y = M; } }
    function text(t, size, style, color) {
      doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(color || INK);
      doc.splitTextToSize(String(t), CW).forEach(function (l) { need(size * 1.45); doc.text(l, M, y + size); y += size * 1.45; });
    }
    function heading(t) { y += 14; need(40); text(t, 13, 'bold'); y += 4; }
    function table(cols, rows) {
      let rh = 20;
      function line() { doc.setDrawColor(LINE); doc.line(M, y, W - M, y); }
      function rowOut(vals, bold, color) {
        need(rh); let x = M;
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 9 : 10); doc.setTextColor(color || INK);
        vals.forEach(function (v, i) {
          let c = cols[i], s = doc.splitTextToSize(String(v), c.w - 8)[0] || '';
          if (c.right) doc.text(s, x + c.w - 4, y + 14, { align: 'right' }); else doc.text(s, x + 4, y + 14);
          x += c.w;
        });
        y += rh; line();
      }
      rowOut(cols.map(function (c) { return c.label; }), true, MUTED);
      rows.forEach(function (r2) { rowOut(r2); });
      y += 6;
    }
    text('Gym report', 22, 'bold');
    text(fmt(r.ws) + ' to ' + fmt(r.we) + ' ' + fromKey(r.ws).getFullYear(), 11, 'normal', MUTED);
    y += 10;
    doc.setFillColor('#f6f8fc');
    let vLines = doc.splitTextToSize(r.verdict, CW - 20);
    doc.roundedRect(M, y, CW, vLines.length * 15 + 16, 6, 6, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(INK);
    vLines.forEach(function (l, i) { doc.text(l, M + 10, y + 20 + i * 15); });
    y += vLines.length * 15 + 16;

    heading('Summary');
    table([{ label: 'Measure', w: 170 }, { label: 'Value', w: CW - 170 }], summaryRows(r));

    heading('Day by day');
    table([{ label: 'Day', w: 100 }, { label: 'Focus', w: 150 }, { label: 'Items', w: 60, right: true }, { label: 'Steps', w: 80, right: true }, { label: 'Status', w: CW - 390 }],
      r.rows.map(function (row) { return [DAY_SHORT[dow(row.k)] + ' ' + fmt(row.k), row.p.focus, row.st.done + '/' + row.st.total, row.st.steps ? num(row.st.steps) : '-', STATUS_LABEL[row.status]]; }));

    heading('Missed');
    if (r.missed.length) r.missed.forEach(function (m) { text(DAY_NAMES[dow(m.k)] + ': ' + m.items.join(', '), 10); y += 3; });
    else text('Nothing missed.', 10, 'normal', MUTED);

    heading('Weights');
    if (r.weights.length) table([{ label: 'Exercise', w: CW - 240 }, { label: 'This week', w: 80, right: true }, { label: 'Last week', w: 80, right: true }, { label: 'Change', w: 80, right: true }],
      r.weights.map(function (w) { return [w.name, w.now + ' kg', w.last != null ? w.last + ' kg' : '-', weightChange(w)]; }));
    else text('No weights logged.', 10, 'normal', MUTED);

    heading('Body weight');
    text(bodyLine(r), 10);

    let notes = weekDays(r.ws).filter(function (k) { return (dayRead(k).note || '').trim(); });
    if (notes.length) { heading('Notes'); notes.forEach(function (k) { text(DAY_SHORT[dow(k)] + ': ' + dayRead(k).note, 10); y += 3; }); }

    doc.save('gym-report-' + r.ws + '.pdf');
    toast('PDF downloaded.');
  }).catch(function () { toast('Could not load the PDF maker. Check internet, or use Word.'); });
}

