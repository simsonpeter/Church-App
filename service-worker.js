const APP_CACHE = "njc-app-cache-v134";
const RUNTIME_CACHE = "njc-runtime-cache-v134";

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=20260324u1",
    "./user-auth.js?v=20260324u3",
    "./app-shell.js?v=20260324u3",
    "./events-engine.js?v=20260318de",
    "./home-page.js?v=20260324u1",
    "./events-page.js?v=20260318de",
    "./sermons-page.js?v=20260323t1",
    "./bible-page.js?v=20260318de",
    "./songbook-page.js?v=20260318de",
    "./contact-page.js?v=20260318de",
    "./admin-trivia.js?v=20260320tr3",
    "./admin-dashboard-page.js?v=20260322a1",
    "./admin-mailbox-page.js?v=20260318de",
    "./profile-page.js?v=20260324u3",
    "./user-achievements-page.js?v=20260324u2",
    "./spa-router.js?v=20260324u1",
    "./site.webmanifest?v=20260318de",
    "./logo.png?v=20260318de",
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

self.addEventListener("message", function (event) {
    if (event && event.data && event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

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
    const isMantleDb = url.origin === "https://mantledb.sh";

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

    if (isSameOrigin || isRemoteData || isMantleDb) {
        event.respondWith(staleWhileRevalidate(event.request));
    }
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    const scopeBaseUrl = (self.registration && self.registration.scope)
        ? self.registration.scope
        : self.location.href;
    const targetUrl = (event.notification && event.notification.data && event.notification.data.url)
        ? new URL(event.notification.data.url, scopeBaseUrl).href
        : new URL("./index.html", scopeBaseUrl).href;

    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientsArr) {
            const normalizedScope = new URL(scopeBaseUrl).href;
            for (let i = 0; i < clientsArr.length; i += 1) {
                if (clientsArr[i].url === targetUrl && "focus" in clientsArr[i]) {
                    return clientsArr[i].focus();
                }
                if (clientsArr[i].url.indexOf(normalizedScope) === 0) {
                    if ("navigate" in clientsArr[i]) {
                        return clientsArr[i].navigate(targetUrl).then(function () {
                            return clientsArr[i].focus();
                        });
                    }
                    if ("focus" in clientsArr[i]) {
                        return clientsArr[i].focus();
                    }
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(targetUrl);
            }
            return null;
        })
    );
});
