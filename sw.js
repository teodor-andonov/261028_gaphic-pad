// Scope isolates this app from other GitHub Pages apps on the same origin.
const PREFIX = `graphic-pad:${self.registration.scope}:`;
const CACHE = `${PREFIX}c41eb282fc9f352e`;
const shell = new URL('./index.html', self.registration.scope).href;
const assets = ['./index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png', './icons/icon.svg', './pwa-update.js']
  .map(path => new URL(path, self.registration.scope).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets)));
  // Updates wait for explicit approval from every open app window.
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)),
  )).then(() => self.clients.claim()));
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

/* TA PWA update worker v1. Append to sw.js (classic or module). */
(() => {
  let updating = false;
  self.addEventListener('message', event => {
    if (event.data?.type !== 'TA_UPDATE_APPLY') return;
    const reply = accepted => event.ports[0]?.postMessage({accepted});
    if (updating || !event.source?.url?.startsWith(self.registration.scope)) { reply(false); return; }
    updating = true;
    event.waitUntil((async () => {
      let windows = [];
      try {
        windows = (await self.clients.matchAll({type:'window',includeUncontrolled:true}))
          .filter(client => client.url.startsWith(self.registration.scope));
        if (!windows.length) { reply(false); return; }
        const ready = await Promise.all(windows.map(client => new Promise(resolve => {
          const channel = new MessageChannel();
          const timeout = setTimeout(() => { channel.port1.close(); resolve(false); },2000);
          channel.port1.onmessage = message => {
            clearTimeout(timeout); channel.port1.close(); resolve(message.data?.ready === true);
          };
          client.postMessage({type:'TA_UPDATE_PREPARE'},[channel.port2]);
        })));
        if (!ready.every(Boolean)) {
          windows.forEach(client => client.postMessage({type:'TA_UPDATE_CANCEL'}));
          reply(false); return;
        }
        reply(true);
        await self.skipWaiting();
      } catch {
        windows.forEach(client => client.postMessage({type:'TA_UPDATE_CANCEL'}));
        reply(false);
      } finally { updating = false; }
    })());
  });
})();
