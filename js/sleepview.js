/* The Sleep tab: sleep and screen time day by day, with week and month analysis and downloads. */
import { periodStats, weekKeys, monthKeys, monthOf, monthLabel, shiftMonth, dur, sleepVerdict, minToClock, sleepReportText, SLEEP_MIN_H, SLEEP_MAX_H } from './sleep.js';
import { isNativeApp } from './native.js';
import { esc, fmt, fromKey, addDays, todayKey, weekStartOf, dow, DAY_SHORT, download, toast } from './util.js';

export const sv = { mode: 'week', ws: weekStartOf(todayKey()), ym: monthOf(todayKey()) };

export function periodTitle() {
  return sv.mode === 'week' ? fmt(sv.ws) + ' to ' + fmt(addDays(sv.ws, 6)) : monthLabel(sv.ym);
}
export function periodData() { return periodStats(sv.mode === 'week' ? weekKeys(sv.ws) : monthKeys(sv.ym)); }

const tile = (label, value, sub) => '<div class="tile"><div class="tl">' + esc(label) + '</div><div class="tv">' + value + '</div><div class="ts">' + esc(sub) + '</div></div>';
const hm = (ms) => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + '<small>h</small> ' + (m % 60) + '<small>m</small>'; };

/* One-series bar chart (SVG). Values in hours. band: [lo, hi] shaded goal range; line: target.
   Tap or hover a bar to see its value (title tooltip); the day table below is the table view. */
function barChart(id, keys, valueOf, opts) {
  const W = 340, Hh = 150, padL = 26, padB = 20, padT = 8;
  const vals = keys.map(valueOf);
  const max = Math.max(opts.min || 1, ...vals.filter((v) => v != null), opts.band ? opts.band[1] : 0, opts.line || 0) * 1.08;
  const y = (v) => padT + (Hh - padT - padB) * (1 - v / max);
  const n = keys.length, slot = (W - padL) / n, bw = Math.max(3, Math.min(26, slot - 2));
  let g = '';
  // Recessive grid: whole hours every 2 or 4 h.
  const step = max > 12 ? 4 : 2;
  for (let v = 0; v <= max; v += step) g += '<line class="grid" x1="' + padL + '" x2="' + W + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text class="axis" x="' + (padL - 4) + '" y="' + (y(v) + 3) + '" text-anchor="end">' + v + 'h</text>';
  if (opts.band) g += '<rect class="band" x="' + padL + '" width="' + (W - padL) + '" y="' + y(opts.band[1]) + '" height="' + (y(opts.band[0]) - y(opts.band[1])) + '"><title>' + esc(opts.bandLabel || '') + '</title></rect>';
  if (opts.line) g += '<line class="target" x1="' + padL + '" x2="' + W + '" y1="' + y(opts.line) + '" y2="' + y(opts.line) + '"/>';
  keys.forEach((k, i) => {
    const v = vals[i], x = padL + i * slot + (slot - bw) / 2;
    const lbl = n <= 8 ? DAY_SHORT[dow(k)] : (fromKey(k).getDate() % 5 === 1 || n <= 10 ? String(fromKey(k).getDate()) : '');
    if (lbl) g += '<text class="axis" x="' + (x + bw / 2) + '" y="' + (Hh - 5) + '" text-anchor="middle">' + lbl + '</text>';
    if (v == null || v <= 0) return;
    const top = y(v), h = Math.max(2, y(0) - top), r = Math.min(4, bw / 2);
    // Rounded data end, square at the baseline.
    g += '<path class="bar" d="M' + x + ',' + y(0) + 'V' + (top + r) + 'Q' + x + ',' + top + ' ' + (x + r) + ',' + top + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + top + ' ' + (x + bw) + ',' + (top + r) + 'V' + y(0) + 'Z">' +
      '<title>' + esc(DAY_SHORT[dow(k)] + ' ' + fmt(k) + ': ' + dur(v * 3600000)) + '</title></path>';
    // Big invisible hit target for taps.
    g += '<rect class="hit" x="' + (padL + i * slot) + '" y="' + padT + '" width="' + slot + '" height="' + (Hh - padT - padB) + '"><title>' + esc(DAY_SHORT[dow(k)] + ' ' + fmt(k) + ': ' + dur(v * 3600000)) + '</title></rect>';
  });
  return '<figure class="chart"><figcaption>' + esc(opts.title) + '</figcaption><svg id="' + id + '" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + esc(opts.title) + '">' + g + '</svg>' +
    (opts.note ? '<div class="chart-note">' + opts.note + '</div>' : '') + '</figure>';
}

