(function () {
    var FEED_URL = "https://mantledb.sh/v2/njc-belgium-admin-daily-bread/entries";
    /** Antantulla Appam devotions (public JSON) — used when Mantle has no entry for today. File is chosen by numeric order (1.json, 2.json, …), not by dates inside GitHub. */
    var GITHUB_ANTANTULLA_TAMIL_BASE = "https://raw.githubusercontent.com/yesudas/bible-devotions-app/main/antantulla-appam/meditations/%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AF%8D/";
    var GITHUB_ANTANTULLA_ENGLISH_BASE = "https://raw.githubusercontent.com/yesudas/bible-devotions-app/main/antantulla-appam/meditations/English/";
    var GITHUB_INDEX_CACHE_KEY_TA = "njc_antantulla_index_cache_ta_v1";
    var GITHUB_INDEX_CACHE_KEY_EN = "njc_antantulla_index_cache_en_v1";
    var GITHUB_INDEX_CACHE_MS = 6 * 60 * 60 * 1000;
    /** Civil calendar days since this UTC noon anchor; Brussels Y-M-D is interpreted at UTC noon for stable indexing. */
    var ANTANTULLA_SEQUENCE_ANCHOR_UTC = Date.UTC(2024, 0, 1, 12, 0, 0);
    var BRUSSELS_TZ = "Europe/Brussels";
    var SPEECH_CHAIN_GAP_MS = 55;
    var SPEECH_CHAIN_GAP_MS_TA = 95;
    var SEGMENT_MAX_CHARS = 320;
    /** Matches `data-card-lang-id` on the daily bread card (per-card language switcher). */
    var DAILY_BREAD_CARD_LANG_ID = "daily-bread";

    var dateLine = document.getElementById("daily-bread-date-line");
    var statusEl = document.getElementById("daily-bread-status");
    var contentWrap = document.getElementById("daily-bread-content");
    var headingEl = document.getElementById("daily-bread-heading");
    var authorLineEl = document.getElementById("daily-bread-author-line");
    var bodyEl = document.getElementById("daily-bread-body");
    var pageCard = document.querySelector(".daily-bread-page-card");
    var ttsToggle = document.getElementById("daily-bread-tts-toggle");
    var ttsStop = document.getElementById("daily-bread-tts-stop");

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

    /** Title/body/fallback source language: same as other cards (card switcher + app default). */
    function getDailyBreadContentLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguageForElement === "function" && pageCard) {
            return window.NjcI18n.getLanguageForElement(pageCard) === "ta" ? "ta" : "en";
        }
        return getAppLanguage();
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
            bodyTa: String(source.bodyTa || "").trim()
        };
    }

    function filenameToNumber(name) {
        var n = parseInt(String(name || "").replace(/\.json$/i, ""), 10);
        return Number.isFinite(n) ? n : 0;
    }

    function formatAntantullaGithubBody(raw) {
        var parts = [];
        if (raw.memory_verse && String(raw.memory_verse.text || "").trim()) {
            parts.push(String(raw.memory_verse.text).trim());
        }
        if (raw.devotion && String(raw.devotion.text || "").trim()) {
            parts.push(String(raw.devotion.text).replace(/\r\n/g, "\n").trim());
        }
        if (raw.conclusion && raw.conclusion.text !== undefined && raw.conclusion.text !== null) {
            var ct = raw.conclusion.text;
            if (Array.isArray(ct)) {
                ct.forEach(function (line) {
                    var t = String(line || "").trim();
                    if (t) {
                        parts.push(t);
                    }
                });
            } else if (String(ct).trim()) {
                parts.push(String(ct).trim());
            }
        }
        return parts.join("\n\n");
    }

    function mapAntantullaGithubToEntry(raw, ymdKey, filename, langKey) {
        var bodyText = formatAntantullaGithubBody(raw && typeof raw === "object" ? raw : {});
        var authorText = "";
        if (raw && raw.author) {
            authorText = String(raw.author.author || raw.author.name || "").trim();
        }
        var titleText = String((raw && raw.title) || "").trim();
        var uid = String((raw && raw.uniqueid) || "").replace(/\s/g, "");
        var fid = String(filename || "").replace(/[^\w.-]/g, "");
        var idSuffix = (uid || fid || "x");
        if (langKey === "ta") {
            return {
                id: "gh-antantulla-ta-" + idSuffix,
                date: ymdKey,
                title: "",
                titleTa: titleText,
                author: "",
                authorTa: authorText,
                body: "",
                bodyTa: bodyText
            };
        }
        return {
            id: "gh-antantulla-en-" + idSuffix,
            date: ymdKey,
            title: titleText,
            titleTa: "",
            author: authorText,
            authorTa: "",
            body: bodyText,
            bodyTa: ""
        };
    }

    function antantullaIndexCacheKey(langKey) {
        return langKey === "ta" ? GITHUB_INDEX_CACHE_KEY_TA : GITHUB_INDEX_CACHE_KEY_EN;
    }

    function antantullaBaseUrl(langKey) {
        return langKey === "ta" ? GITHUB_ANTANTULLA_TAMIL_BASE : GITHUB_ANTANTULLA_ENGLISH_BASE;
    }

    function readCachedAntantullaIndex(langKey) {
        try {
            var raw = window.sessionStorage.getItem(antantullaIndexCacheKey(langKey));
            if (!raw) {
                return null;
            }
            var o = JSON.parse(raw);
            if (!o || typeof o.at !== "number" || !Array.isArray(o.rows)) {
                return null;
            }
            if (Date.now() - o.at > GITHUB_INDEX_CACHE_MS) {
                return null;
            }
            return o.rows;
        } catch (e) {
            return null;
        }
    }

    function writeCachedAntantullaIndex(langKey, rows) {
        try {
            window.sessionStorage.setItem(antantullaIndexCacheKey(langKey), JSON.stringify({
                at: Date.now(),
                rows: rows
            }));
        } catch (e) {}
    }

    function fetchAntantullaIndexRows(langKey) {
        var cached = readCachedAntantullaIndex(langKey);
        if (cached) {
            return Promise.resolve(cached);
        }
        var indexUrl = antantullaBaseUrl(langKey) + "all-meditations.json";
        return fetch(indexUrl + "?t=" + String(Date.now()), { cache: "no-store" }).then(function (response) {
            if (!response.ok) {
                throw new Error("index");
            }
            return response.json();
        }).then(function (rows) {
            var list = Array.isArray(rows) ? rows : [];
            writeCachedAntantullaIndex(langKey, list);
            return list;
        });
    }

    function uniqueSortedAntantullaFileNumbers(rows) {
        var seen = {};
        (rows || []).forEach(function (row) {
            var fn = row && String(row.filename || "").trim();
            if (!fn || !/\.json$/i.test(fn)) {
                return;
            }
            if (/^all-meditations\.json$/i.test(fn)) {
                return;
            }
            var n = filenameToNumber(fn);
            if (n > 0) {
                seen[n] = true;
            }
        });
        return Object.keys(seen).map(function (k) {
            return parseInt(k, 10);
        }).sort(function (a, b) {
            return a - b;
        });
    }

    /**
     * Pick N.json by position in sorted numeric list: one step per calendar day since a fixed anchor (Brussels calendar ymdKey).
     * Does not use GitHub `date` fields.
     */
    function pickAntantullaFilenameBySequence(rows, ymdKey) {
        var nums = uniqueSortedAntantullaFileNumbers(rows);
        if (!nums.length) {
            return "";
        }
        var parts = String(ymdKey || "").split("-");
        var y = parseInt(parts[0], 10) || 2025;
        var m = parseInt(parts[1], 10) || 1;
        var d = parseInt(parts[2], 10) || 1;
        var curUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
        var daySeq = Math.floor((curUtc - ANTANTULLA_SEQUENCE_ANCHOR_UTC) / 86400000);
        if (daySeq < 0) {
            daySeq = 0;
        }
        var idx = daySeq % nums.length;
        var n = nums[idx];
        return String(n) + ".json";
    }

    function loadGithubAntantullaFallback(ymdKey) {
        var langKey = getDailyBreadContentLanguage() === "ta" ? "ta" : "en";
        return fetchAntantullaIndexRows(langKey).then(function (rows) {
            var fname = pickAntantullaFilenameBySequence(rows, ymdKey);
            if (!fname) {
                return null;
            }
            var base = antantullaBaseUrl(langKey);
            return fetch(base + encodeURIComponent(fname) + "?t=" + String(Date.now()), { cache: "no-store" }).then(function (response) {
                if (!response.ok) {
                    return null;
                }
                return response.json();
            }).then(function (data) {
                if (!data || typeof data !== "object") {
                    return null;
                }
                return mapAntantullaGithubToEntry(data, ymdKey, fname, langKey);
            });
        }).catch(function () {
            return null;
        });
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

    function scoreVoiceForTts(voice, prefix) {
        var l = String(voice && voice.lang || "").toLowerCase();
        var n = String(voice && voice.name || "").toLowerCase();
        var score = 0;
        if (l.indexOf(prefix) === 0) {
            score += 35;
        }
        if (/espeak|festival|flite|pico|speech\s*hub|android\s*speech|tyts|robot\s*voice/.test(n)) {
            score -= 120;
        }
        if (/compact|legacy|low\s*quality|basic\s*voice/.test(n)) {
            score -= 28;
        }
        if (/neural|wavenet|natural\s*english|natural\s*pro|premium|enhanced\s*neural/.test(n)) {
            score += 42;
        }
        if (/enhanced|improved|online\s*\(natural\)/.test(n)) {
            score += 18;
        }
        if (/microsoft.*(aria|jenny|guy|ryan|sonia|libby|natasha|duncan|clara)/.test(n)) {
            score += 22;
        }
        if (/google/.test(n) && !/translate/.test(n)) {
            score += 14;
        }
        if (/samantha|allison|ava|karen|daniel|tom|fred|serena|amelie|marie|zira|hazel|susan|george/.test(n)) {
            score += 10;
        }
        if (voice && voice.default) {
            score += 2;
        }
        return score;
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
        var bestScore = -9999;
        candidates.forEach(function (voice) {
            var s = scoreVoiceForTts(voice, prefix);
            if (s > bestScore) {
                bestScore = s;
                best = voice;
            }
        });
        return best;
    }

    /**
     * Strip decorative lines (====, ----, …) and rewrite chapter:verse so TTS does not read references like "3:16" as clock time.
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
        utterance.rate = currentReadLang === "ta" ? 0.9 : 0.92;
        utterance.pitch = currentReadLang === "ta" ? 1 : 0.98;
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

    function setLoadingState() {
        stopSpeechPlayback();
        currentReadPlain = "";
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

    function renderEntry(entry) {
        stopSpeechPlayback();
        var lang = getDailyBreadContentLanguage();
        var picked = pickContent(entry, lang);
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
        bodyEl.innerHTML = escapeHtml(picked.body || "");
        currentReadLang = picked.readLang === "ta" ? "ta" : "en";
        var titlePart = String(picked.title || "").trim();
        var authorPart = authorText;
        var bodyPart = String(picked.body || "").trim();
        currentReadPlain = sanitizeTextForSpeech([titlePart, authorPart, bodyPart].filter(Boolean).join(". "));
        statusEl.hidden = true;
        contentWrap.hidden = false;
        updateTtsUi();
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
        updateDateLine(ymd.key);
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
                    return "skip";
                }
                var rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
                var list = rows.map(function (row, i) {
                    return normalizeEntry(row, i);
                }).filter(function (e) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(e.date);
                });
                var match = list.filter(function (e) {
                    return e.date === ymd.key;
                }).sort(function (a, b) {
                    return String(b.id).localeCompare(String(a.id));
                })[0];
                if (match) {
                    renderEntry(match);
                    return "mantle";
                }
                return loadGithubAntantullaFallback(ymd.key);
            })
            .then(function (fallbackEntry) {
                if (token !== loadToken || fallbackEntry === "skip") {
                    return;
                }
                if (fallbackEntry === "mantle") {
                    return;
                }
                if (fallbackEntry && typeof fallbackEntry === "object") {
                    renderEntry(fallbackEntry);
                    return;
                }
                setEmptyState();
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
    document.addEventListener("njc:cardlangchange", function (ev) {
        var d = ev && ev.detail;
        if (!d || d.cardId !== DAILY_BREAD_CARD_LANG_ID) {
            return;
        }
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

    document.addEventListener("DOMContentLoaded", function () {
        setupDailyBreadMediaSession();
        updateTtsUi();
        onRoute();
    });
})();
