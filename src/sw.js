// ===========================================================================
// OBS Blade Web — Progressive Web App (PWA) Service Worker
// Subfolder-safe for IIS subsite deployment & root Node hosting
// ===========================================================================

const CACHE_NAME = 'obs-blade-v4';

const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './config.js',
  './obs-websocket-js.js',
  './app.js',
  './obs-properties-builder.js',
  './pwa.js',
  './manifest.json',
  './icon.svg',
  './icon-maskable.svg',
  './favicon.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Non-blocking asset precache notice:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Only handle same-origin requests within this app's subfolder scope
  if (url.origin !== self.location.origin) return;

  const basePath = new URL('./', self.location.href).pathname;
  if (!url.pathname.startsWith(basePath)) return;

  // 1. Bypass Service Worker for APIs, uploads, file-browser, and WebSocket endpoints
  if (
    url.pathname.includes('/api/') ||
    url.pathname.includes('/uploads/') ||
    url.pathname.includes('/file-browser') ||
    url.pathname.endsWith('/obs-ws') ||
    url.pathname.endsWith('/obs-real-ws')
  ) {
    return;
  }

  // 2. Network-first with cache fallback for HTML navigation requests
  if (
    event.request.mode === 'navigate' ||
    url.pathname === basePath ||
    url.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('./index.html').then((indexRes) => {
              return indexRes || caches.match('./');
            });
          });
        })
    );
    return;
  }

  // 3. Network-first with cache fallback for CSS, JS, and Manifest to ensure instant updates
  if (
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('manifest.json')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 4. Cache-first strategy for static icons, images, and fonts
  if (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 5. Default: Network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
