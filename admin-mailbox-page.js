(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var CONTACT_FORM_URL = "https://mantledb.sh/v2/njc-belgium-contact-messages/entries";
    var list = document.getElementById("admin-mailbox-list");
    var refreshButton = document.getElementById("admin-mailbox-refresh");
    var cachedEntries = [];
    var loading = false;

    function T(key, fallback) {
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

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isAdminUser() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return false;
        }
        var activeUser = window.NjcAuth.getUser();
        return normalizeEmail(activeUser && activeUser.email) === ADMIN_EMAIL;
    }

    function currentRoute() {
        return String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function formatDate(value) {
        var date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        return new Intl.DateTimeFormat(getLocale(), {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date);
    }

    function setRefreshLabel() {
        if (!refreshButton) {
            return;
        }
        refreshButton.textContent = T("mailbox.refresh", "Refresh");
    }

    function renderLoading() {
        if (!list) {
            return;
        }
        list.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("mailbox.loadingTitle", "Loading messages...")) + "</h3>" +
            "  <p>" + escapeHtml(T("mailbox.loadingBody", "Please wait.")) + "</p>" +
            "</li>";
    }

    function renderDenied() {
        if (!list) {
            return;
        }
        list.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("mailbox.accessDenied", "This mailbox is admin only.")) + "</h3>" +
            "</li>";
    }

    function renderError() {
        if (!list) {
            return;
        }
        list.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("mailbox.loadErrorTitle", "Could not load messages")) + "</h3>" +
            "  <p>" + escapeHtml(T("mailbox.loadErrorBody", "Please try again in a moment.")) + "</p>" +
            "</li>";
    }

    function renderEntries(entries) {
        if (!list) {
            return;
        }
        var source = Array.isArray(entries) ? entries.slice() : [];
        source.sort(function (a, b) {
            var aTime = String(a && a.createdAt || "");
            var bTime = String(b && b.createdAt || "");
            return bTime.localeCompare(aTime);
        });
        if (!source.length) {
            list.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("mailbox.emptyTitle", "No messages yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("mailbox.emptyBody", "New messages will appear here.")) + "</p>" +
                "</li>";
            return;
        }

        var fromLabel = T("mailbox.from", "From");
        list.innerHTML = source.slice(0, 100).map(function (entry) {
            var safeName = String(entry && entry.name || "").trim() || "Anonymous";
            var safeEmail = String(entry && entry.createdByEmail || "").trim();
            var safeMessage = String(entry && entry.message || "").trim();
            var safeDate = formatDate(entry && entry.createdAt);
            return "" +
                "<li class=\"mailbox-message-item\">" +
                "  <div class=\"mailbox-message-head\">" +
                "    <h3 class=\"mailbox-message-name\">" + escapeHtml(safeName) + "</h3>" +
                "    <span class=\"page-note\">" + escapeHtml(safeDate) + "</span>" +
                "  </div>" +
                "  <p class=\"mailbox-message-email\"><strong>" + escapeHtml(fromLabel) + ":</strong> " + escapeHtml(safeEmail || "-") + "</p>" +
                "  <p class=\"mailbox-message-body\">" + escapeHtml(safeMessage || "-") + "</p>" +
                "</li>";
        }).join("");
    }

    function fetchMessages() {
        return fetch(CONTACT_FORM_URL + "?ts=" + String(Date.now()), { cache: "no-store" }).then(function (response) {
            if (response.status === 404) {
                return [];
            }
            if (!response.ok) {
                throw new Error("Mailbox request failed");
            }
            return response.json().then(function (payload) {
                return payload && Array.isArray(payload.entries) ? payload.entries : [];
            });
        });
    }

    function loadMailbox(forceRefresh) {
        if (!list || currentRoute() !== "mailbox") {
            return;
        }
        if (!isAdminUser()) {
            renderDenied();
            return;
        }
        if (loading) {
            return;
        }
        if (!forceRefresh && cachedEntries.length) {
            renderEntries(cachedEntries);
            return;
        }

        loading = true;
        renderLoading();
        fetchMessages().then(function (entries) {
            cachedEntries = Array.isArray(entries) ? entries : [];
            renderEntries(cachedEntries);
        }).catch(function () {
            renderError();
        }).finally(function () {
            loading = false;
        });
    }

    if (refreshButton) {
        refreshButton.addEventListener("click", function () {
            loadMailbox(true);
        });
    }

    document.addEventListener("njc:langchange", function () {
        setRefreshLabel();
        if (currentRoute() === "mailbox") {
            if (!isAdminUser()) {
                renderDenied();
                return;
            }
            if (cachedEntries.length) {
                renderEntries(cachedEntries);
                return;
            }
            loadMailbox(false);
        }
    });

    document.addEventListener("njc:authchange", function () {
        if (currentRoute() !== "mailbox") {
            return;
        }
        if (!isAdminUser()) {
            window.location.hash = "#home";
            return;
        }
        loadMailbox(true);
    });

    window.addEventListener("hashchange", function () {
        loadMailbox(false);
    });

    document.addEventListener("DOMContentLoaded", function () {
        setRefreshLabel();
        loadMailbox(false);
    });
})();
