(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var ADMIN_NOTICES_URL = "https://mantledb.sh/v2/njc-belgium-admin-notices/entries";
    var ADMIN_EVENTS_URL = "https://mantledb.sh/v2/njc-belgium-admin-events/entries";
    var ADMIN_SERMONS_URL = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";
    var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
    var MAX_ENTRIES = 250;

    var refreshButton = document.getElementById("admin-dashboard-refresh");
    var note = document.getElementById("admin-dashboard-note");
    var statNotices = document.getElementById("admin-stat-notices");
    var statEvents = document.getElementById("admin-stat-events");
    var statSermons = document.getElementById("admin-stat-sermons");
    var statUrgentPrayers = document.getElementById("admin-stat-urgent-prayers");
    var prayerList = document.getElementById("admin-prayer-list");

    var noticeForm = document.getElementById("admin-notice-form");
    var noticeTitleInput = document.getElementById("admin-notice-title");
    var noticeBodyInput = document.getElementById("admin-notice-body");
    var noticeLinkInput = document.getElementById("admin-notice-link");
    var noticeUrgentInput = document.getElementById("admin-notice-urgent");
    var noticeSubmit = document.getElementById("admin-notice-submit");

    var eventForm = document.getElementById("admin-event-form");
    var eventTitleInput = document.getElementById("admin-event-title");
    var eventDateInput = document.getElementById("admin-event-date");
    var eventTimeInput = document.getElementById("admin-event-time");
    var eventTypeInput = document.getElementById("admin-event-type");
    var eventDescriptionInput = document.getElementById("admin-event-description");
    var eventSubmit = document.getElementById("admin-event-submit");

    var sermonForm = document.getElementById("admin-sermon-form");
    var sermonTitleInput = document.getElementById("admin-sermon-title");
    var sermonSubtitleInput = document.getElementById("admin-sermon-subtitle");
    var sermonSpeakerInput = document.getElementById("admin-sermon-speaker");
    var sermonDateInput = document.getElementById("admin-sermon-date");
    var sermonAudioInput = document.getElementById("admin-sermon-audio");
    var sermonSubmit = document.getElementById("admin-sermon-submit");

    var cachedNotices = [];
    var cachedEvents = [];
    var cachedSermons = [];
    var cachedPrayers = [];
    var busy = false;

    if (!refreshButton || !note || !prayerList || !noticeForm || !eventForm || !sermonForm) {
        return;
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function") {
            return window.NjcI18n.tForElement(note.closest(".page-view"), key, fallback);
        }
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
        var user = getUser();
        return normalizeEmail(user && user.email) === ADMIN_EMAIL;
    }

    function currentRoute() {
        return String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
    }

    function isAdminRoute() {
        return currentRoute() === "admin";
    }

    function setBusyState(value) {
        busy = Boolean(value);
        refreshButton.disabled = busy;
        noticeSubmit.disabled = busy;
        eventSubmit.disabled = busy;
        sermonSubmit.disabled = busy;
        prayerList.querySelectorAll("button[data-admin-prayer-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function showNote(state, key, fallback) {
        note.hidden = false;
        note.dataset.state = state || "";
        note.textContent = T(key, fallback);
    }

    function clearNote() {
        note.hidden = true;
        note.dataset.state = "";
        note.textContent = "";
    }

    function makeEntryId(prefix) {
        return String(prefix || "entry") + "-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000));
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

    function normalizePrayerEntry(entry, index) {
        var source = entry && typeof entry === "object" ? entry : {};
        return {
            id: String(source.id || ("prayer-" + index)),
            name: String(source.name || "").trim() || T("contact.prayerWallNameAnonymous", "Anonymous"),
            message: String(source.message || "").trim(),
            urgent: Boolean(source.urgent),
            createdAt: String(source.createdAt || "")
        };
    }

    function fetchMantleEntries(url) {
        return fetch(url + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (response.status === 404) {
                    return fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ entries: [] })
                    }).then(function (createResponse) {
                        if (!createResponse.ok) {
                            throw new Error("Init failed");
                        }
                        return [];
                    });
                }
                if (!response.ok) {
                    throw new Error("Load failed");
                }
                return response.json().then(function (payload) {
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            });
    }

    function saveMantleEntries(url, entries) {
        return fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: (Array.isArray(entries) ? entries : []).slice(0, MAX_ENTRIES) })
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Save failed");
            }
            return true;
        });
    }

    function renderStats() {
        statNotices.textContent = String(cachedNotices.length);
        statEvents.textContent = String(cachedEvents.length);
        statSermons.textContent = String(cachedSermons.length);
        var urgentCount = cachedPrayers.filter(function (item) { return Boolean(item && item.urgent); }).length;
        statUrgentPrayers.textContent = String(urgentCount);
    }

    function renderPrayerList() {
        if (!cachedPrayers.length) {
            prayerList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.emptyPrayersTitle", "No prayers found")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.emptyPrayersBody", "Prayer requests will appear here.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedPrayers.slice().sort(function (a, b) {
            var aTime = String(a && a.createdAt || "");
            var bTime = String(b && b.createdAt || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 25);
        prayerList.innerHTML = sorted.map(function (entry) {
            var buttonLabel = entry.urgent
                ? T("admin.prayerUnpin", "Remove urgent")
                : T("admin.prayerPin", "Mark urgent");
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(entry.name || T("contact.prayerWallNameAnonymous", "Anonymous")) + "</h3>" +
                "  <p>" + escapeHtml(String(entry.message || "").slice(0, 140)) + "</p>" +
                "  <button type=\"button\" class=\"button-link button-secondary\" data-admin-prayer-id=\"" + escapeHtml(entry.id) + "\">" + escapeHtml(buttonLabel) + "</button>" +
                "</li>";
        }).join("");
        prayerList.querySelectorAll("button[data-admin-prayer-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderDenied() {
        prayerList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        statNotices.textContent = "0";
        statEvents.textContent = "0";
        statSermons.textContent = "0";
        statUrgentPrayers.textContent = "0";
    }

    function setFormsEnabled(enabled) {
        var active = Boolean(enabled);
        noticeForm.querySelectorAll("input,textarea,button").forEach(function (node) {
            node.disabled = !active;
        });
        eventForm.querySelectorAll("input,textarea,select,button").forEach(function (node) {
            node.disabled = !active;
        });
        sermonForm.querySelectorAll("input,button").forEach(function (node) {
            node.disabled = !active;
        });
        refreshButton.disabled = !active || busy;
    }

    function loadDashboard(force) {
        if (!isAdminRoute()) {
            return;
        }
        if (!isAdminUser()) {
            setFormsEnabled(false);
            renderDenied();
            return;
        }
        setFormsEnabled(true);
        if (!force && cachedPrayers.length && cachedNotices.length + cachedEvents.length + cachedSermons.length > 0) {
            renderStats();
            renderPrayerList();
            return;
        }
        setBusyState(true);
        clearNote();
        Promise.all([
            fetchMantleEntries(ADMIN_NOTICES_URL),
            fetchMantleEntries(ADMIN_EVENTS_URL),
            fetchMantleEntries(ADMIN_SERMONS_URL),
            fetchMantleEntries(PRAYER_WALL_URL)
        ]).then(function (result) {
            cachedNotices = Array.isArray(result[0]) ? result[0] : [];
            cachedEvents = Array.isArray(result[1]) ? result[1] : [];
            cachedSermons = Array.isArray(result[2]) ? result[2] : [];
            cachedPrayers = (Array.isArray(result[3]) ? result[3] : []).map(normalizePrayerEntry).filter(function (item) {
                return Boolean(item.id);
            });
            renderStats();
            renderPrayerList();
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    }

    function prependAndSave(url, listRef, entry) {
        var nextEntries = [entry].concat(Array.isArray(listRef) ? listRef : []);
        return saveMantleEntries(url, nextEntries).then(function () {
            return fetchMantleEntries(url);
        });
    }

    noticeForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var title = String(noticeTitleInput.value || "").trim();
        var body = String(noticeBodyInput.value || "").trim();
        var link = String(noticeLinkInput.value || "").trim();
        if (!title || !body) {
            showNote("validation", "admin.noticeNeedFields", "Please enter notice title and message.");
            return;
        }
        setBusyState(true);
        prependAndSave(ADMIN_NOTICES_URL, cachedNotices, {
            id: makeEntryId("notice"),
            title: title,
            body: body,
            link: link,
            urgent: Boolean(noticeUrgentInput.checked),
            date: toYmd(new Date().toISOString()),
            createdAt: new Date().toISOString(),
            createdByEmail: normalizeEmail(getUser() && getUser().email)
        }).then(function (entries) {
            cachedNotices = entries;
            noticeTitleInput.value = "";
            noticeBodyInput.value = "";
            noticeLinkInput.value = "";
            noticeUrgentInput.checked = false;
            renderStats();
            showNote("success", "admin.noticeSaved", "Notice published.");
            document.dispatchEvent(new CustomEvent("njc:admin-notices-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    eventForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var title = String(eventTitleInput.value || "").trim();
        var date = String(eventDateInput.value || "").trim();
        var time = String(eventTimeInput.value || "").trim();
        var eventType = eventTypeInput.value === "Recurring" ? "Recurring" : "Special";
        var description = String(eventDescriptionInput.value || "").trim();
        if (!title || !date) {
            showNote("validation", "admin.eventNeedFields", "Please enter event title and date.");
            return;
        }
        setBusyState(true);
        prependAndSave(ADMIN_EVENTS_URL, cachedEvents, {
            id: makeEntryId("event"),
            title: title,
            date: date,
            time: time || "19:00",
            type: eventType,
            description: description,
            createdAt: new Date().toISOString(),
            createdByEmail: normalizeEmail(getUser() && getUser().email)
        }).then(function (entries) {
            cachedEvents = entries;
            eventTitleInput.value = "";
            eventDateInput.value = "";
            eventTimeInput.value = "";
            eventTypeInput.value = "Special";
            eventDescriptionInput.value = "";
            renderStats();
            showNote("success", "admin.eventSaved", "Event added.");
            document.dispatchEvent(new CustomEvent("njc:admin-events-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    sermonForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var title = String(sermonTitleInput.value || "").trim();
        var subtitle = String(sermonSubtitleInput.value || "").trim();
        var speaker = String(sermonSpeakerInput.value || "").trim();
        var date = String(sermonDateInput.value || "").trim();
        var audioUrl = String(sermonAudioInput.value || "").trim();
        if (!title || !date || !audioUrl) {
            showNote("validation", "admin.sermonNeedFields", "Please enter sermon title, date and audio URL.");
            return;
        }
        setBusyState(true);
        prependAndSave(ADMIN_SERMONS_URL, cachedSermons, {
            id: makeEntryId("sermon"),
            title: title,
            subtitle: subtitle,
            speaker: speaker,
            date: date,
            audioUrl: audioUrl,
            createdAt: new Date().toISOString(),
            createdByEmail: normalizeEmail(getUser() && getUser().email)
        }).then(function (entries) {
            cachedSermons = entries;
            sermonTitleInput.value = "";
            sermonSubtitleInput.value = "";
            sermonSpeakerInput.value = "";
            sermonDateInput.value = "";
            sermonAudioInput.value = "";
            renderStats();
            showNote("success", "admin.sermonSaved", "Sermon added.");
            document.dispatchEvent(new CustomEvent("njc:admin-sermons-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    prayerList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-prayer-id]");
        if (!button || busy || !isAdminUser()) {
            return;
        }
        var prayerId = String(button.getAttribute("data-admin-prayer-id") || "").trim();
        if (!prayerId) {
            return;
        }
        setBusyState(true);
        fetchMantleEntries(PRAYER_WALL_URL).then(function (entries) {
            var source = Array.isArray(entries) ? entries.slice(0, MAX_ENTRIES) : [];
            var target = source.find(function (item) {
                return String(item && item.id || "") === prayerId;
            });
            if (!target) {
                throw new Error("Prayer not found");
            }
            target.urgent = !Boolean(target.urgent);
            target.updatedAt = new Date().toISOString();
            return saveMantleEntries(PRAYER_WALL_URL, source).then(function () {
                return fetchMantleEntries(PRAYER_WALL_URL);
            });
        }).then(function (nextEntries) {
            cachedPrayers = (Array.isArray(nextEntries) ? nextEntries : []).map(normalizePrayerEntry).filter(function (item) {
                return Boolean(item.id);
            });
            renderStats();
            renderPrayerList();
            showNote("success", "admin.prayerUpdated", "Prayer urgency updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-prayer-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    refreshButton.addEventListener("click", function () {
        loadDashboard(true);
    });

    document.addEventListener("njc:langchange", function () {
        if (note.hidden) {
            return;
        }
        var state = note.dataset.state || "";
        if (state === "success") {
            showNote("success", "admin.saved", "Saved.");
        } else if (state === "validation") {
            showNote("validation", "admin.validation", "Please fill required fields.");
        } else if (state === "error") {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }
        if (isAdminRoute()) {
            renderPrayerList();
        }
    });

    document.addEventListener("njc:authchange", function () {
        if (isAdminRoute()) {
            loadDashboard(true);
        }
    });

    window.addEventListener("hashchange", function () {
        if (isAdminRoute()) {
            loadDashboard(true);
        }
    });

    document.addEventListener("DOMContentLoaded", function () {
        if (isAdminRoute()) {
            loadDashboard(true);
        }
    });
})();
