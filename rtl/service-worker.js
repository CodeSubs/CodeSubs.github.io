const CACHE_NAME = 'rtl-subtitle-editor-v2';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.svg',
    './icon-512.svg',
    'https://unpkg.com/vue@3/dist/vue.global.js',
    'https://unpkg.com/@vueuse/shared',
    'https://unpkg.com/@vueuse/core'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS.map(url => new Request(url, { cache: 'reload' })));
            })
            .then(() => {
                return self.skipWaiting();
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') {
        return;
    }
    let url;
    try {
        url = new URL(event.request.url);
    } catch (e) {
        return;
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return;
    }
    const isNavigation = event.request.mode === 'navigate' || event.request.destination === 'document';
    const networkRequest = isNavigation
        ? new Request(event.request.url, { cache: 'no-store' })
        : event.request;
    event.respondWith(
        fetch(networkRequest)
            .then((response) => {
                if (response && (response.ok || response.type === 'opaque')) {
                    if (url.origin === self.location.origin) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => cache.put(event.request, responseToCache))
                            .catch(() => {});
                    }
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
