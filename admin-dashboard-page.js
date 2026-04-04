(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var ADMIN_NOTICES_URL = "https://mantledb.sh/v2/njc-belgium-admin-notices/entries";
    var ADMIN_BROADCASTS_URL = "https://mantledb.sh/v2/njc-belgium-admin-broadcasts/entries";
    var ADMIN_EVENTS_URL = "https://mantledb.sh/v2/njc-belgium-admin-events/entries";
    var ADMIN_SERMONS_URL = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";
    var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
    var TRIVIA_URL = "https://mantledb.sh/v2/njc-belgium-admin-trivia/entries";
    var ADMIN_DAILY_BREAD_URL = "https://mantledb.sh/v2/njc-belgium-admin-daily-bread/entries";
    var ADMIN_LIBRARY_URL = "https://mantledb.sh/v2/njc-belgium-admin-library/entries";
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
    var prayerList = document.getElementById("admin-prayer-list");
    var triviaList = document.getElementById("admin-trivia-list");
    var triviaForm = document.getElementById("admin-trivia-form");
    var dailyBreadForm = document.getElementById("admin-daily-bread-form");
    var dailyBreadDateInput = document.getElementById("admin-daily-bread-date");
    var dailyBreadTitleInput = document.getElementById("admin-daily-bread-title");
    var dailyBreadTitleTaInput = document.getElementById("admin-daily-bread-title-ta");
    var dailyBreadAuthorInput = document.getElementById("admin-daily-bread-author");
    var dailyBreadAuthorTaInput = document.getElementById("admin-daily-bread-author-ta");
    var dailyBreadBodyInput = document.getElementById("admin-daily-bread-body");
    var dailyBreadBodyTaInput = document.getElementById("admin-daily-bread-body-ta");
    var dailyBreadSubmit = document.getElementById("admin-daily-bread-submit");
    var dailyBreadList = document.getElementById("admin-daily-bread-list");
    var bookShelfForm = document.getElementById("admin-book-shelf-form");
    var bookShelfShelfEn = document.getElementById("admin-book-shelf-shelf-en");
    var bookShelfShelfTa = document.getElementById("admin-book-shelf-shelf-ta");
    var bookShelfTitleInput = document.getElementById("admin-book-shelf-title");
    var bookShelfTitleTaInput = document.getElementById("admin-book-shelf-title-ta");
    var bookShelfAuthorInput = document.getElementById("admin-book-shelf-author");
    var bookShelfAuthorTaInput = document.getElementById("admin-book-shelf-author-ta");
    var bookShelfUrlInput = document.getElementById("admin-book-shelf-url");
    var bookShelfCoverInput = document.getElementById("admin-book-shelf-cover");
    var bookShelfFormatInput = document.getElementById("admin-book-shelf-format");
    var bookShelfCategoryInput = document.getElementById("admin-book-shelf-category");
    var bookShelfCategoryTaInput = document.getElementById("admin-book-shelf-category-ta");
    var bookShelfDescriptionInput = document.getElementById("admin-book-shelf-description");
    var bookShelfDescriptionTaInput = document.getElementById("admin-book-shelf-description-ta");
    var bookShelfFileSizeInput = document.getElementById("admin-book-shelf-file-size");
    var bookShelfDetectSizeBtn = document.getElementById("admin-book-shelf-detect-size");
    var bookShelfSubmit = document.getElementById("admin-book-shelf-submit");
    var bookShelfList = document.getElementById("admin-book-shelf-list");

    var noticeForm = document.getElementById("admin-notice-form");
    var noticeTitleInput = document.getElementById("admin-notice-title");
    var noticeTitleTaInput = document.getElementById("admin-notice-title-ta");
    var noticeBodyInput = document.getElementById("admin-notice-body");
    var noticeBodyTaInput = document.getElementById("admin-notice-body-ta");
    var noticeLinkInput = document.getElementById("admin-notice-link");
    var noticeImageUrlInput = document.getElementById("admin-notice-image-url");
    var noticeUrgentInput = document.getElementById("admin-notice-urgent");
    var noticeImportantInput = document.getElementById("admin-notice-important");
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
    var sermonNote = document.getElementById("admin-sermon-note");
    var sermonTitleInput = document.getElementById("admin-sermon-title");
    var sermonSubtitleInput = document.getElementById("admin-sermon-subtitle");
    var sermonSpeakerInput = document.getElementById("admin-sermon-speaker");
    var sermonDateInput = document.getElementById("admin-sermon-date");
    var sermonAudioInput = document.getElementById("admin-sermon-audio");
    var sermonSubmit = document.getElementById("admin-sermon-submit");

    var triviaQuestionInput = document.getElementById("admin-trivia-question");
    var triviaOption1Input = document.getElementById("admin-trivia-option1");
    var triviaOption2Input = document.getElementById("admin-trivia-option2");
    var triviaOption3Input = document.getElementById("admin-trivia-option3");
    var triviaOption4Input = document.getElementById("admin-trivia-option4");
    var triviaCorrectInput = document.getElementById("admin-trivia-correct");
    var triviaReferenceInput = document.getElementById("admin-trivia-reference");
    var triviaDateInput = document.getElementById("admin-trivia-show-date")
        || document.getElementById("admin-trivia-date");
    var triviaSubmit = document.getElementById("admin-trivia-submit");
    var triviaNote = document.getElementById("admin-trivia-note");

    var cachedNotices = [];
    var cachedBroadcasts = [];
    var cachedEvents = [];
    var cachedSermons = [];
    var cachedPrayers = [];
    var cachedTrivia = [];
    var cachedDailyBread = [];
    var cachedBookShelf = [];
    var busy = false;

    if (!refreshButton || !note || !noticeList || !broadcastList || !eventList || !sermonList || !prayerList || !dailyBreadList || !bookShelfList || !noticeForm || !broadcastForm || !eventForm || !sermonForm || !dailyBreadForm || !bookShelfForm) {
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
        if (dailyBreadSubmit) {
            dailyBreadSubmit.disabled = busy;
        }
        if (bookShelfSubmit) {
            bookShelfSubmit.disabled = busy;
        }
        if (bookShelfDetectSizeBtn) {
            bookShelfDetectSizeBtn.disabled = busy;
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
        prayerList.querySelectorAll("button[data-admin-prayer-id]").forEach(function (button) {
            button.disabled = busy;
        });
        if (triviaList) {
            triviaList.querySelectorAll("button[data-admin-trivia-id]").forEach(function (button) {
                button.disabled = busy;
            });
        }
        if (dailyBreadList) {
            dailyBreadList.querySelectorAll("button[data-admin-daily-bread-id]").forEach(function (button) {
                button.disabled = busy;
            });
        }
        if (bookShelfList) {
            bookShelfList.querySelectorAll("button[data-admin-book-shelf-id]").forEach(function (button) {
                button.disabled = busy;
            });
        }
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

    function normalizeLibraryEntry(entry, index) {
        var source = entry && typeof entry === "object" ? entry : {};
        var url = String(source.url || source.fileUrl || source.href || "").trim();
        return {
            id: String(source.id || "").trim() || ("library-" + index),
            title: String(source.title || "").trim(),
            titleTa: String(source.titleTa || "").trim(),
            author: String(source.author || "").trim(),
            authorTa: String(source.authorTa || "").trim(),
            description: String(source.description || "").trim(),
            descriptionTa: String(source.descriptionTa || "").trim(),
            category: String(source.category || "").trim(),
            categoryTa: String(source.categoryTa || "").trim(),
            url: url,
            coverImageUrl: String(source.coverImageUrl || source.coverUrl || source.imageUrl || "").trim(),
            format: String(source.format || "").trim().toLowerCase(),
            sortOrder: Number(source.sortOrder) || 0,
            createdAt: String(source.createdAt || ""),
            updatedAt: String(source.updatedAt || "")
        };
    }

    function normalizeDailyBreadEntry(entry, index) {
        var source = entry && typeof entry === "object" ? entry : {};
        var dateKey = toYmd(source.date || source.showDate || "");
        return {
            id: String(source.id || "").trim() || ("daily-bread-" + index),
            date: dateKey,
            title: String(source.title || "").trim(),
            titleTa: String(source.titleTa || "").trim(),
            author: String(source.author || "").trim(),
            authorTa: String(source.authorTa || "").trim(),
            body: String(source.body || "").trim(),
            bodyTa: String(source.bodyTa || "").trim(),
            createdAt: String(source.createdAt || ""),
            updatedAt: String(source.updatedAt || ""),
            createdByEmail: String(source.createdByEmail || "").trim()
        };
    }

    function parseBookFileSizeBytes(raw) {
        var t = String(raw || "").trim().replace(/,/g, "");
        if (!t) {
            return null;
        }
        var numMatch = t.match(/^(\d+(?:\.\d+)?)/);
        if (!numMatch) {
            return NaN;
        }
        var n = parseFloat(numMatch[1]);
        if (!isFinite(n) || n < 0) {
            return NaN;
        }
        var rest = t.slice(numMatch[0].length).replace(/\s+/g, "").toLowerCase();
        if (!rest || rest === "b" || rest === "bytes") {
            return Math.round(n);
        }
        if (rest === "kb" || rest === "k") {
            return Math.round(n * 1024);
        }
        if (rest === "mb" || rest === "m") {
            return Math.round(n * 1048576);
        }
        if (rest === "gb" || rest === "g") {
            return Math.round(n * 1073741824);
        }
        if (rest === "") {
            return Math.round(n);
        }
        return NaN;
    }

    function formatBookFileSizeBytes(bytes) {
        var b = Number(bytes);
        if (!isFinite(b) || b <= 0) {
            return "";
        }
        if (b < 1024) {
            return String(Math.round(b)) + " B";
        }
        if (b < 1048576) {
            var kb = b / 1024;
            return (kb >= 100 ? kb.toFixed(0) : kb.toFixed(1)) + " KB";
        }
        var mb = b / 1048576;
        return (mb >= 100 ? mb.toFixed(1) : mb.toFixed(2)) + " MB";
    }

    /**
     * Try to learn file size via HEAD or ranged GET. Only works when the file host sends
     * CORS headers that expose Content-Length / Content-Range; many CDNs and storage buckets do not.
     */
    function probeRemoteFileSizeBytes(url) {
        var u = String(url || "").trim();
        if (!/^https:\/\//i.test(u)) {
            return Promise.resolve(null);
        }
        var ctrl = new AbortController();
        var tid = window.setTimeout(function () {
            try {
                ctrl.abort();
            } catch (eAbort) {}
        }, 15000);
        function clearTimer() {
            try {
                window.clearTimeout(tid);
            } catch (eClear) {}
        }
        function parseContentLength(res) {
            var cl = res.headers.get("Content-Length");
            if (cl == null) {
                return null;
            }
            var n = parseInt(String(cl).trim(), 10);
            if (!isFinite(n) || n <= 0) {
                return null;
            }
            return Math.min(n, 2147483647);
        }
        function parseContentRangeTotal(res) {
            if (res.status !== 206) {
                return null;
            }
            var cr = res.headers.get("Content-Range");
            if (!cr) {
                return null;
            }
            var m = String(cr).match(/\/(\d+)\s*$/);
            if (!m) {
                return null;
            }
            var n = parseInt(m[1], 10);
            if (!isFinite(n) || n <= 0) {
                return null;
            }
            return Math.min(n, 2147483647);
        }
        function tryRangeGet() {
            return fetch(u, {
                method: "GET",
                mode: "cors",
                cache: "no-store",
                signal: ctrl.signal,
                headers: { Range: "bytes=0-0" }
            }).then(function (r2) {
                var fromRange = parseContentRangeTotal(r2);
                if (fromRange) {
                    if (r2.body && typeof r2.body.cancel === "function") {
                        try {
                            r2.body.cancel();
                        } catch (eCan) {}
                    }
                    return fromRange;
                }
                if (r2.ok && r2.status === 200) {
                    var cl = parseContentLength(r2);
                    if (r2.body && typeof r2.body.cancel === "function") {
                        try {
                            r2.body.cancel();
                        } catch (eCan2) {}
                    }
                    return cl;
                }
                if (r2.body && typeof r2.body.cancel === "function") {
                    try {
                        r2.body.cancel();
                    } catch (eCan3) {}
                }
                return null;
            });
        }
        return fetch(u, { method: "HEAD", mode: "cors", cache: "no-store", signal: ctrl.signal })
            .then(function (res) {
                if (res.ok) {
                    var fromHead = parseContentLength(res);
                    if (fromHead) {
                        return fromHead;
                    }
                }
                return tryRangeGet();
            })
            .catch(function () {
                return tryRangeGet();
            })
            .then(function (result) {
                clearTimer();
                return result;
            })
            .catch(function () {
                clearTimer();
                return null;
            });
    }

    function normalizeBookShelfEntry(entry, index) {
        var source = entry && typeof entry === "object" ? entry : {};
        var url = String(source.url || source.fileUrl || source.href || "").trim();
        var shelfRaw = String(source.shelf || "").trim().toLowerCase();
        var shelf = shelfRaw === "ta" ? "ta" : "en";
        var sizeRaw = source.fileSizeBytes != null ? source.fileSizeBytes : source.fileSize;
        var fileSizeBytes = Number(sizeRaw);
        if (!isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
            fileSizeBytes = 0;
        } else {
            fileSizeBytes = Math.min(Math.floor(fileSizeBytes), 2147483647);
        }
        return {
            id: String(source.id || "").trim() || ("book-shelf-" + index),
            title: String(source.title || "").trim(),
            titleTa: String(source.titleTa || "").trim(),
            author: String(source.author || "").trim(),
            authorTa: String(source.authorTa || "").trim(),
            description: String(source.description || "").trim(),
            descriptionTa: String(source.descriptionTa || "").trim(),
            category: String(source.category || "").trim(),
            categoryTa: String(source.categoryTa || "").trim(),
            url: url,
            coverImageUrl: String(source.coverImageUrl || source.coverUrl || source.imageUrl || "").trim(),
            format: String(source.format || "").trim().toLowerCase(),
            shelf: shelf,
            fileSizeBytes: fileSizeBytes,
            sortOrder: Number(source.sortOrder) || 0,
            createdAt: String(source.createdAt || ""),
            updatedAt: String(source.updatedAt || "")
        };
    }

    function renderBookShelfList() {
        if (!bookShelfList) {
            return;
        }
        var valid = cachedBookShelf.filter(function (e) {
            return e && /^https:\/\//i.test(String(e.url || "").trim());
        });
        if (!valid.length) {
            bookShelfList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.bookShelfEmptyTitle", "No items yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.bookShelfEmptyBody", "Add a title and file URL above.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = valid.slice().sort(function (a, b) {
            var ao = Number(a.sortOrder) || 0;
            var bo = Number(b.sortOrder) || 0;
            if (ao !== bo) {
                return ao - bo;
            }
            var at = String(a.updatedAt || a.createdAt || "");
            var bt = String(b.updatedAt || b.createdAt || "");
            return bt.localeCompare(at);
        }).slice(0, 120);
        bookShelfList.innerHTML = sorted.map(function (entry) {
            var id = String(entry.id || "").trim();
            var titleLine = entry.title || entry.titleTa || "—";
            var shelfLabel = entry.shelf === "ta"
                ? T("admin.bookShelfBadgeTamil", "Tamil tab")
                : T("admin.bookShelfBadgeEnglish", "English tab");
            var urlShort = String(entry.url || "").replace(/^https:\/\//, "").slice(0, 72);
            var sizeLine = entry.fileSizeBytes > 0
                ? ("<p class=\"page-note\">" + escapeHtml(T("admin.bookShelfListFileSize", "File size")) + ": " + escapeHtml(formatBookFileSizeBytes(entry.fileSizeBytes)) + "</p>")
                : "";
            var cover = String(entry.coverImageUrl || "").trim();
            var thumb = /^https:\/\//i.test(cover)
                ? ("<p class=\"page-note admin-library-thumb-wrap\"><img class=\"admin-library-thumb\" src=\"" + escapeHtml(cover) + "\" alt=\"\" width=\"72\" height=\"108\" loading=\"lazy\" decoding=\"async\"></p>")
                : "";
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(titleLine) + "</h3>" +
                "  <p class=\"page-note\"><span class=\"admin-book-shelf-badge\">" + escapeHtml(shelfLabel) + "</span></p>" +
                thumb +
                sizeLine +
                "  <p class=\"page-note\"><a class=\"inline-link\" href=\"" + escapeHtml(entry.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + escapeHtml(urlShort + (String(entry.url || "").length > 72 ? "…" : "")) + "</a></p>" +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-book-shelf-id=\"" + escapeHtml(id) + "\" data-admin-book-shelf-action=\"edit\">" + escapeHtml(T("admin.eventEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-book-shelf-id=\"" + escapeHtml(id) + "\" data-admin-book-shelf-action=\"delete\">" + escapeHtml(T("admin.eventDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        bookShelfList.querySelectorAll("button[data-admin-book-shelf-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderDailyBreadList() {
        if (!dailyBreadList) {
            return;
        }
        var valid = cachedDailyBread.filter(function (e) {
            return e && /^\d{4}-\d{2}-\d{2}$/.test(e.date);
        });
        if (!valid.length) {
            dailyBreadList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.dailyBreadEmptyTitle", "No entries yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.dailyBreadEmptyBody", "Add one using the form above.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = valid.slice().sort(function (a, b) {
            return String(b.date).localeCompare(String(a.date));
        }).slice(0, 120);
        dailyBreadList.innerHTML = sorted.map(function (entry) {
            var id = String(entry.id || "").trim();
            var titleLine = entry.title || entry.titleTa || "—";
            var authorLine = entry.author || entry.authorTa || "";
            var preview = (entry.body || entry.bodyTa || "").replace(/\s+/g, " ").trim().slice(0, 120);
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(entry.date) + "</h3>" +
                "  <p class=\"page-note\"><strong>" + escapeHtml(titleLine) + "</strong>" +
                (authorLine ? (" · <em>" + escapeHtml(authorLine) + "</em>") : "") +
                "</p>" +
                (preview ? ("  <p class=\"admin-item-body\">" + escapeHtml(preview) + (preview.length >= 120 ? "…" : "") + "</p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-daily-bread-id=\"" + escapeHtml(id) + "\" data-admin-daily-bread-action=\"edit\">" + escapeHtml(T("admin.eventEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-daily-bread-id=\"" + escapeHtml(id) + "\" data-admin-daily-bread-action=\"delete\">" + escapeHtml(T("admin.eventDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        dailyBreadList.querySelectorAll("button[data-admin-daily-bread-id]").forEach(function (button) {
            button.disabled = busy;
        });
    }

    function renderLibraryList() {
        if (!libraryList) {
            return;
        }
        var valid = cachedLibrary.filter(function (e) {
            return e && /^https?:\/\//i.test(String(e.url || "").trim());
        });
        if (!valid.length) {
            libraryList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.libraryEmptyTitle", "No items yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.libraryEmptyBody", "Add a title and file URL above.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = valid.slice().sort(function (a, b) {
            var ao = Number(a.sortOrder) || 0;
            var bo = Number(b.sortOrder) || 0;
            if (ao !== bo) {
                return ao - bo;
            }
            var at = String(a.updatedAt || a.createdAt || "");
            var bt = String(b.updatedAt || b.createdAt || "");
            return bt.localeCompare(at);
        }).slice(0, 120);
        libraryList.innerHTML = sorted.map(function (entry) {
            var id = String(entry.id || "").trim();
            var titleLine = entry.title || entry.titleTa || "—";
            var urlShort = String(entry.url || "").replace(/^https?:\/\//, "").slice(0, 72);
            var cover = String(entry.coverImageUrl || "").trim();
            var thumb = /^https:\/\//i.test(cover)
                ? ("<p class=\"page-note admin-library-thumb-wrap\"><img class=\"admin-library-thumb\" src=\"" + escapeHtml(cover) + "\" alt=\"\" width=\"72\" height=\"108\" loading=\"lazy\" decoding=\"async\"></p>")
                : "";
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(titleLine) + "</h3>" +
                thumb +
                "  <p class=\"page-note\"><a class=\"inline-link\" href=\"" + escapeHtml(entry.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + escapeHtml(urlShort + (String(entry.url || "").length > 72 ? "…" : "")) + "</a></p>" +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-library-id=\"" + escapeHtml(id) + "\" data-admin-library-action=\"edit\">" + escapeHtml(T("admin.eventEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-library-id=\"" + escapeHtml(id) + "\" data-admin-library-action=\"delete\">" + escapeHtml(T("admin.eventDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        libraryList.querySelectorAll("button[data-admin-library-id]").forEach(function (button) {
            button.disabled = busy;
        });
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
                    if (Array.isArray(payload)) return payload;
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

    function renderTriviaList() {
        if (!triviaList) {
            return;
        }
        if (!cachedTrivia.length) {
            triviaList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.triviaEmptyTitle", "No Bible Quiz yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.triviaEmptyBody", "Add Tamil Bible Quiz questions. They will appear on the home page by scheduled date.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedTrivia.slice().sort(function (a, b) {
            var aDate = String((a && a.date) || "");
            var bDate = String((b && b.date) || "");
            var cmp = bDate.localeCompare(aDate);
            if (cmp !== 0) {
                return cmp;
            }
            var aTime = String((a && (a.updatedAt || a.createdAt)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 50);
        triviaList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var questionTa = String(entry && entry.questionTa || "").trim();
            var options = Array.isArray(entry && entry.options) ? entry.options : [];
            var correctIndex = Number(entry && entry.correctIndex) || 0;
            var answerTa = String(entry && entry.answerTa || "").trim();
            var reference = String(entry && entry.reference || "").trim();
            var date = String(entry && entry.date || "").trim();
            var preview = options.length >= 4
                ? options.map(function (o, i) { return (i === correctIndex ? "✓ " : "") + String(o || "").slice(0, 25); }).join(" | ")
                : (answerTa ? answerTa.slice(0, 80) + (answerTa.length > 80 ? "…" : "") : "");
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(questionTa || T("admin.triviaTitle", "Bible Quiz (Tamil)")) + "</h3>" +
                "  <p class=\"page-note\">" + escapeHtml(date || "-") + (reference ? (" • " + escapeHtml(reference)) : "") + "</p>" +
                (preview ? ("  <p class=\"admin-item-body\">" + escapeHtml(preview) + "</p>") : "") +
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
            var imageUrl = String(entry && entry.imageUrl || "").trim();
            var urgent = Boolean(entry && entry.urgent);
            var important = Boolean(entry && entry.important);
            var tagParts = [];
            if (important) {
                tagParts.push("<span class=\"admin-notice-important-badge\">" + escapeHtml(T("admin.noticeImportantTag", "Important")) + "</span>");
            }
            if (urgent) {
                tagParts.push("<span class=\"prayer-list-urgent-badge\">" + escapeHtml(T("admin.noticeUrgentTag", "Urgent")) + "</span>");
            }
            if (imageUrl) {
                tagParts.push("<span class=\"prayer-list-urgent-badge\">" + escapeHtml(T("admin.noticeImageTag", "Image")) + "</span>");
            }
            var tagText = tagParts.length ? (" " + tagParts.join(" ")) : "";
            var imageThumb = imageUrl ? ("  <p class=\"page-note\"><img src=\"" + escapeHtml(imageUrl) + "\" alt=\"\" style=\"max-width:120px;max-height:60px;border-radius:6px;margin-top:4px;\" loading=\"lazy\" /></p>") : "";
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(title || (imageUrl ? T("admin.noticeImageOnly", "Image Banner") : T("admin.noticeTitle", "Send Notice"))) + tagText + "</h3>" +
                "  <p class=\"admin-item-body\">" + escapeHtml(body || (imageUrl ? "" : "-")) + "</p>" +
                (titleTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(titleTa) + "</p>") : "") +
                (bodyTa ? ("  <p class=\"page-note\"><strong>TA:</strong> " + escapeHtml(bodyTa) + "</p>") : "") +
                imageThumb +
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
        prayerList.innerHTML = "" +
            "<li>" +
            "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
            "</li>";
        if (triviaList) {
            triviaList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
                "</li>";
        }
        if (dailyBreadList) {
            dailyBreadList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
                "</li>";
        }
        if (bookShelfList) {
            bookShelfList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.accessDenied", "This dashboard is admin only.")) + "</h3>" +
                "</li>";
        }
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
        if (dailyBreadForm) {
            dailyBreadForm.querySelectorAll("input,textarea,button").forEach(function (node) {
                node.disabled = !active;
            });
        }
        if (bookShelfForm) {
            bookShelfForm.querySelectorAll("input,textarea,button").forEach(function (node) {
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
        if (!force && (cachedPrayers.length + cachedNotices.length + cachedBroadcasts.length + cachedEvents.length + cachedSermons.length + cachedTrivia.length + cachedDailyBread.length + cachedBookShelf.length > 0)) {
            renderStats();
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderPrayerList();
            renderTriviaList();
            renderDailyBreadList();
            renderBookShelfList();
            return;
        }
        setBusyState(true);
        clearNote();
        Promise.allSettled([
            fetchMantleEntries(ADMIN_NOTICES_URL),
            fetchMantleEntries(ADMIN_BROADCASTS_URL),
            fetchMantleEntries(ADMIN_EVENTS_URL),
            fetchMantleEntries(ADMIN_SERMONS_URL),
            fetchMantleEntries(PRAYER_WALL_URL),
            fetchMantleEntries(TRIVIA_URL),
            fetchMantleEntries(ADMIN_DAILY_BREAD_URL),
            fetchMantleEntries(ADMIN_LIBRARY_URL)
        ]).then(function (results) {
            function extract(idx) {
                var r = results[idx];
                if (!r) return [];
                if (r.status === "fulfilled" && Array.isArray(r.value)) return r.value;
                return [];
            }
            cachedNotices = extract(0);
            cachedBroadcasts = extract(1);
            cachedEvents = extract(2);
            cachedSermons = extract(3);
            cachedPrayers = extract(4).map(normalizePrayerEntry).filter(function (item) {
                return Boolean(item && item.id);
            });
            cachedTrivia = extract(5);
            cachedDailyBread = extract(6).map(function (row, idx) {
                return normalizeDailyBreadEntry(row, idx);
            }).filter(function (item) {
                return Boolean(item && item.date);
            });
            cachedBookShelf = extract(7).map(function (row, idx) {
                return normalizeBookShelfEntry(row, idx);
            });
            renderStats();
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderPrayerList();
            renderTriviaList();
            renderDailyBreadList();
            renderBookShelfList();
            var failed = results.filter(function (r) { return r.status === "rejected"; }).length;
            if (failed > 0) {
                showNote("error", "admin.syncError", "Some data could not load. Tap Refresh.");
            }
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not load. Tap Refresh.");
            renderNoticeList();
            renderBroadcastList();
            renderEventList();
            renderSermonList();
            renderPrayerList();
            renderTriviaList();
            renderDailyBreadList();
            renderBookShelfList();
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
        var imageUrl = String(noticeImageUrlInput && noticeImageUrlInput.value || "").trim();
        if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
            showNote("validation", "admin.noticeNeedImageUrl", "Banner image must be an https:// URL or leave empty.");
            return;
        }
        if (!title && !body && !imageUrl) {
            showNote("validation", "admin.noticeNeedFields", "Please enter notice title and message, or provide a banner image URL.");
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
            imageUrl: imageUrl,
            urgent: Boolean(noticeUrgentInput.checked),
            important: Boolean(noticeImportantInput && noticeImportantInput.checked),
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
            if (noticeImageUrlInput) {
                noticeImageUrlInput.value = "";
            }
            noticeUrgentInput.checked = false;
            if (noticeImportantInput) {
                noticeImportantInput.checked = false;
            }
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
        if (sermonNote) {
            sermonNote.hidden = false;
            sermonNote.dataset.state = "";
        }
        if (!isAdminUser()) {
            if (sermonNote) sermonNote.textContent = T("admin.loginRequired", "Please sign in as admin.");
            return;
        }
        if (busy) return;
        var title = String(sermonTitleInput.value || "").trim();
        var subtitle = String(sermonSubtitleInput.value || "").trim();
        var speaker = String(sermonSpeakerInput.value || "").trim();
        var date = String(sermonDateInput.value || "").trim();
        var audioUrl = String(sermonAudioInput.value || "").trim();
        if (!title || !date || !audioUrl) {
            var msg = T("admin.sermonNeedFields", "Please enter sermon title, date and audio URL.");
            if (sermonNote) { sermonNote.textContent = msg; sermonNote.dataset.state = "error"; }
            else showNote("validation", "admin.sermonNeedFields", msg);
            return;
        }
        if (sermonNote) { sermonNote.textContent = T("admin.saving", "Saving..."); sermonNote.dataset.state = ""; }
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
            if (sermonNote) {
                sermonNote.textContent = T("admin.sermonSaved", "Sermon added.");
                sermonNote.dataset.state = "success";
            }
            showNote("success", "admin.sermonSaved", "Sermon added.");
            document.dispatchEvent(new CustomEvent("njc:admin-sermons-updated"));
        }).catch(function () {
            var msg = T("admin.syncError", "Could not save. Try again.");
            if (sermonNote) { sermonNote.textContent = msg; sermonNote.dataset.state = "error"; }
            showNote("error", "admin.syncError", msg);
        }).finally(function () {
            setBusyState(false);
        });
    });

    function upsertDailyBreadOnServer(entry) {
        return fetchMantleEntries(ADMIN_DAILY_BREAD_URL).then(function (raw) {
            var rows = Array.isArray(raw) ? raw : [];
            var list = rows.map(function (row, idx) {
                return normalizeDailyBreadEntry(row, idx);
            }).filter(function (e) {
                return Boolean(e && e.date);
            });
            var targetDate = String(entry && entry.date || "").trim();
            var existingIdx = list.findIndex(function (e) {
                return e.date === targetDate;
            });
            if (existingIdx >= 0) {
                var cur = list[existingIdx];
                list[existingIdx] = Object.assign({}, cur, {
                    title: String(entry.title || "").trim(),
                    titleTa: String(entry.titleTa || "").trim(),
                    author: String(entry.author || "").trim(),
                    authorTa: String(entry.authorTa || "").trim(),
                    body: String(entry.body || "").trim(),
                    bodyTa: String(entry.bodyTa || "").trim(),
                    updatedAt: new Date().toISOString()
                });
            } else {
                list.unshift({
                    id: String(entry.id || makeEntryId("daily-bread")),
                    date: targetDate,
                    title: String(entry.title || "").trim(),
                    titleTa: String(entry.titleTa || "").trim(),
                    author: String(entry.author || "").trim(),
                    authorTa: String(entry.authorTa || "").trim(),
                    body: String(entry.body || "").trim(),
                    bodyTa: String(entry.bodyTa || "").trim(),
                    createdAt: new Date().toISOString(),
                    createdByEmail: normalizeEmail(getUser() && getUser().email),
                    updatedAt: ""
                });
            }
            return saveMantleEntries(ADMIN_DAILY_BREAD_URL, list).then(function () {
                return fetchMantleEntries(ADMIN_DAILY_BREAD_URL);
            });
        });
    }

    dailyBreadForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var dateKey = toYmd(dailyBreadDateInput && dailyBreadDateInput.value);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
            showNote("validation", "admin.dailyBreadNeedDate", "Please pick a valid date.");
            return;
        }
        var titleEn = String(dailyBreadTitleInput && dailyBreadTitleInput.value || "").trim();
        var titleTa = String(dailyBreadTitleTaInput && dailyBreadTitleTaInput.value || "").trim();
        var authorEn = String(dailyBreadAuthorInput && dailyBreadAuthorInput.value || "").trim();
        var authorTa = String(dailyBreadAuthorTaInput && dailyBreadAuthorTaInput.value || "").trim();
        var bodyEn = String(dailyBreadBodyInput && dailyBreadBodyInput.value || "").trim();
        var bodyTa = String(dailyBreadBodyTaInput && dailyBreadBodyTaInput.value || "").trim();
        if (!bodyEn && !bodyTa) {
            showNote("validation", "admin.dailyBreadNeedBody", "Please enter body text (English or Tamil).");
            return;
        }
        setBusyState(true);
        upsertDailyBreadOnServer({
            id: makeEntryId("daily-bread"),
            date: dateKey,
            title: titleEn,
            titleTa: titleTa,
            author: authorEn,
            authorTa: authorTa,
            body: bodyEn,
            bodyTa: bodyTa
        }).then(function (entries) {
            var rows = Array.isArray(entries) ? entries : [];
            cachedDailyBread = rows.map(function (row, idx) {
                return normalizeDailyBreadEntry(row, idx);
            }).filter(function (e) {
                return Boolean(e && e.date);
            });
            dailyBreadDateInput.value = "";
            if (dailyBreadTitleInput) dailyBreadTitleInput.value = "";
            if (dailyBreadTitleTaInput) dailyBreadTitleTaInput.value = "";
            if (dailyBreadAuthorInput) dailyBreadAuthorInput.value = "";
            if (dailyBreadAuthorTaInput) dailyBreadAuthorTaInput.value = "";
            if (dailyBreadBodyInput) dailyBreadBodyInput.value = "";
            if (dailyBreadBodyTaInput) dailyBreadBodyTaInput.value = "";
            renderDailyBreadList();
            showNote("success", "admin.dailyBreadSaved", "Daily bread saved.");
            document.dispatchEvent(new CustomEvent("njc:admin-daily-bread-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not save. Check MantleDB bucket exists.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    if (bookShelfDetectSizeBtn && bookShelfUrlInput && bookShelfFileSizeInput) {
        bookShelfDetectSizeBtn.addEventListener("click", function () {
            if (busy || !isAdminUser()) {
                return;
            }
            var fileUrl = String(bookShelfUrlInput.value || "").trim();
            if (!/^https:\/\//i.test(fileUrl)) {
                showNote("validation", "admin.bookShelfNeedUrl", "Please enter a secure file URL (https://…) first.");
                return;
            }
            bookShelfDetectSizeBtn.disabled = true;
            var prevLabel = bookShelfDetectSizeBtn.textContent;
            bookShelfDetectSizeBtn.textContent = T("admin.bookShelfDetectSizeWorking", "Detecting…");
            probeRemoteFileSizeBytes(fileUrl).then(function (bytes) {
                bookShelfDetectSizeBtn.textContent = prevLabel;
                bookShelfDetectSizeBtn.disabled = busy;
                if (bytes && bytes > 0) {
                    bookShelfFileSizeInput.value = String(bytes);
                    showNote("success", "admin.bookShelfDetectSizeOk", "File size detected. Save the book when ready.");
                    return;
                }
                showNote("validation", "admin.bookShelfDetectSizeFail", "Could not detect size (server may block browsers). Enter it manually.");
            }).catch(function () {
                bookShelfDetectSizeBtn.textContent = prevLabel;
                bookShelfDetectSizeBtn.disabled = busy;
                showNote("validation", "admin.bookShelfDetectSizeFail", "Could not detect size (server may block browsers). Enter it manually.");
            });
        });
    }

    bookShelfForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (busy || !isAdminUser()) {
            return;
        }
        var shelf = (bookShelfShelfTa && bookShelfShelfTa.checked) ? "ta" : "en";
        var titleEn = String(bookShelfTitleInput && bookShelfTitleInput.value || "").trim();
        var fileUrl = String(bookShelfUrlInput && bookShelfUrlInput.value || "").trim();
        if (!titleEn) {
            showNote("validation", "admin.bookShelfNeedTitle", "Please enter a title.");
            return;
        }
        if (!/^https:\/\//i.test(fileUrl)) {
            showNote("validation", "admin.bookShelfNeedUrl", "Please enter a secure file URL (https://…).");
            return;
        }
        var coverUrl = String(bookShelfCoverInput && bookShelfCoverInput.value || "").trim();
        if (coverUrl && !/^https:\/\//i.test(coverUrl)) {
            showNote("validation", "admin.bookShelfNeedCoverUrl", "Cover image must be https:// or leave empty.");
            return;
        }
        var sizeRaw = String(bookShelfFileSizeInput && bookShelfFileSizeInput.value || "").trim();
        var parsedFileSize = parseBookFileSizeBytes(sizeRaw);
        if (parsedFileSize !== null && (typeof parsedFileSize !== "number" || isNaN(parsedFileSize))) {
            showNote("validation", "admin.bookShelfNeedFileSize", "File size: use e.g. 2.5 MB, 800 KB, or bytes. Leave empty if unknown.");
            return;
        }
        var fileSizeBytes = parsedFileSize === null ? 0 : Math.min(Math.round(parsedFileSize), 2147483647);
        setBusyState(true);
        fetchMantleEntries(ADMIN_LIBRARY_URL).then(function (raw) {
            var list = (Array.isArray(raw) ? raw : []).map(function (row, idx) {
                return normalizeBookShelfEntry(row, idx);
            });
            var newEntry = {
                id: makeEntryId("book-shelf"),
                shelf: shelf,
                title: titleEn,
                titleTa: String(bookShelfTitleTaInput && bookShelfTitleTaInput.value || "").trim(),
                author: String(bookShelfAuthorInput && bookShelfAuthorInput.value || "").trim(),
                authorTa: String(bookShelfAuthorTaInput && bookShelfAuthorTaInput.value || "").trim(),
                url: fileUrl,
                coverImageUrl: coverUrl,
                fileSizeBytes: fileSizeBytes,
                format: String(bookShelfFormatInput && bookShelfFormatInput.value || "").trim().toLowerCase(),
                category: String(bookShelfCategoryInput && bookShelfCategoryInput.value || "").trim(),
                categoryTa: String(bookShelfCategoryTaInput && bookShelfCategoryTaInput.value || "").trim(),
                description: String(bookShelfDescriptionInput && bookShelfDescriptionInput.value || "").trim(),
                descriptionTa: String(bookShelfDescriptionTaInput && bookShelfDescriptionTaInput.value || "").trim(),
                sortOrder: 0,
                createdAt: new Date().toISOString(),
                updatedAt: ""
            };
            return saveMantleEntries(ADMIN_LIBRARY_URL, [newEntry].concat(list)).then(function () {
                return fetchMantleEntries(ADMIN_LIBRARY_URL);
            });
        }).then(function (entries) {
            cachedBookShelf = (Array.isArray(entries) ? entries : []).map(function (row, idx) {
                return normalizeBookShelfEntry(row, idx);
            });
            bookShelfForm.reset();
            if (bookShelfShelfEn) bookShelfShelfEn.checked = true;
            renderBookShelfList();
            showNote("success", "admin.bookShelfSaved", "Book shelf item added.");
            document.dispatchEvent(new CustomEvent("njc:admin-library-updated"));
        }).catch(function () {
            showNote("error", "admin.syncError", "Could not save. Create MantleDB bucket njc-belgium-admin-library if needed.");
        }).finally(function () {
            setBusyState(false);
        });
    });

    if (bookShelfList) {
        bookShelfList.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-admin-book-shelf-id][data-admin-book-shelf-action]");
            if (!button || busy || !isAdminUser()) {
                return;
            }
            var entryId = String(button.getAttribute("data-admin-book-shelf-id") || "").trim();
            var action = String(button.getAttribute("data-admin-book-shelf-action") || "").trim();
            if (!entryId || (action !== "edit" && action !== "delete")) {
                return;
            }
            var source = cachedBookShelf.slice(0, MAX_ENTRIES);
            var targetIndex = source.findIndex(function (entry) {
                return String(entry && entry.id || "").trim() === entryId;
            });
            if (targetIndex < 0) {
                showNote("error", "admin.syncError", "Could not find entry.");
                return;
            }
            if (action === "delete") {
                if (!window.confirm(T("admin.bookShelfDeleteConfirm", "Remove this item?"))) {
                    return;
                }
                source.splice(targetIndex, 1);
                setBusyState(true);
                saveMantleEntries(ADMIN_LIBRARY_URL, source).then(function () {
                    return fetchMantleEntries(ADMIN_LIBRARY_URL);
                }).then(function (entries) {
                    cachedBookShelf = (Array.isArray(entries) ? entries : []).map(function (row, idx) {
                        return normalizeBookShelfEntry(row, idx);
                    });
                    renderBookShelfList();
                    showNote("success", "admin.bookShelfDeleted", "Removed.");
                    document.dispatchEvent(new CustomEvent("njc:admin-library-updated"));
                }).catch(function () {
                    showNote("error", "admin.syncError", "Could not delete.");
                }).finally(function () {
                    setBusyState(false);
                });
                return;
            }
            var current = source[targetIndex] || {};
            var nextShelfRaw = window.prompt(T("admin.bookShelfEditPromptShelf", "Tab: ta (Tamil) or en (English)"), String(current.shelf || "en"));
            if (nextShelfRaw === null) {
                return;
            }
            var nextShelf = String(nextShelfRaw || "").trim().toLowerCase() === "ta" ? "ta" : "en";
            var nextTitle = window.prompt(T("admin.bookShelfEditPromptTitle", "Title (English)"), String(current.title || ""));
            if (nextTitle === null) {
                return;
            }
            var nextTitleTa = window.prompt(T("admin.bookShelfEditPromptTitleTa", "Title (Tamil, optional)"), String(current.titleTa || ""));
            if (nextTitleTa === null) {
                return;
            }
            var nextAuthor = window.prompt(T("admin.bookShelfEditPromptAuthor", "Author (optional)"), String(current.author || ""));
            if (nextAuthor === null) {
                return;
            }
            var nextAuthorTa = window.prompt(T("admin.bookShelfEditPromptAuthorTa", "Author Tamil (optional)"), String(current.authorTa || ""));
            if (nextAuthorTa === null) {
                return;
            }
            var nextUrl = window.prompt(T("admin.bookShelfEditPromptUrl", "File URL (https)"), String(current.url || ""));
            if (nextUrl === null) {
                return;
            }
            var nextCover = window.prompt(T("admin.bookShelfEditPromptCover", "Cover image URL (https, optional)"), String(current.coverImageUrl || ""));
            if (nextCover === null) {
                return;
            }
            var sizeHint = current.fileSizeBytes > 0 ? formatBookFileSizeBytes(current.fileSizeBytes) : "";
            var nextFileSize = window.prompt(T("admin.bookShelfEditPromptFileSize", "File size (e.g. 2.5 MB or 1200000 bytes, empty to clear)"), sizeHint);
            if (nextFileSize === null) {
                return;
            }
            var parsedEditSize = parseBookFileSizeBytes(nextFileSize);
            if (parsedEditSize !== null && (typeof parsedEditSize !== "number" || isNaN(parsedEditSize))) {
                showNote("validation", "admin.bookShelfNeedFileSize", "File size: use e.g. 2.5 MB, 800 KB, or bytes. Leave empty if unknown.");
                return;
            }
            var nextFileSizeBytes = parsedEditSize === null ? 0 : Math.min(Math.round(parsedEditSize), 2147483647);
            var nextFormat = window.prompt(T("admin.bookShelfEditPromptFormat", "Format (optional, e.g. pdf)"), String(current.format || ""));
            if (nextFormat === null) {
                return;
            }
            var nextCategory = window.prompt(T("admin.bookShelfEditPromptCategory", "Category (optional)"), String(current.category || ""));
            if (nextCategory === null) {
                return;
            }
            var nextCategoryTa = window.prompt(T("admin.bookShelfEditPromptCategoryTa", "Category Tamil (optional)"), String(current.categoryTa || ""));
            if (nextCategoryTa === null) {
                return;
            }
            var nextDesc = window.prompt(T("admin.bookShelfEditPromptDesc", "Description (optional)"), String(current.description || ""));
            if (nextDesc === null) {
                return;
            }
            var nextDescTa = window.prompt(T("admin.bookShelfEditPromptDescTa", "Description Tamil (optional)"), String(current.descriptionTa || ""));
            if (nextDescTa === null) {
                return;
            }
            var cleanTitle = String(nextTitle || "").trim();
            var cleanUrl = String(nextUrl || "").trim();
            var cleanCover = String(nextCover || "").trim();
            if (!cleanTitle) {
                showNote("validation", "admin.bookShelfNeedTitle", "Please enter a title.");
                return;
            }
            if (!/^https:\/\//i.test(cleanUrl)) {
                showNote("validation", "admin.bookShelfNeedUrl", "Please enter a secure file URL (https://…).");
                return;
            }
            if (cleanCover && !/^https:\/\//i.test(cleanCover)) {
                showNote("validation", "admin.bookShelfNeedCoverUrl", "Cover image must be https:// or empty.");
                return;
            }
            source[targetIndex] = Object.assign({}, current, {
                shelf: nextShelf,
                title: cleanTitle,
                titleTa: String(nextTitleTa || "").trim(),
                author: String(nextAuthor || "").trim(),
                authorTa: String(nextAuthorTa || "").trim(),
                url: cleanUrl,
                coverImageUrl: cleanCover,
                fileSizeBytes: nextFileSizeBytes,
                format: String(nextFormat || "").trim().toLowerCase(),
                category: String(nextCategory || "").trim(),
                categoryTa: String(nextCategoryTa || "").trim(),
                description: String(nextDesc || "").trim(),
                descriptionTa: String(nextDescTa || "").trim(),
                updatedAt: new Date().toISOString()
            });
            setBusyState(true);
            saveMantleEntries(ADMIN_LIBRARY_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_LIBRARY_URL);
            }).then(function (entries) {
                cachedBookShelf = (Array.isArray(entries) ? entries : []).map(function (row, idx) {
                    return normalizeBookShelfEntry(row, idx);
                });
                renderBookShelfList();
                showNote("success", "admin.bookShelfUpdated", "Updated.");
                document.dispatchEvent(new CustomEvent("njc:admin-library-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not update.");
            }).finally(function () {
                setBusyState(false);
            });
        });
    }

    if (triviaForm) {
        triviaForm.addEventListener("submit", function (event) {
            event.preventDefault();
            if (busy || !isAdminUser()) {
                return;
            }
            function showTriviaNote(state, key, fallback) {
                var msg = T(key, fallback);
                if (triviaNote) {
                    triviaNote.hidden = false;
                    triviaNote.textContent = msg;
                    triviaNote.dataset.state = state || "";
                } else {
                    showNote(state, key, fallback);
                }
            }
            var questionTa = String(triviaQuestionInput && triviaQuestionInput.value || "").trim();
            var opt1 = String(triviaOption1Input && triviaOption1Input.value || "").trim();
            var opt2 = String(triviaOption2Input && triviaOption2Input.value || "").trim();
            var opt3 = String(triviaOption3Input && triviaOption3Input.value || "").trim();
            var opt4 = String(triviaOption4Input && triviaOption4Input.value || "").trim();
            var options = [opt1, opt2, opt3, opt4].filter(Boolean);
            var correctIndex = Math.max(0, Math.min(3, Number(triviaCorrectInput && triviaCorrectInput.value) || 0));
            var reference = String(triviaReferenceInput && triviaReferenceInput.value || "").trim();
            var date = String(triviaDateInput && triviaDateInput.value || "").trim();
            if (!questionTa || options.length !== 4) {
                showTriviaNote("validation", "admin.triviaNeedFields", "Please enter question and all 4 options.");
                return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                showTriviaNote("validation", "admin.triviaNeedDate", "Please enter a valid date (YYYY-MM-DD).");
                return;
            }
            if (correctIndex >= options.length) {
                correctIndex = 0;
            }
            setBusyState(true);
            if (triviaNote) {
                triviaNote.hidden = false;
                triviaNote.textContent = T("admin.saving", "Saving...");
            }
            prependAndSave(TRIVIA_URL, cachedTrivia, {
                id: makeEntryId("trivia"),
                questionTa: questionTa,
                options: options,
                correctIndex: correctIndex,
                answerTa: options[correctIndex],
                reference: reference,
                date: date,
                createdAt: new Date().toISOString(),
                createdByEmail: normalizeEmail(getUser() && getUser().email)
            }).then(function (entries) {
                cachedTrivia = entries;
                if (triviaQuestionInput) {
                    triviaQuestionInput.value = "";
                }
                if (triviaOption1Input) {
                    triviaOption1Input.value = "";
                }
                if (triviaOption2Input) {
                    triviaOption2Input.value = "";
                }
                if (triviaOption3Input) {
                    triviaOption3Input.value = "";
                }
                if (triviaOption4Input) {
                    triviaOption4Input.value = "";
                }
                if (triviaCorrectInput) {
                    triviaCorrectInput.value = "0";
                }
                if (triviaReferenceInput) {
                    triviaReferenceInput.value = "";
                }
                if (triviaDateInput) {
                    triviaDateInput.value = "";
                }
                renderTriviaList();
                showTriviaNote("success", "admin.triviaSaved", "Bible Quiz added.");
                document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
            }).catch(function () {
                showTriviaNote("error", "admin.syncError", "Could not save. Check your connection.");
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
        var nextImageUrl = window.prompt(T("admin.noticeEditPromptImageUrl", "Banner image URL (https://, optional)"), String(current.imageUrl || ""));
        if (nextImageUrl === null) {
            return;
        }
        var nextImportantRaw = window.prompt(
            T("admin.noticeEditPromptImportant", "Important tag on Home? Type y or n (blank = keep current)"),
            Boolean(current.important) ? "y" : "n"
        );
        if (nextImportantRaw === null) {
            return;
        }
        var nextImportant = current.important;
        var impTrim = String(nextImportantRaw || "").trim().toLowerCase();
        if (impTrim === "y" || impTrim === "yes") {
            nextImportant = true;
        } else if (impTrim === "n" || impTrim === "no") {
            nextImportant = false;
        }
        var cleanTitle = String(nextTitle || "").trim();
        var cleanBody = String(nextBody || "").trim();
        var cleanImageUrl = String(nextImageUrl || "").trim();
        if (cleanImageUrl && !/^https?:\/\//i.test(cleanImageUrl)) {
            showNote("validation", "admin.noticeNeedImageUrl", "Banner image must be an https:// URL or leave empty.");
            return;
        }
        if (!cleanTitle && !cleanBody && !cleanImageUrl) {
            showNote("validation", "admin.noticeNeedFields", "Please enter notice title and message, or provide a banner image URL.");
            return;
        }
        source[targetIndex] = Object.assign({}, current, {
            title: cleanTitle,
            body: cleanBody,
            titleTa: String(nextTitleTa || "").trim(),
            bodyTa: String(nextBodyTa || "").trim(),
            link: String(nextLink || "").trim(),
            imageUrl: cleanImageUrl,
            important: Boolean(nextImportant),
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
                saveMantleEntries(TRIVIA_URL, source).then(function () {
                    return fetchMantleEntries(TRIVIA_URL);
                }).then(function (entries) {
                    cachedTrivia = Array.isArray(entries) ? entries : [];
                    renderTriviaList();
                    showNote("success", "admin.triviaDeleted", "Bible Quiz deleted.");
                    document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
                }).catch(function () {
                    showNote("error", "admin.syncError", "Could not load admin dashboard data.");
                }).finally(function () {
                    setBusyState(false);
                });
                return;
            }
            var current = source[targetIndex] || {};
            var opts = Array.isArray(current.options) ? current.options : [current.answerTa || "", "", "", ""];
            while (opts.length < 4) {
                opts.push("");
            }
            var nextQuestion = window.prompt(T("admin.triviaEditPromptQuestion", "Edit question (Tamil)"), String(current.questionTa || ""));
            if (nextQuestion === null) {
                return;
            }
            var nextOpt1 = window.prompt(T("admin.triviaEditPromptOption", "Option 1"), String(opts[0] || ""));
            if (nextOpt1 === null) {
                return;
            }
            var nextOpt2 = window.prompt(T("admin.triviaEditPromptOption", "Option 2"), String(opts[1] || ""));
            if (nextOpt2 === null) {
                return;
            }
            var nextOpt3 = window.prompt(T("admin.triviaEditPromptOption", "Option 3"), String(opts[2] || ""));
            if (nextOpt3 === null) {
                return;
            }
            var nextOpt4 = window.prompt(T("admin.triviaEditPromptOption", "Option 4"), String(opts[3] || ""));
            if (nextOpt4 === null) {
                return;
            }
            var nextCorrect = window.prompt(T("admin.triviaEditPromptCorrect", "Correct option (1-4)"), String((Number(current.correctIndex) || 0) + 1));
            if (nextCorrect === null) {
                return;
            }
            var nextReference = window.prompt(T("admin.triviaEditPromptReference", "Edit reference (optional)"), String(current.reference || ""));
            if (nextReference === null) {
                return;
            }
            var nextDate = window.prompt(T("admin.triviaEditPromptDate", "Edit date (YYYY-MM-DD)"), String(current.date || ""));
            if (nextDate === null) {
                return;
            }
            var cleanQuestion = String(nextQuestion || "").trim();
            var cleanOptions = [String(nextOpt1 || "").trim(), String(nextOpt2 || "").trim(), String(nextOpt3 || "").trim(), String(nextOpt4 || "").trim()];
            var cleanCorrectIndex = Math.max(0, Math.min(3, (Number(nextCorrect) || 1) - 1));
            var cleanDate = String(nextDate || "").trim();
            if (!cleanQuestion || cleanOptions.filter(Boolean).length !== 4 || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
                showNote("validation", "admin.triviaNeedFields", "Please enter question, all 4 options and valid date.");
                return;
            }
            source[targetIndex] = Object.assign({}, current, {
                questionTa: cleanQuestion,
                options: cleanOptions,
                correctIndex: cleanCorrectIndex,
                answerTa: cleanOptions[cleanCorrectIndex],
                reference: String(nextReference || "").trim(),
                date: cleanDate,
                updatedAt: new Date().toISOString()
            });
            setBusyState(true);
            saveMantleEntries(TRIVIA_URL, source).then(function () {
                return fetchMantleEntries(TRIVIA_URL);
            }).then(function (entries) {
                cachedTrivia = Array.isArray(entries) ? entries : [];
                renderTriviaList();
                showNote("success", "admin.triviaUpdated", "Bible Quiz updated.");
                document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not load admin dashboard data.");
            }).finally(function () {
                setBusyState(false);
            });
        });
    }

    if (dailyBreadList) {
        dailyBreadList.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-admin-daily-bread-id][data-admin-daily-bread-action]");
            if (!button || busy || !isAdminUser()) {
                return;
            }
            var entryId = String(button.getAttribute("data-admin-daily-bread-id") || "").trim();
            var action = String(button.getAttribute("data-admin-daily-bread-action") || "").trim();
            if (!entryId || (action !== "edit" && action !== "delete")) {
                return;
            }
            var source = cachedDailyBread.slice(0, MAX_ENTRIES);
            var targetIndex = source.findIndex(function (entry) {
                return String(entry && entry.id || "").trim() === entryId;
            });
            if (targetIndex < 0) {
                showNote("error", "admin.syncError", "Could not find entry.");
                return;
            }
            if (action === "delete") {
                if (!window.confirm(T("admin.dailyBreadDeleteConfirm", "Delete this daily bread entry?"))) {
                    return;
                }
                source.splice(targetIndex, 1);
                setBusyState(true);
                saveMantleEntries(ADMIN_DAILY_BREAD_URL, source).then(function () {
                    return fetchMantleEntries(ADMIN_DAILY_BREAD_URL);
                }).then(function (entries) {
                    var rows = Array.isArray(entries) ? entries : [];
                    cachedDailyBread = rows.map(function (row, idx) {
                        return normalizeDailyBreadEntry(row, idx);
                    }).filter(function (e) {
                        return Boolean(e && e.date);
                    });
                    renderDailyBreadList();
                    showNote("success", "admin.dailyBreadDeleted", "Deleted.");
                    document.dispatchEvent(new CustomEvent("njc:admin-daily-bread-updated"));
                }).catch(function () {
                    showNote("error", "admin.syncError", "Could not delete.");
                }).finally(function () {
                    setBusyState(false);
                });
                return;
            }
            var current = source[targetIndex] || {};
            var nextDate = window.prompt(T("admin.dailyBreadEditPromptDate", "Edit date (YYYY-MM-DD)"), String(current.date || ""));
            if (nextDate === null) {
                return;
            }
            var nextTitleEn = window.prompt(T("admin.dailyBreadEditPromptTitleEn", "Edit title (English)"), String(current.title || ""));
            if (nextTitleEn === null) {
                return;
            }
            var nextTitleTa = window.prompt(T("admin.dailyBreadEditPromptTitleTa", "Edit title (Tamil, optional)"), String(current.titleTa || ""));
            if (nextTitleTa === null) {
                return;
            }
            var nextAuthorEn = window.prompt(T("admin.dailyBreadEditPromptAuthorEn", "Edit author (English, optional)"), String(current.author || ""));
            if (nextAuthorEn === null) {
                return;
            }
            var nextAuthorTa = window.prompt(T("admin.dailyBreadEditPromptAuthorTa", "Edit author (Tamil, optional)"), String(current.authorTa || ""));
            if (nextAuthorTa === null) {
                return;
            }
            var nextBodyEn = window.prompt(T("admin.dailyBreadEditPromptBodyEn", "Edit body (English)"), String(current.body || ""));
            if (nextBodyEn === null) {
                return;
            }
            var nextBodyTa = window.prompt(T("admin.dailyBreadEditPromptBodyTa", "Edit body (Tamil, optional)"), String(current.bodyTa || ""));
            if (nextBodyTa === null) {
                return;
            }
            var cleanDate = toYmd(nextDate);
            var cleanBodyEn = String(nextBodyEn || "").trim();
            var cleanBodyTa = String(nextBodyTa || "").trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
                showNote("validation", "admin.dailyBreadNeedDate", "Invalid date.");
                return;
            }
            if (!cleanBodyEn && !cleanBodyTa) {
                showNote("validation", "admin.dailyBreadNeedBody", "Body required.");
                return;
            }
            var oldDate = String(current.date || "");
            if (cleanDate !== oldDate) {
                var clash = source.some(function (e, i) {
                    return i !== targetIndex && e.date === cleanDate;
                });
                if (clash) {
                    showNote("validation", "admin.dailyBreadNeedDate", "That date already has an entry.");
                    return;
                }
            }
            source[targetIndex] = Object.assign({}, current, {
                date: cleanDate,
                title: String(nextTitleEn || "").trim(),
                titleTa: String(nextTitleTa || "").trim(),
                author: String(nextAuthorEn || "").trim(),
                authorTa: String(nextAuthorTa || "").trim(),
                body: cleanBodyEn,
                bodyTa: cleanBodyTa,
                updatedAt: new Date().toISOString()
            });
            setBusyState(true);
            saveMantleEntries(ADMIN_DAILY_BREAD_URL, source).then(function () {
                return fetchMantleEntries(ADMIN_DAILY_BREAD_URL);
            }).then(function (entries) {
                var rows = Array.isArray(entries) ? entries : [];
                cachedDailyBread = rows.map(function (row, idx) {
                    return normalizeDailyBreadEntry(row, idx);
                }).filter(function (e) {
                    return Boolean(e && e.date);
                });
                renderDailyBreadList();
                showNote("success", "admin.dailyBreadUpdated", "Updated.");
                document.dispatchEvent(new CustomEvent("njc:admin-daily-bread-updated"));
            }).catch(function () {
                showNote("error", "admin.syncError", "Could not update.");
            }).finally(function () {
                setBusyState(false);
            });
        });
    }

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
            renderPrayerList();
            renderTriviaList();
            renderDailyBreadList();
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
