(function () {
    var COL = "userAchievementScores";
    var PROFILES_KEY = "njc_user_profiles_v1";

    function modOn(moduleKey) {
        var m = window.NjcAppModules;
        if (!m || typeof m.isModuleEnabled !== "function") {
            return true;
        }
        return m.isModuleEnabled(moduleKey);
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function formatHalfPointTotal(value) {
        var n = Number(value) || 0;
        if (Math.abs(n - Math.round(n)) < 1e-9) {
            return String(Math.round(n));
        }
        return n.toFixed(1);
    }

    function toNum(value) {
        var n = Number(value);
        return isNaN(n) ? 0 : n;
    }

    function compareLeaderboardRows(a, b) {
        var dt = (b.totalPoints || 0) - (a.totalPoints || 0);
        if (dt !== 0) {
            return dt;
        }
        if (modOn("trivia")) {
            var dq = (b.triviaPoints || 0) - (a.triviaPoints || 0);
            if (dq !== 0) {
                return dq;
            }
        }
        var na = String(a.displayName || "").toLowerCase();
        var nb = String(b.displayName || "").toLowerCase();
        if (na < nb) {
            return -1;
        }
        if (na > nb) {
            return 1;
        }
        return 0;
    }

    function assignRanks(rows) {
        var displayRank = 1;
        rows.forEach(function (row, index) {
            if (index > 0 && row.totalPoints < rows[index - 1].totalPoints) {
                displayRank = index + 1;
            }
            row.rank = displayRank;
        });
        return rows;
    }

    function getMyUid() {
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        return auth && auth.uid ? String(auth.uid) : "";
    }

    function getMyGroupId() {
        var uid = getMyUid();
        if (!uid) {
            return "";
        }
        try {
            var map = JSON.parse(window.localStorage.getItem(PROFILES_KEY) || "{}");
            var p = map && map[uid];
            return String(p && p.groupId || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
        } catch (e) {
            return "";
        }
    }

    function formatUpdatedAgo(ts) {
        if (!ts) {
            return "";
        }
        var d = ts.toDate && typeof ts.toDate === "function" ? ts.toDate() : (ts instanceof Date ? ts : null);
        if (!d || isNaN(d.getTime())) {
            return "";
        }
        var sec = Math.max(0, Math.floor((Date.now() - d.getTime()) / 1000));
        if (sec < 45) {
            return T("userAchievements.updatedJustNow", "just now");
        }
        if (sec < 3600) {
            var m = Math.floor(sec / 60);
            return T("userAchievements.updatedMinutes", "{n} min ago").replace("{n}", String(Math.max(1, m)));
        }
        if (sec < 86400) {
            var h = Math.floor(sec / 3600);
            return T("userAchievements.updatedHours", "{n} h ago").replace("{n}", String(Math.max(1, h)));
        }
        var days = Math.floor(sec / 86400);
        return T("userAchievements.updatedDays", "{n} d ago").replace("{n}", String(Math.max(1, days)));
    }

    function isAchievementsRouteActive() {
        var view = document.querySelector('.page-view[data-route="user-achievements"]');
        return Boolean(view && view.classList.contains("active"));
    }

    function getElements() {
        return {
            list: document.getElementById("user-achievements-list"),
            pinned: document.getElementById("user-achievements-pinned"),
            groupSummary: document.getElementById("user-achievements-group-summary"),
            status: document.getElementById("user-achievements-status"),
            hint: document.getElementById("user-achievements-hint"),
            refresh: document.getElementById("user-achievements-refresh")
        };
    }

    function setStatus(text) {
        var status = getElements().status;
        if (status) {
            status.textContent = text || "";
            status.hidden = !text;
        }
    }

    function updateLoginHint() {
        var hint = getElements().hint;
        if (!hint) {
            return;
        }
        var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        var loggedIn = Boolean(auth && auth.uid);
        hint.hidden = loggedIn;
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function rowHtml(row, youLabel, quizOn) {
        var rank = row.rank != null ? row.rank : 1;
        var name = String(row.displayName || "Member").trim() || "Member";
        var updated = row.updatedLabel ? ("<span class=\"user-achievements-updated\">" + escapeHtml(row.updatedLabel) + "</span>") : "";
        var youBadge = youLabel ? ("<span class=\"user-achievements-you-badge\">" + escapeHtml(youLabel) + "</span> ") : "";
        var triviaCell = quizOn
            ? ("  <span class=\"user-achievements-num\">" + formatHalfPointTotal(row.triviaPoints) + "</span>")
            : "";
        return "" +
            "<li class=\"user-achievements-row" + (row.isYou ? " user-achievements-row--you" : "") + (quizOn ? "" : " user-achievements-row--no-quiz") + "\">" +
            "  <span class=\"user-achievements-rank\">" + rank + "</span>" +
            "  <span class=\"user-achievements-name-cell\">" +
            "    <span class=\"user-achievements-name-line\">" + youBadge + escapeHtml(name) + "</span>" +
            updated +
            "  </span>" +
            triviaCell +
            "  <span class=\"user-achievements-num\">" + formatHalfPointTotal(row.readingPoints) + "</span>" +
            "  <span class=\"user-achievements-num user-achievements-num--total\">" + formatHalfPointTotal(row.totalPoints) + "</span>" +
            "</li>";
    }

    function renderTable(targetList, rows, youLabelForPinned) {
        if (!targetList) {
            return;
        }
        var quizOn = modOn("trivia");
        var rankLabel = T("userAchievements.colRank", "#");
        var nameLabel = T("userAchievements.colName", "Name");
        var triviaLabel = T("userAchievements.colTrivia", "Bible Quiz");
        var readingLabel = T("userAchievements.colReading", "Reading");
        var totalLabel = T("userAchievements.colTotal", "Total");
        var updatedHint = T("userAchievements.colUpdatedHint", "Synced");

        var head = "" +
            "<li class=\"user-achievements-row user-achievements-row--head" + (quizOn ? "" : " user-achievements-row--no-quiz") + "\" aria-hidden=\"true\">" +
            "  <span class=\"user-achievements-rank\">" + rankLabel + "</span>" +
            "  <span class=\"user-achievements-name-cell\">" + nameLabel + "<span class=\"user-achievements-head-meta\"> · " + updatedHint + "</span></span>" +
            (quizOn ? ("  <span class=\"user-achievements-num\">" + triviaLabel + "</span>") : "") +
            "  <span class=\"user-achievements-num\">" + readingLabel + "</span>" +
            "  <span class=\"user-achievements-num\">" + totalLabel + "</span>" +
            "</li>";
        var body = rows.map(function (r) {
            return rowHtml(r, youLabelForPinned && r.isYou ? youLabelForPinned : "", quizOn);
        }).join("");
        targetList.innerHTML = head + body;
        targetList.hidden = false;
    }

    function loadLeaderboard() {
        if (!isAchievementsRouteActive()) {
            return;
        }
        var els = getElements();
        if (!els.list) {
            return;
        }
        updateLoginHint();
        if (els.pinned) {
            els.pinned.hidden = true;
            els.pinned.innerHTML = "";
        }
        if (els.groupSummary) {
            els.groupSummary.hidden = true;
            els.groupSummary.textContent = "";
        }

        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            setStatus(T("userAchievements.error", "Could not load the list. Try again."));
            els.list.hidden = true;
            return;
        }

        setStatus(T("userAchievements.loading", "Loading scores…"));
        els.list.hidden = true;

        var sync = window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function"
            ? window.NjcAchievementBoard.syncMyPublicScore()
            : Promise.resolve(null);

        sync.finally(function () {
            if (!isAchievementsRouteActive()) {
                return;
            }
            window.firebase.firestore().collection(COL).get()
                .then(function (snap) {
                    if (!isAchievementsRouteActive()) {
                        return;
                    }
                    var rows = [];
                    snap.forEach(function (doc) {
                        var d = doc.data() || {};
                        var trivia = toNum(d.triviaPoints);
                        var reading = toNum(d.readingPoints);
                        var total = modOn("trivia") ? (trivia + reading) : reading;
                        rows.push({
                            id: doc.id,
                            displayName: d.displayName,
                            triviaPoints: trivia,
                            readingPoints: reading,
                            totalPoints: total,
                            groupId: String(d.groupId || "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40),
                            updatedAt: d.updatedAt,
                            updatedLabel: formatUpdatedAgo(d.updatedAt)
                        });
                    });
                    rows.sort(compareLeaderboardRows);
                    assignRanks(rows);

                    var myUid = getMyUid();
                    var myGroup = getMyGroupId();
                    if (myGroup && els.groupSummary) {
                        var gSum = 0;
                        var gCount = 0;
                        rows.forEach(function (r) {
                            if (r.groupId === myGroup) {
                                gSum += r.totalPoints || 0;
                                gCount++;
                            }
                        });
                        if (gCount > 0) {
                            els.groupSummary.textContent = T("userAchievements.groupSummary", "Your tag “{tag}”: {count} people · {pts} pts combined")
                                .replace("{tag}", myGroup)
                                .replace("{count}", String(gCount))
                                .replace("{pts}", formatHalfPointTotal(gSum));
                            els.groupSummary.hidden = false;
                        }
                    }

                    setStatus("");
                    if (!rows.length) {
                        setStatus(T("userAchievements.emptyLong", "No one on the board yet. Ask members to open the app once while signed in so their phone can publish a row. Then tap Refresh."));
                        els.list.hidden = true;
                        return;
                    }

                    var myIndex = -1;
                    if (myUid) {
                        rows.forEach(function (r, i) {
                            if (r.id === myUid) {
                                myIndex = i;
                            }
                        });
                    }

                    var mainRows = rows.slice();
                    var pinnedRows = [];
                    if (myIndex >= 5 && myUid) {
                        var mine = mainRows[myIndex];
                        mainRows = mainRows.filter(function (_, i) {
                            return i !== myIndex;
                        });
                        pinnedRows = [Object.assign({}, mine, { isYou: true })];
                    }

                    if (els.pinned && pinnedRows.length) {
                        renderTable(els.pinned, pinnedRows, T("userAchievements.youPinned", "You"));
                    }

                    mainRows.forEach(function (r) {
                        r.isYou = Boolean(myUid && r.id === myUid);
                    });
                    renderTable(els.list, mainRows, T("userAchievements.youLabel", "You"));
                })
                .catch(function (err) {
                    if (!isAchievementsRouteActive()) {
                        return;
                    }
                    var code = err && err.code ? String(err.code) : "";
                    if (code === "permission-denied") {
                        setStatus(T("userAchievements.errorRules", "Could not load the leaderboard: Firestore blocked this read. Publish the rules in this app’s repo (firestore.rules) so userAchievementScores allows public read, or ask your admin to update Firestore → Rules → Publish."));
                    } else {
                        setStatus(T("userAchievements.error", "Could not load the list. Try again."));
                    }
                    els.list.hidden = true;
                });
        });
    }

    function onVisibleRefresh() {
        if (isAchievementsRouteActive()) {
            loadLeaderboard();
        }
    }

    document.addEventListener("njc:routechange", onVisibleRefresh);

    document.addEventListener("DOMContentLoaded", function () {
        var els = getElements();
        if (els.refresh) {
            els.refresh.addEventListener("click", function () {
                loadLeaderboard();
            });
        }
        onVisibleRefresh();
    });

    document.addEventListener("njc:authchange", onVisibleRefresh);
    document.addEventListener("njc:trivia-points-updated", onVisibleRefresh);
    document.addEventListener("njc:reading-points-updated", onVisibleRefresh);
    document.addEventListener("njc:profile-updated", onVisibleRefresh);
    document.addEventListener("njc:modules-updated", onVisibleRefresh);
})();
