(function () {
    var FEED_URL = "https://mantledb.sh/v2/njc-belgium-admin-daily-bread/entries";
    var BRUSSELS_TZ = "Europe/Brussels";
    var SPEECH_CHAIN_GAP_MS = 55;
    var SPEECH_CHAIN_GAP_MS_TA = 95;
    var SEGMENT_MAX_CHARS = 320;

    var dateLine = document.getElementById("daily-bread-date-line");
    var statusEl = document.getElementById("daily-bread-status");
    var contentWrap = document.getElementById("daily-bread-content");
    var headingEl = document.getElementById("daily-bread-heading");
    var authorLineEl = document.getElementById("daily-bread-author-line");
    var bodyEl = document.getElementById("daily-bread-body");
    var pageCard = document.querySelector(".daily-bread-page-card");
    var ttsToggle = document.getElementById("daily-bread-tts-toggle");
    var ttsStop = document.getElementById("daily-bread-tts-stop");
    var themeRibbon = document.getElementById("daily-bread-theme-ribbon");
    var spotlightBlock = document.getElementById("daily-bread-spotlight");
    var spotlightPhoto = document.getElementById("daily-bread-spotlight-photo");
    var spotlightName = document.getElementById("daily-bread-spotlight-name");
    var spotlightBio = document.getElementById("daily-bread-spotlight-bio");
    var readingLine = document.getElementById("daily-bread-reading-line");
    var readingLink = document.getElementById("daily-bread-reading-link");
    var guestBlock = document.getElementById("daily-bread-guest");
    var guestPhoto = document.getElementById("daily-bread-guest-photo");
    var guestBio = document.getElementById("daily-bread-guest-bio");
    var archivePanel = document.getElementById("daily-bread-archive-panel");
    var archiveMonthSelect = document.getElementById("daily-bread-archive-month");
    var archiveApplyBtn = document.getElementById("daily-bread-archive-apply");
    var archiveTodayBtn = document.getElementById("daily-bread-archive-today");
    var archiveList = document.getElementById("daily-bread-archive-list");

    if (!dateLine || !statusEl || !contentWrap || !headingEl || !bodyEl) {
        return;
    }

    var speechSupported = Boolean(
        typeof window !== "undefined" &&
        typeof window.speechSynthesis !== "undefined" &&
        typeof window.SpeechSynthesisUtterance === "function"
    );

    var speechState = {
        active: false,
        paused: false
    };
    var speechSegments = [];
    var speechSegmentIndex = 0;
    var speechPendingTimerId = null;
    var speakingUtterance = null;
    var currentReadLang = "en";
    var currentReadPlain = "";
    var currentSpeechTitle = "";
    var mediaSessionBound = false;

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && pageCard) {
            return window.NjcI18n.tForElement(pageCard, key, fallback);
        }
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

    function getAppLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
    }

    function getBrusselsYmd() {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: BRUSSELS_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        function partValue(type) {
            var found = parts.find(function (part) {
                return part.type === type;
            });
            return found ? Number(found.value) : 0;
        }

        var y = partValue("year");
        var m = partValue("month");
        var d = partValue("day");
        return {
            year: y,
            month: m,
            day: d,
            key: String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0")
        };
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
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

    function normalizeEntry(row, index) {
        var source = row && typeof row === "object" ? row : {};
        return {
            id: String(source.id || "").trim() || ("db-" + index),
            date: toYmd(source.date || source.showDate || ""),
            title: String(source.title || "").trim(),
            titleTa: String(source.titleTa || "").trim(),
            author: String(source.author || "").trim(),
            authorTa: String(source.authorTa || "").trim(),
            body: String(source.body || "").trim(),
            bodyTa: String(source.bodyTa || "").trim(),
            theme: String(source.theme || "").trim(),
            themeTa: String(source.themeTa || "").trim(),
            readingBook: String(source.readingBook || "").trim(),
            readingChapter: Number(source.readingChapter) || 0,
            readingVerse: Number(source.readingVerse) || 0,
            readingLabel: String(source.readingLabel || "").trim(),
            readingLabelTa: String(source.readingLabelTa || "").trim(),
            authorPhotoUrl: String(source.authorPhotoUrl || "").trim(),
            authorBio: String(source.authorBio || "").trim(),
            authorBioTa: String(source.authorBioTa || "").trim(),
            spotlightAuthor: Boolean(source.spotlightAuthor)
        };
    }

    function getDailyBreadHashQuery() {
        var full = String(window.location.hash || "").replace(/^#/, "").trim();
        var q = full.indexOf("?");
        return q >= 0 ? full.slice(q + 1) : "";
    }

    function setDailyBreadHashQuery(queryString) {
        var base = "daily-bread";
        var q = String(queryString || "").replace(/^\?/, "");
        var next = q ? "#" + base + "?" + q : "#" + base;
        if (String(window.location.hash || "") !== next) {
            window.history.replaceState(null, "", next);
        }
    }

    function parseYmdParts(key) {
        var parts = String(key || "").split("-");
        return {
            y: Number(parts[0]) || 0,
            m: Number(parts[1]) || 0,
            d: Number(parts[2]) || 0
        };
    }

    function addDaysToYmd(ymdKey, deltaDays) {
        var p = parseYmdParts(ymdKey);
        var t = Date.UTC(p.y, p.m - 1, p.d + deltaDays, 12, 0, 0);
        var d = new Date(t);
        var y = d.getUTCFullYear();
        var m = String(d.getUTCMonth() + 1).padStart(2, "0");
        var day = String(d.getUTCDate()).padStart(2, "0");
        return String(y) + "-" + m + "-" + day;
    }

    function getBrusselsWeekdaySun0(ymdKey) {
        var p = parseYmdParts(ymdKey);
        var d = new Date(Date.UTC(p.y, p.m - 1, p.d, 12, 0, 0));
        var parts = new Intl.DateTimeFormat("en-US", {
            timeZone: BRUSSELS_TZ,
            weekday: "short"
        }).formatToParts(d);
        var w = "";
        parts.forEach(function (part) {
            if (part.type === "weekday") {
                w = String(part.value || "");
            }
        });
        var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
        return map[w] !== undefined ? map[w] : 0;
    }

    function getWeekRangeMondayStart(ymdKey) {
        var dow = getBrusselsWeekdaySun0(ymdKey);
        var daysFromMonday = (dow + 6) % 7;
        var startKey = addDaysToYmd(ymdKey, -daysFromMonday);
        var endKey = addDaysToYmd(startKey, 6);
        return { startKey: startKey, endKey: endKey };
    }

    function ymdCompare(a, b) {
        return String(a).localeCompare(String(b));
    }

    function entryInWeek(entry, startKey, endKey) {
        var d = entry && entry.date;
        return d && ymdCompare(d, startKey) >= 0 && ymdCompare(d, endKey) <= 0;
    }

    function hashString(str) {
        var s = String(str || "");
        var h = 0;
        for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h |= 0;
        }
        return h;
    }

    function pickSpotlightEntry(list, weekStartKey) {
        var candidates = list.filter(function (e) {
            return e && e.spotlightAuthor && String(e.authorPhotoUrl || "").trim()
                && (String(e.author || "").trim() || String(e.authorTa || "").trim());
        });
        if (!candidates.length) {
            return null;
        }
        candidates.sort(function (a, b) {
            return ymdCompare(a.date, b.date);
        });
        var seed = hashString(weekStartKey);
        var idx = Math.abs(seed) % candidates.length;
        return candidates[idx];
    }

    function monthKeysFromList(list, y, m) {
        var prefix = String(y) + "-" + String(m).padStart(2, "0") + "-";
        return list.filter(function (e) {
            return e && String(e.date || "").indexOf(prefix) === 0;
        }).map(function (e) {
            return e.date;
        }).sort(function (a, b) {
            return ymdCompare(b, a);
        });
    }

    function fillArchiveMonthOptions(list) {
        if (!archiveMonthSelect) {
            return;
        }
        var seen = {};
        list.forEach(function (e) {
            var d = String(e && e.date || "");
            if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                seen[d.slice(0, 7)] = true;
            }
        });
        var keys = Object.keys(seen).sort(function (a, b) {
            return b.localeCompare(a);
        });
        var current = archiveMonthSelect.value;
        archiveMonthSelect.innerHTML = keys.map(function (k) {
            return "<option value=\"" + escapeHtml(k) + "\">" + escapeHtml(k) + "</option>";
        }).join("");
        if (keys.length && keys.indexOf(current) >= 0) {
            archiveMonthSelect.value = current;
        } else if (keys.length) {
            archiveMonthSelect.value = keys[0];
        }
    }

    function renderArchiveListForMonth(list, monthYyyyMm) {
        if (!archiveList) {
            return;
        }
        var parts = String(monthYyyyMm || "").split("-");
        var y = Number(parts[0]);
        var m = Number(parts[1]);
        if (!y || !m) {
            archiveList.hidden = true;
            archiveList.innerHTML = "";
            return;
        }
        var days = monthKeysFromList(list, y, m);
        if (!days.length) {
            archiveList.hidden = true;
            archiveList.innerHTML = "";
            return;
        }
        archiveList.hidden = false;
        archiveList.innerHTML = days.map(function (dayKey) {
            return "" +
                "<li><button type=\"button\" class=\"button-link daily-bread-archive-day\" data-daily-bread-date=\"" +
                escapeHtml(dayKey) + "\">" + escapeHtml(dayKey) + "</button></li>";
        }).join("");
    }

    function pickContent(entry, lang) {
        if (lang === "ta") {
            var bodyTa = String(entry.bodyTa || "").trim();
            var bodyEn = String(entry.body || "").trim();
            var titleTa = String(entry.titleTa || "").trim();
            var titleEn = String(entry.title || "").trim();
            var authorTa = String(entry.authorTa || "").trim();
            var authorEn = String(entry.author || "").trim();
            return {
                title: titleTa || titleEn,
                author: authorTa || authorEn,
                body: bodyTa || bodyEn,
                readLang: bodyTa ? "ta" : "en"
            };
        }
        var bodyEn = String(entry.body || "").trim();
        var bodyTa = String(entry.bodyTa || "").trim();
        var authorEn = String(entry.author || "").trim();
        var authorTa = String(entry.authorTa || "").trim();
        return {
            title: String(entry.title || "").trim() || String(entry.titleTa || "").trim(),
            author: authorEn || authorTa,
            body: bodyEn || bodyTa,
            readLang: bodyEn ? "en" : "ta"
        };
    }

    function getSynth() {
        if (!speechSupported) {
            return null;
        }
        return window.speechSynthesis || null;
    }

    function getVoices() {
        var synth = getSynth();
        if (!synth || typeof synth.getVoices !== "function") {
            return [];
        }
        var v = synth.getVoices();
        return Array.isArray(v) ? v : [];
    }

    function pickVoice(langKey) {
        var prefix = langKey === "ta" ? "ta" : "en";
        var voices = getVoices();
        if (!voices.length) {
            return null;
        }
        var candidates = voices.filter(function (voice) {
            return String(voice && voice.lang || "").toLowerCase().indexOf(prefix) === 0;
        });
        if (!candidates.length && langKey === "ta") {
            candidates = voices.filter(function (voice) {
                return String(voice && voice.name || "").toLowerCase().indexOf("tamil") >= 0;
            });
        }
        if (!candidates.length) {
            candidates = voices;
        }
        var best = null;
        var bestScore = -1;
        candidates.forEach(function (voice) {
            var l = String(voice && voice.lang || "").toLowerCase();
            var n = String(voice && voice.name || "").toLowerCase();
            var score = 0;
            if (l.indexOf(prefix) === 0) {
                score += 30;
            }
            if (/natural|neural|premium/.test(n)) {
                score += 16;
            }
            if (/google|microsoft|samantha|alex|daniel|zira|enhanced/.test(n)) {
                score += 8;
            }
            if (voice && voice.default) {
                score += 4;
            }
            if (score > bestScore) {
                bestScore = score;
                best = voice;
            }
        });
        return best;
    }

    /**
     * Strip decorative lines (====, ----, …) and soften chapter:verse so TTS does not read "45 22" as a clock time.
     */
    function sanitizeTextForSpeech(raw) {
        var s = String(raw || "");
        s = s.replace(/\u00a0/g, " ");
        var lines = s.split(/\r\n|\r|\n/);
        var kept = lines.map(function (line) {
            var t = String(line || "").replace(/^\s+|\s+$/g, "");
            if (!t) {
                return "";
            }
            var compact = t.replace(/\s/g, "");
            var onlyDots = compact.replace(/[.\u00b7\u2022\u2024\u2025\u2026·•\-_=~*]+/g, "");
            if (onlyDots.length === 0 && compact.length >= 4) {
                return "";
            }
            var onlyDecor = t.replace(/[\s=_\-·\.•\u2013\u2014~*]+/g, "");
            if (onlyDecor.length === 0 && t.length >= 3) {
                return "";
            }
            if (/^[=\-_·\.•\u2013\u2014~*]{4,}$/.test(compact)) {
                return "";
            }
            return t;
        }).filter(Boolean);
        s = kept.join(" ");

        s = s.replace(/(\d{1,3})\s*:\s*(\d{1,3})/g, function (full, a, b, offset) {
            var na = parseInt(a, 10);
            var nb = parseInt(b, 10);
            if (na < 1 || na > 150 || nb < 1 || nb > 176) {
                return full;
            }
            var before = offset > 0 ? s.charAt(offset - 1) : "";
            var afterIdx = offset + full.length;
            var after = afterIdx < s.length ? s.charAt(afterIdx) : "";
            if (/\d/.test(before) || /\d/.test(after)) {
                return full;
            }
            var plausibleClock = na <= 23 && nb <= 59;
            if (plausibleClock) {
                return full;
            }
            return a + ", " + b;
        });

        s = s.replace(/\s+/g, " ").trim();
        return s;
    }

    function splitIntoSegments(text) {
        var clean = String(text || "").replace(/\s+/g, " ").trim();
        if (!clean) {
            return [];
        }
        var maxLen = Math.max(120, SEGMENT_MAX_CHARS);
        if (clean.length <= maxLen) {
            return [clean];
        }
        var out = [];
        var rest = clean;
        while (rest.length > maxLen) {
            var slice = rest.slice(0, maxLen);
            var breakAt = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("? "), slice.lastIndexOf("! "), slice.lastIndexOf(", "));
            if (breakAt < maxLen * 0.45) {
                breakAt = slice.lastIndexOf(" ");
            }
            if (breakAt < 24) {
                breakAt = maxLen;
            }
            var part = rest.slice(0, breakAt + 1).trim();
            if (part) {
                out.push(part);
            }
            rest = rest.slice(breakAt + 1).trim();
        }
        if (rest) {
            out.push(rest);
        }
        return out;
    }

    function clearSpeechTimers() {
        if (speechPendingTimerId !== null) {
            window.clearTimeout(speechPendingTimerId);
            speechPendingTimerId = null;
        }
    }

    function syncDailyBreadMediaSession() {
        if (typeof navigator === "undefined" || !navigator.mediaSession) {
            return;
        }
        try {
            var title = String(currentSpeechTitle || "").trim() || T("dailyBread.title", "Daily bread");
            if (typeof window.MediaMetadata === "function") {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: title,
                    artist: T("dailyBread.mediaSessionArtist", "NJC Daily bread"),
                    album: "NJC App"
                });
            }
            navigator.mediaSession.playbackState = speechState.active
                ? (speechState.paused ? "paused" : "playing")
                : "none";
        } catch (e) {
            return;
        }
    }

    function setupDailyBreadMediaSession() {
        if (mediaSessionBound || typeof navigator === "undefined" || !navigator.mediaSession) {
            return;
        }
        mediaSessionBound = true;
        try {
            navigator.mediaSession.setActionHandler("play", function () {
                toggleSpeech();
            });
            navigator.mediaSession.setActionHandler("pause", function () {
                var synth = getSynth();
                if (speechState.active && !speechState.paused && synth) {
                    if (synth.speaking && !synth.paused) {
                        synth.pause();
                    }
                    speechState.paused = true;
                    updateTtsUi();
                    syncDailyBreadMediaSession();
                }
            });
            navigator.mediaSession.setActionHandler("stop", function () {
                stopSpeechPlayback();
            });
        } catch (e) {
            return;
        }
    }

    function maybeResumeDailyBreadAfterBackground() {
        if (document.visibilityState !== "visible") {
            return;
        }
        var synth = getSynth();
        if (!speechState.active || speechState.paused || !synth) {
            return;
        }
        if (synth.speaking || synth.pending) {
            return;
        }
        if (speechSegmentIndex >= speechSegments.length) {
            return;
        }
        window.setTimeout(function () {
            if (!speechState.active || speechState.paused || document.visibilityState !== "visible") {
                return;
            }
            var s2 = getSynth();
            if (!s2 || s2.speaking || s2.pending) {
                return;
            }
            if (speechSegmentIndex >= speechSegments.length) {
                return;
            }
            speakNextSegment();
        }, 80);
    }

    function stopSpeechPlayback() {
        clearSpeechTimers();
        var synth = getSynth();
        if (synth) {
            try {
                synth.cancel();
            } catch (e) {}
        }
        speakingUtterance = null;
        speechSegments = [];
        speechSegmentIndex = 0;
        speechState.active = false;
        speechState.paused = false;
        updateTtsUi();
        syncDailyBreadMediaSession();
    }

    function speakNextSegment() {
        var synth = getSynth();
        if (!synth || !speechState.active || speechState.paused) {
            return;
        }
        if (speechSegmentIndex >= speechSegments.length) {
            stopSpeechPlayback();
            return;
        }
        var text = String(speechSegments[speechSegmentIndex] || "").trim();
        if (!text) {
            speechSegmentIndex += 1;
            speakNextSegment();
            return;
        }
        var utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentReadLang === "ta" ? "ta-IN" : "en-GB";
        utterance.rate = currentReadLang === "ta" ? 0.88 : 0.95;
        utterance.pitch = 1;
        var voice = pickVoice(currentReadLang);
        if (voice) {
            utterance.voice = voice;
        }
        var gap = currentReadLang === "ta" ? SPEECH_CHAIN_GAP_MS_TA : SPEECH_CHAIN_GAP_MS;
        utterance.onend = function () {
            if (speakingUtterance !== utterance || speechState.paused) {
                return;
            }
            speechSegmentIndex += 1;
            speakingUtterance = null;
            clearSpeechTimers();
            speechPendingTimerId = window.setTimeout(function () {
                speechPendingTimerId = null;
                speakNextSegment();
            }, gap);
        };
        utterance.onerror = function () {
            if (speakingUtterance !== utterance || speechState.paused) {
                return;
            }
            speechSegmentIndex += 1;
            speakingUtterance = null;
            clearSpeechTimers();
            speechPendingTimerId = window.setTimeout(function () {
                speechPendingTimerId = null;
                speakNextSegment();
            }, gap);
        };
        speakingUtterance = utterance;
        synth.speak(utterance);
    }

    function ensureVoicesThen(run) {
        var synth = getSynth();
        if (!synth) {
            if (typeof run === "function") {
                run();
            }
            return;
        }
        if (getVoices().length) {
            if (typeof run === "function") {
                run();
            }
            return;
        }
        function onVoices() {
            synth.removeEventListener("voiceschanged", onVoices);
            if (typeof run === "function") {
                run();
            }
        }
        synth.addEventListener("voiceschanged", onVoices);
        window.setTimeout(function () {
            synth.removeEventListener("voiceschanged", onVoices);
            if (typeof run === "function") {
                run();
            }
        }, 800);
    }

    function startSpeechFromPlain(plain, readLang) {
        if (!speechSupported) {
            return;
        }
        var synth = getSynth();
        if (!synth) {
            return;
        }
        var text = String(plain || "").replace(/\s+/g, " ").trim();
        if (!text) {
            return;
        }
        currentReadLang = readLang === "ta" ? "ta" : "en";
        currentReadPlain = sanitizeTextForSpeech(text);
        if (!currentReadPlain) {
            updateTtsUi();
            return;
        }
        var segments = splitIntoSegments(currentReadPlain);
        if (!segments.length) {
            return;
        }
        clearSpeechTimers();
        synth.cancel();
        speechSegments = segments;
        speechSegmentIndex = 0;
        speechState.active = true;
        speechState.paused = false;
        setupDailyBreadMediaSession();
        updateTtsUi();
        syncDailyBreadMediaSession();
        ensureVoicesThen(function () {
            if (!speechState.active || speechState.paused) {
                return;
            }
            speakNextSegment();
        });
    }

    function updateTtsUi() {
        if (!ttsToggle || !ttsStop) {
            return;
        }
        var hasText = Boolean(String(currentReadPlain || "").trim());
        var labelSpan = ttsToggle.querySelector("span");
        var icon = ttsToggle.querySelector("i");
        if (!speechSupported) {
            ttsToggle.disabled = true;
            ttsStop.disabled = true;
            ttsToggle.title = T("dailyBread.ttsUnsupported", "Read-aloud is not supported in this browser.");
            ttsToggle.setAttribute("aria-label", ttsToggle.title);
            if (labelSpan) {
                labelSpan.textContent = T("dailyBread.ttsListen", "Listen");
            }
            if (icon) {
                icon.className = "fa-solid fa-volume-xmark";
            }
            return;
        }
        ttsToggle.title = "";
        var playAria = T("dailyBread.ttsPlayAria", "Listen to daily bread");
        var pauseLabel = T("dailyBread.ttsPause", "Pause");
        var resumeLabel = T("dailyBread.ttsResume", "Resume");
        var listenLabel = T("dailyBread.ttsListen", "Listen");
        var stopLabel = T("dailyBread.ttsStop", "Stop");
        var stopAria = T("dailyBread.ttsStopAria", "Stop");
        if (!hasText) {
            ttsToggle.disabled = true;
            ttsStop.disabled = true;
            if (labelSpan) {
                labelSpan.textContent = listenLabel;
            }
            if (icon) {
                icon.className = "fa-solid fa-volume-high";
            }
            ttsToggle.setAttribute("aria-label", playAria);
            ttsStop.setAttribute("aria-label", stopAria);
            return;
        }
        ttsToggle.disabled = false;
        ttsStop.disabled = !speechState.active && !speechState.paused;
        if (speechState.active && !speechState.paused) {
            if (labelSpan) {
                labelSpan.textContent = pauseLabel;
            }
            if (icon) {
                icon.className = "fa-solid fa-pause";
            }
            ttsToggle.setAttribute("aria-label", pauseLabel);
        } else if (speechState.paused) {
            if (labelSpan) {
                labelSpan.textContent = resumeLabel;
            }
            if (icon) {
                icon.className = "fa-solid fa-play";
            }
            ttsToggle.setAttribute("aria-label", resumeLabel);
        } else {
            if (labelSpan) {
                labelSpan.textContent = listenLabel;
            }
            if (icon) {
                icon.className = "fa-solid fa-volume-high";
            }
            ttsToggle.setAttribute("aria-label", playAria);
        }
        ttsStop.setAttribute("aria-label", stopAria);
        ttsStop.title = stopLabel;
        syncDailyBreadMediaSession();
    }

    function toggleSpeech() {
        if (!speechSupported || !currentReadPlain) {
            return;
        }
        var synth = getSynth();
        if (!synth) {
            return;
        }
        if (speechState.active && !speechState.paused) {
            synth.pause();
            speechState.paused = true;
            updateTtsUi();
            syncDailyBreadMediaSession();
            return;
        }
        if (speechState.paused) {
            synth.resume();
            speechState.paused = false;
            updateTtsUi();
            syncDailyBreadMediaSession();
            return;
        }
        startSpeechFromPlain(currentReadPlain, currentReadLang);
    }

    var loadToken = 0;

    function clearDailyBreadChrome() {
        if (themeRibbon) {
            themeRibbon.hidden = true;
            themeRibbon.textContent = "";
        }
        if (spotlightBlock) {
            spotlightBlock.hidden = true;
        }
        if (spotlightPhoto) {
            spotlightPhoto.removeAttribute("src");
            spotlightPhoto.alt = "";
        }
        if (spotlightName) spotlightName.textContent = "";
        if (spotlightBio) spotlightBio.textContent = "";
        if (readingLine) readingLine.hidden = true;
        if (readingLink) {
            readingLink.removeAttribute("href");
            readingLink.textContent = "";
        }
        if (guestBlock) guestBlock.hidden = true;
        if (guestPhoto) {
            guestPhoto.hidden = true;
            guestPhoto.removeAttribute("src");
        }
        if (guestBio) guestBio.textContent = "";
    }

    function setLoadingState() {
        stopSpeechPlayback();
        currentReadPlain = "";
        clearDailyBreadChrome();
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.loading", "Loading…");
        statusEl.dataset.state = "";
        contentWrap.hidden = true;
        if (authorLineEl) {
            authorLineEl.hidden = true;
            authorLineEl.textContent = "";
        }
        updateTtsUi();
    }

    function setEmptyState() {
        stopSpeechPlayback();
        currentReadPlain = "";
        clearDailyBreadChrome();
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.empty", "No content for today yet.");
        statusEl.dataset.state = "empty";
        contentWrap.hidden = true;
        if (authorLineEl) {
            authorLineEl.hidden = true;
            authorLineEl.textContent = "";
        }
        updateTtsUi();
    }

    function setErrorState() {
        stopSpeechPlayback();
        currentReadPlain = "";
        clearDailyBreadChrome();
        statusEl.hidden = false;
        statusEl.textContent = T("dailyBread.error", "Could not load. Try again later.");
        statusEl.dataset.state = "error";
        contentWrap.hidden = true;
        if (authorLineEl) {
            authorLineEl.hidden = true;
            authorLineEl.textContent = "";
        }
        updateTtsUi();
    }

    function renderEntry(entry, listForSpotlight) {
        stopSpeechPlayback();
        var lang = getAppLanguage();
        var picked = pickContent(entry, lang);
        if (themeRibbon) {
            themeRibbon.hidden = true;
            themeRibbon.textContent = "";
        }
        headingEl.textContent = picked.title || T("dailyBread.title", "Daily bread");
        currentSpeechTitle = String(picked.title || "").trim() || T("dailyBread.title", "Daily bread");
        var authorText = String(picked.author || "").trim();
        if (authorLineEl) {
            if (authorText) {
                authorLineEl.hidden = false;
                authorLineEl.textContent = T("dailyBread.byAuthor", "By {author}").replace(/\{author\}/g, authorText);
            } else {
                authorLineEl.hidden = true;
                authorLineEl.textContent = "";
            }
        }
        var photoUrl = String(entry.authorPhotoUrl || "").trim();
        var bioText = lang === "ta"
            ? (String(entry.authorBioTa || "").trim() || String(entry.authorBio || "").trim())
            : (String(entry.authorBio || "").trim() || String(entry.authorBioTa || "").trim());
        if (guestBlock && guestPhoto && guestBio) {
            if (photoUrl || bioText) {
                guestBlock.hidden = false;
                if (photoUrl) {
                    guestPhoto.hidden = false;
                    guestPhoto.src = photoUrl;
                    guestPhoto.alt = authorText || T("dailyBread.guestPhotoAlt", "Author photo");
                } else {
                    guestPhoto.hidden = true;
                    guestPhoto.removeAttribute("src");
                    guestPhoto.alt = "";
                }
                guestBio.textContent = bioText;
                guestBio.hidden = !bioText;
            } else {
                guestBlock.hidden = true;
                guestBio.textContent = "";
            }
        }
        var rb = String(entry.readingBook || "").trim();
        var rc = Number(entry.readingChapter) || 0;
        var rv = Number(entry.readingVerse) || 0;
        var rlEn = String(entry.readingLabel || "").trim();
        var rlTa = String(entry.readingLabelTa || "").trim();
        var linkLabel = lang === "ta" ? (rlTa || rlEn) : (rlEn || rlTa);
        if (readingLine && readingLink) {
            if (rb && rc > 0) {
                var href = "#bible?book=" + encodeURIComponent(rb)
                    + "&chapter=" + encodeURIComponent(String(rc))
                    + (rv > 0 ? "&verse=" + encodeURIComponent(String(rv)) : "");
                readingLink.href = href;
                readingLink.textContent = linkLabel || T("dailyBread.readingLinkDefault", "Today’s Bible reading");
                readingLine.hidden = false;
            } else {
                readingLine.hidden = true;
                readingLink.removeAttribute("href");
                readingLink.textContent = "";
            }
        }
        var weekRange = getWeekRangeMondayStart(entry.date || getBrusselsYmd().key);
        var weeklyTheme = "";
        if (listForSpotlight && listForSpotlight.length) {
            var weekEntries = listForSpotlight.filter(function (e) {
                return e && entryInWeek(e, weekRange.startKey, weekRange.endKey);
            });
            var tSet = {};
            weekEntries.forEach(function (e) {
                var t = lang === "ta"
                    ? (String(e.themeTa || "").trim() || String(e.theme || "").trim())
                    : (String(e.theme || "").trim() || String(e.themeTa || "").trim());
                if (t) {
                    tSet[t] = true;
                }
            });
            var labels = Object.keys(tSet).sort();
            if (labels.length === 1) {
                weeklyTheme = T("dailyBread.themeThisWeek", "This week: {theme}").replace("{theme}", labels[0]);
            } else if (labels.length > 1) {
                weeklyTheme = T("dailyBread.themeThisWeekMany", "This week: {themes}").replace("{themes}", labels.join(" · "));
            }
        }
        var entryTheme = lang === "ta"
            ? (String(entry.themeTa || "").trim() || String(entry.theme || "").trim())
            : (String(entry.theme || "").trim() || String(entry.themeTa || "").trim());
        var ribbonText = weeklyTheme || entryTheme;
        if (themeRibbon) {
            if (ribbonText) {
                themeRibbon.hidden = false;
                themeRibbon.textContent = ribbonText;
            } else {
                themeRibbon.hidden = true;
                themeRibbon.textContent = "";
            }
        }
        bodyEl.innerHTML = escapeHtml(picked.body || "");
        currentReadLang = picked.readLang === "ta" ? "ta" : "en";
        var titlePart = String(picked.title || "").trim();
        var authorPart = authorText;
        var bodyPart = String(picked.body || "").trim();
        currentReadPlain = sanitizeTextForSpeech([titlePart, authorPart, bodyPart].filter(Boolean).join(". "));
        statusEl.hidden = true;
        contentWrap.hidden = false;
        updateTtsUi();

        var spot = listForSpotlight ? pickSpotlightEntry(listForSpotlight, weekRange.startKey) : null;
        if (spotlightBlock && spotlightPhoto && spotlightName && spotlightBio) {
            if (spot) {
                var sLang = getAppLanguage();
                var sName = sLang === "ta"
                    ? (String(spot.authorTa || "").trim() || String(spot.author || "").trim())
                    : (String(spot.author || "").trim() || String(spot.authorTa || "").trim());
                var sBio = sLang === "ta"
                    ? (String(spot.authorBioTa || "").trim() || String(spot.authorBio || "").trim())
                    : (String(spot.authorBio || "").trim() || String(spot.authorBioTa || "").trim());
                spotlightBlock.hidden = false;
                spotlightPhoto.src = String(spot.authorPhotoUrl || "").trim();
                spotlightPhoto.alt = sName || T("dailyBread.guestPhotoAlt", "Author photo");
                spotlightName.textContent = sName;
                spotlightBio.textContent = sBio;
                spotlightBio.hidden = !sBio;
            } else {
                spotlightBlock.hidden = true;
                spotlightPhoto.removeAttribute("src");
                spotlightPhoto.alt = "";
                spotlightName.textContent = "";
                spotlightBio.textContent = "";
            }
        }
    }

    function updateDateLine(ymdKey) {
        var locale = getLocale();
        var parts = ymdKey.split("-");
        var y = Number(parts[0]);
        var m = Number(parts[1]);
        var d = Number(parts[2]);
        var dateObj = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
        var label = new Intl.DateTimeFormat(locale, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: BRUSSELS_TZ
        }).format(dateObj);
        dateLine.textContent = T("dailyBread.dateLine", "Date: {date}").replace("{date}", label);
    }

    function loadDailyBread() {
        var ymd = getBrusselsYmd();
        var params = new URLSearchParams(getDailyBreadHashQuery());
        var monthParam = String(params.get("month") || "").trim();
        var dateParam = String(params.get("date") || "").trim();
        var targetKey = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : ymd.key;
        if (/^\d{4}-\d{2}$/.test(monthParam)) {
            targetKey = monthParam + "-01";
        }
        updateDateLine(targetKey);
        loadToken += 1;
        var token = loadToken;
        setLoadingState();
        fetch(FEED_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("load failed");
                }
                return response.json();
            })
            .then(function (payload) {
                if (token !== loadToken) {
                    return;
                }
                var rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
                var list = rows.map(function (row, i) {
                    return normalizeEntry(row, i);
                }).filter(function (e) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(e.date);
                });
                fillArchiveMonthOptions(list);
                if (/^\d{4}-\d{2}$/.test(monthParam) && archiveMonthSelect) {
                    archiveMonthSelect.value = monthParam;
                }
                if (/^\d{4}-\d{2}$/.test(monthParam)) {
                    renderArchiveListForMonth(list, monthParam);
                } else {
                    renderArchiveListForMonth(list, "");
                }
                var match = null;
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
                    match = list.filter(function (e) {
                        return e.date === dateParam;
                    }).sort(function (a, b) {
                        return String(b.id).localeCompare(String(a.id));
                    })[0];
                } else if (/^\d{4}-\d{2}$/.test(monthParam)) {
                    var monthDays = monthKeysFromList(list, Number(monthParam.slice(0, 4)), Number(monthParam.slice(5, 7)));
                    var pick = monthDays.filter(function (d) {
                        return ymdCompare(d, ymd.key) <= 0;
                    })[0] || monthDays[0];
                    if (pick) {
                        match = list.filter(function (e) {
                            return e.date === pick;
                        }).sort(function (a, b) {
                            return String(b.id).localeCompare(String(a.id));
                        })[0];
                    }
                } else {
                    match = list.filter(function (e) {
                        return e.date === ymd.key;
                    }).sort(function (a, b) {
                        return String(b.id).localeCompare(String(a.id));
                    })[0];
                }
                if (!match) {
                    setEmptyState();
                    return;
                }
                renderEntry(match, list);
            })
            .catch(function () {
                if (token !== loadToken) {
                    return;
                }
                setErrorState();
            });
    }

    function onRoute() {
        var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "daily-bread") {
            loadDailyBread();
        }
        /* Keep read-aloud running when switching tabs (background listen). User stops with Stop. */
    }

    if (ttsToggle) {
        ttsToggle.addEventListener("click", function () {
            if (!speechSupported) {
                return;
            }
            if (!String(currentReadPlain || "").trim()) {
                return;
            }
            toggleSpeech();
        });
    }
    if (ttsStop) {
        ttsStop.addEventListener("click", function () {
            stopSpeechPlayback();
        });
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("njc:langchange", function () {
        stopSpeechPlayback();
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("njc:admin-daily-bread-updated", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "daily-bread") {
            loadDailyBread();
        }
    });
    document.addEventListener("visibilitychange", function () {
        maybeResumeDailyBreadAfterBackground();
    });

    if (archiveApplyBtn && archiveMonthSelect) {
        archiveApplyBtn.addEventListener("click", function () {
            var v = String(archiveMonthSelect.value || "").trim();
            if (/^\d{4}-\d{2}$/.test(v)) {
                setDailyBreadHashQuery("month=" + v);
                loadDailyBread();
            }
        });
    }
    if (archiveTodayBtn) {
        archiveTodayBtn.addEventListener("click", function () {
            setDailyBreadHashQuery("");
            loadDailyBread();
        });
    }
    if (archiveList) {
        archiveList.addEventListener("click", function (event) {
            var btn = event.target.closest("button.daily-bread-archive-day[data-daily-bread-date]");
            if (!btn) {
                return;
            }
            var d = String(btn.getAttribute("data-daily-bread-date") || "").trim();
            if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                return;
            }
            setDailyBreadHashQuery("date=" + d);
            loadDailyBread();
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupDailyBreadMediaSession();
        updateTtsUi();
        onRoute();
    });
})();
