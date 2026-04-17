(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    var fieldset = document.getElementById("admin-modules-fieldset");
    var saveBtn = document.getElementById("admin-modules-save");
    var statusEl = document.getElementById("admin-modules-status");
    var poolFieldset = document.getElementById("admin-registration-pool-fieldset");
    var codesTextarea = document.getElementById("admin-member-codes-text");
    var accessSaveBtn = document.getElementById("admin-access-save");
    var accessStatusEl = document.getElementById("admin-access-status");
    var ACCESS_DOC_ID = "access";
    var MEMBER_CODES_DOC_ID = "memberCodes";

    if (!fieldset || !saveBtn || !window.NjcAppModules) {
        return;
    }

    function T(key, fallback) {
        var root = document.querySelector('.page-view[data-route="admin"]');
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && root) {
            return window.NjcI18n.tForElement(root, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isAdminUser() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return false;
        }
        var u = window.NjcAuth.getUser();
        return normalizeEmail(u && u.email) === ADMIN_EMAIL;
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

    function setStatus(kind, key, fallback) {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = false;
        statusEl.dataset.kind = kind || "";
        statusEl.textContent = T(key, fallback);
    }

    function clearStatus() {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.dataset.kind = "";
    }

    function getFlagsFromForm() {
        var flags = {};
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        Object.keys(defs).forEach(function (key) {
            var input = fieldset.querySelector('input[data-module-key="' + key + '"]');
            flags[key] = input ? Boolean(input.checked) : true;
        });
        return flags;
    }

    function applyFormFromModules(modules) {
        var norm = window.NjcAppModules.normalizeModules(modules);
        Object.keys(norm).forEach(function (key) {
            var input = fieldset.querySelector('input[data-module-key="' + key + '"]');
            if (input) {
                input.checked = norm[key] !== false;
            }
        });
    }

    function setFormBusy(busy) {
        fieldset.disabled = Boolean(busy);
        saveBtn.disabled = Boolean(busy);
        if (poolFieldset) {
            poolFieldset.disabled = Boolean(busy);
        }
        if (accessSaveBtn) {
            accessSaveBtn.disabled = Boolean(busy);
        }
        if (codesTextarea) {
            codesTextarea.disabled = Boolean(busy);
        }
    }

    function setAccessStatus(kind, key, fallback) {
        if (!accessStatusEl) {
            return;
        }
        accessStatusEl.hidden = false;
        accessStatusEl.dataset.kind = kind || "";
        accessStatusEl.textContent = T(key, fallback);
    }

    function clearAccessStatus() {
        if (!accessStatusEl) {
            return;
        }
        accessStatusEl.hidden = true;
        accessStatusEl.textContent = "";
        accessStatusEl.dataset.kind = "";
    }

    function applyPoolFieldsetFromDoc(data) {
        if (!poolFieldset || !window.NjcAppModules) {
            return;
        }
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        var raw = data && data.registrationPool && typeof data.registrationPool === "object" ? data.registrationPool : null;
        Object.keys(defs).forEach(function (key) {
            var input = poolFieldset.querySelector('input[data-pool-key="' + key + '"]');
            if (!input) {
                return;
            }
            if (!raw) {
                input.checked = ["prayer", "trivia", "dailyBread", "celebrations"].indexOf(key) >= 0;
            } else {
                input.checked = raw[key] === true;
            }
        });
    }

    function getPoolFromForm() {
        var out = {};
        if (!poolFieldset) {
            return out;
        }
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        Object.keys(defs).forEach(function (key) {
            var input = poolFieldset.querySelector('input[data-pool-key="' + key + '"]');
            out[key] = input ? Boolean(input.checked) : false;
        });
        return out;
    }

    function parseCodesFromTextarea(text) {
        var seen = {};
        var out = [];
        String(text || "").split(/\r?\n/).forEach(function (line) {
            var s = String(line || "").trim().toUpperCase();
            if (s.length < 4 || s.length > 64) {
                return;
            }
            if (!seen[s]) {
                seen[s] = true;
                out.push(s);
            }
        });
        return out.slice(0, 500);
    }

    function loadModulesDoc() {
        if (!isAdminUser()) {
            fieldset.disabled = true;
            saveBtn.disabled = true;
            if (poolFieldset) {
                poolFieldset.disabled = true;
            }
            if (accessSaveBtn) {
                accessSaveBtn.disabled = true;
            }
            if (codesTextarea) {
                codesTextarea.disabled = true;
            }
            setStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return;
        }
        var db = getFirestoreDb();
        if (!db) {
            applyFormFromModules(window.NjcAppModules.getSync());
            fieldset.disabled = false;
            saveBtn.disabled = false;
            if (poolFieldset) {
                poolFieldset.disabled = false;
            }
            if (accessSaveBtn) {
                accessSaveBtn.disabled = false;
            }
            if (codesTextarea) {
                codesTextarea.disabled = false;
            }
            setStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return;
        }
        setFormBusy(true);
        clearStatus();
        clearAccessStatus();
        Promise.all([
            db.collection(COLLECTION).doc(DOC_ID).get(),
            poolFieldset || codesTextarea ? db.collection(COLLECTION).doc(ACCESS_DOC_ID).get() : Promise.resolve(null),
            poolFieldset || codesTextarea ? db.collection(COLLECTION).doc(MEMBER_CODES_DOC_ID).get() : Promise.resolve(null)
        ]).then(function (results) {
            var snap = results[0];
            var accessSnap = results[1];
            var codesSnap = results[2];
            var data = snap && snap.exists ? snap.data() : null;
            var raw = data && data.flags && typeof data.flags === "object" ? data.flags : data;
            applyFormFromModules(raw);
            if (accessSnap && accessSnap.exists) {
                applyPoolFieldsetFromDoc(accessSnap.data());
            } else if (poolFieldset) {
                applyPoolFieldsetFromDoc(null);
            }
            if (codesTextarea && codesSnap && codesSnap.exists) {
                var cdata = codesSnap.data() || {};
                var list = Array.isArray(cdata.codes) ? cdata.codes.map(function (x) { return String(x || "").trim(); }) : [];
                codesTextarea.value = list.filter(Boolean).join("\n");
            } else if (codesTextarea) {
                codesTextarea.value = "";
            }
        }).catch(function () {
            applyFormFromModules(window.NjcAppModules.getSync());
            setStatus("error", "admin.modulesLoadError", "Could not load module settings.");
        }).finally(function () {
            if (isAdminUser()) {
                setFormBusy(false);
            }
        });
    }

    saveBtn.addEventListener("click", function () {
        if (!isAdminUser()) {
            setStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return;
        }
        var db = getFirestoreDb();
        if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            setStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return;
        }
        var flags = getFlagsFromForm();
        setFormBusy(true);
        clearStatus();
        db.collection(COLLECTION).doc(DOC_ID).set({
            flags: flags,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function () {
            window.NjcAppModules.invalidateCache();
            return window.NjcAppModules.refresh();
        }).then(function () {
            setStatus("success", "admin.modulesSaved", "Module settings saved.");
            if (window.location.hash.replace(/^#/, "").trim().toLowerCase() !== "home") {
                window.location.hash = "#home";
            } else {
                document.dispatchEvent(new CustomEvent("njc:routechange", { detail: { route: "home" } }));
            }
        }).catch(function () {
            setStatus("error", "admin.modulesSaveError", "Could not save. Check Firestore rules (appConfig/modules).");
        }).finally(function () {
            setFormBusy(false);
        });
    });

    if (accessSaveBtn) {
        accessSaveBtn.addEventListener("click", function () {
            if (!isAdminUser()) {
                setAccessStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
                return;
            }
            var db = getFirestoreDb();
            if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
                setAccessStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
                return;
            }
            setFormBusy(true);
            clearAccessStatus();
            var pool = getPoolFromForm();
            var codes = codesTextarea ? parseCodesFromTextarea(codesTextarea.value) : [];
            var ts = window.firebase.firestore.FieldValue.serverTimestamp();
            Promise.all([
                db.collection(COLLECTION).doc(ACCESS_DOC_ID).set({
                    registrationPool: pool,
                    updatedAt: ts
                }, { merge: true }),
                db.collection(COLLECTION).doc(MEMBER_CODES_DOC_ID).set({
                    codes: codes,
                    updatedAt: ts
                }, { merge: true })
            ]).then(function () {
                if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                    window.NjcAppModules.invalidateCache();
                }
                return window.NjcAppModules && typeof window.NjcAppModules.refresh === "function"
                    ? window.NjcAppModules.refresh()
                    : null;
            }).then(function () {
                setAccessStatus("success", "admin.accessSaved", "Registration pool and member codes saved.");
            }).catch(function () {
                setAccessStatus("error", "admin.accessSaveError", "Could not save. Check Firestore rules (appConfig/access, appConfig/memberCodes).");
            }).finally(function () {
                setFormBusy(false);
            });
        });
    }

    document.addEventListener("njc:authchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadModulesDoc();
        }
    });
    window.addEventListener("hashchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadModulesDoc();
        }
    });
    document.addEventListener("DOMContentLoaded", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadModulesDoc();
        }
    });
})();
