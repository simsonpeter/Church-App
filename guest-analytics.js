(function () {
    var SESSION_KEY = "njc_guest_session_id_v1";
    var LEGACY_TRIVIA_KEY = "njc_trivia_guest_id_v1";
    var COLLECTION = "guestSessions";
    var WRITE_MIN_MS = 90000;
    var lastWriteAt = 0;
    var pendingRoute = "";
    var pendingModuleKey = "";

    function isGuestVisitor() {
        if (window.NjcAuth && typeof window.NjcAuth.isRegisteredMember === "function") {
            return !window.NjcAuth.isRegisteredMember();
        }
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            var u = window.NjcAuth.getUser();
            return !(u && u.uid && String(u.email || "").trim());
        }
        return true;
    }

    function randomSessionSuffix() {
        var part = String(Date.now()) + String(Math.floor(Math.random() * 1e9));
        return part.replace(/[^\w]/g, "").slice(-16) || String(Math.floor(Math.random() * 1e12));
    }

    function getOrCreateGuestSessionId() {
        try {
            var existing = String(window.localStorage.getItem(SESSION_KEY) || "").trim();
            if (!existing) {
                existing = String(window.localStorage.getItem(LEGACY_TRIVIA_KEY) || "").trim();
            }
            if (!existing) {
                existing = "g_" + randomSessionSuffix();
            }
            window.localStorage.setItem(SESSION_KEY, existing);
            window.localStorage.setItem(LEGACY_TRIVIA_KEY, existing);
            return existing;
        } catch (e) {
            return "g_" + randomSessionSuffix();
        }
    }

    function getFirestoreDb() {
        var fb = window.firebase;
        if (!fb || !fb.apps || !fb.apps.length || !fb.firestore) {
            return null;
        }
        try {
            return fb.firestore();
        } catch (e) {
            return null;
        }
    }

    function getTimeZone() {
        try {
            return String(Intl.DateTimeFormat().resolvedOptions().timeZone || "").trim().slice(0, 80);
        } catch (e) {
            return "";
        }
    }

    function getLocaleTag() {
        try {
            if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
                return String(window.NjcI18n.getLocale() || "").trim().slice(0, 32);
            }
        } catch (e2) {}
        return String(navigator.language || "").trim().slice(0, 32);
    }

    function getLanguageTag() {
        return String(navigator.language || "").trim().slice(0, 32);
    }

    function routeToModuleKey(route) {
        var r = String(route || "").trim().toLowerCase();
        if (!r || r === "home") {
            return "home";
        }
        if (window.NjcAppModules && window.NjcAppModules.ROUTE_TO_MODULE) {
            return window.NjcAppModules.ROUTE_TO_MODULE[r] || r;
        }
        return r;
    }

    function flushGuestAnalytics(force) {
        if (!isGuestVisitor()) {
            return;
        }
        var route = pendingRoute || "home";
        var moduleKey = pendingModuleKey || routeToModuleKey(route);
        var now = Date.now();
        if (!force && now - lastWriteAt < WRITE_MIN_MS) {
            return;
        }
        var db = getFirestoreDb();
        var fb = window.firebase;
        if (!db || !fb || !fb.firestore || !fb.firestore.FieldValue) {
            return;
        }
        var sessionId = getOrCreateGuestSessionId();
        if (!sessionId) {
            return;
        }
        var ts = fb.firestore.FieldValue.serverTimestamp();
        var inc = fb.firestore.FieldValue.increment(1);
        var timeZone = getTimeZone();
        var locale = getLocaleTag();
        var language = getLanguageTag();
        var lastRoute = String(route || "home").slice(0, 48);
        var docRef = db.collection(COLLECTION).doc(sessionId);
        var moduleField = "moduleHits." + moduleKey;
        lastWriteAt = now;
        docRef.update({
            sessionId: sessionId,
            lastSeenAt: ts,
            updatedAt: ts,
            timeZone: timeZone,
            locale: locale,
            language: language,
            lastRoute: lastRoute,
            pageViews: inc,
            [moduleField]: inc
        }).catch(function () {
            var hits = {};
            hits[moduleKey] = 1;
            return docRef.set({
                sessionId: sessionId,
                firstSeenAt: ts,
                lastSeenAt: ts,
                updatedAt: ts,
                timeZone: timeZone,
                locale: locale,
                language: language,
                lastRoute: lastRoute,
                pageViews: 1,
                moduleHits: hits
            });
        }).catch(function () {});
    }

    function queueRouteVisit(route) {
        if (!isGuestVisitor()) {
            return;
        }
        pendingRoute = String(route || "home").trim().toLowerCase() || "home";
        pendingModuleKey = routeToModuleKey(pendingRoute);
        flushGuestAnalytics(false);
    }

    document.addEventListener("njc:routechange", function (event) {
        var detail = event && event.detail ? event.detail : {};
        queueRouteVisit(detail.route || "home");
    });

    document.addEventListener("njc:authchange", function () {
        if (isGuestVisitor()) {
            queueRouteVisit(pendingRoute || "home");
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            flushGuestAnalytics(true);
        }
    });

    window.addEventListener("pagehide", function () {
        flushGuestAnalytics(true);
    });

    window.NjcGuestAnalytics = {
        isGuestVisitor: isGuestVisitor,
        getSessionId: getOrCreateGuestSessionId,
        routeToModuleKey: routeToModuleKey,
        flush: function () {
            flushGuestAnalytics(true);
        }
    };
})();
