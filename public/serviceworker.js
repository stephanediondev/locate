var VERSION = 'develop';
var CACHE_KEY_PREFIX = 'locate.';
var CACHE_KEY = CACHE_KEY_PREFIX + VERSION;
var CACHE_FILES = [
    '.',
    'manifest.webmanifest',
    'index.html',
    'app/icons/icon-16x16.png',
    'app/icons/icon-32x32.png',
    'app/icons/icon-128x128.png',
    'app/icons/icon-256x256.png',
    'app/icons/icon-512x512.png',
    'app_css.css',
    'app_js.js',
];

self.addEventListener('install', function(InstallEvent) {
    if('waitUntil' in InstallEvent) {
        InstallEvent.waitUntil(
            caches.open(CACHE_KEY).then(function(cache) {
                cache.addAll(CACHE_FILES);
            })
        );
    }
});

self.addEventListener('activate', function(ExtendableEvent) {
    if('waitUntil' in ExtendableEvent) {
        ExtendableEvent.waitUntil(
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if(cacheName !== CACHE_KEY) {
                            return caches.delete(cacheName);
                        }
                    })
                );
            }).then(function() {
                return self.clients.claim();
            })
        );
    }
});

self.addEventListener('fetch', function(FetchEvent) {
    if(FetchEvent.request.url.indexOf('/api/') === -1) {
        FetchEvent.respondWith(
            caches.match(FetchEvent.request).then(function(response) {
                if(response) {
                    return response;
                }
                return fetch(FetchEvent.request).then(function(response) {
                    return response;
                });
            })
        );
    }
});
