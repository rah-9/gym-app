/* Service worker: makes the installed app work offline, shows notifications,
   and runs the rest countdown so "Rest over" arrives even with the screen off. */
const CACHE = 'gymlog-v5';
const SHELL = [
  '/', '/styles.css', '/manifest.webmanifest', '/icon.svg',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/badge-96.png',
  '/js/main.js', '/js/data.js', '/js/util.js', '/js/store.js', '/js/plan.js',
  '/js/report.js', '/js/notify.js', '/js/timer.js', '/js/lock.js', '/js/views.js'
];

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first so updates show up straight away; the cache is the offline fallback.
self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  ev.respondWith(
    fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? '/' : req, copy));
      }
      return res;
    }).catch(() => caches.match(req.mode === 'navigate' ? '/' : req).then((hit) => hit || Response.error()))
  );
});

/* ---------- rest timer ---------- */
const rest = { token: 0, end: 0, name: '', running: false, icon: '', badge: '' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clock = (ms) => { const d = new Date(ms); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const mmss = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

function windows() { return self.clients.matchAll({ type: 'window', includeUncontrolled: true }); }
function tellPage(msg) { return windows().then((list) => list.forEach((c) => c.postMessage(msg))); }
function closeTag(tag) { return self.registration.getNotifications({ tag }).then((l) => l.forEach((n) => n.close())); }

function showRunning() {
  const secs = Math.max(0, Math.round((rest.end - Date.now()) / 1000));
  return self.registration.showNotification('Resting ' + mmss(secs) + ' · next set at ' + clock(rest.end), {
    tag: 'rest', body: rest.name || 'Rest', icon: rest.icon, badge: rest.badge,
    silent: true, renotify: false, data: { url: '/', end: rest.end, name: rest.name },
    actions: [{ action: 'add15', title: '+15 s' }, { action: 'skip', title: 'Skip' }]
  });
}

async function countdown(token) {
  rest.running = true;
  while (rest.token === token && Date.now() < rest.end) await sleep(Math.min(1000, rest.end - Date.now()));
  if (rest.token !== token) return;
  rest.running = false;
  // If the app is on screen it beeps by itself; only use the panel when it is not.
  const list = await windows();
  if (list.some((c) => c.visibilityState === 'visible')) return closeTag('rest');
  return self.registration.showNotification('Rest over. Next set.', {
    tag: 'rest', body: rest.name || '', icon: rest.icon, badge: rest.badge,
    silent: false, renotify: true, vibrate: [200, 100, 200, 100, 200], data: { url: '/' }
  });
}

function startCountdown(ev) {
  const token = ++rest.token;
  ev.waitUntil(showRunning().then(() => countdown(token)));
}

self.addEventListener('message', (ev) => {
  const m = ev.data || {};
  if (m.type === 'rest-start') {
    Object.assign(rest, { end: m.end, name: m.name || '', icon: m.icon || rest.icon, badge: m.badge || rest.badge });
    startCountdown(ev);
  } else if (m.type === 'rest-sync') {
    rest.end = m.end;
    if (rest.running) ev.waitUntil(showRunning());
    else startCountdown(ev);
  } else if (m.type === 'rest-stop') {
    rest.token++;
    rest.running = false;
    ev.waitUntil(closeTag('rest'));
  }
});

/* ---------- taps on notifications ---------- */
self.addEventListener('notificationclick', (ev) => {
  const n = ev.notification;
  if (ev.action === 'add15') {
    // The worker may have restarted since the timer began, so fall back to the time saved on the notification.
    const base = rest.running ? rest.end : ((n.data && n.data.end) || Date.now());
    rest.end = Math.max(base, Date.now()) + 15000;
    if (!rest.name && n.data) rest.name = n.data.name || '';
    ev.waitUntil(tellPage({ type: 'rest-sync', end: rest.end }).then(() => {
      if (rest.running) return showRunning();
      const token = ++rest.token;
      return showRunning().then(() => countdown(token));
    }));
    return;
  }
  if (ev.action === 'skip') {
    rest.token++;
    rest.running = false;
    n.close();
    ev.waitUntil(tellPage({ type: 'rest-cancel' }));
    return;
  }
  n.close();
  ev.waitUntil(windows().then((list) => {
    const open = list.find((c) => 'focus' in c);
    return open ? open.focus() : self.clients.openWindow((n.data && n.data.url) || '/');
  }));
});
