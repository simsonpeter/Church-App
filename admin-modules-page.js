(function () {
    var COLLECTION = "appConfig";
    var DOC_ID = "modules";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    var fieldset = document.getElementById("admin-modules-fieldset");
    var saveBtn = document.getElementById("admin-modules-save");
    var statusEl = document.getElementById("admin-modules-status");
    var poolFieldset = document.getElementById("admin-registration-pool-fieldset");
    var guestPoolFieldset = document.getElementById("admin-guest-pool-fieldset");
    var guestInsightsRefreshBtn = document.getElementById("admin-guest-insights-refresh");
    var guestInsightsStatusEl = document.getElementById("admin-guest-insights-status");
    var guestInsightsSummaryEl = document.getElementById("admin-guest-insights-summary");
    var guestInsightsWrap = document.getElementById("admin-guest-insights-wrap");
    var guestInsightsTbody = document.getElementById("admin-guest-insights-tbody");
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
    var GUEST_INSIGHTS_LIMIT = 200;
    var GUEST_ACTIVE_DAYS = 30;
    var memberUsersBusy = false;
    var guestInsightsBusy = false;
    var latestMemberRows = {};

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
        if (guestPoolFieldset) {
            guestPoolFieldset.disabled = Boolean(busy);
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
        if (guestInsightsRefreshBtn) {
            guestInsightsRefreshBtn.disabled = Boolean(busy) || guestInsightsBusy;
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

    function applyGuestPoolFieldsetFromDoc(data) {
        if (!guestPoolFieldset || !window.NjcAppModules) {
            return;
        }
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        var raw = data && data.guestPool && typeof data.guestPool === "object" ? data.guestPool : null;
        var defaults = window.NjcAppModules.normalizeGuestPool
            ? window.NjcAppModules.normalizeGuestPool(null)
            : {};
        Object.keys(defs).forEach(function (key) {
            var input = guestPoolFieldset.querySelector('input[data-guest-pool-key="' + key + '"]');
            if (!input) {
                return;
            }
            if (!raw) {
                input.checked = defaults[key] === true;
            } else {
                input.checked = raw[key] === true;
            }
        });
    }

    function getGuestPoolFromForm() {
        var out = {};
        if (!guestPoolFieldset) {
            return out;
        }
        var defs = window.NjcAppModules.DEFAULT_MODULES || {};
        Object.keys(defs).forEach(function (key) {
            var input = guestPoolFieldset.querySelector('input[data-guest-pool-key="' + key + '"]');
            out[key] = input ? Boolean(input.checked) : false;
        });
        return out;
    }

    function moduleLabelKey(moduleKey) {
        var map = {
            home: "admin.guestInsightsModuleHome",
            announcements: "admin.moduleAnnouncements",
            bibleReading: "admin.moduleBibleReading",
            dailyVerse: "admin.moduleDailyVerse",
            trivia: "admin.moduleTrivia",
            eventsWeek: "admin.moduleEventsWeek",
            dailyBread: "admin.moduleDailyBread",
            bookShelf: "admin.moduleBookShelf",
            bible: "admin.moduleBible",
            songbook: "admin.moduleSongbook",
            prayer: "admin.modulePrayer",
            events: "admin.moduleEvents",
            sermons: "admin.moduleSermons",
            contact: "admin.moduleContact",
            celebrations: "admin.moduleCelebrations",
            chat: "admin.moduleChat",
            testimony: "admin.moduleTestimony",
            userAchievements: "admin.moduleUserAchievements",
            kids: "admin.moduleKids",
            newsletter: "admin.moduleNewsletter"
        };
        return map[moduleKey] || "";
    }

    function formatModuleLabel(moduleKey) {
        var key = moduleLabelKey(moduleKey);
        if (key) {
            return T(key, String(moduleKey || ""));
        }
        return String(moduleKey || "");
    }

    function formatGuestLastSeen(value) {
        if (!value) {
            return "—";
        }
        var date;
        if (value.toDate && typeof value.toDate === "function") {
            date = value.toDate();
        } else {
            date = new Date(value);
        }
        if (!date || Number.isNaN(date.getTime())) {
            return "—";
        }
        try {
            return date.toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e) {
            return date.toISOString().slice(0, 16).replace("T", " ");
        }
    }

    function summarizeGuestModuleHits(hits) {
        var src = hits && typeof hits === "object" ? hits : {};
        var rows = Object.keys(src).map(function (key) {
            return { key: key, count: Number(src[key]) || 0 };
        }).filter(function (row) {
            return row.count > 0;
        }).sort(function (a, b) {
            return b.count - a.count;
        });
        if (!rows.length) {
            return "—";
        }
        return rows.slice(0, 4).map(function (row) {
            return formatModuleLabel(row.key) + " (" + row.count + ")";
        }).join(", ");
    }

    function setGuestInsightsStatus(kind, key, fallback) {
        if (!guestInsightsStatusEl) {
            return;
        }
        guestInsightsStatusEl.hidden = !fallback;
        guestInsightsStatusEl.dataset.kind = kind || "";
        guestInsightsStatusEl.textContent = fallback ? T(key, fallback) : "";
    }

    function renderGuestInsightsSummary(rows) {
        if (!guestInsightsSummaryEl) {
            return;
        }
        var now = Date.now();
        var activeCutoff = now - (GUEST_ACTIVE_DAYS * 24 * 60 * 60 * 1000);
        var activeCount = 0;
        var moduleTotals = {};
        rows.forEach(function (row) {
            var last = row.lastSeenAt;
            var date = last && last.toDate ? last.toDate() : new Date(last || 0);
            if (date && !Number.isNaN(date.getTime()) && date.getTime() >= activeCutoff) {
                activeCount += 1;
            }
            var hits = row.moduleHits || {};
            Object.keys(hits).forEach(function (key) {
                moduleTotals[key] = (moduleTotals[key] || 0) + (Number(hits[key]) || 0);
            });
        });
        var topModules = Object.keys(moduleTotals).map(function (key) {
            return { key: key, count: moduleTotals[key] };
        }).sort(function (a, b) {
            return b.count - a.count;
        }).slice(0, 5);
        var topText = topModules.length
            ? topModules.map(function (item) {
                return formatModuleLabel(item.key) + " (" + item.count + ")";
            }).join(", ")
            : T("admin.guestInsightsNoModules", "No module usage yet.");
        guestInsightsSummaryEl.textContent = T(
            "admin.guestInsightsSummary",
            "Guests in last {days} days: {active} (showing {shown} recent sessions). Top modules: {modules}"
        )
            .replace(/\{days\}/g, String(GUEST_ACTIVE_DAYS))
            .replace(/\{active\}/g, String(activeCount))
            .replace(/\{shown\}/g, String(rows.length))
            .replace(/\{modules\}/g, topText);
    }

    function renderGuestInsights(rows) {
        if (!guestInsightsTbody || !guestInsightsWrap) {
            return;
        }
        if (!rows.length) {
            guestInsightsWrap.hidden = true;
            guestInsightsTbody.innerHTML = "";
            renderGuestInsightsSummary([]);
            setGuestInsightsStatus("info", "admin.guestInsightsEmpty", "No guest activity recorded yet.");
            return;
        }
        guestInsightsTbody.innerHTML = rows.map(function (row) {
            var region = [row.timeZone, row.locale].filter(Boolean).join(" · ") || "—";
            return "" +
                "<tr>" +
                "  <td>" + escapeHtml(formatGuestLastSeen(row.lastSeenAt)) + "</td>" +
                "  <td>" + escapeHtml(region) + "</td>" +
                "  <td>" + escapeHtml(String(row.language || row.locale || "—")) + "</td>" +
                "  <td>" + escapeHtml(summarizeGuestModuleHits(row.moduleHits)) + "</td>" +
                "  <td>" + escapeHtml(String(Number(row.pageViews) || 0)) + "</td>" +
                "</tr>";
        }).join("");
        guestInsightsWrap.hidden = false;
        renderGuestInsightsSummary(rows);
    }

    function loadGuestInsights() {
        if (!guestInsightsTbody || !guestInsightsWrap) {
            return Promise.resolve([]);
        }
        if (!isAdminUser()) {
            guestInsightsWrap.hidden = true;
            guestInsightsTbody.innerHTML = "";
            if (guestInsightsSummaryEl) {
                guestInsightsSummaryEl.textContent = "";
            }
            setGuestInsightsStatus("info", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
            return Promise.resolve([]);
        }
        var db = getFirestoreDb();
        if (!db) {
            setGuestInsightsStatus("error", "admin.modulesNoFirebase", "Firebase is not ready.");
            return Promise.resolve([]);
        }
        guestInsightsBusy = true;
        if (guestInsightsRefreshBtn) {
            guestInsightsRefreshBtn.disabled = true;
        }
        setGuestInsightsStatus("working", "auth.working", "Please wait...");
        return db.collection("guestSessions")
            .orderBy("lastSeenAt", "desc")
            .limit(GUEST_INSIGHTS_LIMIT)
            .get()
            .then(function (snap) {
                var rows = [];
                if (snap && !snap.empty) {
                    snap.forEach(function (doc) {
                        rows.push(doc.data() || {});
                    });
                }
                renderGuestInsights(rows);
                if (rows.length) {
                    setGuestInsightsStatus("success", "admin.guestInsightsLoaded", "Guest stats loaded.");
                }
                return rows;
            })
            .catch(function () {
                guestInsightsWrap.hidden = true;
                guestInsightsTbody.innerHTML = "";
                if (guestInsightsSummaryEl) {
                    guestInsightsSummaryEl.textContent = "";
                }
                setGuestInsightsStatus("error", "admin.guestInsightsLoadError", "Could not load guest stats. Publish Firestore rules for guestSessions.");
                return [];
            })
            .finally(function () {
                guestInsightsBusy = false;
                if (guestInsightsRefreshBtn) {
                    guestInsightsRefreshBtn.disabled = false;
                }
            });
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

    function setMemberUsersStatus(kind, key, fallback) {
        if (!memberUsersStatusEl) {
            return;
        }
        memberUsersStatusEl.hidden = !fallback;
        memberUsersStatusEl.dataset.kind = kind || "";
        memberUsersStatusEl.textContent = fallback ? T(key, fallback) : "";
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
            var name = row.name || ("User " + row.uid.slice(0, 8));
            return "" +
                "<tr>" +
                "  <td>" + escapeHtml(name) + "</td>" +
                "  <td><code>" + escapeHtml(row.uid) + "</code></td>" +
                "  <td>" + escapeHtml(tierLabel + detailText) + "</td>" +
                "  <td><div class=\"admin-member-users-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-member-uid=\"" + escapeHtml(row.uid) + "\" data-admin-member-target=\"member\">" + escapeHtml(T("admin.memberUsersSetMember", "Set member")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-member-uid=\"" + escapeHtml(row.uid) + "\" data-admin-member-target=\"limited\">" + escapeHtml(T("admin.memberUsersSetLimited", "Set limited")) + "</button>" +
                "  </div></td>" +
                "</tr>";
        }).join("");
        memberUsersTbody.innerHTML = html;
        memberUsersWrap.hidden = false;
    }

    function getUidFromUsersDocRef(ref) {
        if (!ref || !ref.path) {
            return "";
        }
        var parts = String(ref.path || "").split("/");
        if (parts.length >= 2 && parts[0] === "users") {
            return String(parts[1] || "");
        }
        return "";
    }

    function getUidFromNestedDocRef(ref, collectionName, docId) {
        if (!ref || !ref.path) {
            return "";
        }
        var parts = String(ref.path || "").split("/");
        if (parts.length === 4 && parts[0] === "users" && parts[2] === collectionName && parts[3] === docId) {
            return String(parts[1] || "");
        }
        return "";
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
        return Promise.all([
            queryWithTimeout(db.collectionGroup("profile").limit(MAX_MEMBER_USERS * 3).get()),
            queryWithTimeout(db.collectionGroup("app").limit(MAX_MEMBER_USERS * 3).get())
        ]).then(function (results) {
            var profileRes = results[0] || { timeout: false, snap: null };
            var accessRes = results[1] || { timeout: false, snap: null };
            var profileSnap = profileRes.snap;
            var accessSnap = accessRes.snap;
            var byUid = {};
            if (profileSnap && !profileSnap.empty) {
                profileSnap.forEach(function (d) {
                    if (String(d.id || "") !== "basic") {
                        return;
                    }
                    var uid = normalizeUid(getUidFromNestedDocRef(d.ref, "profile", "basic"));
                    if (!uid) {
                        return;
                    }
                    if (!byUid[uid]) {
                        byUid[uid] = { uid: uid, name: "", tier: "legacy", moduleGrants: {} };
                    }
                    var p = d.data() || {};
                    byUid[uid].name = String(p.fullName || "").trim();
                });
            }
            if (accessSnap && !accessSnap.empty) {
                accessSnap.forEach(function (d) {
                    if (String(d.id || "") !== "access") {
                        return;
                    }
                    var uid = normalizeUid(getUidFromNestedDocRef(d.ref, "app", "access"));
                    if (!uid) {
                        return;
                    }
                    if (!byUid[uid]) {
                        byUid[uid] = { uid: uid, name: "", tier: "legacy", moduleGrants: {} };
                    }
                    var a = d.data() || {};
                    byUid[uid].tier = inferTierFromAccess(a);
                    byUid[uid].moduleGrants = a.moduleGrants && typeof a.moduleGrants === "object" ? a.moduleGrants : {};
                });
            }

            var rows = Object.keys(byUid).map(function (uid) {
                return byUid[uid];
            }).sort(function (a, b) {
                var an = String(a.name || a.uid);
                var bn = String(b.name || b.uid);
                return an.localeCompare(bn);
            }).slice(0, MAX_MEMBER_USERS);

            renderMemberUsers(rows);
            if (rows.length) {
                setMemberUsersStatus("success", "admin.memberUsersLoaded", "Loaded registered users.");
            } else if (profileRes.timeout || accessRes.timeout) {
                setMemberUsersStatus("error", "admin.memberUsersLoadTimeout", "Loading users timed out. Please tap Refresh users again.");
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
            if (guestPoolFieldset) {
                guestPoolFieldset.disabled = true;
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
            if (guestPoolFieldset) {
                guestPoolFieldset.disabled = false;
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
                applyGuestPoolFieldsetFromDoc(accessSnap.data());
            } else {
                if (poolFieldset) {
                    applyPoolFieldsetFromDoc(null);
                }
                applyGuestPoolFieldsetFromDoc(null);
            }
            if (codesTextarea && codesSnap && codesSnap.exists) {
                var cdata = codesSnap.data() || {};
                var list = Array.isArray(cdata.codes) ? cdata.codes.map(function (x) { return String(x || "").trim(); }) : [];
                codesTextarea.value = list.filter(Boolean).join("\n");
            } else if (codesTextarea) {
                codesTextarea.value = "";
            }
            return Promise.all([loadMemberUsers(), loadGuestInsights()]);
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
            var guestPool = getGuestPoolFromForm();
            var codes = codesTextarea ? parseCodesFromTextarea(codesTextarea.value) : [];
            var ts = window.firebase.firestore.FieldValue.serverTimestamp();
            Promise.all([
                db.collection(COLLECTION).doc(ACCESS_DOC_ID).set({
                    registrationPool: pool,
                    guestPool: guestPool,
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
                setAccessStatus("success", "admin.accessSaved", "Registration pool, guest access, and member codes saved.");
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

    if (guestInsightsRefreshBtn) {
        guestInsightsRefreshBtn.addEventListener("click", function () {
            if (!isAdminUser()) {
                setGuestInsightsStatus("error", "admin.modulesNeedAdmin", "Sign in as admin to edit module settings.");
                return;
            }
            if (!guestInsightsBusy) {
                loadGuestInsights();
            }
        });
    }

    if (memberUsersTbody) {
        memberUsersTbody.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-admin-member-uid]");
            if (!button || memberUsersBusy) {
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
