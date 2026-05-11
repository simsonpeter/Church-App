(function () {
    var BRUSSELS_TZ = "Europe/Brussels";
    var NEWSLETTER_COLLECTION = "churchNewsletters";
    var NEWSLETTER_CARD_LANG_ID = "newsletter";

    var pageCard = document.querySelector(".newsletter-page-card");
    var rangeEl = document.getElementById("newsletter-active-range");
    var statusEl = document.getElementById("newsletter-status");
    var contentWrap = document.getElementById("newsletter-content");
    var headingEl = document.getElementById("newsletter-heading");
    var bodyEl = document.getElementById("newsletter-body");

    if (!rangeEl || !statusEl || !contentWrap || !headingEl || !bodyEl) {
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
        if (!y || !m || !d) {
            return "";
        }
        return String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }

    function getNewsletterContentLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguageForElement === "function" && pageCard) {
            return window.NjcI18n.getLanguageForElement(pageCard) === "ta" ? "ta" : "en";
        }
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
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

    function normalizeDoc(doc) {
        if (!doc || !doc.exists) {
            return null;
        }
        var d = doc.data() || {};
        return {
            id: doc.id,
            title: String(d.title || "").trim(),
            body: String(d.body || "").trim(),
            titleTa: String(d.titleTa || "").trim(),
            bodyTa: String(d.bodyTa || "").trim(),
            visibleFrom: String(d.visibleFrom || "").trim(),
            visibleUntil: String(d.visibleUntil || "").trim(),
            monthKey: String(d.monthKey || "").trim()
        };
    }

    function isYmd(s) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
    }

    function pickActiveNewsletter(rows, todayYmd) {
        if (!todayYmd || !Array.isArray(rows)) {
            return null;
        }
        var active = rows.filter(function (r) {
            if (!r || !isYmd(r.visibleFrom) || !isYmd(r.visibleUntil)) {
                return false;
            }
            return r.visibleFrom <= todayYmd && todayYmd <= r.visibleUntil;
        });
        if (!active.length) {
            return null;
        }
        active.sort(function (a, b) {
            if (a.visibleFrom === b.visibleFrom) {
                return String(b.id).localeCompare(String(a.id));
            }
            return a.visibleFrom < b.visibleFrom ? 1 : -1;
        });
        return active[0];
    }

    function renderNewsletter(entry) {
        var lang = getNewsletterContentLanguage();
        var title = lang === "ta" && entry.titleTa ? entry.titleTa : entry.title;
        var body = lang === "ta" && entry.bodyTa ? entry.bodyTa : entry.body;
        if (!title && !body) {
            title = lang === "ta" && entry.titleTa ? "" : entry.title;
            body = lang === "ta" && entry.bodyTa ? entry.bodyTa : entry.body;
        }
        headingEl.textContent = title || T("newsletter.untitled", "Church newsletter");
        bodyEl.textContent = body || "";
        rangeEl.textContent = T("newsletter.activeRange", "Visible {from} – {until}")
            .replace("{from}", entry.visibleFrom)
            .replace("{until}", entry.visibleUntil);
        contentWrap.hidden = false;
        statusEl.hidden = true;
    }

    function showEmpty(message) {
        contentWrap.hidden = true;
        headingEl.textContent = "";
        bodyEl.textContent = "";
        rangeEl.textContent = "";
        statusEl.hidden = false;
        statusEl.textContent = message;
    }

    function loadNewsletter() {
        if (!window.NjcAppModules || typeof window.NjcAppModules.isModuleEnabled !== "function"
            || !window.NjcAppModules.isModuleEnabled("newsletter")) {
            showEmpty(T("newsletter.moduleOff", "This section is turned off."));
            return;
        }
        var db = getFirestoreDb();
        if (!db) {
            showEmpty(T("newsletter.noFirebase", "Could not load newsletter. Check your connection."));
            return;
        }
        showEmpty(T("newsletter.loading", "Loading…"));
        var todayYmd = getBrusselsYmd();
        db.collection(NEWSLETTER_COLLECTION)
            .orderBy("visibleFrom", "desc")
            .limit(48)
            .get()
            .then(function (snap) {
                var rows = [];
                snap.forEach(function (doc) {
                    var n = normalizeDoc(doc);
                    if (n) {
                        rows.push(n);
                    }
                });
                var pick = pickActiveNewsletter(rows, todayYmd);
                if (!pick) {
                    showEmpty(T("newsletter.noneScheduled", "There is no newsletter for this period yet."));
                    return;
                }
                renderNewsletter(pick);
            })
            .catch(function () {
                showEmpty(T("newsletter.loadError", "Could not load newsletter."));
            });
    }

    function currentRouteIsNewsletter() {
        var raw = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        var path = raw.split("?")[0];
        return path === "newsletter";
    }

    function onRoute() {
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "newsletter") {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:langchange", function () {
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:cardlangchange", function (ev) {
        var d = ev && ev.detail;
        if (!d || d.cardId !== NEWSLETTER_CARD_LANG_ID) {
            return;
        }
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:newsletter-updated", function () {
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        onRoute();
    });
})();
