(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var FUNCTIONS_REGION = "europe-west1";
    var MAX_ROWS = 500;

    var refreshBtn = document.getElementById("admin-registered-users-refresh");
    var statusEl = document.getElementById("admin-registered-users-status");
    var wrapEl = document.getElementById("admin-registered-users-wrap");
    var tbody = document.getElementById("admin-registered-users-tbody");
    var loginHelpEmailInput = document.getElementById("admin-login-help-email");
    var loginHelpCheckBtn = document.getElementById("admin-login-help-check");
    var loginHelpStatusEl = document.getElementById("admin-login-help-status");
    var loginHelpResultEl = document.getElementById("admin-login-help-result");
    var loginHelpSummaryEl = document.getElementById("admin-login-help-summary");
    var loginHelpLinkInput = document.getElementById("admin-login-help-link");
    var loginHelpCopyBtn = document.getElementById("admin-login-help-copy");

    if (!refreshBtn || !statusEl || !wrapEl || !tbody) {
        return;
    }

    var busy = false;
    var loginHelpBusy = false;

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

    /** Ensures the ID token includes up-to-date claims (e.g. email) before Firestore evaluates isAdmin() rules. */
    function refreshAuthIdTokenForFirestore() {
        var fb = window.firebase;
        if (!fb || typeof fb.auth !== "function") {
            return Promise.resolve();
        }
        try {
            var user = fb.auth().currentUser;
            if (user && typeof user.getIdToken === "function") {
                return user.getIdToken(true).then(function () {
                    return null;
                });
            }
        } catch (e) {
            return Promise.resolve();
        }
        return Promise.resolve();
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
        if (typeof raw === "string") {
            try {
                return new Date(raw).toLocaleString();
            } catch (e3) {
                return raw;
            }
        }
        return "—";
    }

    function setStatus(kind, key, fallback) {
        statusEl.hidden = !fallback;
        statusEl.dataset.kind = kind || "";
        statusEl.textContent = fallback ? T(key, fallback) : "";
    }

    function setLoginHelpStatus(kind, key, fallback) {
        if (!loginHelpStatusEl) {
            return;
        }
        loginHelpStatusEl.hidden = !fallback;
        loginHelpStatusEl.dataset.kind = kind || "";
        loginHelpStatusEl.textContent = fallback ? T(key, fallback) : "";
    }

    function hideLoginHelpResult() {
        if (loginHelpResultEl) {
            loginHelpResultEl.hidden = true;
        }
        if (loginHelpSummaryEl) {
            loginHelpSummaryEl.textContent = "";
        }
        if (loginHelpLinkInput) {
            loginHelpLinkInput.value = "";
        }
    }

    function setBusy(isBusy) {
        busy = Boolean(isBusy);
        refreshBtn.disabled = busy;
    }

    function setLoginHelpBusy(isBusy) {
        loginHelpBusy = Boolean(isBusy);
        if (loginHelpCheckBtn) {
            loginHelpCheckBtn.disabled = loginHelpBusy;
        }
        if (loginHelpCopyBtn) {
            loginHelpCopyBtn.disabled = loginHelpBusy;
        }
    }

    function callAdminPasswordResetLink(email) {
        var fb = window.firebase;
        if (!fb || !fb.auth || !fb.functions || typeof fb.app !== "function") {
            return Promise.reject(new Error("functions_unavailable"));
        }
        var auth = fb.auth();
        if (!auth.currentUser) {
            return Promise.reject(new Error("not_signed_in"));
        }
        return auth.currentUser.getIdToken(true).then(function () {
            var region = fb.app().functions(FUNCTIONS_REGION);
            var callable = region.httpsCallable("adminPasswordResetLink", { timeout: 60000 });
            return callable({ email: email });
        }).then(function (resp) {
            return resp && resp.data ? resp.data : {};
        });
    }

    function showLoginHelpResult(data) {
        if (!loginHelpResultEl || !loginHelpSummaryEl || !loginHelpLinkInput) {
            return;
        }
        if (!data || !data.exists) {
            hideLoginHelpResult();
            setLoginHelpStatus(
                "info",
                "admin.loginHelpNotFound",
                "No Firebase login for this email. The person may have used guest mode only, or registered with a different spelling (e.g. dots in Gmail). Ask them to register again with this exact email."
            );
            return;
        }
        var parts = [
            T("admin.loginHelpFound", "Account found.") + " " + escapeHtml(data.email || ""),
            "UID: " + escapeHtml(data.uid || "—"),
            T("admin.loginHelpLastSignIn", "Last sign-in:") + " " + escapeHtml(formatSeen(data.lastSignIn)),
            T("admin.loginHelpCreated", "Created:") + " " + escapeHtml(formatSeen(data.creationTime))
        ];
        if (data.disabled) {
            parts.push(T("admin.loginHelpDisabled", "Account is disabled in Firebase."));
        }
        loginHelpSummaryEl.innerHTML = parts.map(function (line) {
            return "<span class=\"admin-login-help-summary-line\">" + line + "</span>";
        }).join("");
        loginHelpLinkInput.value = String(data.resetLink || "");
        loginHelpResultEl.hidden = false;
        setLoginHelpStatus(
            "success",
            "admin.loginHelpLinkReady",
            "Reset link ready. Copy and send it to the user (WhatsApp or email). Link expires after use."
        );
    }

    function checkLoginHelp() {
        if (!loginHelpCheckBtn || loginHelpBusy) {
            return;
        }
        if (!isAdminUser()) {
            hideLoginHelpResult();
            setLoginHelpStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to use login help.");
            return;
        }
        var email = loginHelpEmailInput ? normalizeEmail(loginHelpEmailInput.value) : "";
        if (!email || email.indexOf("@") < 1) {
            hideLoginHelpResult();
            setLoginHelpStatus("error", "auth.invalidEmail", "Please enter a valid email.");
            return;
        }
        setLoginHelpBusy(true);
        hideLoginHelpResult();
        setLoginHelpStatus("working", "auth.working", "Please wait...");
        callAdminPasswordResetLink(email).then(function (data) {
            showLoginHelpResult(data);
        }).catch(function (err) {
            hideLoginHelpResult();
            var code = err && err.code ? String(err.code) : "";
            if (code === "functions/not-found" || code === "not-found") {
                setLoginHelpStatus(
                    "error",
                    "admin.loginHelpFunctionMissing",
                    "Login help function is not deployed yet. Deploy adminPasswordResetLink in Firebase Functions (europe-west1), then try again."
                );
                return;
            }
            if (code === "permission-denied") {
                setLoginHelpStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to use login help.");
                return;
            }
            setLoginHelpStatus("error", "admin.loginHelpFailed", "Could not look up this login. Try again.");
        }).finally(function () {
            setLoginHelpBusy(false);
        });
    }

    function copyLoginHelpLink() {
        if (!loginHelpLinkInput || !loginHelpCopyBtn) {
            return;
        }
        var link = String(loginHelpLinkInput.value || "").trim();
        if (!link) {
            return;
        }
        function onCopied() {
            setLoginHelpStatus("success", "admin.loginHelpCopied", "Link copied.");
        }
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
            navigator.clipboard.writeText(link).then(onCopied).catch(function () {
                loginHelpLinkInput.focus();
                loginHelpLinkInput.select();
                try {
                    document.execCommand("copy");
                    onCopied();
                } catch (e) {
                    setLoginHelpStatus("info", "admin.loginHelpCopyManual", "Select the link and copy manually.");
                }
            });
            return;
        }
        loginHelpLinkInput.focus();
        loginHelpLinkInput.select();
        try {
            document.execCommand("copy");
            onCopied();
        } catch (e2) {
            setLoginHelpStatus("info", "admin.loginHelpCopyManual", "Select the link and copy manually.");
        }
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
        return refreshAuthIdTokenForFirestore().then(function () {
            return db.collection("userDirectory").limit(MAX_ROWS).get();
        }).then(function (snap) {
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

    if (loginHelpCheckBtn) {
        loginHelpCheckBtn.addEventListener("click", checkLoginHelp);
    }
    if (loginHelpCopyBtn) {
        loginHelpCopyBtn.addEventListener("click", copyLoginHelpLink);
    }
    if (loginHelpEmailInput) {
        loginHelpEmailInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                checkLoginHelp();
            }
        });
    }

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
