const CACHE_NAME = 'finance-flow-v1';
const ASSETS = [
    './',
    'index.html',
    'accounts.html',
    'analytics.html',
    'budgets.html',
    'ledger.html',
    'services.html',
    'strategy.html',
    'style.css',
    'src/js/main.js',
    'src/js/ui.js',
    'src/js/store.js',
    'src/js/utils.js',
    'src/js/translations.js',
    'src/js/charts.js',
    'src/js/pages/dashboard.js',
    'src/js/pages/analytics.js',
    'src/js/pages/budgets.js',
    'src/js/pages/accounts.js',
    'src/js/pages/ledger.js',
    'src/js/pages/strategy.js',
    'src/js/pages/services.js',
    'src/js/pages/gamification.js',
    'src/js/pages/onboarding.js',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600&display=swap',
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    'https://cdn.tailwindcss.com?plugins=forms,typography,container-queries',
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
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
