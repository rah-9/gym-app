/* Sleep and screen time: one record per day, plus week and month analysis.
   Sleep for a day is the night that ended that morning. Screen time counts only the awake part of the day,
   from when you woke up to when you went to sleep (the night does not count), the way Digital Wellbeing
   counts apps open on screen. Records come from the Android app (Usage access); on the website, sleep
   comes from the daily check-in.
   Sleep goal: 7 to 9 hours (AASM + Sleep Research Society: 7+ hours for adults; National Sleep Foundation:
   7 to 9 hours for 18 to 64), with your own sleep schedule as the target, plus regular bed and wake times. */
import { S } from './store.js';
import { dayRead } from './plan.js';
import { sleepHoursPlanned, sleepPlan } from './phone.js';
import { addDays, weekDays, todayKey, fromKey, keyOf, MONTH_NAMES } from './util.js';

export const SLEEP_MIN_H = 7, SLEEP_MAX_H = 9, SLEEP_SHORT_H = 6;
const H = 3600000;

export function sleepTargetH() { return Math.max(SLEEP_MIN_H, Math.min(SLEEP_MAX_H, sleepHoursPlanned())); }

// One day's record, or null when nothing is known.
export function dayRecord(k) {
  const d = dayRead(k), p = d.phone || {}, c = d.check || {};
  const sleepMs = p.sleepMs > 0 ? p.sleepMs : c.sleep != null ? c.sleep * H : 0;
  const hasScreen = p.screenMs != null && p.v === 2;
  if (!sleepMs && !hasScreen) return null;
  return {
    k, sleepMs, sleepStart: p.sleepMs > 0 ? p.sleepStart : 0, sleepEnd: p.sleepMs > 0 ? p.sleepEnd : 0,
    sleepSrc: p.sleepMs > 0 ? 'phone' : sleepMs ? 'check-in' : '',
    screen: hasScreen ? { screenMs: p.screenMs, freeMs: p.freeMs, awakeMs: p.awakeMs || 0, lateMs: p.lateMs || 0, unlocks: p.unlocks || 0,
      awakeFrom: p.awakeFrom, awakeTo: p.awakeTo, wakeSrc: p.wakeSrc, apps: p.apps || [], final: !!p.final } : null
  };
}

export function sleepVerdict(ms) {
  const h = ms / H;
  if (!ms) return '';
  if (h < SLEEP_SHORT_H) return 'very short';
  if (h < SLEEP_MIN_H) return 'short';
  if (h > SLEEP_MAX_H + 1) return 'long';
  return 'good';
}

// Minutes after noon, so times around midnight average correctly (11:30 PM and 12:30 AM -> midnight).
const fromNoon = (ms) => { const d = new Date(ms); return ((d.getHours() * 60 + d.getMinutes()) - 720 + 1440) % 1440; };
const fromMidnight = (ms) => { const d = new Date(ms); return d.getHours() * 60 + d.getMinutes(); };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const spread = (a) => { const m = mean(a); return a.length > 1 ? mean(a.map((x) => Math.abs(x - m))) : 0; };
export const minToClock = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60); return ((h % 12) || 12) + ':' + String(m % 60).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); };
export const dur = (ms) => { const m = Math.round((ms || 0) / 60000); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0') + ' min'; };

export const weekKeys = (ws) => weekDays(ws);
export function monthKeys(ym) {
  const [y, m] = ym.split('-').map(Number), out = [];
  for (let d = new Date(y, m - 1, 1); d.getMonth() === m - 1; d.setDate(d.getDate() + 1)) out.push(keyOf(d));
  return out;
}
export const monthOf = (k) => k.slice(0, 7);
export const monthLabel = (ym) => MONTH_NAMES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4);
export function shiftMonth(ym, n) { const d = new Date(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1); return keyOf(d).slice(0, 7); }

export function periodStats(keys) {
  const today = todayKey(), target = sleepTargetH();
  const recs = keys.filter((k) => k <= today).map(dayRecord).filter(Boolean);
  const nights = recs.filter((r) => r.sleepMs > 0);
  const hrs = nights.map((r) => r.sleepMs / H);
  const timed = nights.filter((r) => r.sleepStart && r.sleepEnd);
  const beds = timed.map((r) => fromNoon(r.sleepStart)), wakes = timed.map((r) => fromMidnight(r.sleepEnd));
  const sleep = {
    nights: nights.length, target,
    avgMs: mean(nights.map((r) => r.sleepMs)),
    inRange: hrs.filter((h) => h >= SLEEP_MIN_H && h <= SLEEP_MAX_H + 0.25).length,
    short: hrs.filter((h) => h < SLEEP_MIN_H).length,
    veryShort: hrs.filter((h) => h < SLEEP_SHORT_H).length,
    long: hrs.filter((h) => h > SLEEP_MAX_H + 1).length,
    debtMs: nights.reduce((a, r) => a + Math.max(0, target * H - r.sleepMs), 0),
    avgBed: beds.length ? minToClock(mean(beds) + 720) : '', avgWake: wakes.length ? minToClock(mean(wakes)) : '',
    bedSpread: Math.round(spread(beds)), wakeSpread: Math.round(spread(wakes)), timedNights: timed.length,
    best: nights.slice().sort((a, b) => b.sleepMs - a.sleepMs)[0] || null,
    worst: nights.slice().sort((a, b) => a.sleepMs - b.sleepMs)[0] || null
  };
  const sdays = recs.filter((r) => r.screen);
  const apps = {};
  sdays.forEach((r) => (r.screen.apps || []).forEach((a) => { apps[a.name] = (apps[a.name] || 0) + a.ms; }));
  const awake = mean(sdays.map((r) => r.screen.awakeMs));
  const screen = {
    days: sdays.length,
    avgScreen: mean(sdays.map((r) => r.screen.screenMs)), avgFree: mean(sdays.map((r) => r.screen.freeMs)),
    avgAwake: awake, avgLate: mean(sdays.map((r) => r.screen.lateMs)), lateDays: sdays.filter((r) => r.screen.lateMs >= 15 * 60000).length,
    avgUnlocks: mean(sdays.map((r) => r.screen.unlocks)),
    pct: awake ? Math.round(mean(sdays.map((r) => r.screen.screenMs)) / awake * 100) : 0,
    most: sdays.slice().sort((a, b) => b.screen.screenMs - a.screen.screenMs)[0] || null,
    least: sdays.slice().sort((a, b) => a.screen.screenMs - b.screen.screenMs)[0] || null,
    apps: Object.keys(apps).map((n) => ({ name: n, ms: apps[n] / sdays.length })).sort((a, b) => b.ms - a.ms).slice(0, 5)
  };
  return { keys, recs, sleep, screen, insights: insights(sleep, screen) };
}

