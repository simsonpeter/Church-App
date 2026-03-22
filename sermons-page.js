(function () {
            var STATE_KEY = "njc_sermon_player_v1";
            var FAVORITES_KEY = "njc_sermon_favorites_v1";
            var sermonsUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/sermons.json";
            var adminSermonsUrl = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";
            var latestSermonsList = document.getElementById("latest-sermons-list");
            var showMoreSermonsButton = document.getElementById("show-more-sermons");
            var sermonSearch = document.getElementById("sermon-search");
            var sermonFilterButton = document.getElementById("sermon-filter-btn");
            var sermonSearchButton = document.getElementById("sermon-search-btn");
            var sermonSearchNote = document.getElementById("sermon-search-note");
            var sermonFilterGroups = document.getElementById("sermon-filter-groups");
            var sermonSpeakerChips = document.getElementById("sermon-speaker-chips");
            var sermonMonthChips = document.getElementById("sermon-month-chips");
            var sermonSavedChips = document.getElementById("sermon-saved-chips");
            var archiveNote = document.getElementById("sermon-archive-note");
            var latestSermonsCard = latestSermonsList ? latestSermonsList.closest(".card") : null;
            var archiveCard = archiveNote ? archiveNote.closest(".card") : null;
            var allSermons = [];
            var visibleCount = 4;
            var currentSermonIndex = -1;
            var currentSermon = null;
            var sermonsLoaded = false;
            var sermonsLoadFailed = false;
            var hasRestoredPlayerState = false;
            var searchQuery = "";
            var searchTriggered = false;
            var selectedSpeaker = "";
            var selectedMonth = "";
            var selectedSavedOnly = false;
            var filterPanelPinned = false;

            var playerOverlay = document.getElementById("sermon-player");
            var playerBackdrop = document.getElementById("sermon-player-backdrop");
            var playerClose = document.getElementById("sermon-player-close");
            var playerMinimize = document.getElementById("sermon-player-minimize");
            var playerMenu = document.getElementById("player-wheel-menu");
            var playerPrev = document.getElementById("player-prev");
            var playerNext = document.getElementById("player-next");
            var playerPlay = document.getElementById("player-play");
            var playerCenter = document.getElementById("player-center");
            var playerTitle = document.getElementById("player-sermon-title");
            var playerSubtitle = document.getElementById("player-sermon-subtitle");
            var playerDate = document.getElementById("player-sermon-date");
            var playerSeek = document.getElementById("player-seek");
            var playerTime = document.getElementById("player-time");
            var playerSpeed = document.getElementById("player-speed");
            var playerSleep = document.getElementById("player-sleep");
            var playerSleepNote = document.getElementById("player-sleep-note");
            var sermonAudio = document.getElementById("sermon-audio");
            var miniPlayer = document.getElementById("mini-sermon-player");
            var miniPlayerOpen = document.getElementById("mini-player-open");
            var miniPlayerTitle = document.getElementById("mini-player-title");
            var miniPlayerTime = document.getElementById("mini-player-time");
            var miniPlayerPlay = document.getElementById("mini-player-play");
            var miniPlayerClose = document.getElementById("mini-player-close");
            var sleepTimerId = null;
            var marqueeRefreshTimerId = null;

            function T(key, fallback, sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
                    if (sourceElement && typeof window.NjcI18n.tForElement === "function") {
                        return window.NjcI18n.tForElement(sourceElement, key, fallback);
                    }
                    return window.NjcI18n.t(key, fallback);
                }
                return fallback || key;
            }

            function getLocale(sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
                    if (sourceElement && typeof window.NjcI18n.getLocaleForElement === "function") {
                        return window.NjcI18n.getLocaleForElement(sourceElement);
                    }
                    return window.NjcI18n.getLocale();
                }
                return "en-BE";
            }

            function getStoredState() {
                try {
                    var raw = window.localStorage.getItem(STATE_KEY);
                    return raw ? JSON.parse(raw) : null;
                } catch (err) {
                    return null;
                }
            }

            function setStoredState(state) {
                try {
                    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
                } catch (err) {
                    return null;
                }
                return null;
            }

            function clearStoredState() {
                try {
                    window.localStorage.removeItem(STATE_KEY);
                } catch (err) {
                    return null;
                }
                return null;
            }

            function getFavoritesMap() {
                try {
                    var raw = window.localStorage.getItem(FAVORITES_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (err) {
                    return {};
                }
            }

            function saveFavoritesMap(map) {
                try {
                    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(map));
                    document.dispatchEvent(new CustomEvent("njc:favorites-updated", {
                        detail: { favoritesMap: map || {} }
                    }));
                } catch (err) {
                    return null;
                }
                return null;
            }

            function getFavoriteKey(sermon) {
                if (!sermon) {
                    return "";
                }
                if (sermon.audioUrl) {
                    return "audio:" + sermon.audioUrl;
                }
                return "title:" + (sermon.title || "") + "|" + (sermon.dateKey || "");
            }

            function isFavoriteSermon(sermon) {
                var key = getFavoriteKey(sermon);
                if (!key) {
                    return false;
                }
                var map = getFavoritesMap();
                return Boolean(map[key]);
            }

            function toggleFavoriteSermon(sermon) {
                var key = getFavoriteKey(sermon);
                if (!key) {
                    return false;
                }
                var map = getFavoritesMap();
                if (map[key]) {
                    delete map[key];
                    saveFavoritesMap(map);
                    return false;
                }
                map[key] = Date.now();
                saveFavoritesMap(map);
                return true;
            }

            function escapeHtml(value) {
                return String(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            }

            function toDateObject(value) {
                var date = new Date(String(value || "") + "T00:00:00");
                return Number.isNaN(date.getTime()) ? null : date;
            }

            function toDisplayDate(dateObj, sourceElement) {
                if (!dateObj) {
                    return T("sermons.dateUnavailable", "Date not available", sourceElement);
                }
                return dateObj.toLocaleDateString(getLocale(sourceElement), {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                });
            }

            function getSpeakerAvatarText(speakerName) {
                var clean = String(speakerName || "").trim();
                if (!clean) {
                    return "NJC";
                }
                var parts = clean.split(/\s+/).filter(Boolean);
                if (!parts.length) {
                    return clean.slice(0, 2).toUpperCase();
                }
                if (parts.length === 1) {
                    return parts[0].slice(0, 2).toUpperCase();
                }
                return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
            }

            function normalizeSermon(item) {
                if (!item || !item.title) {
                    return null;
                }

                var dateObj = toDateObject(item.date);
                return {
                    title: item.title,
                    subtitle: item.subtitle || "",
                    speaker: item.speaker || "",
                    audioUrl: item.audioUrl || "",
                    dateObj: dateObj,
                    dateKey: dateObj ? dateObj.getTime() : -1,
                    monthKey: dateObj
                        ? (String(dateObj.getFullYear()) + "-" + String(dateObj.getMonth() + 1).padStart(2, "0"))
                        : ""
                };
            }

            function fetchAdminSermons() {
                var timeoutMs = 15000;
                var timeoutPromise = new Promise(function (_, reject) {
                    setTimeout(function () { reject(new Error("Timeout")); }, timeoutMs);
                });
                return Promise.race([
                    fetch(adminSermonsUrl + "?ts=" + String(Date.now()), { cache: "no-store" })
                        .then(function (response) {
                            if (response.status === 404) {
                                return [];
                            }
                            if (!response.ok) {
                                throw new Error("Failed to load admin sermons");
                            }
                            return response.json();
                        }),
                    timeoutPromise
                ]).then(function (payload) {
                    if (Array.isArray(payload)) return payload;
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                }).catch(function () {
                    return [];
                });
            }

            function renderLoadError() {
                latestSermonsList.innerHTML = "" +
                    "<li>" +
                    "  <h3>" + escapeHtml(T("sermons.loadErrorTitle", "Could not load sermons", latestSermonsCard)) + "</h3>" +
                    "  <p>" + escapeHtml(T("sermons.loadErrorBody", "Please refresh and try again.", latestSermonsCard)) + "</p>" +
                    "</li>";
                archiveNote.textContent = T("sermons.archiveUnavailable", "Sermon archive is temporarily unavailable.", archiveCard);
                sermonSearchNote.hidden = true;
                showMoreSermonsButton.hidden = true;
                if (sermonFilterGroups) {
                    sermonFilterGroups.hidden = true;
                }
            }

            function toMonthLabel(monthKey) {
                if (!monthKey) {
                    return "";
                }
                var parts = monthKey.split("-");
                if (parts.length !== 2) {
                    return monthKey;
                }
                var year = Number(parts[0]);
                var month = Number(parts[1]);
                if (!Number.isFinite(year) || !Number.isFinite(month)) {
                    return monthKey;
                }
                var dateObj = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
                return new Intl.DateTimeFormat(getLocale(latestSermonsCard), {
                    timeZone: "UTC",
                    month: "long",
                    year: "numeric"
                }).format(dateObj);
            }

            function buildFilterChips() {
                var allLabel = T("sermons.filterAll", "All", latestSermonsCard);
                var uniqueSpeakers = [];
                var seenSpeakers = {};
                allSermons.forEach(function (sermon) {
                    var speaker = String(sermon.speaker || "").trim();
                    if (!speaker || seenSpeakers[speaker]) {
                        return;
                    }
                    seenSpeakers[speaker] = true;
                    uniqueSpeakers.push(speaker);
                });

                var uniqueMonths = [];
                var seenMonths = {};
                allSermons.forEach(function (sermon) {
                    var monthKey = sermon.monthKey || "";
                    if (!monthKey || seenMonths[monthKey]) {
                        return;
                    }
                    seenMonths[monthKey] = true;
                    uniqueMonths.push(monthKey);
                });
                uniqueMonths.sort().reverse();

                var savedOnlyLabel = T("sermons.savedOnly", "Saved only", latestSermonsCard);

                sermonSpeakerChips.innerHTML = "";
                var allSpeakerButton = document.createElement("button");
                allSpeakerButton.type = "button";
                allSpeakerButton.className = "filter-chip" + (selectedSpeaker ? "" : " active");
                allSpeakerButton.setAttribute("data-speaker", "");
                allSpeakerButton.textContent = allLabel;
                sermonSpeakerChips.appendChild(allSpeakerButton);
                uniqueSpeakers.forEach(function (speaker) {
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "filter-chip" + (selectedSpeaker === speaker ? " active" : "");
                    button.setAttribute("data-speaker", speaker);
                    button.textContent = speaker;
                    sermonSpeakerChips.appendChild(button);
                });

                sermonMonthChips.innerHTML = "";
                var allMonthButton = document.createElement("button");
                allMonthButton.type = "button";
                allMonthButton.className = "filter-chip" + (selectedMonth ? "" : " active");
                allMonthButton.setAttribute("data-month", "");
                allMonthButton.textContent = allLabel;
                sermonMonthChips.appendChild(allMonthButton);
                uniqueMonths.forEach(function (monthKey) {
                    var button = document.createElement("button");
                    button.type = "button";
                    button.className = "filter-chip" + (selectedMonth === monthKey ? " active" : "");
                    button.setAttribute("data-month", monthKey);
                    button.textContent = toMonthLabel(monthKey);
                    sermonMonthChips.appendChild(button);
                });

                sermonSavedChips.innerHTML = "";
                var allSavedButton = document.createElement("button");
                allSavedButton.type = "button";
                allSavedButton.className = "filter-chip" + (selectedSavedOnly ? "" : " active");
                allSavedButton.setAttribute("data-saved", "all");
                allSavedButton.textContent = allLabel;
                sermonSavedChips.appendChild(allSavedButton);

                var savedOnlyButton = document.createElement("button");
                savedOnlyButton.type = "button";
                savedOnlyButton.className = "filter-chip" + (selectedSavedOnly ? " active" : "");
                savedOnlyButton.setAttribute("data-saved", "only");
                savedOnlyButton.textContent = savedOnlyLabel;
                sermonSavedChips.appendChild(savedOnlyButton);
            }

            function getFilteredSermons() {
                var query = searchTriggered ? searchQuery.trim().toLowerCase() : "";
                var records = allSermons.map(function (item, index) {
                    return { item: item, index: index };
                });
                return records.filter(function (record) {
                    var sermon = record.item;
                    if (selectedSpeaker && sermon.speaker !== selectedSpeaker) {
                        return false;
                    }
                    if (selectedMonth && sermon.monthKey !== selectedMonth) {
                        return false;
                    }
                    if (selectedSavedOnly && !isFavoriteSermon(sermon)) {
                        return false;
                    }
                    if (!query) {
                        return true;
                    }
                    var searchable = [
                        sermon.title || "",
                        sermon.subtitle || "",
                        sermon.speaker || "",
                        toDisplayDate(sermon.dateObj, latestSermonsCard)
                    ].join(" ").toLowerCase();
                    return searchable.indexOf(query) >= 0;
                });
            }

            function applySermonTextMarquee() {
                if (!latestSermonsList) {
                    return;
                }
                latestSermonsList.querySelectorAll(".sermon-marquee-track").forEach(function (track) {
                    track.classList.remove("marquee");
                    var textNode = track.querySelector(".sermon-marquee-text");
                    if (!textNode) {
                        return;
                    }
                    if (textNode.scrollWidth > track.clientWidth + 4) {
                        track.classList.add("marquee");
                    }
                });
            }

            function scheduleSermonMarqueeRefresh() {
                window.requestAnimationFrame(applySermonTextMarquee);
                if (marqueeRefreshTimerId) {
                    window.clearTimeout(marqueeRefreshTimerId);
                }
                marqueeRefreshTimerId = window.setTimeout(function () {
                    applySermonTextMarquee();
                    marqueeRefreshTimerId = null;
                }, 220);
            }

            function renderSermons() {
                var filteredRecords = getFilteredSermons();
                var hasSearch = searchQuery.trim().length > 0;
                var hasActiveSearch = searchTriggered && hasSearch;
                var hasFilters = Boolean(selectedSpeaker || selectedMonth || selectedSavedOnly);
                var showTagGroups = filterPanelPinned || ((hasActiveSearch && filteredRecords.length > 0) || hasFilters);
                if (sermonFilterButton) {
                    sermonFilterButton.classList.toggle("active", showTagGroups);
                    sermonFilterButton.setAttribute("aria-pressed", showTagGroups ? "true" : "false");
                    sermonFilterButton.title = T("sermons.filterToggle", "Toggle filters", latestSermonsCard);
                }

                if (sermonFilterGroups) {
                    sermonFilterGroups.hidden = !showTagGroups;
                }
                if (showTagGroups) {
                    buildFilterChips();
                }

                if (!allSermons.length) {
                    latestSermonsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("sermons.noSermonsTitle", "No sermons available yet", latestSermonsCard)) + "</h3>" +
                        "  <p>" + escapeHtml(T("sermons.noSermonsBody", "Please check back soon.", latestSermonsCard)) + "</p>" +
                        "</li>";
                    showMoreSermonsButton.hidden = true;
                    sermonSearchNote.hidden = true;
                    archiveNote.textContent = T("sermons.archiveEmpty", "No sermon archive available yet.", archiveCard);
                    if (sermonFilterGroups) {
                        sermonFilterGroups.hidden = true;
                    }
                    return;
                }

                if (!filteredRecords.length) {
                    latestSermonsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("sermons.searchNoResultsTitle", "No sermons match your search", latestSermonsCard)) + "</h3>" +
                        "  <p>" + escapeHtml(T("sermons.searchNoResultsBody", "Try another keyword.", latestSermonsCard)) + "</p>" +
                        "</li>";
                    showMoreSermonsButton.hidden = true;
                    sermonSearchNote.hidden = false;
                    sermonSearchNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                        ? window.NjcI18n.formatCount(T("sermons.searchMatches", "{count} results found.", latestSermonsCard), 0)
                        : "0 results found.";
                    archiveNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                        ? window.NjcI18n.formatCount(T("sermons.archiveTotal", "Total sermons available: {count}.", archiveCard), allSermons.length)
                        : ("Total sermons available: " + allSermons.length + ".");
                    return;
                }

                var visible = (hasActiveSearch || hasFilters) ? filteredRecords : filteredRecords.slice(0, visibleCount);
                latestSermonsList.innerHTML = visible.map(function (record) {
                    var sermon = record.item;
                    var sermonIndex = record.index;
                    var tamilTitle = String(sermon.title || "").trim() || "-";
                    var englishTitle = String(sermon.subtitle || "").trim() || tamilTitle;
                    var title = escapeHtml(tamilTitle);
                    var englishLine = escapeHtml(englishTitle);
                    var speakerPrefix = escapeHtml(T("sermons.speakerPrefix", "Speaker", latestSermonsCard));
                    var speakerName = String(sermon.speaker || "").trim() || "-";
                    var speakerLine = speakerPrefix + ": " + escapeHtml(speakerName);
                    var avatarText = escapeHtml(getSpeakerAvatarText(sermon.speaker));
                    var dateText = toDisplayDate(sermon.dateObj, latestSermonsCard);

                    return "" +
                        "<li class=\"sermon-item\">" +
                        "  <div class=\"sermon-item-row\">" +
                        "    <button class=\"sermon-open-btn\" type=\"button\" data-sermon-index=\"" + sermonIndex + "\"" + (sermon.audioUrl ? "" : " disabled") + ">" +
                        "      <div class=\"sermon-open-top\">" +
                        "          <span class=\"sermon-speaker-avatar\" aria-hidden=\"true\">" + avatarText + "</span>" +
                        "          <div class=\"sermon-open-main\">" +
                        "              <h3 class=\"sermon-line sermon-line-tamil\"><span class=\"sermon-marquee-track\"><span class=\"sermon-marquee-text\" data-marquee-text=\"" + title + "\">" + title + "</span></span></h3>" +
                        "              <p class=\"sermon-line sermon-line-english\"><span class=\"sermon-marquee-track\"><span class=\"sermon-marquee-text\" data-marquee-text=\"" + englishLine + "\">" + englishLine + "</span></span></p>" +
                        "              <p class=\"sermon-line sermon-line-speaker\"><span class=\"sermon-marquee-track\"><span class=\"sermon-marquee-text\" data-marquee-text=\"" + speakerLine + "\">" + speakerLine + "</span></span></p>" +
                        "              <p class=\"sermon-line sermon-line-date\"><span class=\"sermon-marquee-track\"><span class=\"sermon-marquee-text\" data-marquee-text=\"" + escapeHtml(dateText) + "\">" + escapeHtml(dateText) + "</span></span></p>" +
                        "          </div>" +
                        "      </div>" +
                        "    </button>" +
                        "  </div>" +
                        "</li>";
                }).join("");
                scheduleSermonMarqueeRefresh();

                showMoreSermonsButton.hidden = hasActiveSearch || hasFilters || visibleCount >= filteredRecords.length;
                sermonSearchNote.hidden = !(hasActiveSearch || hasFilters);
                if (hasActiveSearch || hasFilters) {
                    sermonSearchNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                        ? window.NjcI18n.formatCount(T("sermons.searchMatches", "{count} results found.", latestSermonsCard), filteredRecords.length)
                        : (filteredRecords.length + " results found.");
                }
                archiveNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                    ? window.NjcI18n.formatCount(T("sermons.archiveTotal", "Total sermons available: {count}.", archiveCard), allSermons.length)
                    : ("Total sermons available: " + allSermons.length + ".");
            }

            function formatTime(seconds) {
                if (!Number.isFinite(seconds) || seconds < 0) {
                    return "00:00";
                }
                var mins = Math.floor(seconds / 60);
                var secs = Math.floor(seconds % 60);
                var paddedSecs = secs < 10 ? "0" + secs : String(secs);
                return mins + ":" + paddedSecs;
            }

            function clearSleepTimer() {
                if (sleepTimerId) {
                    window.clearTimeout(sleepTimerId);
                    sleepTimerId = null;
                }
            }

            function setSleepNote(minutes) {
                if (!minutes || minutes <= 0) {
                    playerSleepNote.textContent = "";
                    return;
                }
                playerSleepNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                    ? window.NjcI18n.formatCount(T("sermons.sleepActive", "Stops in {count} min"), minutes)
                    : ("Stops in " + minutes + " min");
            }

            function setSleepTimer(minutes) {
                clearSleepTimer();
                var mins = Number(minutes);
                if (!Number.isFinite(mins) || mins <= 0) {
                    setSleepNote(0);
                    return;
                }
                setSleepNote(mins);
                sleepTimerId = window.setTimeout(function () {
                    sermonAudio.pause();
                    playerSleep.value = "0";
                    setSleepNote(0);
                    sleepTimerId = null;
                }, mins * 60000);
            }

            function updatePlayerButtonState() {
                var isPaused = sermonAudio.paused;
                var playIcon = isPaused ? "fa-play" : "fa-pause";
                playerPlay.innerHTML = "<i class=\"fa-solid " + playIcon + "\"></i>";
                playerCenter.innerHTML = "<i class=\"fa-solid " + playIcon + "\"></i>";
                miniPlayerPlay.innerHTML = "<i class=\"fa-solid " + playIcon + "\"></i>";
            }

            function persistSermonState(minimized) {
                if (!currentSermon || !sermonAudio.src) {
                    return;
                }

                setStoredState({
                    audioUrl: sermonAudio.currentSrc || currentSermon.audioUrl,
                    title: currentSermon.title || T("sermons.eyebrow", "Sermon"),
                    subtitle: currentSermon.subtitle || "",
                    speaker: currentSermon.speaker || "",
                    dateText: playerDate.textContent || "",
                    currentTime: sermonAudio.currentTime || 0,
                    isPlaying: !sermonAudio.paused,
                    minimized: Boolean(minimized)
                });
            }

            function refreshPlayerTime() {
                var current = sermonAudio.currentTime || 0;
                var duration = sermonAudio.duration || 0;
                var percent = duration > 0 ? Math.round((current / duration) * 100) : 0;
                playerSeek.value = String(percent);
                playerTime.textContent = formatTime(current) + " / " + formatTime(duration);
                miniPlayerTime.textContent = playerTime.textContent;
                persistSermonState(!miniPlayer.hidden && playerOverlay.hidden);
            }

            function toPlayerDateLine(sermon) {
                var baseDate = toDisplayDate(sermon.dateObj);
                if (!sermon.speaker) {
                    return baseDate;
                }
                return baseDate + " - " + T("sermons.speakerPrefix", "Speaker") + ": " + sermon.speaker;
            }

            function syncPlayerText() {
                if (!currentSermon) {
                    return;
                }
                playerTitle.textContent = currentSermon.title || T("sermons.eyebrow", "Sermon");
                playerSubtitle.textContent = currentSermon.subtitle || "";
                playerDate.textContent = toPlayerDateLine(currentSermon);
                miniPlayerTitle.textContent = currentSermon.title || T("sermons.nowPlaying", "Now Playing");
            }

            function openPlayer(index, autoplay) {
                if (index < 0 || index >= allSermons.length) {
                    return;
                }
                var sermon = allSermons[index];
                if (!sermon || !sermon.audioUrl) {
                    return;
                }

                currentSermonIndex = index;
                currentSermon = sermon;
                syncPlayerText();
                playerOverlay.hidden = false;
                miniPlayer.hidden = true;
                document.body.classList.add("sermon-player-open");

                if (sermonAudio.src !== sermon.audioUrl) {
                    sermonAudio.src = sermon.audioUrl;
                    sermonAudio.load();
                }

                sermonAudio.playbackRate = Number(playerSpeed.value) || 1;

                if (autoplay) {
                    sermonAudio.play().catch(function () {
                        return null;
                    });
                }
                updatePlayerButtonState();
                persistSermonState(false);
            }

            function minimizePlayer() {
                if (playerOverlay.hidden) {
                    return;
                }
                playerOverlay.hidden = true;
                miniPlayer.hidden = false;
                document.body.classList.remove("sermon-player-open");
                refreshPlayerTime();
                updatePlayerButtonState();
                persistSermonState(true);
            }

            function restorePlayer() {
                if (miniPlayer.hidden && !playerOverlay.hidden) {
                    return;
                }
                playerOverlay.hidden = false;
                miniPlayer.hidden = true;
                document.body.classList.add("sermon-player-open");
                refreshPlayerTime();
            }

            function closePlayer() {
                sermonAudio.pause();
                clearSleepTimer();
                playerSleep.value = "0";
                setSleepNote(0);
                playerOverlay.hidden = true;
                miniPlayer.hidden = true;
                document.body.classList.remove("sermon-player-open");
                updatePlayerButtonState();
                clearStoredState();
            }

            function playNext(delta) {
                if (!allSermons.length) {
                    return;
                }
                var nextIndex = currentSermonIndex + delta;
                if (nextIndex < 0) {
                    nextIndex = allSermons.length - 1;
                }
                if (nextIndex >= allSermons.length) {
                    nextIndex = 0;
                }
                openPlayer(nextIndex, true);
            }

            function togglePlayPause() {
                if (!sermonAudio.src && allSermons.length) {
                    openPlayer(0, true);
                    return;
                }
                if (sermonAudio.paused) {
                    sermonAudio.play().catch(function () {
                        return null;
                    });
                } else {
                    sermonAudio.pause();
                }
                updatePlayerButtonState();
            }

            showMoreSermonsButton.addEventListener("click", function () {
                visibleCount += 4;
                renderSermons();
            });

            function runSearchFromInput() {
                searchQuery = sermonSearch.value || "";
                selectedSpeaker = "";
                selectedMonth = "";
                selectedSavedOnly = false;
                searchTriggered = true;
                visibleCount = 4;
                renderSermons();
            }

            sermonSearch.addEventListener("input", function () {
                searchQuery = sermonSearch.value || "";
                searchTriggered = false;
                selectedSpeaker = "";
                selectedMonth = "";
                selectedSavedOnly = false;
                visibleCount = 4;
                renderSermons();
            });

            if (sermonSearchButton) {
                sermonSearchButton.addEventListener("click", function () {
                    runSearchFromInput();
                });
            }
            if (sermonFilterButton) {
                sermonFilterButton.addEventListener("click", function () {
                    filterPanelPinned = !filterPanelPinned;
                    renderSermons();
                });
            }

            sermonSearch.addEventListener("keydown", function (event) {
                if (event.key !== "Enter") {
                    return;
                }
                event.preventDefault();
                runSearchFromInput();
            });

            sermonSpeakerChips.addEventListener("click", function (event) {
                var button = event.target.closest("button[data-speaker]");
                if (!button) {
                    return;
                }
                selectedSpeaker = button.getAttribute("data-speaker") || "";
                searchTriggered = true;
                visibleCount = 4;
                renderSermons();
            });

            sermonMonthChips.addEventListener("click", function (event) {
                var button = event.target.closest("button[data-month]");
                if (!button) {
                    return;
                }
                selectedMonth = button.getAttribute("data-month") || "";
                searchTriggered = true;
                visibleCount = 4;
                renderSermons();
            });

            sermonSavedChips.addEventListener("click", function (event) {
                var button = event.target.closest("button[data-saved]");
                if (!button) {
                    return;
                }
                selectedSavedOnly = button.getAttribute("data-saved") === "only";
                searchTriggered = true;
                visibleCount = 4;
                renderSermons();
            });

            playerSpeed.addEventListener("change", function () {
                var rate = Number(playerSpeed.value) || 1;
                sermonAudio.playbackRate = rate;
            });

            playerSleep.addEventListener("change", function () {
                setSleepTimer(Number(playerSleep.value));
            });

            latestSermonsList.addEventListener("click", function (event) {
                var button = event.target.closest(".sermon-open-btn");
                if (!button) {
                    return;
                }
                var index = Number(button.getAttribute("data-sermon-index"));
                if (Number.isNaN(index)) {
                    return;
                }
                openPlayer(index, true);
            });

            playerSeek.addEventListener("input", function () {
                var duration = sermonAudio.duration || 0;
                if (duration <= 0) {
                    return;
                }
                var nextTime = (Number(playerSeek.value) / 100) * duration;
                sermonAudio.currentTime = nextTime;
                refreshPlayerTime();
            });

            playerBackdrop.addEventListener("click", closePlayer);
            playerClose.addEventListener("click", closePlayer);
            playerMinimize.addEventListener("click", minimizePlayer);
            playerMenu.addEventListener("click", closePlayer);
            playerPrev.addEventListener("click", function () { playNext(-1); });
            playerNext.addEventListener("click", function () { playNext(1); });
            playerPlay.addEventListener("click", togglePlayPause);
            playerCenter.addEventListener("click", togglePlayPause);
            miniPlayerOpen.addEventListener("click", restorePlayer);
            miniPlayerPlay.addEventListener("click", togglePlayPause);
            miniPlayerClose.addEventListener("click", closePlayer);

            sermonAudio.addEventListener("timeupdate", refreshPlayerTime);
            sermonAudio.addEventListener("loadedmetadata", refreshPlayerTime);
            sermonAudio.addEventListener("play", function () {
                updatePlayerButtonState();
                persistSermonState(!miniPlayer.hidden && playerOverlay.hidden);
            });
            sermonAudio.addEventListener("pause", function () {
                updatePlayerButtonState();
                persistSermonState(!miniPlayer.hidden && playerOverlay.hidden);
            });
            sermonAudio.addEventListener("ended", function () {
                playNext(1);
            });
            window.addEventListener("resize", function () {
                if (!sermonsLoaded || sermonsLoadFailed) {
                    return;
                }
                scheduleSermonMarqueeRefresh();
            });
            window.addEventListener("beforeunload", function () {
                persistSermonState(!miniPlayer.hidden && playerOverlay.hidden);
            });

            document.addEventListener("njc:langchange", function () {
                if (!sermonsLoaded) {
                    return;
                }
                if (sermonsLoadFailed) {
                    renderLoadError();
                    return;
                }
                renderSermons();
                syncPlayerText();
                refreshPlayerTime();
                setSleepNote(Number(playerSleep.value));
            });

            document.addEventListener("njc:cardlangchange", function () {
                if (!sermonsLoaded || sermonsLoadFailed) {
                    return;
                }
                renderSermons();
            });

            document.addEventListener("njc:userdata-updated", function () {
                if (!sermonsLoaded || sermonsLoadFailed) {
                    return;
                }
                renderSermons();
            });

            function loadSermonsData() {
                Promise.allSettled([
                    fetch(sermonsUrl).then(function (response) {
                        if (!response.ok) {
                            throw new Error("Failed to load sermons");
                        }
                        return response.json();
                    }),
                    fetchAdminSermons()
                ]).then(function (result) {
                    var remoteResult = result[0];
                    var adminResult = result[1];
                    var remoteItems = remoteResult && remoteResult.status === "fulfilled" && Array.isArray(remoteResult.value)
                        ? remoteResult.value
                        : [];
                    var adminItems = adminResult && adminResult.status === "fulfilled" && Array.isArray(adminResult.value)
                        ? adminResult.value
                        : [];
                    var merged = remoteItems.concat(adminItems);
                    var seen = {};
                    allSermons = merged
                        .map(normalizeSermon)
                        .filter(function (item) {
                            if (!item) {
                                return false;
                            }
                            var key = item.audioUrl
                                ? ("audio:" + item.audioUrl)
                                : ("title:" + item.title + "|" + item.dateKey);
                            if (seen[key]) {
                                return false;
                            }
                            seen[key] = true;
                            return true;
                        })
                        .sort(function (a, b) {
                            return b.dateKey - a.dateKey;
                        });

                    sermonsLoaded = true;
                    sermonsLoadFailed = false;
                    renderSermons();

                    var storedState = getStoredState();
                    if (!hasRestoredPlayerState && storedState && storedState.audioUrl) {
                        hasRestoredPlayerState = true;
                        var restoredIndex = allSermons.findIndex(function (item) {
                            return item.audioUrl === storedState.audioUrl;
                        });

                        if (restoredIndex >= 0) {
                            openPlayer(restoredIndex, false);
                            if (Number.isFinite(storedState.currentTime) && storedState.currentTime > 0) {
                                sermonAudio.addEventListener("loadedmetadata", function restoreTimeOnce() {
                                    try {
                                        sermonAudio.currentTime = Math.min(storedState.currentTime, sermonAudio.duration || storedState.currentTime);
                                    } catch (err) {
                                        return null;
                                    }
                                }, { once: true });
                            }

                            if (storedState.minimized) {
                                minimizePlayer();
                            }

                            if (storedState.isPlaying) {
                                sermonAudio.play().catch(function () {
                                    updatePlayerButtonState();
                                });
                            }
                        }
                    }
                }).catch(function () {
                    sermonsLoaded = true;
                    sermonsLoadFailed = true;
                    renderLoadError();
                });
            }

            document.addEventListener("njc:admin-sermons-updated", function () {
                loadSermonsData();
            });

            loadSermonsData();
        })();
