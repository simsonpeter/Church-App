(function () {
    var BRUSSELS_TZ = "Europe/Brussels";
    var NEWSLETTER_COLLECTION = "churchNewsletters";
    var NEWSLETTER_CARD_LANG_ID = "newsletter";
    var SPEECH_CHAIN_GAP_MS = 55;
    var SPEECH_CHAIN_GAP_MS_TA = 95;
    var SEGMENT_MAX_CHARS = 320;

    var pageCard = document.querySelector(".newsletter-page-card");
    var rangeEl = document.getElementById("newsletter-active-range");
    var statusEl = document.getElementById("newsletter-status");
    var contentWrap = document.getElementById("newsletter-content");
    var headingEl = document.getElementById("newsletter-heading");
    var bodyEl = document.getElementById("newsletter-body");
    var ttsToggle = document.getElementById("newsletter-tts-toggle");
    var ttsStop = document.getElementById("newsletter-tts-stop");
    var shareBtn = document.getElementById("newsletter-share-btn");
    var shareFeedback = document.getElementById("newsletter-share-feedback");

    if (!rangeEl || !statusEl || !contentWrap || !headingEl || !bodyEl) {
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
    var shareFeedbackTimerId = null;
    var currentShareEntryId = "";
    var currentShareTitleText = "";
    var currentShareBodyPreview = "";

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && pageCard) {
            return window.NjcI18n.tForElement(pageCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
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
        if (!y || !m || !d) {
            return "";
        }
        return String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }

    function getNewsletterContentLanguage() {
        if (window.NjcI18n && typeof window.NjcI18n.getLanguageForElement === "function" && pageCard) {
            return window.NjcI18n.getLanguageForElement(pageCard) === "ta" ? "ta" : "en";
        }
        if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
            return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
        }
        return "en";
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

    function syncNewsletterMediaSession() {
        if (typeof navigator === "undefined" || !navigator.mediaSession) {
            return;
        }
        try {
            var title = String(currentSpeechTitle || "").trim() || T("newsletter.title", "Newsletter");
            if (typeof window.MediaMetadata === "function") {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: title,
                    artist: T("newsletter.ttsMediaSessionArtist", "NJC Newsletter"),
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

    function setupNewsletterMediaSession() {
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
                    syncNewsletterMediaSession();
                }
            });
            navigator.mediaSession.setActionHandler("stop", function () {
                stopSpeechPlayback();
            });
        } catch (e) {
            return;
        }
    }

    function maybeResumeNewsletterAfterBackground() {
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
        syncNewsletterMediaSession();
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
        setupNewsletterMediaSession();
        updateTtsUi();
        syncNewsletterMediaSession();
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
            ttsToggle.title = T("newsletter.ttsUnsupported", "Read-aloud is not supported in this browser.");
            ttsToggle.setAttribute("aria-label", ttsToggle.title);
            if (labelSpan) {
                labelSpan.textContent = T("newsletter.ttsListen", "Listen");
            }
            if (icon) {
                icon.className = "fa-solid fa-volume-xmark";
            }
            return;
        }
        ttsToggle.title = "";
        var playAria = T("newsletter.ttsPlayAria", "Listen to newsletter");
        var pauseLabel = T("newsletter.ttsPause", "Pause");
        var resumeLabel = T("newsletter.ttsResume", "Resume");
        var listenLabel = T("newsletter.ttsListen", "Listen");
        var stopLabel = T("newsletter.ttsStop", "Stop");
        var stopAria = T("newsletter.ttsStopAria", "Stop");
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
        syncNewsletterMediaSession();
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
            syncNewsletterMediaSession();
            return;
        }
        if (speechState.paused) {
            synth.resume();
            speechState.paused = false;
            updateTtsUi();
            syncNewsletterMediaSession();
            return;
        }
        startSpeechFromPlain(currentReadPlain, currentReadLang);
    }

    function clearShareFeedbackTimer() {
        if (shareFeedbackTimerId !== null) {
            window.clearTimeout(shareFeedbackTimerId);
            shareFeedbackTimerId = null;
        }
    }

    function clearShareFeedback() {
        clearShareFeedbackTimer();
        if (shareFeedback) {
            shareFeedback.textContent = "";
            shareFeedback.hidden = true;
        }
    }

    function showShareFeedback(key, fallback) {
        if (!shareFeedback) {
            return;
        }
        shareFeedback.textContent = T(key, fallback);
        shareFeedback.hidden = false;
        clearShareFeedbackTimer();
        shareFeedbackTimerId = window.setTimeout(function () {
            shareFeedbackTimerId = null;
            if (shareFeedback) {
                shareFeedback.textContent = "";
                shareFeedback.hidden = true;
            }
        }, 4200);
    }

    function previewPlainBody(body, maxLen) {
        var s = String(body || "").replace(/\s+/g, " ").trim();
        if (!s) {
            return "";
        }
        var cap = typeof maxLen === "number" ? maxLen : 220;
        if (s.length <= cap) {
            return s;
        }
        return s.slice(0, Math.max(0, cap - 3)).trim() + "...";
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
                    // ignore
                }
                reject(err);
            }
        });
    }

    function safeDecodeNewsletterId(value) {
        var raw = String(value || "").trim();
        if (!raw) {
            return "";
        }
        try {
            return decodeURIComponent(raw);
        } catch (e) {
            return raw;
        }
    }

    function getNewsletterIdFromHash() {
        if (window.NjcSpaRouter && typeof window.NjcSpaRouter.splitHashRoute === "function") {
            var parts = window.NjcSpaRouter.splitHashRoute();
            if ((parts.baseRoute || "").toLowerCase() !== "newsletter") {
                return "";
            }
            if (parts.segments && parts.segments.length > 1) {
                return safeDecodeNewsletterId(parts.segments[1] || "");
            }
            var sub = String(parts.subPath || "").trim();
            if (sub) {
                var first = sub.split("/").map(function (s) {
                    return s.trim();
                }).filter(Boolean)[0];
                return safeDecodeNewsletterId(first || "");
            }
        }
        var raw = String(window.location.hash || "").replace(/^#/, "").trim();
        var path = raw.split("?")[0];
        if (path.toLowerCase().indexOf("newsletter/") !== 0) {
            return "";
        }
        var rest = path.slice("newsletter/".length);
        return safeDecodeNewsletterId(rest.split("/")[0] || "");
    }

    function getNewsletterShareUrl(entryId) {
        var id = String(entryId || "").trim();
        if (!id) {
            return "";
        }
        try {
            var u = new URL(String(window.location.href));
            u.hash = "newsletter/" + encodeURIComponent(id);
            return u.toString();
        } catch (err) {
            return "";
        }
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

    function runNewsletterShare() {
        var id = String(currentShareEntryId || "").trim();
        if (!id) {
            return;
        }
        var url = getNewsletterShareUrl(id);
        if (!url) {
            return;
        }
        var title = String(currentShareTitleText || "").trim() || T("newsletter.title", "Newsletter");
        var preview = String(currentShareBodyPreview || "").trim();
        var shareOpts = {
            labelKey: "newsletter.shareSectionLabel",
            labelFallback: "Newsletter",
            subtitle: title,
            body: preview,
            url: url,
            sourceElement: pageCard
        };
        var sharePayload = window.NjcEvents && typeof window.NjcEvents.shareContent === "function"
            ? window.NjcEvents.shareContent(shareOpts)
            : { title: T("newsletter.shareSectionLabel", "Newsletter") + " — " + title, text: buildPlainShareText(T("newsletter.shareSectionLabel", "Newsletter"), title + (preview ? "\n\n" + preview : ""), url), url: url };
        if (typeof navigator !== "undefined" && navigator.share) {
            var p = navigator.share(sharePayload);
            if (p && typeof p.then === "function" && typeof p.catch === "function") {
                p.catch(function (err) {
                    if (err && err.name === "AbortError") {
                        return;
                    }
                    copyTextToClipboard(url).then(function () {
                        showShareFeedback("newsletter.linkCopied", "Link copied. Paste it in chat or email to share.");
                    }, function () {
                        var plainText = window.NjcEvents && typeof window.NjcEvents.buildSharePlainText === "function"
                            ? window.NjcEvents.buildSharePlainText(shareOpts)
                            : buildPlainShareText(T("newsletter.shareSectionLabel", "Newsletter"), title + (preview ? "\n\n" + preview : ""), url);
                        copyTextToClipboard(plainText).then(function () {
                            showShareFeedback("newsletter.linkCopied", "Link copied. Paste it in chat or email to share.");
                        }, function () {
                            showShareFeedback("newsletter.shareFailed", "Could not share or copy. Try again.");
                        });
                    });
                });
            }
            return;
        }
        var clipboardText = window.NjcEvents && typeof window.NjcEvents.buildSharePlainText === "function"
            ? window.NjcEvents.buildSharePlainText(shareOpts)
            : buildPlainShareText(T("newsletter.shareSectionLabel", "Newsletter"), title + (preview ? "\n\n" + preview : ""), url);
        copyTextToClipboard(clipboardText).then(function () {
            showShareFeedback("newsletter.linkCopied", "Link copied. Paste it in chat or email to share.");
        }, function () {
            copyTextToClipboard(url).then(function () {
                showShareFeedback("newsletter.linkCopied", "Link copied. Paste it in chat or email to share.");
            }, function () {
                showShareFeedback("newsletter.shareFailed", "Could not share or copy. Try again.");
            });
        });
    }

    function getFirestoreDb() {
        var fb = window.firebase;
        if (!fb || !fb.apps || !fb.apps.length || !fb.firestore) {
            return null;
        }
        try {
            return fb.firestore();
        } catch (e) {
            return null;
        }
    }

    function normalizeDoc(doc) {
        if (!doc || !doc.exists) {
            return null;
        }
        var d = doc.data() || {};
        return {
            id: doc.id,
            title: String(d.title || "").trim(),
            body: String(d.body || "").trim(),
            titleTa: String(d.titleTa || "").trim(),
            bodyTa: String(d.bodyTa || "").trim(),
            visibleFrom: String(d.visibleFrom || "").trim(),
            visibleUntil: String(d.visibleUntil || "").trim(),
            monthKey: String(d.monthKey || "").trim()
        };
    }

    function isYmd(s) {
        return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
    }

    function isYm(s) {
        return /^\d{4}-\d{2}$/.test(String(s || ""));
    }

    function formatLocalizedMonthYearFromYmd(ymd) {
        if (!isYmd(ymd)) {
            return "";
        }
        var y = parseInt(ymd.slice(0, 4), 10);
        var m = parseInt(ymd.slice(5, 7), 10);
        if (!y || m < 1 || m > 12) {
            return "";
        }
        var locale = getNewsletterContentLanguage() === "ta" ? "ta-IN" : "en-GB";
        var anchor = new Date(Date.UTC(y, m - 1, 15, 12, 0, 0));
        return new Intl.DateTimeFormat(locale, {
            month: "long",
            year: "numeric",
            timeZone: "UTC"
        }).format(anchor);
    }

    function formatNewsletterMonthLine(entry) {
        var monthYear = formatLocalizedMonthYearFromYmd(entry.visibleFrom);
        if (!monthYear && isYm(entry.monthKey)) {
            monthYear = formatLocalizedMonthYearFromYmd(entry.monthKey + "-01");
        }
        if (!monthYear) {
            return "";
        }
        return T("newsletter.monthLabel", "Newsletter of {monthYear}").replace(/\{monthYear\}/g, monthYear);
    }

    function pickActiveNewsletter(rows, todayYmd) {
        if (!todayYmd || !Array.isArray(rows)) {
            return null;
        }
        var active = rows.filter(function (r) {
            if (!r || !isYmd(r.visibleFrom) || !isYmd(r.visibleUntil)) {
                return false;
            }
            return r.visibleFrom <= todayYmd && todayYmd <= r.visibleUntil;
        });
        if (!active.length) {
            return null;
        }
        active.sort(function (a, b) {
            if (a.visibleFrom === b.visibleFrom) {
                return String(b.id).localeCompare(String(a.id));
            }
            return a.visibleFrom < b.visibleFrom ? 1 : -1;
        });
        return active[0];
    }

    function pickDisplayedNewsletter(entry) {
        var lang = getNewsletterContentLanguage();
        var title = lang === "ta" && entry.titleTa ? entry.titleTa : entry.title;
        var body = lang === "ta" && entry.bodyTa ? entry.bodyTa : entry.body;
        if (!title && !body) {
            title = lang === "ta" && entry.titleTa ? "" : entry.title;
            body = lang === "ta" && entry.bodyTa ? entry.bodyTa : entry.body;
        }
        var readLang = "en";
        if (lang === "ta") {
            readLang = (String(entry.bodyTa || "").trim() || String(entry.titleTa || "").trim()) ? "ta" : "en";
        } else {
            if (String(entry.body || "").trim() || String(entry.title || "").trim()) {
                readLang = "en";
            } else if (String(entry.bodyTa || "").trim() || String(entry.titleTa || "").trim()) {
                readLang = "ta";
            } else {
                readLang = "en";
            }
        }
        return {
            title: String(title || "").trim(),
            body: String(body || "").trim(),
            readLang: readLang === "ta" ? "ta" : "en"
        };
    }

    function renderNewsletter(entry) {
        stopSpeechPlayback();
        var picked = pickDisplayedNewsletter(entry);
        var displayTitle = picked.title || T("newsletter.untitled", "Church newsletter");
        headingEl.textContent = displayTitle;
        bodyEl.textContent = picked.body || "";
        currentSpeechTitle = displayTitle;
        currentReadLang = picked.readLang;
        currentReadPlain = sanitizeTextForSpeech([displayTitle, picked.body].filter(Boolean).join(". "));
        var monthLine = formatNewsletterMonthLine(entry);
        if (monthLine) {
            rangeEl.textContent = monthLine;
            rangeEl.hidden = false;
        } else {
            rangeEl.textContent = "";
            rangeEl.hidden = true;
        }
        clearShareFeedback();
        currentShareEntryId = String(entry.id || "").trim();
        currentShareTitleText = displayTitle;
        currentShareBodyPreview = previewPlainBody(picked.body, 220);
        if (shareBtn) {
            shareBtn.hidden = !currentShareEntryId;
        }
        contentWrap.hidden = false;
        statusEl.hidden = true;
        updateTtsUi();
    }

    function showEmpty(message) {
        stopSpeechPlayback();
        currentReadPlain = "";
        currentSpeechTitle = "";
        clearShareFeedback();
        currentShareEntryId = "";
        currentShareTitleText = "";
        currentShareBodyPreview = "";
        if (shareBtn) {
            shareBtn.hidden = true;
        }
        updateTtsUi();
        contentWrap.hidden = true;
        headingEl.textContent = "";
        bodyEl.textContent = "";
        rangeEl.textContent = "";
        rangeEl.hidden = true;
        statusEl.hidden = false;
        statusEl.textContent = message;
    }

    function loadNewsletter() {
        if (!window.NjcAppModules || typeof window.NjcAppModules.isModuleEnabled !== "function"
            || !window.NjcAppModules.isModuleEnabled("newsletter")) {
            showEmpty(T("newsletter.moduleOff", "This section is turned off."));
            return;
        }
        var db = getFirestoreDb();
        if (!db) {
            showEmpty(T("newsletter.noFirebase", "Could not load newsletter. Check your connection."));
            return;
        }
        showEmpty(T("newsletter.loading", "Loading…"));
        var todayYmd = getBrusselsYmd();
        var wantId = getNewsletterIdFromHash();

        function applyRowsSnapshot(snap) {
            var rows = [];
            snap.forEach(function (doc) {
                var n = normalizeDoc(doc);
                if (n) {
                    rows.push(n);
                }
            });
            var pick = pickActiveNewsletter(rows, todayYmd);
            if (!pick) {
                showEmpty(T("newsletter.noneScheduled", "There is no newsletter for this period yet."));
                return;
            }
            renderNewsletter(pick);
        }

        if (wantId) {
            db.collection(NEWSLETTER_COLLECTION).doc(wantId).get()
                .then(function (doc) {
                    var n = normalizeDoc(doc);
                    if (n && doc.exists) {
                        renderNewsletter(n);
                        return;
                    }
                    return db.collection(NEWSLETTER_COLLECTION)
                        .orderBy("visibleFrom", "desc")
                        .limit(48)
                        .get()
                        .then(applyRowsSnapshot);
                })
                .catch(function () {
                    showEmpty(T("newsletter.loadError", "Could not load newsletter."));
                });
            return;
        }

        db.collection(NEWSLETTER_COLLECTION)
            .orderBy("visibleFrom", "desc")
            .limit(48)
            .get()
            .then(applyRowsSnapshot)
            .catch(function () {
                showEmpty(T("newsletter.loadError", "Could not load newsletter."));
            });
    }

    function currentRouteIsNewsletter() {
        var raw = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        var path = raw.split("?")[0];
        return path === "newsletter" || path.indexOf("newsletter/") === 0;
    }

    function onRoute() {
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    }

    window.addEventListener("hashchange", onRoute);
    document.addEventListener("njc:routechange", function (event) {
        var route = event && event.detail && event.detail.route;
        if (String(route || "").toLowerCase() === "newsletter") {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:langchange", function () {
        stopSpeechPlayback();
        currentReadPlain = "";
        updateTtsUi();
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:cardlangchange", function (ev) {
        var d = ev && ev.detail;
        if (!d || d.cardId !== NEWSLETTER_CARD_LANG_ID) {
            return;
        }
        stopSpeechPlayback();
        currentReadPlain = "";
        updateTtsUi();
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });
    document.addEventListener("njc:newsletter-updated", function () {
        if (currentRouteIsNewsletter()) {
            loadNewsletter();
        }
    });

    document.addEventListener("visibilitychange", function () {
        maybeResumeNewsletterAfterBackground();
    });

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
    if (shareBtn) {
        shareBtn.addEventListener("click", function () {
            runNewsletterShare();
        });
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupNewsletterMediaSession();
        updateTtsUi();
        onRoute();
    });
})();
