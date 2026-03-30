(function () {
    var FEED_URL = "https://mantledb.sh/v2/njc-belgium-admin-daily-bread/entries";
    var BRUSSELS_TZ = "Europe/Brussels";

    var dateLine = document.getElementById("daily-bread-date-line");
    var statusEl = document.getElementById("daily-bread-status");
    var contentWrap = document.getElementById("daily-bread-content");
    var headingEl = document.getElementById("daily-bread-heading");
    var bodyEl = document.getElementById("daily-bread-body");
    var pageCard = document.querySelector(".daily-bread-page-card");

    if (!dateLine || !statusEl || !contentWrap || !headingEl || !bodyEl) {
        return;
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && pageCard) {
            return window.NjcI18n.tForElement(pageCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getLocale() {
        if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
            return window.NjcI18n.getLocale();
        }
        return "en-GB";
    }

    function getAppLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
    }

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

        var y = partValue("year");
        var m = partValue("month");
        var d = partValue("day");
        return {
            year: y,
            month: m,
            day: d,
            key: String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0")
        };
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function toYmd(value) {
        var raw = String(value || "").trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return raw;
        }
        var date = new Date(raw);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        var y = date.getFullYear();
        var m = String(date.getMonth() + 1).padStart(2, "0");
        var d = String(date.getDate()).padStart(2, "0");
        return String(y) + "-" + m + "-" + d;
    }

    function normalizeEntry(row, index) {
        var source = row && typeof row === "object" ? row : {};
        return {
            id: String(source.id || "").trim() || ("db-" + index),
            date: toYmd(source.date || source.showDate || ""),
            title: String(source.title || "").trim(),
            titleTa: String(source.titleTa || "").trim(),
            body: String(source.body || "").trim(),
            bodyTa: String(source.bodyTa || "").trim()
        };
    }

    function pickContent(entry, lang) {
        if (lang === "ta") {
            var bodyTa = String(entry.bodyTa || "").trim();
            var bodyEn = String(entry.body || "").trim();
            var titleTa = String(entry.titleTa || "").trim();
            var titleEn = String(entry.title || "").trim();
            return {
                title: titleTa || titleEn,
                body: bodyTa || bodyEn
            };
        }
        return {
            title: String(entry.title || "").trim() || String(entry.titleTa || "").trim(),
            body: String(entry.body || "").trim() || String(entry.bodyTa || "").trim()
        };
    }

    var loadToken = 0;

    function setLoadingState() {
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.loading", "Loading…");
        statusEl.dataset.state = "";
        contentWrap.hidden = true;
    }

    function setEmptyState() {
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.empty", "No content for today yet.");
        statusEl.dataset.state = "empty";
        contentWrap.hidden = true;
    }

    function setErrorState() {
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.error", "Could not load. Try again later.");
        statusEl.dataset.state = "error";
        contentWrap.hidden = true;
    }

    function renderEntry(entry) {
        var lang = getAppLanguage();
        var picked = pickContent(entry, lang);
        headingEl.textContent = picked.title || T("dailyBread.title", "Daily bread");
        bodyEl.innerHTML = escapeHtml(picked.body || "");
        statusEl.hidden = true;
        contentWrap.hidden = false;
    }

    function updateDateLine(ymdKey) {
        var locale = getLocale();
        var parts = ymdKey.split("-");
        var y = Number(parts[0]);
        var m = Number(parts[1]);
        var d = Number(parts[2]);
        var dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        var label = new Intl.DateTimeFormat(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: BRUSSELS_TZ
        }).format(dateObj);
        dateLine.textContent = T("dailyBread.dateLine", "Date: {date}").replace("{date}", label);
    }

    function loadDailyBread() {
        var ymd = getBrusselsYmd();
        updateDateLine(ymd.key);
        loadToken += 1;
        var token = loadToken;
        setLoadingState();
        fetch(FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("load failed");
                }
                return response.json();
            })
            .then(function (payload) {
                if (token !== loadToken) {
                    return;
                }
                var rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
                var list = rows.map(function (row, i) {
                    return normalizeEntry(row, i);
                }).filter(function (e) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(e.date);
                });
                var match = list.filter(function (e) {
                    return e.date === ymd.key;
                }).sort(function (a, b) {
                    return String(b.id).localeCompare(String(a.id));
                })[0];
                if (!match) {
                    setEmptyState();
                    return;
                }
                renderEntry(match);
            })
            .catch(function () {
                if (token !== loadToken) {
                    return;
                }
                setErrorState();
            });
    }

    function onRoute() {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "daily-bread") {
            loadDailyBread();
        }
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("njc:langchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("njc:admin-daily-bread-updated", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("DOMContentLoaded", onRoute);
})();
