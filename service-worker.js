const APP_CACHE = "njc-app-cache-v16";
const RUNTIME_CACHE = "njc-runtime-cache-v16";

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=20260311k",
    "./app-shell.js?v=20260311k",
    "./events-engine.js?v=20260311k",
    "./home-page.js?v=20260311k",
    "./events-page.js?v=20260311k",
    "./sermons-page.js?v=20260311k",
    "./contact-page.js?v=20260311k",
    "./spa-router.js?v=20260311k",
    "./site.webmanifest?v=20260311k",
    "./logo.png?v=20260311k",
    "./announcements.json"
];

function isCacheableResponse(response) {
    return Boolean(response) && (response.ok || response.type === "opaque");
}

function staleWhileRevalidate(request) {
    return caches.match(request).then(function (cached) {
        const networkFetch = fetch(request)
            .then(function (response) {
                if (isCacheableResponse(response)) {
                    caches.open(RUNTIME_CACHE).then(function (cache) {
                        cache.put(request, response.clone());
                    });
                }
                return response;
            })
            .catch(function () {
                return cached;
            });
        return cached || networkFetch;
    });
}

self.addEventListener("install", function (event) {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then(function (cache) {
                return cache.addAll(CORE_ASSETS);
            })
            .then(function () {
                return self.skipWaiting();
            })
    );
});

self.addEventListener("activate", function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (key) {
                if (key !== APP_CACHE && key !== RUNTIME_CACHE) {
                    return caches.delete(key);
                }
                return null;
            }));
        }).then(function () {
            return self.clients.claim();
        })
    );
});

self.addEventListener("fetch", function (event) {
    if (!event.request || event.request.method !== "GET") {
        return;
    }

    const url = new URL(event.request.url);
    const isSameOrigin = url.origin === self.location.origin;
    const isRemoteData = url.origin === "https://raw.githubusercontent.com";

    if (event.request.mode === "navigate") {
        event.respondWith(
            fetch(event.request)
                .then(function (response) {
                    if (isCacheableResponse(response)) {
                        caches.open(RUNTIME_CACHE).then(function (cache) {
                            cache.put(event.request, response.clone());
                        });
                    }
                    return response;
                })
                .catch(function () {
                    return caches.match(event.request).then(function (cachedPage) {
                        return cachedPage || caches.match("./index.html");
                    });
                })
        );
        return;
    }

    if (isSameOrigin || isRemoteData) {
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const targetUrl = (event.notification && event.notification.data && event.notification.data.url)
        ? new URL(event.notification.data.url, self.location.origin).href
        : new URL("./index.html", self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientsArr) {
            for (let i = 0; i < clientsArr.length; i += 1) {
                if (clientsArr[i].url === targetUrl && "focus" in clientsArr[i]) {
                    return clientsArr[i].focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return null;
        })
    );
});
