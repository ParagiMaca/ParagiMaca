const CACHE_NAME = 'paragimaca-cache-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './apps.js',
    './manga_data.json',
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
    if (event.request.url.startsWith(self.location.origin) || event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request).then(cachedResponse => {
                if (cachedResponse) {
                    fetch(event.request).then(networkResponse => {
                        if (networkResponse.status === 200) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                    }).catch(() => { /* Abaikan galat jaringan saat perangkat sedang offline */ });

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
                }).catch(() => {
                    console.log('[Service Worker] Perangkat luring dan aset tidak ditemukan di cache.');
                });
            })
        );
    }
});