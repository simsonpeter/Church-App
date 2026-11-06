(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var PAGE_SIZE = 80;
    var GRANT_MODULE_KEYS = [
        "announcements", "bibleReading", "dailyVerse", "trivia", "eventsWeek",
        "dailyBread", "bookShelf", "bible", "songbook", "prayer", "events",
        "sermons", "contact", "celebrations", "chat", "userAchievements", "kids", "newsletter"
    ];
    var CARD_AREAS = [
        { sel: "#admin-dashboard-refresh", area: "legacy-home" },
        { sel: "#admin-registered-users-refresh", area: "settings-advanced" },
        { sel: "#admin-modules-fieldset", area: "settings-advanced" },
        { sel: "#admin-user-access-uid", area: "settings-advanced" },
        { sel: "#admin-leaderboard-refresh", area: "settings-reports" },
        { sel: "#admin-trivia-insights-refresh", area: "settings-reports" },
        { sel: ".admin-schedule-hints-card", area: "settings-advanced" },
        { sel: "#admin-book-shelf-form", area: "content-library" },
        { sel: "#admin-book-shelf-list", area: "content-library" },
        { sel: "#admin-kids-audio-form", area: "content-kids" },
        { sel: "#admin-kids-audio-list", area: "content-kids" },
        { sel: "#admin-daily-bread-form", area: "content-daily-bread" },
        { sel: "#admin-daily-bread-list", area: "content-daily-bread" },
        { sel: "#admin-newsletter-form", area: "content-announcements" },
        { sel: "#admin-newsletter-list", area: "content-announcements" },
        { sel: "#admin-notice-form", area: "content-announcements" },
        { sel: "#admin-broadcast-form", area: "content-announcements" },
        { sel: "#admin-notice-list", area: "content-announcements" },
        { sel: "#admin-event-form", area: "content-events" },
        { sel: "#admin-event-list", area: "content-events" },
        { sel: "#admin-sermon-form", area: "content-sermons" },
        { sel: "#admin-sermon-list", area: "content-sermons" },
        { sel: "#admin-trivia-form", area: "settings-reports" },
        { sel: "#admin-prayer-list", area: "prayer" }
    ];

    var shell = document.getElementById("admin-v5-shell");
    var routeContent = document.querySelector(".admin-route-content");
    if (!shell || !routeContent) {
        return;
    }

    var peopleByUid = {};
    var pendingRequests = [];
    var directoryCursor = null;
    var directoryHasMore = false;
    var busy = false;
    var loadedOnce = false;
    var stats = {
        pending: null,
        members: null,
        prayers: null,
        events: null
    };
    var pendingLoaded = false;
    var directoryLoaded = false;

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
        var u = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        return normalizeEmail(u && u.email) === ADMIN_EMAIL;
    }

    function getAdminUser() {
        return window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
    }

    function getDb() {
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

    function refreshIdToken() {
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

    function splitAdminHash() {
        var raw = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        var q = raw.indexOf("?");
        if (q >= 0) {
            raw = raw.slice(0, q);
        }
        var parts = raw.split("/").filter(Boolean);
        if (parts[0] !== "admin") {
            return { view: "dashboard", tab: "church", content: "" };
        }
        var view = parts[1] || "dashboard";
        if (view !== "members" && view !== "content" && view !== "prayer" && view !== "settings") {
            view = "dashboard";
        }
        var tab = parts[2] || (view === "members" ? "church" : "");
        if (view === "members" && tab !== "other" && tab !== "pending") {
            tab = "church";
        }
        var content = view === "content" ? (parts[2] || "") : "";
        return { view: view, tab: tab, content: content };
    }

    function setHash(path) {
        var next = "#" + path;
        if (String(window.location.hash || "") !== next) {
            window.location.hash = path;
        }
    }

    function formatDate(raw) {
        if (!raw) {
            return "";
        }
        var date = null;
        if (typeof raw.toDate === "function") {
            try {
                date = raw.toDate();
            } catch (e) {
                date = null;
            }
        } else if (typeof raw === "number" && Number.isFinite(raw)) {
            date = new Date(raw);
        } else if (typeof raw === "string") {
            date = new Date(raw);
        }
        if (!date || Number.isNaN(date.getTime())) {
            return "";
        }
        try {
            return date.toLocaleString();
        } catch (e2) {
            return "";
        }
    }

    function sanitizeGrants(raw) {
        var src = raw && typeof raw === "object" ? raw : {};
        var out = {};
        GRANT_MODULE_KEYS.forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(src, key)) {
                out[key] = src[key] === true;
            }
        });
        return out;
    }

    function limitedGrantsFrom(existing) {
        var grants = sanitizeGrants(existing);
        var hasTrue = GRANT_MODULE_KEYS.some(function (key) {
            return grants[key] === true;
        });
        if (hasTrue) {
            return grants;
        }
        var pool = window.NjcAppModules && typeof window.NjcAppModules.getNormalPlusModuleGrantsSync === "function"
            ? window.NjcAppModules.getNormalPlusModuleGrantsSync()
            : {};
        return sanitizeGrants(pool);
    }

    function classifyCards() {
        CARD_AREAS.forEach(function (item) {
            var el = document.querySelector(item.sel);
            var card = el ? el.closest(".admin-route-content > .card") : null;
            if (card) {
                card.setAttribute("data-admin-v5-area", item.area);
            }
        });
        routeContent.classList.add("admin-v5-ready");
    }

    function setNote(kind, text) {
        var el = document.getElementById("admin-v5-note");
        if (!el) {
            return;
        }
        var msg = String(text || "").trim();
        el.hidden = !msg;
        el.dataset.kind = kind || "";
        el.textContent = msg;
    }

    function setStat(id, value) {
        var el = document.getElementById(id);
        if (!el) {
            return;
        }
        el.textContent = value == null ? "—" : String(value);
    }

    function applyChrome() {
        var state = splitAdminHash();
        shell.querySelectorAll("[data-admin-v5-nav]").forEach(function (btn) {
            btn.classList.toggle("is-active", btn.getAttribute("data-admin-v5-nav") === state.view);
        });
        shell.querySelectorAll("[data-admin-v5-panel]").forEach(function (panel) {
            panel.classList.toggle("is-active", panel.getAttribute("data-admin-v5-panel") === state.view);
        });
        shell.querySelectorAll("[data-admin-v5-tab]").forEach(function (btn) {
            btn.classList.toggle("is-active", btn.getAttribute("data-admin-v5-tab") === state.tab);
        });
        shell.querySelectorAll("[data-admin-v5-content]").forEach(function (btn) {
            var key = btn.getAttribute("data-admin-v5-content") || "";
            btn.classList.toggle("is-active", key === state.content || (!state.content && key === "all"));
        });
        routeContent.setAttribute("data-admin-v5-view", state.view);
        if (state.view === "content" && state.content) {
            routeContent.setAttribute("data-admin-v5-content", state.content);
        } else {
            routeContent.removeAttribute("data-admin-v5-content");
        }
        var title = document.getElementById("admin-v5-title");
        if (title) {
            title.textContent = T("admin.v5Title", "NJC Administration");
        }
        routeContent.querySelectorAll(".card[data-admin-v5-area]").forEach(function (card) {
            if (window.getComputedStyle(card).display === "none") {
                return;
            }
            var details = card.querySelector("details");
            if (details) {
                details.open = true;
            }
        });
    }

    function peopleList(filter) {
        var rows = Object.keys(peopleByUid).map(function (uid) {
            return peopleByUid[uid];
        });
        if (filter === "member") {
            rows = rows.filter(function (row) {
                return row.tier === "member";
            });
        } else if (filter === "other") {
            rows = rows.filter(function (row) {
                return row.tier !== "member";
            });
        }
        var q = String((document.getElementById("admin-v5-search") || {}).value || "").trim().toLowerCase();
        if (q) {
            rows = rows.filter(function (row) {
                return (row.name + " " + row.email + " " + row.uid).toLowerCase().indexOf(q) >= 0;
            });
        }
        rows.sort(function (a, b) {
            return String(a.name || a.email || a.uid).localeCompare(String(b.name || b.email || b.uid));
        });
        return rows;
    }

    function requestStatusLabel(row) {
        if (row.requestStatus === "pending") {
            return T("admin.v5RequestPending", "Membership requested");
        }
        if (row.requestStatus === "rejected") {
            return T("admin.v5RequestRejected", "Request declined");
        }
        if (row.requestStatus === "approved" || row.tier === "member") {
            return T("admin.v5ChurchMember", "Church Member");
        }
        return T("admin.v5OtherBeliever", "Other Believer");
    }

    function personActions(row, mode) {
        var html = "";
        if (mode === "pending") {
            html += "<button type=\"button\" class=\"button-link\" data-admin-v5-action=\"approve\" data-uid=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.v5Approve", "Approve")) + "</button>";
            html += "<button type=\"button\" class=\"button-link button-secondary\" data-admin-v5-action=\"reject\" data-uid=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.v5Reject", "Reject")) + "</button>";
        } else if (row.tier === "member") {
            html += "<button type=\"button\" class=\"button-link button-secondary\" data-admin-v5-action=\"revoke\" data-uid=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.v5Revoke", "Revoke membership")) + "</button>";
        } else {
            html += "<button type=\"button\" class=\"button-link\" data-admin-v5-action=\"approve\" data-uid=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.v5ApproveMember", "Approve as Church Member")) + "</button>";
        }
        html += "<button type=\"button\" class=\"button-link button-secondary\" data-admin-v5-action=\"details\" data-uid=\"" + escapeHtml(row.uid) + "\">" + escapeHtml(T("admin.v5ViewDetails", "View Details")) + "</button>";
        return html;
    }

    function renderPerson(row, mode) {
        var badgeClass = row.tier === "member" ? "is-member" : (row.requestStatus === "pending" ? "is-pending" : "");
        var dateLine = row.registeredLabel
            ? T("admin.v5Registered", "Registered") + ": " + row.registeredLabel
            : (row.lastSeenLabel ? T("admin.v5LastSeen", "Last seen") + ": " + row.lastSeenLabel : "");
        return "<li class=\"admin-v5-person\">" +
            "<p class=\"admin-v5-person-name\">" + escapeHtml(row.name || T("admin.v5Unnamed", "Unnamed user")) + "</p>" +
            "<p class=\"admin-v5-person-meta\">" + escapeHtml(row.email || T("admin.v5NoEmail", "No email on file")) + "</p>" +
            "<p class=\"admin-v5-person-meta\"><span class=\"admin-v5-badge " + badgeClass + "\">" + escapeHtml(requestStatusLabel(row)) + "</span>" +
            (dateLine ? " · " + escapeHtml(dateLine) : "") + "</p>" +
            "<div class=\"admin-v5-actions\">" + personActions(row, mode) + "</div>" +
            "</li>";
    }

    function renderMembers() {
        var state = splitAdminHash();
        var list = document.getElementById("admin-v5-people");
        var empty = document.getElementById("admin-v5-empty");
        if (!list || !empty) {
            return;
        }
        var rows;
        var mode = state.tab;
        if (state.tab === "pending") {
            rows = pendingRequests.slice();
            var q = String((document.getElementById("admin-v5-search") || {}).value || "").trim().toLowerCase();
            if (q) {
                rows = rows.filter(function (row) {
                    return (row.name + " " + row.email + " " + row.uid).toLowerCase().indexOf(q) >= 0;
                });
            }
        } else if (state.tab === "other") {
            rows = peopleList("other");
        } else {
            rows = peopleList("member");
        }
        if (!rows.length) {
            list.innerHTML = "";
            empty.hidden = false;
            if (state.tab === "pending") {
                empty.textContent = T("admin.v5EmptyPending", "No pending membership requests.");
            } else if (state.tab === "other") {
                empty.textContent = T("admin.v5EmptyOther", "No other believers in this list yet.");
            } else {
                empty.textContent = T("admin.v5EmptyMembers", "No church members in this list yet.");
            }
            return;
        }
        empty.hidden = true;
        list.innerHTML = rows.map(function (row) {
            return renderPerson(row, mode);
        }).join("");
        var moreBtn = document.getElementById("admin-v5-load-more");
        if (moreBtn) {
            moreBtn.hidden = !directoryHasMore || state.tab === "pending";
        }
    }

    function renderAttention() {
        var box = document.getElementById("admin-v5-attention");
        if (!box) {
            return;
        }
        var items = [];
        if (typeof stats.pending === "number" && stats.pending > 0) {
            items.push({
                label: T("admin.v5AttentionPending", "Pending membership approvals"),
                count: stats.pending,
                hash: "admin/members/pending"
            });
        }
        if (typeof stats.prayerPending === "number" && stats.prayerPending > 0) {
            items.push({
                label: T("admin.v5AttentionPrayer", "Prayer requests awaiting moderation"),
                count: stats.prayerPending,
                hash: "admin/prayer"
            });
        }
        if (typeof stats.eventsSoon === "number" && stats.eventsSoon > 0) {
            items.push({
                label: T("admin.v5AttentionEvents", "Upcoming events"),
                count: stats.eventsSoon,
                hash: "admin/content/events"
            });
        }
        if (!items.length) {
            box.innerHTML = "<p class=\"page-note\">" + escapeHtml(T("admin.v5AttentionEmpty", "Nothing needs attention right now.")) + "</p>";
            return;
        }
        box.innerHTML = items.map(function (item) {
            return "<button type=\"button\" class=\"admin-v5-attention-item\" data-admin-v5-goto=\"" + escapeHtml(item.hash) + "\">" +
                "<span>" + escapeHtml(item.label) + "</span><strong>" + escapeHtml(String(item.count)) + "</strong></button>";
        }).join("");
    }

    function renderStats() {
        setStat("admin-v5-stat-pending", stats.pending);
        setStat("admin-v5-stat-members", stats.members);
        setStat("admin-v5-stat-prayers", stats.prayers);
        setStat("admin-v5-stat-events", stats.events);
        renderAttention();
    }

    function upsertPerson(partial) {
        var uid = String(partial && partial.uid || "").trim();
        if (!uid) {
            return;
        }
        var current = peopleByUid[uid] || { uid: uid, name: "", email: "", tier: "limited", requestStatus: "", moduleGrants: {} };
        Object.keys(partial).forEach(function (key) {
            if (partial[key] !== undefined) {
                current[key] = partial[key];
            }
        });
        if (!current.name) {
            current.name = current.email ? current.email.split("@")[0] : uid.slice(0, 8);
        }
        peopleByUid[uid] = current;
    }

    function countUpcomingEvents() {
        var nodes = document.querySelectorAll("#admin-event-list li");
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var count = 0;
        nodes.forEach(function (li) {
            var text = String(li.textContent || "");
            var match = text.match(/(\d{4}-\d{2}-\d{2})/);
            if (!match) {
                return;
            }
            var date = new Date(match[1] + "T00:00:00");
            if (!Number.isNaN(date.getTime()) && date >= today) {
                count += 1;
            }
        });
        return count;
    }

    function refreshDerivedStats() {
        var memberCount = 0;
        Object.keys(peopleByUid).forEach(function (uid) {
            if (peopleByUid[uid].tier === "member") {
                memberCount += 1;
            }
        });
        stats.members = directoryLoaded ? memberCount : null;
        stats.pending = pendingLoaded ? pendingRequests.length : null;
        var prayerItems = document.querySelectorAll("#admin-prayer-list li[data-prayer-id]");
        var prayerPending = document.querySelectorAll("#admin-prayer-list li[data-prayer-pending='1']");
        if (prayerItems.length) {
            stats.prayers = prayerItems.length;
            stats.prayerPending = prayerPending.length;
        }
        var eventCount = countUpcomingEvents();
        var eventLis = Array.prototype.slice.call(document.querySelectorAll("#admin-event-list > li"));
        var eventsStillLoading = eventLis.some(function (li) {
            return /Loading dashboard/i.test(li.textContent || "");
        });
        if (!eventsStillLoading && eventLis.length) {
            stats.events = eventCount;
            stats.eventsSoon = eventCount;
        }
        renderStats();
    }

    function writeAudit(uid, action, previousTier, nextTier, note) {
        var db = getDb();
        var admin = getAdminUser();
        if (!db || !admin || !admin.uid) {
            return Promise.resolve();
        }
        return db.collection("membershipDecisions").add({
            uid: uid,
            action: action,
            previousTier: previousTier || "",
            nextTier: nextTier || "",
            byUid: admin.uid,
            byEmail: normalizeEmail(admin.email),
            at: window.firebase.firestore.FieldValue.serverTimestamp(),
            note: String(note || "").slice(0, 200)
        }).catch(function () {
            return null;
        });
    }

    function syncDerivedAccess(uid, tier, grants) {
        var db = getDb();
        if (!db) {
            return Promise.resolve();
        }
        var accessType = tier === "member" ? "church" : "limited";
        var allowed = [];
        if (tier !== "member") {
            Object.keys(grants || {}).forEach(function (key) {
                if (grants[key] === true) {
                    allowed.push(key);
                }
            });
        }
        return db.collection("userAccess").doc(uid).set({
            accessType: accessType,
            allowedModules: allowed,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function () {
            return null;
        });
    }

    function setAccessTier(uid, targetTier) {
        var db = getDb();
        var nextTier = targetTier === "member" ? "member" : "limited";
        if (!db || !window.firebase || !window.firebase.firestore || !window.firebase.firestore.FieldValue) {
            return Promise.reject(new Error("no_firebase"));
        }
        var row = peopleByUid[uid] || { moduleGrants: {} };
        var grants = nextTier === "member" ? {} : limitedGrantsFrom(row.moduleGrants);
        var payload = {
            accessTier: nextTier,
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
            moduleGrants: grants
        };
        return db.collection("users").doc(uid).collection("app").doc("access").set(payload, { merge: true }).then(function () {
            upsertPerson({ uid: uid, tier: nextTier, moduleGrants: grants });
            if (window.NjcAppModules && typeof window.NjcAppModules.invalidateCache === "function") {
                window.NjcAppModules.invalidateCache();
            }
            return syncDerivedAccess(uid, nextTier, grants);
        }).then(function () {
            if (window.NjcAppModules && typeof window.NjcAppModules.refresh === "function") {
                return window.NjcAppModules.refresh().catch(function () {
                    return null;
                });
            }
            return null;
        });
    }

    function setRequestStatus(uid, status) {
        var db = getDb();
        if (!db) {
            return Promise.resolve();
        }
        var row = peopleByUid[uid] || pendingRequests.filter(function (item) {
            return item.uid === uid;
        })[0] || { uid: uid, name: "", email: "" };
        return db.collection("membershipRequests").doc(uid).set({
            uid: uid,
            displayName: String(row.name || "").slice(0, 120),
            email: String(row.email || "").slice(0, 320),
            status: status,
            submittedAt: row.submittedAt || window.firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function () {
            return null;
        });
    }

    function approveMember(uid) {
        if (!isAdminUser()) {
            setNote("error", T("admin.modulesNeedAdmin", "Sign in as admin to edit module settings."));
            return Promise.resolve();
        }
        var row = peopleByUid[uid] || pendingRequests.filter(function (item) {
            return item.uid === uid;
        })[0];
        if (!row) {
            setNote("error", T("admin.v5UserMissing", "That user could not be found."));
            return Promise.resolve();
        }
        if (row.tier === "member") {
            setNote("info", T("admin.v5AlreadyMember", "This person is already a church member."));
            return Promise.resolve();
        }
        busy = true;
        setNote("working", T("auth.working", "Please wait..."));
        var previous = row.tier || "limited";
        return refreshIdToken().then(function () {
            return setAccessTier(uid, "member");
        }).then(function () {
            return setRequestStatus(uid, "approved");
        }).then(function () {
            return writeAudit(uid, "approve", previous, "member", "");
        }).then(function () {
            pendingRequests = pendingRequests.filter(function (item) {
                return item.uid !== uid;
            });
            upsertPerson({ uid: uid, tier: "member", requestStatus: "approved" });
            setNote("success", T("admin.v5ApprovedOk", "Approved as church member. Admin access was not granted."));
            renderMembers();
            refreshDerivedStats();
            return null;
        }).catch(function () {
            setNote("error", T("admin.v5ApproveError", "Could not approve this person. Check that you are signed in as admin."));
            return null;
        }).finally(function () {
            busy = false;
        });
    }

    function rejectRequest(uid) {
        if (!window.confirm(T("admin.v5RejectConfirm", "Reject this church membership request?"))) {
            return Promise.resolve();
        }
        busy = true;
        setNote("working", T("auth.working", "Please wait..."));
        var row = pendingRequests.filter(function (item) {
            return item.uid === uid;
        })[0] || peopleByUid[uid] || { uid: uid, tier: "limited" };
        return refreshIdToken().then(function () {
            return setRequestStatus(uid, "rejected");
        }).then(function () {
            return writeAudit(uid, "reject", row.tier || "limited", row.tier || "limited", "rejected");
        }).then(function () {
            pendingRequests = pendingRequests.filter(function (item) {
                return item.uid !== uid;
            });
            upsertPerson({ uid: uid, requestStatus: "rejected" });
            setNote("success", T("admin.v5RejectedOk", "Request rejected."));
            renderMembers();
            refreshDerivedStats();
            return null;
        }).catch(function () {
            setNote("error", T("admin.v5RejectError", "Could not reject this request."));
            return null;
        }).finally(function () {
            busy = false;
        });
    }

    function revokeMember(uid) {
        if (!window.confirm(T("admin.v5RevokeConfirm", "Revoke church membership? This person will become an Other Believer. Admin access is not changed."))) {
            return Promise.resolve();
        }
        busy = true;
        setNote("working", T("auth.working", "Please wait..."));
        return refreshIdToken().then(function () {
            return setAccessTier(uid, "limited");
        }).then(function () {
            return setRequestStatus(uid, "rejected");
        }).then(function () {
            return writeAudit(uid, "revoke", "member", "limited", "");
        }).then(function () {
            upsertPerson({ uid: uid, tier: "limited", requestStatus: "" });
            setNote("success", T("admin.v5RevokedOk", "Membership revoked. Existing permissions for Other Believers remain."));
            renderMembers();
            refreshDerivedStats();
            return null;
        }).catch(function () {
            setNote("error", T("admin.v5RevokeError", "Could not revoke membership."));
            return null;
        }).finally(function () {
            busy = false;
        });
    }

    function showDetails(uid) {
        var row = peopleByUid[uid] || pendingRequests.filter(function (item) {
            return item.uid === uid;
        })[0];
        var box = document.getElementById("admin-v5-details");
        if (!box || !row) {
            return;
        }
        box.hidden = false;
        box.innerHTML = "<p class=\"admin-v5-kicker\">" + escapeHtml(T("admin.v5ViewDetails", "View Details")) + "</p>" +
            "<p><strong>" + escapeHtml(row.name || "") + "</strong></p>" +
            "<p class=\"page-note\">" + escapeHtml(row.email || "") + "</p>" +
            "<p class=\"page-note\">" + escapeHtml(requestStatusLabel(row)) + "</p>" +
            (row.lastSeenLabel ? "<p class=\"page-note\">" + escapeHtml(T("admin.v5LastSeen", "Last seen") + ": " + row.lastSeenLabel) + "</p>" : "") +
            "<p class=\"page-note\">UID: <code>" + escapeHtml(row.uid) + "</code></p>";
    }

    function loadPendingRequests() {
        var db = getDb();
        if (!db) {
            return Promise.resolve([]);
        }
        return db.collection("membershipRequests").where("status", "==", "pending").limit(200).get().then(function (snap) {
            pendingRequests = [];
            pendingLoaded = true;
            if (!snap || snap.empty) {
                return pendingRequests;
            }
            snap.forEach(function (doc) {
                var data = doc.data() || {};
                var row = {
                    uid: doc.id,
                    name: String(data.displayName || "").trim(),
                    email: String(data.email || "").trim().toLowerCase(),
                    requestStatus: "pending",
                    submittedAt: data.submittedAt,
                    registeredLabel: formatDate(data.submittedAt),
                    tier: "limited"
                };
                pendingRequests.push(row);
                upsertPerson(row);
            });
            return pendingRequests;
        }).catch(function () {
            pendingLoaded = false;
            setNote("info", T("admin.v5RequestsNeedRules", "Pending requests need the latest Firestore rules published in Firebase. Member approval from the user list still works."));
            return pendingRequests;
        });
    }

    function loadDirectoryPage(reset) {
        var db = getDb();
        if (!db) {
            setNote("error", T("admin.modulesNoFirebase", "Firebase is not ready."));
            return Promise.resolve();
        }
        if (reset) {
            directoryCursor = null;
            directoryHasMore = false;
        }
        var query = db.collection("userDirectory").limit(PAGE_SIZE);
        if (directoryCursor) {
            query = query.startAfter(directoryCursor);
        }
        return query.get().then(function (snap) {
            if (!snap || snap.empty) {
                directoryHasMore = false;
                directoryLoaded = true;
                return [];
            }
            var docs = snap.docs || [];
            directoryCursor = docs[docs.length - 1];
            directoryHasMore = docs.length >= PAGE_SIZE;
            directoryLoaded = true;
            return Promise.all(docs.map(function (doc) {
                var data = doc.data() || {};
                var uid = doc.id;
                upsertPerson({
                    uid: uid,
                    name: String(data.displayName || "").trim(),
                    email: String(data.email || "").trim().toLowerCase(),
                    lastSeenLabel: formatDate(data.lastSeenAt),
                    registeredLabel: formatDate(data.lastSeenAt || data.updatedAt)
                });
                return db.collection("users").doc(uid).collection("app").doc("access").get().then(function (accessSnap) {
                    var access = accessSnap && accessSnap.exists ? (accessSnap.data() || {}) : {};
                    var tier = String(access.accessTier || "limited").toLowerCase();
                    if (tier !== "member") {
                        tier = "limited";
                    }
                    upsertPerson({
                        uid: uid,
                        tier: tier,
                        moduleGrants: sanitizeGrants(access.moduleGrants)
                    });
                    return uid;
                }).catch(function () {
                    upsertPerson({ uid: uid, tier: "limited" });
                    return uid;
                });
            }));
        });
    }

    function loadPrayerCount() {
        var db = getDb();
        if (!db) {
            return Promise.resolve();
        }
        return db.collection("prayerWall").limit(200).get().then(function (snap) {
            if (!snap) {
                return;
            }
            var total = 0;
            var pending = 0;
            snap.forEach(function (doc) {
                total += 1;
                var data = doc.data() || {};
                if (data.approved === false) {
                    pending += 1;
                }
            });
            stats.prayers = total;
            stats.prayerPending = pending;
            return null;
        }).catch(function () {
            return null;
        });
    }

    function loadAll(reset) {
        if (!isAdminUser()) {
            setNote("info", T("admin.modulesNeedAdmin", "Sign in as admin to edit module settings."));
            return Promise.resolve();
        }
        busy = true;
        setNote("working", T("auth.working", "Please wait..."));
        return refreshIdToken().then(function () {
            return Promise.all([
                loadDirectoryPage(reset),
                loadPendingRequests(),
                loadPrayerCount()
            ]);
        }).then(function () {
            loadedOnce = true;
            setNote("", "");
            renderMembers();
            refreshDerivedStats();
            return null;
        }).catch(function () {
            setNote("error", T("admin.v5LoadError", "Could not load members. Check your connection and Firestore rules."));
            return null;
        }).finally(function () {
            busy = false;
        });
    }

    function bindChrome() {
        shell.addEventListener("click", function (event) {
            var nav = event.target.closest("[data-admin-v5-nav]");
            if (nav) {
                var view = nav.getAttribute("data-admin-v5-nav");
                setHash(view === "dashboard" ? "admin" : "admin/" + view);
                return;
            }
            var tab = event.target.closest("[data-admin-v5-tab]");
            if (tab) {
                var name = tab.getAttribute("data-admin-v5-tab");
                setHash(name === "church" ? "admin/members" : "admin/members/" + name);
                return;
            }
            var content = event.target.closest("[data-admin-v5-content]");
            if (content) {
                var key = content.getAttribute("data-admin-v5-content");
                setHash(key && key !== "all" ? "admin/content/" + key : "admin/content");
                return;
            }
            var gotoBtn = event.target.closest("[data-admin-v5-goto]");
            if (gotoBtn) {
                setHash(gotoBtn.getAttribute("data-admin-v5-goto"));
                return;
            }
            var prayerChip = event.target.closest("[data-admin-v5-prayer]");
            if (prayerChip) {
                var filter = prayerChip.getAttribute("data-admin-v5-prayer") || "all";
                routeContent.setAttribute("data-admin-v5-prayer", filter);
                shell.querySelectorAll("[data-admin-v5-prayer]").forEach(function (btn) {
                    btn.classList.toggle("is-active", btn === prayerChip);
                });
                return;
            }
            var actionBtn = event.target.closest("[data-admin-v5-action]");
            if (!actionBtn || busy) {
                return;
            }
            var uid = String(actionBtn.getAttribute("data-uid") || "").trim();
            var action = actionBtn.getAttribute("data-admin-v5-action");
            if (action === "approve") {
                approveMember(uid);
            } else if (action === "reject") {
                rejectRequest(uid);
            } else if (action === "revoke") {
                revokeMember(uid);
            } else if (action === "details") {
                showDetails(uid);
            }
        });
        var search = document.getElementById("admin-v5-search");
        if (search) {
            search.addEventListener("input", renderMembers);
        }
        var moreBtn = document.getElementById("admin-v5-load-more");
        if (moreBtn) {
            moreBtn.addEventListener("click", function () {
                if (!busy && directoryHasMore) {
                    loadAll(false);
                }
            });
        }
        var refreshBtn = document.getElementById("admin-v5-refresh");
        if (refreshBtn) {
            refreshBtn.addEventListener("click", function () {
                if (!busy) {
                    loadAll(true);
                }
            });
        }
    }

    classifyCards();
    bindChrome();
    applyChrome();

    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail ? event.detail.route : "";
        if (route !== "admin") {
            return;
        }
        applyChrome();
        if (isAdminUser() && !loadedOnce) {
            loadAll(true);
        } else {
            renderMembers();
            refreshDerivedStats();
        }
    });
    document.addEventListener("njc:authchange", function () {
        if (splitAdminHash().view && String(window.location.hash || "").indexOf("admin") >= 0 && isAdminUser()) {
            loadAll(true);
        }
    });
    document.addEventListener("njc:langchange", function () {
        applyChrome();
        renderMembers();
        renderStats();
    });
    document.addEventListener("njc:admin-prayer-updated", refreshDerivedStats);

    if (String(window.location.hash || "").replace(/^#/, "").indexOf("admin") === 0 && isAdminUser()) {
        loadAll(true);
    }

    window.NjcAdminV5 = {
        approveMember: approveMember,
        setAccessTier: setAccessTier,
        isAdminUser: isAdminUser
    };
})();
