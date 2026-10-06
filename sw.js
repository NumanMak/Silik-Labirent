/* Silik — çevrimdışı çalışma: uygulama kabuğunu önbelleğe alır, arka planda günceller. */
const CACHE = 'silik-v3';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'js/util.js',
  'js/maze.js',
  'js/levels.js',
  'js/storage.js',
  'js/audio.js',
  'js/input.js',
  'js/game.js',
  'js/theme-common.js',
  'js/theme-forest.js',
  'js/theme-cave.js',
  'js/renderer.js',
  'js/app.js',
  'fonts/patrick-hand-latin.woff2',
  'fonts/patrick-hand-latin-ext.woff2',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// önce önbellek (anında açılış), arkadan ağdan tazele; çevrimdışıysa önbellek
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || caches.match('index.html'));
      return cached || net;
    })
  );
});
