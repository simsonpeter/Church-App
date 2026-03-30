(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function getUser() {
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            return window.NjcAuth.getUser();
        }
        return null;
    }

    function isAdminUser() {
        return normalizeEmail(getUser() && getUser().email) === ADMIN_EMAIL;
    }

    function currentRoute() {
        return String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    var ONLINE_MS = 3 * 60 * 1000;

    function tsToMs(ts) {
        if (!ts) {
            return null;
        }
        if (typeof ts.toMillis === "function") {
            return ts.toMillis();
        }
        if (typeof ts.seconds === "number") {
            return ts.seconds * 1000;
        }
        return null;
    }

    function formatRelativeActivity(ts) {
        var ms = tsToMs(ts);
        if (ms === null || isNaN(ms)) {
            return { label: "—", online: false };
        }
        var age = Date.now() - ms;
        if (age < ONLINE_MS) {
            return { label: T("admin.triviaInsightsOnline", "Online"), online: true };
        }
        if (age < 60 * 1000) {
            return { label: T("admin.triviaInsightsJustNow", "Just now"), online: false };
        }
        if (age < 60 * 60 * 1000) {
            return { label: Math.floor(age / 60000) + "m " + T("admin.triviaInsightsAgo", "ago"), online: false };
        }
        if (age < 48 * 60 * 60 * 1000) {
            return { label: Math.floor(age / 3600000) + "h " + T("admin.triviaInsightsAgo", "ago"), online: false };
        }
        return { label: Math.floor(age / 86400000) + "d " + T("admin.triviaInsightsAgo", "ago"), online: false };
    }

    function triviaByDateSummary(map) {
        if (!map || typeof map !== "object") {
            return "";
        }
        var keys = Object.keys(map).filter(function (d) {
            return /^\d{4}-\d{2}-\d{2}$/.test(d);
        }).sort();
        if (!keys.length) {
            return "";
        }
        var lines = keys.map(function (d) {
            return d + ": " + String(map[d] || "");
        });
        return lines.join("\n");
    }

    function loadAdminTriviaInsights() {
        var refreshBtn = document.getElementById("admin-trivia-insights-refresh");
        var statusEl = document.getElementById("admin-trivia-insights-status");
        var wrap = document.getElementById("admin-trivia-insights-wrap");
        var tbody = document.getElementById("admin-trivia-insights-tbody");
        if (!refreshBtn || !isAdminUser()) {
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            if (statusEl) {
                statusEl.textContent = T("admin.leaderboardNeedLogin", "Sign in with the app (Firebase) on this browser to load the leaderboard.");
                statusEl.hidden = false;
            }
            return;
        }
        if (statusEl) {
            statusEl.textContent = T("admin.leaderboardLoading", "Loading…");
            statusEl.hidden = false;
        }
        var db = window.firebase.firestore();
        Promise.allSettled([
            db.collection("userAchievementScores").get(),
            db.collection("adminTriviaReports").get()
        ]).then(function (results) {
            var scoreRes = results[0];
            var reportRes = results[1];
            if (scoreRes.status !== "fulfilled") {
                if (statusEl) {
                    statusEl.textContent = T("admin.triviaInsightsError", "Could not load. Publish updated Firestore rules (admin email + adminTriviaReports).");
                    statusEl.hidden = false;
                }
                return;
            }
            var reportsDenied = reportRes.status !== "fulfilled";
            var scoreSnap = scoreRes.value;
            var reportSnap = reportsDenied ? null : reportRes.value;
            var byUid = {};
            scoreSnap.forEach(function (doc) {
                var d = doc.data() || {};
                byUid[doc.id] = {
                    displayName: String(d.displayName || "Member"),
                    lastActiveAt: d.lastActiveAt || d.updatedAt || null,
                    triviaPoints: Number(d.triviaPoints) || 0,
                    correctCount: 0,
                    wrongCount: 0,
                    lastQuizDate: "",
                    lastResult: "",
                    triviaByDate: {}
                };
            });
            if (reportSnap && typeof reportSnap.forEach === "function") {
                reportSnap.forEach(function (doc) {
                    var d = doc.data() || {};
                    var base = byUid[doc.id] || {
                        displayName: "Member",
                        lastActiveAt: null,
                        triviaPoints: 0,
                        correctCount: 0,
                        wrongCount: 0,
                        lastQuizDate: "",
                        lastResult: "",
                        triviaByDate: {}
                    };
                    base.correctCount = Number(d.correctCount) || 0;
                    base.wrongCount = Number(d.wrongCount) || 0;
                    base.lastQuizDate = String(d.lastQuizDate || "");
                    base.lastResult = String(d.lastResult || "");
                    base.triviaByDate = d.triviaByDate && typeof d.triviaByDate === "object" ? d.triviaByDate : {};
                    byUid[doc.id] = base;
                });
            }
            var uids = Object.keys(byUid);
            uids.sort(function (a, b) {
                var ra = byUid[a];
                var rb = byUid[b];
                var ta = tsToMs(ra.lastActiveAt) || 0;
                var tb = tsToMs(rb.lastActiveAt) || 0;
                return tb - ta;
            });
            if (statusEl) {
                var baseMsg = T("admin.triviaInsightsLoaded", "{n} users").replace("{n}", String(uids.length));
                if (reportsDenied) {
                    baseMsg += " — " + T("admin.triviaInsightsRulesHint", "Bible Quiz columns need new Firestore rules: publish adminTriviaReports read for your admin email, then reload.");
                }
                statusEl.textContent = baseMsg;
                statusEl.dataset.state = reportsDenied ? "warning" : "";
                statusEl.hidden = false;
            }
            if (!tbody || !wrap) {
                return;
            }
            if (!uids.length) {
                tbody.innerHTML = "<tr><td colspan=\"6\"><p class=\"page-note\">" + escapeHtml(T("admin.triviaInsightsEmpty", "No data yet. Users appear after they sign in and open the app.")) + "</p></td></tr>";
                wrap.hidden = false;
                return;
            }
            tbody.innerHTML = uids.map(function (uid) {
                var r = byUid[uid];
                var act = formatRelativeActivity(r.lastActiveAt);
                var statusClass = act.online ? "admin-status-online" : "admin-status-offline";
                var lastQuiz = r.lastQuizDate
                    ? (r.lastQuizDate + (r.lastResult ? " (" + r.lastResult + ")" : ""))
                    : "—";
                var detail = triviaByDateSummary(r.triviaByDate);
                var detailShort = detail ? (detail.split("\n").length + " " + T("admin.triviaInsightsDays", "days")) : "—";
                return "" +
                    "<tr>" +
                    "<td><strong>" + escapeHtml(r.displayName) + "</strong><br><span class=\"page-note\">" + escapeHtml(uid.slice(0, 12)) + "…</span></td>" +
                    "<td><span class=\"" + statusClass + "\">" + escapeHtml(act.label) + "</span></td>" +
                    "<td>" + escapeHtml(String(r.correctCount)) + "</td>" +
                    "<td>" + escapeHtml(String(r.wrongCount)) + "</td>" +
                    "<td>" + escapeHtml(lastQuiz) + "</td>" +
                    "<td title=\"" + escapeHtml(detail) + "\">" + escapeHtml(detailShort) + "</td>" +
                    "</tr>";
            }).join("");
            wrap.hidden = false;
        }).catch(function () {
            if (statusEl) {
                statusEl.textContent = T("admin.triviaInsightsError", "Could not load. Publish updated Firestore rules (admin email + adminTriviaReports).");
                statusEl.dataset.state = "error";
                statusEl.hidden = false;
            }
        });
    }

    function loadAdminLeaderboardPreview() {
        var leaderboardRefreshBtn = document.getElementById("admin-leaderboard-refresh");
        var leaderboardStatus = document.getElementById("admin-leaderboard-status");
        var leaderboardList = document.getElementById("admin-leaderboard-list");
        if (!leaderboardRefreshBtn || !isAdminUser()) {
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            if (leaderboardStatus) {
                leaderboardStatus.textContent = T("admin.leaderboardNeedLogin", "Sign in with the app (Firebase) on this browser to load the leaderboard.");
                leaderboardStatus.hidden = false;
            }
            return;
        }
        if (leaderboardStatus) {
            leaderboardStatus.textContent = T("admin.leaderboardLoading", "Loading…");
            leaderboardStatus.hidden = false;
        }
        window.firebase.firestore().collection("userAchievementScores").get()
            .then(function (snap) {
                var rows = [];
                snap.forEach(function (doc) {
                    var d = doc.data() || {};
                    var tr = Number(d.triviaPoints) || 0;
                    var rd = Number(d.readingPoints) || 0;
                    rows.push({
                        name: String(d.displayName || "Member"),
                        total: tr + rd,
                        trivia: tr,
                        reading: rd
                    });
                });
                rows.sort(function (a, b) {
                    return b.total - a.total;
                });
                if (leaderboardStatus) {
                    leaderboardStatus.textContent = T("admin.leaderboardLoaded", "{n} rows").replace("{n}", String(rows.length));
                    leaderboardStatus.hidden = false;
                }
                if (!leaderboardList) {
                    return;
                }
                if (!rows.length) {
                    leaderboardList.innerHTML = "<li><p class=\"page-note\">" + escapeHtml(T("admin.leaderboardEmpty", "No rows yet.")) + "</p></li>";
                    leaderboardList.hidden = false;
                    return;
                }
                leaderboardList.innerHTML = rows.slice(0, 50).map(function (r, i) {
                    return "<li><strong>" + escapeHtml(String(i + 1)) + ".</strong> " + escapeHtml(r.name) + " — " + escapeHtml(String(r.total)) + " <span class=\"page-note\">(" + escapeHtml(String(r.trivia)) + " / " + escapeHtml(String(r.reading)) + ")</span></li>";
                }).join("");
                leaderboardList.hidden = false;
            })
            .catch(function () {
                if (leaderboardStatus) {
                    leaderboardStatus.textContent = T("admin.leaderboardError", "Could not load (check Firestore rules).");
                    leaderboardStatus.hidden = false;
                }
            });
    }

    function bindLinkPresets() {
        var linkPresetsBtn = document.getElementById("admin-notice-link-presets-btn");
        var noticeLinkInput = document.getElementById("admin-notice-link");
        if (!linkPresetsBtn || !noticeLinkInput || linkPresetsBtn.dataset.njcPresetsBound === "1") {
            return;
        }
        linkPresetsBtn.dataset.njcPresetsBound = "1";
        linkPresetsBtn.addEventListener("click", function () {
            if (!isAdminUser()) {
                return;
            }
            var existing = document.getElementById("admin-link-presets-overlay");
            if (existing) {
                existing.remove();
            }
            var presets = [
                { label: "Home", v: "#home" },
                { label: "Prayer", v: "#prayer" },
                { label: "Events", v: "#events" },
                { label: "Sermons", v: "#sermons" },
                { label: "Daily bread", v: "#daily-bread" },
                { label: "Settings", v: "#settings" },
                { label: "Contact", v: "#contact" },
                { label: "Bible Quiz", v: "#trivia" },
                { label: "Bible", v: "#bible" },
                { label: "Songbook", v: "#songbook" },
                { label: "Library", v: "#library" },
                { label: "Daily bread", v: "#daily-bread" },
                { label: "Profile", v: "#profile" },
                { label: "User achievements", v: "#user-achievements" },
                { label: "Chat", v: "#chat" }
            ];
            var overlay = document.createElement("div");
            overlay.id = "admin-link-presets-overlay";
            overlay.className = "admin-presets-overlay";
            overlay.innerHTML = "" +
                "<div class=\"admin-presets-backdrop\" data-close=\"1\"></div>" +
                "<div class=\"admin-presets-sheet\" role=\"dialog\">" +
                "  <h3>" + escapeHtml(T("admin.linkPresetsTitle", "Insert app link")) + "</h3>" +
                "  <p class=\"page-note\">" + escapeHtml(T("admin.linkPresetsInfo", "Tap a route to fill the notice link field.")) + "</p>" +
                "  <div class=\"admin-presets-grid\"></div>" +
                "  <button type=\"button\" class=\"button-link button-secondary\" data-close=\"1\">" + escapeHtml(T("admin.linkPresetsClose", "Close")) + "</button>" +
                "</div>";
            var grid = overlay.querySelector(".admin-presets-grid");
            presets.forEach(function (p) {
                var b = document.createElement("button");
                b.type = "button";
                b.className = "button-link button-secondary admin-preset-chip";
                b.textContent = p.label + " (" + p.v + ")";
                b.addEventListener("click", function () {
                    noticeLinkInput.value = p.v;
                    overlay.remove();
                });
                grid.appendChild(b);
            });
            overlay.addEventListener("click", function (ev) {
                if (ev.target.getAttribute("data-close") === "1") {
                    overlay.remove();
                }
            });
            document.body.appendChild(overlay);
        });
    }

    function init() {
        var leaderboardRefreshBtn = document.getElementById("admin-leaderboard-refresh");
        if (leaderboardRefreshBtn) {
            leaderboardRefreshBtn.addEventListener("click", function () {
                if (!isAdminUser()) {
                    return;
                }
                loadAdminLeaderboardPreview();
            });
        }
        var triviaInsightsBtn = document.getElementById("admin-trivia-insights-refresh");
        if (triviaInsightsBtn) {
            triviaInsightsBtn.addEventListener("click", function () {
                if (!isAdminUser()) {
                    return;
                }
                loadAdminTriviaInsights();
            });
        }
        bindLinkPresets();
    }

    document.addEventListener("DOMContentLoaded", init);
    window.addEventListener("hashchange", function () {
        if (currentRoute() === "admin") {
            var b = document.getElementById("admin-notice-link-presets-btn");
            if (b) {
                b.dataset.njcPresetsBound = "";
            }
            bindLinkPresets();
        }
    });
})();
