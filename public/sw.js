const CACHE_NAME = 'finance-flow-v2'; // Increment version to force update
const ASSETS = [
    './',
    './index.html',
    './accounts.html',
    './analytics.html',
    './budgets.html',
    './ledger.html',
    './services.html',
    './strategy.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Install Event
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('SW: Pre-caching core assets');
            return cache.addAll(ASSETS).catch(err => console.log('SW: Pre-cache failed (ignoring some assets)', err));
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => {
                    console.log('SW: Clearing old cache', key);
                    return caches.delete(key);
                })
            );
        })
    );
    self.clients.claim(); // Take control of all open clients immediately
});

// Fetch Event - Network First with Cache Fallback for same-origin assets
self.addEventListener('fetch', (event) => {
    // Only intercept same-origin requests
    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;

    if (!isSameOrigin) return; // Let cross-origin requests (CDN, Analytics) fail or succeed naturally

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // If the response is valid, clone it and save to cache
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache if network fails
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) return cachedResponse;

                    // Specific fallback for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('index.html');
                    }

                    return null; // Let it fail normally if not in cache
                });
            })
    );
});
