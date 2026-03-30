(function () {
    var LIST_URL = "./books.json?v=20260330lib1";
    var listEl = document.getElementById("library-books-list");
    var statusEl = document.getElementById("library-books-status");
    var pageCard = document.querySelector(".library-page-card");

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

    function normalizeEntry(row, index) {
        var source = row && typeof row === "object" ? row : {};
        var url = String(source.url || source.fileUrl || source.href || "").trim();
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
            format: String(source.format || "").trim().toLowerCase() || guessFormat(url)
        };
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

    function getAppLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
    }

    function renderList(entries) {
        var lang = getAppLanguage();
        if (!entries.length) {
            statusEl.hidden = false;
            statusEl.textContent = T("library.empty", "No books are listed yet.");
            listEl.innerHTML = "";
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = "";
        listEl.innerHTML = entries.map(function (raw, i) {
            var entry = normalizeEntry(raw, i);
            if (!entry.url) {
                return "";
            }
            var p = pickLang(entry, lang);
            var title = p.title || T("library.untitled", "Untitled");
            var fmt = entry.format ? entry.format.toUpperCase() : "FILE";
            var catLine = p.category
                ? ("<span class=\"library-book-category\">" + escapeHtml(p.category) + "</span>")
                : "";
            var authorLine = p.author
                ? ("<p class=\"library-book-author page-note\">" + escapeHtml(p.author) + "</p>")
                : "";
            var desc = p.description
                ? ("<p class=\"library-book-desc page-note\">" + escapeHtml(p.description) + "</p>")
                : "";
            return "" +
                "<li class=\"library-book-card\">" +
                "  <div class=\"library-book-top\">" +
                "    <h3 class=\"library-book-title\">" + escapeHtml(title) + "</h3>" +
                "    <span class=\"library-book-format\">" + escapeHtml(fmt) + "</span>" +
                "  </div>" +
                catLine +
                authorLine +
                desc +
                "  <div class=\"library-book-actions\">" +
                "    <a class=\"button-link button-secondary\" href=\"" + escapeHtml(entry.url) + "\" target=\"_blank\" rel=\"noopener noreferrer\">" +
                "      <i class=\"fa-solid fa-book-open\" aria-hidden=\"true\"></i> " + escapeHtml(T("library.read", "Read")) +
                "    </a>" +
                "    <a class=\"button-link\" href=\"" + escapeHtml(entry.url) + "\" download rel=\"noopener noreferrer\">" +
                "      <i class=\"fa-solid fa-download\" aria-hidden=\"true\"></i> " + escapeHtml(T("library.download", "Download")) +
                "    </a>" +
                "  </div>" +
                "</li>";
        }).filter(Boolean).join("");
    }

    function loadBooks() {
        statusEl.hidden = false;
        statusEl.textContent = T("library.loading", "Loading…");
        listEl.innerHTML = "";
        fetch(LIST_URL, { cache: "no-store" })
            .then(function (res) {
                if (!res.ok) {
                    throw new Error("bad");
                }
                return res.json();
            })
            .then(function (payload) {
                var rows = Array.isArray(payload) ? payload : [];
                renderList(rows);
            })
            .catch(function () {
                statusEl.hidden = false;
                statusEl.textContent = T("library.error", "Could not load the list. Try again later.");
                listEl.innerHTML = "";
            });
    }

    function onRoute() {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "library") {
            loadBooks();
        }
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "library") {
            loadBooks();
        }
    });
    document.addEventListener("njc:langchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "library") {
            loadBooks();
        }
    });

    document.addEventListener("DOMContentLoaded", onRoute);
})();
