(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var ADMIN_NOTICES_URL = "https://mantledb.sh/v2/njc-belgium-admin-notices/entries";
    var ADMIN_BROADCASTS_URL = "https://mantledb.sh/v2/njc-belgium-admin-broadcasts/entries";
    var ADMIN_EVENTS_URL = "https://mantledb.sh/v2/njc-belgium-admin-events/entries";
    var ADMIN_SERMONS_URL = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";
    var ADMIN_TRIVIA_URL = "https://mantledb.sh/v2/njc-belgium-admin-trivia/entries";
    var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
    var MAX_ENTRIES = 250;

    var refreshButton = document.getElementById("admin-dashboard-refresh");
    var note = document.getElementById("admin-dashboard-note");
    var statNotices = document.getElementById("admin-stat-notices");
    var statEvents = document.getElementById("admin-stat-events");
    var statSermons = document.getElementById("admin-stat-sermons");
    var statUrgentPrayers = document.getElementById("admin-stat-urgent-prayers");
    var noticeList = document.getElementById("admin-notice-list");
    var broadcastList = document.getElementById("admin-broadcast-list");
    var eventList = document.getElementById("admin-event-list");
    var sermonList = document.getElementById("admin-sermon-list");
    var triviaList = document.getElementById("admin-trivia-list");
    var prayerList = document.getElementById("admin-prayer-list");

    var noticeForm = document.getElementById("admin-notice-form");
    var noticeTitleInput = document.getElementById("admin-notice-title");
    var noticeTitleTaInput = document.getElementById("admin-notice-title-ta");
    var noticeBodyInput = document.getElementById("admin-notice-body");
    var noticeBodyTaInput = document.getElementById("admin-notice-body-ta");
    var noticeLinkInput = document.getElementById("admin-notice-link");
    var noticeUrgentInput = document.getElementById("admin-notice-urgent");
    var noticeSubmit = document.getElementById("admin-notice-submit");

    var broadcastForm = document.getElementById("admin-broadcast-form");
    var broadcastTitleInput = document.getElementById("admin-broadcast-title");
    var broadcastTitleTaInput = document.getElementById("admin-broadcast-title-ta");
    var broadcastBodyInput = document.getElementById("admin-broadcast-body");
    var broadcastBodyTaInput = document.getElementById("admin-broadcast-body-ta");
    var broadcastCategoryInput = document.getElementById("admin-broadcast-category");
    var broadcastLinkInput = document.getElementById("admin-broadcast-link");
    var broadcastSubmit = document.getElementById("admin-broadcast-submit");

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

    var triviaForm = document.getElementById("admin-trivia-form");
    var triviaQuestionInput = document.getElementById("admin-trivia-question");
    var triviaOptionsInput = document.getElementById("admin-trivia-options");
    var triviaCorrectInput = document.getElementById("admin-trivia-correct");
    var triviaReferenceInput = document.getElementById("admin-trivia-reference");
    var triviaShowDateInput = document.getElementById("admin-trivia-show-date");
    var triviaSubmit = document.getElementById("admin-trivia-submit");

    var cachedNotices = [];
    var cachedBroadcasts = [];
    var cachedEvents = [];
    var cachedSermons = [];
    var cachedTrivia = [];
    var cachedPrayers = [];
    var busy = false;

    if (!refreshButton || !note || !noticeList || !broadcastList || !eventList || !sermonList || !prayerList || !noticeForm || !broadcastForm || !eventForm || !sermonForm) {
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
        broadcastSubmit.disabled = busy;
        eventSubmit.disabled = busy;
        sermonSubmit.disabled = busy;
        if (triviaSubmit) {
            triviaSubmit.disabled = busy;
        }
        noticeList.querySelectorAll("button[data-admin-notice-id]").forEach(function (button) {
            button.disabled = busy;
        });
        broadcastList.querySelectorAll("button[data-admin-broadcast-id]").forEach(function (button) {
            button.disabled = busy;
        });
        eventList.querySelectorAll("button[data-admin-event-id]").forEach(function (button) {
            button.disabled = busy;
        });
        sermonList.querySelectorAll("button[data-admin-sermon-id]").forEach(function (button) {
            button.disabled = busy;
        });
        if (triviaList) {
            triviaList.querySelectorAll("button[data-admin-trivia-id]").forEach(function (button) {
                button.disabled = busy;
            });
        }
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

    function normalizeBroadcastCategory(value) {
        var key = String(value || "").trim().toLowerCase();
        if (key === "events" || key === "sermons" || key === "prayer" || key === "contact") {
            return key;
        }
        return "general";
    }

    function getBroadcastDefaultUrl(category) {
        var key = normalizeBroadcastCategory(category);
        if (key === "events") {
            return "#events";
        }
        if (key === "sermons") {
            return "#sermons";
        }
        if (key === "prayer") {
            return "#prayer";
        }
        if (key === "contact") {
            return "#contact";
        }
        return "#home";
    }

    function normalizeBroadcastUrl(value, category) {
        var raw = String(value || "").trim();
        if (!raw) {
            return getBroadcastDefaultUrl(category);
        }
        if (/^https?:\/\//i.test(raw)) {
            return raw;
        }
        if (/^#[a-z0-9/_-]*$/i.test(raw)) {
            return raw;
        }
        return getBroadcastDefaultUrl(category);
    }

    function getBroadcastCategoryLabel(category) {
        var key = normalizeBroadcastCategory(category);
        if (key === "events") {
            return T("admin.broadcastCategoryEvents", "Events");
        }
        if (key === "sermons") {
            return T("admin.broadcastCategorySermons", "Sermons");
        }
        if (key === "prayer") {
            return T("admin.broadcastCategoryPrayer", "Prayer");
        }
        if (key === "contact") {
            return T("admin.broadcastCategoryContact", "Contact");
        }
        return T("admin.broadcastCategoryGeneral", "General");
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

    function renderNoticeList() {
        if (!cachedNotices.length) {
            noticeList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.noticeEmptyTitle", "No announcements yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.noticeEmptyBody", "Posted announcements will appear here.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedNotices.slice().sort(function (a, b) {
            var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 30);
        noticeList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var title = String(entry && entry.title || "").trim();
            var titleTa = String(entry && entry.titleTa || "").trim();
            var body = String(entry && entry.body || "").trim();
            var bodyTa = String(entry && entry.bodyTa || "").trim();
            var link = String(entry && entry.link || "").trim();
            var urgent = Boolean(entry && entry.urgent);
            var tagText = urgent ? ("<span class=\"prayer-list-urgent-badge\">" + escapeHtml(T("admin.noticeUrgent", "Mark as urgent")) + "</span>") : "";
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(title || T("admin.noticeTitle", "Send Notice")) + " " + tagText + "</h3>" +
                "  <p class=\"admin-item-body\">" + escapeHtml(body || "-") + "</p>" +
                (titleTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(titleTa) + "</p>") : "") +
                (bodyTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(bodyTa) + "</p>") : "") +
                (link ? ("  <p class=\"page-note\"><a class=\"inline-link\" href=\"" + escapeHtml(link) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + escapeHtml(link) + "</a></p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-notice-id=\"" + escapeHtml(id) + "\" data-admin-notice-action=\"edit\">" + escapeHtml(T("admin.noticeEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-notice-id=\"" + escapeHtml(id) + "\" data-admin-notice-action=\"delete\">" + escapeHtml(T("admin.noticeDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        noticeList.querySelectorAll("button[data-admin-notice-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderBroadcastList() {
        if (!cachedBroadcasts.length) {
            broadcastList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.broadcastEmptyTitle", "No broadcasts yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.broadcastEmptyBody", "Sent broadcasts will appear here.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedBroadcasts.slice().sort(function (a, b) {
            var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 30);
        broadcastList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var title = String(entry && entry.title || "").trim();
            var titleTa = String(entry && entry.titleTa || "").trim();
            var body = String(entry && entry.body || "").trim();
            var bodyTa = String(entry && entry.bodyTa || "").trim();
            var category = normalizeBroadcastCategory(entry && entry.category);
            var url = normalizeBroadcastUrl(entry && entry.url, category);
            var categoryLabel = getBroadcastCategoryLabel(category);
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(title || T("admin.broadcastTitle", "Broadcast Notifications")) + " <span class=\"prayer-list-urgent-badge\">" + escapeHtml(categoryLabel) + "</span></h3>" +
                "  <p class=\"admin-item-body\">" + escapeHtml(body || "-") + "</p>" +
                (titleTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(titleTa) + "</p>") : "") +
                (bodyTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(bodyTa) + "</p>") : "") +
                "  <p class=\"page-note\">" + escapeHtml(url) + "</p>" +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-broadcast-id=\"" + escapeHtml(id) + "\" data-admin-broadcast-action=\"edit\">" + escapeHtml(T("admin.broadcastEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-broadcast-id=\"" + escapeHtml(id) + "\" data-admin-broadcast-action=\"delete\">" + escapeHtml(T("admin.broadcastDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        broadcastList.querySelectorAll("button[data-admin-broadcast-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderEventList() {
        if (!cachedEvents.length) {
            eventList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.eventEmptyTitle", "No events yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.eventEmptyBody", "Added events will appear here.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedEvents.slice().sort(function (a, b) {
            var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 30);
        eventList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var title = String(entry && entry.title || "").trim();
            var date = String(entry && entry.date || "").trim();
            var time = String(entry && entry.time || "").trim();
            var type = String(entry && entry.type || "").trim();
            var description = String(entry && entry.description || "").trim();
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(title || T("admin.eventTitle", "Add Event")) + "</h3>" +
                "  <p class=\"page-note\">" + escapeHtml(date || "-") + (time ? (" • " + escapeHtml(time)) : "") + (type ? (" • " + escapeHtml(type)) : "") + "</p>" +
                (description ? ("  <p class=\"admin-item-body\">" + escapeHtml(description) + "</p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-event-id=\"" + escapeHtml(id) + "\" data-admin-event-action=\"edit\">" + escapeHtml(T("admin.eventEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-event-id=\"" + escapeHtml(id) + "\" data-admin-event-action=\"delete\">" + escapeHtml(T("admin.eventDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        eventList.querySelectorAll("button[data-admin-event-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderSermonList() {
        if (!cachedSermons.length) {
            sermonList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.sermonEmptyTitle", "No sermons yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.sermonEmptyBody", "Added sermons will appear here.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedSermons.slice().sort(function (a, b) {
            var aTime = String((a && (a.updatedAt || a.createdAt || a.date)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt || b.date)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 30);
        sermonList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var title = String(entry && entry.title || "").trim();
            var subtitle = String(entry && entry.subtitle || "").trim();
            var speaker = String(entry && entry.speaker || "").trim();
            var date = String(entry && entry.date || "").trim();
            var audioUrl = String(entry && entry.audioUrl || "").trim();
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(title || T("admin.sermonTitle", "Add Sermon")) + "</h3>" +
                (subtitle ? ("  <p class=\"page-note\">" + escapeHtml(subtitle) + "</p>") : "") +
                "  <p class=\"page-note\">" + escapeHtml(date || "-") + (speaker ? (" • " + escapeHtml(speaker)) : "") + "</p>" +
                (audioUrl ? ("  <p class=\"page-note\"><a class=\"inline-link\" href=\"" + escapeHtml(audioUrl) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + escapeHtml(audioUrl) + "</a></p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-sermon-id=\"" + escapeHtml(id) + "\" data-admin-sermon-action=\"edit\">" + escapeHtml(T("admin.sermonEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-sermon-id=\"" + escapeHtml(id) + "\" data-admin-sermon-action=\"delete\">" + escapeHtml(T("admin.sermonDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        sermonList.querySelectorAll("button[data-admin-sermon-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderTriviaList() {
        if (!triviaList) {
            return;
        }
        if (!cachedTrivia.length) {
            triviaList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.triviaEmptyTitle", "No Bible trivia yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.triviaEmptyBody", "Add Tamil Bible trivia questions. They will show from 8 AM local time on the scheduled date.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedTrivia.slice().sort(function (a, b) {
            var aDate = String((a && a.showDate) || "").trim();
            var bDate = String((b && b.showDate) || "").trim();
            return bDate.localeCompare(aDate);
        }).slice(0, 30);
        triviaList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var question = String(entry && entry.question || "").trim();
            var options = Array.isArray(entry && entry.options) ? entry.options : [];
            var correctIndex = Number(entry && entry.correctIndex);
            var reference = String(entry && entry.reference || "").trim();
            var showDate = String(entry && entry.showDate || "").trim();
            var optionsPreview = options.slice(0, 3).map(function (opt, i) {
                return (i === correctIndex ? "✓ " : "") + escapeHtml(String(opt || "").slice(0, 30));
            }).join(" | ");
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(question || T("admin.triviaQuestion", "Question")) + "</h3>" +
                "  <p class=\"page-note\">" + escapeHtml(showDate || "-") + (reference ? (" • " + escapeHtml(reference)) : "") + "</p>" +
                (optionsPreview ? ("  <p class=\"admin-item-body\">" + optionsPreview + "</p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-trivia-id=\"" + escapeHtml(id) + "\" data-admin-trivia-action=\"edit\">" + escapeHtml(T("admin.triviaEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-trivia-id=\"" + escapeHtml(id) + "\" data-admin-trivia-action=\"delete\">" + escapeHtml(T("admin.triviaDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        triviaList.querySelectorAll("button[data-admin-trivia-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderDenied() {
        noticeList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        broadcastList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        eventList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        sermonList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        if (triviaList) {
            triviaList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
                "</li>";
        }
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
        broadcastForm.querySelectorAll("input,textarea,select,button").forEach(function (node) {
            node.disabled = !active;
        });
        eventForm.querySelectorAll("input,textarea,select,button").forEach(function (node) {
            node.disabled = !active;
        });
        sermonForm.querySelectorAll("input,button").forEach(function (node) {
            node.disabled = !active;
        });
        if (triviaForm) {
            triviaForm.querySelectorAll("input,textarea,button").forEach(function (node) {
                node.disabled = !active;
            });
        }
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
        if (!force && (cachedPrayers.length + cachedNotices.length + cachedBroadcasts.length + cachedEvents.length + cachedSermons.length + cachedTrivia.length > 0)) {
            renderStats();
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderTriviaList();
            renderPrayerList();
            return;
        }
        setBusyState(true);
        clearNote();
        Promise.all([
            fetchMantleEntries(ADMIN_NOTICES_URL),
            fetchMantleEntries(ADMIN_BROADCASTS_URL),
            fetchMantleEntries(ADMIN_EVENTS_URL),
            fetchMantleEntries(ADMIN_SERMONS_URL),
            fetchMantleEntries(ADMIN_TRIVIA_URL),
            fetchMantleEntries(PRAYER_WALL_URL)
        ]).then(function (result) {
            cachedNotices = Array.isArray(result[0]) ? result[0] : [];
            cachedBroadcasts = Array.isArray(result[1]) ? result[1] : [];
            cachedEvents = Array.isArray(result[2]) ? result[2] : [];
            cachedSermons = Array.isArray(result[3]) ? result[3] : [];
            cachedTrivia = Array.isArray(result[4]) ? result[4] : [];
            cachedPrayers = (Array.isArray(result[5]) ? result[5] : []).map(normalizePrayerEntry).filter(function (item) {
                return Boolean(item.id);
            });
            renderStats();
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderTriviaList();
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
        var titleTa = String(noticeTitleTaInput && noticeTitleTaInput.value || "").trim();
        var body = String(noticeBodyInput.value || "").trim();
        var bodyTa = String(noticeBodyTaInput && noticeBodyTaInput.value || "").trim();
        var link = String(noticeLinkInput.value || "").trim();
        if (!title || !body) {
            showNote("validation", "admin.noticeNeedFields", "Please enter notice title and message.");
            return;
        }
        setBusyState(true);
        prependAndSave(ADMIN_NOTICES_URL, cachedNotices, {
            id: makeEntryId("notice"),
            title: title,
            titleTa: titleTa,
            body: body,
            bodyTa: bodyTa,
            link: link,
            urgent: Boolean(noticeUrgentInput.checked),
            date: toYmd(new Date().toISOString()),
            createdAt: new Date().toISOString(),
            createdByEmail: normalizeEmail(getUser() && getUser().email)
        }).then(function (entries) {
            cachedNotices = entries;
            noticeTitleInput.value = "";
            if (noticeTitleTaInput) {
                noticeTitleTaInput.value = "";
            }
            noticeBodyInput.value = "";
            if (noticeBodyTaInput) {
                noticeBodyTaInput.value = "";
            }
            noticeLinkInput.value = "";
            noticeUrgentInput.checked = false;
            renderStats();
            renderNoticeList();
            showNote("success", "admin.noticeSaved", "Notice published.");
            document.dispatchEvent(new CustomEvent("njc:admin-notices-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    broadcastForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var title = String(broadcastTitleInput.value || "").trim();
        var titleTa = String(broadcastTitleTaInput && broadcastTitleTaInput.value || "").trim();
        var body = String(broadcastBodyInput.value || "").trim();
        var bodyTa = String(broadcastBodyTaInput && broadcastBodyTaInput.value || "").trim();
        var category = normalizeBroadcastCategory(broadcastCategoryInput.value);
        var url = normalizeBroadcastUrl(broadcastLinkInput.value, category);
        if (!title || !body) {
            showNote("validation", "admin.broadcastNeedFields", "Please enter broadcast title and message.");
            return;
        }
        setBusyState(true);
        prependAndSave(ADMIN_BROADCASTS_URL, cachedBroadcasts, {
            id: makeEntryId("broadcast"),
            title: title,
            titleTa: titleTa,
            body: body,
            bodyTa: bodyTa,
            category: category,
            url: url,
            createdAt: new Date().toISOString(),
            createdByEmail: normalizeEmail(getUser() && getUser().email)
        }).then(function (entries) {
            cachedBroadcasts = Array.isArray(entries) ? entries : [];
            broadcastTitleInput.value = "";
            if (broadcastTitleTaInput) {
                broadcastTitleTaInput.value = "";
            }
            broadcastBodyInput.value = "";
            if (broadcastBodyTaInput) {
                broadcastBodyTaInput.value = "";
            }
            broadcastCategoryInput.value = "general";
            broadcastLinkInput.value = "";
            renderBroadcastList();
            showNote("success", "admin.broadcastSaved", "Broadcast sent.");
            document.dispatchEvent(new CustomEvent("njc:admin-broadcast-updated"));
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
            renderEventList();
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
            renderSermonList();
            showNote("success", "admin.sermonSaved", "Sermon added.");
            document.dispatchEvent(new CustomEvent("njc:admin-sermons-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    if (triviaForm && triviaQuestionInput && triviaOptionsInput && triviaCorrectInput && triviaShowDateInput) {
        triviaForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (busy || !isAdminUser()) {
                return;
            }
            var question = String(triviaQuestionInput.value || "").trim();
            var optionsRaw = String(triviaOptionsInput.value || "").trim();
            var options = optionsRaw.split(/\n/).map(function (line) {
                return String(line || "").trim();
            }).filter(Boolean);
            var correctIndex = Math.max(0, Math.min(options.length - 1, Number(triviaCorrectInput.value) || 0));
            var reference = String(triviaReferenceInput && triviaReferenceInput.value || "").trim();
            var showDate = String(triviaShowDateInput.value || "").trim();
            if (!question || !options.length || !showDate) {
                showNote("validation", "admin.triviaNeedFields", "Please enter question, at least one option, and show date.");
                return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
                showNote("validation", "admin.triviaNeedDate", "Show date must be YYYY-MM-DD.");
                return;
            }
            setBusyState(true);
            prependAndSave(ADMIN_TRIVIA_URL, cachedTrivia, {
                id: makeEntryId("trivia"),
                question: question,
                options: options,
                correctIndex: correctIndex,
                reference: reference,
                showDate: showDate,
                createdAt: new Date().toISOString(),
                createdByEmail: normalizeEmail(getUser() && getUser().email)
            }).then(function (entries) {
                cachedTrivia = entries;
                triviaQuestionInput.value = "";
                triviaOptionsInput.value = "";
                triviaCorrectInput.value = "0";
                if (triviaReferenceInput) {
                    triviaReferenceInput.value = "";
                }
                triviaShowDateInput.value = "";
                renderTriviaList();
                showNote("success", "admin.triviaSaved", "Bible trivia added.");
                document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
        });
    }

    noticeList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-notice-id][data-admin-notice-action]");
        if (!button || busy || !isAdminUser()) {
            return;
        }
        var noticeId = String(button.getAttribute("data-admin-notice-id") || "").trim();
        var action = String(button.getAttribute("data-admin-notice-action") || "").trim();
        if (!noticeId || (action !== "edit" && action !== "delete")) {
            return;
        }
        var source = cachedNotices.slice(0, MAX_ENTRIES);
        var targetIndex = source.findIndex(function (entry) {
            return String(entry && entry.id || "").trim() === noticeId;
        });
        if (targetIndex < 0) {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            return;
        }
        if (action === "delete") {
            var confirmed = window.confirm(T("admin.noticeDeleteConfirm", "Delete this announcement?"));
            if (!confirmed) {
                return;
            }
            source.splice(targetIndex, 1);
            setBusyState(true);
            saveMantleEntries(ADMIN_NOTICES_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_NOTICES_URL);
            }).then(function (entries) {
                cachedNotices = Array.isArray(entries) ? entries : [];
                renderStats();
                renderNoticeList();
                showNote("success", "admin.noticeDeleted", "Announcement deleted.");
                document.dispatchEvent(new CustomEvent("njc:admin-notices-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
            return;
        }
        var current = source[targetIndex] || {};
        var nextTitle = window.prompt(T("admin.noticeEditPromptTitle", "Edit title"), String(current.title || ""));
        if (nextTitle === null) {
            return;
        }
        var nextBody = window.prompt(T("admin.noticeEditPromptBody", "Edit message"), String(current.body || ""));
        if (nextBody === null) {
            return;
        }
        var nextTitleTa = window.prompt(T("admin.noticeEditPromptTitleTa", "Edit Tamil title (optional)"), String(current.titleTa || ""));
        if (nextTitleTa === null) {
            return;
        }
        var nextBodyTa = window.prompt(T("admin.noticeEditPromptBodyTa", "Edit Tamil message (optional)"), String(current.bodyTa || ""));
        if (nextBodyTa === null) {
            return;
        }
        var nextLink = window.prompt(T("admin.noticeEditPromptLink", "Edit link (optional)"), String(current.link || ""));
        if (nextLink === null) {
            return;
        }
        var cleanTitle = String(nextTitle || "").trim();
        var cleanBody = String(nextBody || "").trim();
        if (!cleanTitle || !cleanBody) {
            showNote("validation", "admin.noticeNeedFields", "Please enter notice title and message.");
            return;
        }
        source[targetIndex] = Object.assign({}, current, {
            title: cleanTitle,
            body: cleanBody,
            titleTa: String(nextTitleTa || "").trim(),
            bodyTa: String(nextBodyTa || "").trim(),
            link: String(nextLink || "").trim(),
            updatedAt: new Date().toISOString()
        });
        setBusyState(true);
        saveMantleEntries(ADMIN_NOTICES_URL, source).then(function () {
            return fetchMantleEntries(ADMIN_NOTICES_URL);
        }).then(function (entries) {
            cachedNotices = Array.isArray(entries) ? entries : [];
            renderStats();
            renderNoticeList();
            showNote("success", "admin.noticeUpdated", "Announcement updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-notices-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    broadcastList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-broadcast-id][data-admin-broadcast-action]");
        if (!button || busy || !isAdminUser()) {
            return;
        }
        var broadcastId = String(button.getAttribute("data-admin-broadcast-id") || "").trim();
        var action = String(button.getAttribute("data-admin-broadcast-action") || "").trim();
        if (!broadcastId || (action !== "edit" && action !== "delete")) {
            return;
        }
        var source = cachedBroadcasts.slice(0, MAX_ENTRIES);
        var targetIndex = source.findIndex(function (entry) {
            return String(entry && entry.id || "").trim() === broadcastId;
        });
        if (targetIndex < 0) {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            return;
        }
        if (action === "delete") {
            var confirmed = window.confirm(T("admin.broadcastDeleteConfirm", "Delete this broadcast?"));
            if (!confirmed) {
                return;
            }
            source.splice(targetIndex, 1);
            setBusyState(true);
            saveMantleEntries(ADMIN_BROADCASTS_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_BROADCASTS_URL);
            }).then(function (entries) {
                cachedBroadcasts = Array.isArray(entries) ? entries : [];
                renderBroadcastList();
                showNote("success", "admin.broadcastDeleted", "Broadcast deleted.");
                document.dispatchEvent(new CustomEvent("njc:admin-broadcast-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
            return;
        }
        var current = source[targetIndex] || {};
        var nextTitle = window.prompt(T("admin.broadcastEditPromptTitle", "Edit title"), String(current.title || ""));
        if (nextTitle === null) {
            return;
        }
        var nextBody = window.prompt(T("admin.broadcastEditPromptBody", "Edit message"), String(current.body || ""));
        if (nextBody === null) {
            return;
        }
        var nextTitleTa = window.prompt(T("admin.broadcastEditPromptTitleTa", "Edit Tamil title (optional)"), String(current.titleTa || ""));
        if (nextTitleTa === null) {
            return;
        }
        var nextBodyTa = window.prompt(T("admin.broadcastEditPromptBodyTa", "Edit Tamil message (optional)"), String(current.bodyTa || ""));
        if (nextBodyTa === null) {
            return;
        }
        var nextCategory = window.prompt(T("admin.broadcastEditPromptCategory", "Edit category (general/events/sermons/prayer/contact)"), String(current.category || "general"));
        if (nextCategory === null) {
            return;
        }
        var nextUrl = window.prompt(T("admin.broadcastEditPromptUrl", "Edit target route/link"), String(current.url || ""));
        if (nextUrl === null) {
            return;
        }
        var cleanTitle = String(nextTitle || "").trim();
        var cleanBody = String(nextBody || "").trim();
        var cleanCategory = normalizeBroadcastCategory(nextCategory);
        if (!cleanTitle || !cleanBody) {
            showNote("validation", "admin.broadcastNeedFields", "Please enter broadcast title and message.");
            return;
        }
        source[targetIndex] = Object.assign({}, current, {
            title: cleanTitle,
            body: cleanBody,
            titleTa: String(nextTitleTa || "").trim(),
            bodyTa: String(nextBodyTa || "").trim(),
            category: cleanCategory,
            url: normalizeBroadcastUrl(nextUrl, cleanCategory),
            updatedAt: new Date().toISOString()
        });
        setBusyState(true);
        saveMantleEntries(ADMIN_BROADCASTS_URL, source).then(function () {
            return fetchMantleEntries(ADMIN_BROADCASTS_URL);
        }).then(function (entries) {
            cachedBroadcasts = Array.isArray(entries) ? entries : [];
            renderBroadcastList();
            showNote("success", "admin.broadcastUpdated", "Broadcast updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-broadcast-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    eventList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-event-id][data-admin-event-action]");
        if (!button || busy || !isAdminUser()) {
            return;
        }
        var eventId = String(button.getAttribute("data-admin-event-id") || "").trim();
        var action = String(button.getAttribute("data-admin-event-action") || "").trim();
        if (!eventId || (action !== "edit" && action !== "delete")) {
            return;
        }
        var source = cachedEvents.slice(0, MAX_ENTRIES);
        var targetIndex = source.findIndex(function (entry) {
            return String(entry && entry.id || "").trim() === eventId;
        });
        if (targetIndex < 0) {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            return;
        }
        if (action === "delete") {
            var eventConfirmed = window.confirm(T("admin.eventDeleteConfirm", "Delete this event?"));
            if (!eventConfirmed) {
                return;
            }
            source.splice(targetIndex, 1);
            setBusyState(true);
            saveMantleEntries(ADMIN_EVENTS_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_EVENTS_URL);
            }).then(function (entries) {
                cachedEvents = Array.isArray(entries) ? entries : [];
                renderStats();
                renderEventList();
                showNote("success", "admin.eventDeleted", "Event deleted.");
                document.dispatchEvent(new CustomEvent("njc:admin-events-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
            return;
        }
        var current = source[targetIndex] || {};
        var nextTitle = window.prompt(T("admin.eventEditPromptTitle", "Edit event title"), String(current.title || ""));
        if (nextTitle === null) {
            return;
        }
        var nextDate = window.prompt(T("admin.eventEditPromptDate", "Edit date (YYYY-MM-DD)"), String(current.date || ""));
        if (nextDate === null) {
            return;
        }
        var nextTime = window.prompt(T("admin.eventEditPromptTime", "Edit time (HH:MM)"), String(current.time || "19:00"));
        if (nextTime === null) {
            return;
        }
        var nextType = window.prompt(T("admin.eventEditPromptType", "Edit type (Special/Recurring)"), String(current.type || "Special"));
        if (nextType === null) {
            return;
        }
        var nextDescription = window.prompt(T("admin.eventEditPromptDescription", "Edit description"), String(current.description || ""));
        if (nextDescription === null) {
            return;
        }
        var cleanTitle = String(nextTitle || "").trim();
        var cleanDate = String(nextDate || "").trim();
        if (!cleanTitle || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            showNote("validation", "admin.eventNeedFields", "Please enter event title and date.");
            return;
        }
        var cleanType = String(nextType || "").trim().toLowerCase() === "recurring" ? "Recurring" : "Special";
        source[targetIndex] = Object.assign({}, current, {
            title: cleanTitle,
            date: cleanDate,
            time: String(nextTime || "19:00").trim() || "19:00",
            type: cleanType,
            description: String(nextDescription || "").trim(),
            updatedAt: new Date().toISOString()
        });
        setBusyState(true);
        saveMantleEntries(ADMIN_EVENTS_URL, source).then(function () {
            return fetchMantleEntries(ADMIN_EVENTS_URL);
        }).then(function (entries) {
            cachedEvents = Array.isArray(entries) ? entries : [];
            renderStats();
            renderEventList();
            showNote("success", "admin.eventUpdated", "Event updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-events-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    sermonList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-sermon-id][data-admin-sermon-action]");
        if (!button || busy || !isAdminUser()) {
            return;
        }
        var sermonId = String(button.getAttribute("data-admin-sermon-id") || "").trim();
        var action = String(button.getAttribute("data-admin-sermon-action") || "").trim();
        if (!sermonId || (action !== "edit" && action !== "delete")) {
            return;
        }
        var source = cachedSermons.slice(0, MAX_ENTRIES);
        var targetIndex = source.findIndex(function (entry) {
            return String(entry && entry.id || "").trim() === sermonId;
        });
        if (targetIndex < 0) {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            return;
        }
        if (action === "delete") {
            var sermonConfirmed = window.confirm(T("admin.sermonDeleteConfirm", "Delete this sermon?"));
            if (!sermonConfirmed) {
                return;
            }
            source.splice(targetIndex, 1);
            setBusyState(true);
            saveMantleEntries(ADMIN_SERMONS_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_SERMONS_URL);
            }).then(function (entries) {
                cachedSermons = Array.isArray(entries) ? entries : [];
                renderStats();
                renderSermonList();
                showNote("success", "admin.sermonDeleted", "Sermon deleted.");
                document.dispatchEvent(new CustomEvent("njc:admin-sermons-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
            return;
        }
        var current = source[targetIndex] || {};
        var nextTitle = window.prompt(T("admin.sermonEditPromptTitle", "Edit Tamil title"), String(current.title || ""));
        if (nextTitle === null) {
            return;
        }
        var nextSubtitle = window.prompt(T("admin.sermonEditPromptSubtitle", "Edit English subtitle"), String(current.subtitle || ""));
        if (nextSubtitle === null) {
            return;
        }
        var nextSpeaker = window.prompt(T("admin.sermonEditPromptSpeaker", "Edit speaker"), String(current.speaker || ""));
        if (nextSpeaker === null) {
            return;
        }
        var nextDate = window.prompt(T("admin.sermonEditPromptDate", "Edit date (YYYY-MM-DD)"), String(current.date || ""));
        if (nextDate === null) {
            return;
        }
        var nextAudio = window.prompt(T("admin.sermonEditPromptAudio", "Edit audio URL"), String(current.audioUrl || ""));
        if (nextAudio === null) {
            return;
        }
        var cleanTitle = String(nextTitle || "").trim();
        var cleanDate = String(nextDate || "").trim();
        var cleanAudio = String(nextAudio || "").trim();
        if (!cleanTitle || !cleanDate || !cleanAudio) {
            showNote("validation", "admin.sermonNeedFields", "Please enter sermon title, date and audio URL.");
            return;
        }
        source[targetIndex] = Object.assign({}, current, {
            title: cleanTitle,
            subtitle: String(nextSubtitle || "").trim(),
            speaker: String(nextSpeaker || "").trim(),
            date: cleanDate,
            audioUrl: cleanAudio,
            updatedAt: new Date().toISOString()
        });
        setBusyState(true);
        saveMantleEntries(ADMIN_SERMONS_URL, source).then(function () {
            return fetchMantleEntries(ADMIN_SERMONS_URL);
        }).then(function (entries) {
            cachedSermons = Array.isArray(entries) ? entries : [];
            renderStats();
            renderSermonList();
            showNote("success", "admin.sermonUpdated", "Sermon updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-sermons-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load admin dashboard data.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    if (triviaList) {
        triviaList.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-admin-trivia-id][data-admin-trivia-action]");
            if (!button || busy || !isAdminUser()) {
                return;
            }
            var triviaId = String(button.getAttribute("data-admin-trivia-id") || "").trim();
            var action = String(button.getAttribute("data-admin-trivia-action") || "").trim();
            if (!triviaId || (action !== "edit" && action !== "delete")) {
                return;
            }
            var source = cachedTrivia.slice(0, MAX_ENTRIES);
            var targetIndex = source.findIndex(function (entry) {
                return String(entry && entry.id || "").trim() === triviaId;
            });
            if (targetIndex < 0) {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
                return;
            }
            if (action === "delete") {
                var confirmed = window.confirm(T("admin.triviaDeleteConfirm", "Delete this trivia?"));
                if (!confirmed) {
                    return;
                }
                source.splice(targetIndex, 1);
                setBusyState(true);
                saveMantleEntries(ADMIN_TRIVIA_URL, source).then(function () {
                    return fetchMantleEntries(ADMIN_TRIVIA_URL);
                }).then(function (entries) {
                    cachedTrivia = Array.isArray(entries) ? entries : [];
                    renderTriviaList();
                    showNote("success", "admin.triviaDeleted", "Trivia deleted.");
                    document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
                }).catch(function () {
                    showNote("error", "admin.syncError", "Could not load admin dashboard data.");
                }).finally(function () {
                    setBusyState(false);
                });
                return;
            }
            var current = source[targetIndex] || {};
            var options = Array.isArray(current.options) ? current.options : [];
            var nextQuestion = window.prompt(T("admin.triviaEditPromptQuestion", "Edit question (Tamil)"), String(current.question || ""));
            if (nextQuestion === null) {
                return;
            }
            var nextOptions = window.prompt(T("admin.triviaEditPromptOptions", "Edit options (one per line)"), options.join("\n"));
            if (nextOptions === null) {
                return;
            }
            var nextCorrect = window.prompt(T("admin.triviaEditPromptCorrect", "Correct option index (0-based)"), String(current.correctIndex || 0));
            if (nextCorrect === null) {
                return;
            }
            var nextReference = window.prompt(T("admin.triviaEditPromptReference", "Bible reference (optional)"), String(current.reference || ""));
            if (nextReference === null) {
                return;
            }
            var nextShowDate = window.prompt(T("admin.triviaEditPromptShowDate", "Show date (YYYY-MM-DD)"), String(current.showDate || ""));
            if (nextShowDate === null) {
                return;
            }
            var cleanOptions = String(nextOptions || "").split(/\n/).map(function (line) { return String(line || "").trim(); }).filter(Boolean);
            var cleanCorrectIndex = Math.max(0, Math.min(cleanOptions.length - 1, Number(nextCorrect) || 0));
            if (!String(nextQuestion || "").trim() || !cleanOptions.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(nextShowDate || "").trim())) {
                showNote("validation", "admin.triviaNeedFields", "Please enter question, options, and valid show date.");
                return;
            }
            source[targetIndex] = Object.assign({}, current, {
                question: String(nextQuestion || "").trim(),
                options: cleanOptions,
                correctIndex: cleanCorrectIndex,
                reference: String(nextReference || "").trim(),
                showDate: String(nextShowDate || "").trim(),
                updatedAt: new Date().toISOString()
            });
            setBusyState(true);
            saveMantleEntries(ADMIN_TRIVIA_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_TRIVIA_URL);
            }).then(function (entries) {
                cachedTrivia = Array.isArray(entries) ? entries : [];
                renderTriviaList();
                showNote("success", "admin.triviaUpdated", "Trivia updated.");
                document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
        });
    }

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
        if (!note.hidden) {
            var state = note.dataset.state || "";
            if (state === "success") {
                showNote("success", "admin.saved", "Saved.");
            } else if (state === "validation") {
                showNote("validation", "admin.validation", "Please fill required fields.");
            } else if (state === "error") {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }
        }
        if (isAdminRoute()) {
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderTriviaList();
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
