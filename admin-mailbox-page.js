(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var CONTACT_FORM_URL = "https://mantledb.sh/v2/njc-belgium-contact-messages/entries";
    var CONTACT_MAX_ENTRIES = 250;
    var MAILBOX_READ_MAP_KEY = "njc_mailbox_read_map_v1";
    var list = document.getElementById("admin-mailbox-list");
    var refreshButton = document.getElementById("admin-mailbox-refresh");
    var mailboxCard = list ? list.closest(".card") : null;
    var actionRow = null;
    var markAllReadButton = null;
    var clearReadButton = null;
    var actionNote = null;
    var cachedEntries = [];
    var loading = false;
    var saving = false;
    var readMap = getStoredReadMap();

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            if (mailboxCard && typeof window.NjcI18n.tForElement === "function") {
                return window.NjcI18n.tForElement(mailboxCard, key, fallback);
            }
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getLocale() {
        if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
            if (mailboxCard && typeof window.NjcI18n.getLocaleForElement === "function") {
                return window.NjcI18n.getLocaleForElement(mailboxCard);
            }
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

    function getStoredReadMap() {
        try {
            var raw = window.localStorage.getItem(MAILBOX_READ_MAP_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function saveReadMap() {
        var source = readMap && typeof readMap === "object" ? readMap : {};
        var entries = Object.keys(source).filter(function (key) {
            return source[key];
        }).map(function (key) {
            return { key: key, time: Number(source[key]) || Date.now() };
        }).sort(function (a, b) {
            return b.time - a.time;
        }).slice(0, 800);
        var compact = {};
        entries.forEach(function (item) {
            compact[item.key] = item.time;
        });
        readMap = compact;
        try {
            window.localStorage.setItem(MAILBOX_READ_MAP_KEY, JSON.stringify(compact));
        } catch (err) {
            return null;
        }
        return null;
    }

    function getEntryId(entry) {
        var source = entry && typeof entry === "object" ? entry : {};
        var explicitId = String(source.id || source._id || "").trim();
        if (explicitId) {
            return explicitId;
        }
        var created = String(source.createdAt || source.updatedAt || "").trim();
        var email = normalizeEmail(source.createdByEmail || "");
        var name = normalizeEmail(source.name || "");
        var message = String(source.message || "").trim().slice(0, 160);
        return [created, email, name, message].join("|");
    }

    function isEntryRead(entryId) {
        return Boolean(readMap[String(entryId || "")]);
    }

    function setEntryRead(entryId, value) {
        var key = String(entryId || "");
        if (!key) {
            return;
        }
        if (value) {
            readMap[key] = Date.now();
        } else {
            delete readMap[key];
        }
        saveReadMap();
    }

    function pruneReadMapByEntries(entries) {
        var activeIds = {};
        (Array.isArray(entries) ? entries : []).forEach(function (entry) {
            var id = getEntryId(entry);
            if (id) {
                activeIds[id] = true;
            }
        });
        Object.keys(readMap).forEach(function (key) {
            if (!activeIds[key]) {
                delete readMap[key];
            }
        });
        saveReadMap();
    }

    function getReadCounts(entries) {
        var source = Array.isArray(entries) ? entries : [];
        var read = 0;
        source.forEach(function (entry) {
            if (isEntryRead(getEntryId(entry))) {
                read += 1;
            }
        });
        return {
            read: read,
            unread: Math.max(0, source.length - read)
        };
    }

    function setActionBusyState() {
        if (!markAllReadButton || !clearReadButton) {
            return;
        }
        var counts = getReadCounts(cachedEntries);
        markAllReadButton.disabled = loading || saving || counts.unread === 0;
        clearReadButton.disabled = loading || saving || counts.read === 0;
    }

    function setActionLabels() {
        if (!markAllReadButton || !clearReadButton) {
            return;
        }
        markAllReadButton.textContent = T("mailbox.markAllRead", "Mark all read");
        clearReadButton.textContent = T("mailbox.clearRead", "Clear read");
    }

    function showActionNote(key, fallback, state) {
        if (!actionNote) {
            return;
        }
        if (!key) {
            actionNote.hidden = true;
            actionNote.textContent = "";
            actionNote.dataset.state = "";
            return;
        }
        actionNote.hidden = false;
        actionNote.dataset.state = state || "info";
        actionNote.textContent = T(key, fallback);
    }

    function setupActionRow() {
        if (!refreshButton || actionRow) {
            return;
        }
        actionRow = document.createElement("div");
        actionRow.className = "admin-mailbox-actions";
        markAllReadButton = document.createElement("button");
        markAllReadButton.type = "button";
        markAllReadButton.className = "button-link";
        clearReadButton = document.createElement("button");
        clearReadButton.type = "button";
        clearReadButton.className = "button-link button-secondary";
        actionNote = document.createElement("p");
        actionNote.className = "page-note admin-mailbox-note";
        actionNote.hidden = true;
        actionRow.appendChild(markAllReadButton);
        actionRow.appendChild(clearReadButton);
        refreshButton.insertAdjacentElement("afterend", actionRow);
        actionRow.insertAdjacentElement("afterend", actionNote);
        setActionLabels();
        setActionBusyState();
    }

    function renderLoading() {
        if (!list) {
            return;
        }
        setActionBusyState();
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
        setActionBusyState();
        list.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("mailbox.accessDenied", "This mailbox is admin only.")) + "</h3>" +
            "</li>";
    }

    function renderError() {
        if (!list) {
            return;
        }
        setActionBusyState();
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
        setActionBusyState();
        if (!source.length) {
            list.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("mailbox.emptyTitle", "No messages yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("mailbox.emptyBody", "New messages will appear here.")) + "</p>" +
                "</li>";
            return;
        }

        var fromLabel = T("mailbox.from", "From");
        var readLabel = T("mailbox.read", "Read");
        var unreadLabel = T("mailbox.unread", "Unread");
        var markReadLabel = T("mailbox.markRead", "Mark read");
        var markUnreadLabel = T("mailbox.markUnread", "Mark unread");
        list.innerHTML = source.slice(0, 100).map(function (entry) {
            var safeName = String(entry && entry.name || "").trim() || "Anonymous";
            var safeEmail = String(entry && entry.createdByEmail || "").trim();
            var safeMessage = String(entry && entry.message || "").trim();
            var safeDate = formatDate(entry && entry.createdAt);
            var entryId = getEntryId(entry);
            var read = isEntryRead(entryId);
            var toggleLabel = read ? markUnreadLabel : markReadLabel;
            var stateLabel = read ? readLabel : unreadLabel;
            return "" +
                "<li class=\"mailbox-message-item" + (read ? " is-read" : " is-unread") + "\">" +
                "  <div class=\"mailbox-message-head\">" +
                "    <h3 class=\"mailbox-message-name\">" + escapeHtml(safeName) + "</h3>" +
                "    <span class=\"mailbox-message-state\">" + escapeHtml(stateLabel) + "</span>" +
                "  </div>" +
                "  <p class=\"page-note mailbox-message-date\">" + escapeHtml(safeDate) + "</p>" +
                "  <p class=\"mailbox-message-email\"><strong>" + escapeHtml(fromLabel) + ":</strong> " + escapeHtml(safeEmail || "-") + "</p>" +
                "  <p class=\"mailbox-message-body\">" + escapeHtml(safeMessage || "-") + "</p>" +
                "  <div class=\"mailbox-message-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary mailbox-toggle-read\" data-mailbox-id=\"" + escapeHtml(entryId) + "\" data-mailbox-read=\"" + (read ? "1" : "0") + "\">" + escapeHtml(toggleLabel) + "</button>" +
                "  </div>" +
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

    function saveMessages(entries) {
        var payload = {
            entries: (Array.isArray(entries) ? entries : []).slice(0, CONTACT_MAX_ENTRIES)
        };
        return fetch(CONTACT_FORM_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Mailbox save failed");
            }
            return true;
        });
    }

    function markAllReadInMailbox() {
        if (!cachedEntries.length) {
            return;
        }
        cachedEntries.forEach(function (entry) {
            setEntryRead(getEntryId(entry), true);
        });
        showActionNote("", "", "");
        renderEntries(cachedEntries);
    }

    function clearReadInMailbox() {
        if (saving || loading) {
            return;
        }
        var counts = getReadCounts(cachedEntries);
        if (counts.read === 0) {
            showActionNote("mailbox.noReadToClear", "No read messages to clear.", "info");
            return;
        }
        saving = true;
        showActionNote("", "", "");
        setActionBusyState();
        var nextEntries = cachedEntries.filter(function (entry) {
            return !isEntryRead(getEntryId(entry));
        });
        saveMessages(nextEntries).then(function () {
            cachedEntries = nextEntries;
            pruneReadMapByEntries(cachedEntries);
            renderEntries(cachedEntries);
        }).catch(function () {
            renderError();
        }).finally(function () {
            saving = false;
            setActionBusyState();
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
            showActionNote("", "", "");
            renderEntries(cachedEntries);
            return;
        }

        loading = true;
        showActionNote("", "", "");
        setActionBusyState();
        renderLoading();
        fetchMessages().then(function (entries) {
            cachedEntries = Array.isArray(entries) ? entries : [];
            pruneReadMapByEntries(cachedEntries);
            renderEntries(cachedEntries);
        }).catch(function () {
            renderError();
        }).finally(function () {
            loading = false;
            setActionBusyState();
        });
    }

    setupActionRow();

    if (refreshButton) {
        refreshButton.addEventListener("click", function () {
            loadMailbox(true);
        });
    }
    if (markAllReadButton) {
        markAllReadButton.addEventListener("click", function () {
            markAllReadInMailbox();
        });
    }
    if (clearReadButton) {
        clearReadButton.addEventListener("click", function () {
            clearReadInMailbox();
        });
    }
    if (list) {
        list.addEventListener("click", function (event) {
            var button = event.target.closest(".mailbox-toggle-read");
            if (!button) {
                return;
            }
            var entryId = String(button.getAttribute("data-mailbox-id") || "").trim();
            if (!entryId) {
                return;
            }
            var wasRead = button.getAttribute("data-mailbox-read") === "1";
            setEntryRead(entryId, !wasRead);
            showActionNote("", "", "");
            renderEntries(cachedEntries);
        });
    }

    document.addEventListener("njc:langchange", function () {
        setRefreshLabel();
        setActionLabels();
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

    document.addEventListener("njc:cardlangchange", function () {
        setRefreshLabel();
        setActionLabels();
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
        setActionLabels();
        setActionBusyState();
        loadMailbox(false);
    });
})();
