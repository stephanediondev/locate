var LOG_ENABLED = true;
var FETCH_IN_CACHE = false;
var FETCH_EXCLUDE = [
];
var VERSION = '1.1';
var CACHE_KEY = 'gm-v' + VERSION;
var CACHE_FILES = [
    '.',
    'manifest.json',
    'index.html',
    'app/icons/icon-32x32.png',
    'app/icons/icon-192x192.png',
    'app/icons/icon-512x512.png',
];

self.addEventListener('install', function(InstallEvent) {
    sendLog(InstallEvent);

    self.skipWaiting();

    if('waitUntil' in InstallEvent) {
        InstallEvent.waitUntil(function() {
            cacheAddAll();
        });
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
    sendLog(FetchEvent);

    var fetchAllowed = true;
    FETCH_EXCLUDE.forEach(function(item, i) {
        if(FetchEvent.request.url.indexOf(item) !== -1) {
            fetchAllowed = false;
        }
    });

    if(fetchAllowed) {
        FetchEvent.respondWith(
            caches.open(CACHE_KEY).then(function(cache) {
                return cache.match(FetchEvent.request).then(function(Response) {
                    if(Response) {
                        sendLog(Response);
                        return Response;
                    }
                    return fetch(FetchEvent.request).then(function(Response) {
                        sendLog(Response);
                        if(FETCH_IN_CACHE) {
                            cache.put(FetchEvent.request, Response.clone());
                        }
                        return Response;
                    });
                });
            })
        );
    }
});

function cacheAddAll() {
    caches.delete(CACHE_KEY);
    return caches.open(CACHE_KEY).then(function(cache) {
        return cache.addAll(CACHE_FILES);
    });
}

function sendLog(log) {
    if(LOG_ENABLED) {
        console.log(log);
    }
}
