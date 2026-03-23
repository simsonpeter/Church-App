(function () {
    var COL = "userAchievementScores";

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

    function isAchievementsRouteActive() {
        var view = document.querySelector('.page-view[data-route="user-achievements"]');
        return Boolean(view && view.classList.contains("active"));
    }

    function getElements() {
        return {
            list: document.getElementById("user-achievements-list"),
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

    function renderRows(rows) {
        var list = getElements().list;
        if (!list) {
            return;
        }
        var rankLabel = T("userAchievements.colRank", "#");
        var nameLabel = T("userAchievements.colName", "Name");
        var triviaLabel = T("userAchievements.colTrivia", "Trivia");
        var readingLabel = T("userAchievements.colReading", "Reading");
        var totalLabel = T("userAchievements.colTotal", "Total");

        var head = "" +
            "<li class=\"user-achievements-row user-achievements-row--head\" aria-hidden=\"true\">" +
            "  <span class=\"user-achievements-rank\">" + rankLabel + "</span>" +
            "  <span class=\"user-achievements-name\">" + nameLabel + "</span>" +
            "  <span class=\"user-achievements-num\">" + triviaLabel + "</span>" +
            "  <span class=\"user-achievements-num\">" + readingLabel + "</span>" +
            "  <span class=\"user-achievements-num\">" + totalLabel + "</span>" +
            "</li>";

        var body = rows.map(function (row, index) {
            var rank = index + 1;
            var name = String(row.displayName || "Member").trim() || "Member";
            return "" +
                "<li class=\"user-achievements-row\">" +
                "  <span class=\"user-achievements-rank\">" + rank + "</span>" +
                "  <span class=\"user-achievements-name\">" + escapeHtml(name) + "</span>" +
                "  <span class=\"user-achievements-num\">" + formatHalfPointTotal(row.triviaPoints) + "</span>" +
                "  <span class=\"user-achievements-num\">" + formatHalfPointTotal(row.readingPoints) + "</span>" +
                "  <span class=\"user-achievements-num user-achievements-num--total\">" + formatHalfPointTotal(row.totalPoints) + "</span>" +
                "</li>";
        }).join("");

        list.innerHTML = head + body;
        list.hidden = false;
    }

    function escapeHtml(text) {
        return String(text || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
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
                        var trivia = Number(d.triviaPoints) || 0;
                        var reading = Number(d.readingPoints) || 0;
                        var total = typeof d.totalPoints === "number" ? d.totalPoints : trivia + reading;
                        rows.push({
                            displayName: d.displayName,
                            triviaPoints: trivia,
                            readingPoints: reading,
                            totalPoints: total
                        });
                    });
                    rows.sort(function (a, b) {
                        return (b.totalPoints || 0) - (a.totalPoints || 0);
                    });
                    setStatus("");
                    if (!rows.length) {
                        setStatus(T("userAchievements.empty", "No scores yet. Play trivia and complete Bible reading."));
                        els.list.hidden = true;
                        return;
                    }
                    renderRows(rows);
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

    document.addEventListener("DOMContentLoaded", function () {
        var els = getElements();
        if (els.refresh) {
            els.refresh.addEventListener("click", function () {
                loadLeaderboard();
            });
        }
        onVisibleRefresh();
    });

    window.addEventListener("hashchange", onVisibleRefresh);
    document.addEventListener("njc:langchange", function () {
        if (isAchievementsRouteActive()) {
            loadLeaderboard();
        }
    });
    document.addEventListener("njc:authchange", onVisibleRefresh);
    document.addEventListener("njc:trivia-points-updated", onVisibleRefresh);
    document.addEventListener("njc:reading-points-updated", onVisibleRefresh);
    document.addEventListener("njc:profile-updated", onVisibleRefresh);
})();
