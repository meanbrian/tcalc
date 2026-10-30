// Offline shell: the calculator works with no signal. Network first, cache as fallback.
const CACHE = 'tcalc-1.1.1';
// Keep this list in step with the files in public/js.
const JS = ['main', 'core', 'icons', 'timecode', 'field', 'history', 'calc', 'offset', 'convert', 'clips', 'time', 'timespan', 'settings', 'dev', 'privacy'].map((f) => `/js/${f}.js`);
const SHELL = ['/', '/index.html', '/styles.css', '/glass.css', ...JS, '/privacy.html', '/js/privacy-static.js', '/manifest.webmanifest', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(async () => (await caches.match(req)) || (req.mode === 'navigate' ? caches.match('/index.html') : Response.error()))
  );
});
