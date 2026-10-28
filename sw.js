// Scope isolates this app from other GitHub Pages apps on the same origin.
const PREFIX = `graphic-pad:${self.registration.scope}:`;
const CACHE = `${PREFIX}d6f3de6b17fd71b7`;
const shell = new URL('./index.html', self.registration.scope).href;
const assets = ['./index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']
  .map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets)));
  // Keep new workers waiting while an existing editor window is open.
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)),
  )));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const isShell = url.origin === self.location.origin &&
    (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(shell).pathname);
  if (event.request.mode === 'navigate' && isShell) {
    // Keep each open editor on the shell belonging to its installed worker.
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(shell)) || fetch(event.request)));
  } else if (assets.includes(url.href)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request)) || fetch(event.request)));
  }
});
