(function () {
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var BRUSSELS_TZ = "Europe/Brussels";
    var CELEBRATION_PROFILES_COLLECTION = "celebrationProfiles";
    var PUBLIC_PROFILE_LIMIT = 200;
    var lastWishSuggestion = "";
    var communityProfilesCache = [];
    var communityUnsubscribe = null;

    function getBrusselsYmdForDate(dateValue) {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: BRUSSELS_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(dateValue);

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

    function getBrusselsYmd() {
        return getBrusselsYmdForDate(new Date());
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

    function profileFromFirestoreData(data) {
        if (!data || typeof data !== "object") {
            return null;
        }
        return {
            fullName: String(data.fullName || "").trim(),
            dob: String(data.dob || "").trim(),
            anniversary: String(data.anniversary || "").trim(),
            familyMembers: normalizeFamilyMembers(data.familyMembers)
        };
    }

    /**
     * Events for one profile snapshot. viewerUid === subjectUid → "Your birthday" etc.;
     * otherwise public labels (Birthday / Anniversary).
     */
    function buildEventsFromProfile(profile, subjectUid, viewerUid) {
        if (!profile || !subjectUid) {
            return [];
        }
        var today = getBrusselsYmd();
        var isSelf = Boolean(viewerUid && String(viewerUid) === String(subjectUid));
        var displayName = pickWishDisplayName(String(profile.fullName || "").trim(), "", "");
        var nameToken = displayName || "friend";
        var events = [];

        if (monthDayMatchesStoredDate(String(profile.dob || "").trim(), today)) {
            events.push({
                id: "njc-cev-" + subjectUid + "-bday",
                kind: isSelf ? "myBirthday" : "birthday",
                displayName: nameToken,
                subjectUid: String(subjectUid)
            });
        }
        if (monthDayMatchesStoredDate(String(profile.anniversary || "").trim(), today)) {
            events.push({
                id: "njc-cev-" + subjectUid + "-ann",
                kind: isSelf ? "myAnniversary" : "anniversary",
                displayName: nameToken,
                subjectUid: String(subjectUid)
            });
        }
        normalizeFamilyMembers(profile.familyMembers).forEach(function (member) {
            if (monthDayMatchesStoredDate(member.dob, today)) {
                var fmName = pickWishDisplayName(member.name, member.name, "") || "friend";
                events.push({
                    id: "njc-cev-" + subjectUid + "-fam-" + member.id,
                    kind: "familyBirthday",
                    displayName: fmName,
                    subjectUid: String(subjectUid),
                    memberId: member.id
                });
            }
        });
        return events;
    }

    function buildCelebrationEvents() {
        return aggregateTodayEvents();
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function wishMessageForEvent(evt) {
        var name = String(evt && evt.displayName || "").trim() || "friend";
        if (evt && (evt.kind === "myBirthday" || evt.kind === "birthday")) {
            return T("celebrations.wishMessageBirthday", "Happy birthday, {name}! God bless you.").replace(/\{name\}/g, name);
        }
        if (evt && (evt.kind === "myAnniversary" || evt.kind === "anniversary")) {
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
        if (kind === "birthday") {
            return T("celebrations.kindBirthdayOther", "Birthday");
        }
        if (kind === "myAnniversary") {
            return T("celebrations.kindAnniversary", "Your wedding anniversary");
        }
        if (kind === "anniversary") {
            return T("celebrations.kindAnniversaryPublic", "Anniversary");
        }
        if (kind === "familyBirthday") {
            return T("celebrations.kindBirthdayOther", "Birthday");
        }
        return T("celebrations.kindEvent", "Celebration");
    }

    function isValidCalendarYmd(y, m, d) {
        if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) {
            return false;
        }
        if (m < 1 || m > 12 || d < 1 || d > 31) {
            return false;
        }
        var dt = new Date(Date.UTC(y, m - 1, d));
        return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
    }

    function compareYmd(a, b) {
        if (a.year !== b.year) {
            return a.year < b.year ? -1 : 1;
        }
        if (a.month !== b.month) {
            return a.month < b.month ? -1 : 1;
        }
        if (a.day !== b.day) {
            return a.day < b.day ? -1 : 1;
        }
        return 0;
    }

    function findNextOccurrenceFromStoredDate(ymdStr) {
        if (!ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
            return null;
        }
        var parts = ymdStr.split("-");
        var mm = Number(parts[1]);
        var dd = Number(parts[2]);
        if (!mm || !dd || mm > 12) {
            return null;
        }
        var today = getBrusselsYmd();
        var addY;
        for (addY = 0; addY <= 2; addY += 1) {
            var y = today.year + addY;
            if (!isValidCalendarYmd(y, mm, dd)) {
                continue;
            }
            var cand = { year: y, month: mm, day: dd };
            if (compareYmd(cand, today) > 0) {
                return cand;
            }
        }
        return null;
    }

    function daysUntilFromToday(targetYmd) {
        var today = getBrusselsYmd();
        var t0 = Date.UTC(today.year, today.month - 1, today.day);
        var t1 = Date.UTC(targetYmd.year, targetYmd.month - 1, targetYmd.day);
        return Math.round((t1 - t0) / 86400000);
    }

    function formatUpcomingDate(ymd) {
        if (!ymd || !ymd.year) {
            return "";
        }
        try {
            var d = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day, 12, 0, 0));
            return new Intl.DateTimeFormat(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric"
            }).format(d);
        } catch (e) {
            return String(ymd.year) + "-" + String(ymd.month).padStart(2, "0") + "-" + String(ymd.day).padStart(2, "0");
        }
    }

    function pushUpcomingRowsFromProfile(profile, subjectUid, viewerUid, today, rows) {
        if (!profile) {
            return;
        }
        var isSelf = Boolean(viewerUid && String(viewerUid) === String(subjectUid));
        var displayName = pickWishDisplayName(String(profile.fullName || "").trim(), "", "");
        var nameToken = displayName || "friend";

        function pushRow(name, kind, dobStr) {
            var next = findNextOccurrenceFromStoredDate(dobStr);
            if (!next || next.year !== today.year) {
                return;
            }
            if (monthDayMatchesStoredDate(dobStr, today)) {
                return;
            }
            var days = daysUntilFromToday(next);
            if (days <= 0) {
                return;
            }
            var labelKind = kind;
            if (!isSelf && kind === "myBirthday") {
                labelKind = "birthday";
            }
            if (!isSelf && kind === "myAnniversary") {
                labelKind = "anniversary";
            }
            rows.push({
                name: name,
                kind: kind,
                label: labelForKind(labelKind),
                whenYmd: next,
                days: days,
                sortKey: days,
                subjectUid: String(subjectUid)
            });
        }

        var pDob = String(profile.dob || "").trim();
        if (pDob) {
            pushRow(nameToken, isSelf ? "myBirthday" : "birthday", pDob);
        }
        var pAnn = String(profile.anniversary || "").trim();
        if (pAnn) {
            pushRow(nameToken, isSelf ? "myAnniversary" : "anniversary", pAnn);
        }
        normalizeFamilyMembers(profile.familyMembers).forEach(function (member) {
            var n = pickWishDisplayName(member.name, member.name, "") || "friend";
            pushRow(n, "familyBirthday", member.dob);
        });
    }

    function aggregateUpcomingEvents() {
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        var viewerUid = auth && auth.uid ? String(auth.uid) : "";
        var today = getBrusselsYmd();
        var rows = [];
        var seen = {};

        communityProfilesCache.forEach(function (entry) {
            var sid = entry && entry.uid;
            var prof = entry && entry.profile;
            if (!sid || !prof) {
                return;
            }
            pushUpcomingRowsFromProfile(prof, sid, viewerUid, today, rows);
        });

        if (viewerUid) {
            var local = getSavedUserProfile(viewerUid);
            if (local) {
                pushUpcomingRowsFromProfile(local, viewerUid, viewerUid, today, rows);
            }
        }

        rows = rows.filter(function (r) {
            var k = r.subjectUid + "|" + r.name + "|" + r.whenYmd.year + "-" + r.whenYmd.month + "-" + r.whenYmd.day + "|" + r.kind;
            if (seen[k]) {
                return false;
            }
            seen[k] = true;
            return true;
        });

        rows.sort(function (a, b) {
            return a.sortKey - b.sortKey;
        });
        return rows.slice(0, 24);
    }

    function aggregateTodayEvents() {
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        var viewerUid = auth && auth.uid ? String(auth.uid) : "";
        var all = [];
        var seenId = {};

        communityProfilesCache.forEach(function (entry) {
            var sid = entry && entry.uid;
            var prof = entry && entry.profile;
            if (!sid || !prof) {
                return;
            }
            buildEventsFromProfile(prof, sid, viewerUid).forEach(function (ev) {
                if (!seenId[ev.id]) {
                    seenId[ev.id] = true;
                    all.push(ev);
                }
            });
        });

        if (viewerUid) {
            var local = getSavedUserProfile(viewerUid);
            if (local) {
                buildEventsFromProfile(local, viewerUid, viewerUid).forEach(function (ev) {
                    if (!seenId[ev.id]) {
                        seenId[ev.id] = true;
                        all.push(ev);
                    }
                });
            }
        }

        all.sort(function (a, b) {
            var o = { myBirthday: 0, birthday: 0, myAnniversary: 1, anniversary: 1, familyBirthday: 2 };
            return (o[a.kind] != null ? o[a.kind] : 9) - (o[b.kind] != null ? o[b.kind] : 9);
        });
        return all;
    }

    function stopCommunityProfilesListen() {
        if (typeof communityUnsubscribe === "function") {
            communityUnsubscribe();
            communityUnsubscribe = null;
        }
        communityProfilesCache = [];
    }

    function startCommunityProfilesListen() {
        stopCommunityProfilesListen();
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        try {
            var db = window.firebase.firestore();
            communityUnsubscribe = db.collection(CELEBRATION_PROFILES_COLLECTION)
                .limit(PUBLIC_PROFILE_LIMIT)
                .onSnapshot(function (snap) {
                    var list = [];
                    snap.forEach(function (doc) {
                        var uid = doc.id;
                        var prof = profileFromFirestoreData(doc.data());
                        if (prof) {
                            list.push({ uid: uid, profile: prof });
                        }
                    });
                    communityProfilesCache = list;
                    if (isCelebrationsViewActive()) {
                        renderCelebrationsPage();
                    }
                }, function () {
                    communityProfilesCache = [];
                    if (isCelebrationsViewActive()) {
                        showNote("celebrations.communityLoadError", "Could not load community celebrations.", true);
                        renderCelebrationsPage();
                    }
                });
        } catch (eListen) {
            communityProfilesCache = [];
        }
    }

    window.NjcCelebrations = {
        getBrusselsTodayKey: brusselsTodayKey,
        getEvents: buildCelebrationEvents,
        hasEvents: function () {
            return buildCelebrationEvents().length > 0;
        },
        wishMessageForEvent: wishMessageForEvent,
        labelForKind: labelForKind,
        getUpcoming: aggregateUpcomingEvents,
        getLastWishSuggestion: function () {
            return lastWishSuggestion;
        },
        getDefaultToolbarWishText: function () {
            var evs = aggregateTodayEvents();
            if (!evs.length) {
                return T("celebrations.communityWishDefault", "Warm wishes to everyone celebrating today!");
            }
            return wishMessageForEvent(evs[0]);
        }
    };

    var todayStack = document.getElementById("celebrations-today-stack");
    var threadMount = document.getElementById("celebrations-wish-thread-mount");
    var upcomingList = document.getElementById("celebrations-upcoming-list");
    var emptyEl = document.getElementById("celebrations-empty");
    var noteEl = document.getElementById("celebrations-note");
    var celebrationsCard = document.querySelector(".celebrations-card");

    function isCelebrationsViewActive() {
        var view = document.querySelector(".page-view[data-route=\"celebrations\"]");
        return Boolean(view && view.classList.contains("active"));
    }

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

    function mountWishThread() {
        if (!threadMount || !window.NjcCelebrationWish || typeof window.NjcCelebrationWish.mount !== "function") {
            return;
        }
        window.NjcCelebrationWish.mount(threadMount, {
            i18nScope: celebrationsCard || threadMount
        });
    }

    function unmountWishThread() {
        if (!threadMount || !window.NjcCelebrationWish || typeof window.NjcCelebrationWish.destroy !== "function") {
            return;
        }
        window.NjcCelebrationWish.destroy(threadMount);
    }

    function renderUpcoming() {
        if (!upcomingList) {
            return;
        }
        var rows = aggregateUpcomingEvents();
        if (!rows.length) {
            upcomingList.innerHTML = "<li class=\"celebrations-upcoming-empty page-note\">" + escapeHtml(T("celebrations.upcomingEmptyCommunity", "No upcoming dates in the community list yet. Add yours in Profile and save.")) + "</li>";
            return;
        }
        var inDays = T("celebrations.upcomingInDays", "in {days} days");
        upcomingList.innerHTML = rows.map(function (row) {
            var dateStr = formatUpcomingDate(row.whenYmd);
            var sub = inDays.replace(/\{days\}/g, String(row.days));
            return "" +
                "<li class=\"celebrations-upcoming-item\">" +
                "  <div class=\"celebrations-upcoming-main\">" +
                "    <strong class=\"celebrations-upcoming-name\">" + escapeHtml(row.name) + "</strong>" +
                "    <span class=\"celebrations-upcoming-type\">" + escapeHtml(row.label) + "</span>" +
                "  </div>" +
                "  <div class=\"celebrations-upcoming-meta\">" +
                "    <span class=\"celebrations-upcoming-date\">" + escapeHtml(dateStr) + "</span>" +
                "    <span class=\"celebrations-upcoming-countdown\">" + escapeHtml(sub) + "</span>" +
                "  </div>" +
                "</li>";
        }).join("");
    }

    function renderCelebrationsPage() {
        showNote("", "", false);
        if (!todayStack || !emptyEl) {
            return;
        }
        lastWishSuggestion = "";
        var events = aggregateTodayEvents();
        if (!events.length) {
            todayStack.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.textContent = T("celebrations.emptyTodayCommunity", "No community celebrations today yet. Add birthdays or anniversary in Profile and save.");
            renderUpcoming();
            return;
        }
        emptyEl.hidden = true;
        todayStack.innerHTML = events.map(function (evt) {
            var msg = wishMessageForEvent(evt);
            var kindLabel = labelForKind(evt.kind);
            return "" +
                "<div class=\"celebrations-today-card\" data-suggestion-text=\"" + escapeHtml(msg) + "\">" +
                "  <div class=\"celebrations-today-line1\">" +
                "    <span class=\"celebrations-today-name\">" + escapeHtml(evt.displayName) + "</span>" +
                "    <span class=\"celebrations-today-dot\" aria-hidden=\"true\">·</span>" +
                "    <span class=\"celebrations-today-type\">" + escapeHtml(kindLabel) + "</span>" +
                "  </div>" +
                "  <p class=\"celebrations-today-suggestion\">" + escapeHtml(msg) + "</p>" +
                "</div>";
        }).join("");

        renderUpcoming();
    }

    if (todayStack) {
        todayStack.addEventListener("click", function (event) {
            var card = event.target.closest(".celebrations-today-card");
            if (!card) {
                return;
            }
            var text = card.getAttribute("data-suggestion-text") || "";
            lastWishSuggestion = text;
            if (window.NjcCelebrationWish && typeof window.NjcCelebrationWish.setComposerText === "function") {
                window.NjcCelebrationWish.setComposerText(text);
            }
            if (threadMount && typeof threadMount.scrollIntoView === "function") {
                threadMount.scrollIntoView({ block: "nearest", behavior: "smooth" });
            }
        });
    }

    function onCelebrationsRouteChange(ev) {
        var route = ev && ev.detail && ev.detail.route;
        if (route === "celebrations") {
            startCommunityProfilesListen();
            mountWishThread();
            renderCelebrationsPage();
        } else {
            stopCommunityProfilesListen();
            unmountWishThread();
        }
    }

    document.addEventListener("njc:routechange", onCelebrationsRouteChange);

    function onRoute() {
        var raw = String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
        if (raw === "celebrations") {
            startCommunityProfilesListen();
            mountWishThread();
            renderCelebrationsPage();
        } else {
            stopCommunityProfilesListen();
            unmountWishThread();
        }
    }

    document.addEventListener("DOMContentLoaded", onRoute);
    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:authchange", function () {
        if (isCelebrationsViewActive()) {
            renderCelebrationsPage();
        }
    });
    document.addEventListener("njc:profile-updated", function () {
        if (isCelebrationsViewActive()) {
            renderCelebrationsPage();
        }
    });
    document.addEventListener("njc:langchange", function () {
        if (isCelebrationsViewActive()) {
            renderCelebrationsPage();
        }
    });
})();
