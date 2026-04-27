(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var USER_ACCESS_COLLECTION = "userAccess";
    var CACHE_KEY = "njc_app_modules_cache_v2";
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

    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";

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

    function getLimitedGrantModuleKeys(uid, userAccess) {
        var id = String(uid || "").trim();
        if (!id || !isRegisteredWithEmail()) {
            return [];
        }
        var ua = userAccess && typeof userAccess === "object" ? normalizeUserAccessDoc(userAccess) : null;
        if (!ua || ua.accessType !== "limited" || !ua.allowedModules.length) {
            return [];
        }
        return ua.allowedModules.slice();
    }

    function mergeGlobalWithUserAccess(globalFlags, userAccess, uid) {
        var g = normalizeModules(globalFlags);
        lastGlobalFlags = g;
        if (!uid || !isRegisteredWithEmail()) {
            lastUserAccess = null;
            lastUserAccessUid = "";
            lastEffectiveFlags = g;
            return g;
        }
        var ua = userAccess && typeof userAccess === "object" ? normalizeUserAccessDoc(userAccess) : null;
        lastUserAccess = ua;
        lastUserAccessUid = uid;
        var grantKeys = getLimitedGrantModuleKeys(uid, ua);
        if (!grantKeys.length) {
            lastEffectiveFlags = g;
            return g;
        }
        var allow = {};
        grantKeys.forEach(function (k) {
            allow[k] = true;
        });
        var vis = normalizeAllowedModuleList(getLocalProfileForUid(uid).visibleModules);
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

    function getCurrentUid() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return "";
        }
        var u = window.NjcAuth.getUser();
        return String(u && u.uid || "").trim();
    }

    function fetchModulesBundleFromFirestore() {
        var db = getFirestoreDb();
        if (!db) {
            return Promise.resolve(null);
        }
        var uid = getCurrentUid();
        var modulesRef = db.collection(COLLECTION).doc(DOC_ID);
        var pFlags = modulesRef.get().then(function (snap) {
            if (!snap || !snap.exists) {
                return cloneDefaults();
            }
            var data = snap.data();
            var flags = data && data.flags && typeof data.flags === "object" ? data.flags : data;
            return normalizeModules(flags);
        }).catch(function () {
            return null;
        });
        if (!uid || !isRegisteredWithEmail()) {
            return pFlags.then(function (flags) {
                return flags ? { globalFlags: flags, userAccess: null, uid: "" } : null;
            });
        }
        var pAccess = db.collection(USER_ACCESS_COLLECTION).doc(uid).get().then(function (snap) {
            if (!snap || !snap.exists) {
                return null;
            }
            return normalizeUserAccessDoc(snap.data() || {});
        }).catch(function () {
            return null;
        });
        return Promise.all([pFlags, pAccess]).then(function (pair) {
            var flags = pair[0];
            var access = pair[1];
            if (!flags) {
                return null;
            }
            return { globalFlags: flags, userAccess: access, uid: uid };
        });
    }

    var inflight = null;

    function dispatchModules(globalFlags, effectiveFlags, detailExtra) {
        var g = normalizeModules(globalFlags);
        var eff = normalizeModules(effectiveFlags);
        var detail = {
            modules: eff,
            globalFlags: g,
            effectiveFlags: eff,
            userAccess: lastUserAccess,
            userAccessUid: lastUserAccessUid
        };
        if (detailExtra && typeof detailExtra === "object") {
            Object.keys(detailExtra).forEach(function (k) {
                detail[k] = detailExtra[k];
            });
        }
        document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: detail }));
    }

    function refreshAppModules() {
        if (inflight) {
            return inflight;
        }
        inflight = fetchModulesBundleFromFirestore().then(function (bundle) {
            inflight = null;
            var cached = readCache();
            var uid = getCurrentUid();
            var globalFlags = (bundle && bundle.globalFlags) || (cached && cached.globalFlags) || cloneDefaults();
            var userAccess = bundle && String(bundle.uid || "") === uid
                ? bundle.userAccess
                : null;
            if (userAccess === null && cached && String(cached.userAccessUid || "") === uid) {
                userAccess = cached.userAccess;
            }
            if (!bundle && cached && cached.globalFlags) {
                globalFlags = normalizeModules(cached.globalFlags);
            }
            var effective = mergeGlobalWithUserAccess(globalFlags, userAccess, uid);
            writeCache(globalFlags, effective, lastUserAccess, lastUserAccessUid);
            dispatchModules(globalFlags, effective);
            return effective;
        });
        return inflight;
    }

    function getAppModulesSync() {
        var c = readCache();
        if (c && c.effectiveFlags) {
            return normalizeModules(c.effectiveFlags);
        }
        if (c && c.globalFlags) {
            return mergeGlobalWithUserAccess(c.globalFlags, c.userAccess, c.userAccessUid || getCurrentUid());
        }
        return cloneDefaults();
    }

    function getGlobalModulesSync() {
        var c = readCache();
        if (c && c.globalFlags) {
            return normalizeModules(c.globalFlags);
        }
        return lastGlobalFlags ? normalizeModules(lastGlobalFlags) : cloneDefaults();
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
        getGlobalSync: getGlobalModulesSync,
        getUserAccessSync: function () {
            return lastUserAccess;
        },
        isLimitedMemberSync: function () {
            var uid = getCurrentUid();
            if (!uid || !isRegisteredWithEmail()) {
                return false;
            }
            return Boolean(lastUserAccess && lastUserAccessUid === uid && lastUserAccess.accessType === "limited");
        },
        getLimitedGrantModuleKeysSync: function () {
            var uid = getCurrentUid();
            return getLimitedGrantModuleKeys(uid, lastUserAccess && lastUserAccessUid === uid ? lastUserAccess : null);
        },
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
        if (cached && cached.globalFlags) {
            var uid = getCurrentUid();
            var eff = cached.effectiveFlags && cached.userAccessUid === uid
                ? cached.effectiveFlags
                : mergeGlobalWithUserAccess(cached.globalFlags, cached.userAccess, uid || cached.userAccessUid);
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

    document.addEventListener("njc:user-access-updated", function () {
        window.NjcAppModules.invalidateCache();
        refreshAppModules();
    });
})();
