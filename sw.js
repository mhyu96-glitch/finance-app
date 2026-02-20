const CACHE_NAME = 'finance-flow-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/accounts.html',
    '/analytics.html',
    '/budgets.html',
    '/ledger.html',
    '/services.html',
    '/strategy.html',
    '/style.css',
    '/src/js/main.js',
    '/src/js/ui.js',
    '/src/js/store.js',
    '/src/js/utils.js'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});
