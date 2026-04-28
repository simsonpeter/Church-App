(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    var fieldset = document.getElementById("admin-modules-fieldset");
    var saveBtn = document.getElementById("admin-modules-save");
    var statusEl = document.getElementById("admin-modules-status");
    var poolFieldset = document.getElementById("admin-registration-pool-fieldset");
    var codesTextarea = document.getElementById("admin-member-codes-text");
    var memberGrantUidInput = document.getElementById("admin-member-grant-uid");
    var memberGrantBtn = document.getElementById("admin-member-grant-btn");
    var memberUsersRefreshBtn = document.getElementById("admin-member-users-refresh");
    var memberUsersStatusEl = document.getElementById("admin-member-users-status");
    var memberUsersWrap = document.getElementById("admin-member-users-wrap");
    var memberUsersTbody = document.getElementById("admin-member-users-tbody");
    var accessSaveBtn = document.getElementById("admin-access-save");
    var accessStatusEl = document.getElementById("admin-access-status");
    var ACCESS_DOC_ID = "access";
    var MEMBER_CODES_DOC_ID = "memberCodes";
    var MAX_MEMBER_USERS = 300;
    var MEMBER_USERS_QUERY_TIMEOUT_MS = 12000;
    var memberUsersBusy = false;
    var latestMemberRows = {};
    var CELEBRATION_PROFILES_COLLECTION = "celebrationProfiles";
    var adminUserEditor = { backdrop: null, currentUid: "", saveBtn: null, statusEl: null, busy: false };
    var MODULE_LABEL_FALLBACK = {
        announcements: "Announcements",
        bibleReading: "Today’s Bible reading",
        dailyVerse: "Daily verse",
        trivia: "Bible Quiz",
        eventsWeek: "Events this week",
        dailyBread: "Daily bread",
        bookShelf: "Book shelf",
        bible: "Bible reader",
        songbook: "Songbook",
        prayer: "Prayer wall",
        events: "Events",
        sermons: "Sermons",
        contact: "Contact",
        celebrations: "Celebrations",
        chat: "Chat",
        userAchievements: "User achievements"
    };

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
        if (memberGrantUidInput) {
            memberGrantUidInput.disabled = Boolean(busy);
        }
        if (memberGrantBtn) {
            memberGrantBtn.disabled = Boolean(busy);
        }
        if (memberUsersRefreshBtn) {
            memberUsersRefreshBtn.disabled = Boolean(busy) || memberUsersBusy;
        }
        if (memberUsersTbody) {
            memberUsersTbody.querySelectorAll("button[data-admin-member-uid]").forEach(function (btn) {
                btn.disabled = Boolean(busy) || memberUsersBusy;
            });
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

    /** Must match Cloud Function `normalizeMemberCode` in functions/index.js (redeemMemberCode). */
    function normalizeMemberCode(value) {
        return String(value || "")
            .replace(/^\uFEFF/, "")
            .trim()
            .toUpperCase()
            .replace(/\s+/g, "")
            .replace(/[^A-Z0-9]/g, "");
    }

    function parseCodesFromTextarea(text) {
        var seen = {};
        var out = [];
        String(text || "")
            .split(/[\r\n,]+/)
            .forEach(function (line) {
                var s = normalizeMemberCode(line);
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

    function normalizeUid(value) {
        return String(value || "").trim().replace(/\s+/g, "");
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function ensureAdminUserEditor() {
        if (adminUserEditor.backdrop) {
            return;
        }
        var backdrop = document.createElement("div");
        backdrop.className = "admin-user-editor-backdrop";
        backdrop.hidden = true;
        backdrop.setAttribute("role", "dialog");
        backdrop.setAttribute("aria-modal", "true");
        backdrop.setAttribute("aria-label", T("admin.userEditorTitle", "Edit user"));
        backdrop.innerHTML = "" +
            "<div class=\"admin-user-editor-card\" role=\"document\">" +
            "  <div class=\"admin-user-editor-header\">" +
            "    <h3 id=\"admin-user-editor-title\">" + escapeHtml(T("admin.userEditorTitle", "Edit user")) + "</h3>" +
            "    <button type=\"button\" class=\"button-link admin-user-editor-close\" id=\"admin-user-editor-close\" aria-label=\"" + escapeHtml(T("admin.userEditorClose", "Close")) + "\"><i class=\"fa-solid fa-xmark\" aria-hidden=\"true\"></i></button>" +
            "  </div>" +
            "  <p class=\"page-note admin-user-editor-meta\" id=\"admin-user-editor-meta\"></p>" +
            "  <div class=\"admin-user-editor-grid\">" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.fullName", "Full name")) +
            "      <input class=\"search-input\" type=\"text\" id=\"admin-user-editor-fullname\" maxlength=\"120\" autocomplete=\"name\">" +
            "    </label>" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.dob", "Date of birth")) +
            "      <input class=\"search-input\" type=\"date\" id=\"admin-user-editor-dob\" autocomplete=\"bday\">" +
            "    </label>" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.anniversary", "Wedding anniversary")) +
            "      <input class=\"search-input\" type=\"date\" id=\"admin-user-editor-anniversary\" autocomplete=\"off\">" +
            "    </label>" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.anniversaryPartnerName", "Spouse name (anniversary)")) +
            "      <input class=\"search-input\" type=\"text\" id=\"admin-user-editor-anniv-partner\" maxlength=\"120\" autocomplete=\"name\">" +
            "    </label>" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.phone", "Phone")) +
            "      <input class=\"search-input\" type=\"tel\" id=\"admin-user-editor-phone\" maxlength=\"40\" autocomplete=\"tel\">" +
            "    </label>" +
            "    <label class=\"admin-field\">" + escapeHtml(T("profile.groupId", "Group / team code")) +
            "      <input class=\"search-input\" type=\"text\" id=\"admin-user-editor-group\" maxlength=\"80\" autocomplete=\"off\">" +
            "    </label>" +
            "  </div>" +
            "  <label class=\"admin-field admin-user-editor-checkbox\">" +
            "    <input type=\"checkbox\" id=\"admin-user-editor-leader-anon\"> " + escapeHtml(T("profile.leaderboardAnonymous", "Show as \"Anonymous\" on public leaderboard")) +
            "  </label>" +
            "  <label class=\"admin-field admin-user-editor-checkbox\">" +
            "    <input type=\"checkbox\" id=\"admin-user-editor-photo-skip\"> " + escapeHtml(T("profile.photoSkipCloud", "Keep photo on device only (no cloud)")) +
            "  </label>" +
            "  <div class=\"admin-user-editor-visible-wrap\" id=\"admin-user-editor-visible-wrap\" hidden>" +
            "    <p class=\"page-note\" data-i18n-fallback=\"Menu visibility (subset of allowed)\">" + escapeHtml(T("admin.userEditorVisibleLegend", "Menu & home: show only these (subset of what this user is allowed)")) + "</p>" +
            "    <fieldset class=\"admin-modules-fieldset\" id=\"admin-user-editor-visible-fieldset\"></fieldset>" +
            "  </div>" +
            "  <p class=\"page-note\" id=\"admin-user-editor-status\" hidden></p>" +
            "  <div class=\"admin-user-editor-actions\">" +
            "    <button type=\"button\" class=\"button-link\" id=\"admin-user-editor-save\">" + escapeHtml(T("admin.userEditorSave", "Save profile")) + "</button>" +
            "    <button type=\"button\" class=\"button-link button-secondary\" id=\"admin-user-editor-cancel\">" + escapeHtml(T("admin.userEditorCancel", "Cancel")) + "</button>" +
            "  </div>" +
            "</div>";
        document.body.appendChild(backdrop);
        adminUserEditor.backdrop = backdrop;
        adminUserEditor.statusEl = document.getElementById("admin-user-editor-status");
        adminUserEditor.saveBtn = document.getElementById("admin-user-editor-save");
        var closeBtn = document.getElementById("admin-user-editor-close");
        var cancelBtn = document.getElementById("admin-user-editor-cancel");
        function onClose() {
            closeAdminUserEditor();
        }
        if (closeBtn) {
            closeBtn.addEventListener("click", onClose);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener("click", onClose);
        }
        backdrop.addEventListener("click", function (e) {
            if (e.target === backdrop) {
                onClose();
            }
        });
        if (adminUserEditor.saveBtn) {
            adminUserEditor.saveBtn.addEventListener("click", function () {
                saveAdminUserProfile();
            });
        }
        document.addEventListener("keydown", function (ev) {
            if (ev.key === "Escape" && adminUserEditor.backdrop && !adminUserEditor.backdrop.hidden) {
                onClose();
            }
        });
    }

    function setUserEditorStatus(kind, key, fallback) {
        ensureAdminUserEditor();
        var el = adminUserEditor.statusEl;
        if (!el) {
            return;
        }
        el.hidden = !fallback;
        el.dataset.kind = kind || "";
        el.textContent = fallback ? T(key, fallback) : "";
    }

    function setUserEditorBusy(busy) {
        adminUserEditor.busy = Boolean(busy);
        if (!adminUserEditor.backdrop) {
            return;
        }
        adminUserEditor.backdrop.querySelectorAll("input, fieldset, button").forEach(function (node) {
            if (node.id === "admin-user-editor-close") {
                return;
            }
            node.disabled = adminUserEditor.busy;
        });
    }

    function closeAdminUserEditor() {
        ensureAdminUserEditor();
        if (adminUserEditor.backdrop) {
            adminUserEditor.backdrop.hidden = true;
        }
        document.body.classList.remove("admin-user-editor-open");
        adminUserEditor.currentUid = "";
        setUserEditorStatus("", "", "");
    }

    function buildVisibleCheckboxesGrants(tier, moduleGrants) {
        if (tier === "member") {
            var defs = window.NjcAppModules && window.NjcAppModules.DEFAULT_MODULES ? window.NjcAppModules.DEFAULT_MODULES : {};
            return Object.keys(defs);
        }
        var g = moduleGrants && typeof moduleGrants === "object" ? moduleGrants : {};
        return Object.keys(g).filter(function (k) {
            return g[k] === true;
        });
    }

    function buildVisibleModulesHtml(row, selectedKeys) {
        var grantKeys = buildVisibleCheckboxesGrants(row.tier, row.moduleGrants);
        if (!grantKeys.length) {
            return "";
        }
        var set = {};
        (selectedKeys || []).forEach(function (k) {
            set[String(k || "").trim()] = true;
        });
        if (!Object.keys(set).length) {
            grantKeys.forEach(function (k) {
                set[k] = true;
            });
        }
        return grantKeys.map(function (key) {
            var id = "admin-user-vis-" + key;
            var lab = T("admin.module" + key.charAt(0).toUpperCase() + key.slice(1), MODULE_LABEL_FALLBACK[key] || key);
            return "<label class=\"admin-module-toggle\" for=\"" + id + "\"><input type=\"checkbox\" id=\"" + id + "\" data-admin-visible-mod=\"" + key + "\" " + (set[key] ? "checked" : "") + "> <span>" + escapeHtml(lab) + "</span></label>";
        }).join("");
    }

    function getSelectedVisibleKeys() {
        var out = [];
        if (!adminUserEditor.backdrop) {
            return out;
        }
        adminUserEditor.backdrop.querySelectorAll("input[data-admin-visible-mod]").forEach(function (inp) {
            if (inp.checked) {
                var k = String(inp.getAttribute("data-admin-visible-mod") || "").trim();
                if (k) {
                    out.push(k);
                }
            }
        });
        return out;
    }

    function openAdminUserEditorForUid(uid) {
        var row = latestMemberRows[uid];
        if (!row) {
            return;
        }
        ensureAdminUserEditor();
        var backdrop = adminUserEditor.backdrop;
        if (!backdrop) {
            return;
        }
        var meta = document.getElementById("admin-user-editor-meta");
        if (meta) {
            meta.textContent = (row.displayName || row.name || "User") + " · " + (row.email || "") + " · " + String(uid).slice(0, 12) + "…";
        }
        var full = document.getElementById("admin-user-editor-fullname");
        var dob = document.getElementById("admin-user-editor-dob");
        var ann = document.getElementById("admin-user-editor-anniversary");
        var ap = document.getElementById("admin-user-editor-anniv-partner");
        var phone = document.getElementById("admin-user-editor-phone");
        var group = document.getElementById("admin-user-editor-group");
        var la = document.getElementById("admin-user-editor-leader-anon");
        var ps = document.getElementById("admin-user-editor-photo-skip");
        var p = row.profile || {};
        if (full) {
            full.value = String(p.fullName || row.name || row.displayName || "");
        }
        if (dob) {
            dob.value = String(p.dob || "").trim().slice(0, 10);
        }
        if (ann) {
            ann.value = String(p.anniversary || "").trim().slice(0, 10);
        }
        if (ap) {
            ap.value = String(p.anniversaryPartnerName || "");
        }
        if (phone) {
            phone.value = String(p.phone || "");
        }
        if (group) {
            group.value = String(p.groupId || "");
        }
        if (la) {
            la.checked = Boolean(p.leaderboardAnonymous);
        }
        if (ps) {
            ps.checked = Boolean(p.photoSkipCloud);
        }
        var visWrap = document.getElementById("admin-user-editor-visible-wrap");
        var visFs = document.getElementById("admin-user-editor-visible-fieldset");
        if (visFs && visWrap) {
            var vkeys = Array.isArray(p.visibleModules) ? p.visibleModules : [];
            visFs.innerHTML = buildVisibleModulesHtml(row, vkeys);
            var hasVis = visFs.querySelector("input") !== null;
            visWrap.hidden = !hasVis;
        }
        setUserEditorStatus("", "", "");
        adminUserEditor.currentUid = String(uid);
        backdrop.hidden = false;
        document.body.classList.add("admin-user-editor-open");
        if (full) {
            full.focus();
        }
    }

    function syncCelebrationFromProfile(uid, profile) {
        if (!uid || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.resolve(null);
        }
        try {
            var p = profile && typeof profile === "object" ? profile : {};
            var fam = Array.isArray(p.familyMembers) ? p.familyMembers : [];
            var clean = [];
            for (var i = 0; i < fam.length && clean.length < 20; i += 1) {
                var m = fam[i];
                if (!m || typeof m !== "object") {
                    continue;
                }
                clean.push({
                    id: String(m.id || "").trim().slice(0, 64) || ("fm-" + i),
                    name: String(m.name || "").trim().slice(0, 120),
                    dob: String(m.dob || "").trim().slice(0, 12)
                });
            }
            var payload = {
                fullName: String(p.fullName || "").trim().slice(0, 120),
                dob: String(p.dob || "").trim().slice(0, 12),
                anniversary: String(p.anniversary || "").trim().slice(0, 12),
                anniversaryPartnerName: String(p.anniversaryPartnerName || "").trim().slice(0, 120),
                familyMembers: clean
            };
            if (window.firebase.firestore && window.firebase.firestore.FieldValue) {
                payload.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
            }
            return window.firebase.firestore().collection(CELEBRATION_PROFILES_COLLECTION).doc(String(uid)).set(payload, { merge: true }).catch(function () {
                return null;
            });
        } catch (e) {
            return Promise.resolve(null);
        }
    }

    function updateDirectoryDisplayName(uid, name, email) {
        var db = getFirestoreDb();
        if (!db || !uid || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            return Promise.resolve();
        }
        var disp = String(name || "").trim().slice(0, 120);
        var em = String(email || "").trim().toLowerCase();
        if (!disp) {
            disp = em && em.indexOf("@") > 0 ? em.split("@")[0].replace(/[._-]+/g, " ").trim() : "User";
        }
        var now = window.firebase.firestore.FieldValue.serverTimestamp();
        return db.collection("userDirectory").doc(String(uid)).set({
            displayName: disp,
            email: em || "unknown@users.invalid",
            lastSeenAt: now,
            updatedAt: now
        }, { merge: true });
    }

    function saveAdminUserProfile() {
        if (adminUserEditor.busy) {
            return;
        }
        var uid = normalizeUid(adminUserEditor.currentUid);
        if (!uid) {
            return;
        }
        var row = latestMemberRows[uid];
        if (!isAdminUser()) {
            setUserEditorStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return;
        }
        var db = getFirestoreDb();
        if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            setUserEditorStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return;
        }
        var full = document.getElementById("admin-user-editor-fullname");
        var dob = document.getElementById("admin-user-editor-dob");
        var ann = document.getElementById("admin-user-editor-anniversary");
        var ap = document.getElementById("admin-user-editor-anniv-partner");
        var phone = document.getElementById("admin-user-editor-phone");
        var group = document.getElementById("admin-user-editor-group");
        var la = document.getElementById("admin-user-editor-leader-anon");
        var ps = document.getElementById("admin-user-editor-photo-skip");
        var p0 = row && row.profile && typeof row.profile === "object" ? row.profile : {};
        var profile = Object.assign({}, p0, {
            fullName: full ? String(full.value || "").trim().slice(0, 120) : "",
            dob: dob ? String(dob.value || "").trim() : "",
            anniversary: ann ? String(ann.value || "").trim() : "",
            anniversaryPartnerName: ap ? String(ap.value || "").trim().slice(0, 120) : "",
            phone: phone ? String(phone.value || "").trim().slice(0, 40) : "",
            groupId: group ? String(group.value || "").trim().slice(0, 80) : "",
            leaderboardAnonymous: la ? Boolean(la.checked) : false,
            photoSkipCloud: ps ? Boolean(ps.checked) : false
        });
        if (p0.photoSkipCloud) {
            profile.photoSkipCloud = true;
        }
        var visKeys = getSelectedVisibleKeys();
        if (visKeys.length) {
            profile.visibleModules = visKeys;
        } else {
            var visWrap = document.getElementById("admin-user-editor-visible-wrap");
            if (visWrap && !visWrap.hidden) {
                profile.visibleModules = [];
            }
        }
        var ref = db.collection("users").doc(uid).collection("profile").doc("basic");
        var nameForDir = String(profile.fullName || row.displayName || row.name || "");
        setUserEditorBusy(true);
        setUserEditorStatus("working", "auth.working", "Please wait...");
        return ref.set({
            fullName: profile.fullName,
            dob: profile.dob,
            anniversary: profile.anniversary,
            anniversaryPartnerName: profile.anniversaryPartnerName,
            familyMembers: Array.isArray(p0.familyMembers) ? p0.familyMembers : [],
            phone: profile.phone,
            groupId: profile.groupId,
            leaderboardAnonymous: profile.leaderboardAnonymous,
            photoSkipCloud: profile.photoSkipCloud,
            visibleModules: Array.isArray(profile.visibleModules) ? profile.visibleModules : (p0.visibleModules || []),
            photoUrl: profile.photoSkipCloud && window.firebase.firestore && window.firebase.firestore.FieldValue
                ? window.firebase.firestore.FieldValue.delete()
                : (typeof p0.photoUrl === "string" ? p0.photoUrl : ""),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).then(function () {
            return syncCelebrationFromProfile(uid, profile);
        }).then(function () {
            return updateDirectoryDisplayName(uid, nameForDir, row.email);
        }).then(function () {
            if (row) {
                row.name = nameForDir;
                row.displayName = nameForDir;
                row.profile = Object.assign(p0, profile);
            }
            setUserEditorStatus("success", "admin.userEditorSaved", "Profile saved.");
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            return loadMemberUsers();
        }).then(function () {
            closeAdminUserEditor();
        }).catch(function () {
            setUserEditorStatus("error", "admin.userEditorError", "Could not save. Check Firestore rules.");
        }).finally(function () {
            setUserEditorBusy(false);
        });
    }

    function countTrueGrants(grants) {
        var n = 0;
        Object.keys(grants || {}).forEach(function (k) {
            if (grants[k] === true) {
                n += 1;
            }
        });
        return n;
    }

    function baseLimitedGrants() {
        var grants = {};
        var pool = getPoolFromForm();
        Object.keys(pool || {}).forEach(function (key) {
            grants[key] = pool[key] === true;
        });
        return grants;
    }

    function deriveLimitedGrants(existing) {
        var current = existing && typeof existing === "object" ? existing : {};
        if (countTrueGrants(current) > 0) {
            return current;
        }
        return baseLimitedGrants();
    }

    function inferTierFromAccess(accessData) {
        var raw = String(accessData && accessData.accessTier || "").toLowerCase();
        if (raw === "member" || raw === "limited") {
            return raw;
        }
        return "legacy";
    }

    function setMemberUsersBusy(isBusy) {
        memberUsersBusy = Boolean(isBusy);
        if (memberUsersRefreshBtn) {
            memberUsersRefreshBtn.disabled = memberUsersBusy;
        }
        if (memberUsersTbody) {
            memberUsersTbody.querySelectorAll("button[data-admin-member-uid]").forEach(function (btn) {
                btn.disabled = memberUsersBusy;
            });
        }
    }

    function renderMemberUsers(rows) {
        if (!memberUsersTbody || !memberUsersWrap) {
            return;
        }
        latestMemberRows = {};
        if (!rows.length) {
            memberUsersWrap.hidden = true;
            memberUsersTbody.innerHTML = "";
            setMemberUsersStatus("info", "admin.memberUsersEmpty", "No registered users found yet.");
            return;
        }
        var html = rows.map(function (row) {
            latestMemberRows[row.uid] = row;
            var tierLabel = row.tier === "member"
                ? T("admin.memberUsersTierMember", "Member")
                : (row.tier === "limited" ? T("admin.memberUsersTierLimited", "Limited") : T("admin.memberUsersTierLegacy", "Legacy"));
            var grantsCount = countTrueGrants(row.moduleGrants || {});
            var detailText = row.tier === "limited" ? (" (" + grantsCount + " modules)") : "";
            var name = row.name || row.displayName || ("User " + row.uid.slice(0, 8));
            var em = row.email || "";
            return "" +
                "<tr>" +
                "  <td>" + escapeHtml(name) + "</td>" +
                "  <td>" + (em ? "<a href=\"mailto:" + escapeHtml(em) + "\">" + escapeHtml(em) + "</a>" : "—") + "</td>" +
                "  <td><code>" + escapeHtml(row.uid) + "</code></td>" +
                "  <td>" + escapeHtml(tierLabel + detailText) + "</td>" +
                "  <td><div class=\"admin-member-users-actions\">" +
                "    <button type=\"button\" class=\"button-link\" data-admin-user-edit=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.memberUsersEdit", "Edit profile")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-member-uid=\"" + escapeHtml(row.uid) + "\" data-admin-member-target=\"member\">" + escapeHtml(T("admin.memberUsersSetMember", "Set member")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-member-uid=\"" + escapeHtml(row.uid) + "\" data-admin-member-target=\"limited\">" + escapeHtml(T("admin.memberUsersSetLimited", "Set limited")) + "</button>" +
                "  </div></td>" +
                "</tr>";
        }).join("");
        memberUsersTbody.innerHTML = html;
        memberUsersWrap.hidden = false;
    }

    function loadMemberUsers() {
        if (!memberUsersTbody || !memberUsersWrap) {
            return Promise.resolve([]);
        }
        if (!isAdminUser()) {
            memberUsersWrap.hidden = true;
            memberUsersTbody.innerHTML = "";
            setMemberUsersStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return Promise.resolve([]);
        }
        var db = getFirestoreDb();
        var fb = window.firebase;
        if (!db || !fb || !fb.firestore || !fb.firestore.FieldPath) {
            memberUsersWrap.hidden = true;
            memberUsersTbody.innerHTML = "";
            setMemberUsersStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return Promise.resolve([]);
        }
        setMemberUsersBusy(true);
        setMemberUsersStatus("working", "auth.working", "Please wait...");
        function queryWithTimeout(queryPromise) {
            return new Promise(function (resolve) {
                var settled = false;
                var timer = window.setTimeout(function () {
                    if (!settled) {
                        settled = true;
                        resolve({ timeout: true, snap: null });
                    }
                }, MEMBER_USERS_QUERY_TIMEOUT_MS);
                queryPromise.then(function (snap) {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    window.clearTimeout(timer);
                    resolve({ timeout: false, snap: snap || null });
                }).catch(function () {
                    if (settled) {
                        return;
                    }
                    settled = true;
                    window.clearTimeout(timer);
                    resolve({ timeout: false, snap: null });
                });
            });
        }
        return queryWithTimeout(db.collection("userDirectory").limit(MAX_MEMBER_USERS).get()).then(function (res) {
            return { directoryRes: res };
        }).then(function (ctx) {
            var directoryRes = ctx.directoryRes || { timeout: false, snap: null };
            var dirSnap = directoryRes.snap;
            var uids = [];
            if (dirSnap && !dirSnap.empty) {
                dirSnap.forEach(function (d) {
                    uids.push(String(d.id));
                });
            }
            if (!uids.length) {
                return {
                    directoryRes: directoryRes,
                    accessSnaps: {},
                    profileSnaps: {}
                };
            }
            return Promise.all(uids.map(function (u) {
                return db.collection("users").doc(u).collection("app").doc("access").get().then(function (as) {
                    return { uid: u, access: as };
                });
            })).then(function (accessList) {
                return Promise.all(uids.map(function (u) {
                    return db.collection("users").doc(u).collection("profile").doc("basic").get().then(function (ps) {
                        return { uid: u, profile: ps };
                    });
                })).then(function (profileList) {
                    var accessSnaps = {};
                    accessList.forEach(function (x) {
                        accessSnaps[x.uid] = x.access;
                    });
                    var profileSnaps = {};
                    profileList.forEach(function (x) {
                        profileSnaps[x.uid] = x.profile;
                    });
                    return {
                        directoryRes: directoryRes,
                        accessSnaps: accessSnaps,
                        profileSnaps: profileSnaps
                    };
                });
            });
        }).then(function (bundle) {
            var directoryRes = bundle.directoryRes || { timeout: false, snap: null };
            var dirSnap = directoryRes.snap;
            var accessSnaps = bundle.accessSnaps || {};
            var profileSnaps = bundle.profileSnaps || {};
            var byUid = {};
            if (dirSnap && !dirSnap.empty) {
                dirSnap.forEach(function (d) {
                    var uid = normalizeUid(d.id);
                    if (!uid) {
                        return;
                    }
                    var dr = d.data() || {};
                    byUid[uid] = {
                        uid: uid,
                        name: String(dr.displayName || "").trim(),
                        displayName: String(dr.displayName || "").trim(),
                        email: String(dr.email || "").trim().toLowerCase(),
                        tier: "legacy",
                        moduleGrants: {},
                        profile: {}
                    };
                });
            }
            Object.keys(byUid).forEach(function (uid) {
                var as = accessSnaps[uid];
                if (as && as.exists) {
                    var a = as.data() || {};
                    byUid[uid].tier = inferTierFromAccess(a);
                    byUid[uid].moduleGrants = a.moduleGrants && typeof a.moduleGrants === "object" ? a.moduleGrants : {};
                }
                var ps = profileSnaps[uid];
                if (ps && ps.exists) {
                    var p = ps.data() || {};
                    byUid[uid].profile = p;
                    if (!String(byUid[uid].name || "").trim() && p.fullName) {
                        byUid[uid].name = String(p.fullName || "").trim();
                    }
                }
            });
            var rows = Object.keys(byUid).map(function (uid) {
                return byUid[uid];
            }).sort(function (a, b) {
                var an = String(a.name || a.displayName || a.email || a.uid);
                var bn = String(b.name || b.displayName || b.email || b.uid);
                return an.localeCompare(bn);
            });
            renderMemberUsers(rows);
            if (rows.length) {
                setMemberUsersStatus("success", "admin.memberUsersLoaded", "Loaded registered users.");
            } else if (directoryRes.timeout) {
                setMemberUsersStatus("error", "admin.memberUsersLoadTimeout", "Loading users timed out. Please tap Refresh users again.");
            } else {
                setMemberUsersStatus("info", "admin.memberUsersEmpty", "No directory entries yet. Have users open the app while signed in, or use Refresh after they log in.");
            }
            return rows;
        }).catch(function () {
            memberUsersWrap.hidden = true;
            memberUsersTbody.innerHTML = "";
            setMemberUsersStatus("error", "admin.memberUsersLoadError", "Could not load registered users.");
            return [];
        }).finally(function () {
            setMemberUsersBusy(false);
        });
    }

    function setUserAccessTier(uid, targetTier) {
        var cleanUid = normalizeUid(uid);
        var nextTier = String(targetTier || "").toLowerCase() === "member" ? "member" : "limited";
        var db = getFirestoreDb();
        if (!cleanUid || !db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            setMemberUsersStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return Promise.resolve(null);
        }
        var row = latestMemberRows[cleanUid] || { moduleGrants: {} };
        var payload = {
            accessTier: nextTier,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            moduleGrants: nextTier === "member" ? {} : deriveLimitedGrants(row.moduleGrants)
        };
        setMemberUsersBusy(true);
        setMemberUsersStatus("working", "auth.working", "Please wait...");
        return db.collection("users").doc(cleanUid).collection("app").doc("access").set(payload, { merge: true }).then(function () {
            setMemberUsersStatus("success", "admin.memberUsersUpdated", "User access updated.");
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            return loadMemberUsers();
        }).catch(function () {
            setMemberUsersStatus("error", "admin.memberUsersUpdateError", "Could not update this user.");
            return null;
        }).finally(function () {
            setMemberUsersBusy(false);
        });
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
            if (memberGrantUidInput) {
                memberGrantUidInput.disabled = true;
            }
            if (memberGrantBtn) {
                memberGrantBtn.disabled = true;
            }
            if (memberUsersRefreshBtn) {
                memberUsersRefreshBtn.disabled = true;
            }
            if (memberUsersWrap) {
                memberUsersWrap.hidden = true;
            }
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
            if (poolFieldset) {
                poolFieldset.disabled = false;
            }
            if (accessSaveBtn) {
                accessSaveBtn.disabled = false;
            }
            if (codesTextarea) {
                codesTextarea.disabled = false;
            }
            if (memberGrantUidInput) {
                memberGrantUidInput.disabled = false;
            }
            if (memberGrantBtn) {
                memberGrantBtn.disabled = false;
            }
            if (memberUsersRefreshBtn) {
                memberUsersRefreshBtn.disabled = false;
            }
            setStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            setMemberUsersStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
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
            return loadMemberUsers();
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

    if (memberGrantBtn) {
        memberGrantBtn.addEventListener("click", function () {
            if (!isAdminUser()) {
                setAccessStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
                return;
            }
            var db = getFirestoreDb();
            if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
                setAccessStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
                return;
            }
            var uid = normalizeUid(memberGrantUidInput && memberGrantUidInput.value);
            if (!uid || uid.length < 8) {
                setAccessStatus("error", "admin.memberManualUidMissing", "Enter a valid Firebase UID first.");
                return;
            }
            setFormBusy(true);
            clearAccessStatus();
            db.collection("users").doc(uid).collection("app").doc("access").set({
                accessTier: "member",
                moduleGrants: {},
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }).then(function () {
                if (memberGrantUidInput) {
                    memberGrantUidInput.value = "";
                }
                setAccessStatus("success", "admin.memberManualGranted", "Member access granted for that UID.");
                return loadMemberUsers();
            }).catch(function () {
                setAccessStatus("error", "admin.memberManualGrantError", "Could not grant member access. Check UID and Firestore rules.");
            }).finally(function () {
                setFormBusy(false);
            });
        });
    }

    if (memberUsersRefreshBtn) {
        memberUsersRefreshBtn.addEventListener("click", function () {
            if (!isAdminUser()) {
                setMemberUsersStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
                return;
            }
            if (!memberUsersBusy) {
                loadMemberUsers();
            }
        });
    }

    if (memberUsersTbody) {
        memberUsersTbody.addEventListener("click", function (event) {
            if (memberUsersBusy) {
                return;
            }
            var editBtn = event.target.closest("button[data-admin-user-edit]");
            if (editBtn) {
                var euid = normalizeUid(editBtn.getAttribute("data-admin-user-edit"));
                if (euid) {
                    openAdminUserEditorForUid(euid);
                }
                return;
            }
            var button = event.target.closest("button[data-admin-member-uid]");
            if (!button) {
                return;
            }
            var uid = normalizeUid(button.getAttribute("data-admin-member-uid"));
            var targetTier = String(button.getAttribute("data-admin-member-target") || "").toLowerCase();
            if (!uid || (targetTier !== "member" && targetTier !== "limited")) {
                return;
            }
            setUserAccessTier(uid, targetTier);
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
