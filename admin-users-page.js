(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var MAX_ROWS = 500;

    var refreshBtn = document.getElementById("admin-registered-users-refresh");
    var statusEl = document.getElementById("admin-registered-users-status");
    var wrapEl = document.getElementById("admin-registered-users-wrap");
    var tbody = document.getElementById("admin-registered-users-tbody");

    if (!refreshBtn || !statusEl || !wrapEl || !tbody) {
        return;
    }

    var busy = false;

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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatSeen(raw) {
        if (raw == null || raw === "") {
            return "—";
        }
        if (typeof raw.toDate === "function") {
            try {
                return raw.toDate().toLocaleString();
            } catch (e) {
                return "—";
            }
        }
        if (typeof raw === "number" && Number.isFinite(raw)) {
            try {
                return new Date(raw).toLocaleString();
            } catch (e2) {
                return "—";
            }
        }
        return "—";
    }

    function setStatus(kind, key, fallback) {
        statusEl.hidden = !fallback;
        statusEl.dataset.kind = kind || "";
        statusEl.textContent = fallback ? T(key, fallback) : "";
    }

    function setBusy(isBusy) {
        busy = Boolean(isBusy);
        refreshBtn.disabled = busy;
    }

    function loadRegisteredUsers() {
        if (!isAdminUser()) {
            wrapEl.hidden = true;
            tbody.innerHTML = "";
            setStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to view this list.");
            return Promise.resolve();
        }
        var db = getFirestoreDb();
        if (!db) {
            wrapEl.hidden = true;
            tbody.innerHTML = "";
            setStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return Promise.resolve();
        }
        setBusy(true);
        setStatus("working", "auth.working", "Please wait...");
        return db.collection("userDirectory").limit(MAX_ROWS).get().then(function (snap) {
            if (!snap || snap.empty) {
                wrapEl.hidden = true;
                tbody.innerHTML = "";
                setStatus("info", "admin.registeredUsersEmpty", "No registered users in the directory yet. People appear after they open the app while signed in with email.");
                return;
            }
            var rows = [];
            snap.forEach(function (doc) {
                var d = doc.data() || {};
                rows.push({
                    uid: doc.id,
                    displayName: String(d.displayName || "").trim(),
                    email: String(d.email || "").trim().toLowerCase(),
                    lastSeenAt: d.lastSeenAt
                });
            });
            rows.sort(function (a, b) {
                var an = (a.displayName || a.email || a.uid).toLowerCase();
                var bn = (b.displayName || b.email || b.uid).toLowerCase();
                return an.localeCompare(bn);
            });
            var html = rows.map(function (r) {
                var name = r.displayName || (r.email ? r.email.split("@")[0] : "") || "—";
                var em = r.email;
                return "<tr>" +
                    "<td>" + escapeHtml(name) + "</td>" +
                    "<td>" + (em ? "<a href=\"mailto:" + escapeHtml(em) + "\">" + escapeHtml(em) + "</a>" : "—") + "</td>" +
                    "<td><code>" + escapeHtml(r.uid) + "</code></td>" +
                    "<td>" + escapeHtml(formatSeen(r.lastSeenAt)) + "</td>" +
                    "</tr>";
            }).join("");
            tbody.innerHTML = html;
            wrapEl.hidden = false;
            setStatus("success", "admin.registeredUsersLoaded", "Loaded registered users.");
        }).catch(function () {
            wrapEl.hidden = true;
            tbody.innerHTML = "";
            setStatus("error", "admin.registeredUsersLoadError", "Could not load users. Check Firestore rules for userDirectory.");
        }).finally(function () {
            setBusy(false);
        });
    }

    refreshBtn.addEventListener("click", function () {
        if (!busy) {
            loadRegisteredUsers();
        }
    });

    document.addEventListener("njc:authchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadRegisteredUsers();
        }
    });
    window.addEventListener("hashchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadRegisteredUsers();
        }
    });
    document.addEventListener("DOMContentLoaded", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadRegisteredUsers();
        }
    });
})();