function insights(sl, sc) {
  const out = [];
  if (sl.nights) {
    const avgH = sl.avgMs / H;
    if (avgH < SLEEP_MIN_H) out.push('Average sleep ' + dur(sl.avgMs) + ' is under 7 hours. Short sleep slows fat loss and muscle recovery. Aim for bed ' + Math.round((sl.target - avgH) * 60) + ' min earlier.');
    else out.push('Average sleep ' + dur(sl.avgMs) + ', inside the healthy 7 to 9 hours.');
    if (sl.short) out.push(sl.short + ' short ' + (sl.short === 1 ? 'night' : 'nights') + ' (under 7 h)' + (sl.veryShort ? ', ' + sl.veryShort + ' under 6 h' : '') + '. Sleep debt ' + dur(sl.debtMs) + ' against your ' + sl.target + ' h target.');
    if (sl.timedNights >= 3) {
      if (sl.bedSpread > 45) out.push('Bedtime moved around by about ' + sl.bedSpread + ' min on average. Regular times matter almost as much as hours: try the same bedtime every night, weekends too.');
      else out.push('Bedtime was steady (within about ' + sl.bedSpread + ' min). Keep it.');
    }
  }
  if (sc.days) {
    out.push('Screen time ' + dur(sc.avgScreen) + ' a day while awake, ' + sc.pct + '% of your waking hours. Phone-free ' + dur(sc.avgFree) + ' a day.');
    if (sc.lateDays) out.push('Phone used after bedtime on ' + sc.lateDays + ' ' + (sc.lateDays === 1 ? 'day' : 'days') + ' (' + dur(sc.avgLate) + ' a day on average). Screens before bed push sleep later: phone away 30 min before bed.');
    if (sc.apps[0]) out.push('Most time goes to ' + sc.apps[0].name + ' (' + dur(sc.apps[0].ms) + ' a day).');
  }
  return out;
}

// Plain text report for a week or a month.
export function sleepReportText(title, st) {
  const L = [title, ''];
  const s = st.sleep, c = st.screen;
  L.push('SLEEP (goal 7 to 9 h, target ' + s.target + ' h)');
  if (s.nights) {
    L.push('Average ' + dur(s.avgMs) + ' over ' + s.nights + ' nights. In range ' + s.inRange + ', short ' + s.short + ', sleep debt ' + dur(s.debtMs) + '.');
    if (s.avgBed) L.push('Usual bedtime ' + s.avgBed + ' (varies about ' + s.bedSpread + ' min), wake-up ' + s.avgWake + ' (varies about ' + s.wakeSpread + ' min).');
  } else L.push('No sleep recorded.');
  L.push('', 'SCREEN TIME (awake hours only)');
  if (c.days) {
    L.push('Screen ' + dur(c.avgScreen) + ' a day (' + c.pct + '% of waking hours), phone-free ' + dur(c.avgFree) + ', ' + Math.round(c.avgUnlocks) + ' unlocks a day.');
    if (c.lateDays) L.push('After bedtime on ' + c.lateDays + ' days, ' + dur(c.avgLate) + ' a day.');
    if (c.apps.length) L.push('Top apps: ' + c.apps.map((a) => a.name + ' ' + dur(a.ms)).join(', ') + ' (a day).');
  } else L.push('No screen time recorded (needs the Android app with Usage access).');
  L.push('', 'DAY BY DAY');
  st.recs.forEach((r) => {
    const d = fromKey(r.k);
    L.push('- ' + d.toDateString().slice(0, 10) + ': sleep ' + (r.sleepMs ? dur(r.sleepMs) : '-') +
      (r.screen ? ', screen ' + dur(r.screen.screenMs) + ', phone-free ' + dur(r.screen.freeMs) : ''));
  });
  if (st.insights.length) { L.push('', 'NOTES'); st.insights.forEach((t) => L.push('- ' + t)); }
  return L.join('\n');
}

export const planTimes = () => { const p = sleepPlan(); return p.bed + ' to ' + p.wake; };
export const lastDays = (n) => { const t = todayKey(), out = []; for (let i = n - 1; i >= 0; i--) out.push(addDays(t, -i)); return out; };
