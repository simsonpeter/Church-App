(function () {
    function modOn(moduleKey) {
        var m = window.NjcAppModules;
        if (!m || typeof m.isModuleEnabled !== "function") {
            return true;
        }
        return m.isModuleEnabled(moduleKey);
    }

    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var TRIVIA_POINTS_KEY = "njc_trivia_points_v1";
    var READING_POINTS_KEY = "njc_reading_points_v1";
    var TRIVIA_GUEST_ID_KEY = "njc_trivia_guest_id_v1";
    var PROFILE_COLLECTION = "profile";
    var PROFILE_DOC_ID = "basic";
    var form = document.getElementById("profile-form");
    var fullNameInput = document.getElementById("profile-full-name");
    var dobInput = document.getElementById("profile-dob");
    var anniversaryInput = document.getElementById("profile-anniversary");
    var anniversaryPartnerInput = document.getElementById("profile-anniversary-partner");
    var phoneInput = document.getElementById("profile-phone");
    var groupIdInput = document.getElementById("profile-group-id");
    var leaderboardAnonymousInput = document.getElementById("profile-leaderboard-anonymous");
    var photoSkipCloudInput = document.getElementById("profile-photo-skip-cloud");
    var exportBtn = document.getElementById("profile-export-btn");
    var photoFileInput = document.getElementById("profile-photo-file");
    var saveButton = document.getElementById("profile-save-btn");
    var note = document.getElementById("profile-note");
    var avatarImage = document.getElementById("profile-avatar-image");
    var avatarFallback = document.getElementById("profile-avatar-fallback");
    var profileTriviaPointsValue = document.getElementById("profile-trivia-points-value");
    var profileReadingPointsValue = document.getElementById("profile-reading-points-value");
    var profileTotalPointsValue = document.getElementById("profile-total-points-value");
    var profileBadgesList = document.getElementById("profile-badges-list");
    var profileAchievementsCard = document.querySelector(".profile-achievements-card");
    var profileCard = form ? form.closest(".card") : null;
    var familyBlock = document.getElementById("profile-family-block");
    var familyList = document.getElementById("profile-family-list");
    var familyAddBtn = document.getElementById("profile-family-add");
    var memberAccessBlock = document.getElementById("profile-member-access-block");
    var memberCodeInput = document.getElementById("profile-member-code");
    var memberRedeemBtn = document.getElementById("profile-member-redeem-btn");
    var memberDowngradeBtn = document.getElementById("profile-member-downgrade-btn");
    var memberNote = document.getElementById("profile-member-note");
    var USER_APP_COLLECTION = "app";
    var USER_ACCESS_DOC_ID = "access";
    var FUNCTIONS_REGION = "europe-west1";
    var visibleModulesWrap = document.getElementById("profile-visible-modules-wrap");
    var busy = false;
    var noteState = "";
    var currentUid = "";
    var savedPhotoDataUrl = "";
    var selectedPhotoDataUrl = "";
    var MAX_UPLOAD_FILE_BYTES = 5 * 1024 * 1024;
    var MAX_PHOTO_SIDE = 720;
    var PHOTO_QUALITY = 0.82;
    var MAX_DATA_URL_LENGTH = 900000;
    /** Firestore document ~1 MiB max; leave headroom for field names and overhead. */
    var MAX_FIRESTORE_PHOTOURL_CHARS = 750000;
    /** Firebase Auth updateProfile rejects long or data: URLs; only sync http(s) links. */
    var MAX_AUTH_PHOTO_URL_LENGTH = 2048;
    var MAX_FAMILY_MEMBERS = 20;
    var FAMILY_DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
    var CELEBRATION_PROFILES_COLLECTION = "celebrationProfiles";

    var MODULE_LABEL_FALLBACK = {
        announcements: "Announcements (home)",
        bibleReading: "Today’s Bible reading (home)",
        dailyVerse: "Daily verse (home)",
        trivia: "Bible Quiz",
        eventsWeek: "Events this week (home)",
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

    function normalizeStringList(raw, maxLen) {
        if (!Array.isArray(raw)) {
            return [];
        }
        var cap = Number(maxLen) || 40;
        var seen = {};
        var out = [];
        raw.forEach(function (item) {
            var k = String(item || "").trim();
            if (!k || seen[k]) {
                return;
            }
            seen[k] = true;
            out.push(k);
        });
        return out.slice(0, cap);
    }

    function normalizeVisibleModulesList(raw) {
        var defs = window.NjcAppModules && window.NjcAppModules.DEFAULT_MODULES ? window.NjcAppModules.DEFAULT_MODULES : {};
        return normalizeStringList(raw, 40).filter(function (k) {
            return Object.prototype.hasOwnProperty.call(defs, k);
        });
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && profileCard) {
            return window.NjcI18n.tForElement(profileCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getCurrentUser() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return null;
        }
        return window.NjcAuth.getUser();
    }

    function getTriviaUserId() {
        var user = getCurrentUser();
        if (user && user.uid) {
            return "u:" + String(user.uid);
        }
        try {
            var gid = window.localStorage.getItem(TRIVIA_GUEST_ID_KEY);
            if (gid) return "g:" + gid;
            gid = "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
            window.localStorage.setItem(TRIVIA_GUEST_ID_KEY, gid);
            return "g:" + gid;
        } catch (e) {
            return "anon";
        }
    }

    function getTriviaPoints() {
        try {
            var raw = window.localStorage.getItem(TRIVIA_POINTS_KEY);
            var data = raw ? JSON.parse(raw) : {};
            var uid = getTriviaUserId();
            return Number(data[uid]) || 0;
        } catch (e) {
            return 0;
        }
    }

    function formatHalfPointTotal(value) {
        var n = Number(value) || 0;
        if (Math.abs(n - Math.round(n)) < 1e-9) {
            return String(Math.round(n));
        }
        return n.toFixed(1);
    }

    function getReadingPoints() {
        try {
            var raw = window.localStorage.getItem(READING_POINTS_KEY);
            var data = raw ? JSON.parse(raw) : {};
            var uid = getTriviaUserId();
            return Number(data[uid]) || 0;
        } catch (e) {
            return 0;
        }
    }

    function escapeHtmlLite(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function renderProfileBadges() {
        if (!profileBadgesList) {
            return;
        }
        var tr = getTriviaPoints();
        var rd = getReadingPoints();
        var quizOn = modOn("trivia");
        var sum = quizOn ? (tr + rd) : rd;
        var badges = [];
        if (rd >= 10) {
            badges.push({ icon: "book-open", label: T("profile.badgeReader10", "Dedicated reader (10+ reading points)") });
        }
        if (quizOn && tr >= 10) {
            badges.push({ icon: "question-circle", label: T("profile.badgeTrivia10", "Bible Quiz champion (10+ quiz points)") });
        }
        if (sum >= 25) {
            badges.push({ icon: "star", label: T("profile.badgeAllStar", "All-star (25+ total points)") });
        }
        if (!badges.length) {
            var emptyMsg = quizOn
                ? T("profile.badgesEmpty", "Keep reading and playing Bible Quiz to earn badges.")
                : T("profile.badgesEmptyReadingOnly", "Keep reading to earn badges.");
            profileBadgesList.innerHTML = "<li class=\"page-note profile-badge-empty\">" + escapeHtmlLite(emptyMsg) + "</li>";
            return;
        }
        profileBadgesList.innerHTML = badges.map(function (b) {
            return "<li class=\"profile-badge-chip\"><i class=\"fa-solid fa-" + b.icon + "\" aria-hidden=\"true\"></i> " + escapeHtmlLite(b.label) + "</li>";
        }).join("");
    }

    function renderProfileAchievementPoints() {
        var trivia = getTriviaPoints();
        var reading = getReadingPoints();
        var quizOn = modOn("trivia");
        var total = quizOn ? (trivia + reading) : reading;
        var triviaRow = document.querySelector(".profile-achievement-row--trivia-module");
        if (triviaRow) {
            triviaRow.hidden = !quizOn;
        }
        if (profileTriviaPointsValue) {
            profileTriviaPointsValue.textContent = String(trivia);
        }
        if (profileReadingPointsValue) {
            profileReadingPointsValue.textContent = formatHalfPointTotal(reading);
        }
        if (profileTotalPointsValue) {
            profileTotalPointsValue.textContent = formatHalfPointTotal(total);
        }
        renderProfileBadges();
    }

    function syncAchievementBoardIfPossible() {
        if (!currentUid) {
            return;
        }
        var board = window.NjcAchievementBoard;
        if (board && typeof board.syncMyPublicScore === "function") {
            board.syncMyPublicScore();
        }
    }

    function getProfileMap() {
        try {
            var raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function saveProfileMap(map) {
        try {
            window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(map && typeof map === "object" ? map : {}));
        } catch (err) {
            return null;
        }
        return null;
    }

    function getFirestoreProfileDoc(uid) {
        if (!uid || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return null;
        }
        try {
            return window.firebase.firestore()
                .collection("users")
                .doc(uid)
                .collection(PROFILE_COLLECTION)
                .doc(PROFILE_DOC_ID);
        } catch (err) {
            return null;
        }
    }

    function makeFamilyMemberId() {
        return "fm-" + String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10);
    }

    function normalizeFamilyMembersList(raw) {
        if (!Array.isArray(raw)) {
            return [];
        }
        var seen = {};
        var out = [];
        for (var i = 0; i < raw.length && out.length < MAX_FAMILY_MEMBERS; i += 1) {
            var row = raw[i];
            if (!row || typeof row !== "object") {
                continue;
            }
            var id = String(row.id || "").trim() || makeFamilyMemberId();
            if (seen[id]) {
                id = makeFamilyMemberId();
            }
            seen[id] = true;
            var name = String(row.name || "").trim().slice(0, 120);
            var dob = String(row.dob || "").trim();
            if (!name || !FAMILY_DOB_RE.test(dob)) {
                continue;
            }
            out.push({ id: id, name: name, dob: dob });
        }
        return out;
    }

    /** Keep local-only family rows when cloud list is older or partial (same id: cloud wins). */
    function mergeFamilyMembersPreservingLocal(localRaw, cloudRaw) {
        var localFam = normalizeFamilyMembersList(localRaw);
        var cloudFam = normalizeFamilyMembersList(cloudRaw);
        var byId = {};
        var order = [];
        cloudFam.forEach(function (m) {
            byId[m.id] = m;
            order.push(m.id);
        });
        localFam.forEach(function (m) {
            if (!byId[m.id]) {
                byId[m.id] = m;
                order.push(m.id);
            }
        });
        return order.map(function (id) {
            return byId[id];
        }).slice(0, MAX_FAMILY_MEMBERS);
    }

    function syncCelebrationProfilePublic(uid, profile) {
        if (!uid || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.resolve(null);
        }
        try {
            var p = profile && typeof profile === "object" ? profile : {};
            var fam = normalizeFamilyMembersList(p.familyMembers || []);
            var payload = {
                fullName: String(p.fullName || "").trim().slice(0, 120),
                dob: String(p.dob || "").trim().slice(0, 12),
                anniversary: String(p.anniversary || "").trim().slice(0, 12),
                anniversaryPartnerName: String(p.anniversaryPartnerName || "").trim().slice(0, 120),
                familyMembers: fam
            };
            if (window.firebase.firestore && window.firebase.firestore.FieldValue) {
                payload.updatedAt = window.firebase.firestore.FieldValue.serverTimestamp();
            }
            return window.firebase.firestore().collection(CELEBRATION_PROFILES_COLLECTION).doc(String(uid)).set(payload, { merge: true }).catch(function () {
                return null;
            });
        } catch (eSync) {
            return Promise.resolve(null);
        }
    }

    function profilePayloadForFirestore(profile) {
        var base = profile && typeof profile === "object" ? profile : {};
        var out = {
            fullName: base.fullName,
            dob: base.dob,
            anniversary: base.anniversary,
            anniversaryPartnerName: String(base.anniversaryPartnerName || "").trim().slice(0, 120),
            familyMembers: normalizeFamilyMembersList(base.familyMembers),
            phone: base.phone,
            groupId: base.groupId || "",
            leaderboardAnonymous: Boolean(base.leaderboardAnonymous),
            photoSkipCloud: Boolean(base.photoSkipCloud),
            visibleModules: normalizeVisibleModulesList(base.visibleModules),
            updatedAt: base.updatedAt
        };
        if (base.photoSkipCloud) {
            out.photoUrl = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue
                ? window.firebase.firestore.FieldValue.delete()
                : "";
        } else {
            var photo = String(base.photoUrl || "").trim();
            if (photo && photo.length <= MAX_FIRESTORE_PHOTOURL_CHARS) {
                out.photoUrl = photo;
            }
        }
        return out;
    }

    function deriveNameFromEmail(email) {
        var raw = String(email || "").trim().toLowerCase();
        if (!raw || raw.indexOf("@") < 1) {
            return "User";
        }
        return raw.split("@")[0].replace(/[._-]+/g, " ").trim() || "User";
    }

    function getInitials(text) {
        var parts = String(text || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) {
            return "U";
        }
        if (parts.length === 1) {
            return parts[0].slice(0, 2).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }

    function setNote(state, key, fallback) {
        if (!note) {
            return;
        }
        note.hidden = !key;
        noteState = key ? state : "";
        note.dataset.state = noteState;
        note.textContent = key ? T(key, fallback) : "";
    }

    function setBusy(isBusy) {
        busy = Boolean(isBusy);
        if (saveButton) {
            saveButton.disabled = busy;
        }
    }

    function setFormEnabled(enabled) {
        var disabled = !enabled;
        [fullNameInput, dobInput, anniversaryInput, anniversaryPartnerInput, phoneInput, groupIdInput, leaderboardAnonymousInput, photoSkipCloudInput, photoFileInput].forEach(function (node) {
            if (node) {
                node.disabled = disabled;
            }
        });
        if (familyAddBtn) {
            familyAddBtn.disabled = disabled;
        }
        if (familyList) {
            familyList.querySelectorAll(".profile-family-name, .profile-family-dob").forEach(function (inp) {
                inp.disabled = disabled;
            });
            familyList.querySelectorAll(".profile-family-remove").forEach(function (btn) {
                btn.disabled = disabled;
            });
        }
        if (visibleModulesWrap) {
            visibleModulesWrap.querySelectorAll("input[data-profile-visible-module]").forEach(function (inp) {
                inp.disabled = disabled;
            });
        }
        if (saveButton) {
            saveButton.disabled = disabled || busy;
        }
    }

    function sanitizeGroupIdInput(raw) {
        return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    }

    /** Profile dates are stored as YYYY-MM-DD strings; tolerate Firestore Timestamp in old data. */
    function coerceProfileYmd(raw) {
        if (raw == null || raw === "") {
            return "";
        }
        if (typeof raw === "string") {
            var t = raw.trim();
            return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : "";
        }
        if (raw && typeof raw.toDate === "function") {
            try {
                var d = raw.toDate();
                var y = d.getFullYear();
                var m = String(d.getMonth() + 1).padStart(2, "0");
                var day = String(d.getDate()).padStart(2, "0");
                return y + "-" + m + "-" + day;
            } catch (eY) {
                return "";
            }
        }
        return "";
    }

    function normalizeProfile(profile, user) {
        var source = profile && typeof profile === "object" ? profile : {};
        var activeUser = user && typeof user === "object" ? user : {};
        return {
            fullName: String(source.fullName || activeUser.displayName || deriveNameFromEmail(activeUser.email || "")).trim(),
            dob: coerceProfileYmd(source.dob),
            anniversary: coerceProfileYmd(source.anniversary),
            anniversaryPartnerName: String(source.anniversaryPartnerName || "").trim().slice(0, 120),
            familyMembers: normalizeFamilyMembersList(source.familyMembers),
            phone: String(source.phone || activeUser.phoneNumber || "").trim(),
            groupId: sanitizeGroupIdInput(source.groupId),
            leaderboardAnonymous: Boolean(source.leaderboardAnonymous),
            photoSkipCloud: Boolean(source.photoSkipCloud),
            photoUrl: String(source.photoUrl || activeUser.photoURL || "").trim(),
            visibleModules: normalizeVisibleModulesList(source.visibleModules),
            updatedAt: Number(source.updatedAt || Date.now()) || Date.now()
        };
    }

    function collectVisibleModulesFromDom() {
        if (!visibleModulesWrap || visibleModulesWrap.hidden) {
            return [];
        }
        var keys = [];
        visibleModulesWrap.querySelectorAll("input[data-profile-visible-module]").forEach(function (input) {
            if (input.checked) {
                var k = String(input.getAttribute("data-profile-visible-module") || "").trim();
                if (k) {
                    keys.push(k);
                }
            }
        });
        return normalizeVisibleModulesList(keys);
    }

    function renderVisibleModulesSection(profile) {
        if (!visibleModulesWrap) {
            return;
        }
        var m = window.NjcAppModules;
        if (!m || typeof m.isLimitedMemberSync !== "function" || !m.isLimitedMemberSync()) {
            visibleModulesWrap.hidden = true;
            visibleModulesWrap.innerHTML = "";
            return;
        }
        var grant = typeof m.getLimitedGrantModuleKeysSync === "function" ? m.getLimitedGrantModuleKeysSync() : [];
        if (!grant.length) {
            visibleModulesWrap.hidden = true;
            visibleModulesWrap.innerHTML = "";
            return;
        }
        visibleModulesWrap.hidden = false;
        var prof = profile && typeof profile === "object" ? profile : {};
        var selected = normalizeVisibleModulesList(prof.visibleModules);
        var selSet = {};
        selected.forEach(function (k) {
            selSet[k] = true;
        });
        var intro = escapeHtmlLite(T("profile.visibleModulesIntro", "Your church has enabled only some sections. Choose which ones you want on your menu and home screen, then tap Save."));
        var legend = escapeHtmlLite(T("profile.visibleModulesLegend", "Show these sections in the app"));
        var html = "<p class=\"page-note profile-visible-modules-intro\">" + intro + "</p>" +
            "<fieldset class=\"profile-visible-modules-fieldset\">" +
            "<legend class=\"page-note\">" + legend + "</legend>";
        grant.forEach(function (key) {
            var checked = !selected.length || selSet[key] ? " checked" : "";
            var label = escapeHtmlLite(T("admin.module" + key.charAt(0).toUpperCase() + key.slice(1), MODULE_LABEL_FALLBACK[key] || key));
            html += "<label class=\"profile-field profile-checkbox-field\">" +
                "<input type=\"checkbox\" data-profile-visible-module=\"" + escapeHtmlLite(key) + "\"" + checked + ">" +
                "<span>" + label + "</span></label>";
        });
        html += "</fieldset>";
        visibleModulesWrap.innerHTML = html;
    }

    function collectFamilyMembersFromDom() {
        if (!familyList) {
            return [];
        }
        var rows = familyList.querySelectorAll(".profile-family-row");
        var raw = [];
        rows.forEach(function (li) {
            var id = String(li.getAttribute("data-family-id") || "").trim() || makeFamilyMemberId();
            var nameInput = li.querySelector(".profile-family-name");
            var dobInputNode = li.querySelector(".profile-family-dob");
            raw.push({
                id: id,
                name: String(nameInput && nameInput.value || "").trim(),
                dob: String(dobInputNode && dobInputNode.value || "").trim()
            });
        });
        return normalizeFamilyMembersList(raw);
    }

    function getCurrentFormProfile() {
        var user = getCurrentUser() || {};
        var uid = String(user.uid || "").trim();
        var map = getProfileMap();
        var existing = normalizeProfile(uid ? (map[uid] || {}) : {}, user);
        var m = window.NjcAppModules;
        var limited = m && typeof m.isLimitedMemberSync === "function" && m.isLimitedMemberSync();
        var vis = existing.visibleModules;
        if (limited && visibleModulesWrap && !visibleModulesWrap.hidden) {
            vis = collectVisibleModulesFromDom();
        }
        return {
            fullName: String(fullNameInput && fullNameInput.value || "").trim(),
            dob: String(dobInput && dobInput.value || "").trim(),
            anniversary: String(anniversaryInput && anniversaryInput.value || "").trim(),
            anniversaryPartnerName: String(anniversaryPartnerInput && anniversaryPartnerInput.value || "").trim().slice(0, 120),
            familyMembers: collectFamilyMembersFromDom(),
            phone: String(phoneInput && phoneInput.value || "").trim(),
            groupId: sanitizeGroupIdInput(groupIdInput && groupIdInput.value),
            leaderboardAnonymous: Boolean(leaderboardAnonymousInput && leaderboardAnonymousInput.checked),
            photoSkipCloud: Boolean(photoSkipCloudInput && photoSkipCloudInput.checked),
            photoUrl: String(selectedPhotoDataUrl || savedPhotoDataUrl || "").trim(),
            visibleModules: normalizeVisibleModulesList(vis),
            updatedAt: Date.now()
        };
    }

    function buildFamilyRowHtml(member, disabled) {
        var id = String(member && member.id || "").trim() || makeFamilyMemberId();
        var name = String(member && member.name || "").trim();
        var dob = String(member && member.dob || "").trim();
        var dis = disabled ? " disabled" : "";
        var removeLabel = escapeHtmlLite(T("profile.familyRemove", "Remove"));
        var nameLabel = escapeHtmlLite(T("profile.familyName", "Name"));
        var dobLabel = escapeHtmlLite(T("profile.familyBirthday", "Birthday"));
        return "" +
            "<li class=\"profile-family-row\" data-family-id=\"" + escapeHtmlLite(id) + "\">" +
            "  <div class=\"profile-family-row-fields\">" +
            "    <label class=\"profile-family-field\">" +
            "      <span>" + nameLabel + "</span>" +
            "      <input class=\"search-input profile-family-name\" type=\"text\" autocomplete=\"name\" maxlength=\"120\" value=\"" + escapeHtmlLite(name) + "\"" + dis + ">" +
            "    </label>" +
            "    <label class=\"profile-family-field\">" +
            "      <span>" + dobLabel + "</span>" +
            "      <input class=\"search-input profile-family-dob\" type=\"date\" autocomplete=\"bday\" value=\"" + escapeHtmlLite(dob) + "\"" + dis + ">" +
            "    </label>" +
            "  </div>" +
            "  <button type=\"button\" class=\"button-link button-secondary profile-family-remove\"" + dis + " aria-label=\"" + removeLabel + "\">" + removeLabel + "</button>" +
            "</li>";
    }

    function renderFamilyList(profile, formDisabled) {
        if (!familyList) {
            return;
        }
        var members = profile && Array.isArray(profile.familyMembers) ? profile.familyMembers : [];
        familyList.innerHTML = members.map(function (m) {
            return buildFamilyRowHtml(m, formDisabled);
        }).join("");
    }

    function appendEmptyFamilyRow() {
        if (!familyList || familyList.querySelectorAll(".profile-family-row").length >= MAX_FAMILY_MEMBERS) {
            return;
        }
        var id = makeFamilyMemberId();
        familyList.insertAdjacentHTML("beforeend", buildFamilyRowHtml({ id: id, name: "", dob: "" }, false));
    }

    function fileToDataUrl(file) {
        return new Promise(function (resolve, reject) {
            if (!file) {
                reject(new Error("Missing file"));
                return;
            }
            var reader = new FileReader();
            reader.onload = function () {
                resolve(String(reader.result || ""));
            };
            reader.onerror = function () {
                reject(new Error("File read failed"));
            };
            reader.readAsDataURL(file);
        });
    }

    function loadImage(dataUrl) {
        return new Promise(function (resolve, reject) {
            var image = new Image();
            image.onload = function () {
                resolve(image);
            };
            image.onerror = function () {
                reject(new Error("Image decode failed"));
            };
            image.src = dataUrl;
        });
    }

    async function createPhotoDataUrl(file) {
        if (!file || String(file.type || "").indexOf("image/") !== 0) {
            throw new Error("not_image");
        }
        if (Number(file.size || 0) > MAX_UPLOAD_FILE_BYTES) {
            throw new Error("too_large_file");
        }
        var sourceDataUrl = await fileToDataUrl(file);
        var image = await loadImage(sourceDataUrl);
        var sourceWidth = Number(image.naturalWidth || image.width || 0);
        var sourceHeight = Number(image.naturalHeight || image.height || 0);
        if (!sourceWidth || !sourceHeight) {
            throw new Error("invalid_dimensions");
        }
        var scale = Math.min(1, MAX_PHOTO_SIDE / Math.max(sourceWidth, sourceHeight));
        var width = Math.max(1, Math.round(sourceWidth * scale));
        var height = Math.max(1, Math.round(sourceHeight * scale));
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var context = canvas.getContext("2d");
        if (!context) {
            return sourceDataUrl;
        }
        context.drawImage(image, 0, 0, width, height);
        var compressed = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
        if (compressed.length > MAX_DATA_URL_LENGTH) {
            compressed = canvas.toDataURL("image/jpeg", 0.68);
        }
        if (compressed.length > MAX_DATA_URL_LENGTH) {
            throw new Error("too_large_data");
        }
        return compressed;
    }

    function renderAvatar(profile, user) {
        if (!avatarImage || !avatarFallback) {
            return;
        }
        var source = profile && typeof profile === "object" ? profile : {};
        var activeUser = user && typeof user === "object" ? user : {};
        var photoUrl = String(source.photoUrl || activeUser.photoURL || "").trim();
        var displayName = String(source.fullName || activeUser.displayName || deriveNameFromEmail(activeUser.email || "")).trim();
        var initials = getInitials(displayName);
        avatarFallback.textContent = initials;
        if (photoUrl) {
            avatarImage.src = photoUrl;
            avatarImage.hidden = false;
            avatarFallback.hidden = true;
            return;
        }
        avatarImage.hidden = true;
        avatarImage.removeAttribute("src");
        avatarFallback.hidden = false;
    }

    function populateForm(profile) {
        if (fullNameInput) {
            fullNameInput.value = String(profile.fullName || "");
        }
        if (dobInput) {
            dobInput.value = String(profile.dob || "");
        }
        if (anniversaryInput) {
            anniversaryInput.value = String(profile.anniversary || "");
        }
        if (anniversaryPartnerInput) {
            anniversaryPartnerInput.value = String(profile.anniversaryPartnerName || "");
        }
        if (phoneInput) {
            phoneInput.value = String(profile.phone || "");
        }
        if (groupIdInput) {
            groupIdInput.value = String(profile.groupId || "");
        }
        if (leaderboardAnonymousInput) {
            leaderboardAnonymousInput.checked = Boolean(profile.leaderboardAnonymous);
        }
        if (photoSkipCloudInput) {
            photoSkipCloudInput.checked = Boolean(profile.photoSkipCloud);
        }
        savedPhotoDataUrl = String(profile.photoUrl || "");
        selectedPhotoDataUrl = "";
        if (photoFileInput) {
            photoFileInput.value = "";
        }
        var fam = normalizeProfile(profile, getCurrentUser() || {});
        renderFamilyList(fam, !getCurrentUser());
        window.setTimeout(function () {
            renderVisibleModulesSection(fam);
        }, 0);
    }

    function notifyProfileUpdated(uid, profile) {
        document.dispatchEvent(new CustomEvent("njc:profile-updated", {
            detail: {
                uid: String(uid || ""),
                profile: profile || {}
            }
        }));
    }

    async function syncAuthBasicProfile(profile) {
        if (!window.firebase || !window.firebase.auth || typeof window.firebase.auth !== "function") {
            return;
        }
        try {
            var authUser = window.firebase.auth().currentUser;
            if (!authUser || typeof authUser.updateProfile !== "function") {
                return;
            }
            var rawPhoto = String(profile && profile.photoUrl || "").trim();
            var safePhoto = "";
            if (rawPhoto && (rawPhoto.indexOf("https://") === 0 || rawPhoto.indexOf("http://") === 0)) {
                if (rawPhoto.length <= MAX_AUTH_PHOTO_URL_LENGTH) {
                    safePhoto = rawPhoto;
                }
            }
            if (profile && profile.photoSkipCloud) {
                safePhoto = "";
            }
            await authUser.updateProfile({
                displayName: String(profile && profile.fullName || "").trim(),
                photoURL: safePhoto
            });
        } catch (err) {
            return;
        }
    }

    function setMemberNote(message, state) {
        if (!memberNote) {
            return;
        }
        memberNote.hidden = !message;
        memberNote.textContent = message || "";
        memberNote.dataset.state = state || "";
    }

    function memberRedeemErrorMessage(err) {
        var codeStr = String(err && err.code || "").toLowerCase();
        var msg = String(err && err.message || "").trim();
        if (codeStr.indexOf("not-found") >= 0 || codeStr.indexOf("invalid-argument") >= 0) {
            return { key: "profile.memberRedeemInvalid", fb: "That code is not valid or was already used." };
        }
        if (codeStr.indexOf("permission-denied") >= 0) {
            return { key: "profile.memberRedeemPermission", fb: "Permission denied. Sign in again or ask the church for help." };
        }
        if (codeStr.indexOf("unauthenticated") >= 0) {
            return { key: "profile.memberRedeemAuth", fb: "Please sign in again, then try the code." };
        }
        if (codeStr.indexOf("unavailable") >= 0 || codeStr.indexOf("deadline-exceeded") >= 0 || codeStr.indexOf("resource-exhausted") >= 0) {
            return { key: "profile.memberRedeemBusy", fb: "Server was busy. Wait a moment and try again." };
        }
        if (codeStr.indexOf("internal") >= 0 || codeStr.indexOf("cancelled") >= 0 || codeStr.indexOf("aborted") >= 0) {
            return { key: "profile.memberRedeemServer", fb: "The member-code service is not responding. This often means Firebase Functions failed to deploy or are still starting. Try again later or contact the church." };
        }
        if (msg && msg.length <= 220 && msg.toLowerCase().indexOf("internal assertion") < 0) {
            return { raw: msg };
        }
        return { key: "profile.memberRedeemError", fb: "Something went wrong. Try again later." };
    }

    function updateMemberAccessUi() {
        if (!memberAccessBlock) {
            return;
        }
        var user = getCurrentUser();
        if (!user || !user.uid) {
            memberAccessBlock.hidden = true;
            setMemberNote("", "");
            return;
        }
        memberAccessBlock.hidden = false;
        var acc = window.NjcAppModules && typeof window.NjcAppModules.getAccessSync === "function"
            ? window.NjcAppModules.getAccessSync()
            : { tier: "legacy", loaded: false };
        if (acc.tier === "member") {
            if (memberCodeInput) {
                memberCodeInput.disabled = true;
            }
            if (memberRedeemBtn) {
                memberRedeemBtn.hidden = true;
            }
            if (memberDowngradeBtn) {
                memberDowngradeBtn.hidden = false;
            }
            if (memberNote && memberNote.dataset.state !== "working") {
                setMemberNote(T("profile.memberAlreadyFull", "You already have church member access. The menu shows every module the church has enabled."), "ok");
            }
        } else {
            if (memberCodeInput) {
                memberCodeInput.disabled = false;
            }
            if (memberRedeemBtn) {
                memberRedeemBtn.hidden = false;
            }
            if (memberDowngradeBtn) {
                memberDowngradeBtn.hidden = true;
            }
            if (memberNote && memberNote.dataset.state !== "working") {
                var st = memberNote.dataset.state;
                if (st !== "error" && st !== "ok") {
                    setMemberNote("", "");
                }
            }
        }
    }

    async function downgradeMemberToNormalPlus() {
        if (!memberDowngradeBtn || memberDowngradeBtn.hidden) {
            return;
        }
        var user = getCurrentUser();
        var uid = String(user && user.uid || "").trim();
        if (!uid || !String(user.email || "").trim()) {
            setMemberNote(T("profile.memberDowngradeNeedAuth", "Sign in with email to change this."), "error");
            return;
        }
        if (!window.confirm(T("profile.memberDowngradeConfirm", "Switch to a normal account? You will only see sections allowed for new sign-ups until the church upgrades you again."))) {
            return;
        }
        if (!window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            setMemberNote(T("profile.memberRedeemUnavailable", "This action is not available right now."), "error");
            return;
        }
        memberDowngradeBtn.disabled = true;
        setMemberNote(T("auth.working", "Please wait..."), "working");
        try {
            if (window.NjcAppModules && typeof window.NjcAppModules.ensureRegistrationPoolLoaded === "function") {
                await window.NjcAppModules.ensureRegistrationPoolLoaded();
            }
            var grants = window.NjcAppModules && typeof window.NjcAppModules.getNormalPlusModuleGrantsSync === "function"
                ? window.NjcAppModules.getNormalPlusModuleGrantsSync()
                : {};
            await window.firebase.firestore().collection("users").doc(uid).collection(USER_APP_COLLECTION).doc(USER_ACCESS_DOC_ID).set({
                accessTier: "limited",
                moduleGrants: grants,
                updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            if (window.NjcAppModules && typeof window.NjcAppModules.refresh === "function") {
                await window.NjcAppModules.refresh();
            }
            setMemberNote(T("profile.memberDowngradeOk", "You are now on a normal account. Refresh if the menu does not update."), "ok");
            updateMemberAccessUi();
        } catch (err) {
            setMemberNote(T("profile.memberDowngradeFail", "Could not update. Ask the church to check Firestore rules, then try again."), "error");
        } finally {
            memberDowngradeBtn.disabled = false;
        }
    }

    async function redeemMemberCode() {
        if (!memberCodeInput || !memberRedeemBtn || memberRedeemBtn.hidden) {
            return;
        }
        var code = String(memberCodeInput.value || "").trim();
        if (!code) {
            setMemberNote(T("profile.memberCodeEmpty", "Enter a code first."), "error");
            return;
        }
        var fb = window.firebase;
        if (!fb || !fb.auth || !fb.functions || typeof fb.app !== "function") {
            setMemberNote(T("profile.memberRedeemUnavailable", "This action is not available right now."), "error");
            return;
        }
        var auth = fb.auth();
        if (!auth.currentUser) {
            return;
        }
        if (memberRedeemBtn) {
            memberRedeemBtn.disabled = true;
        }
        setMemberNote(T("auth.working", "Please wait..."), "working");
        try {
            await auth.currentUser.getIdToken(true);
            var region = fb.app().functions(FUNCTIONS_REGION);
            var callable = region.httpsCallable("redeemMemberCode", { timeout: 70000 });
            await callable({ code: code });
            memberCodeInput.value = "";
            setMemberNote(T("profile.memberRedeemOk", "Member access unlocked."), "ok");
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            try {
                if (window.NjcAppModules && typeof window.NjcAppModules.refresh === "function") {
                    await window.NjcAppModules.refresh();
                }
            } catch (refreshErr) {
                setMemberNote(T("profile.memberRedeemOkRefreshWarn", "Member access unlocked. If the menu does not update, refresh the page."), "ok");
            }
            updateMemberAccessUi();
            if (window.NjcAppModules && typeof window.NjcAppModules.getSync === "function") {
                document.dispatchEvent(new CustomEvent("njc:modules-updated", { detail: { modules: window.NjcAppModules.getSync() } }));
            }
        } catch (err) {
            var mapped = memberRedeemErrorMessage(err);
            if (mapped.raw) {
                setMemberNote(mapped.raw, "error");
            } else {
                setMemberNote(T(mapped.key, mapped.fb), "error");
            }
        } finally {
            if (memberRedeemBtn) {
                memberRedeemBtn.disabled = false;
            }
        }
    }

    async function loadProfile() {
        if (!form) {
            return;
        }
        var user = getCurrentUser();
        currentUid = String(user && user.uid || "");
        if (!currentUid) {
            setFormEnabled(false);
            populateForm({ fullName: "", dob: "", anniversary: "", anniversaryPartnerName: "", familyMembers: [], phone: "", groupId: "", leaderboardAnonymous: false, photoSkipCloud: false, photoUrl: "" });
            renderAvatar({}, user);
            renderProfileAchievementPoints();
            setNote("authRequired", "profile.loginRequired", "Please login to manage your profile.");
            updateMemberAccessUi();
            return;
        }

        setFormEnabled(true);
        updateMemberAccessUi();
        var map = getProfileMap();
        var localProfile = normalizeProfile(map[currentUid] || {}, user);
        populateForm(localProfile);
        renderAvatar(localProfile, user);
        renderProfileAchievementPoints();
        setNote("", "", "");

        var doc = getFirestoreProfileDoc(currentUid);
        if (!doc) {
            syncCelebrationProfilePublic(currentUid, localProfile);
            syncAchievementBoardIfPossible();
            updateMemberAccessUi();
            return;
        }
        try {
            var snapshot = await doc.get();
            if (!snapshot.exists) {
                syncCelebrationProfilePublic(currentUid, localProfile);
                syncAchievementBoardIfPossible();
                updateMemberAccessUi();
                return;
            }
            var cloudProfile = normalizeProfile(snapshot.data() || {}, user);
            var localPhoto = String(localProfile.photoUrl || "").trim();
            var cloudPhoto = String(cloudProfile.photoUrl || "").trim();
            if (!cloudPhoto && localPhoto) {
                cloudProfile = Object.assign({}, cloudProfile, { photoUrl: localPhoto });
            }
            var localDob = String(localProfile.dob || "").trim();
            var cloudDob = String(cloudProfile.dob || "").trim();
            if (!cloudDob && /^\d{4}-\d{2}-\d{2}$/.test(localDob)) {
                cloudProfile = Object.assign({}, cloudProfile, { dob: localDob });
            }
            if (!String(cloudProfile.groupId || "").trim() && String(localProfile.groupId || "").trim()) {
                cloudProfile = Object.assign({}, cloudProfile, { groupId: sanitizeGroupIdInput(localProfile.groupId) });
            }
            if (!cloudProfile.leaderboardAnonymous && localProfile.leaderboardAnonymous) {
                cloudProfile = Object.assign({}, cloudProfile, { leaderboardAnonymous: true });
            }
            if (!cloudProfile.photoSkipCloud && localProfile.photoSkipCloud) {
                cloudProfile = Object.assign({}, cloudProfile, { photoSkipCloud: true });
            }
            var localAnn = String(localProfile.anniversary || "").trim();
            var cloudAnn = String(cloudProfile.anniversary || "").trim();
            if (!cloudAnn && localAnn) {
                cloudProfile = Object.assign({}, cloudProfile, { anniversary: localAnn });
            }
            var localPartner = String(localProfile.anniversaryPartnerName || "").trim();
            var cloudPartner = String(cloudProfile.anniversaryPartnerName || "").trim();
            if (!cloudPartner && localPartner) {
                cloudProfile = Object.assign({}, cloudProfile, { anniversaryPartnerName: localPartner });
            }
            var mergedFam = mergeFamilyMembersPreservingLocal(localProfile.familyMembers, cloudProfile.familyMembers);
            cloudProfile = Object.assign({}, cloudProfile, { familyMembers: mergedFam });
            map[currentUid] = cloudProfile;
            saveProfileMap(map);
            populateForm(cloudProfile);
            renderAvatar(cloudProfile, user);
            notifyProfileUpdated(currentUid, cloudProfile);
            syncCelebrationProfilePublic(currentUid, cloudProfile);
        } catch (err) {
            syncAchievementBoardIfPossible();
            updateMemberAccessUi();
            return;
        }
        syncAchievementBoardIfPossible();
        updateMemberAccessUi();
    }

    async function saveProfile(event) {
        event.preventDefault();
        if (busy) {
            return;
        }
        var user = getCurrentUser();
        var uid = String(user && user.uid || "");
        if (!uid) {
            setNote("authRequired", "profile.loginRequired", "Please login to manage your profile.");
            return;
        }
        setBusy(true);
        var profile = normalizeProfile(getCurrentFormProfile(), user);
        var map = getProfileMap();
        map[uid] = profile;
        saveProfileMap(map);
        savedPhotoDataUrl = String(profile.photoUrl || "");
        selectedPhotoDataUrl = "";
        if (photoFileInput) {
            photoFileInput.value = "";
        }
        renderAvatar(profile, user);
        notifyProfileUpdated(uid, profile);

        var doc = getFirestoreProfileDoc(uid);
        if (!doc) {
            setNote("savedLocal", "profile.savedLocal", "Saved on this device. Cloud sync will retry later.");
            setBusy(false);
            return;
        }

        var payload = profilePayloadForFirestore(profile);
        var cloudSaved = false;
        var cloudError = null;
        try {
            await doc.set(payload, { merge: true });
            cloudSaved = true;
        } catch (err) {
            cloudError = err;
            if (typeof payload.photoUrl === "string" && payload.photoUrl) {
                try {
                    var slim = Object.assign({}, payload);
                    delete slim.photoUrl;
                    await doc.set(slim, { merge: true });
                    cloudSaved = true;
                    cloudError = null;
                } catch (err2) {
                    cloudError = err2;
                }
            }
        }

        if (cloudSaved) {
            setNote("saved", "profile.saved", "Profile saved.");
            syncCelebrationProfilePublic(uid, profile);
        } else {
            var code = cloudError && cloudError.code ? String(cloudError.code) : "";
            if (code === "permission-denied") {
                setNote("cloudDenied", "profile.cloudPermissionDenied", "Saved on this device. Cloud rules blocked the sync — check Firestore security rules for your account.");
            } else {
                setNote("savedLocal", "profile.savedLocal", "Saved on this device. Cloud sync will retry later.");
            }
        }

        try {
            await syncAuthBasicProfile(profile);
        } catch (authErr) {
            /* Auth display photo only accepts short http(s) URLs; ignore failures. */
        }
        if (uid && window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
            window.NjcAchievementBoard.syncMyPublicScore();
        }
        setBusy(false);
    }

    function refreshNoteTranslation() {
        if (!note || note.hidden || !noteState) {
            return;
        }
        if (noteState === "saved") {
            note.textContent = T("profile.saved", "Profile saved.");
        } else if (noteState === "savedLocal") {
            note.textContent = T("profile.savedLocal", "Saved on this device. Cloud sync will retry later.");
        } else if (noteState === "cloudDenied") {
            note.textContent = T("profile.cloudPermissionDenied", "Saved on this device. Cloud rules blocked the sync — check Firestore security rules for your account.");
        } else if (noteState === "authRequired") {
            note.textContent = T("profile.loginRequired", "Please login to manage your profile.");
        } else if (noteState === "photoReadError") {
            note.textContent = T("profile.photoReadError", "Could not load photo. Please try again.");
        } else if (noteState === "photoTooLarge") {
            note.textContent = T("profile.photoTooLarge", "Photo is too large. Please choose a smaller file.");
        }
    }

    if (exportBtn) {
        exportBtn.addEventListener("click", function () {
            var user = getCurrentUser();
            var pack = {
                exportedAt: new Date().toISOString(),
                uid: user && user.uid ? String(user.uid) : null,
                profile: normalizeProfile(getCurrentFormProfile(), user || {}),
                triviaPoints: getTriviaPoints(),
                readingPoints: getReadingPoints()
            };
            try {
                pack.localKeys = {
                    profile: window.localStorage.getItem(PROFILE_STORAGE_KEY),
                    triviaPoints: window.localStorage.getItem(TRIVIA_POINTS_KEY),
                    readingPoints: window.localStorage.getItem(READING_POINTS_KEY),
                    readingProgress: window.localStorage.getItem("njc_reading_progress_v1")
                };
            } catch (e) {}
            var blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = "njc-my-data.json";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.setTimeout(function () {
                URL.revokeObjectURL(url);
            }, 2000);
        });
    }

    if (familyList) {
        familyList.addEventListener("click", function (event) {
            var btn = event.target.closest(".profile-family-remove");
            if (!btn || btn.disabled) {
                return;
            }
            var row = btn.closest(".profile-family-row");
            if (row && row.parentNode) {
                row.parentNode.removeChild(row);
            }
        });
    }
    if (familyAddBtn) {
        familyAddBtn.addEventListener("click", function () {
            if (familyAddBtn.disabled) {
                return;
            }
            appendEmptyFamilyRow();
            var rows = familyList ? familyList.querySelectorAll(".profile-family-row") : [];
            var last = rows[rows.length - 1];
            if (last) {
                var nameEl = last.querySelector(".profile-family-name");
                if (nameEl && typeof nameEl.focus === "function") {
                    nameEl.focus();
                }
            }
        });
    }

    if (form) {
        form.addEventListener("submit", saveProfile);
    }
    if (photoFileInput) {
        photoFileInput.addEventListener("change", async function () {
            var file = photoFileInput.files && photoFileInput.files[0] ? photoFileInput.files[0] : null;
            if (!file) {
                selectedPhotoDataUrl = "";
                renderAvatar(getCurrentFormProfile(), getCurrentUser());
                return;
            }
            setBusy(true);
            try {
                selectedPhotoDataUrl = await createPhotoDataUrl(file);
                renderAvatar(getCurrentFormProfile(), getCurrentUser());
                setNote("", "", "");
            } catch (err) {
                selectedPhotoDataUrl = "";
                renderAvatar(getCurrentFormProfile(), getCurrentUser());
                if (String(err && err.message || "").indexOf("too_large") >= 0) {
                    setNote("photoTooLarge", "profile.photoTooLarge", "Photo is too large. Please choose a smaller file.");
                } else {
                    setNote("photoReadError", "profile.photoReadError", "Could not load photo. Please try again.");
                }
            } finally {
                setBusy(false);
            }
        });
    }

    if (memberRedeemBtn) {
        memberRedeemBtn.addEventListener("click", function () {
            redeemMemberCode().catch(function () {
                return null;
            });
        });
    }
    if (memberDowngradeBtn) {
        memberDowngradeBtn.addEventListener("click", function () {
            downgradeMemberToNormalPlus().catch(function () {
                return null;
            });
        });
    }
    document.addEventListener("njc:user-access-updated", updateMemberAccessUi);
    document.addEventListener("njc:modules-updated", function () {
        if (!currentUid) {
            return;
        }
        var map = getProfileMap();
        renderVisibleModulesSection(normalizeProfile(map[currentUid] || {}, getCurrentUser() || {}));
    });

    document.addEventListener("DOMContentLoaded", loadProfile);
    document.addEventListener("njc:authchange", loadProfile);
    document.addEventListener("njc:trivia-points-updated", renderProfileAchievementPoints);
    document.addEventListener("njc:reading-points-updated", renderProfileAchievementPoints);
    document.addEventListener("njc:modules-updated", renderProfileAchievementPoints);
    document.addEventListener("njc:langchange", function () {
        refreshNoteTranslation();
        renderProfileBadges();
    });
    document.addEventListener("njc:cardlangchange", function () {
        refreshNoteTranslation();
    });
})();
