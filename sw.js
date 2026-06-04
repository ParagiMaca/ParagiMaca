const CACHE_NAME = 'paragimaca-cache-v3'; // NAIKKAN KE V3: Wajib untuk memaksa browser membuang cache lama
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './apps.js',
    './countdown_github.html'
];

self.addEventListener('install', event => {
    // Memaksa service worker baru untuk langsung menginstal tanpa menunggu tab ditutup
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Menyimpan kerangka aplikasi ke cache (V3)...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    // Mengambil alih kontrol browser secara instan
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    // Hapus SEMUA cache lama yang bukan versi V3
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache usang:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // ABAIKAN TOTAL request ke luar (GitHub API, ImgBB, CDN Gambar). 
    // Biarkan browser yang menanganinya secara normal.
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    // STRATEGI BARU: NETWORK FIRST (Internet Dulu -> Baru Cache)
    // Ini menjamin Anda selalu melihat update codingan (HTML/CSS/JS) terbaru selama ada internet!
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                // Jika internet lancar, simpan/perbarui cache diam-diam
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // JIKA OFFLINE (Internet mati), barulah panggil file dari Cache
                console.log('[Service Worker] Offline, memuat dari cache:', event.request.url);
                return caches.match(event.request);
            })
    );
});