export function renderSleep() {
  const st = periodData(), s = st.sleep, c = st.screen;
  const keys = st.keys.filter((k) => k <= todayKey());
  const segs = '<span class="segs"><button type="button" class="seg' + (sv.mode === 'week' ? ' on' : '') + '" data-action="sv-mode" data-v="week">Week</button>' +
    '<button type="button" class="seg' + (sv.mode === 'month' ? ' on' : '') + '" data-action="sv-mode" data-v="month">Month</button></span>';
  let h = '<div class="eyebrow">Sleep &amp; screen</div><div class="weeknav rep"><button type="button" class="arrow" data-action="sv-shift" data-n="-1" aria-label="Earlier">&#8249;</button>' +
    '<div class="rtitle"><h1>' + esc(periodTitle()) + '</h1></div><button type="button" class="arrow" data-action="sv-shift" data-n="1" aria-label="Later">&#8250;</button></div>' +
    '<div class="sv-top">' + segs + '</div>';

  // Sleep
  h += '<h2>Sleep <span class="h-note">goal 7 to 9 h, your target ' + s.target + ' h</span></h2>';
  if (!s.nights) h += '<p class="muted">No sleep recorded for this ' + sv.mode + '. ' + (isNativeApp() ? 'Turn on Usage access on Today so the phone can see when you sleep.' : 'Fill the daily check-in on Today, or use the Android app to track sleep by itself.') + '</p>';
  else {
    h += '<div class="tiles">' + tile('Average sleep', hm(s.avgMs), s.nights + ' nights') + tile('In 7 to 9 h', s.inRange + '/' + s.nights, s.short ? s.short + ' short nights' : 'no short nights') +
      tile('Sleep debt', hm(s.debtMs), 'below ' + s.target + ' h target') + tile('Bedtime', s.avgBed || '-', s.avgBed ? 'varies ' + s.bedSpread + ' min' : 'phone nights only') +
      tile('Wake-up', s.avgWake || '-', s.avgWake ? 'varies ' + s.wakeSpread + ' min' : 'phone nights only') + tile('Best night', s.best ? hm(s.best.sleepMs) : '-', s.best ? DAY_SHORT[dow(s.best.k)] + ' ' + fmt(s.best.k) : '') + '</div>';
    h += barChart('sleepchart', keys, (k) => { const r = st.recs.find((x) => x.k === k); return r && r.sleepMs ? r.sleepMs / 3600000 : null; },
      { title: 'Hours slept each night', band: [SLEEP_MIN_H, SLEEP_MAX_H], bandLabel: 'Healthy range 7 to 9 h', line: s.target, min: 10,
        note: '<span class="key band"></span> healthy 7 to 9 h &nbsp; <span class="key line"></span> your target ' + s.target + ' h' });
  }

  // Screen time
  h += '<h2>Screen time <span class="h-note">awake hours only, wake-up to sleep</span></h2>';
  if (!c.days) h += '<p class="muted">' + (isNativeApp() ? 'No screen time yet for this ' + sv.mode + '. It fills in by itself once Usage access is on (Today, Phone and sleep card).' : 'Screen time needs the Android app with Usage access.') + '</p>';
  else {
    h += '<div class="tiles">' + tile('Screen time', hm(c.avgScreen), 'a day, ' + c.pct + '% of awake time') + tile('Phone-free', hm(c.avgFree), 'a day while awake') +
      tile('After bedtime', c.lateDays ? hm(c.avgLate) : '0', c.lateDays + ' of ' + c.days + ' days') + tile('Unlocks', String(Math.round(c.avgUnlocks)), 'a day') +
      tile('Most', c.most ? hm(c.most.screen.screenMs) : '-', c.most ? DAY_SHORT[dow(c.most.k)] + ' ' + fmt(c.most.k) : '') + tile('Least', c.least ? hm(c.least.screen.screenMs) : '-', c.least ? DAY_SHORT[dow(c.least.k)] + ' ' + fmt(c.least.k) : '') + '</div>';
    h += barChart('screenchart', keys, (k) => { const r = st.recs.find((x) => x.k === k); return r && r.screen ? r.screen.screenMs / 3600000 : null; },
      { title: 'Screen time each day (awake hours)', min: 4 });
    if (c.apps.length) h += '<h3>Top apps <span class="h-note">a day</span></h3><ul class="plain apps">' + c.apps.map((a) => '<li><span>' + esc(a.name) + '</span><b>' + dur(a.ms) + '</b></li>').join('') + '</ul>';
  }

  if (st.insights.length) h += '<h2>What it means</h2><ul class="plain insights">' + st.insights.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>';

  // Day by day (also the table view of both charts)
  const rows = st.recs.slice().reverse().map((r) => {
    const v = sleepVerdict(r.sleepMs);
    return '<tr><td><b>' + DAY_SHORT[dow(r.k)] + '</b> ' + fmt(r.k) + '</td>' +
      '<td>' + (r.sleepMs ? dur(r.sleepMs) + (v && v !== 'good' ? ' <span class="pill ' + (v === 'long' ? 'partial' : 'missed') + '">' + v + '</span>' : '') +
        (r.sleepStart ? '<div class="muted small">' + minToClock(new Date(r.sleepStart).getHours() * 60 + new Date(r.sleepStart).getMinutes()) + ' to ' + minToClock(new Date(r.sleepEnd).getHours() * 60 + new Date(r.sleepEnd).getMinutes()) + '</div>' : r.sleepSrc === 'check-in' ? '<div class="muted small">from check-in</div>' : '') : '-') + '</td>' +
      '<td class="num">' + (r.screen ? dur(r.screen.screenMs) : '-') + '</td><td class="num">' + (r.screen ? dur(r.screen.freeMs) : '-') + '</td></tr>';
  }).join('');
  h += '<h2>Day by day</h2>' + (rows ? '<div class="tablewrap"><table><thead><tr><th>Day</th><th>Sleep (night before)</th><th class="num">Screen</th><th class="num">Phone-free</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">Nothing recorded yet.</p>');

  h += '<div class="actions"><button type="button" class="primary" data-action="sv-pdf">Download PDF</button><button type="button" class="ghost" data-action="sv-doc">Download Word</button><button type="button" class="ghost" data-action="sv-copy">Copy text</button></div>' +
    '<p class="muted small">Sleep is the night that ended that morning, worked out from when the screen stayed off for 3 hours or more. Screen time is the time apps were open, from wake-up to sleep, like Digital Wellbeing; the night does not count. Every day is saved on this phone for good (in the backup file too). FitTrack saves each day by itself every morning and evening, even when you do not open it, so no day is missed.</p>';
  return h;
}

