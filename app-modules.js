(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ACCESS_DOC_ID = "access";
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

    var registrationPoolPublic = null;

    var userAccessState = {
        uid: "",
        tier: "legacy",
        grants: {},
        registrationPool: {},
        loaded: false
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

    function defaultSignupPool() {
        var o = {};
        ["prayer", "trivia", "dailyBread", "celebrations"].forEach(function (key) {
            o[key] = true;
        });
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(o, key)) {
                o[key] = false;
            }
        });
        return o;
    }

    function normalizeRegistrationPool(raw) {
        var base = {};
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            base[key] = false;
        });
        if (raw && typeof raw === "object") {
            Object.keys(DEFAULT_MODULES).forEach(function (key) {
                if (raw[key] === true) {
                    base[key] = true;
                }
            });
        }
        var any = Object.keys(base).some(function (k) {
            return base[k];
        });
        if (!any) {
            return defaultSignupPool();
        }
        return base;
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

    function getSignedInUid() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return "";
        }
        var u = window.NjcAuth.getUser();
        return u && u.uid ? String(u.uid) : "";
    }

    function resetUserAccessState() {
        userAccessState.uid = "";
        userAccessState.tier = "legacy";
        userAccessState.grants = {};
        userAccessState.registrationPool = {};
        userAccessState.loaded = false;
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

    function fetchRegistrationPoolOnly() {
        var db = getFirestoreDb();
        if (!db) {
            registrationPoolPublic = normalizeRegistrationPool(null);
            return Promise.resolve(registrationPoolPublic);
        }
        return db.collection(COLLECTION).doc(ACCESS_DOC_ID).get().then(function (snap) {
            var data = snap && snap.exists ? snap.data() : null;
            var pool = data && data.registrationPool && typeof data.registrationPool === "object"
                ? data.registrationPool
                : null;
            registrationPoolPublic = normalizeRegistrationPool(pool);
            return registrationPoolPublic;
        }).catch(function () {
            registrationPoolPublic = normalizeRegistrationPool(null);
            return registrationPoolPublic;
        });
    }

    function fetchUserAccessAndPool(uid) {
        var db = getFirestoreDb();
        var uidStr = uid ? String(uid) : "";
        var poolPromise = fetchRegistrationPoolOnly();

        if (!db) {
            return poolPromise.then(function (pool) {
                userAccessState.uid = uidStr;
                userAccessState.tier = "legacy";
                userAccessState.grants = {};
                userAccessState.registrationPool = pool;
                userAccessState.loaded = true;
                return userAccessState;
            });
        }

        var accessPromise = uidStr
            ? db.collection("users").doc(uidStr).collection("app").doc("access").get()
            : Promise.resolve({ exists: false });

        return Promise.all([accessPromise, poolPromise]).then(function (results) {
            var accessSnap = results[0];
            var pool = results[1];
            userAccessState.uid = uidStr;
            userAccessState.registrationPool = pool;
            if (!accessSnap || !accessSnap.exists) {
                userAccessState.tier = "legacy";
                userAccessState.grants = {};
                userAccessState.loaded = true;
                return userAccessState;
            }
            var d = accessSnap.data() || {};
            var tierRaw = String(d.accessTier || "").toLowerCase();
            if (tierRaw === "member") {
                userAccessState.tier = "member";
            } else if (tierRaw === "limited") {
                userAccessState.tier = "limited";
            } else {
                userAccessState.tier = "legacy";
            }
            userAccessState.grants = d.moduleGrants && typeof d.moduleGrants === "object" ? d.moduleGrants : {};
            userAccessState.loaded = true;
            return userAccessState;
        }).catch(function () {
            userAccessState.uid = uidStr;
            userAccessState.tier = "legacy";
            userAccessState.grants = {};
            userAccessState.registrationPool = normalizeRegistrationPool(null);
            userAccessState.loaded = true;
            return userAccessState;
        });
    }

    var inflightCombined = null;

    function refreshAppModules() {
        if (inflightCombined) {
            return inflightCombined;
        }
        inflightCombined = Promise.all([
            fetchModulesFromFirestore(),
            fetchUserAccessAndPool(getSignedInUid())
        ]).then(function (results) {
            inflightCombined = null;
            var mods = results[0];
            var next = mods || readCache() || cloneDefaults();
            writeCache(next);
            document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: { modules: next } }));
            document.dispatchEvent(new CustomEvent("njc:user-access-updated", { detail: Object.assign({}, userAccessState) }));
            return next;
        });
        return inflightCombined;
    }

    function getAppModulesSync() {
        var c = readCache();
        return c || cloneDefaults();
    }

    function getRegistrationPoolSync() {
        return registrationPoolPublic || normalizeRegistrationPool(null);
    }

    function getAccessSync() {
        return {
            uid: userAccessState.uid,
            tier: userAccessState.tier,
            grants: Object.assign({}, userAccessState.grants),
            registrationPool: Object.assign({}, userAccessState.registrationPool),
            loaded: userAccessState.loaded
        };
    }

    function isModuleEnabled(key) {
        var k = String(key || "").trim();
        if (!k || !Object.prototype.hasOwnProperty.call(DEFAULT_MODULES, k)) {
            return true;
        }
        var globalOn = getAppModulesSync()[k] !== false;
        var uid = getSignedInUid();
        if (!uid || !userAccessState.loaded || userAccessState.uid !== uid) {
            return globalOn;
        }
        if (userAccessState.tier === "member" || userAccessState.tier === "legacy") {
            return globalOn;
        }
        if (userAccessState.tier === "limited") {
            var pool = userAccessState.registrationPool || {};
            var grants = userAccessState.grants || {};
            return globalOn && pool[k] === true && grants[k] === true;
        }
        return globalOn;
    }

    function isRouteEnabled(route) {
        var r = String(route || "").trim().toLowerCase();
        var mod = ROUTE_TO_MODULE[r];
        if (!mod) {
            return true;
        }
        return isModuleEnabled(mod);
    }

    function ensureRegistrationPoolLoaded() {
        if (registrationPoolPublic && typeof registrationPoolPublic === "object") {
            return Promise.resolve(registrationPoolPublic);
        }
        return fetchRegistrationPoolOnly();
    }

    window.NjcAppModules = {
        DEFAULT_MODULES: DEFAULT_MODULES,
        ROUTE_TO_MODULE: ROUTE_TO_MODULE,
        normalizeModules: normalizeModules,
        normalizeRegistrationPool: normalizeRegistrationPool,
        getSync: getAppModulesSync,
        getRegistrationPoolSync: getRegistrationPoolSync,
        getAccessSync: getAccessSync,
        isModuleEnabled: isModuleEnabled,
        isRouteEnabled: isRouteEnabled,
        refresh: refreshAppModules,
        ensureRegistrationPoolLoaded: ensureRegistrationPoolLoaded,
        invalidateCache: function () {
            try {
                window.localStorage.removeItem(CACHE_KEY);
            } catch (e) {}
            registrationPoolPublic = null;
            resetUserAccessState();
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
