(function () {
    var COLLECTION = "userAccess";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    var uidInput = document.getElementById("admin-user-access-uid");
    var loadBtn = document.getElementById("admin-user-access-load");
    var saveBtn = document.getElementById("admin-user-access-save");
    var statusEl = document.getElementById("admin-user-access-status");
    var fieldset = document.getElementById("admin-user-access-fieldset");
    var typeChurch = document.getElementById("admin-user-access-type-church");
    var typeLimited = document.getElementById("admin-user-access-type-limited");

    if (!uidInput || !loadBtn || !saveBtn || !fieldset || !window.NjcAppModules) {
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

    function normalizeUid(raw) {
        return String(raw || "").trim();
    }

    function applyAccessToForm(data) {
        var src = data && typeof data === "object" ? data : {};
        var at = String(src.accessType || "church").trim().toLowerCase();
        if (typeChurch) {
            typeChurch.checked = at !== "limited";
        }
        if (typeLimited) {
            typeLimited.checked = at === "limited";
        }
        var list = Array.isArray(src.allowedModules) ? src.allowedModules : [];
        var set = {};
        list.forEach(function (k) {
            var key = String(k || "").trim();
            if (key) {
                set[key] = true;
            }
        });
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        Object.keys(defs).forEach(function (key) {
            var input = fieldset.querySelector('input[data-user-access-module-key="' + key + '"]');
            if (input) {
                input.checked = Boolean(set[key]);
            }
        });
    }

    function getAccessFromForm() {
        var accessType = typeLimited && typeLimited.checked ? "limited" : "church";
        if (accessType === "church") {
            return { accessType: "church", allowedModules: [] };
        }
        var mods = [];
        fieldset.querySelectorAll("input[data-user-access-module-key]").forEach(function (input) {
            if (input.checked) {
                var k = String(input.getAttribute("data-user-access-module-key") || "").trim();
                if (k) {
                    mods.push(k);
                }
            }
        });
        return { accessType: "limited", allowedModules: mods };
    }

    function setFormBusy(busy) {
        var dis = Boolean(busy);
        fieldset.disabled = dis;
        loadBtn.disabled = dis;
        saveBtn.disabled = dis;
        uidInput.disabled = dis;
        if (typeChurch) {
            typeChurch.disabled = dis;
        }
        if (typeLimited) {
            typeLimited.disabled = dis;
        }
    }

    function loadUserAccessDoc() {
        if (!isAdminUser()) {
            setStatus("info", "admin.userAccessNeedAdmin", "Sign in as admin to manage member access.");
            return;
        }
        var uid = normalizeUid(uidInput.value);
        if (!uid) {
            setStatus("validation", "admin.userAccessUidRequired", "Enter the member’s Firebase user ID (UID).");
            return;
        }
        var db = getFirestoreDb();
        if (!db) {
            setStatus("error", "admin.userAccessNoFirebase", "Firebase is not ready.");
            return;
        }
        setFormBusy(true);
        clearStatus();
        db.collection(COLLECTION).doc(uid).get().then(function (snap) {
            if (snap && snap.exists) {
                applyAccessToForm(snap.data() || {});
                setStatus("success", "admin.userAccessLoaded", "Loaded access for this UID.");
            } else {
                applyAccessToForm({ accessType: "church", allowedModules: [] });
                setStatus("info", "admin.userAccessNoDoc", "No document yet — defaults to full church member. Choose Limited and pick modules, then Save.");
            }
        }).catch(function () {
            setStatus("error", "admin.userAccessLoadError", "Could not load. Check Firestore rules for userAccess.");
        }).finally(function () {
            if (isAdminUser()) {
                setFormBusy(false);
            }
        });
    }

    function saveUserAccessDoc() {
        if (!isAdminUser()) {
            setStatus("error", "admin.userAccessNeedAdmin", "Sign in as admin to manage member access.");
            return;
        }
        var uid = normalizeUid(uidInput.value);
        if (!uid) {
            setStatus("validation", "admin.userAccessUidRequired", "Enter the member’s Firebase user ID (UID).");
            return;
        }
        var db = getFirestoreDb();
        if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            setStatus("error", "admin.userAccessNoFirebase", "Firebase is not ready.");
            return;
        }
        var payload = getAccessFromForm();
        if (payload.accessType === "limited" && (!payload.allowedModules || !payload.allowedModules.length)) {
            setStatus("validation", "admin.userAccessModulesRequired", "When Limited is selected, tick at least one module.");
            return;
        }
        setFormBusy(true);
        clearStatus();
        db.collection(COLLECTION).doc(uid).set({
            accessType: payload.accessType,
            allowedModules: payload.allowedModules,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function () {
            window.NjcAppModules.invalidateCache();
            return window.NjcAppModules.refresh();
        }).then(function () {
            setStatus("success", "admin.userAccessSaved", "Saved. The member may need to reopen the app or pull to refresh.");
            document.dispatchEvent(new CustomEvent("njc:user-access-updated", { detail: { uid: uid } }));
        }).catch(function () {
            setStatus("error", "admin.userAccessSaveError", "Could not save. Check Firestore rules (userAccess).");
        }).finally(function () {
            setFormBusy(false);
        });
    }

    loadBtn.addEventListener("click", loadUserAccessDoc);
    saveBtn.addEventListener("click", saveUserAccessDoc);

    document.addEventListener("njc:authchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            if (!isAdminUser()) {
                setStatus("info", "admin.userAccessNeedAdmin", "Sign in as admin to manage member access.");
                fieldset.disabled = true;
                loadBtn.disabled = true;
                saveBtn.disabled = true;
            } else {
                clearStatus();
                fieldset.disabled = false;
                loadBtn.disabled = false;
                saveBtn.disabled = false;
                uidInput.disabled = false;
            }
        }
    });
    window.addEventListener("hashchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin" && isAdminUser()) {
            clearStatus();
        }
    });
    document.addEventListener("DOMContentLoaded", function () {
        if (!isAdminUser()) {
            fieldset.disabled = true;
            loadBtn.disabled = true;
            saveBtn.disabled = true;
        }
    });
})();
