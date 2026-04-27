(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    var fieldset = document.getElementById("admin-modules-fieldset");
    var saveBtn = document.getElementById("admin-modules-save");
    var statusEl = document.getElementById("admin-modules-status");

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
    }

    function loadModulesDoc() {
        if (!isAdminUser()) {
            fieldset.disabled = true;
            saveBtn.disabled = true;
            setStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return;
        }
        var db = getFirestoreDb();
        if (!db) {
            applyFormFromModules(window.NjcAppModules.getGlobalSync && typeof window.NjcAppModules.getGlobalSync === "function"
                ? window.NjcAppModules.getGlobalSync()
                : window.NjcAppModules.getSync());
            fieldset.disabled = false;
            saveBtn.disabled = false;
            setStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return;
        }
        setFormBusy(true);
        clearStatus();
        db.collection(COLLECTION).doc(DOC_ID).get().then(function (snap) {
            var data = snap && snap.exists ? snap.data() : null;
            var raw = data && data.flags && typeof data.flags === "object" ? data.flags : data;
            applyFormFromModules(raw);
        }).catch(function () {
            var fallback = window.NjcAppModules.getGlobalSync && typeof window.NjcAppModules.getGlobalSync === "function"
                ? window.NjcAppModules.getGlobalSync()
                : window.NjcAppModules.getSync();
            applyFormFromModules(fallback);
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
