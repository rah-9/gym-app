/* All saved data: one state object in localStorage, mirrored to an IndexedDB vault
   and a second localStorage snapshot so a cleared cache can be recovered. */
import { LEGACY_SCHEDULE, SCHEDULE, WORKOUTS } from './data.js';
import { keyOf, todayKey, dow, toast } from './util.js';

const KEY = 'gymlog.v1';
const AUTOBACKUP_KEY = 'gymlog.autobackup';
const IDB_NAME = 'gymlog_vault';
const IDB_STORE = 'backups';

/* The one shared state object. Modules import it and read/write fields on it.
   It is never reassigned, so restores go through replaceState(). */
export const S = { days: {}, body: {}, settings: {} };

const hasDays = (s) => !!(s && s.days && Object.keys(s.days).length);

// True once anything workout-related was ticked or typed on a day.
export function dayHasProgress(d) {
  if (!d) return false;
  return Object.values(d.done || {}).some(Boolean) ||
    Object.values(d.sets || {}).some((a) => (a || []).some(Boolean)) ||
    Object.values(d.kg || {}).some((v) => parseFloat(v) > 0);
}

// Fill missing fields and stamp each day with the workout it belongs to.
// Old days (saved before stamps existed) get the old week; today and later
// with nothing ticked get the current week.
function normalize(src) {
  const s = { days: src.days || {}, body: src.body || {}, settings: src.settings || {} };
  const own = s.settings.schedule;
  const week = Array.isArray(own) && own.length === 7 && own.every((k) => WORKOUTS[k]) ? own : SCHEDULE;
  const today = todayKey();
  Object.keys(s.days).forEach((k) => {
    const d = s.days[k];
    if (!d || d.plan) return;
    d.plan = k >= today && !dayHasProgress(d) ? week[dow(k)] : LEGACY_SCHEDULE[dow(k)];
  });
  return s;
}

export function replaceState(src) {
  const s = normalize(src);
  S.days = s.days; S.body = s.body; S.settings = s.settings;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.days) return replaceState(s);
  } catch (e) { /* ignore */ }
  replaceState({});
}
load();

function writeMain() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); return true; }
  catch (e) { return false; }
}

/* ---------- IndexedDB vault ---------- */
let idb = null;
function openVault() {
  if (idb) return Promise.resolve(idb);
  if (!window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      };
      req.onsuccess = (ev) => { idb = ev.target.result; resolve(idb); };
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

function vaultPut(id, payload) {
  return openVault().then((db) => new Promise((resolve) => {
    if (!db) return resolve(false);
    try {
      const tx = db.transaction([IDB_STORE], 'readwrite');
      tx.objectStore(IDB_STORE).put({ id, timestamp: Date.now(), date: todayKey(), payload });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch (e) { resolve(false); }
  }));
}

function vaultGet(id) {
  return openVault().then((db) => new Promise((resolve) => {
    if (!db) return resolve(null);
    try {
      const req = db.transaction([IDB_STORE], 'readonly').objectStore(IDB_STORE).get(id);
      req.onsuccess = () => resolve(req.result ? req.result.payload : null);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  }));
}

function snapshot(reason) {
  return { timestamp: Date.now(), dateKey: todayKey(), reason: reason || 'auto', state: JSON.parse(JSON.stringify(S)) };
}

function mirror(reason) {
  if (!hasDays(S)) return null;
  const snap = snapshot(reason);
  vaultPut('latest', snap);
  try { localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify(snap)); } catch (e) { /* ignore */ }
  return snap;
}

/* ---------- public API ---------- */
let mirrorTimer = null;

// Saves right away; the backup copy follows half a second later so typing stays smooth.
export function save() {
  if (!writeMain()) toast('Could not save on this browser. Check private mode.');
  clearTimeout(mirrorTimer);
  mirrorTimer = setTimeout(() => mirror('auto'), 500);
}

export function backupNow(reason) {
  const snap = mirror(reason || 'manual');
  if (!snap) return false;
  vaultPut('daily_' + todayKey(), snap);
  S.settings.lastAutoBackup = snap.timestamp;
  writeMain();
  return true;
}

// Called every 30 s and when the app comes back: one dated backup a day, plus one after 9 PM.
export function checkBackupSchedule() {
  if (!hasDays(S)) return;
  const last = S.settings.lastAutoBackup || 0;
  const hoursSince = (Date.now() - last) / 36e5;
  const newDay = !last || keyOf(new Date(last)) !== todayKey();
  if (hoursSince >= 12 || (new Date().getHours() >= 21 && newDay) || !last) backupNow('nightly');
}

function readSnapshot() {
  return vaultGet('latest').then((snap) => {
    if (hasDays(snap && snap.state)) return { snap, src: 'browser vault' };
    try {
      const raw = JSON.parse(localStorage.getItem(AUTOBACKUP_KEY));
      if (hasDays(raw && raw.state)) return { snap: raw, src: 'local backup' };
    } catch (e) { /* ignore */ }
    return null;
  });
}

// On startup: if the main data is gone but a backup exists, bring it back.
export function autoRestore() {
  if (hasDays(S)) { checkBackupSchedule(); return Promise.resolve(false); }
  return readSnapshot().then((found) => {
    if (!found) return false;
    replaceState(found.snap.state);
    save();
    toast('Auto-restored your data from ' + found.src + ' (' + (found.snap.dateKey || 'recent') + ')');
    return true;
  });
}

// Manual restore from the Plan tab, after the user confirms.
export function restoreLatest(confirmFn) {
  return readSnapshot().then((found) => {
    if (!found) return { ok: false, reason: 'none' };
    const count = Object.keys(found.snap.state.days).length;
    if (!confirmFn(found.snap.dateKey || 'recent', count)) return { ok: false, reason: 'cancel' };
    replaceState(found.snap.state);
    save();
    return { ok: true, count };
  });
}

export function importBackup(text) {
  const s = JSON.parse(text);
  if (!s || typeof s.days !== 'object') throw new Error('not a backup');
  replaceState(s);
  save();
}

export const exportBackup = () => JSON.stringify(S, null, 2);

export function wipeAll() {
  clearTimeout(mirrorTimer);
  replaceState({});
  writeMain();
  try { localStorage.removeItem(AUTOBACKUP_KEY); } catch (e) { /* ignore */ }
  vaultPut('latest', null);
}

export function requestPersistentStorage() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* ignore */ }
}
