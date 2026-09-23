// Planes OS Service Worker — stable PWA shell
const CACHE_NAME = 'planes-os-v17';
const APP_SHELL = [
  './',
  './index.html',
  './tv.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((key) => key === CACHE_NAME ? null : caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never cache API/auth/dynamic cross-origin traffic.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  const isHtml =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html');

  const isLiveAuthRuntime =
    url.pathname.endsWith('/auth-gate-live.js') ||
    url.pathname.endsWith('/legacy-auth-sanitizer-live.js') ||
    url.pathname.endsWith('/email-lifecycle-kick-live.js');
  if (isLiveAuthRuntime) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => (await caches.match(event.request)) || Response.error())
    );
    return;
  }

  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(async () => {
          return (await caches.match(event.request)) ||
                 (await caches.match('./index.html')) ||
                 Response.error();
        })
    );
    return;
  }

  const staticDestinations = new Set(['image', 'style', 'script', 'font']);
  const isStaticAsset =
    staticDestinations.has(event.request.destination) ||
    /\.(?:png|jpg|jpeg|webp|svg|ico|css|js|woff2?)$/i.test(url.pathname);

  if (!isStaticAsset) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      return cached || network;
    })
  );
});
