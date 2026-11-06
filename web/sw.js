// Build replaces both placeholders. Scope-specific names protect other Pages apps.
const PREFIX = 'fivefold:' + new URL(self.registration.scope).pathname + ':';
const CACHE_NAME = PREFIX + '__CACHE_VERSION__';
const APP_FILES = __APP_FILES__;
const urls = APP_FILES.map(path => new URL(path, self.registration.scope).href);
const allowed = new Set(urls);
const entry = new URL('index.html', self.registration.scope).href;
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try { await cache.addAll(urls); }
    catch (error) { await caches.delete(CACHE_NAME); throw error; }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE_NAME) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  const navigation = event.request.mode === 'navigate' &&
    (url.pathname === new URL(self.registration.scope).pathname || url.pathname === new URL(entry).pathname);
  const key = navigation ? entry : url.href;
  if (!allowed.has(key)) return;
  // Serve one coherent cached build; updates install atomically in the background.
  // In-memory gameplay is uninterrupted; the next launch uses the updated build.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return (await cache.match(key)) || fetch(event.request);
  })());
});
