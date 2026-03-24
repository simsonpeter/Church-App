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
                { label: "Contact", v: "#contact" },
                { label: "Trivia", v: "#trivia" },
                { label: "Bible", v: "#bible" },
                { label: "Songbook", v: "#songbook" },
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
