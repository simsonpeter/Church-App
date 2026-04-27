(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ACCESS_DOC_ID = "access";
    var USER_ACCESS_COLLECTION = "userAccess";
    var CACHE_KEY = "njc_app_modules_cache_v2";
    var CACHE_MS = 120000;
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";

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

    var lastGlobalFlags = null;
    var lastEffectiveFlags = null;
    var lastUserAccess = null;
    var lastUserAccessUid = "";

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

    function normalizeAllowedModuleList(raw) {
        if (!Array.isArray(raw)) {
            return [];
        }
        var seen = {};
        var out = [];
        raw.forEach(function (item) {
            var k = String(item || "").trim();
            if (!k || seen[k] || !Object.prototype.hasOwnProperty.call(DEFAULT_MODULES, k)) {
                return;
            }
            seen[k] = true;
            out.push(k);
        });
        return out.slice(0, 40);
    }

    function normalizeUserAccessDoc(data) {
        var src = data && typeof data === "object" ? data : {};
        var at = String(src.accessType || "church").trim().toLowerCase();
        return {
            accessType: at === "limited" ? "limited" : "church",
            allowedModules: normalizeAllowedModuleList(src.allowedModules)
        };
    }

    function getLocalProfileForUid(uid) {
        var id = String(uid || "").trim();
        if (!id) {
            return {};
        }
        try {
            var raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            var map = parsed && typeof parsed === "object" ? parsed : {};
            var p = map[id];
            return p && typeof p === "object" ? p : {};
        } catch (e) {
            return {};
        }
    }

    function isRegisteredWithEmail() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return false;
        }
        var u = window.NjcAuth.getUser();
        var email = String(u && u.email || "").trim();
        return Boolean(u && u.uid && email);
    }

    function getSignedInUid() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return "";
        }
        var u = window.NjcAuth.getUser();
        return String(u && u.uid || "").trim();
    }

    function resetUserAccessState() {
        userAccessState.uid = "";
        userAccessState.tier = "legacy";
        userAccessState.grants = {};
        userAccessState.registrationPool = {};
        userAccessState.loaded = false;
    }

    function getGrantModuleKeys(uid, topLevelUserAccess) {
        var id = String(uid || "").trim();
        if (!id || !isRegisteredWithEmail()) {
            return [];
        }
        var ua = topLevelUserAccess && typeof topLevelUserAccess === "object" ? normalizeUserAccessDoc(topLevelUserAccess) : null;
        if (ua && ua.accessType === "limited" && ua.allowedModules.length) {
            return ua.allowedModules.slice();
        }
        if (userAccessState.loaded && userAccessState.uid === id && userAccessState.tier === "limited") {
            var pool = userAccessState.registrationPool || {};
            var grants = userAccessState.grants || {};
            var keys = [];
            Object.keys(DEFAULT_MODULES).forEach(function (k) {
                if (pool[k] === true && grants[k] === true) {
                    keys.push(k);
                }
            });
            return keys;
        }
        return [];
    }

    function mergeGlobalWithGrantsAndVisibility(globalFlags, topLevelUserAccess, uid) {
        var g = normalizeModules(globalFlags);
        lastGlobalFlags = g;
        var id = String(uid || "").trim();
        if (!id || !isRegisteredWithEmail()) {
            lastUserAccess = null;
            lastUserAccessUid = "";
            lastEffectiveFlags = g;
            return g;
        }
        var ua = topLevelUserAccess && typeof topLevelUserAccess === "object" ? normalizeUserAccessDoc(topLevelUserAccess) : null;
        lastUserAccess = ua && ua.accessType === "limited" ? ua : null;
        lastUserAccessUid = id;
        var grantKeys = getGrantModuleKeys(id, topLevelUserAccess);
        if (!grantKeys.length) {
            lastEffectiveFlags = g;
            return g;
        }
        var allow = {};
        grantKeys.forEach(function (k) {
            allow[k] = true;
        });
        var vis = normalizeAllowedModuleList(getLocalProfileForUid(id).visibleModules);
        var visSet = {};
        if (vis.length) {
            vis.forEach(function (k) {
                if (allow[k]) {
                    visSet[k] = true;
                }
            });
        } else {
            Object.keys(allow).forEach(function (k) {
                visSet[k] = true;
            });
        }
        var out = cloneDefaults();
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            out[key] = Boolean(g[key] !== false && visSet[key]);
        });
        lastEffectiveFlags = out;
        return out;
    }

    function applyTierToFlags(globalFlags, uid) {
        var g = normalizeModules(globalFlags);
        var id = String(uid || "").trim();
        if (!id || !userAccessState.loaded || userAccessState.uid !== id) {
            return g;
        }
        if (userAccessState.tier === "member") {
            return g;
        }
        var pool = userAccessState.registrationPool || {};
        if (userAccessState.tier === "legacy") {
            if (!isRegisteredWithEmail()) {
                return g;
            }
            var outLegacy = cloneDefaults();
            Object.keys(DEFAULT_MODULES).forEach(function (key) {
                outLegacy[key] = Boolean(g[key] !== false && pool[key] === true);
            });
            return outLegacy;
        }
        if (userAccessState.tier === "limited") {
            var grants = userAccessState.grants || {};
            var out = cloneDefaults();
            var grantAny = Object.keys(DEFAULT_MODULES).some(function (key) {
                return pool[key] === true && grants[key] === true;
            });
            Object.keys(DEFAULT_MODULES).forEach(function (key) {
                if (pool[key] !== true) {
                    out[key] = false;
                    return;
                }
                var granted = grantAny ? grants[key] === true : true;
                out[key] = Boolean(g[key] !== false && granted);
            });
            return out;
        }
        return g;
    }

    function combineEffectiveFlags(globalFlags, tierMerged, grantMerged) {
        var out = cloneDefaults();
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            out[key] = Boolean(tierMerged[key] !== false && grantMerged[key] !== false);
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
            return {
                globalFlags: normalizeModules(parsed.globalFlags || parsed.modules),
                effectiveFlags: parsed.effectiveFlags && typeof parsed.effectiveFlags === "object"
                    ? normalizeModules(parsed.effectiveFlags)
                    : null,
                userAccess: parsed.userAccess && typeof parsed.userAccess === "object" ? normalizeUserAccessDoc(parsed.userAccess) : null,
                userAccessUid: String(parsed.userAccessUid || "")
            };
        } catch (e) {
            return null;
        }
    }

    function writeCache(globalFlags, effectiveFlags, userAccess, userAccessUid) {
        try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify({
                at: Date.now(),
                globalFlags: normalizeModules(globalFlags),
                effectiveFlags: normalizeModules(effectiveFlags),
                userAccess: userAccess ? normalizeUserAccessDoc(userAccess) : null,
                userAccessUid: String(userAccessUid || "")
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

    function fetchTopLevelUserAccess(uid) {
        var db = getFirestoreDb();
        var uidStr = String(uid || "").trim();
        if (!db || !uidStr || !isRegisteredWithEmail()) {
            return Promise.resolve(null);
        }
        return db.collection(USER_ACCESS_COLLECTION).doc(uidStr).get().then(function (snap) {
            if (!snap || !snap.exists) {
                return null;
            }
            return normalizeUserAccessDoc(snap.data() || {});
        }).catch(function () {
            return null;
        });
    }

    function dispatchModules(globalFlags, effectiveFlags, detailExtra) {
        var g = normalizeModules(globalFlags);
        var eff = normalizeModules(effectiveFlags);
        var detail = {
            modules: eff,
            globalFlags: g,
            effectiveFlags: eff,
            userAccess: lastUserAccess,
            userAccessUid: lastUserAccessUid,
            accessTier: userAccessState.tier,
            accessLoaded: userAccessState.loaded
        };
        if (detailExtra && typeof detailExtra === "object") {
            Object.keys(detailExtra).forEach(function (k) {
                detail[k] = detailExtra[k];
            });
        }
        document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: detail }));
    }

    var inflightCombined = null;

    function refreshAppModules() {
        if (inflightCombined) {
            return inflightCombined;
        }
        var uid = getSignedInUid();
        inflightCombined = Promise.all([
            fetchModulesFromFirestore(),
            fetchUserAccessAndPool(uid),
            fetchTopLevelUserAccess(uid)
        ]).then(function (results) {
            inflightCombined = null;
            var mods = results[0];
            var topUa = results[2];
            var cached = readCache();
            var globalFlags = mods || (cached && cached.globalFlags) || cloneDefaults();
            globalFlags = normalizeModules(globalFlags);
            var grantMerged = mergeGlobalWithGrantsAndVisibility(globalFlags, topUa, uid);
            var tierMerged = applyTierToFlags(globalFlags, uid);
            var effective = combineEffectiveFlags(globalFlags, tierMerged, grantMerged);
            writeCache(globalFlags, effective, lastUserAccess, lastUserAccessUid);
            dispatchModules(globalFlags, effective);
            document.dispatchEvent(new CustomEvent("njc:user-access-updated", { detail: Object.assign({}, userAccessState) }));
            return effective;
        });
        return inflightCombined;
    }

    function getAppModulesSync() {
        var c = readCache();
        if (c && c.effectiveFlags) {
            return normalizeModules(c.effectiveFlags);
        }
        if (c && c.globalFlags) {
            var uid = getSignedInUid();
            var grantMerged = mergeGlobalWithGrantsAndVisibility(c.globalFlags, c.userAccess, uid || c.userAccessUid);
            var tierMerged = applyTierToFlags(c.globalFlags, uid);
            return combineEffectiveFlags(c.globalFlags, tierMerged, grantMerged);
        }
        var g = cloneDefaults();
        var uid = getSignedInUid();
        return combineEffectiveFlags(g, applyTierToFlags(g, uid), mergeGlobalWithGrantsAndVisibility(g, null, uid));
    }

    function getGlobalModulesSync() {
        var c = readCache();
        if (c && c.globalFlags) {
            return normalizeModules(c.globalFlags);
        }
        return lastGlobalFlags ? normalizeModules(lastGlobalFlags) : cloneDefaults();
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

    function ensureRegistrationPoolLoaded() {
        if (registrationPoolPublic && typeof registrationPoolPublic === "object") {
            return Promise.resolve(registrationPoolPublic);
        }
        return fetchRegistrationPoolOnly();
    }

    function isLimitedMemberSync() {
        var uid = getSignedInUid();
        if (!uid || !isRegisteredWithEmail()) {
            return false;
        }
        if (lastUserAccess && lastUserAccessUid === uid && lastUserAccess.accessType === "limited") {
            return true;
        }
        return Boolean(userAccessState.loaded && userAccessState.uid === uid && userAccessState.tier === "limited");
    }

    function getLimitedGrantModuleKeysSync() {
        var uid = getSignedInUid();
        var top = lastUserAccess && lastUserAccessUid === uid ? lastUserAccess : null;
        return getGrantModuleKeys(uid, top);
    }

    function getNormalPlusModuleGrantsSync() {
        var pool = registrationPoolPublic || normalizeRegistrationPool(null);
        var out = {};
        Object.keys(DEFAULT_MODULES).forEach(function (key) {
            out[key] = pool[key] === true;
        });
        return out;
    }

    window.NjcAppModules = {
        DEFAULT_MODULES: DEFAULT_MODULES,
        ROUTE_TO_MODULE: ROUTE_TO_MODULE,
        normalizeModules: normalizeModules,
        normalizeRegistrationPool: normalizeRegistrationPool,
        getSync: getAppModulesSync,
        getGlobalSync: getGlobalModulesSync,
        getRegistrationPoolSync: getRegistrationPoolSync,
        getAccessSync: getAccessSync,
        getUserAccessSync: function () {
            return lastUserAccess;
        },
        isLimitedMemberSync: isLimitedMemberSync,
        getLimitedGrantModuleKeysSync: getLimitedGrantModuleKeysSync,
        getNormalPlusModuleGrantsSync: getNormalPlusModuleGrantsSync,
        isModuleEnabled: isModuleEnabled,
        isRouteEnabled: isRouteEnabled,
        refresh: refreshAppModules,
        ensureRegistrationPoolLoaded: ensureRegistrationPoolLoaded,
        invalidateCache: function () {
            try {
                window.localStorage.removeItem(CACHE_KEY);
            } catch (e) {}
            registrationPoolPublic = null;
            lastUserAccess = null;
            lastUserAccessUid = "";
            resetUserAccessState();
        }
    };

    document.addEventListener("DOMContentLoaded", function () {
        var cached = readCache();
        if (cached && cached.globalFlags) {
            var uid = getSignedInUid();
            var eff = cached.effectiveFlags && cached.userAccessUid === uid
                ? cached.effectiveFlags
                : null;
            if (!eff) {
                var gm = mergeGlobalWithGrantsAndVisibility(cached.globalFlags, cached.userAccess, uid || cached.userAccessUid);
                var tm = applyTierToFlags(cached.globalFlags, uid);
                eff = combineEffectiveFlags(cached.globalFlags, tm, gm);
            }
            dispatchModules(cached.globalFlags, eff, { fromCache: true });
        }
        refreshAppModules();
    });

    document.addEventListener("njc:authchange", function () {
        window.NjcAppModules.invalidateCache();
        refreshAppModules();
    });

    document.addEventListener("njc:profile-updated", function () {
        window.NjcAppModules.invalidateCache();
        refreshAppModules();
    });
})();