/* ---------- downloads ---------- */
export const reportName = () => 'fittrack-sleep-screen-' + (sv.mode === 'week' ? sv.ws : sv.ym);
export function copyReport() {
  const txt = sleepReportText('SLEEP AND SCREEN: ' + periodTitle(), periodData());
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('Copied.'), () => download(reportName() + '.txt', txt));
  else download(reportName() + '.txt', txt);
}
export function docReport() {
  const st = periodData(), s = st.sleep, c = st.screen, cell = (v) => '<td>' + esc(v) + '</td>';
  let h = '<html><head><meta charset="utf-8"><title>Sleep and screen</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:11pt}h1{font-size:20pt;margin:0}h2{font-size:13pt;margin:16pt 0 6pt}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:4pt 6pt;text-align:left}th{background:#f1f1f4}</style></head><body>';
  h += '<h1>Sleep and screen time</h1><p>' + esc(periodTitle()) + '</p>';
  h += '<h2>Sleep (goal 7 to 9 h, target ' + s.target + ' h)</h2><table>' + [['Average sleep', s.nights ? dur(s.avgMs) + ' over ' + s.nights + ' nights' : '-'], ['Nights in 7 to 9 h', s.inRange + ' of ' + s.nights], ['Short nights (under 7 h)', String(s.short)], ['Sleep debt', dur(s.debtMs)], ['Usual bedtime', s.avgBed ? s.avgBed + ' (varies ' + s.bedSpread + ' min)' : '-'], ['Usual wake-up', s.avgWake ? s.avgWake + ' (varies ' + s.wakeSpread + ' min)' : '-']]
    .map((r) => '<tr><th>' + esc(r[0]) + '</th>' + cell(r[1]) + '</tr>').join('') + '</table>';
  h += '<h2>Screen time (awake hours only)</h2><table>' + [['Screen time', c.days ? dur(c.avgScreen) + ' a day, ' + c.pct + '% of awake time' : '-'], ['Phone-free', c.days ? dur(c.avgFree) + ' a day' : '-'], ['After bedtime', c.days ? c.lateDays + ' days, ' + dur(c.avgLate) + ' a day' : '-'], ['Unlocks', c.days ? Math.round(c.avgUnlocks) + ' a day' : '-'], ['Top apps', c.apps.map((a) => a.name + ' ' + dur(a.ms)).join(', ') || '-']]
    .map((r) => '<tr><th>' + esc(r[0]) + '</th>' + cell(r[1]) + '</tr>').join('') + '</table>';
  h += '<h2>Day by day</h2><table><tr><th>Day</th><th>Sleep</th><th>Screen</th><th>Phone-free</th></tr>' + st.recs.map((r) => '<tr>' + cell(DAY_SHORT[dow(r.k)] + ' ' + fmt(r.k)) + cell(r.sleepMs ? dur(r.sleepMs) : '-') + cell(r.screen ? dur(r.screen.screenMs) : '-') + cell(r.screen ? dur(r.screen.freeMs) : '-') + '</tr>').join('') + '</table>';
  if (st.insights.length) h += '<h2>What it means</h2><ul>' + st.insights.map((t) => '<li>' + esc(t) + '</li>').join('') + '</ul>';
  download(reportName() + '.doc', '﻿' + h + '</body></html>', 'application/msword');
}
export function pdfReport(loadJsPdf) {
  toast('Making PDF...');
  loadJsPdf().then(() => {
    const doc = new window.jspdf.jsPDF({ unit: 'pt', format: 'a4' });
    const M = 44, W = doc.internal.pageSize.getWidth() - 2 * M, Hp = doc.internal.pageSize.getHeight();
    let y = M;
    const line = (t, size, bold) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size);
      doc.splitTextToSize(String(t), W).forEach((ln) => { if (y + size * 1.4 > Hp - M) { doc.addPage(); y = M; } doc.text(ln, M, y + size); y += size * 1.4; });
    };
    sleepReportText('Sleep and screen time: ' + periodTitle(), periodData()).split('\n').forEach((t, i) => {
      if (!t) { y += 6; return; }
      line(t, i === 0 ? 16 : /^[A-Z ()0-9,.-]+$/.test(t) && t.length < 60 ? 11 : 10, i === 0 || (/^[A-Z ()0-9,.-]+$/.test(t) && t.length < 60));
    });
    download(reportName() + '.pdf', doc.output('blob'), 'application/pdf');
  }).catch(() => toast('Could not load the PDF maker. Check internet, or use Word.'));
}
