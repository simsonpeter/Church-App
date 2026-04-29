(function () {
    var FIREBASE_CONFIG = {
        apiKey: "AIzaSyBw_fYOgz0WTrCNMdi8el0DPi3JfAxTr3E",
        authDomain: "songbook-add54.firebaseapp.com",
        projectId: "songbook-add54",
        storageBucket: "songbook-add54.appspot.com",
        messagingSenderId: "633087058549",
        appId: "1:633087058549:web:a9a9a28836b059b6008e3c",
        measurementId: "G-EKMD30J3GS"
    };
    var READING_PROGRESS_KEY = "njc_reading_progress_v1";
    var SERMON_FAVORITES_KEY = "njc_sermon_favorites_v1";
    var ENTRY_PREFERENCE_KEY = "njc_auth_entry_preference_v1";
    var USER_STATE_COLLECTION = "app";
    var USER_STATE_DOC = "state";
    var USER_ACCESS_DOC = "access";

    var auth = null;
    var db = null;
    var user = null;
    var initialized = false;
    var listeners = [];
    var saveTimerId = null;
    var syncInFlight = false;
    var activityHeartbeatId = null;

    var modalOverlay = null;
    var modeText = null;
    var emailInput = null;
    var passwordInput = null;
    var submitButton = null;
    var switchModeButton = null;
    var forgotPasswordButton = null;
    var statusText = null;
    var closeButton = null;
    var authMode = "login";
    var entryOverlay = null;
    var entryLoginButton = null;
    var entryRegisterButton = null;
    var entryGuestButton = null;
    var entryTitle = null;
    var entrySubtitle = null;
    var entryShowTimerId = null;
    var registerModulesContainer = null;

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function safeParseObject(raw) {
        try {
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function getLocalObject(key) {
        try {
            return safeParseObject(window.localStorage.getItem(key));
        } catch (err) {
            return {};
        }
    }

    function setLocalObject(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value && typeof value === "object" ? value : {}));
        } catch (err) {
            return null;
        }
        return null;
    }

    function getEntryPreference() {
        try {
            var value = window.localStorage.getItem(ENTRY_PREFERENCE_KEY);
            if (value === "guest" || value === "account") {
                return value;
            }
        } catch (err) {
            return "";
        }
        return "";
    }

    function setEntryPreference(value) {
        if (value !== "guest" && value !== "account") {
            return;
        }
        try {
            window.localStorage.setItem(ENTRY_PREFERENCE_KEY, value);
        } catch (err) {
            return;
        }
    }

    function emitAuthState() {
        var state = user ? {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            phoneNumber: user.phoneNumber || ""
        } : null;
        listeners.forEach(function (listener) {
            try {
                listener(state);
            } catch (err) {
                return null;
            }
            return null;
        });
        document.dispatchEvent(new CustomEvent("njc:authchange", {
            detail: { user: state }
        }));
    }

    function currentUserStateDoc() {
        if (!db || !user || !user.uid) {
            return null;
        }
        return db.collection("users").doc(user.uid).collection(USER_STATE_COLLECTION).doc(USER_STATE_DOC);
    }

    function buildNormalPlusGrantsFromPool(pool) {
        var defs = window.NjcAppModules && window.NjcAppModules.DEFAULT_MODULES ? window.NjcAppModules.DEFAULT_MODULES : {};
        var p = pool && typeof pool === "object" ? pool : {};
        var out = {};
        Object.keys(defs).forEach(function (key) {
            out[key] = p[key] === true;
        });
        return out;
    }

    /** New email registrations: “normal user plus” — limited tier, all modules allowed in the registration pool (not church member until admin/code). */
    async function writeDefaultNormalPlusAccessDoc(uid) {
        if (!db || !uid || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            throw new Error("no_db");
        }
        var pool = window.NjcAppModules && typeof window.NjcAppModules.getRegistrationPoolSync === "function"
            ? window.NjcAppModules.getRegistrationPoolSync()
            : {};
        if (window.NjcAppModules && typeof window.NjcAppModules.ensureRegistrationPoolLoaded === "function") {
            try {
                await window.NjcAppModules.ensureRegistrationPoolLoaded();
                pool = window.NjcAppModules.getRegistrationPoolSync();
            } catch (ePool) {}
        }
        var grants = buildNormalPlusGrantsFromPool(pool);
        await db.collection("users").doc(uid).collection(USER_STATE_COLLECTION).doc(USER_ACCESS_DOC).set({
            accessTier: "limited",
            moduleGrants: grants,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: false });
    }

    function renderRegisterModuleChoices() {
        if (!registerModulesContainer) {
            return;
        }
        registerModulesContainer.innerHTML = "";
        var pool = window.NjcAppModules && typeof window.NjcAppModules.getRegistrationPoolSync === "function"
            ? window.NjcAppModules.getRegistrationPoolSync()
            : {};
        var defs = window.NjcAppModules && window.NjcAppModules.DEFAULT_MODULES ? window.NjcAppModules.DEFAULT_MODULES : {};
        var keys = Object.keys(defs).filter(function (key) {
            return pool[key] === true;
        });
        var note = document.createElement("p");
        note.className = "page-note";
        note.textContent = keys.length
            ? T("auth.regNormalPlusIntro", "New accounts start as a normal user: you can use the sections the church has opened for sign-up. A church member code or the office can upgrade you to full church member access when ready.")
            : T("auth.regPoolEmpty", "No optional modules are open for registration yet. You can still create an account; ask the church office for a member code to unlock everything.");
        registerModulesContainer.appendChild(note);
    }

    function refreshRegisterModulesPanel() {
        if (!registerModulesContainer || authMode !== "register") {
            return;
        }
        registerModulesContainer.hidden = false;
        if (window.NjcAppModules && typeof window.NjcAppModules.ensureRegistrationPoolLoaded === "function") {
            window.NjcAppModules.ensureRegistrationPoolLoaded().then(function () {
                renderRegisterModuleChoices();
            }).catch(function () {
                renderRegisterModuleChoices();
            });
        } else {
            renderRegisterModuleChoices();
        }
    }

    function buildLocalPayload() {
        return {
            readingProgress: getLocalObject(READING_PROGRESS_KEY),
            sermonFavorites: getLocalObject(SERMON_FAVORITES_KEY),
            updatedAt: Date.now()
        };
    }

    async function syncLocalToCloud() {
        var doc = currentUserStateDoc();
        if (!doc || syncInFlight) {
            return;
        }
        syncInFlight = true;
        try {
            var payload = buildLocalPayload();
            if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue) {
                payload.lastSeenAt = window.firebase.firestore.FieldValue.serverTimestamp();
            }
            await doc.set(payload, { merge: true });
        } catch (err) {
            return;
        } finally {
            syncInFlight = false;
        }
    }

    function queueSyncLocalToCloud() {
        if (!user || !db) {
            return;
        }
        if (saveTimerId) {
            window.clearTimeout(saveTimerId);
        }
        saveTimerId = window.setTimeout(function () {
            saveTimerId = null;
            syncLocalToCloud();
        }, 450);
    }

    function stopActivityHeartbeat() {
        if (activityHeartbeatId !== null) {
            window.clearInterval(activityHeartbeatId);
            activityHeartbeatId = null;
        }
    }

    function startActivityHeartbeat() {
        stopActivityHeartbeat();
        if (!user || !db) {
            return;
        }
        activityHeartbeatId = window.setInterval(function () {
            if (user && db) {
                syncLocalToCloud();
                if (window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
                    window.NjcAchievementBoard.syncMyPublicScore();
                }
            }
        }, 120000);
    }

    async function pullCloudToLocalOrBootstrap() {
        var doc = currentUserStateDoc();
        if (!doc) {
            return;
        }
        try {
            var snapshot = await doc.get();
            if (!snapshot.exists) {
                await syncLocalToCloud();
                return;
            }
            var data = snapshot.data() || {};
            if (data.readingProgress && typeof data.readingProgress === "object") {
                setLocalObject(READING_PROGRESS_KEY, data.readingProgress);
            }
            if (data.sermonFavorites && typeof data.sermonFavorites === "object") {
                setLocalObject(SERMON_FAVORITES_KEY, data.sermonFavorites);
            }
            document.dispatchEvent(new CustomEvent("njc:userdata-updated", {
                detail: { source: "cloud" }
            }));
        } catch (err) {
            return;
        }
    }

    /** Email users who signed up before access docs existed: create normal-plus limited access once. */
    async function ensureRegisteredUserAccessDoc() {
        if (!db || !user || !user.uid) {
            return;
        }
        var email = String(user.email || "").trim();
        if (!email) {
            return;
        }
        if (window.NjcAppModules && typeof window.NjcAppModules.isChurchAdminAccount === "function" && window.NjcAppModules.isChurchAdminAccount()) {
            return;
        }
        var ref = db.collection("users").doc(user.uid).collection(USER_STATE_COLLECTION).doc(USER_ACCESS_DOC);
        try {
            var snap = await ref.get();
            if (snap.exists) {
                return;
            }
            if (window.NjcAppModules && typeof window.NjcAppModules.ensureRegistrationPoolLoaded === "function") {
                try {
                    await window.NjcAppModules.ensureRegistrationPoolLoaded();
                } catch (ePool) {}
            }
            var pool = window.NjcAppModules && typeof window.NjcAppModules.getRegistrationPoolSync === "function"
                ? window.NjcAppModules.getRegistrationPoolSync()
                : {};
            var grants = buildNormalPlusGrantsFromPool(pool);
            await ref.set({
                accessTier: "limited",
                moduleGrants: grants,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: false });
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            if (window.NjcAppModules && typeof window.NjcAppModules.refresh === "function") {
                await window.NjcAppModules.refresh();
            }
        } catch (e) {
            return;
        }
    }

    function upsertUserDirectoryEntry() {
        if (!db || !user || !user.uid) {
            return;
        }
        var email = String(user.email || "").trim().toLowerCase();
        if (!email || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            return;
        }
        var displayName = String(user.displayName || "").trim();
        if (!displayName) {
            displayName = email.split("@")[0].replace(/[._-]+/g, " ").trim() || "User";
        }
        var ref = db.collection("userDirectory").doc(user.uid);
        var now = window.firebase.firestore.FieldValue.serverTimestamp();
        ref.set({
            displayName: displayName.slice(0, 120),
            email: email,
            lastSeenAt: now,
            updatedAt: now
        }, { merge: true }).catch(function () {
            return null;
        });
    }

    function hideEntryOverlay() {
        if (entryShowTimerId) {
            window.clearTimeout(entryShowTimerId);
            entryShowTimerId = null;
        }
        if (entryOverlay) {
            entryOverlay.hidden = true;
        }
        document.body.classList.remove("auth-entry-open");
    }

    function showEntryOverlayWhenReady() {
        if (!entryOverlay) {
            return;
        }
        if (!document.body.classList.contains("splash-active")) {
            entryOverlay.hidden = false;
            document.body.classList.add("auth-entry-open");
            return;
        }
        if (entryShowTimerId) {
            window.clearTimeout(entryShowTimerId);
        }
        entryShowTimerId = window.setTimeout(showEntryOverlayWhenReady, 180);
    }

    function updateEntryOverlayTexts() {
        if (entryTitle) {
            entryTitle.textContent = T("auth.entryTitle", "Welcome");
        }
        if (entrySubtitle) {
            entrySubtitle.textContent = T("auth.entrySubtitle", "Sign in or continue without login.");
        }
        if (entryLoginButton) {
            entryLoginButton.textContent = T("auth.loginAction", "Login");
        }
        if (entryRegisterButton) {
            entryRegisterButton.textContent = T("auth.registerAction", "Create account");
        }
        if (entryGuestButton) {
            entryGuestButton.textContent = T("auth.continueGuest", "Continue without login");
        }
    }

    function ensureEntryOverlay() {
        if (entryOverlay) {
            return;
        }
        entryOverlay = document.createElement("div");
        entryOverlay.id = "auth-entry-overlay";
        entryOverlay.className = "auth-entry-overlay";
        entryOverlay.hidden = true;
        entryOverlay.innerHTML = "" +
            "<section class=\"auth-entry-card\" role=\"dialog\" aria-modal=\"true\">" +
            "  <img class=\"auth-entry-logo\" src=\"logo.png\" alt=\"NJC logo\">" +
            "  <h2 id=\"auth-entry-title\">Welcome</h2>" +
            "  <p class=\"page-note\" id=\"auth-entry-subtitle\">Sign in or continue without login.</p>" +
            "  <div class=\"auth-entry-actions\">" +
            "    <button type=\"button\" class=\"button-link\" id=\"auth-entry-login\">Login</button>" +
            "    <button type=\"button\" class=\"button-link button-secondary\" id=\"auth-entry-register\">Create account</button>" +
            "    <button type=\"button\" class=\"button-link button-secondary\" id=\"auth-entry-guest\">Continue without login</button>" +
            "  </div>" +
            "</section>";
        document.body.appendChild(entryOverlay);

        entryLoginButton = document.getElementById("auth-entry-login");
        entryRegisterButton = document.getElementById("auth-entry-register");
        entryGuestButton = document.getElementById("auth-entry-guest");
        entryTitle = document.getElementById("auth-entry-title");
        entrySubtitle = document.getElementById("auth-entry-subtitle");

        if (entryLoginButton) {
            entryLoginButton.addEventListener("click", function () {
                openAuthModal("login");
            });
        }
        if (entryRegisterButton) {
            entryRegisterButton.addEventListener("click", function () {
                openAuthModal("register");
            });
        }
        if (entryGuestButton) {
            entryGuestButton.addEventListener("click", function () {
                setEntryPreference("guest");
                hideEntryOverlay();
            });
        }
        updateEntryOverlayTexts();
    }

    function updateEntryOverlayVisibility() {
        ensureEntryOverlay();
        if (user && user.uid) {
            setEntryPreference("account");
            hideEntryOverlay();
            return;
        }
        if (getEntryPreference()) {
            hideEntryOverlay();
            return;
        }
        showEntryOverlayWhenReady();
    }

    function ensureModal() {
        if (modalOverlay) {
            return;
        }
        modalOverlay = document.createElement("div");
        modalOverlay.id = "auth-modal-overlay";
        modalOverlay.className = "auth-modal-overlay";
        modalOverlay.hidden = true;
        modalOverlay.innerHTML = "" +
            "<button type=\"button\" class=\"auth-modal-backdrop\" id=\"auth-modal-backdrop\" aria-label=\"Close\"></button>" +
            "<section class=\"auth-modal-card\" role=\"dialog\" aria-modal=\"true\">" +
            "  <div class=\"auth-modal-top\">" +
            "    <strong id=\"auth-modal-mode\">Login</strong>" +
            "    <button type=\"button\" class=\"auth-modal-close\" id=\"auth-modal-close\" aria-label=\"Close\"><i class=\"fa-solid fa-xmark\"></i></button>" +
            "  </div>" +
            "  <form id=\"auth-modal-form\" class=\"auth-modal-form\">" +
            "    <input id=\"auth-email\" class=\"search-input\" type=\"email\" autocomplete=\"email\" placeholder=\"Email\" required>" +
            "    <input id=\"auth-password\" class=\"search-input\" type=\"password\" autocomplete=\"current-password\" minlength=\"6\" placeholder=\"Password\" required>" +
            "    <div id=\"auth-register-modules\" class=\"auth-register-modules\" hidden></div>" +
            "    <button id=\"auth-submit\" class=\"button-link\" type=\"submit\">Login</button>" +
            "    <button id=\"auth-forgot-password\" class=\"button-link button-secondary auth-forgot-btn\" type=\"button\">Forgot password?</button>" +
            "    <button id=\"auth-switch-mode\" class=\"button-link button-secondary\" type=\"button\">Create account</button>" +
            "    <p id=\"auth-status\" class=\"page-note\" hidden></p>" +
            "  </form>" +
            "</section>";
        document.body.appendChild(modalOverlay);

        modeText = document.getElementById("auth-modal-mode");
        emailInput = document.getElementById("auth-email");
        passwordInput = document.getElementById("auth-password");
        submitButton = document.getElementById("auth-submit");
        forgotPasswordButton = document.getElementById("auth-forgot-password");
        switchModeButton = document.getElementById("auth-switch-mode");
        statusText = document.getElementById("auth-status");
        closeButton = document.getElementById("auth-modal-close");
        var backdrop = document.getElementById("auth-modal-backdrop");
        var form = document.getElementById("auth-modal-form");
        registerModulesContainer = document.getElementById("auth-register-modules");

        function closeModal() {
            if (!modalOverlay) {
                return;
            }
            modalOverlay.hidden = true;
            document.body.classList.remove("auth-modal-open");
            if (statusText) {
                statusText.hidden = true;
                statusText.textContent = "";
            }
        }

        function setMode(mode) {
            authMode = mode === "register" ? "register" : "login";
            var isRegister = authMode === "register";
            if (modeText) {
                modeText.textContent = isRegister ? T("auth.registerTitle", "Create account") : T("auth.loginTitle", "Login");
            }
            if (submitButton) {
                submitButton.textContent = isRegister ? T("auth.registerAction", "Create account") : T("auth.loginAction", "Login");
            }
            if (switchModeButton) {
                switchModeButton.textContent = isRegister
                    ? T("auth.switchToLogin", "Have an account? Login")
                    : T("auth.switchToRegister", "New user? Register");
            }
            if (forgotPasswordButton) {
                forgotPasswordButton.textContent = T("auth.forgotPassword", "Forgot password?");
                forgotPasswordButton.hidden = isRegister;
            }
            if (registerModulesContainer) {
                registerModulesContainer.hidden = !isRegister;
                if (isRegister) {
                    refreshRegisterModulesPanel();
                }
            }
            if (emailInput) {
                emailInput.placeholder = T("auth.email", "Email");
            }
            if (passwordInput) {
                passwordInput.placeholder = T("auth.password", "Password (min 6)");
            }
            if (closeButton) {
                var closeLabel = T("settings.close", "Close");
                closeButton.setAttribute("aria-label", closeLabel);
                closeButton.title = closeLabel;
            }
        }

        function openModal(mode) {
            if (!modalOverlay) {
                return;
            }
            setMode(mode || "login");
            modalOverlay.hidden = false;
            document.body.classList.add("auth-modal-open");
            if (emailInput) {
                emailInput.focus();
            }
        }

        function setStatus(message, state) {
            if (!statusText) {
                return;
            }
            statusText.hidden = !message;
            statusText.textContent = message || "";
            statusText.dataset.state = state || "";
        }

        async function onSubmit(event) {
            event.preventDefault();
            if (!auth) {
                setStatus(T("auth.unavailable", "Login is unavailable right now."), "error");
                return;
            }
            var email = emailInput ? String(emailInput.value || "").trim() : "";
            var password = passwordInput ? String(passwordInput.value || "") : "";
            if (!email || !password) {
                setStatus(T("auth.needCredentials", "Please enter email and password."), "error");
                return;
            }
            submitButton.disabled = true;
            switchModeButton.disabled = true;
            if (forgotPasswordButton) {
                forgotPasswordButton.disabled = true;
            }
            setStatus(T("auth.working", "Please wait..."), "working");
            try {
                if (authMode === "register") {
                    var cred = await auth.createUserWithEmailAndPassword(email, password);
                    var newUid = cred && cred.user && cred.user.uid ? cred.user.uid : "";
                    try {
                        await writeDefaultNormalPlusAccessDoc(newUid);
                    } catch (writeErr) {
                        try {
                            if (cred && cred.user && typeof cred.user.delete === "function") {
                                await cred.user.delete();
                            }
                        } catch (delErr) {
                            // Account may still exist if delete failed; user should contact admin.
                        }
                        setStatus(T("auth.regAccessWriteFailed", "Account could not be finalized. Please try again or contact the church office."), "error");
                        return;
                    }
                    if (window.NjcAppModules && typeof window.NjcAppModules.refresh === "function") {
                        window.NjcAppModules.refresh().catch(function () { return null; });
                    }
                    setStatus(T("auth.registered", "Account created successfully."), "ok");
                } else {
                    await auth.signInWithEmailAndPassword(email, password);
                    setStatus(T("auth.loggedIn", "Logged in successfully."), "ok");
                }
                window.setTimeout(closeModal, 320);
            } catch (err) {
                var code = err && err.code ? String(err.code) : "";
                var message = T("auth.failed", "Login failed. Please try again.");
                if (code === "auth/email-already-in-use") {
                    message = T("auth.emailInUse", "Email already in use.");
                } else if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") {
                    message = T("auth.invalidCredentials", "Invalid email or password.");
                } else if (code === "auth/weak-password") {
                    message = T("auth.weakPassword", "Password must be at least 6 characters.");
                } else if (code === "auth/invalid-email") {
                    message = T("auth.invalidEmail", "Please enter a valid email.");
                }
                setStatus(message, "error");
            } finally {
                submitButton.disabled = false;
                switchModeButton.disabled = false;
                if (forgotPasswordButton) {
                    forgotPasswordButton.disabled = false;
                }
            }
        }

        async function onForgotPassword() {
            if (!auth) {
                setStatus(T("auth.unavailable", "Login is unavailable right now."), "error");
                return;
            }
            var email = emailInput ? String(emailInput.value || "").trim() : "";
            if (!email) {
                setStatus(T("auth.resetNeedEmail", "Enter your email first to reset password."), "error");
                return;
            }
            forgotPasswordButton.disabled = true;
            setStatus(T("auth.working", "Please wait..."), "working");
            try {
                await auth.sendPasswordResetEmail(email);
                setStatus(T("auth.resetSent", "Password reset email sent. Please check your inbox."), "ok");
            } catch (err) {
                var code = err && err.code ? String(err.code) : "";
                var message = T("auth.resetFailed", "Could not send reset email. Please try again.");
                if (code === "auth/invalid-email") {
                    message = T("auth.invalidEmail", "Please enter a valid email.");
                } else if (code === "auth/user-not-found") {
                    message = T("auth.invalidCredentials", "Invalid email or password.");
                }
                setStatus(message, "error");
            } finally {
                forgotPasswordButton.disabled = false;
            }
        }

        if (form) {
            form.addEventListener("submit", onSubmit);
        }
        if (switchModeButton) {
            switchModeButton.addEventListener("click", function () {
                setMode(authMode === "register" ? "login" : "register");
            });
        }
        if (forgotPasswordButton) {
            forgotPasswordButton.addEventListener("click", onForgotPassword);
        }
        if (closeButton) {
            closeButton.addEventListener("click", closeModal);
        }
        if (backdrop) {
            backdrop.addEventListener("click", closeModal);
        }
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modalOverlay && !modalOverlay.hidden) {
                closeModal();
            }
        });
        document.addEventListener("njc:langchange", function () {
            setMode(authMode);
            updateEntryOverlayTexts();
        });

        window.NjcAuthModal = {
            open: openModal,
            close: closeModal
        };
    }

    function initFirebase() {
        if (auth && db) {
            return true;
        }
        if (!window.firebase || typeof window.firebase.initializeApp !== "function") {
            return false;
        }
        try {
            if (!window.firebase.apps || !window.firebase.apps.length) {
                window.firebase.initializeApp(FIREBASE_CONFIG);
            }
            auth = window.firebase.auth();
            db = window.firebase.firestore();
            return true;
        } catch (err) {
            return false;
        }
    }

    function init() {
        if (initialized) {
            return;
        }
        initialized = true;
        ensureModal();
        ensureEntryOverlay();
        if (!initFirebase()) {
            updateEntryOverlayVisibility();
            emitAuthState();
            return;
        }

        auth.onAuthStateChanged(function (nextUser) {
            user = nextUser || null;
            emitAuthState();
            if (user) {
                pullCloudToLocalOrBootstrap();
                ensureRegisteredUserAccessDoc().catch(function () {
                    return null;
                });
                upsertUserDirectoryEntry();
                window.setTimeout(function () {
                    if (window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
                        window.NjcAchievementBoard.syncMyPublicScore();
                    }
                }, 0);
                startActivityHeartbeat();
            } else {
                stopActivityHeartbeat();
            }
            updateEntryOverlayVisibility();
        });

        document.addEventListener("njc:progress-updated", queueSyncLocalToCloud);
        document.addEventListener("njc:favorites-updated", queueSyncLocalToCloud);
        window.addEventListener("hashchange", function () {
            if (modalOverlay && !modalOverlay.hidden) {
                return;
            }
            updateEntryOverlayVisibility();
        });
        window.setTimeout(function () {
            updateEntryOverlayVisibility();
        }, 900);
    }

    function openAuthModal(mode) {
        if (!window.NjcAuthModal || typeof window.NjcAuthModal.open !== "function") {
            ensureModal();
        }
        if (window.NjcAuthModal && typeof window.NjcAuthModal.open === "function") {
            window.NjcAuthModal.open(mode || "login");
        }
    }

    function signOut() {
        if (!auth) {
            return Promise.resolve();
        }
        var user = auth.currentUser;
        var tokenCleanup = Promise.resolve();
        if (user && db) {
            tokenCleanup = db.collection("fcmTokens").doc(user.uid).delete().catch(function () { return null; });
        }
        return tokenCleanup.then(function () {
            return auth.signOut();
        }).catch(function () {
            return auth.signOut();
        }).catch(function () {
            return null;
        });
    }

    function onStateChange(listener) {
        if (typeof listener !== "function") {
            return function () { return null; };
        }
        listeners.push(listener);
        listener(user ? {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || "",
            phoneNumber: user.phoneNumber || ""
        } : null);
        return function () {
            listeners = listeners.filter(function (item) {
                return item !== listener;
            });
        };
    }

    function snapshotFromFirebaseUser(fu) {
        if (!fu || !fu.uid) {
            return null;
        }
        return {
            uid: fu.uid,
            email: fu.email || "",
            displayName: fu.displayName || "",
            photoURL: fu.photoURL || "",
            phoneNumber: fu.phoneNumber || ""
        };
    }

    function getUser() {
        if (user) {
            return snapshotFromFirebaseUser(user);
        }
        if (auth && auth.currentUser) {
            return snapshotFromFirebaseUser(auth.currentUser);
        }
        return null;
    }

    /** True only for email/password (or other) sign-in with a non-empty email — not “guest” browser sessions. */
    function isRegisteredMember() {
        var u = getUser();
        return Boolean(u && String(u.email || "").trim());
    }

    window.NjcAuth = {
        init: init,
        openAuthModal: openAuthModal,
        signOut: signOut,
        onStateChange: onStateChange,
        getUser: getUser,
        isRegisteredMember: isRegisteredMember,
        queueSync: queueSyncLocalToCloud
    };
})();
