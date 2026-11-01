/* Private journal: write or record to yourself, behind its own password (not the app PIN).
   Everything is encrypted on the phone with AES-GCM 256; the key comes from your password
   (PBKDF2, SHA-256, 600,000 rounds) and lives only in memory while the journal is open.
   Entries live in IndexedDB, outside the normal backup, and can be exported as an encrypted file.
   There is no password recovery: a forgotten password means the entries cannot be read. */
import { S, save } from './store.js';
import { esc, toast, download, todayKey } from './util.js';

const DB = 'fittrack-journal', STORE = 'entries', ROUNDS = 600000;
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (buf) => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export const J = { key: null, entries: null, recording: null, chunks: [], recStart: 0, draftAudio: null, mood: 0, timer: null, idle: null };
export const MOODS = [[1, 'Low'], [2, 'Meh'], [3, 'Okay'], [4, 'Good'], [5, 'Great']];

function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const t = d.transaction(STORE, mode), st = t.objectStore(STORE);
    const out = fn(st);
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
    t.onerror = () => rej(t.error);
  });
}

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ROUNDS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function seal(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return { iv: b64(iv), ct: b64(ct) };
}
async function open(key, box) {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
}

export const isSetUp = () => !!(S.settings.journal && S.settings.journal.salt);
export const isOpen = () => !!J.key;

export async function setUp(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(pw, salt);
  const check = await seal(key, enc.encode('fittrack-journal'));
  S.settings.journal = { salt: b64(salt), check, v: 1 };
  save();
  J.key = key; J.entries = [];
  touch();
}

export async function unlock(pw) {
  const j = S.settings.journal;
  const key = await deriveKey(pw, unb64(j.salt));
  try { await open(key, j.check); } catch (e) { return false; }
  J.key = key;
  await load();
  touch();
  return true;
}

export function lock() {
  J.key = null; J.entries = null; J.draftAudio = null; J.mood = 0;
  stopRecording(true);
  clearTimeout(J.idle);
}
// Locks by itself after 5 minutes without a tap.
export function touch() { clearTimeout(J.idle); J.idle = setTimeout(() => { if (J.key) { lock(); if (J.onLock) J.onLock(); } }, 5 * 60 * 1000); }

async function load() {
  const rows = await tx('readonly', (st) => st.getAll());
  const out = [];
  for (const r of rows || []) {
    try {
      const body = JSON.parse(dec.decode(await open(J.key, r.body)));
      out.push({ id: r.id, t: r.t, text: body.text || '', mood: body.mood || 0, audio: r.audio ? { mime: r.audio.mime, sec: r.audio.sec } : null });
    } catch (e) { /* written with another password: skip */ }
  }
  J.entries = out.sort((a, b) => b.t - a.t);
}

export async function addEntry(text) {
  const t = Date.now(), id = 'j' + t + Math.random().toString(36).slice(2, 6);
  const row = { id, t, body: await seal(J.key, enc.encode(JSON.stringify({ text, mood: J.mood }))) };
  if (J.draftAudio) {
    const buf = await J.draftAudio.blob.arrayBuffer();
    row.audio = Object.assign(await seal(J.key, buf), { mime: J.draftAudio.mime, sec: J.draftAudio.sec });
  }
  await tx('readwrite', (st) => st.put(row));
  J.entries.unshift({ id, t, text, mood: J.mood, audio: row.audio ? { mime: row.audio.mime, sec: row.audio.sec } : null });
  J.draftAudio = null; J.mood = 0;
  touch();
}

export async function deleteEntry(id) {
  await tx('readwrite', (st) => st.delete(id));
  J.entries = J.entries.filter((e) => e.id !== id);
}

export async function audioUrl(id) {
  const row = await tx('readonly', (st) => st.get(id));
  if (!row || !row.audio) return null;
  const buf = await open(J.key, row.audio);
  return URL.createObjectURL(new Blob([buf], { type: row.audio.mime || 'audio/webm' }));
}

/* ---------- voice notes ---------- */
export async function startRecording(onTick) {
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Voice recording is not available here.'); return false; }
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (e) { toast('Allow the microphone to record.'); return false; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  J.chunks = []; J.recording = rec; J.recStart = Date.now();
  rec.ondataavailable = (e) => { if (e.data && e.data.size) J.chunks.push(e.data); };
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop());
    if (!J.discard && J.chunks.length) J.draftAudio = { blob: new Blob(J.chunks, { type: rec.mimeType || 'audio/webm' }), mime: rec.mimeType || 'audio/webm', sec: Math.round((Date.now() - J.recStart) / 1000) };
    J.discard = false; J.recording = null; clearInterval(J.timer);
    if (J.onChange) J.onChange();
  };
  rec.start(1000);
  J.timer = setInterval(() => { touch(); if (onTick) onTick(Math.round((Date.now() - J.recStart) / 1000)); if (Date.now() - J.recStart > 10 * 60 * 1000) stopRecording(); }, 1000);
  return true;
}
export function stopRecording(discard) {
  if (!J.recording) return;
  J.discard = !!discard;
  try { J.recording.stop(); } catch (e) { /* already stopped */ }
}

