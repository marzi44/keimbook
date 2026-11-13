// Offline-Cache. Bei jeder neuen Version VERSION erhöhen, damit Geräte das Update laden.
// Eigener Präfix „keim-“: Die alte Adresse …/klassenbuch/ liegt auf derselben Domain und räumt nur ihre „kb-“-Caches auf.
const VERSION = 'keim-v37';
const FILES = [
  './', './index.html', './app.js', './style.css', './manifest.webmanifest',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('keim-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true })
      .then(r => r || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});
