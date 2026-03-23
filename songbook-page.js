(function () {
    var songbookList = document.getElementById("songbook-list");
    var songbookSearch = document.getElementById("songbook-search");
    var songbookCard = songbookList ? songbookList.closest(".card") : null;
    var songbookTabs = document.querySelectorAll("button[data-songbook-tab]");
    var songbookScriptButtons = document.querySelectorAll("button[data-songbook-script]");
    var songbookFullscreen = document.getElementById("songbook-fullscreen");
    var songbookFullscreenClose = document.getElementById("songbook-fullscreen-close");
    var songbookFullscreenTitle = document.getElementById("songbook-fullscreen-title");
    var songbookFullscreenAuthor = document.getElementById("songbook-fullscreen-author");
    var songbookFullscreenLyrics = document.getElementById("songbook-fullscreen-lyrics");
    var FIRESTORE_BASE_URL = "https://firestore.googleapis.com/v1/projects/songbook-add54/databases/(default)/documents/lyrics";
    var FIRESTORE_SERVICE_URL = "https://firestore.googleapis.com/v1/projects/songbook-add54/databases/(default)/documents/serviceSongs";
    var SONGBOOK_FALLBACK_URL = "https://raw.githubusercontent.com/simsonpeter/njcsongbook/main/songs.json";
    var SONGBOOK_FAVORITES_KEY = "njc_songbook_favorites_v1";
    var SONGBOOK_SCRIPT_KEY = "njc_songbook_script_mode_v1";
    var FIRESTORE_PAGE_SIZE = 300;
    var FIRESTORE_MAX_PAGES = 25;
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var songs = [];
    var visibleSongs = [];
    var serviceSongs = [];
    var loadFailed = false;
    var serviceLoadFailed = false;
    var serviceLoading = true;
    var serviceBusy = false;
    var activeSongId = "";
    var searchQuery = "";
    var activeSongbookTab = "songs";
    var favoriteMap = getStoredFlagMap(SONGBOOK_FAVORITES_KEY);
    var scriptMode = getStoredScriptMode();
    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            if (songbookCard && typeof window.NjcI18n.tForElement === "function") {
                return window.NjcI18n.tForElement(songbookCard, key, fallback);
            }
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getLocale() {
        if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
            if (songbookCard && typeof window.NjcI18n.getLocaleForElement === "function") {
                return window.NjcI18n.getLocaleForElement(songbookCard);
            }
            return window.NjcI18n.getLocale();
        }
        return "en-GB";
    }

    function getLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
    }

    function getStoredScriptMode() {
        try {
            var raw = String(window.localStorage.getItem(SONGBOOK_SCRIPT_KEY) || "").trim().toLowerCase();
            if (raw === "tamil" || raw === "romanized") {
                return raw;
            }
        } catch (err) {
            return "";
        }
        return "";
    }

    function saveStoredScriptMode(mode) {
        try {
            if (!mode) {
                window.localStorage.removeItem(SONGBOOK_SCRIPT_KEY);
                return;
            }
            window.localStorage.setItem(SONGBOOK_SCRIPT_KEY, mode);
        } catch (err) {
            return;
        }
    }

    function getEffectiveScriptMode() {
        if (scriptMode === "tamil" || scriptMode === "romanized") {
            return scriptMode;
        }
        return getLanguage() === "en" ? "romanized" : "tamil";
    }

    function preferRomanized() {
        return getEffectiveScriptMode() === "romanized";
    }

    function updateScriptSwitcherUI() {
        var activeMode = getEffectiveScriptMode();
        if (!songbookScriptButtons || !songbookScriptButtons.length) {
            return;
        }
        songbookScriptButtons.forEach(function (button) {
            var mode = String(button.getAttribute("data-songbook-script") || "").trim().toLowerCase();
            var isActive = mode === activeMode;
            button.classList.toggle("active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    }

    function reopenActiveSongIfOpen() {
        if (!activeSongId) {
            return;
        }
        var activeSong = visibleSongs.find(function (song) {
            return song.id === activeSongId;
        }) || songs.find(function (song) {
            return song.id === activeSongId;
        });
        if (activeSong) {
            openSongFullscreen(activeSong);
        }
    }

    function setSongbookScriptMode(mode, persist) {
        var normalized = String(mode || "").trim().toLowerCase();
        if (normalized !== "tamil" && normalized !== "romanized") {
            normalized = "";
        }
        scriptMode = normalized;
        if (persist) {
            saveStoredScriptMode(normalized);
        }
        updateScriptSwitcherUI();
        renderSongbook();
        reopenActiveSongIfOpen();
    }

    function getCurrentUser() {
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            return window.NjcAuth.getUser();
        }
        return null;
    }

    function normalizeEmail(value) {
        return String(value || "").trim().toLowerCase();
    }

    function isAdminUser() {
        var user = getCurrentUser();
        return normalizeEmail(user && user.email) === ADMIN_EMAIL;
    }

    function getCurrentUserUid() {
        var user = getCurrentUser();
        return String(user && user.uid || "").trim();
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

    function isFavorite(songId) {
        return Boolean(favoriteMap && favoriteMap[songId]);
    }

    function toggleFavorite(songId) {
        if (!songId) {
            return;
        }
        if (isFavorite(songId)) {
            delete favoriteMap[songId];
        } else {
            favoriteMap[songId] = true;
        }
        saveFlagMap(SONGBOOK_FAVORITES_KEY, favoriteMap);
        renderSongbook();
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

    function getFirestoreInteger(fields, keys) {
        if (!fields || typeof fields !== "object") {
            return 0;
        }
        for (var i = 0; i < keys.length; i += 1) {
            var key = keys[i];
            var field = fields[key];
            if (field && typeof field.integerValue !== "undefined") {
                var intValue = Number(field.integerValue);
                if (Number.isFinite(intValue)) {
                    return intValue;
                }
            }
            if (field && typeof field.doubleValue !== "undefined") {
                var doubleValue = Number(field.doubleValue);
                if (Number.isFinite(doubleValue)) {
                    return doubleValue;
                }
            }
        }
        return 0;
    }

    function normalizeSong(item, index) {
        var source = item && typeof item === "object" ? item : {};
        var title = String(source.title || "").trim();
        if (!title) {
            return null;
        }
        var author = String(source.author || "").trim();
        var lyrics = String(source.lyrics || "").trim();
        var titleRomanized = String(source.titleRomanized || "").trim();
        var lyricsRomanized = String(source.lyricsRomanized || "").trim();
        return {
            id: String(source.id || ("song-" + index)),
            title: title,
            titleRomanized: titleRomanized,
            author: author,
            lyrics: lyrics,
            lyricsRomanized: lyricsRomanized
        };
    }

    function songFromPlainFirestoreFields(data, docId) {
        var d = data && typeof data === "object" ? data : {};
        var title = String(
            d.songTitle || d.title || d.displayName || d.name || d.songName || d.Title || d.SongTitle || ""
        ).trim();
        if (!title) {
            return null;
        }
        var lyrics = String(
            d.lyricsText || d.lyrics || d.content || d.body || d.text || d.lyric || d.Lyrics || d.lyrics_text || ""
        ).trim();
        var author = String(
            d.author || d.composer || d.writer || d.singer || d.lyricist || d.Author || ""
        ).trim();
        return normalizeSong({
            id: String(docId || d.id || "").trim() || ("song-" + String(Date.now())),
            title: title,
            titleRomanized: String(d.songTitleRomanized || d.titleRomanized || d.title_romanized || "").trim(),
            author: author,
            lyrics: lyrics,
            lyricsRomanized: String(d.lyricsTextRomanized || d.lyricsRomanized || d.lyrics_romanized || "").trim()
        }, 0);
    }

    function normalizeFirestoreSong(doc, index) {
        var source = doc && typeof doc === "object" ? doc : {};
        if (typeof source.data === "function") {
            var snapData = source.data();
            var sid = typeof source.id === "string" ? source.id : "";
            return songFromPlainFirestoreFields(snapData, sid);
        }
        var fields = source.fields && typeof source.fields === "object" ? source.fields : {};
        var title = getFirestoreString(fields, ["songTitle", "title", "displayName", "name"]);
        if (!title) {
            return null;
        }
        var lyrics = getFirestoreString(fields, ["lyricsText", "lyrics", "content", "body", "text"]);
        var author = getFirestoreString(fields, ["author", "composer", "writer", "singer", "lyricist"]);
        var docName = String(source.name || "");
        var id = docName.split("/").pop() || ("song-" + index);
        return normalizeSong({
            id: id,
            title: title,
            titleRomanized: getFirestoreString(fields, ["songTitleRomanized", "titleRomanized"]),
            author: author,
            lyrics: lyrics,
            lyricsRomanized: getFirestoreString(fields, ["lyricsTextRomanized", "lyricsRomanized"])
        }, index);
    }

    function getSongDisplayTitle(song) {
        if (!song) {
            return "";
        }
        if (preferRomanized() && String(song.titleRomanized || "").trim()) {
            return String(song.titleRomanized || "").trim();
        }
        return String(song.title || "").trim();
    }

    function getSongDisplayLyrics(song) {
        if (!song) {
            return "";
        }
        if (preferRomanized() && String(song.lyricsRomanized || "").trim()) {
            return String(song.lyricsRomanized || "").trim();
        }
        return String(song.lyrics || "").trim();
    }

    function serviceSongFromPlainData(data, docId) {
        var d = data && typeof data === "object" ? data : {};
        return {
            id: String(docId || ""),
            order: Number(d.order) || 0,
            songTitle: String(d.songTitle || d.title || "").trim()
        };
    }

    function normalizeServiceSongDoc(doc, index) {
        var source = doc && typeof doc === "object" ? doc : {};
        if (typeof source.data === "function") {
            return serviceSongFromPlainData(source.data(), source.id);
        }
        var fields = source.fields && typeof source.fields === "object" ? source.fields : {};
        var docName = String(source.name || "");
        var id = docName.split("/").pop() || ("service-song-" + index);
        var order = getFirestoreInteger(fields, ["order"]);
        return {
            id: id,
            order: order,
            songTitle: getFirestoreString(fields, ["songTitle", "title"])
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

    function buildFirestoreUrl(pageToken) {
        var params = new URLSearchParams({
            pageSize: String(FIRESTORE_PAGE_SIZE)
        });
        if (pageToken) {
            params.set("pageToken", pageToken);
        }
        return FIRESTORE_BASE_URL + "?" + params.toString();
    }

    function buildServiceUrl(pageToken) {
        var params = new URLSearchParams({
            pageSize: "300"
        });
        if (pageToken) {
            params.set("pageToken", pageToken);
        }
        return FIRESTORE_SERVICE_URL + "?" + params.toString();
    }

    function fetchFirestoreSongsViaSdk() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.resolve([]);
        }
        try {
            var db = window.firebase.firestore();
            var FieldPath = window.firebase.firestore.FieldPath;
            var all = [];
            var pageSize = FIRESTORE_PAGE_SIZE;
            function fetchPageAfter(lastDoc, pageCount) {
                if (pageCount >= FIRESTORE_MAX_PAGES) {
                    return Promise.resolve(all);
                }
                var q = db.collection("lyrics").orderBy(FieldPath.documentId()).limit(pageSize);
                if (lastDoc) {
                    q = q.startAfter(lastDoc);
                }
                return q.get().then(function (snap) {
                    snap.forEach(function (doc) {
                        var song = songFromPlainFirestoreFields(doc.data(), doc.id);
                        if (song) {
                            all.push(song);
                        }
                    });
                    if (snap.size < pageSize) {
                        return all;
                    }
                    var last = snap.docs[snap.docs.length - 1];
                    return fetchPageAfter(last, pageCount + 1);
                });
            }
            return fetchPageAfter(null, 0).catch(function () {
                return db.collection("lyrics").get().then(function (snap) {
                    var out = [];
                    snap.forEach(function (doc) {
                        var song = songFromPlainFirestoreFields(doc.data(), doc.id);
                        if (song) {
                            out.push(song);
                        }
                    });
                    return out;
                });
            });
        } catch (err) {
            return Promise.resolve([]);
        }
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
                        throw new Error("Firestore songs fetch failed");
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
            return docs.map(normalizeFirestoreSong).filter(function (song) {
                return Boolean(song);
            });
        });
    }

    function fetchServiceSongsViaSdk() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.resolve([]);
        }
        try {
            var db = window.firebase.firestore();
            return db.collection("serviceSongs").get().then(function (snap) {
                var out = [];
                snap.forEach(function (doc) {
                    var row = serviceSongFromPlainData(doc.data(), doc.id);
                    if (row && row.id) {
                        out.push(row);
                    }
                });
                return out;
            });
        } catch (err) {
            return Promise.resolve([]);
        }
    }

    function fetchServiceSongs() {
        var allDocuments = [];
        function fetchPage(pageToken) {
            return fetch(buildServiceUrl(pageToken), { cache: "no-store" })
                .then(function (response) {
                    if (!response.ok) {
                        throw new Error("Service songs fetch failed");
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
                    return fetchPage(token);
                });
        }
        return fetchPage("").then(function (docs) {
            return docs.map(normalizeServiceSongDoc).filter(function (entry) {
                return Boolean(entry && entry.id);
            });
        });
    }

    function loadMainSongsFromCloud() {
        return fetchFirestoreSongsViaSdk()
            .then(function (sdkSongs) {
                if (sdkSongs && sdkSongs.length) {
                    return sdkSongs;
                }
                return fetchFirestoreSongs();
            })
            .then(function (firestoreSongs) {
                if (firestoreSongs && firestoreSongs.length) {
                    return firestoreSongs;
                }
                return fetchFallbackSongs();
            })
            .catch(function () {
                return fetchFallbackSongs();
            })
            .then(function (finalSongs) {
                songs = finalSongs || [];
                loadFailed = false;
                renderSongbook();
                return null;
            })
            .catch(function () {
                loadFailed = true;
                renderSongbook();
                return null;
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
                return getSongsPayload(payload).map(normalizeSong).filter(function (song) {
                    return Boolean(song);
                });
            });
    }

    function sortServiceSongs(list) {
        return (Array.isArray(list) ? list.slice() : []).sort(function (a, b) {
            var orderA = Number(a && a.order);
            var orderB = Number(b && b.order);
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return String(a && a.songTitle || "").localeCompare(String(b && b.songTitle || ""), getLocale(), {
                sensitivity: "base",
                numeric: true
            });
        });
    }

    function isInService(songId) {
        return serviceSongs.some(function (entry) {
            return entry.id === songId;
        });
    }

    function serviceDocUrl(songId) {
        return FIRESTORE_SERVICE_URL + "/" + encodeURIComponent(songId);
    }

    function patchServiceSong(songId, data) {
        return fetch(serviceDocUrl(songId), {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                fields: data
            })
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Failed to patch service song");
            }
            return response.json();
        });
    }

    function addSongToService(songId) {
        if (!isAdminUser()) {
            return Promise.resolve();
        }
        if (!songId || isInService(songId)) {
            return Promise.resolve();
        }
        var song = songs.find(function (item) {
            return item.id === songId;
        });
        if (!song) {
            return Promise.resolve();
        }
        var nextOrder = sortServiceSongs(serviceSongs).length;
        return patchServiceSong(songId, {
            songTitle: { stringValue: String(song.title || "").trim() },
            order: { integerValue: String(nextOrder) },
            addedBy: { stringValue: getCurrentUserUid() || "" },
            addedAt: { timestampValue: new Date().toISOString() }
        }).then(function () {
            return null;
        });
    }

    function removeSongFromService(songId) {
        if (!isAdminUser()) {
            return Promise.resolve();
        }
        if (!songId) {
            return Promise.resolve();
        }
        return fetch(serviceDocUrl(songId), { method: "DELETE" })
            .then(function (response) {
                if (response.status !== 404 && !response.ok) {
                    throw new Error("Failed to remove service song");
                }
                var remaining = sortServiceSongs(serviceSongs).filter(function (entry) {
                    return entry.id !== songId;
                });
                return Promise.all(remaining.map(function (entry, index) {
                    return patchServiceSong(entry.id, {
                        songTitle: { stringValue: String(entry.songTitle || "").trim() },
                        order: { integerValue: String(index) }
                    });
                }));
            })
            .then(function () {
                return null;
            });
    }

    function toggleServiceSong(songId) {
        if (!isAdminUser() || !songId || serviceBusy) {
            return Promise.resolve();
        }
        serviceBusy = true;
        var action = isInService(songId) ? removeSongFromService(songId) : addSongToService(songId);
        return action
            .then(function () {
                return loadServiceSongs(true);
            })
            .finally(function () {
                serviceBusy = false;
            });
    }

    function getSongsForActiveTab() {
        if (activeSongbookTab === "service") {
            return sortServiceSongs(serviceSongs).map(function (entry, index) {
                var sourceSong = songs.find(function (song) {
                    return song.id === entry.id;
                });
                var fallbackTitle = String(entry.songTitle || "").trim() || T("songbook.unknownSong", "Unknown song");
                var normalized = sourceSong || normalizeSong({
                    id: entry.id,
                    title: fallbackTitle,
                    author: "",
                    lyrics: ""
                }, index);
                return {
                    id: normalized.id,
                    title: normalized.title,
                    titleRomanized: normalized.titleRomanized,
                    author: normalized.author,
                    lyrics: normalized.lyrics,
                    lyricsRomanized: normalized.lyricsRomanized,
                    serviceOrder: index + 1
                };
            });
        }
        if (activeSongbookTab === "favorite") {
            return songs.filter(function (song) {
                return isFavorite(song.id);
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
                song.titleRomanized || "",
                song.author || "",
                song.lyrics || "",
                song.lyricsRomanized || ""
            ].join(" ").toLowerCase();
            return searchable.indexOf(query) >= 0;
        });
        if (activeSongbookTab === "service") {
            return filtered;
        }
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
        var displayTitle = getSongDisplayTitle(song) || song.title || "-";
        var displayLyrics = getSongDisplayLyrics(song) || T("songbook.noLyrics", "Lyrics not available");
        if (songbookFullscreenTitle) {
            songbookFullscreenTitle.textContent = displayTitle;
        }
        if (songbookFullscreenAuthor) {
            songbookFullscreenAuthor.textContent = song.author
                ? (authorPrefix + ": " + song.author)
                : "";
        }
        if (songbookFullscreenLyrics) {
            songbookFullscreenLyrics.textContent = displayLyrics;
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
            visibleSongs = [];
            return;
        }

        if (activeSongbookTab === "service" && serviceLoading) {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.serviceLoadingTitle", "Loading service songs...")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.serviceLoadingBody", "Please wait while we load this week's service list.")) + "</p>" +
                "</li>";
            visibleSongs = [];
            return;
        }

        if (activeSongbookTab === "service" && serviceLoadFailed) {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.loadErrorTitle", "Could not load songbook")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.loadErrorBody", "Please check your connection and try again.")) + "</p>" +
                "</li>";
            visibleSongs = [];
            return;
        }

        if (!songs.length && activeSongbookTab !== "service") {
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.emptyTitle", "No songs yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.emptyBody", "Please try again later.")) + "</p>" +
                "</li>";
            visibleSongs = [];
            return;
        }

        var filtered = getFilteredSongs();
        if (!filtered.length) {
            if (activeSongbookTab === "service" && !searchQuery.trim()) {
                songbookList.innerHTML = "" +
                    "<li>" +
                    "  <h3>" + escapeHtml(T("songbook.serviceEmptyTitle", "No service songs")) + "</h3>" +
                    "  <p>" + escapeHtml(T("songbook.serviceEmptyBody", "Admin will add songs for the upcoming service.")) + "</p>" +
                    "</li>";
                visibleSongs = [];
                return;
            }
            if (activeSongbookTab === "favorite" && !searchQuery.trim()) {
                songbookList.innerHTML = "" +
                    "<li>" +
                    "  <h3>" + escapeHtml(T("songbook.favoriteEmptyTitle", "No favorite songs yet")) + "</h3>" +
                    "  <p>" + escapeHtml(T("songbook.favoriteEmptyBody", "Tap the star icon on any song to save favorites.")) + "</p>" +
                    "</li>";
                visibleSongs = [];
                return;
            }
            songbookList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("songbook.emptyTitle", "No songs yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("songbook.emptyBody", "Please try again later.")) + "</p>" +
                "</li>";
            visibleSongs = [];
            return;
        }

        visibleSongs = filtered.slice();
        songbookList.innerHTML = filtered.map(function (song) {
            var authorPrefix = T("songbook.authorPrefix", "Author");
            var favoriteLabel = isFavorite(song.id)
                ? T("songbook.removeFavorite", "Remove favorite")
                : T("songbook.addFavorite", "Add favorite");
            var favoriteClass = isFavorite(song.id) ? "songbook-action-btn active" : "songbook-action-btn";
            var orderPrefix = (activeSongbookTab === "service" && song.serviceOrder)
                ? ("<span class=\"songbook-service-order\">" + String(song.serviceOrder) + ".</span>")
                : "";
            var actionButtons = [];
            if (activeSongbookTab !== "service") {
                actionButtons.push(
                    "<button type=\"button\" class=\"" + favoriteClass + "\" data-song-id=\"" + escapeHtml(song.id) + "\" data-song-action=\"favorite\" title=\"" + escapeHtml(favoriteLabel) + "\" aria-label=\"" + escapeHtml(favoriteLabel) + "\"><i class=\"fa-solid fa-star\"></i></button>"
                );
            }
            var actionsHtml = actionButtons.length
                ? ("<div class=\"songbook-item-actions\">" + actionButtons.join("") + "</div>")
                : "";
            return "" +
                "<li class=\"songbook-item\">" +
                "  <div class=\"songbook-item-row\">" +
                "    <button type=\"button\" class=\"songbook-open-btn\" data-song-id=\"" + escapeHtml(song.id) + "\">" +
                "        <h3 class=\"songbook-title-line\">" + orderPrefix + "<span>" + escapeHtml(getSongDisplayTitle(song) || song.title) + "</span></h3>" +
                (song.author ? "        <p class=\"songbook-author\">" + escapeHtml(authorPrefix + ": " + song.author) + "</p>" : "") +
                "    </button>" +
                actionsHtml +
                "  </div>" +
                "</li>";
        }).join("");
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

    function loadServiceSongs(forceRender) {
        serviceLoading = true;
        if (activeSongbookTab === "service") {
            renderSongbook();
        }
        return fetchServiceSongsViaSdk()
            .then(function (sdkRows) {
                if (sdkRows && sdkRows.length) {
                    return sdkRows;
                }
                return fetchServiceSongs();
            })
            .then(function (entries) {
                serviceSongs = entries;
                serviceLoadFailed = false;
            })
            .catch(function () {
                serviceSongs = [];
                serviceLoadFailed = true;
            })
            .finally(function () {
                serviceLoading = false;
                if (forceRender || activeSongbookTab === "service") {
                    renderSongbook();
                }
            });
    }

    function toggleSongFlag(action, songId) {
        if (!songId) {
            return Promise.resolve();
        }
        if (action === "favorite") {
            toggleFavorite(songId);
            return Promise.resolve();
        }
        if (action === "service") {
            return toggleServiceSong(songId);
        }
        return Promise.resolve();
    }

    function openSongFromOpener(opener) {
        if (!opener) {
            return;
        }
        var songId = opener.getAttribute("data-song-id") || "";
        if (!songId) {
            return;
        }
        var targetSong = visibleSongs.find(function (song) {
            return song.id === songId;
        }) || songs.find(function (song) {
            return song.id === songId;
        });
        if (!targetSong) {
            return;
        }
        openSongFullscreen(targetSong);
    }

    if (songbookList) {
        songbookList.addEventListener("click", function (event) {
            var actionButton = event.target.closest("button.songbook-action-btn[data-song-id][data-song-action]");
            if (actionButton) {
                var actionSongId = actionButton.getAttribute("data-song-id") || "";
                var action = actionButton.getAttribute("data-song-action") || "";
                toggleSongFlag(action, actionSongId).catch(function () {
                    return null;
                });
                return;
            }
            var opener = event.target.closest("button.songbook-open-btn[data-song-id]");
            if (!opener) {
                return;
            }
            openSongFromOpener(opener);
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

    if (songbookScriptButtons && songbookScriptButtons.length) {
        songbookScriptButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                var targetMode = button.getAttribute("data-songbook-script");
                setSongbookScriptMode(targetMode, true);
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
        if (!scriptMode) {
            updateScriptSwitcherUI();
        }
        setActiveSongbookTab(activeSongbookTab);
        reopenActiveSongIfOpen();
    });

    document.addEventListener("njc:cardlangchange", function () {
        if (!scriptMode) {
            updateScriptSwitcherUI();
        }
        setActiveSongbookTab(activeSongbookTab);
        reopenActiveSongIfOpen();
    });

    document.addEventListener("njc:authchange", function () {
        loadMainSongsFromCloud();
        loadServiceSongs(false);
    });

    /* Prefer Firebase SDK (respects rules + auth). REST list is unauthenticated and usually 403. */
    function startSongbookLoads() {
        loadMainSongsFromCloud();
        loadServiceSongs(false);
    }

    if (window.NjcAuth && typeof window.NjcAuth.onStateChange === "function") {
        window.NjcAuth.onStateChange(function () {
            startSongbookLoads();
        });
    } else {
        startSongbookLoads();
    }

    window.setTimeout(function () {
        if (!songs.length && !loadFailed) {
            startSongbookLoads();
        }
    }, 800);
    updateScriptSwitcherUI();
    setActiveSongbookTab("songs");
})();
