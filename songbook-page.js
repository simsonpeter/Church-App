(function () {
    var songbookList = document.getElementById("songbook-list");
    var songbookSearch = document.getElementById("songbook-search");
    var songbookTabs = document.querySelectorAll("button[data-songbook-tab]");
    var songbookFullscreen = document.getElementById("songbook-fullscreen");
    var songbookFullscreenClose = document.getElementById("songbook-fullscreen-close");
    var songbookFullscreenTitle = document.getElementById("songbook-fullscreen-title");
    var songbookFullscreenAuthor = document.getElementById("songbook-fullscreen-author");
    var songbookFullscreenLyrics = document.getElementById("songbook-fullscreen-lyrics");
    var FIRESTORE_BASE_URL = "https://firestore.googleapis.com/v1/projects/songbook-add54/databases/(default)/documents/lyrics";
    var SONGBOOK_FALLBACK_URL = "https://raw.githubusercontent.com/simsonpeter/njcsongbook/main/songs.json";
    var SONGBOOK_FAVORITES_KEY = "njc_songbook_favorites_v1";
    var SONGBOOK_SERVICE_KEY = "njc_songbook_service_v1";
    var FIRESTORE_PAGE_SIZE = 300;
    var FIRESTORE_MAX_PAGES = 25;
    var songs = [];
    var loadFailed = false;
    var activeSongId = "";
    var searchQuery = "";
    var activeSongbookTab = "songs";
    var favoriteMap = getStoredFlagMap(SONGBOOK_FAVORITES_KEY);
    var serviceMap = getStoredFlagMap(SONGBOOK_SERVICE_KEY);

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

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getStoredFlagMap(key) {
        try {
            var raw = window.localStorage.getItem(key);
            var parsed = raw ? JSON.parse(raw) : {};
            if (!parsed || typeof parsed !== "object") {
                return {};
            }
            return parsed;
        } catch (err) {
            return {};
        }
    }

    function saveFlagMap(key, map) {
        try {
            window.localStorage.setItem(key, JSON.stringify(map || {}));
        } catch (err) {
            return null;
        }
        return null;
    }

    function isMarked(map, songId) {
        return Boolean(map && map[songId]);
    }

    function setMarked(map, key, songId, marked) {
        if (!map) {
            return;
        }
        if (marked) {
            map[songId] = true;
        } else {
            delete map[songId];
        }
        saveFlagMap(key, map);
    }

    function toggleSongFlag(action, songId) {
        if (!songId) {
            return;
        }
        if (action === "favorite") {
            var nextFavorite = !isMarked(favoriteMap, songId);
            setMarked(favoriteMap, SONGBOOK_FAVORITES_KEY, songId, nextFavorite);
        } else if (action === "service") {
            var nextService = !isMarked(serviceMap, songId);
            setMarked(serviceMap, SONGBOOK_SERVICE_KEY, songId, nextService);
        }
        renderSongbook();
    }

    function setActiveSongbookTab(tab) {
        activeSongbookTab = (tab === "service" || tab === "favorite") ? tab : "songs";
        if (songbookTabs && songbookTabs.length) {
            songbookTabs.forEach(function (tabButton) {
                var buttonTab = String(tabButton.getAttribute("data-songbook-tab") || "").trim().toLowerCase();
                var isActive = buttonTab === activeSongbookTab;
                tabButton.classList.toggle("active", isActive);
                tabButton.setAttribute("aria-selected", isActive ? "true" : "false");
            });
        }
        renderSongbook();
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

    function getFirestoreString(fields, keys) {
        if (!fields || typeof fields !== "object") {
            return "";
        }
        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            var field = fields[key];
            if (field && typeof field.stringValue === "string") {
                var value = String(field.stringValue || "").trim();
                if (value) {
                    return value;
                }
            }
        }
        return "";
    }

    function normalizeFirestoreSong(doc, index) {
        var source = doc && typeof doc === "object" ? doc : {};
        var fields = source.fields && typeof source.fields === "object" ? source.fields : {};
        var title = getFirestoreString(fields, ["songTitle", "title", "displayName", "name"]);
        if (!title) {
            return null;
        }
        var lyrics = getFirestoreString(fields, ["lyricsText", "lyrics", "content", "body", "text"]);
        var author = getFirestoreString(fields, ["author", "composer", "writer"]);
        var docName = String(source.name || "");
        var id = docName.split("/").pop() || ("song-" + index);
        return normalizeSong({
            id: id,
            title: title,
            author: author,
            lyrics: lyrics
        }, index);
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

    function buildFirestoreUrl(pageToken) {
        var params = new URLSearchParams({
            pageSize: String(FIRESTORE_PAGE_SIZE)
        });
        if (pageToken) {
            params.set("pageToken", pageToken);
        }
        return FIRESTORE_BASE_URL + "?" + params.toString();
    }

    function fetchFirestoreSongs() {
        var allDocuments = [];
        function fetchPage(pageToken, pageCount) {
            if (pageCount >= FIRESTORE_MAX_PAGES) {
                return Promise.resolve(allDocuments);
            }
            return fetch(buildFirestoreUrl(pageToken), { cache: "no-store" })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Firestore fetch failed");
                    }
                    return response.json();
                })
                .then(function (payload) {
                    var docs = payload && Array.isArray(payload.documents) ? payload.documents : [];
                    allDocuments = allDocuments.concat(docs);
                    var token = payload && payload.nextPageToken ? String(payload.nextPageToken) : "";
                    if (!token) {
                        return allDocuments;
                    }
                    return fetchPage(token, pageCount + 1);
                });
        }
        return fetchPage("", 0).then(function (docs) {
            return docs.map(normalizeFirestoreSong).filter(function (song) { return Boolean(song); });
        });
    }

    function fetchFallbackSongs() {
        return fetch(SONGBOOK_FALLBACK_URL, { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Fallback fetch failed");
                }
                return response.json();
            })
            .then(function (payload) {
                return getSongsPayload(payload)
                    .map(normalizeSong)
                    .filter(function (song) { return Boolean(song); });
            });
    }

    function getSongsForActiveTab() {
        if (activeSongbookTab === "service") {
            return songs.filter(function (song) {
                return isMarked(serviceMap, song.id);
            });
        }
        if (activeSongbookTab === "favorite") {
            return songs.filter(function (song) {
                return isMarked(favoriteMap, song.id);
            });
        }
        return songs.slice();
    }

    function getFilteredSongs() {
        var sourceSongs = getSongsForActiveTab();
        var query = searchQuery.trim().toLowerCase();
        var filtered = sourceSongs.filter(function (song) {
            if (!query) {
                return true;
            }
            var searchable = [
                song.title || "",
                song.author || "",
                song.lyrics || ""
            ].join(" ").toLowerCase();
            return searchable.indexOf(query) >= 0;
        });
        return filtered.sort(function (a, b) {
            return String(a.title || "").localeCompare(String(b.title || ""), getLocale(), {
                sensitivity: "base",
                numeric: true
            });
        });
    }

    function closeSongFullscreen() {
        if (!songbookFullscreen) {
            return;
        }
        activeSongId = "";
        songbookFullscreen.hidden = true;
        document.body.classList.remove("songbook-fullscreen-open");
    }

    function openSongFullscreen(song) {
        if (!songbookFullscreen || !song) {
            return;
        }
        activeSongId = song.id;
        var authorPrefix = T("songbook.authorPrefix", "Author");
        if (songbookFullscreenTitle) {
            songbookFullscreenTitle.textContent = song.title || "-";
        }
        if (songbookFullscreenAuthor) {
            songbookFullscreenAuthor.textContent = song.author
                ? (authorPrefix + ": " + song.author)
                : "";
        }
        if (songbookFullscreenLyrics) {
            songbookFullscreenLyrics.textContent = song.lyrics || T("songbook.noLyrics", "Lyrics not available");
        }
        songbookFullscreen.hidden = false;
        document.body.classList.add("songbook-fullscreen-open");
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
            if (activeSongbookTab === "service" && !searchQuery.trim()) {
                songbookList.innerHTML = "" +
                    "<li>" +
                    "  <h3>" + escapeHtml(T("songbook.serviceEmptyTitle", "No service songs yet")) + "</h3>" +
                    "  <p>" + escapeHtml(T("songbook.serviceEmptyBody", "Tap the church icon on any song to add it here.")) + "</p>" +
                    "</li>";
                return;
            }
            if (activeSongbookTab === "favorite" && !searchQuery.trim()) {
                songbookList.innerHTML = "" +
                    "<li>" +
                    "  <h3>" + escapeHtml(T("songbook.favoriteEmptyTitle", "No favorite songs yet")) + "</h3>" +
                    "  <p>" + escapeHtml(T("songbook.favoriteEmptyBody", "Tap the star icon on any song to save favorites.")) + "</p>" +
                    "</li>";
                return;
            }
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.emptyTitle", "No songs yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.emptyBody", "Please try again later.")) + "</p>" +
                "</li>";
            return;
        }

        songbookList.innerHTML = filtered.map(function (song) {
            var authorPrefix = T("songbook.authorPrefix", "Author");
            var serviceLabel = isMarked(serviceMap, song.id)
                ? T("songbook.removeService", "Remove from service")
                : T("songbook.addService", "Add to service");
            var favoriteLabel = isMarked(favoriteMap, song.id)
                ? T("songbook.removeFavorite", "Remove favorite")
                : T("songbook.addFavorite", "Add favorite");
            var serviceClass = isMarked(serviceMap, song.id) ? "songbook-action-btn active" : "songbook-action-btn";
            var favoriteClass = isMarked(favoriteMap, song.id) ? "songbook-action-btn active" : "songbook-action-btn";
            return "" +
                "<li class=\"songbook-item\">" +
                "  <div class=\"songbook-item-row\">" +
                "    <button type=\"button\" class=\"songbook-open-btn\" data-song-id=\"" + escapeHtml(song.id) + "\">" +
                "        <h3>" + escapeHtml(song.title) + "</h3>" +
                (song.author ? "        <p class=\"songbook-author\">" + escapeHtml(authorPrefix + ": " + song.author) + "</p>" : "") +
                "    </button>" +
                "    <div class=\"songbook-item-actions\">" +
                "      <button type=\"button\" class=\"" + serviceClass + "\" data-song-id=\"" + escapeHtml(song.id) + "\" data-song-action=\"service\" title=\"" + escapeHtml(serviceLabel) + "\" aria-label=\"" + escapeHtml(serviceLabel) + "\"><i class=\"fa-solid fa-church\"></i></button>" +
                "      <button type=\"button\" class=\"" + favoriteClass + "\" data-song-id=\"" + escapeHtml(song.id) + "\" data-song-action=\"favorite\" title=\"" + escapeHtml(favoriteLabel) + "\" aria-label=\"" + escapeHtml(favoriteLabel) + "\"><i class=\"fa-solid fa-star\"></i></button>" +
                "    </div>" +
                "  </div>" +
                "</li>";
        }).join("");
    }

    if (songbookList) {
        songbookList.addEventListener("click", function (event) {
            var actionButton = event.target.closest("button.songbook-action-btn[data-song-id][data-song-action]");
            if (actionButton) {
                var actionSongId = actionButton.getAttribute("data-song-id") || "";
                var action = actionButton.getAttribute("data-song-action") || "";
                toggleSongFlag(action, actionSongId);
                return;
            }
            var button = event.target.closest("button.songbook-open-btn[data-song-id]");
            if (!button) {
                return;
            }
            var songId = button.getAttribute("data-song-id") || "";
            if (!songId) {
                return;
            }
            var targetSong = songs.find(function (song) {
                return song.id === songId;
            });
            if (!targetSong) {
                return;
            }
            openSongFullscreen(targetSong);
        });
    }

    if (songbookSearch) {
        songbookSearch.addEventListener("input", function () {
            searchQuery = songbookSearch.value || "";
            renderSongbook();
        });
    }

    if (songbookTabs && songbookTabs.length) {
        songbookTabs.forEach(function (tabButton) {
            tabButton.addEventListener("click", function () {
                setActiveSongbookTab(tabButton.getAttribute("data-songbook-tab"));
            });
        });
    }

    if (songbookFullscreenClose) {
        songbookFullscreenClose.addEventListener("click", function () {
            closeSongFullscreen();
        });
    }

    if (songbookFullscreen) {
        songbookFullscreen.addEventListener("click", function (event) {
            if (event.target === songbookFullscreen) {
                closeSongFullscreen();
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape" && songbookFullscreen && !songbookFullscreen.hidden) {
            closeSongFullscreen();
        }
    });

    window.addEventListener("hashchange", function () {
        if ((window.location.hash || "").toLowerCase() !== "#songbook") {
            closeSongFullscreen();
        }
    });

    document.addEventListener("njc:langchange", function () {
        setActiveSongbookTab(activeSongbookTab);
        if (activeSongId) {
            var activeSong = songs.find(function (song) { return song.id === activeSongId; });
            if (activeSong) {
                openSongFullscreen(activeSong);
            }
        }
    });

    fetchFirestoreSongs()
        .then(function (firestoreSongs) {
            songs = firestoreSongs;
            loadFailed = false;
            renderSongbook();
        })
        .catch(function () {
            return fetchFallbackSongs().then(function (fallbackSongs) {
                songs = fallbackSongs;
                loadFailed = false;
                renderSongbook();
            });
        })
        .catch(function () {
            loadFailed = true;
            renderSongbook();
        });
})();
