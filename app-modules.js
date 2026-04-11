(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var CACHE_KEY = "njc_app_modules_cache_v1";
    var CACHE_MS = 120000;

    var DEFAULT_MODULES = {
        announcements: true,
        bibleReading: true,
        dailyVerse: true,
        trivia: true,
        eventsWeek: true,
        dailyBread: true,
        bookShelf: true,
        bible: true,
        songbook: true,
        prayer: true,
        events: true,
        sermons: true,
        contact: true,
        celebrations: true,
        chat: true,
        userAchievements: true
    };

    var ROUTE_TO_MODULE = {
        prayer: "prayer",
        events: "events",
        sermons: "sermons",
        contact: "contact",
        bible: "bible",
        songbook: "songbook",
        "book-shelf": "bookShelf",
        "daily-bread": "dailyBread",
        trivia: "trivia",
        "user-achievements": "userAchievements",
        chat: "chat",
        celebrations: "celebrations"
    };

    function cloneDefaults() {
        return Object.assign({}, DEFAULT_MODULES);
    }

    function isBool(v) {
        return v === true || v === false;
    }

    function normalizeModules(raw) {
        var out = cloneDefaults();
        if (!raw || typeof raw !== "object") {
            return out;
        }
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            if (isBool(raw[key])) {
                out[key] = raw[key];
            }
        });
        return out;
    }

    function readCache() {
        try {
            var raw = window.localStorage.getItem(CACHE_KEY);
            if (!raw) {
                return null;
            }
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== "object") {
                return null;
            }
            var at = Number(parsed.at);
            if (!Number.isFinite(at) || Date.now() - at > CACHE_MS) {
                return null;
            }
            return normalizeModules(parsed.modules);
        } catch (e) {
            return null;
        }
    }

    function writeCache(modules) {
        try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify({
                at: Date.now(),
                modules: modules
            }));
        } catch (e) {}
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

    function fetchModulesFromFirestore() {
        var db = getFirestoreDb();
        if (!db) {
            return Promise.resolve(null);
        }
        return db.collection(COLLECTION).doc(DOC_ID).get().then(function (snap) {
            if (!snap || !snap.exists) {
                return cloneDefaults();
            }
            var data = snap.data();
            var flags = data && data.flags && typeof data.flags === "object" ? data.flags : data;
            return normalizeModules(flags);
        }).catch(function () {
            return null;
        });
    }

    var inflight = null;

    function refreshAppModules() {
        if (inflight) {
            return inflight;
        }
        inflight = fetchModulesFromFirestore().then(function (mods) {
            inflight = null;
            var next = mods || readCache() || cloneDefaults();
            writeCache(next);
            document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: { modules: next } }));
            return next;
        });
        return inflight;
    }

    function getAppModulesSync() {
        var c = readCache();
        return c || cloneDefaults();
    }

    function isModuleEnabled(key) {
        var k = String(key || "").trim();
        if (!k || !Object.prototype.hasOwnProperty.call(DEFAULT_MODULES, k)) {
            return true;
        }
        return getAppModulesSync()[k] !== false;
    }

    function isRouteEnabled(route) {
        var r = String(route || "").trim().toLowerCase();
        var mod = ROUTE_TO_MODULE[r];
        if (!mod) {
            return true;
        }
        return isModuleEnabled(mod);
    }

    window.NjcAppModules = {
        DEFAULT_MODULES: DEFAULT_MODULES,
        ROUTE_TO_MODULE: ROUTE_TO_MODULE,
        normalizeModules: normalizeModules,
        getSync: getAppModulesSync,
        isModuleEnabled: isModuleEnabled,
        isRouteEnabled: isRouteEnabled,
        refresh: refreshAppModules,
        invalidateCache: function () {
            try {
                window.localStorage.removeItem(CACHE_KEY);
            } catch (e) {}
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        var cached = readCache();
        if (cached) {
            document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: { modules: cached } }));
        }
        refreshAppModules();
    });

    document.addEventListener("njc:authchange", function () {
        window.NjcAppModules.invalidateCache();
        refreshAppModules();
    });
})();
