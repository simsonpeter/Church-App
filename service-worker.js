const APP_CACHE = "njc-app-cache-v245";
const RUNTIME_CACHE = "njc-runtime-cache-v245";

const CORE_ASSETS = [
    "./",
    "./index.html",
    "./styles.css?v=20260330lib4",
    "./user-auth.js?v=20260329u1",
    "./app-shell.js?v=20260330lib5",
    "./events-engine.js?v=20260318de",
    "./home-page.js?v=20260430dvfeat",
    "./events-page.js?v=20260414u2",
    "./sermons-page.js?v=20260324u1",
    "./bible-page.js?v=20260330bf8",
    "./songbook-page.js?v=20260325u4",
    "./contact-page.js?v=20260330pw1",
    "./daily-bread-page.js?v=20260330dbh2",
    "./admin-trivia.js?v=20260327bq1",
    "./admin-dashboard-page.js?v=20260330lib3",
    "./admin-extras.js?v=20260330lib1",
    "./admin-mailbox-page.js?v=20260318de",
    "./profile-page.js?v=20260327bq1",
    "./chat-page.js?v=20260330u1",
    "./spa-router.js?v=20260330lib1",
    "./books-page.js?v=20260330lib4",
    "./books.json?v=20260330lib4",
    "./achievement-bonus.js?v=20260324u1",
    "./user-achievements-page.js?v=20260327bq1",
    "./site.webmanifest?v=20260329m1",
    "./logo.png?v=20260318de",
    "./achievements-banner.jpg?v=20260411cb1",
    "./admin-banner.jpg?v=20260411cb1",
    "./announcements-banner.jpg?v=20260428img1",
    "./archive-banner.jpg?v=20260411cb1",
    "./bible-reader-banner.jpg?v=20260411cb1",
    "./chat-banner.jpg?v=20260411cb1",
    "./daily-verse-banner.jpg?v=20260411cb1",
    "./daily-bread-banner.jpg?v=20260330img1",
    "./events-banner.jpg?v=20260428ev1",
    "./mailbox-banner.jpg?v=20260411cb1",
    "./prayer-banner.jpg?v=20260329m1",
    "./reading-plan-banner.jpg?v=20260411cb1",
    "./sermons-banner.jpg?v=20260411cb1",
    "./settings-banner.jpg?v=20260411cb1",
    "./songbook-banner.jpg?v=20260411cb1",
    "./trivia-banner.jpg?v=20260411cb1",
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
    if (!event || !event.data) {
        return;
    }
    if (event.data.type === "SKIP_WAITING") {
        self.skipWaiting();
        return;
    }
    if (event.data.type === "GET_APP_CACHE_VERSION" && event.ports && event.ports[0]) {
        try {
            event.ports[0].postMessage({ type: "APP_CACHE_VERSION", version: APP_CACHE });
        } catch (e) {
            return null;
        }
    }
});

self.addEventListener("install", function (event) {
    // Do not call skipWaiting() here. If we did, the new worker would activate
    // immediately, controllerchange would fire, and the app would hide the
    // "Update available" dialog before the user taps "Update now". Activation
    // is triggered only by SKIP_WAITING from the page (see message listener).
    event.waitUntil(
        caches.open(APP_CACHE).then(function (cache) {
            return cache.addAll(CORE_ASSETS);
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
