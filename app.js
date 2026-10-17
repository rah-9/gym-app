(function () {
  'use strict';

  var G = window.GYM;
  var KEY = 'gymlog.v1';
  var UNLOCK_KEY = 'gymlog.unlock';
  var UNLOCK_MS = 12 * 60 * 60 * 1000; // stay unlocked for 12 hours on this device
  var STEP_GOAL = 10000;
  var JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  var PIN_HASH = 'c87a024f10155ed22b50516e977c904257600e04e3cc3bbf77fa426983346bc2';

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- helpers ---------- */
  function $(sel, el) { return (el || document).querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function keyOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(k, n) { var d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); }
  function todayKey() { return keyOf(new Date()); }
  function weekStartOf(k) { var d = fromKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return keyOf(d); }
  function weekDays(ws) { var out = []; for (var i = 0; i < 7; i++) out.push(addDays(ws, i)); return out; }
  function fmt(k) { var d = fromKey(k); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  function dow(k) { return fromKey(k).getDay(); }
  function programWeek(k) {
    var diff = Math.round((fromKey(k) - fromKey(G.PROGRAM_START)) / 864e5);
    return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
  }
  function planFor(k) { return G.DAYS[dow(k)]; }

  /* ---------- storage ---------- */
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.days) { s.body = s.body || {}; s.settings = s.settings || {}; return s; }
    } catch (e) { /* ignore */ }
    return { days: {}, body: {}, settings: {} };
  }
  var S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { toast('Could not save on this browser. Check private mode.'); }
  }
  var EMPTY = { done: {}, sets: {}, kg: {}, habits: {}, meals: {}, note: '' };
  function dayRead(k) { return S.days[k] || EMPTY; }
  function dayWrite(k) {
    var d = S.days[k];
    if (!d) d = S.days[k] = { done: {}, sets: {}, kg: {}, habits: {}, meals: {}, note: '' };
    ['done', 'sets', 'kg', 'habits', 'meals'].forEach(function (f) { d[f] = d[f] || {}; });
    return d;
  }

  /* ---------- plan logic ---------- */
  function lastKg(k, id) {
    for (var i = 1; i <= 90; i++) {
      var kk = addDays(k, -i), d = S.days[kk];
      if (d && d.kg && d.kg[id]) { var v = parseFloat(d.kg[id]); if (v > 0) return { kg: v, k: kk }; }
    }
    return null;
  }
  function mainExercises(p) { return [G.WARMUP].concat(p.exercises.filter(function (e) { return !e.bonus; })); }
  function bonusExercises(p) { return p.exercises.filter(function (e) { return e.bonus; }); }

  function requiredItems(k) {
    var p = planFor(k);
    if (p.rest) return p.tasks.map(function (t) { return { id: t.id, name: t.name }; });
    var items = mainExercises(p).map(function (e) { return { id: e.id, name: e.name }; });
    items.push({ id: 'cardio', name: 'Cardio: ' + p.cardio.name });
    return items;
  }

  function dayStats(k) {
    var d = dayRead(k), p = planFor(k);
    var req = requiredItems(k);
    var done = 0, missed = [];
    req.forEach(function (it) { if (d.done[it.id]) done++; else missed.push(it.name); });
    var sets = 0;
    Object.keys(d.sets).forEach(function (id) { (d.sets[id] || []).forEach(function (v) { if (v) sets++; }); });
    var bonusDone = 0;
    if (!p.rest) bonusExercises(p).forEach(function (e) { if (d.done[e.id]) bonusDone++; });
    var habitsDone = G.HABITS.filter(function (h) { return d.habits[h.id]; }).length;
    var mealsDone = G.MEALS.filter(function (m) { return d.meals[m.id]; }).length;
    return {
      total: req.length, done: done, pct: req.length ? Math.round(done / req.length * 100) : 0,
      missed: missed, sets: sets, bonusDone: bonusDone,
      habitsDone: habitsDone, habitsTotal: G.HABITS.length,
      mealsDone: mealsDone, mealsTotal: G.MEALS.length,
      steps: parseInt(d.steps, 10) || 0
    };
  }

  // Days before the program start only count if something was ticked on them.
  function counts(k) {
    if (k >= G.PROGRAM_START) return true;
    var d = dayRead(k);
    return Object.keys(d.done).some(function (id) { return d.done[id]; });
  }

  function dayStatus(k) {
    var today = todayKey(), p = planFor(k), st = dayStats(k);
    if (k > today) return 'upcoming';
    if (!counts(k) && k !== today) return 'pre';
    if (p.rest) return st.done > 0 ? 'done' : (k === today ? 'today' : 'rest');
    if (st.pct === 100) return 'done';
    if (k === today) return 'today';
    return st.done > 0 ? 'partial' : 'missed';
  }
  var STATUS_LABEL = { done: 'Done', partial: 'Partial', missed: 'Missed', upcoming: 'Upcoming', today: 'Today', rest: 'Rest', pre: 'Before start' };

  function streak() {
    var k = todayKey(), count = 0;
    for (var i = 0; i < 400; i++) {
      var p = planFor(k);
      if (!counts(k) && k !== todayKey()) break;
      if (!p.rest) {
        var st = dayStats(k);
        if (st.pct === 100) count++;
        else if (k !== todayKey()) break;
      }
      k = addDays(k, -1);
    }
    return count;
  }

  var EX_NAMES = (function () {
    var m = {};
    G.DAYS.forEach(function (p) { if (!p.rest) p.exercises.forEach(function (e) { m[e.id] = e.name; }); });
    return m;
  })();

  function bestWeights(ws) {
    var out = {};
    weekDays(ws).forEach(function (k) {
      var kg = dayRead(k).kg;
      Object.keys(kg).forEach(function (id) {
        var v = parseFloat(kg[id]);
        if (!isNaN(v) && v > 0 && (out[id] == null || v > out[id])) out[id] = v;
      });
    });
    return out;
  }

  function reportData(ws) {
    var today = todayKey();
    var days = weekDays(ws);
    var total = 0, done = 0, sets = 0, bonus = 0, habitsDone = 0, habitsTotal = 0, mealsDone = 0, mealsTotal = 0;
    var trained = 0, trainDays = 0, stepsTotal = 0, stepsDays = 0, stepsGoal = 0;
    var rows = [], missed = [], todo = [];
    days.forEach(function (k) {
      var p = planFor(k), st = dayStats(k), future = k > today;
      rows.push({ k: k, p: p, st: st, status: dayStatus(k) });
      sets += st.sets; bonus += st.bonusDone;
      if (future || (!counts(k) && k !== today)) return;
      habitsDone += st.habitsDone; habitsTotal += st.habitsTotal;
      mealsDone += st.mealsDone; mealsTotal += st.mealsTotal;
      if (st.steps > 0) { stepsTotal += st.steps; stepsDays++; if (st.steps >= STEP_GOAL) stepsGoal++; }
      if (p.rest) return;
      trainDays++;
      total += st.total; done += st.done;
      if (st.done > 0) trained++;
      if (st.missed.length) (k === today ? todo : missed).push({ k: k, items: st.missed });
    });
    var thisW = bestWeights(ws), lastW = bestWeights(addDays(ws, -7));
    var weights = Object.keys(thisW).map(function (id) {
      return { id: id, name: EX_NAMES[id] || id, now: thisW[id], last: lastW[id] };
    }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    var body = Object.keys(S.body).filter(function (k) { return k >= ws && k <= addDays(ws, 6); }).sort()
      .map(function (k) { return { k: k, kg: S.body[k] }; });
    var prevBody = Object.keys(S.body).filter(function (k) { return k < ws; }).sort();
    var lastBody = prevBody.length ? S.body[prevBody[prevBody.length - 1]] : null;
    var score = total ? Math.round(done / total * 100) : 0;
    var verdict;
    if (!trainDays) verdict = 'The week has not started yet. Monday is arms day.';
    else if (score >= 90) verdict = 'Strong week. Where you hit the top reps on every set, add a little weight next week.';
    else if (score >= 70) verdict = 'Good week. Close the gaps listed under missed and you are on track.';
    else if (score >= 40) verdict = 'About half done. Pick the days you missed most and block that time next week.';
    else verdict = 'Rough week. Restart Monday with just the main exercises, no bonus, and build back up.';
    return {
      ws: ws, we: addDays(ws, 6), rows: rows, missed: missed, todo: todo, score: score,
      total: total, done: done, trained: trained, trainDays: trainDays, sets: sets, bonus: bonus,
      habitsPct: habitsTotal ? Math.round(habitsDone / habitsTotal * 100) : 0,
      mealsPct: mealsTotal ? Math.round(mealsDone / mealsTotal * 100) : 0,
      stepsTotal: stepsTotal, stepsDays: stepsDays, stepsGoal: stepsGoal,
      stepsAvg: stepsDays ? Math.round(stepsTotal / stepsDays) : 0,
      weights: weights, body: body, lastBody: lastBody, verdict: verdict, streak: streak()
    };
  }

  function reportText(r) {
    var L = [];
    L.push('GYM REPORT: ' + fmt(r.ws) + ' to ' + fmt(r.we));
    L.push('');
    L.push('Workout score: ' + r.score + '% (' + r.done + ' of ' + r.total + ' items)');
    L.push('Days trained: ' + r.trained + ' of ' + r.trainDays + ' so far');
    L.push('Sets ticked: ' + r.sets + ', bonus exercises: ' + r.bonus);
    L.push('Steps: ' + num(r.stepsTotal) + ' total, ' + num(r.stepsAvg) + ' a day on average, ' + num(STEP_GOAL) + ' goal hit on ' + r.stepsGoal + ' days');
    L.push('Habits: ' + r.habitsPct + '%, diet on plan: ' + r.mealsPct + '%');
    L.push('Current streak: ' + r.streak + ' training days');
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

  function num(n) { return (n || 0).toLocaleString('en-IN'); }
  function stepsPct(v) { return Math.min(100, Math.round((parseInt(v, 10) || 0) / STEP_GOAL * 100)); }
  function stepsNote(v) {
    var n = parseInt(v, 10) || 0;
    if (!n) return 'Goal ' + num(STEP_GOAL) + ' a day. Copy the number from your phone\'s step counter.';
    if (n >= STEP_GOAL) return 'Goal hit. ' + num(n) + ' steps.';
    return num(STEP_GOAL - n) + ' more to reach ' + num(STEP_GOAL) + '.';
  }

  function summaryRows(r) {
    return [
      ['Workout score', r.score + '% (' + r.done + ' of ' + r.total + ' items)'],
      ['Days trained', r.trained + ' of ' + r.trainDays],
      ['Current streak', r.streak + ' full training days'],
      ['Sets ticked', r.sets + ' (bonus exercises: ' + r.bonus + ')'],
      ['Steps', num(r.stepsTotal) + ' total, ' + num(r.stepsAvg) + ' a day, ' + num(STEP_GOAL) + ' hit on ' + r.stepsGoal + ' days'],
      ['Habits', r.habitsPct + '%'],
      ['Diet on plan (optional)', r.mealsPct + '%']
    ];
  }
  function bodyLine(r) {
    if (!r.body.length) return 'No weigh in this week.';
    var lastB = r.body[r.body.length - 1].kg;
    var s = 'Latest ' + lastB + ' kg on ' + fmt(r.body[r.body.length - 1].k) + '.';
    if (r.lastBody != null) {
      var diff = Math.round((lastB - r.lastBody) * 10) / 10;
      s += diff < 0 ? ' Down ' + Math.abs(diff) + ' kg since the previous weigh in.' : diff > 0 ? ' Up ' + diff + ' kg since the previous weigh in.' : ' Same as the previous weigh in.';
    }
    return s;
  }
  function weightChange(w) {
    if (w.last == null) return 'new';
    var ch = Math.round((w.now - w.last) * 10) / 10;
    return (ch > 0 ? '+' : '') + ch + ' kg';
  }

  function docReport(r) {
    var yr = fromKey(r.ws).getFullYear();
    var cell = function (v) { return '<td>' + esc(v) + '</td>'; };
    var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>Gym report</title>' +
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
    var notes = weekDays(r.ws).filter(function (k) { return (dayRead(k).note || '').trim(); });
    if (notes.length) h += '<h2>Notes</h2><ul>' + notes.map(function (k) { return '<li><b>' + DAY_SHORT[dow(k)] + ':</b> ' + esc(dayRead(k).note) + '</li>'; }).join('') + '</ul>';
    h += '</body></html>';
    download('gym-report-' + r.ws + '.doc', '﻿' + h, 'application/msword');
  }

  var pdfLoading = null;
  function loadJsPdf() {
    if (window.jspdf) return Promise.resolve();
    if (pdfLoading) return pdfLoading;
    pdfLoading = new Promise(function (res, rej) {
      var sc = document.createElement('script');
      sc.src = JSPDF_URL; sc.onload = res; sc.onerror = function () { pdfLoading = null; rej(); };
      document.head.appendChild(sc);
    });
    return pdfLoading;
  }

  function pdfReport(r) {
    toast('Making PDF...');
    loadJsPdf().then(function () {
      var doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
      var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 48, y = M, CW = W - 2 * M;
      var INK = '#1f1f1f', MUTED = '#6b6f72', LINE = '#e1e4e8';
      function need(h) { if (y + h > H - M) { doc.addPage(); y = M; } }
      function text(t, size, style, color) {
        doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(color || INK);
        doc.splitTextToSize(String(t), CW).forEach(function (l) { need(size * 1.45); doc.text(l, M, y + size); y += size * 1.45; });
      }
      function heading(t) { y += 14; need(40); text(t, 13, 'bold'); y += 4; }
      function table(cols, rows) {
        var rh = 20;
        function line() { doc.setDrawColor(LINE); doc.line(M, y, W - M, y); }
        function rowOut(vals, bold, color) {
          need(rh); var x = M;
          doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 9 : 10); doc.setTextColor(color || INK);
          vals.forEach(function (v, i) {
            var c = cols[i], s = doc.splitTextToSize(String(v), c.w - 8)[0] || '';
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
      var vLines = doc.splitTextToSize(r.verdict, CW - 20);
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

      var notes = weekDays(r.ws).filter(function (k) { return (dayRead(k).note || '').trim(); });
      if (notes.length) { heading('Notes'); notes.forEach(function (k) { text(DAY_SHORT[dow(k)] + ': ' + dayRead(k).note, 10); y += 3; }); }

      doc.save('gym-report-' + r.ws + '.pdf');
      toast('PDF downloaded.');
    }).catch(function () { toast('Could not load the PDF maker. Check internet, or use Word.'); });
  }

  /* ---------- UI state ---------- */
  var view = 'today';
  var selDate = todayKey();
  var reportWs = weekStartOf(todayKey());

  /* ---------- rendering ---------- */
  function checkbox(action, id, on, label) {
    return '<button type="button" class="tick' + (on ? ' on' : '') + '" data-action="' + action + '" data-id="' + esc(id) +
      '" role="checkbox" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + esc(label) + '"></button>';
  }

  function exerciseCard(e, d, isBonus) {
    var done = !!d.done[e.id];
    var sets = d.sets[e.id] || [];
    var dots = '';
    if (e.sets > 1 || e.id !== 'warmup') {
      for (var i = 0; i < e.sets; i++) {
        dots += '<button type="button" class="set' + (sets[i] ? ' on' : '') + '" data-action="set" data-id="' + esc(e.id) +
          '" data-i="' + i + '" aria-label="Set ' + (i + 1) + '">' + (i + 1) + '</button>';
      }
    }
    var hasKg = !(e.id === 'warmup' || /plank/.test(e.id));
    var last = hasKg ? lastKg(selDate, e.id) : null;
    var kgField = hasKg ?
      '<label class="kg"><input type="number" inputmode="decimal" min="0" step="0.5" id="kg-' + esc(e.id) + '" data-kg="' + esc(e.id) +
      '" value="' + esc(d.kg[e.id] || '') + '" placeholder="' + (last ? last.kg : '0') + '"><span>kg</span></label>' : '';
    var lastNote = last ? '<span class="last">Last time ' + last.kg + ' kg (' + DAY_SHORT[dow(last.k)] + ' ' + fmt(last.k) + ')</span>' : '';
    var restBtn = e.rest ? '<button type="button" class="chip" data-action="rest" data-sec="' + e.rest + '" data-name="' + esc(e.name) + '">Rest ' + restLabel(e.rest) + '</button>' : '';
    var video = e.video ? '<a class="watch" href="' + esc(e.video) + '" target="_blank" rel="noopener">Watch how to do it <span aria-hidden="true">&#8599;</span></a>' : '';
    return '<li class="card' + (done ? ' done' : '') + (isBonus ? ' bonus' : '') + '">' +
      '<div class="row">' + checkbox('done', e.id, done, 'Mark ' + e.name + ' done') +
      '<div class="body"><div class="name">' + (isBonus ? '<span class="tag">Bonus</span>' : '') + esc(e.name) + '</div>' +
      '<div class="machine">' + esc(e.machine) + '</div>' +
      '<div class="meta"><span class="sets-reps">' + (e.id === 'warmup' ? esc(e.reps) : e.sets + ' &times; ' + esc(e.reps)) + '</span>' +
      (e.rest ? '<span class="muted">rest ' + restLabel(e.rest) + '</span>' : '') + '</div>' +
      (e.tip ? '<div class="tip">' + esc(e.tip) + '</div>' : '') +
      '</div></div>' +
      (dots || kgField || restBtn ? '<div class="tools">' + (dots ? '<div class="dots">' + dots + '</div>' : '') + kgField + restBtn + lastNote + '</div>' : '') +
      (video ? '<div class="watchrow">' + video + '</div>' : '') +
      '</li>';
  }

  function restLabel(s) { return s >= 60 ? (s % 60 ? Math.floor(s / 60) + ' min ' + (s % 60) + ' s' : s / 60 + ' min') : s + ' s'; }

  function weekStrip(k) {
    var ws = weekStartOf(k), today = todayKey();
    var html = weekDays(ws).map(function (dk) {
      var st = dayStatus(dk), p = planFor(dk);
      return '<button type="button" class="day ' + st + (dk === k ? ' sel' : '') + (dk === today ? ' is-today' : '') + '" data-action="pick" data-k="' + dk + '">' +
        '<span class="dn">' + DAY_SHORT[dow(dk)] + '</span><span class="dd">' + fromKey(dk).getDate() + '</span><span class="df">' + p.short + '</span></button>';
    }).join('');
    return '<div class="weeknav"><button type="button" class="arrow" data-action="shift" data-n="-7" aria-label="Previous week">&#8249;</button>' +
      '<div class="strip">' + html + '</div>' +
      '<button type="button" class="arrow" data-action="shift" data-n="7" aria-label="Next week">&#8250;</button></div>';
  }

  function renderToday() {
    var k = selDate, p = planFor(k), d = dayRead(k), st = dayStats(k);
    var today = todayKey();
    var wk = programWeek(k);
    var head = '<section class="hero">' +
      '<div class="eyebrow">' + DAY_NAMES[dow(k)] + ', ' + fmt(k) + (k === today ? ' &middot; today' : '') + (wk ? ' &middot; week ' + wk : ' &middot; before program start') + '</div>' +
      '<h1>' + esc(p.focus) + '</h1>' +
      '<div class="progress"><div class="pr"><span>' + st.done + ' of ' + st.total + ' done</span><span>' + st.pct + '%</span></div>' +
      '<div class="bar"><span style="width:' + st.pct + '%"></span></div></div></section>';

    var body = '';
    if (p.rest) {
      body += '<h2>Rest day</h2><ul class="list">' + p.tasks.map(function (t) {
        var on = !!d.done[t.id];
        return '<li class="card' + (on ? ' done' : '') + '"><div class="row">' + checkbox('done', t.id, on, 'Mark ' + t.name + ' done') +
          '<div class="body"><div class="name">' + esc(t.name) + '</div><div class="tip">' + esc(t.detail) + '</div></div></div></li>';
      }).join('') + '</ul>' +
        '<button type="button" class="primary" data-action="go-report">Open this week\'s report</button>';
    } else {
      body += '<h2>Workout <span class="h-note">in Sandeep\'s order</span></h2><ul class="list">' +
        mainExercises(p).map(function (e) { return exerciseCard(e, d, false); }).join('') + '</ul>';
      body += '<h2>Bonus <span class="h-note">if your body allows today</span></h2>';
      body += '<ul class="list">' + bonusExercises(p).map(function (e) { return exerciseCard(e, d, true); }).join('') + '</ul>';
      var cOn = !!d.done.cardio;
      body += '<h2>Cardio</h2><ul class="list"><li class="card' + (cOn ? ' done' : '') + '"><div class="row">' + checkbox('done', 'cardio', cOn, 'Mark cardio done') +
        '<div class="body"><div class="name">' + esc(p.cardio.name) + '</div><div class="tip">' + esc(p.cardio.detail) + '</div></div></div></li></ul>';
    }

    var steps = d.steps || '';
    body += '<h2>Daily habits</h2><div class="card stepscard"><div class="steps-top"><label class="name" for="steps-in">Steps today</label>' +
      '<label class="kg big"><input type="number" inputmode="numeric" min="0" max="100000" step="100" id="steps-in" data-steps="1" value="' + esc(steps) + '" placeholder="0"><span>steps</span></label></div>' +
      '<div class="bar"><span id="steps-bar" style="width:' + stepsPct(steps) + '%"></span></div><div class="tip" id="steps-note">' + stepsNote(steps) + '</div></div>';
    body += '<ul class="list compact">' + G.HABITS.map(function (h) {
      var on = !!d.habits[h.id];
      return '<li class="card' + (on ? ' done' : '') + '"><div class="row">' + checkbox('habit', h.id, on, h.name) + '<div class="body"><div class="name">' + esc(h.name) + '</div></div></div></li>';
    }).join('') + '</ul>';

    var mealsDone = G.MEALS.filter(function (m) { return d.meals[m.id]; }).length;
    body += '<details class="diet"' + (S.settings.dietOpen ? ' open' : '') + '><summary data-action="diet-toggle"><span>Diet plan <span class="h-note">optional, veg ghar ka khana</span></span><span class="muted">' + mealsDone + '/' + G.MEALS.length + '</span></summary>' +
      '<ul class="list compact">' + G.MEALS.map(function (m) {
        var on = !!d.meals[m.id];
        return '<li class="card' + (on ? ' done' : '') + '"><div class="row">' + checkbox('meal', m.id, on, m.name) +
          '<div class="body"><div class="name">' + esc(m.name) + '</div><div class="tip">' + esc(m.detail) + '</div></div></div></li>';
      }).join('') + '</ul></details>';

    body += '<h2>Notes</h2><textarea id="note" data-note="1" rows="3" placeholder="How did it feel? Any pain? New weights?">' + esc(d.note || '') + '</textarea>';
    if (k !== today) body += '<button type="button" class="ghost" data-action="pick" data-k="' + today + '">Back to today</button>';

    return weekStrip(k) + (k === today ? reminderHtml() : '') + head + body;
  }

  // Shown when the app opens: yesterday missed, morning window passed, items left.
  function reminderHtml() {
    var today = todayKey();
    if (S.settings.dismissed === today) return '';
    var h = new Date().getHours(), msgs = [];
    var y = addDays(today, -1), py = planFor(y);
    if (!py.rest && counts(y)) {
      var sy = dayStats(y);
      if (sy.done === 0) msgs.push('Yesterday (' + DAY_NAMES[dow(y)] + ', ' + py.focus + ') was missed. No stress, today counts.');
      else if (sy.pct < 100) msgs.push('Yesterday was ' + sy.pct + '% done. ' + (sy.total - sy.done) + ' items were left.');
    }
    var p = planFor(today), st = dayStats(today);
    if (!p.rest) {
      if (st.done === 0) {
        if (h < 6) msgs.push('Gym window opens at 6 AM. Today is ' + p.focus + '.');
        else if (h < 10) msgs.push('Morning window is on (6 to 10 AM). Today is ' + p.focus + '.');
        else msgs.push('Nothing ticked today yet. The morning window has passed, an evening session still works.');
      } else if (st.pct < 100 && h >= 10) {
        msgs.push((st.total - st.done) + ' items left today. Finish them in the evening if your mood allows.');
      }
    }
    var isSunday = dow(today) === 0;
    if (isSunday) msgs.push('Your weekly report is ready. Download it as PDF or Word from the Report tab.');
    if (!msgs.length) return '';
    return '<div class="notice" role="status"><div class="notice-text">' + msgs.map(function (m) { return '<p>' + esc(m) + '</p>'; }).join('') +
      '</div><div class="notice-actions">' + (isSunday ? '<button type="button" data-action="go-report">Open report</button>' : '') +
      '<button type="button" class="quiet" data-action="dismiss">Got it</button></div></div>';
  }

  function renderReport() {
    var r = reportData(reportWs);
    var thisWeek = reportWs === weekStartOf(todayKey());
    var tiles = [
      ['Workout score', r.score + '%', r.done + ' of ' + r.total + ' items'],
      ['Days trained', r.trained + '/' + r.trainDays, thisWeek ? 'so far this week' : 'training days'],
      ['Streak', r.streak, 'full training days in a row'],
      ['Sets ticked', r.sets, r.bonus + ' bonus exercises'],
      ['Steps a day', num(r.stepsAvg), num(STEP_GOAL) + ' goal hit ' + r.stepsGoal + ' days'],
      ['Habits', r.habitsPct + '%', 'water, steps, sleep, no junk']
    ].map(function (t) {
      return '<div class="tile"><div class="tl">' + t[0] + '</div><div class="tv">' + t[1] + '</div><div class="ts">' + t[2] + '</div></div>';
    }).join('');

    var rows = r.rows.map(function (row) {
      return '<tr><td><b>' + DAY_SHORT[dow(row.k)] + '</b> ' + fmt(row.k) + '</td><td>' + esc(row.p.short) + '</td>' +
        '<td class="num">' + row.st.done + '/' + row.st.total + '</td><td class="num">' + (row.st.steps ? num(row.st.steps) : '-') + '</td>' +
        '<td><span class="pill ' + row.status + '">' + STATUS_LABEL[row.status] + '</span></td></tr>';
    }).join('');

    var missed = r.missed.length ? '<ul class="plain">' + r.missed.map(function (m) {
      return '<li><b>' + DAY_NAMES[dow(m.k)] + ':</b> ' + m.items.map(esc).join(', ') + '</li>';
    }).join('') + '</ul>' : '<p class="muted">Nothing missed so far.</p>';
    var todo = r.todo.length ? '<h3>Still to do today</h3><ul class="plain">' + r.todo.map(function (m) {
      return '<li>' + m.items.map(esc).join(', ') + '</li>';
    }).join('') + '</ul>' : '';

    var weights = r.weights.length ? '<div class="tablewrap"><table><thead><tr><th>Exercise</th><th class="num">This week</th><th class="num">Last week</th><th class="num">Change</th></tr></thead><tbody>' +
      r.weights.map(function (w) {
        var ch = w.last != null ? Math.round((w.now - w.last) * 10) / 10 : null;
        var cls = ch == null ? '' : ch > 0 ? 'up' : ch < 0 ? 'down' : '';
        return '<tr><td>' + esc(w.name) + '</td><td class="num">' + w.now + ' kg</td><td class="num">' + (w.last != null ? w.last + ' kg' : '-') +
          '</td><td class="num ' + cls + '">' + (ch == null ? 'new' : (ch > 0 ? '+' : '') + ch + ' kg') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<p class="muted">No weights logged this week. Type the kg on each exercise card.</p>';

    var bodyNow = S.body[todayKey()] || '';
    var bodyList = r.body.length ? '<ul class="plain">' + r.body.map(function (b) {
      return '<li>' + fmt(b.k) + ': <b>' + b.kg + ' kg</b></li>';
    }).join('') + '</ul>' : '';
    var bodyChange = '';
    if (r.body.length && r.lastBody != null) {
      var diff = Math.round((r.body[r.body.length - 1].kg - r.lastBody) * 10) / 10;
      bodyChange = '<p class="' + (diff < 0 ? 'good' : 'muted') + '">' + (diff < 0 ? 'Down ' + Math.abs(diff) : diff > 0 ? 'Up ' + diff : 'No change, 0') + ' kg since the last weigh in.</p>';
    }

    return '<div class="weeknav rep"><button type="button" class="arrow" data-action="rweek" data-n="-7" aria-label="Previous week">&#8249;</button>' +
      '<div class="rtitle"><div class="eyebrow">Weekly report</div><h1>' + fmt(r.ws) + ' to ' + fmt(r.we) + '</h1></div>' +
      '<button type="button" class="arrow" data-action="rweek" data-n="7" aria-label="Next week">&#8250;</button></div>' +
      '<p class="verdict">' + esc(r.verdict) + '</p>' +
      '<div class="saverow"><button type="button" class="primary" data-action="pdf-report">Download PDF</button>' +
      '<button type="button" class="ghost" data-action="doc-report">Download Word</button>' +
      '<button type="button" class="ghost" data-action="copy-report">Copy text</button></div>' +
      '<div class="tiles">' + tiles + '</div>' +
      '<h2>Day by day</h2><div class="tablewrap"><table><thead><tr><th>Day</th><th>Focus</th><th class="num">Items</th><th class="num">Steps</th><th>Status</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<h2>Missed</h2>' + missed + todo +
      '<h2>Weights</h2>' + weights +
      '<h2>Body weight</h2><div class="weigh"><label class="kg big"><input type="number" inputmode="decimal" min="30" max="250" step="0.1" id="bodykg" value="' + esc(bodyNow) + '" placeholder="111"><span>kg today</span></label>' +
      '<button type="button" class="primary" data-action="save-body">Save</button></div>' + bodyList + bodyChange +
      '<div class="actions"><button type="button" class="primary" data-action="pdf-report">Download PDF</button>' +
      '<button type="button" class="ghost" data-action="doc-report">Download Word</button></div>';
  }

  function renderPlan() {
    var order = [1, 2, 3, 4, 5, 6, 0];
    var todayDow = dow(todayKey());
    var days = order.map(function (i) {
      var p = G.DAYS[i];
      var list = p.rest ? p.tasks.map(function (t) { return '<li>' + esc(t.name) + ' <span class="muted">' + esc(t.detail) + '</span></li>'; }).join('') :
        mainExercises(p).map(function (e) { return '<li>' + esc(e.name) + ' <span class="muted">' + (e.id === 'warmup' ? esc(e.reps) : e.sets + ' x ' + esc(e.reps)) + '</span></li>'; }).join('') +
        bonusExercises(p).map(function (e) { return '<li class="b">Bonus ' + e.bonus + ': ' + esc(e.name) + ' <span class="muted">' + e.sets + ' x ' + esc(e.reps) + '</span></li>'; }).join('') +
        '<li>Cardio: ' + esc(p.cardio.name) + ' <span class="muted">' + esc(p.cardio.detail) + '</span></li>';
      return '<details' + (i === todayDow ? ' open' : '') + '><summary><b>' + DAY_NAMES[i] + '</b> <span class="muted">' + esc(p.focus) + '</span></summary><ol>' + list + '</ol></details>';
    }).join('');
    var seen = {};
    var watch = order.map(function (i) {
      var p = G.DAYS[i];
      if (p.rest) return '';
      var items = p.exercises.filter(function (e) { if (seen[e.id] || !e.video) return false; seen[e.id] = 1; return true; });
      if (!items.length) return '';
      return '<h3>' + esc(p.focus) + '</h3><ul class="watchlist">' + items.map(function (e) {
        return '<li><a href="' + esc(e.video) + '" target="_blank" rel="noopener">' + esc(e.name) + ' <span aria-hidden="true">&#8599;</span></a><span class="muted">' + esc(e.machine) + '</span></li>';
      }).join('') + '</ul>';
    }).join('');
    return '<div class="eyebrow">Weekly plan</div><h1>Sandeep\'s split</h1>' +
      '<p class="muted">Each day starts with a fresh checklist. Bonus exercises are there every day, do them when your body allows.</p>' +
      days +
      '<h2>Watch list</h2><p class="muted">How to do each exercise. Opens YouTube.</p>' + watch +
      '<h2>Rules</h2><ul class="plain"><li>Last 1 to 2 reps hard, form clean. Never to failure for now.</li>' +
      '<li>Hit the top reps on every set, then add the smallest weight jump next time.</li>' +
      '<li>Never lock knees on leg press. Keep your back flat on every row and pulldown.</li>' +
      '<li>Every 6 to 8 weeks, one easy week at half the sets.</li></ul>' +
      '<h2>Your data</h2><p class="muted">Everything is saved in this browser only. Download a backup now and then, or to move to another phone.</p>' +
      '<div class="actions"><button type="button" class="ghost" data-action="export">Download backup</button>' +
      '<label class="ghost filebtn">Restore backup<input type="file" id="importfile" accept="application/json,.json" hidden></label>' +
      '<button type="button" class="ghost" data-action="lock">Lock now</button>' +
      '<button type="button" class="danger" data-action="wipe">Erase all data</button></div>';
  }

  function render() {
    var v = $('#view');
    v.innerHTML = view === 'report' ? renderReport() : view === 'plan' ? renderPlan() : renderToday();
    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.classList.toggle('on', b.dataset.view === view);
      b.setAttribute('aria-current', b.dataset.view === view ? 'page' : 'false');
    });
  }

  /* ---------- rest timer ---------- */
  var timer = { end: 0, id: null };
  var audioCtx = null;
  function startRest(sec, name) {
    try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
    timer.end = Date.now() + sec * 1000;
    $('#restname').textContent = name || 'Rest';
    $('#restbar').hidden = false;
    clearInterval(timer.id);
    tick();
    timer.id = setInterval(tick, 250);
  }
  function tick() {
    var left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
    $('#resttime').textContent = Math.floor(left / 60) + ':' + pad(left % 60);
    if (left <= 0) stopRest(true);
  }
  function stopRest(finished) {
    clearInterval(timer.id); timer.id = null;
    $('#restbar').hidden = true;
    if (finished) {
      try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) { /* ignore */ }
      beep();
      toast('Rest over. Next set.');
    }
  }
  function beep() {
    if (!audioCtx) return;
    try {
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.25, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      o.start(); o.stop(audioCtx.currentTime + 0.6);
    } catch (e) { /* ignore */ }
  }

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  /* ---------- downloads ---------- */
  function download(name, text, type) {
    var blob = new Blob([text], { type: type || 'text/plain' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- actions ---------- */
  var wipeArmed = false;
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-action],[data-view]');
    if (!el) return;
    if (el.dataset.view) { view = el.dataset.view; if (view === 'today') selDate = selDate || todayKey(); render(); window.scrollTo(0, 0); return; }
    var a = el.dataset.action, id = el.dataset.id, d;
    switch (a) {
      case 'done':
        d = dayWrite(selDate); d.done[id] = !d.done[id];
        if (d.done[id] && d.sets[id] === undefined) {
          var e = findEx(selDate, id);
          if (e && e.sets > 1) d.sets[id] = Array(e.sets).fill(true);
        }
        save(); render(); celebrate(); break;
      case 'set':
        d = dayWrite(selDate);
        var ex = findEx(selDate, id), i = +el.dataset.i;
        var arr = (d.sets[id] || []).slice(); while (arr.length < ex.sets) arr.push(false);
        arr[i] = !arr[i]; d.sets[id] = arr;
        var all = arr.every(Boolean);
        d.done[id] = all;
        save(); render();
        if (arr[i] && !all && ex.rest) startRest(ex.rest, ex.name);
        if (all) celebrate();
        break;
      case 'habit': d = dayWrite(selDate); d.habits[id] = !d.habits[id]; save(); render(); break;
      case 'meal': d = dayWrite(selDate); d.meals[id] = !d.meals[id]; save(); render(); break;
      case 'rest': startRest(+el.dataset.sec, el.dataset.name); break;
      case 'rest-stop': stopRest(false); break;
      case 'rest-add': timer.end += 15000; tick(); break;
      case 'pick': selDate = el.dataset.k; render(); window.scrollTo(0, 0); break;
      case 'shift': selDate = addDays(selDate, +el.dataset.n); render(); break;
      case 'rweek': reportWs = addDays(reportWs, +el.dataset.n); render(); break;
      case 'go-report': view = 'report'; reportWs = weekStartOf(selDate); render(); window.scrollTo(0, 0); break;
      case 'save-body':
        var v = parseFloat($('#bodykg').value);
        if (isNaN(v) || v < 30 || v > 250) { toast('Enter your weight in kg, like 111.'); break; }
        S.body[todayKey()] = Math.round(v * 10) / 10; save(); render(); toast('Weight saved.'); break;
      case 'copy-report':
        var txt = reportText(reportData(reportWs));
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () { toast('Report copied.'); }, function () { download('gym-report-' + reportWs + '.txt', txt); });
        } else download('gym-report-' + reportWs + '.txt', txt);
        break;
      case 'dl-report': download('gym-report-' + reportWs + '.txt', reportText(reportData(reportWs))); break;
      case 'pdf-report': pdfReport(reportData(reportWs)); break;
      case 'doc-report': docReport(reportData(reportWs)); toast('Word report downloaded.'); break;
      case 'dismiss': S.settings.dismissed = todayKey(); save(); render(); break;
      case 'diet-toggle': S.settings.dietOpen = !el.parentElement.open; save(); break;
      case 'export': download('gym-backup-' + todayKey() + '.json', JSON.stringify(S, null, 2), 'application/json'); break;
      case 'lock': try { localStorage.removeItem(UNLOCK_KEY); } catch (e) { /* ignore */ } showLock(); break;
      case 'wipe':
        if (!wipeArmed) { wipeArmed = true; el.textContent = 'Tap again to erase everything'; setTimeout(function () { wipeArmed = false; render(); }, 4000); break; }
        wipeArmed = false; S = { days: {}, body: {}, settings: {} }; save(); render(); toast('All data erased.'); break;
    }
  });

  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.dataset.kg) { var d = dayWrite(selDate); d.kg[t.dataset.kg] = t.value; save(); }
    else if (t.dataset.note) { dayWrite(selDate).note = t.value; save(); }
    else if (t.dataset.steps) {
      var dd = dayWrite(selDate), n = parseInt(t.value, 10) || 0;
      dd.steps = n > 0 ? n : ''; dd.habits.steps = n >= STEP_GOAL; save();
      var b = $('#steps-bar'), nt = $('#steps-note');
      if (b) b.style.width = stepsPct(n) + '%';
      if (nt) nt.textContent = stepsNote(n);
    }
  });

  document.addEventListener('change', function (ev) {
    if (ev.target.dataset && ev.target.dataset.steps) { render(); return; }
    if (ev.target.id !== 'importfile' || !ev.target.files[0]) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var s = JSON.parse(fr.result);
        if (!s || typeof s.days !== 'object') throw new Error('bad');
        S = { days: s.days, body: s.body || {}, settings: s.settings || {} };
        save(); render(); toast('Backup restored.');
      } catch (e) { toast('That file is not a gym backup.'); }
    };
    fr.readAsText(ev.target.files[0]);
  });

  function findEx(k, id) {
    if (id === 'warmup') return G.WARMUP;
    var p = planFor(k);
    if (p.rest) return null;
    for (var i = 0; i < p.exercises.length; i++) if (p.exercises[i].id === id) return p.exercises[i];
    return null;
  }

  function celebrate() {
    var st = dayStats(selDate);
    if (st.pct === 100) toast(planFor(selDate).rest ? 'Rest day done.' : 'Workout complete. Eat your protein.');
  }

  /* ---------- PIN lock ---------- */
  var entry = '';
  function isUnlocked() {
    try { var t = +localStorage.getItem(UNLOCK_KEY); return t > 0 && Date.now() - t < UNLOCK_MS; } catch (e) { return false; }
  }
  function showLock() {
    entry = ''; drawDots();
    $('#root').hidden = true; $('#lock').hidden = false;
  }
  function showApp() {
    $('#lock').hidden = true; $('#root').hidden = false;
    selDate = todayKey(); reportWs = weekStartOf(selDate);
    render();
  }
  function drawDots() {
    document.querySelectorAll('#pindots i').forEach(function (dot, i) { dot.classList.toggle('on', i < entry.length); });
  }
  function sha256(text) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return b.toString(16).padStart(2, '0'); }).join('');
      });
    }
    return Promise.resolve(null);
  }
  function press(n) {
    if (entry.length >= 4) return;
    entry += n; drawDots();
    if (entry.length === 4) {
      var tryPin = entry;
      sha256(tryPin).then(function (h) {
        var ok = h ? h === PIN_HASH : tryPin === atob('OTEyNA==');
        if (ok) {
          try { localStorage.setItem(UNLOCK_KEY, String(Date.now())); } catch (e) { /* ignore */ }
          showApp();
        } else {
          var pad = $('#pinpad');
          pad.classList.remove('shake'); void pad.offsetWidth; pad.classList.add('shake');
          $('#pinmsg').textContent = 'Wrong PIN. Try again.';
          setTimeout(function () { entry = ''; drawDots(); }, 300);
        }
      });
    } else {
      $('#pinmsg').textContent = '';
    }
  }
  $('#lock').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    if (b.dataset.n != null) press(b.dataset.n);
    else if (b.dataset.k === 'del') { entry = entry.slice(0, -1); drawDots(); }
  });
  document.addEventListener('keydown', function (ev) {
    if ($('#lock').hidden) return;
    if (/^[0-9]$/.test(ev.key)) press(ev.key);
    else if (ev.key === 'Backspace') { entry = entry.slice(0, -1); drawDots(); }
  });

  // A new day starts a fresh list: re-render when the date changes while the app stays open.
  var lastDay = todayKey();
  setInterval(function () {
    var now = todayKey();
    if (now !== lastDay) {
      if (selDate === lastDay) selDate = now;
      lastDay = now;
      if (!$('#root').hidden) render();
    }
  }, 30000);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    if (!isUnlocked()) { showLock(); return; }
    var now = todayKey();
    if (now !== lastDay) { if (selDate === lastDay) selDate = now; lastDay = now; render(); }
  });

  if (isUnlocked()) showApp(); else showLock();
})();
