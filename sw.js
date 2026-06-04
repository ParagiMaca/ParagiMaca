const CACHE_NAME = 'paragimaca-cache-v2'; // Naikkan versi cache agar browser membuang cache lama
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './apps.js',
    './countdown_github.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Menyimpan kerangka aplikasi ke cache...');
            return cache.addAll(ASSETS_TO_CACHE);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Menghapus cache usang:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // PERBAIKAN UTAMA 1: Hanya intersepsi request dengan metode GET (Abaikan POST / PUT)
    if (event.request.method !== 'GET') {
        return; 
    }

    const requestUrl = new URL(event.request.url);

    // PERBAIKAN UTAMA 2: JANGAN intersepsi request ke API pihak ketiga (GitHub & ImgBB)
    // Ini memastikan upload data & sinkronisasi database tidak terhambat dan selalu mengambil data real-time!
    if (requestUrl.hostname.includes('github.com') || requestUrl.hostname.includes('imgbb.com')) {
        return; 
    }

    // PERBAIKAN UTAMA 3: Hanya intersepsi aset lokal milik website kita sendiri (Same-Origin)
    if (requestUrl.origin === self.location.origin) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    // Stale-While-Revalidate: Sembari menyajikan data cepat dari cache, lakukan update di background
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => { /* Abaikan jika luring */ });

                    return cachedResponse;
                }

                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        return networkResponse;
                    }

                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });

                    return networkResponse;
                });
            })
        );
    }
});
