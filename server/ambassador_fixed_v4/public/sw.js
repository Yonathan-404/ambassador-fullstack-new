/* ══════════════════════════════════════════════════════════════
   Ambassador Shopping Mall — service worker
   Strategy:
     • app shell + icons/media  → cache-first (fast repeat loads, works offline)
     • /api/*                   → network-first, fall back to cache when offline
                                  so the directory still opens on a bad signal
     • never caches admin/seller/bms pages or POSTs
   Bump CACHE_VERSION whenever the shell changes so old caches are dropped.
═══════════════════════════════════════════════════════════════ */
const CACHE_VERSION = 'amb-v1';
const SHELL_CACHE = CACHE_VERSION + '-shell';
const DATA_CACHE  = CACHE_VERSION + '-data';

const SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-192.png',
  '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/media/bisinka-logo.png',
  '/media/hero-poster.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      // addAll rejects the whole batch if any single item 404s — add individually
      .then(c => Promise.all(SHELL_ASSETS.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(CACHE_VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // never touch POST/PUT
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // let CDNs handle themselves
  // staff tools must always be live — never serve them from cache
  if (/^\/(admin|seller|bms)\.html/.test(url.pathname)) return;

  // ── API: network-first, cache as offline fallback ──
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(DATA_CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // ── navigations: network-first so fresh data wins, shell as fallback ──
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('/').then(r => r || Response.error()))
    );
    return;
  }

  // ── static assets: cache-first, then fill the cache ──
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
