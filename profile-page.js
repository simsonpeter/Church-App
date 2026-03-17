(function () {
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var PROFILE_COLLECTION = "profile";
    var PROFILE_DOC_ID = "basic";
    var form = document.getElementById("profile-form");
    var fullNameInput = document.getElementById("profile-full-name");
    var dobInput = document.getElementById("profile-dob");
    var phoneInput = document.getElementById("profile-phone");
    var photoInput = document.getElementById("profile-photo-url");
    var saveButton = document.getElementById("profile-save-btn");
    var note = document.getElementById("profile-note");
    var avatarImage = document.getElementById("profile-avatar-image");
    var avatarFallback = document.getElementById("profile-avatar-fallback");
    var profileCard = form ? form.closest(".card") : null;
    var busy = false;
    var noteState = "";
    var currentUid = "";

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
        [fullNameInput, dobInput, phoneInput, photoInput].forEach(function (node) {
            if (node) {
                node.disabled = disabled;
            }
        });
        if (saveButton) {
            saveButton.disabled = disabled || busy;
        }
    }

    function normalizeProfile(profile, user) {
        var source = profile && typeof profile === "object" ? profile : {};
        var activeUser = user && typeof user === "object" ? user : {};
        return {
            fullName: String(source.fullName || activeUser.displayName || deriveNameFromEmail(activeUser.email || "")).trim(),
            dob: String(source.dob || "").trim(),
            phone: String(source.phone || activeUser.phoneNumber || "").trim(),
            photoUrl: String(source.photoUrl || activeUser.photoURL || "").trim(),
            updatedAt: Number(source.updatedAt || Date.now()) || Date.now()
        };
    }

    function getCurrentFormProfile() {
        return {
            fullName: String(fullNameInput && fullNameInput.value || "").trim(),
            dob: String(dobInput && dobInput.value || "").trim(),
            phone: String(phoneInput && phoneInput.value || "").trim(),
            photoUrl: String(photoInput && photoInput.value || "").trim(),
            updatedAt: Date.now()
        };
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
        if (phoneInput) {
            phoneInput.value = String(profile.phone || "");
        }
        if (photoInput) {
            photoInput.value = String(profile.photoUrl || "");
        }
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
            await authUser.updateProfile({
                displayName: profile.fullName || "",
                photoURL: profile.photoUrl || ""
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
            populateForm({ fullName: "", dob: "", phone: "", photoUrl: "" });
            renderAvatar({}, user);
            setNote("authRequired", "profile.loginRequired", "Please login to manage your profile.");
            return;
        }

        setFormEnabled(true);
        var map = getProfileMap();
        var localProfile = normalizeProfile(map[currentUid] || {}, user);
        populateForm(localProfile);
        renderAvatar(localProfile, user);
        setNote("", "", "");

        var doc = getFirestoreProfileDoc(currentUid);
        if (!doc) {
            return;
        }
        try {
            var snapshot = await doc.get();
            if (!snapshot.exists) {
                return;
            }
            var cloudProfile = normalizeProfile(snapshot.data() || {}, user);
            map[currentUid] = cloudProfile;
            saveProfileMap(map);
            populateForm(cloudProfile);
            renderAvatar(cloudProfile, user);
            notifyProfileUpdated(currentUid, cloudProfile);
        } catch (err) {
            return;
        }
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
        renderAvatar(profile, user);
        notifyProfileUpdated(uid, profile);

        var doc = getFirestoreProfileDoc(uid);
        if (doc) {
            try {
                await doc.set(profile, { merge: true });
                await syncAuthBasicProfile(profile);
                setNote("saved", "profile.saved", "Profile saved.");
            } catch (err) {
                setNote("savedLocal", "profile.savedLocal", "Saved on this device. Cloud sync will retry later.");
            } finally {
                setBusy(false);
            }
            return;
        }
        setNote("savedLocal", "profile.savedLocal", "Saved on this device. Cloud sync will retry later.");
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
        } else if (noteState === "authRequired") {
            note.textContent = T("profile.loginRequired", "Please login to manage your profile.");
        }
    }

    if (form) {
        form.addEventListener("submit", saveProfile);
    }
    if (photoInput) {
        photoInput.addEventListener("input", function () {
            renderAvatar(getCurrentFormProfile(), getCurrentUser());
        });
    }

    document.addEventListener("DOMContentLoaded", loadProfile);
    document.addEventListener("njc:authchange", loadProfile);
    document.addEventListener("njc:langchange", function () {
        refreshNoteTranslation();
    });
    document.addEventListener("njc:cardlangchange", function () {
        refreshNoteTranslation();
    });
})();
