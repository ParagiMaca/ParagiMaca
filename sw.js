const CACHE_NAME = 'paragimaca-cache-v4'; // Naik ke V4
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './apps.js',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('[Service Worker] Menyimpan cache aplikasi (V4)...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
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
        })
    );
});

self.addEventListener('fetch', event => {
    // Abaikan semua request POST (seperti upload ke ImgBB / GitHub API)
    if (event.request.method !== 'GET') return;

    const requestUrl = new URL(event.request.url);

    // Jangan cache request silang domain (ImgBB, GitHub, dll)
    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    // Strategi Network First
    event.respondWith(
        fetch(event.request)
            .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                console.log('[Service Worker] Memuat dari cache:', event.request.url);
                return caches.match(event.request);
            })
    );
});