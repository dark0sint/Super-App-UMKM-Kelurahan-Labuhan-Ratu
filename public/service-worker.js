const CACHE_NAME = 'umkm-labuhan-ratu-v1';
const APP_SHELL = [
  '/', '/index.html', '/login.html', '/keuangan.html', '/stok.html', '/kasir.html',
  '/katalog.html', '/marketplace.html', '/permodalan.html', '/perizinan.html',
  '/belajar.html', '/logistik.html', '/struk.html', '/toko.html',
  '/css/style.css', '/js/api.js', '/js/offline.js', '/js/auth-guard.js',
  '/manifest.json', '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strategi: API selalu coba network dulu (data harus fresh); app-shell/static pakai cache-first agar cepat & bisa offline.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')){
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ ok: false, offline: true, error: 'Sedang offline, data akan disinkron otomatis nanti.' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((resp) => {
        if (resp && resp.ok){
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return resp;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
