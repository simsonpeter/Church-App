(function () {
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var BRUSSELS_TZ = "Europe/Brussels";

    function getBrusselsYmd() {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: BRUSSELS_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        function partValue(type) {
            var found = parts.find(function (part) {
                return part.type === type;
            });
            return found ? Number(found.value) : 0;
        }

        return {
            year: partValue("year"),
            month: partValue("month"),
            day: partValue("day")
        };
    }

    function brusselsTodayKey() {
        var y = getBrusselsYmd();
        return String(y.year) + "-" + String(y.month).padStart(2, "0") + "-" + String(y.day).padStart(2, "0");
    }

    function monthDayMatchesStoredDate(ymdStr, brusselsYmd) {
        if (!brusselsYmd || !ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
            return false;
        }
        var parts = ymdStr.split("-");
        return Number(parts[1]) === brusselsYmd.month && Number(parts[2]) === brusselsYmd.day;
    }

    function pickWishDisplayName(fullName, displayName, email) {
        var fromName = String(fullName || displayName || "").trim();
        if (fromName) {
            var first = fromName.split(/\s+/).filter(Boolean)[0] || "";
            if (first) {
                return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
            }
        }
        var local = String(email || "").trim().split("@")[0];
        if (local) {
            return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
        }
        return "";
    }

    function getSavedUserProfile(uid) {
        if (!uid) {
            return null;
        }
        try {
            var raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            var map = raw ? JSON.parse(raw) : {};
            var row = map[String(uid)];
            return row && typeof row === "object" ? row : null;
        } catch (err) {
            return null;
        }
    }

    function normalizeFamilyMembers(raw) {
        if (!Array.isArray(raw)) {
            return [];
        }
        var out = [];
        raw.forEach(function (member, fmIndex) {
            if (!member || typeof member !== "object") {
                return;
            }
            var name = String(member.name || "").trim();
            var dob = String(member.dob || "").trim();
            if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                return;
            }
            var sid = String(member.id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
            if (!sid) {
                sid = "i" + String(fmIndex);
            }
            out.push({ id: sid, name: name, dob: dob });
        });
        return out;
    }

    function buildCelebrationEvents() {
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        var uid = auth && auth.uid ? String(auth.uid) : "";
        if (!uid) {
            return [];
        }
        var profile = getSavedUserProfile(uid);
        if (!profile) {
            return [];
        }
        var today = getBrusselsYmd();
        var displayName = pickWishDisplayName(
            String(profile.fullName || "").trim(),
            String(auth.displayName || "").trim(),
            String(auth.email || "").trim()
        );
        var nameToken = displayName || "friend";
        var events = [];

        if (monthDayMatchesStoredDate(String(profile.dob || "").trim(), today)) {
            events.push({
                id: "njc-personal-birthday",
                kind: "myBirthday",
                displayName: nameToken
            });
        }
        if (monthDayMatchesStoredDate(String(profile.anniversary || "").trim(), today)) {
            events.push({
                id: "njc-personal-anniversary",
                kind: "myAnniversary",
                displayName: nameToken
            });
        }
        normalizeFamilyMembers(profile.familyMembers).forEach(function (member) {
            if (monthDayMatchesStoredDate(member.dob, today)) {
                var fmName = pickWishDisplayName(member.name, member.name, "");
                events.push({
                    id: "njc-family-bday-" + member.id,
                    kind: "familyBirthday",
                    displayName: fmName || "friend",
                    memberId: member.id
                });
            }
        });
        return events;
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function wishMessageForEvent(evt) {
        var name = String(evt && evt.displayName || "").trim() || "friend";
        if (evt && evt.kind === "myBirthday") {
            return T("celebrations.wishMessageBirthday", "Happy birthday, {name}! God bless you.").replace(/\{name\}/g, name);
        }
        if (evt && evt.kind === "myAnniversary") {
            return T("celebrations.wishMessageAnniversary", "Happy anniversary, {name}! God bless your marriage.").replace(/\{name\}/g, name);
        }
        if (evt && evt.kind === "familyBirthday") {
            return T("celebrations.wishMessageFamily", "Happy birthday, {name}! Hope you have a wonderful day.").replace(/\{name\}/g, name);
        }
        return T("celebrations.wishMessageGeneric", "Thinking of you today — God bless!").replace(/\{name\}/g, name);
    }

    function labelForKind(kind) {
        if (kind === "myBirthday") {
            return T("celebrations.kindMyBirthday", "Your birthday");
        }
        if (kind === "myAnniversary") {
            return T("celebrations.kindAnniversary", "Your wedding anniversary");
        }
        if (kind === "familyBirthday") {
            return T("celebrations.kindFamilyBirthday", "Family birthday");
        }
        return T("celebrations.kindEvent", "Celebration");
    }

    window.NjcCelebrations = {
        getBrusselsTodayKey: brusselsTodayKey,
        getEvents: buildCelebrationEvents,
        hasEvents: function () {
            return buildCelebrationEvents().length > 0;
        },
        wishMessageForEvent: wishMessageForEvent
    };

    var listEl = document.getElementById("celebrations-list");
    var emptyEl = document.getElementById("celebrations-empty");
    var noteEl = document.getElementById("celebrations-note");
    var globalThreadMount = document.getElementById("celebrations-wish-thread-global");
    var celebrationsCard = document.querySelector(".celebrations-card");

    function escapeHtml(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function showNote(key, fallback, isError) {
        if (!noteEl) {
            return;
        }
        noteEl.hidden = !key;
        noteEl.dataset.state = isError ? "error" : "";
        noteEl.textContent = key ? T(key, fallback) : "";
    }

    function mountGlobalWishThread() {
        if (!globalThreadMount || !window.NjcCelebrationWish || typeof window.NjcCelebrationWish.mount !== "function") {
            return;
        }
        window.NjcCelebrationWish.mount(globalThreadMount, {
            i18nScope: celebrationsCard || globalThreadMount
        });
    }

    function unmountGlobalWishThread() {
        if (!globalThreadMount || !window.NjcCelebrationWish || typeof window.NjcCelebrationWish.destroy !== "function") {
            return;
        }
        window.NjcCelebrationWish.destroy(globalThreadMount);
    }

    function renderCelebrationsPage() {
        showNote("", "", false);
        if (!listEl || !emptyEl) {
            return;
        }
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        if (!auth || !auth.uid) {
            listEl.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.textContent = T("celebrations.loginRequired", "Sign in to see birthdays and anniversaries from your profile.");
            return;
        }
        var events = buildCelebrationEvents();
        if (!events.length) {
            listEl.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.textContent = T("celebrations.emptyToday", "No birthdays or anniversaries in your profile today (Belgium date). You can still post in the community thread above.");
            return;
        }
        emptyEl.hidden = true;
        var useLabel = T("celebrations.useInThread", "Use in thread");
        var hint = T("celebrations.useInThreadHint", "Fills the box below — edit if you like, then Send.");
        listEl.innerHTML = events.map(function (evt) {
            var msg = wishMessageForEvent(evt);
            var kindLabel = labelForKind(evt.kind);
            return "" +
                "<li class=\"celebrations-row\" data-suggestion-text=\"" + escapeHtml(msg) + "\">" +
                "  <div class=\"celebrations-row-main\">" +
                "    <span class=\"celebrations-kind\">" + escapeHtml(kindLabel) + "</span>" +
                "    <strong class=\"celebrations-name\">" + escapeHtml(evt.displayName) + "</strong>" +
                "    <p class=\"page-note celebrations-wish-preview\">" + escapeHtml(msg) + "</p>" +
                "    <p class=\"page-note celebrations-wish-hint\">" + escapeHtml(hint) + "</p>" +
                "  </div>" +
                "  <div class=\"celebrations-row-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary celebrations-use-thread-btn\" data-suggestion-text=\"" + escapeHtml(msg) + "\">" + escapeHtml(useLabel) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
    }

    if (listEl) {
        listEl.addEventListener("click", function (event) {
            var btn = event.target.closest(".celebrations-use-thread-btn");
            if (!btn) {
                return;
            }
            var text = btn.getAttribute("data-suggestion-text") || "";
            if (window.NjcCelebrationWish && typeof window.NjcCelebrationWish.setComposerText === "function") {
                window.NjcCelebrationWish.setComposerText(text);
            }
            if (globalThreadMount && typeof globalThreadMount.scrollIntoView === "function") {
                globalThreadMount.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    }

    function onRoute() {
        var raw = String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
        if (raw === "celebrations") {
            mountGlobalWishThread();
            renderCelebrationsPage();
        } else {
            unmountGlobalWishThread();
        }
    }

    document.addEventListener("DOMContentLoaded", onRoute);
    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:authchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase() === "celebrations") {
            mountGlobalWishThread();
            renderCelebrationsPage();
        }
    });
    document.addEventListener("njc:profile-updated", function () {
        if (String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase() === "celebrations") {
            renderCelebrationsPage();
        }
    });
    document.addEventListener("njc:langchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase() === "celebrations") {
            renderCelebrationsPage();
        }
    });
})();
