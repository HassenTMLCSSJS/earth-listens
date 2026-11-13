const CACHE = 'earth-listens-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  const path = url.pathname;
  if (
    path.startsWith('/_next/static/') ||
    path.startsWith('/textures/') ||
    path.startsWith('/frames/') ||
    path.startsWith('/ramps/') ||
    path.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(event.request));
  }
});
