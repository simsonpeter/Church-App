(function () {
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var BRUSSELS_TZ = "Europe/Brussels";
    var lastWishSuggestion = "";
    var communityProfilesCache = [];
    /** Unsubscribe from shared NjcCommunityCelebrations feed (does not stop global Firestore listen). */
    var communityUnsubscribe = null;

    function getViewerUid() {
        if (!window.NjcAuth || typeof window.NjcAuth.isRegisteredMember !== "function" || !window.NjcAuth.isRegisteredMember()) {
            return "";
        }
        var auth = typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        return auth && auth.uid ? String(auth.uid) : "";
    }

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

    function partnerFirstName(raw) {
        return pickWishDisplayName(String(raw || "").trim(), String(raw || "").trim(), "") || "";
    }

    function anniversaryCoupleDisplay(profile) {
        var me = pickWishDisplayName(String(profile && profile.fullName || "").trim(), "", "") || "friend";
        var partner = partnerFirstName(profile && profile.anniversaryPartnerName);
        return partner ? (me + " & " + partner) : me;
    }

    /** Loose name match so the same person under two Firestore profiles dedupes (e.g. spouse in family + own account). */
    function celebrationDedupeNameKey(raw) {
        var s = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9\u0b80-\u0bff\s]/gi, " ");
        var parts = s.split(/\s+/).filter(Boolean);
        return parts.slice(0, 4).join(" ");
    }

    function todayMonthDayKey(brusselsYmd) {
        if (!brusselsYmd) {
            return "";
        }
        return String(brusselsYmd.month).padStart(2, "0") + "-" + String(brusselsYmd.day).padStart(2, "0");
    }

    function upcomingYmdKey(ymd) {
        if (!ymd || !ymd.month) {
            return "";
        }
        return String(ymd.month).padStart(2, "0") + "-" + String(ymd.day).padStart(2, "0");
    }

    /** Lower = preferred when merging duplicates. */
    function todayEventPriority(ev, viewerUid) {
        var self = Boolean(viewerUid && String(ev.subjectUid || "") === String(viewerUid));
        if (ev.kind === "myBirthday" && self) {
            return 0;
        }
        if (ev.kind === "myAnniversary" && self) {
            return 0;
        }
        if (ev.kind === "myBirthday" || ev.kind === "myAnniversary") {
            return 1;
        }
        if (ev.kind === "birthday" || ev.kind === "anniversary") {
            return 2;
        }
        if (ev.kind === "familyBirthday") {
            return 3;
        }
        return 4;
    }

    function dedupeTodayEvents(events, viewerUid) {
        var list = Array.isArray(events) ? events.slice() : [];
        var buckets = {};

        function pickBetter(a, b) {
            var pa = todayEventPriority(a, viewerUid);
            var pb = todayEventPriority(b, viewerUid);
            if (pa !== pb) {
                return pa < pb ? a : b;
            }
            var ca = String(a.displayName || "").indexOf(" & ") >= 0;
            var cb = String(b.displayName || "").indexOf(" & ") >= 0;
            if (ca !== cb) {
                return ca ? a : b;
            }
            return String(a.subjectUid || "").localeCompare(String(b.subjectUid || "")) <= 0 ? a : b;
        }

        var todayMd = todayMonthDayKey(getBrusselsYmd());
        list.forEach(function (ev) {
            if (!ev) {
                return;
            }
            var key;
            if (ev.kind === "anniversary" || ev.kind === "myAnniversary") {
                key = "ann|" + todayMd;
            } else if (ev.kind === "birthday" || ev.kind === "myBirthday" || ev.kind === "familyBirthday") {
                key = "bday|" + todayMd + "|" + celebrationDedupeNameKey(ev.displayName);
            } else {
                key = String(ev.id || "");
            }
            if (!buckets[key]) {
                buckets[key] = ev;
            } else {
                buckets[key] = pickBetter(buckets[key], ev);
            }
        });
        return Object.keys(buckets).map(function (k) {
            return buckets[k];
        });
    }

    function upcomingRowPriority(row, viewerUid) {
        var self = Boolean(viewerUid && String(row.subjectUid || "") === String(viewerUid));
        if ((row.kind === "myBirthday" || row.kind === "myAnniversary") && self) {
            return 0;
        }
        if (row.kind === "myBirthday" || row.kind === "myAnniversary") {
            return 1;
        }
        if (row.kind === "birthday" || row.kind === "anniversary") {
            return 2;
        }
        if (row.kind === "familyBirthday") {
            return 3;
        }
        return 4;
    }

    function dedupeUpcomingRows(rows, viewerUid) {
        var list = Array.isArray(rows) ? rows.slice() : [];
        var buckets = {};

        function pickBetter(a, b) {
            var pa = upcomingRowPriority(a, viewerUid);
            var pb = upcomingRowPriority(b, viewerUid);
            if (pa !== pb) {
                return pa < pb ? a : b;
            }
            var ca = String(a.name || "").indexOf(" & ") >= 0;
            var cb = String(b.name || "").indexOf(" & ") >= 0;
            if (ca !== cb) {
                return ca ? a : b;
            }
            return String(a.subjectUid || "").localeCompare(String(b.subjectUid || "")) <= 0 ? a : b;
        }

        list.forEach(function (row) {
            if (!row || !row.whenYmd) {
                return;
            }
            var md = upcomingYmdKey(row.whenYmd);
            var key;
            if (row.kind === "anniversary" || row.kind === "myAnniversary") {
                key = "ann|" + md;
            } else if (row.kind === "birthday" || row.kind === "myBirthday" || row.kind === "familyBirthday") {
                key = "bday|" + md + "|" + celebrationDedupeNameKey(row.name);
            } else {
                key = row.subjectUid + "|" + row.name + "|" + md + "|" + row.kind;
            }
            if (!buckets[key]) {
                buckets[key] = row;
            } else {
                buckets[key] = pickBetter(buckets[key], row);
            }
        });
        return Object.keys(buckets).map(function (k) {
            return buckets[k];
        });
    }

    function profileFromFirestoreData(data) {
        if (!data || typeof data !== "object") {
            return null;
        }
        return {
            fullName: String(data.fullName || "").trim(),
            dob: String(data.dob || "").trim(),
            anniversary: String(data.anniversary || "").trim(),
            anniversaryPartnerName: String(data.anniversaryPartnerName || "").trim(),
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
                displayName: anniversaryCoupleDisplay(profile),
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
        var annivCouple = anniversaryCoupleDisplay(profile);

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
            pushRow(annivCouple, isSelf ? "myAnniversary" : "anniversary", pAnn);
        }
        normalizeFamilyMembers(profile.familyMembers).forEach(function (member) {
            var n = pickWishDisplayName(member.name, member.name, "") || "friend";
            pushRow(n, "familyBirthday", member.dob);
        });
    }

    function aggregateUpcomingEvents() {
        var viewerUid = getViewerUid();
        var today = getBrusselsYmd();
        var rows = [];
        var seen = {};

        if (!viewerUid) {
            return rows;
        }

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

        rows = dedupeUpcomingRows(rows, viewerUid);

        rows.sort(function (a, b) {
            return a.sortKey - b.sortKey;
        });
        return rows.slice(0, 24);
    }

    function aggregateTodayEvents() {
        var viewerUid = getViewerUid();
        var all = [];
        var seenId = {};

        if (!viewerUid) {
            return all;
        }

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

        all = dedupeTodayEvents(all, viewerUid);

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
    }

    function startCommunityProfilesListen() {
        stopCommunityProfilesListen();
        var api = window.NjcCommunityCelebrations;
        if (!api || typeof api.subscribe !== "function") {
            communityProfilesCache = [];
            return;
        }
        communityProfilesCache = typeof api.getProfiles === "function" ? api.getProfiles().slice() : [];
        communityUnsubscribe = api.subscribe(function () {
            communityProfilesCache = typeof api.getProfiles === "function" ? api.getProfiles().slice() : [];
            if (isCelebrationsViewActive()) {
                showNote("", "", false);
                renderCelebrationsPage();
            }
        });
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
            if (!getViewerUid()) {
                return "";
            }
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
        if (!getViewerUid()) {
            upcomingList.innerHTML = "<li class=\"celebrations-upcoming-empty page-note\">" + escapeHtml(T("celebrations.upcomingMembersOnly", "Sign in to see upcoming celebrations from the community.")) + "</li>";
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
        if (!getViewerUid()) {
            todayStack.innerHTML = "";
            emptyEl.hidden = false;
            emptyEl.textContent = T("celebrations.membersOnlyBody", "Sign in with your church account to see community birthdays, anniversaries, and the wish thread.");
            renderUpcoming();
            return;
        }
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
            if (getViewerUid()) {
                startCommunityProfilesListen();
                mountWishThread();
            } else {
                stopCommunityProfilesListen();
                unmountWishThread();
            }
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
            if (getViewerUid()) {
                startCommunityProfilesListen();
                mountWishThread();
            } else {
                stopCommunityProfilesListen();
                unmountWishThread();
            }
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
            if (getViewerUid()) {
                startCommunityProfilesListen();
                mountWishThread();
            } else {
                stopCommunityProfilesListen();
                unmountWishThread();
            }
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
