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
            var playerShareBtn = document.getElementById("sermon-player-share");
            var sermonShareFeedback = document.getElementById("sermon-share-feedback");
            var sermonShareFeedbackTimerId = null;

            var LISTEN_STATS_COLLECTION = "sermonListenStats";
            var sermonListenStatByDocId = {};
            var lastListenRecordedAudioUrl = "";
            var playerSermonListens = document.getElementById("player-sermon-listens");

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

            function fallbackHex64FromString(s) {
                function mix(str, seed) {
                    var h = seed >>> 0;
                    for (var i = 0; i < str.length; i += 1) {
                        h = ((h << 5) - h + str.charCodeAt(i)) >>> 0;
                    }
                    return ("0000000" + h.toString(16)).slice(-8);
                }
                var t = String(s || "");
                var parts = [
                    mix(t, 5381),
                    mix(t + "|njc", 33),
                    mix(String(t.length), 927),
                    mix(t.split("").reverse().join(""), 404)
                ];
                var hex = parts.join("");
                while (hex.length < 64) {
                    hex += hex;
                }
                return hex.slice(0, 64);
            }

            function hashSermonStatDocId(audioUrl) {
                return new Promise(function (resolve) {
                    var s = String(audioUrl || "").trim();
                    if (!s) {
                        resolve("");
                        return;
                    }
                    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
                        window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)).then(function (buf) {
                            var arr = Array.from(new Uint8Array(buf));
                            resolve(arr.map(function (b) {
                                return b.toString(16).padStart(2, "0");
                            }).join(""));
                        }).catch(function () {
                            resolve(fallbackHex64FromString(s));
                        });
                        return;
                    }
                    resolve(fallbackHex64FromString(s));
                });
            }

            function getFirestoreForListenStats() {
                if (!window.firebase || typeof window.firebase.firestore !== "function") {
                    return null;
                }
                try {
                    return window.firebase.firestore();
                } catch (err) {
                    return null;
                }
            }

            function formatListenCountLine(count, sourceElement) {
                var n = Math.max(0, Math.floor(Number(count) || 0));
                var template = T("sermons.listenCount", "{count} listens", sourceElement);
                if (window.NjcI18n && typeof window.NjcI18n.formatCount === "function") {
                    return window.NjcI18n.formatCount(template, n);
                }
                return template.replace(/\{count\}/g, String(n));
            }

            function refreshPlayerListenCountDisplay() {
                if (!playerSermonListens || !currentSermon || !String(currentSermon.audioUrl || "").trim()) {
                    if (playerSermonListens) {
                        playerSermonListens.hidden = true;
                        playerSermonListens.textContent = "";
                    }
                    return;
                }
                var url = String(currentSermon.audioUrl || "").trim();
                playerSermonListens.hidden = false;
                hashSermonStatDocId(url).then(function (docId) {
                    if (!docId || !currentSermon || String(currentSermon.audioUrl || "").trim() !== url) {
                        return null;
                    }
                    if (typeof sermonListenStatByDocId[docId] === "number") {
                        playerSermonListens.textContent = formatListenCountLine(sermonListenStatByDocId[docId], latestSermonsCard);
                        return null;
                    }
                    var db = getFirestoreForListenStats();
                    if (!db) {
                        playerSermonListens.textContent = formatListenCountLine(0, latestSermonsCard);
                        return null;
                    }
                    return db.collection(LISTEN_STATS_COLLECTION).doc(docId).get().then(function (snapshot) {
                        var n = snapshot && snapshot.exists ? (Number(snapshot.data().listenCount) || 0) : 0;
                        sermonListenStatByDocId[docId] = n;
                        return { url: url, count: n };
                    });
                }).then(function (result) {
                    if (!result || !playerSermonListens || !currentSermon) {
                        return;
                    }
                    if (String(currentSermon.audioUrl || "").trim() !== result.url) {
                        return;
                    }
                    playerSermonListens.textContent = formatListenCountLine(result.count, latestSermonsCard);
                }).catch(function () {
                    return null;
                });
            }

            function paintListRowListenForIndex(sermonIndex, count) {
                if (!latestSermonsList || sermonIndex < 0) {
                    return;
                }
                var target = latestSermonsList.querySelector("[data-sermon-listen-index=\"" + sermonIndex + "\"]");
                if (!target) {
                    return;
                }
                target.textContent = formatListenCountLine(count, latestSermonsCard);
            }

            function schedulePaintListListenCounts(visibleRecords) {
                if (!latestSermonsList || !visibleRecords || !visibleRecords.length) {
                    return;
                }
                var db = getFirestoreForListenStats();
                if (!db) {
                    return;
                }
                var pairs = visibleRecords.map(function (rec) {
                    return { index: rec.index, audioUrl: String(rec.item.audioUrl || "").trim() };
                }).filter(function (p) {
                    return p.audioUrl;
                });
                if (!pairs.length) {
                    return;
                }
                Promise.all(pairs.map(function (p) {
                    return hashSermonStatDocId(p.audioUrl).then(function (docId) {
                        return { index: p.index, docId: docId, audioUrl: p.audioUrl };
                    });
                })).then(function (rows) {
                    var uniq = [];
                    var seenDoc = {};
                    rows.forEach(function (row) {
                        if (!row.docId || seenDoc[row.docId]) {
                            return;
                        }
                        seenDoc[row.docId] = true;
                        uniq.push(row);
                    });
                    return Promise.all(uniq.map(function (row) {
                        return db.collection(LISTEN_STATS_COLLECTION).doc(row.docId).get().then(function (snap) {
                            var n = snap.exists ? (Number(snap.data().listenCount) || 0) : 0;
                            sermonListenStatByDocId[row.docId] = n;
                        });
                    })).then(function () {
                        rows.forEach(function (row) {
                            if (!row.docId) {
                                return;
                            }
                            var n = sermonListenStatByDocId[row.docId];
                            if (typeof n === "number") {
                                paintListRowListenForIndex(row.index, n);
                            }
                        });
                    });
                }).catch(function () {
                    return null;
                });
            }

            function recordListenIfNewForCurrentSermon() {
                var url = String(currentSermon && currentSermon.audioUrl || "").trim();
                if (!url) {
                    return;
                }
                if (lastListenRecordedAudioUrl === url) {
                    return;
                }
                lastListenRecordedAudioUrl = url;
                var db = getFirestoreForListenStats();
                var FieldValue = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue;
                if (!db || !FieldValue || typeof FieldValue.increment !== "function") {
                    return;
                }
                hashSermonStatDocId(url).then(function (docId) {
                    if (!docId) {
                        return null;
                    }
                    var ref = db.collection(LISTEN_STATS_COLLECTION).doc(docId);
                    return ref.set({
                        listenCount: FieldValue.increment(1)
                    }, { merge: true }).then(function () {
                        return ref.get();
                    }).then(function (snap) {
                        var n = snap.exists ? (Number(snap.data().listenCount) || 0) : 0;
                        sermonListenStatByDocId[docId] = n;
                        if (playerSermonListens && currentSermon && String(currentSermon.audioUrl || "").trim() === url) {
                            playerSermonListens.hidden = false;
                            playerSermonListens.textContent = formatListenCountLine(n, latestSermonsCard);
                        }
                        if (currentSermonIndex >= 0) {
                            paintListRowListenForIndex(currentSermonIndex, n);
                        }
                    });
                }).catch(function () {
                    return null;
                });
            }

            function escapeHtml(value) {
                return String(value)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            }

            function copyTextToClipboard(text) {
                var t = String(text || "");
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    return navigator.clipboard.writeText(t);
                }
                return new Promise(function (resolve, reject) {
                    var area = document.createElement("textarea");
                    area.value = t;
                    area.setAttribute("readonly", "");
                    area.style.position = "fixed";
                    area.style.left = "-5000px";
                    document.body.appendChild(area);
                    try {
                        area.select();
                        area.setSelectionRange(0, 99999);
                        var ok = document.execCommand("copy");
                        document.body.removeChild(area);
                        if (ok) {
                            resolve();
                        } else {
                            reject(new Error("copy"));
                        }
                    } catch (err) {
                        try {
                            document.body.removeChild(area);
                        } catch (e2) {
                            return;
                        }
                        reject(err);
                    }
                });
            }

            function buildPlainShareText(title, preview, url) {
                var lines = [];
                if (title) {
                    lines.push(title);
                }
                if (preview) {
                    lines.push(preview);
                }
                if (url) {
                    lines.push(url);
                }
                return lines.join("\n\n");
            }

            function getSermonAudioParamFromHash() {
                var h = String(window.location.hash || "");
                var q = h.indexOf("?");
                if (q < 0) {
                    return "";
                }
                try {
                    var sp = new URLSearchParams(h.slice(q + 1));
                    return String(sp.get("sermon") || "").trim();
                } catch (err) {
                    return "";
                }
            }

            function stripSermonQueryFromHash() {
                try {
                    var h = String(window.location.hash || "");
                    if (h.indexOf("sermon=") < 0) {
                        return;
                    }
                    var base = window.location.pathname + window.location.search;
                    window.history.replaceState(null, "", base + "#sermons");
                } catch (eStrip) {
                    return;
                }
            }

            function getSermonShareUrl(audioUrl) {
                var u = String(audioUrl || "").trim();
                if (!u) {
                    return "";
                }
                try {
                    var page = new URL(String(window.location.href));
                    page.hash = "sermons?sermon=" + encodeURIComponent(u);
                    return page.toString();
                } catch (errUrl) {
                    return "";
                }
            }

            function clearSermonShareFeedbackTimer() {
                if (sermonShareFeedbackTimerId !== null) {
                    window.clearTimeout(sermonShareFeedbackTimerId);
                    sermonShareFeedbackTimerId = null;
                }
            }

            function clearSermonShareFeedback() {
                clearSermonShareFeedbackTimer();
                if (sermonShareFeedback) {
                    sermonShareFeedback.textContent = "";
                    sermonShareFeedback.hidden = true;
                }
            }

            function showSermonShareFeedback(key, fallback) {
                if (!sermonShareFeedback) {
                    return;
                }
                sermonShareFeedback.textContent = T(key, fallback, latestSermonsCard);
                sermonShareFeedback.hidden = false;
                clearSermonShareFeedbackTimer();
                sermonShareFeedbackTimerId = window.setTimeout(function () {
                    sermonShareFeedbackTimerId = null;
                    if (sermonShareFeedback) {
                        sermonShareFeedback.textContent = "";
                        sermonShareFeedback.hidden = true;
                    }
                }, 4200);
            }

            function isSignedInUser() {
                var u = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                return Boolean(u && u.uid);
            }

            function syncSermonShareButton() {
                if (!playerShareBtn) {
                    return;
                }
                var signedIn = isSignedInUser();
                var hasAudio = Boolean(currentSermon && String(currentSermon.audioUrl || "").trim());
                playerShareBtn.disabled = !signedIn || !hasAudio;
                playerShareBtn.setAttribute("aria-disabled", playerShareBtn.disabled ? "true" : "false");
                if (signedIn) {
                    playerShareBtn.setAttribute(
                        "aria-label",
                        T("sermons.shareAria", "Share link to this sermon", latestSermonsCard)
                    );
                    playerShareBtn.title = T("sermons.shareAria", "Share link to this sermon", latestSermonsCard);
                } else {
                    playerShareBtn.setAttribute(
                        "aria-label",
                        T("sermons.shareGuestsDisabled", "Sign in with a registered account to share this sermon.", latestSermonsCard)
                    );
                    playerShareBtn.title = T("sermons.shareGuestsDisabled", "Sign in with a registered account to share this sermon.", latestSermonsCard);
                }
            }

            function runSermonShare() {
                if (!playerShareBtn || playerShareBtn.disabled || !currentSermon) {
                    return;
                }
                var u = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                if (!u || !u.uid) {
                    return;
                }
                var audioUrl = String(currentSermon.audioUrl || "").trim();
                if (!audioUrl) {
                    return;
                }
                var url = getSermonShareUrl(audioUrl);
                if (!url) {
                    return;
                }
                var title = String(currentSermon.title || "").trim() || T("sermons.eyebrow", "Sermon", latestSermonsCard);
                var sub = String(currentSermon.subtitle || "").trim();
                var speaker = String(currentSermon.speaker || "").trim();
                var dateLine = toPlayerDateLine(currentSermon);
                var previewParts = [dateLine];
                if (sub) {
                    previewParts.push(sub);
                }
                if (speaker) {
                    previewParts.push(T("sermons.speakerPrefix", "Speaker", latestSermonsCard) + ": " + speaker);
                }
                var preview = previewParts.filter(Boolean).join("\n");
                var shareText = preview ? (title + "\n\n" + preview) : title;
                if (typeof navigator !== "undefined" && navigator.share) {
                    var p = navigator.share({ title: title, text: shareText, url: url });
                    if (p && typeof p.then === "function" && typeof p.catch === "function") {
                        p.catch(function (err) {
                            if (err && err.name === "AbortError") {
                                return;
                            }
                            copyTextToClipboard(url).then(function () {
                                showSermonShareFeedback("sermons.shareLinkCopied", "Link copied. Paste it in chat or email to share.");
                            }, function () {
                                copyTextToClipboard(buildPlainShareText(title, preview, url)).then(function () {
                                    showSermonShareFeedback("sermons.shareLinkCopied", "Link copied. Paste it in chat or email to share.");
                                }, function () {
                                    showSermonShareFeedback("sermons.shareFailed", "Could not share or copy. Try again.");
                                });
                            });
                        });
                    }
                    return;
                }
                copyTextToClipboard(buildPlainShareText(title, preview, url)).then(function () {
                    showSermonShareFeedback("sermons.shareLinkCopied", "Link copied. Paste it in chat or email to share.");
                }, function () {
                    copyTextToClipboard(url).then(function () {
                        showSermonShareFeedback("sermons.shareLinkCopied", "Link copied. Paste it in chat or email to share.");
                    }, function () {
                        showSermonShareFeedback("sermons.shareFailed", "Could not share or copy. Try again.");
                    });
                });
            }

            function tryOpenSermonFromHash() {
                if (!sermonsLoaded || sermonsLoadFailed || !allSermons.length) {
                    return;
                }
                var param = getSermonAudioParamFromHash();
                if (!param) {
                    return;
                }
                var idx = allSermons.findIndex(function (item) {
                    return item && item.audioUrl === param;
                });
                if (idx < 0) {
                    return;
                }
                openPlayer(idx, false);
                stripSermonQueryFromHash();
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

                    var disabledAttr = sermon.audioUrl ? "" : " aria-disabled=\"true\"";
                    return "" +
                        "<li class=\"sermon-item\">" +
                        "  <div class=\"sermon-item-row\">" +
                        "    <div class=\"sermon-open-btn\" role=\"button\" tabindex=\"0\" data-sermon-index=\"" + sermonIndex + "\"" + disabledAttr + ">" +
                        "      <div class=\"sermon-open-top\">" +
                        "          <span class=\"sermon-speaker-avatar\" aria-hidden=\"true\">" + avatarText + "</span>" +
                        "          <div class=\"sermon-open-main\">" +
                        "              <h3 class=\"sermon-line sermon-line-tamil\">" + title + "</h3>" +
                        "              <p class=\"sermon-line sermon-line-english\">" + englishLine + "</p>" +
                        "              <p class=\"sermon-line sermon-line-speaker\">" + speakerLine + "</p>" +
                        "              <p class=\"sermon-line sermon-line-date\">" + escapeHtml(dateText) + "</p>" +
                        (sermon.audioUrl
                            ? "              <p class=\"sermon-line sermon-line-listens\" data-sermon-listen-index=\"" + sermonIndex + "\"></p>"
                            : "") +
                        "          </div>" +
                        "      </div>" +
                        "    </div>" +
                        "  </div>" +
                        "</li>";
                }).join("");

                schedulePaintListListenCounts(visible);

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

                lastListenRecordedAudioUrl = "";

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
                syncSermonShareButton();
                refreshPlayerListenCountDisplay();
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
                clearSermonShareFeedback();
                syncSermonShareButton();
                if (playerSermonListens) {
                    playerSermonListens.hidden = true;
                    playerSermonListens.textContent = "";
                }
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

            function openSermonFromRow(row) {
                if (!row || row.getAttribute("aria-disabled") === "true") {
                    return;
                }
                var index = Number(row.getAttribute("data-sermon-index"));
                if (Number.isNaN(index)) {
                    return;
                }
                openPlayer(index, true);
            }

            latestSermonsList.addEventListener("click", function (event) {
                var row = event.target.closest(".sermon-open-btn");
                openSermonFromRow(row);
            });

            latestSermonsList.addEventListener("keydown", function (event) {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }
                var row = event.target.closest(".sermon-open-btn");
                if (!row || !latestSermonsList.contains(row)) {
                    return;
                }
                event.preventDefault();
                openSermonFromRow(row);
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

            if (playerShareBtn) {
                playerShareBtn.addEventListener("click", function () {
                    if (playerShareBtn.disabled) {
                        return;
                    }
                    runSermonShare();
                });
            }

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
            sermonAudio.addEventListener("playing", function () {
                recordListenIfNewForCurrentSermon();
            });
            sermonAudio.addEventListener("ended", function () {
                if (currentSermon && currentSermon.audioUrl) {
                    var dur = sermonAudio.duration;
                    document.dispatchEvent(new CustomEvent("njc:sermon-listen-complete", {
                        detail: {
                            audioUrl: currentSermon.audioUrl,
                            duration: Number.isFinite(dur) && dur > 0 ? dur : 0,
                            currentTime: sermonAudio.currentTime || 0
                        }
                    }));
                }
                playNext(1);
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
                refreshPlayerListenCountDisplay();
                refreshPlayerTime();
                setSleepNote(Number(playerSleep.value));
                syncSermonShareButton();
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
                    var hashAudio = getSermonAudioParamFromHash();
                    var hashIndex = -1;
                    if (hashAudio) {
                        hashIndex = allSermons.findIndex(function (item) {
                            return item && item.audioUrl === hashAudio;
                        });
                    }

                    if (hashIndex >= 0) {
                        hasRestoredPlayerState = true;
                        openPlayer(hashIndex, false);
                        stripSermonQueryFromHash();
                    } else if (!hasRestoredPlayerState && storedState && storedState.audioUrl) {
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
                    syncSermonShareButton();
                }).catch(function () {
                    sermonsLoaded = true;
                    sermonsLoadFailed = true;
                    renderLoadError();
                });
            }

            document.addEventListener("njc:admin-sermons-updated", function () {
                loadSermonsData();
            });

            document.addEventListener("njc:routechange", function (ev) {
                var r = ev && ev.detail && ev.detail.route;
                if (r === "sermons" && sermonsLoaded && !sermonsLoadFailed) {
                    window.setTimeout(function () {
                        tryOpenSermonFromHash();
                    }, 0);
                }
                syncSermonShareButton();
            });
            window.addEventListener("hashchange", function () {
                var raw = String(window.location.hash || "").replace(/^#/, "").split("?")[0].trim().toLowerCase();
                if (raw === "sermons" && sermonsLoaded && !sermonsLoadFailed) {
                    tryOpenSermonFromHash();
                }
            });
            document.addEventListener("njc:authchange", function () {
                syncSermonShareButton();
            });

            loadSermonsData();
        })();