/* ---------- encrypted export / import ---------- */
export async function exportAll() {
  const rows = await tx('readonly', (st) => st.getAll());
  const file = JSON.stringify({ app: 'fittrack-journal', v: 1, salt: S.settings.journal.salt, check: S.settings.journal.check, rows });
  download('fittrack-journal-' + todayKey() + '.json', file, 'application/json');
}
export async function importFile(text) {
  const f = JSON.parse(text);
  if (f.app !== 'fittrack-journal' || !Array.isArray(f.rows)) throw new Error('not a journal file');
  if (f.salt !== S.settings.journal.salt) throw new Error('different password');
  await tx('readwrite', (st) => { f.rows.forEach((r) => st.put(r)); });
  await load();
  return f.rows.length;
}

export async function wipe() {
  await tx('readwrite', (st) => st.clear());
  delete S.settings.journal; save();
  lock();
}

/* ---------- screen ---------- */
const fmtWhen = (t) => {
  const d = new Date(t), h = d.getHours();
  return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ', ' + ((h % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (h < 12 ? ' AM' : ' PM');
};
const mmss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

export function journalHtml() {
  const head = '<div class="eyebrow">Private</div><h1>Journal</h1>';
  if (!isSetUp()) {
    return head + '<div class="card jcard"><p>Your own space to talk to yourself. Write or record voice notes. It has its <b>own password</b>, separate from the app PIN, and everything is encrypted on this phone.</p>' +
      '<label class="jfield">New password<input type="password" id="j-pw1" autocomplete="new-password" minlength="4" placeholder="At least 4 characters"></label>' +
      '<label class="jfield">Same again<input type="password" id="j-pw2" autocomplete="new-password"></label>' +
      '<button type="button" class="primary wide" data-action="j-setup">Create journal</button>' +
      '<p class="muted small">There is no way to recover a forgotten password. Not even I can open it. Write it somewhere safe.</p></div>';
  }
  if (!isOpen()) {
    return head + '<div class="card jcard"><p class="muted">Locked.</p>' +
      '<label class="jfield">Journal password<input type="password" id="j-pw" autocomplete="current-password"></label>' +
      '<button type="button" class="primary wide" data-action="j-unlock">Open</button></div>';
  }
  const rec = J.recording, draft = J.draftAudio;
  const composer = '<div class="card jcard"><textarea id="j-text" rows="5" placeholder="How are you, really? Say it here.">' + esc(J.draftText || '') + '</textarea>' +
    '<div class="jmoods"><span class="muted small">Mood</span><span class="segs">' + MOODS.map((m) => '<button type="button" class="seg' + (J.mood === m[0] ? ' on' : '') + '" data-action="j-mood" data-v="' + m[0] + '">' + m[1] + '</button>').join('') + '</span></div>' +
    '<div class="jrec">' + (rec
      ? '<button type="button" class="danger" data-action="j-rec-stop">Stop <span id="j-rec-t">' + mmss(Math.round((Date.now() - J.recStart) / 1000)) + '</span></button><button type="button" class="quiet" data-action="j-rec-cancel">Cancel</button>'
      : draft ? '<span class="jdraft">Voice note ' + mmss(draft.sec) + ' ready</span><button type="button" class="quiet" data-action="j-rec-cancel">Remove</button>'
        : '<button type="button" class="ghost" data-action="j-rec">Record voice</button>') + '</div>' +
    '<button type="button" class="primary wide" data-action="j-save"' + (rec ? ' disabled' : '') + '>Save entry</button></div>';
  const list = (J.entries || []).map((e) => '<li class="card jentry"><div class="jmeta"><span>' + fmtWhen(e.t) + '</span>' + (e.mood ? '<span class="jmood m' + e.mood + '">' + MOODS[e.mood - 1][1] + '</span>' : '') + '</div>' +
    (e.text ? '<p>' + esc(e.text).replace(/\n/g, '<br>') + '</p>' : '') +
    (e.audio ? '<div class="jaudio" id="ja-' + e.id + '"><button type="button" class="chip" data-action="j-play" data-id="' + e.id + '">Play voice note, ' + mmss(e.audio.sec || 0) + '</button></div>' : '') +
    '<button type="button" class="linkbtn jdel" data-action="j-del" data-id="' + e.id + '">' + (J.delArm === e.id ? 'Tap again to delete' : 'Delete') + '</button></li>').join('');
  return head + composer + '<h2>Entries <span class="h-note">' + (J.entries || []).length + '</span></h2>' + (list ? '<ul class="list">' + list + '</ul>' : '<p class="muted">Nothing yet.</p>') +
    '<div class="actions"><button type="button" class="ghost" data-action="j-lock">Lock journal</button><button type="button" class="ghost" data-action="j-export">Export (encrypted)</button>' +
    '<label class="ghost filebtn">Import<input type="file" id="j-import" accept="application/json,.json" hidden></label>' +
    '<button type="button" class="danger" data-action="j-wipe">' + (J.wipeArm ? 'Tap again: erase journal' : 'Erase journal') + '</button></div>' +
    '<p class="muted small">Locks itself after 5 minutes or when you leave this tab. Not part of the normal backup: use Export, and keep the same password to import.</p>';
}
