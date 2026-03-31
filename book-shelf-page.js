(function () {
    var MANTLE_URL = "https://mantledb.sh/v2/njc-belgium-admin-library/entries";
    var FALLBACK_JSON = "./books.json?v=20260331bsfile1";
    var TAB_KEY = "njc_book_shelf_tab_v1";

    var listEl = document.getElementById("book-shelf-list");
    var statusEl = document.getElementById("book-shelf-status");
    var pageCard = document.querySelector(".book-shelf-page-card");
    var tabEn = document.getElementById("book-shelf-tab-en");
    var tabTa = document.getElementById("book-shelf-tab-ta");

    if (!listEl || !statusEl) {
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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function guessFormat(url) {
        var path = String(url || "").split("?")[0].split("#")[0].toLowerCase();
        var m = path.match(/\.([a-z0-9]+)$/);
        return m ? m[1] : "";
    }

    function normalizeShelf(value) {
        var s = String(value || "").trim().toLowerCase();
        return s === "ta" ? "ta" : "en";
    }

    function formatBytesHuman(bytes) {
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

    function normalizeEntry(row, index) {
        var source = row && typeof row === "object" ? row : {};
        var url = String(source.url || source.fileUrl || source.href || "").trim();
        var sizeRaw = source.fileSizeBytes != null ? source.fileSizeBytes : source.fileSize;
        var fileSizeBytes = Number(sizeRaw);
        if (!isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
            fileSizeBytes = 0;
        } else {
            fileSizeBytes = Math.min(Math.floor(fileSizeBytes), 2147483647);
        }
        return {
            id: String(source.id || "").trim() || ("book-" + index),
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
            format: String(source.format || "").trim().toLowerCase() || guessFormat(url),
            shelf: normalizeShelf(source.shelf),
            fileSizeBytes: fileSizeBytes,
            sortOrder: Number(source.sortOrder) || 0,
            updatedAt: String(source.updatedAt || ""),
            createdAt: String(source.createdAt || "")
        };
    }

    function isValidHttpsUrl(url) {
        return /^https:\/\//i.test(String(url || "").trim());
    }

    function getStoredShelfTab() {
        try {
            var raw = String(window.localStorage.getItem(TAB_KEY) || "").trim().toLowerCase();
            return raw === "ta" ? "ta" : "en";
        } catch (e) {
            return "en";
        }
    }

    function setStoredShelfTab(tab) {
        try {
            window.localStorage.setItem(TAB_KEY, normalizeShelf(tab));
        } catch (e) {}
    }

    var activeShelfTab = getStoredShelfTab();

    function updateTabButtons() {
        var en = activeShelfTab === "en";
        if (tabEn) {
            tabEn.classList.toggle("active", en);
            tabEn.setAttribute("aria-selected", en ? "true" : "false");
        }
        if (tabTa) {
            tabTa.classList.toggle("active", !en);
            tabTa.setAttribute("aria-selected", en ? "false" : "true");
        }
    }

    function sortLibraryRows(rows) {
        return rows.slice().sort(function (a, b) {
            var ae = normalizeEntry(a, 0);
            var be = normalizeEntry(b, 0);
            var ao = ae.sortOrder;
            var bo = be.sortOrder;
            if (ao !== bo) {
                return ao - bo;
            }
            var at = String(ae.updatedAt || ae.createdAt || "");
            var bt = String(be.updatedAt || be.createdAt || "");
            return bt.localeCompare(at);
        });
    }

    function parseEntriesPayload(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }
        return payload && Array.isArray(payload.entries) ? payload.entries : [];
    }

    function loadFromJson(url) {
        return fetch(url, { cache: "no-store" }).then(function (res) {
            if (!res.ok) {
                throw new Error("json");
            }
            return res.json().then(parseEntriesPayload);
        });
    }

    function loadFromMantle() {
        return fetch(MANTLE_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("mantle");
                }
                return res.json().then(parseEntriesPayload);
            });
    }

    function pickLang(entry, lang) {
        if (lang === "ta") {
            return {
                title: String(entry.titleTa || "").trim() || String(entry.title || "").trim(),
                author: String(entry.authorTa || "").trim() || String(entry.author || "").trim(),
                description: String(entry.descriptionTa || "").trim() || String(entry.description || "").trim(),
                category: String(entry.categoryTa || "").trim() || String(entry.category || "").trim()
            };
        }
        return {
            title: String(entry.title || "").trim() || String(entry.titleTa || "").trim(),
            author: String(entry.author || "").trim() || String(entry.authorTa || "").trim(),
            description: String(entry.description || "").trim() || String(entry.descriptionTa || "").trim(),
            category: String(entry.category || "").trim() || String(entry.categoryTa || "").trim()
        };
    }

    function renderList(rows) {
        var shelf = activeShelfTab;
        var lang = shelf === "ta" ? "ta" : "en";
        var sorted = sortLibraryRows(Array.isArray(rows) ? rows : []);
        var filtered = sorted.filter(function (raw) {
            var e = normalizeEntry(raw, 0);
            return e.shelf === shelf && isValidHttpsUrl(e.url);
        });
        if (!filtered.length) {
            statusEl.hidden = false;
            statusEl.textContent = T("bookShelf.empty", "No books in this shelf yet.");
            listEl.innerHTML = "";
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = "";
        listEl.innerHTML = filtered.map(function (raw, i) {
            var entry = normalizeEntry(raw, i);
            var p = pickLang(entry, lang);
            var title = p.title || T("bookShelf.untitled", "Untitled");
            var fmt = entry.format ? entry.format.toUpperCase() : "FILE";
            var sizeHuman = formatBytesHuman(entry.fileSizeBytes);
            var sizeBadge = sizeHuman
                ? ("<span class=\"library-book-filesize\" title=\"" + escapeHtml(T("bookShelf.fileSizeHint", "Approximate download size")) + "\">" + escapeHtml(T("bookShelf.fileSizeAbout", "≈ {size} download").replace("{size}", sizeHuman)) + "</span>")
                : "";
            var catLine = p.category
                ? ("<span class=\"library-book-category\">" + escapeHtml(p.category) + "</span>")
                : "";
            var authorLine = p.author
                ? ("<p class=\"library-book-author page-note\">" + escapeHtml(p.author) + "</p>")
                : "";
            var desc = p.description
                ? ("<p class=\"library-book-desc page-note\">" + escapeHtml(p.description) + "</p>")
                : "";
            var coverUrl = String(entry.coverImageUrl || "").trim();
            var coverBlock = "";
            if (isValidHttpsUrl(coverUrl)) {
                coverBlock = "" +
                    "<div class=\"library-book-cover-wrap\">" +
                    "  <img class=\"library-book-cover\" src=\"" + escapeHtml(coverUrl) + "\" alt=\"\" width=\"96\" height=\"144\" loading=\"lazy\" decoding=\"async\">" +
                    "</div>";
            }
            return "" +
                "<li class=\"library-book-card\">" +
                "  <div class=\"library-book-main\">" +
                coverBlock +
                "    <div class=\"library-book-text\">" +
                "      <div class=\"library-book-top\">" +
                "        <h3 class=\"library-book-title\">" + escapeHtml(title) + "</h3>" +
                "        <span class=\"library-book-format-row\">" +
                "          <span class=\"library-book-format\">" + escapeHtml(fmt) + "</span>" +
                sizeBadge +
                "        </span>" +
                "      </div>" +
                catLine +
                authorLine +
                desc +
                "      <div class=\"library-book-actions\">" +
                "        <a class=\"button-link button-secondary\" href=\"" + escapeHtml(entry.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
                "          <i class=\"fa-solid fa-book-open\" aria-hidden=\"true\"></i> " + escapeHtml(T("bookShelf.read", "Read")) +
                "        </a>" +
                "        <a class=\"button-link button-secondary library-book-download-icon\" href=\"" + escapeHtml(entry.url) + "\" download rel=\"noopener noreferrer\" aria-label=\"" + escapeHtml(T("bookShelf.download", "Download")) + "\" title=\"" + escapeHtml(T("bookShelf.download", "Download")) + "\">" +
                "          <i class=\"fa-solid fa-download\" aria-hidden=\"true\"></i>" +
                "        </a>" +
                "      </div>" +
                "    </div>" +
                "  </div>" +
                "</li>";
        }).join("");
    }

    function loadBooks() {
        updateTabButtons();
        statusEl.hidden = false;
        statusEl.textContent = T("bookShelf.loading", "Loading…");
        listEl.innerHTML = "";
        loadFromMantle()
            .then(function (rows) {
                var valid = (Array.isArray(rows) ? rows : []).filter(function (raw) {
                    var e = normalizeEntry(raw, 0);
                    return isValidHttpsUrl(e.url);
                });
                if (valid.length) {
                    renderList(valid);
                    return;
                }
                return loadFromJson(FALLBACK_JSON).then(function (fallbackRows) {
                    renderList(Array.isArray(fallbackRows) ? fallbackRows : []);
                });
            })
            .catch(function () {
                return loadFromJson(FALLBACK_JSON).then(function (rows) {
                    renderList(Array.isArray(rows) ? rows : []);
                });
            })
            .catch(function () {
                statusEl.hidden = false;
                statusEl.textContent = T("bookShelf.error", "Could not load the list. Try again later.");
                listEl.innerHTML = "";
            });
    }

    function setShelfTab(tab) {
        activeShelfTab = normalizeShelf(tab);
        setStoredShelfTab(activeShelfTab);
        loadBooks();
    }

    if (tabEn) {
        tabEn.addEventListener("click", function () {
            setShelfTab("en");
        });
    }
    if (tabTa) {
        tabTa.addEventListener("click", function () {
            setShelfTab("ta");
        });
    }

    function onRoute() {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "book-shelf" || route === "library") {
            loadBooks();
        }
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "book-shelf") {
            loadBooks();
        }
    });
    document.addEventListener("njc:langchange", function () {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "book-shelf" || route === "library") {
            loadBooks();
        }
    });
    document.addEventListener("njc:admin-library-updated", function () {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "book-shelf" || route === "library") {
            loadBooks();
        }
    });

    document.addEventListener("DOMContentLoaded", onRoute);
})();
