(function () {
    var songbookList = document.getElementById("songbook-list");
    var songbookSearch = document.getElementById("songbook-search");
    var SONGBOOK_URL = "https://raw.githubusercontent.com/simsonpeter/njcsongbook/main/songs.json";
    var songs = [];
    var loadFailed = false;
    var expandedSongId = "";
    var searchQuery = "";

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

    function normalizeSong(item, index) {
        var source = item && typeof item === "object" ? item : {};
        var title = String(source.title || "").trim();
        if (!title) {
            return null;
        }
        var author = String(source.author || "").trim();
        var lyrics = String(source.lyrics || "").trim();
        return {
            id: String(source.id || ("song-" + index)),
            title: title,
            author: author,
            lyrics: lyrics
        };
    }

    function getSongsPayload(payload) {
        if (Array.isArray(payload)) {
            return payload;
        }
        if (payload && Array.isArray(payload.songs)) {
            return payload.songs;
        }
        return [];
    }

    function getFilteredSongs() {
        var query = searchQuery.trim().toLowerCase();
        if (!query) {
            return songs.slice();
        }
        return songs.filter(function (song) {
            var searchable = [
                song.title || "",
                song.author || "",
                song.lyrics || ""
            ].join(" ").toLowerCase();
            return searchable.indexOf(query) >= 0;
        });
    }

    function renderSongbook() {
        if (!songbookList) {
            return;
        }

        if (loadFailed) {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.loadErrorTitle", "Could not load songbook")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.loadErrorBody", "Please check your connection and try again.")) + "</p>" +
                "</li>";
            return;
        }

        if (!songs.length) {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.emptyTitle", "No songs yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.emptyBody", "Please try again later.")) + "</p>" +
                "</li>";
            return;
        }

        var filtered = getFilteredSongs();
        if (!filtered.length) {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.emptyTitle", "No songs yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.emptyBody", "Please try again later.")) + "</p>" +
                "</li>";
            return;
        }

        var authorPrefix = T("songbook.authorPrefix", "Author");
        songbookList.innerHTML = filtered.map(function (song) {
            var isOpen = expandedSongId === song.id;
            var toggleLabel = isOpen
                ? T("songbook.closeLyrics", "Close lyrics")
                : T("songbook.openLyrics", "Open lyrics");
            var lyricsValue = song.lyrics || T("songbook.noLyrics", "Lyrics not available");
            return "" +
                "<li class=\"songbook-item\">" +
                "  <h3>" + escapeHtml(song.title) + "</h3>" +
                (song.author ? "  <p class=\"songbook-author\">" + escapeHtml(authorPrefix + ": " + song.author) + "</p>" : "") +
                "  <button class=\"button-link songbook-toggle-btn\" type=\"button\" data-song-id=\"" + escapeHtml(song.id) + "\">" + escapeHtml(toggleLabel) + "</button>" +
                (isOpen ? "  <pre class=\"songbook-lyrics\">" + escapeHtml(lyricsValue) + "</pre>" : "") +
                "</li>";
        }).join("");
    }

    if (songbookList) {
        songbookList.addEventListener("click", function (event) {
            var button = event.target.closest("button[data-song-id]");
            if (!button) {
                return;
            }
            var songId = button.getAttribute("data-song-id") || "";
            if (!songId) {
                return;
            }
            expandedSongId = expandedSongId === songId ? "" : songId;
            renderSongbook();
        });
    }

    if (songbookSearch) {
        songbookSearch.addEventListener("input", function () {
            searchQuery = songbookSearch.value || "";
            expandedSongId = "";
            renderSongbook();
        });
    }

    document.addEventListener("njc:langchange", function () {
        renderSongbook();
    });

    fetch(SONGBOOK_URL, { cache: "no-store" })
        .then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to load songbook");
            }
            return response.json();
        })
        .then(function (payload) {
            songs = getSongsPayload(payload)
                .map(normalizeSong)
                .filter(function (song) { return Boolean(song); });
            loadFailed = false;
            renderSongbook();
        })
        .catch(function () {
            loadFailed = true;
            renderSongbook();
        });
})();
