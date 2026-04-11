(function () {
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
        var sum = tr + rd;
        var badges = [];
        if (rd >= 10) {
            badges.push({ icon: "book-open", label: T("profile.badgeReader10", "Dedicated reader (10+ reading points)") });
        }
        if (tr >= 10) {
            badges.push({ icon: "question-circle", label: T("profile.badgeTrivia10", "Bible Quiz champion (10+ quiz points)") });
        }
        if (sum >= 25) {
            badges.push({ icon: "star", label: T("profile.badgeAllStar", "All-star (25+ total points)") });
        }
        if (!badges.length) {
            profileBadgesList.innerHTML = "<li class=\"page-note profile-badge-empty\">" + escapeHtmlLite(T("profile.badgesEmpty", "Keep reading and playing Bible Quiz to earn badges.")) + "</li>";
            return;
        }
        profileBadgesList.innerHTML = badges.map(function (b) {
            return "<li class=\"profile-badge-chip\"><i class=\"fa-solid fa-" + b.icon + "\" aria-hidden=\"true\"></i> " + escapeHtmlLite(b.label) + "</li>";
        }).join("");
    }

    function renderProfileAchievementPoints() {
        var trivia = getTriviaPoints();
        var reading = getReadingPoints();
        var total = trivia + reading;
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
            familyMembers: normalizeFamilyMembersList(base.familyMembers),
            phone: base.phone,
            groupId: base.groupId || "",
            leaderboardAnonymous: Boolean(base.leaderboardAnonymous),
            photoSkipCloud: Boolean(base.photoSkipCloud),
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
        [fullNameInput, dobInput, anniversaryInput, phoneInput, groupIdInput, leaderboardAnonymousInput, photoSkipCloudInput, photoFileInput].forEach(function (node) {
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
        if (saveButton) {
            saveButton.disabled = disabled || busy;
        }
    }

    function sanitizeGroupIdInput(raw) {
        return String(raw || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
    }

    function normalizeProfile(profile, user) {
        var source = profile && typeof profile === "object" ? profile : {};
        var activeUser = user && typeof user === "object" ? user : {};
        return {
            fullName: String(source.fullName || activeUser.displayName || deriveNameFromEmail(activeUser.email || "")).trim(),
            dob: String(source.dob || "").trim(),
            anniversary: String(source.anniversary || "").trim(),
            familyMembers: normalizeFamilyMembersList(source.familyMembers),
            phone: String(source.phone || activeUser.phoneNumber || "").trim(),
            groupId: sanitizeGroupIdInput(source.groupId),
            leaderboardAnonymous: Boolean(source.leaderboardAnonymous),
            photoSkipCloud: Boolean(source.photoSkipCloud),
            photoUrl: String(source.photoUrl || activeUser.photoURL || "").trim(),
            updatedAt: Number(source.updatedAt || Date.now()) || Date.now()
        };
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
        return {
            fullName: String(fullNameInput && fullNameInput.value || "").trim(),
            dob: String(dobInput && dobInput.value || "").trim(),
            anniversary: String(anniversaryInput && anniversaryInput.value || "").trim(),
            familyMembers: collectFamilyMembersFromDom(),
            phone: String(phoneInput && phoneInput.value || "").trim(),
            groupId: sanitizeGroupIdInput(groupIdInput && groupIdInput.value),
            leaderboardAnonymous: Boolean(leaderboardAnonymousInput && leaderboardAnonymousInput.checked),
            photoSkipCloud: Boolean(photoSkipCloudInput && photoSkipCloudInput.checked),
            photoUrl: String(selectedPhotoDataUrl || savedPhotoDataUrl || "").trim(),
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

    async function loadProfile() {
        if (!form) {
            return;
        }
        var user = getCurrentUser();
        currentUid = String(user && user.uid || "");
        if (!currentUid) {
            setFormEnabled(false);
            populateForm({ fullName: "", dob: "", anniversary: "", familyMembers: [], phone: "", groupId: "", leaderboardAnonymous: false, photoSkipCloud: false, photoUrl: "" });
            renderAvatar({}, user);
            renderProfileAchievementPoints();
            setNote("authRequired", "profile.loginRequired", "Please login to manage your profile.");
            return;
        }

        setFormEnabled(true);
        var map = getProfileMap();
        var localProfile = normalizeProfile(map[currentUid] || {}, user);
        populateForm(localProfile);
        renderAvatar(localProfile, user);
        renderProfileAchievementPoints();
        setNote("", "", "");

        var doc = getFirestoreProfileDoc(currentUid);
        if (!doc) {
            syncAchievementBoardIfPossible();
            return;
        }
        try {
            var snapshot = await doc.get();
            if (!snapshot.exists) {
                syncAchievementBoardIfPossible();
                return;
            }
            var cloudProfile = normalizeProfile(snapshot.data() || {}, user);
            var localPhoto = String(localProfile.photoUrl || "").trim();
            var cloudPhoto = String(cloudProfile.photoUrl || "").trim();
            if (!cloudPhoto && localPhoto) {
                cloudProfile = Object.assign({}, cloudProfile, { photoUrl: localPhoto });
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
            return;
        }
        syncAchievementBoardIfPossible();
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

    document.addEventListener("DOMContentLoaded", loadProfile);
    document.addEventListener("njc:authchange", loadProfile);
    document.addEventListener("njc:trivia-points-updated", renderProfileAchievementPoints);
    document.addEventListener("njc:reading-points-updated", renderProfileAchievementPoints);
    document.addEventListener("njc:langchange", function () {
        refreshNoteTranslation();
        renderProfileBadges();
    });
    document.addEventListener("njc:cardlangchange", function () {
        refreshNoteTranslation();
    });
})();
