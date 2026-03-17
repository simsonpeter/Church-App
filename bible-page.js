(function () {
    var ENGLISH_BIBLE_URL = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/englishbible.json";
    var TAMIL_BIBLE_URL = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/tamilbible.json";
    var BIBLE_STATE_KEY = "njc_bible_reader_state_v1";
    var languageEnButton = document.getElementById("bible-language-en");
    var languageTaButton = document.getElementById("bible-language-ta");
    var bookSelect = document.getElementById("bible-book-select");
    var chapterSelect = document.getElementById("bible-chapter-select");
    var verseInput = document.getElementById("bible-verse-input");
    var verseGoButton = document.getElementById("bible-verse-go");
    var prevChapterButton = document.getElementById("bible-prev-chapter");
    var nextChapterButton = document.getElementById("bible-next-chapter");
    var ttsToggleButton = document.getElementById("bible-tts-toggle");
    var ttsStopButton = document.getElementById("bible-tts-stop");
    var ttsToggleIcon = ttsToggleButton ? ttsToggleButton.querySelector("i") : null;
    var fullScreenToggleButton = document.getElementById("bible-fullscreen-toggle");
    var fullScreenToggleIcon = fullScreenToggleButton ? fullScreenToggleButton.querySelector("i") : null;
    var statusNote = document.getElementById("bible-status-note");
    var verseList = document.getElementById("bible-verse-list");
    var bibleCard = verseList ? verseList.closest(".card") : null;

    if (!bookSelect || !chapterSelect || !verseList || !languageEnButton || !languageTaButton) {
        return;
    }

    var ENGLISH_BOOKS = [
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
        "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
        "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah",
        "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
        "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
        "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
        "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews",
        "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
    ];

    var TAMIL_BOOKS = [
        "ஆதியாகமம்", "யாத்திராகமம்", "லேவியராகமம்", "எண்ணாகமம்", "உபாகமம்", "யோசுவா", "நியாயாதிபதிகள்", "ரூத்து",
        "1 சாமுவேல்", "2 சாமுவேல்", "1 இராஜாக்கள்", "2 இராஜாக்கள்", "1 நாளாகமம்", "2 நாளாகமம்", "எஸ்றா", "நேகேமியா",
        "எஸ்தர்", "யோபு", "சங்கீதம்", "நீதிமொழிகள்", "பிரசங்கி", "உன்னதப்பாட்டு", "ஏசாயா", "எரேமியா",
        "புலம்பல்", "எசேக்கியேல்", "தானியேல்", "ஓசியா", "யோவேல்", "ஆமோஸ்", "ஒபதியா", "யோனா", "மீகா", "நாகூம்",
        "ஆபகூக்", "செப்பனியா", "ஆகாய்", "சகரியா", "மல்கியா", "மத்தேயு", "மாற்கு", "லூக்கா", "யோவான்", "அப்போஸ்தலர் செயல்கள்",
        "ரோமர்", "1 கொரிந்தியர்", "2 கொரிந்தியர்", "கலாத்தியர்", "எபேசியர்", "பிலிப்பியர்", "கொலோசெயர்",
        "1 தெசலோனிக்கேயர்", "2 தெசலோனிக்கேயர்", "1 தீமோத்தேயு", "2 தீமோத்தேயு", "தீத்து", "பிலேமோன்", "எபிரெயர்",
        "யாக்கோபு", "1 பேதுரு", "2 பேதுரு", "1 யோவான்", "2 யோவான்", "3 யோவான்", "யூதா", "வெளிப்படுத்தல்"
    ];

    var cache = {
        en: null,
        ta: null
    };
    var loadingPromise = {
        en: null,
        ta: null
    };
    var state = getStoredState();
    var streamSupported = Boolean(typeof window !== "undefined" && typeof window.Audio === "function");
    var speechSupported = Boolean(
        typeof window !== "undefined" &&
        typeof window.speechSynthesis !== "undefined" &&
        typeof window.SpeechSynthesisUtterance === "function"
    );
    var speechState = {
        active: false,
        paused: false,
        mode: "none"
    };
    var speakingUtterance = null;
    var streamAudio = streamSupported ? new Audio() : null;
    var currentSpeechText = "";
    var currentSpeechStartVerse = 1;
    var currentSpeechContext = {
        language: "en",
        location: { book: 0, chapter: 0 },
        verses: []
    };
    var screenWakeLock = null;
    var streamQueue = [];
    var streamQueueIndex = 0;
    var streamErrorCount = 0;
    var miniBiblePlayer = null;
    var miniBibleOpenButton = null;
    var miniBibleTitleNode = null;
    var miniBibleInfoNode = null;
    var miniBiblePlayButton = null;
    var miniBibleCloseButton = null;
    var sermonMiniObserver = null;

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && bibleCard) {
            return window.NjcI18n.tForElement(bibleCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getSpeechSynthesisApi() {
        if (!speechSupported) {
            return null;
        }
        return window.speechSynthesis || null;
    }

    function getSpeechVoices() {
        var synth = getSpeechSynthesisApi();
        if (!synth || typeof synth.getVoices !== "function") {
            return [];
        }
        var voices = synth.getVoices();
        return Array.isArray(voices) ? voices : [];
    }

    function pickNaturalVoice(language) {
        var targetLang = normalizeLanguage(language);
        var targetPrefix = targetLang === "ta" ? "ta" : "en";
        var voices = getSpeechVoices();
        if (!voices.length) {
            return null;
        }
        var candidates = voices.filter(function (voice) {
            var lang = String(voice && voice.lang || "").toLowerCase();
            return lang.indexOf(targetPrefix) === 0;
        });
        if (!candidates.length && targetLang === "ta") {
            candidates = voices.filter(function (voice) {
                return String(voice && voice.name || "").toLowerCase().indexOf("tamil") >= 0;
            });
        }
        if (!candidates.length) {
            candidates = voices;
        }
        var bestVoice = null;
        var bestScore = -1;
        candidates.forEach(function (voice) {
            var lang = String(voice && voice.lang || "").toLowerCase();
            var name = String(voice && voice.name || "").toLowerCase();
            var score = 0;
            if (lang.indexOf(targetPrefix) === 0) {
                score += 30;
            }
            if (/natural|neural|premium/.test(name)) {
                score += 16;
            }
            if (/google|microsoft|samantha|alex|daniel|zira|enhanced/.test(name)) {
                score += 8;
            }
            if (voice && voice.default) {
                score += 4;
            }
            if (score > bestScore) {
                bestScore = score;
                bestVoice = voice;
            }
        });
        return bestVoice;
    }

    function buildChapterSpeechText(language, location, verses, startVerseNumber) {
        var chapterNumber = Number(location && location.chapter || 0) + 1;
        var header = normalizeLanguage(language) === "ta"
            ? (getBookName(language, Number(location && location.book || 0)) + " அதிகாரம் " + String(chapterNumber))
            : (getBookName(language, Number(location && location.book || 0)) + " chapter " + String(chapterNumber));
        var safeStartVerse = Math.max(1, Number(startVerseNumber || 1));
        var startIndex = safeStartVerse - 1;
        var lines = [header];
        (Array.isArray(verses) ? verses : []).forEach(function (verseItem, index) {
            if (index < startIndex) {
                return;
            }
            var safeNumber = index + 1;
            var text = String(verseItem && verseItem.Verse || "").replace(/\s+/g, " ").trim();
            if (!text) {
                return;
            }
            if (normalizeLanguage(language) === "ta") {
                lines.push("வசனம் " + String(safeNumber) + ". " + text);
                return;
            }
            lines.push("Verse " + String(safeNumber) + ". " + text);
        });
        return lines.join(". ");
    }

    function splitLongSegment(text, maxLength) {
        var clean = String(text || "").replace(/\s+/g, " ").trim();
        var size = Math.max(80, Number(maxLength || 160));
        if (!clean) {
            return [];
        }
        if (clean.length <= size) {
            return [clean];
        }
        var words = clean.split(" ");
        var segments = [];
        var cursor = "";
        words.forEach(function (word) {
            var next = cursor ? (cursor + " " + word) : word;
            if (next.length > size) {
                if (cursor) {
                    segments.push(cursor);
                }
                if (word.length > size) {
                    var chunk = word;
                    while (chunk.length > size) {
                        segments.push(chunk.slice(0, size));
                        chunk = chunk.slice(size);
                    }
                    cursor = chunk;
                    return;
                }
                cursor = word;
                return;
            }
            cursor = next;
        });
        if (cursor) {
            segments.push(cursor);
        }
        return segments;
    }

    function buildChapterSpeechSegments(language, location, verses, startVerseNumber) {
        var activeLanguage = normalizeLanguage(language);
        var chapterNumber = Number(location && location.chapter || 0) + 1;
        var header = activeLanguage === "ta"
            ? (getBookName(language, Number(location && location.book || 0)) + " அதிகாரம் " + String(chapterNumber))
            : (getBookName(language, Number(location && location.book || 0)) + " chapter " + String(chapterNumber));
        var safeStartVerse = Math.max(1, Number(startVerseNumber || 1));
        var startIndex = safeStartVerse - 1;
        var lines = [header];
        if (safeStartVerse > 1) {
            lines.push(activeLanguage === "ta"
                ? ("வசனம் " + String(safeStartVerse) + " முதல் வாசிக்கப்படுகிறது")
                : ("Starting from verse " + String(safeStartVerse))
            );
        }
        (Array.isArray(verses) ? verses : []).forEach(function (verseItem, index) {
            if (index < startIndex) {
                return;
            }
            var safeNumber = index + 1;
            var text = String(verseItem && verseItem.Verse || "").replace(/\s+/g, " ").trim();
            if (!text) {
                return;
            }
            if (activeLanguage === "ta") {
                lines.push("வசனம் " + String(safeNumber) + ". " + text);
                return;
            }
            lines.push("Verse " + String(safeNumber) + ". " + text);
        });

        var pieces = [];
        lines.forEach(function (line) {
            splitLongSegment(line, 160).forEach(function (piece) {
                pieces.push(piece);
            });
        });
        var segments = [];
        var chunk = "";
        pieces.forEach(function (piece) {
            var next = chunk ? (chunk + ". " + piece) : piece;
            if (next.length > 180) {
                if (chunk) {
                    segments.push(chunk);
                }
                chunk = piece;
                return;
            }
            chunk = next;
        });
        if (chunk) {
            segments.push(chunk);
        }
        return segments;
    }

    function getRemoteTtsUrl(language, text) {
        var targetLang = normalizeLanguage(language) === "ta" ? "ta" : "en";
        return "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=" +
            encodeURIComponent(targetLang) +
            "&q=" + encodeURIComponent(String(text || ""));
    }

    function syncMediaSessionState() {
        if (typeof navigator === "undefined" || !navigator.mediaSession) {
            return;
        }
        try {
            var activeLanguage = normalizeLanguage(currentSpeechContext.language);
            var location = currentSpeechContext.location || { book: 0, chapter: 0 };
            var chapterNumber = Number(location.chapter || 0) + 1;
            var metaTitle = getBookName(activeLanguage, Number(location.book || 0));
            var metaArtist = activeLanguage === "ta"
                ? ("அதிகாரம் " + String(chapterNumber) + " · வசனம் " + String(currentSpeechStartVerse) + "+")
                : ("Chapter " + String(chapterNumber) + " · Verse " + String(currentSpeechStartVerse) + "+");
            if (typeof window.MediaMetadata === "function") {
                navigator.mediaSession.metadata = new MediaMetadata({
                    title: metaTitle,
                    artist: metaArtist,
                    album: "NJC Bible Reader"
                });
            }
            navigator.mediaSession.playbackState = speechState.active
                ? (speechState.paused ? "paused" : "playing")
                : "none";
        } catch (err) {
            return;
        }
    }

    function setupMediaSessionHandlers() {
        if (typeof navigator === "undefined" || !navigator.mediaSession) {
            return;
        }
        try {
            navigator.mediaSession.setActionHandler("play", function () {
                toggleSpeechPlayback();
            });
            navigator.mediaSession.setActionHandler("pause", function () {
                if (speechState.mode === "stream" && streamAudio && !streamAudio.paused) {
                    streamAudio.pause();
                    releaseWakeLock();
                    return;
                }
                var synth = getSpeechSynthesisApi();
                if (speechState.mode === "speech" && synth && synth.speaking && !synth.paused) {
                    synth.pause();
                    speechState.paused = true;
                    releaseWakeLock();
                    updateTtsControls();
                }
            });
            navigator.mediaSession.setActionHandler("stop", function () {
                stopSpeechPlayback();
            });
            navigator.mediaSession.setActionHandler("seekbackward", null);
            navigator.mediaSession.setActionHandler("seekforward", null);
            navigator.mediaSession.setActionHandler("previoustrack", null);
            navigator.mediaSession.setActionHandler("nexttrack", null);
        } catch (err) {
            return;
        }
    }

    function startStreamSegment(index) {
        if (!streamAudio) {
            return false;
        }
        if (!Array.isArray(streamQueue) || !streamQueue.length) {
            return false;
        }
        if (index < 0 || index >= streamQueue.length) {
            return false;
        }
        streamQueueIndex = index;
        streamAudio.src = getRemoteTtsUrl(currentSpeechContext.language, streamQueue[streamQueueIndex]);
        var playPromise = streamAudio.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(function () {
                if (speechState.mode !== "stream") {
                    return;
                }
                streamErrorCount += 1;
                if (streamErrorCount <= 1) {
                    startSpeechSynthesisPlayback();
                    return;
                }
                stopSpeechPlayback();
            });
        }
        return true;
    }

    function startStreamPlayback() {
        if (!streamAudio) {
            return false;
        }
        var wasStreamMode = speechState.mode === "stream";
        if (wasStreamMode) {
            speechState.mode = "none";
        }
        streamAudio.pause();
        streamAudio.removeAttribute("src");
        streamAudio.load();
        if (wasStreamMode) {
            speechState.mode = "stream";
        }
        var verses = Array.isArray(currentSpeechContext.verses) ? currentSpeechContext.verses : [];
        if (!verses.length) {
            return false;
        }
        var startVerse = getSelectedVerseStart(verses.length);
        currentSpeechStartVerse = startVerse;
        streamQueue = buildChapterSpeechSegments(
            normalizeLanguage(currentSpeechContext.language),
            currentSpeechContext.location || { book: 0, chapter: 0 },
            verses,
            startVerse
        );
        if (!streamQueue.length) {
            return false;
        }
        streamQueueIndex = 0;
        streamErrorCount = 0;
        speechState.mode = "stream";
        speechState.active = true;
        speechState.paused = false;
        speakingUtterance = null;
        var synth = getSpeechSynthesisApi();
        if (synth) {
            synth.cancel();
        }
        updateTtsControls();
        syncMediaSessionState();
        requestWakeLock();
        return startStreamSegment(0);
    }

    function setupStreamAudio() {
        if (!streamAudio) {
            return;
        }
        streamAudio.preload = "auto";
        streamAudio.addEventListener("play", function () {
            if (speechState.mode !== "stream") {
                return;
            }
            speechState.active = true;
            speechState.paused = false;
            requestWakeLock();
            updateTtsControls();
            syncMediaSessionState();
        });
        streamAudio.addEventListener("pause", function () {
            if (speechState.mode !== "stream" || !speechState.active) {
                return;
            }
            if (!streamAudio.ended) {
                speechState.paused = true;
                releaseWakeLock();
                updateTtsControls();
                syncMediaSessionState();
            }
        });
        streamAudio.addEventListener("ended", function () {
            if (speechState.mode !== "stream" || !speechState.active) {
                return;
            }
            var nextIndex = streamQueueIndex + 1;
            if (nextIndex < streamQueue.length) {
                startStreamSegment(nextIndex);
                return;
            }
            releaseWakeLock();
            speechState.active = false;
            speechState.paused = false;
            speechState.mode = "none";
            updateTtsControls();
            syncMediaSessionState();
        });
        streamAudio.addEventListener("error", function () {
            if (speechState.mode !== "stream" || !speechState.active) {
                return;
            }
            streamErrorCount += 1;
            if (streamErrorCount <= 1) {
                startSpeechSynthesisPlayback();
                return;
            }
            stopSpeechPlayback();
        });
    }

    function isBiblePlaybackVisible() {
        return speechState.mode !== "none" || speechState.active || speechState.paused;
    }

    function getMiniBibleInfoText() {
        var activeLanguage = normalizeLanguage(currentSpeechContext.language);
        var location = currentSpeechContext.location || { book: 0, chapter: 0 };
        var chapterNumber = Number(location.chapter || 0) + 1;
        var bookTitle = getBookName(activeLanguage, Number(location.book || 0));
        var verseLabel = T("bible.verse", "Verse");
        return bookTitle + " " + String(chapterNumber) + " • " + verseLabel + " " + String(currentSpeechStartVerse) + "+";
    }

    function ensureMiniBiblePlayer() {
        if (miniBiblePlayer && miniBibleOpenButton && miniBiblePlayButton && miniBibleCloseButton) {
            return;
        }
        miniBiblePlayer = document.getElementById("mini-bible-player");
        miniBibleOpenButton = document.getElementById("mini-bible-open");
        miniBibleTitleNode = document.getElementById("mini-bible-title");
        miniBibleInfoNode = document.getElementById("mini-bible-info");
        miniBiblePlayButton = document.getElementById("mini-bible-play");
        miniBibleCloseButton = document.getElementById("mini-bible-close");
        if (!miniBiblePlayer || !miniBibleOpenButton || !miniBibleTitleNode || !miniBibleInfoNode || !miniBiblePlayButton || !miniBibleCloseButton) {
            return;
        }

        if (miniBibleOpenButton && !miniBibleOpenButton.dataset.bound) {
            miniBibleOpenButton.dataset.bound = "1";
            miniBibleOpenButton.addEventListener("click", function () {
                window.location.hash = "#bible";
            });
        }
        if (miniBiblePlayButton && !miniBiblePlayButton.dataset.bound) {
            miniBiblePlayButton.dataset.bound = "1";
            miniBiblePlayButton.addEventListener("click", function () {
                toggleSpeechPlayback();
            });
        }
        if (miniBibleCloseButton && !miniBibleCloseButton.dataset.bound) {
            miniBibleCloseButton.dataset.bound = "1";
            miniBibleCloseButton.addEventListener("click", function () {
                stopSpeechPlayback();
            });
        }
    }

    function refreshMiniBiblePlayer() {
        ensureMiniBiblePlayer();
        if (!miniBiblePlayer || !miniBibleOpenButton || !miniBibleTitleNode || !miniBibleInfoNode || !miniBiblePlayButton || !miniBibleCloseButton) {
            return;
        }
        var visible = isBiblePlaybackVisible();
        miniBiblePlayer.hidden = !visible;
        miniBiblePlayer.style.display = visible ? "grid" : "";
        if (!visible) {
            return;
        }
        var sermonMini = document.getElementById("mini-sermon-player");
        var sermonVisible = Boolean(sermonMini && !sermonMini.hidden);
        miniBiblePlayer.style.bottom = sermonVisible
            ? "calc(max(12px, env(safe-area-inset-bottom)) + 146px)"
            : "calc(max(12px, env(safe-area-inset-bottom)) + 86px)";
        miniBibleTitleNode.textContent = T("bible.title", "Bible Reader");
        miniBibleInfoNode.textContent = getMiniBibleInfoText();

        var isPlaying = speechState.active && !speechState.paused;
        var playIcon = isPlaying ? "fa-pause" : "fa-play";
        miniBiblePlayButton.innerHTML = "<i class=\"fa-solid " + playIcon + "\"></i>";

        var openLabel = T("player.openBiblePage", "Open Bible page");
        miniBibleOpenButton.setAttribute("aria-label", openLabel);
        miniBibleOpenButton.title = openLabel;
        var playLabel = isPlaying
            ? T("bible.ttsPause", "Pause audio bible")
            : (speechState.paused ? T("bible.ttsResume", "Resume audio bible") : T("bible.ttsPlay", "Start audio bible"));
        miniBiblePlayButton.setAttribute("aria-label", playLabel);
        miniBiblePlayButton.title = playLabel;
        var stopLabel = T("bible.ttsStop", "Stop audio bible");
        miniBibleCloseButton.setAttribute("aria-label", stopLabel);
        miniBibleCloseButton.title = stopLabel;
    }

    function setupSermonMiniObserver() {
        if (sermonMiniObserver || typeof MutationObserver === "undefined") {
            return;
        }
        var sermonMini = document.getElementById("mini-sermon-player");
        if (!sermonMini) {
            return;
        }
        sermonMiniObserver = new MutationObserver(function () {
            refreshMiniBiblePlayer();
        });
        sermonMiniObserver.observe(sermonMini, {
            attributes: true,
            attributeFilter: ["hidden", "style", "class"]
        });
    }

    function getSelectedVerseStart(maxVerses) {
        var max = Math.max(1, Number(maxVerses || 1));
        var chosen = Number(verseInput && verseInput.value);
        if (!Number.isInteger(chosen) || chosen <= 0) {
            return 1;
        }
        return Math.min(chosen, max);
    }

    function updateSpeechTextFromSelection() {
        var verses = Array.isArray(currentSpeechContext.verses) ? currentSpeechContext.verses : [];
        if (!verses.length) {
            currentSpeechText = "";
            currentSpeechStartVerse = 1;
            updateTtsControls();
            return;
        }
        var startVerse = getSelectedVerseStart(verses.length);
        currentSpeechStartVerse = startVerse;
        currentSpeechText = buildChapterSpeechText(
            normalizeLanguage(currentSpeechContext.language),
            currentSpeechContext.location || { book: 0, chapter: 0 },
            verses,
            startVerse
        );
        updateTtsControls();
        syncMediaSessionState();
    }

    function releaseWakeLock() {
        if (!screenWakeLock || typeof screenWakeLock.release !== "function") {
            screenWakeLock = null;
            return;
        }
        var lock = screenWakeLock;
        screenWakeLock = null;
        lock.release().catch(function () {
            return null;
        });
    }

    function requestWakeLock() {
        if (typeof navigator === "undefined" || !navigator.wakeLock || typeof navigator.wakeLock.request !== "function") {
            return;
        }
        navigator.wakeLock.request("screen").then(function (lock) {
            screenWakeLock = lock;
            if (lock && typeof lock.addEventListener === "function") {
                lock.addEventListener("release", function () {
                    if (screenWakeLock === lock) {
                        screenWakeLock = null;
                    }
                });
            }
        }).catch(function () {
            return null;
        });
    }

    function updateTtsControls() {
        if (!ttsToggleButton || !ttsStopButton) {
            return;
        }
        if (!speechSupported && !streamSupported) {
            ttsToggleButton.disabled = true;
            ttsStopButton.disabled = true;
            ttsToggleButton.title = T("bible.ttsUnsupported", "Audio Bible is not supported in this browser.");
            ttsToggleButton.setAttribute("aria-label", ttsToggleButton.title);
            ttsStopButton.title = ttsToggleButton.title;
            ttsStopButton.setAttribute("aria-label", ttsStopButton.title);
            return;
        }
        var toggleLabel;
        if (speechState.active && speechState.paused) {
            toggleLabel = T("bible.ttsResume", "Resume audio bible");
            if (ttsToggleIcon) {
                ttsToggleIcon.className = "fa-solid fa-play";
            }
        } else if (speechState.active) {
            toggleLabel = T("bible.ttsPause", "Pause audio bible");
            if (ttsToggleIcon) {
                ttsToggleIcon.className = "fa-solid fa-pause";
            }
        } else {
            toggleLabel = T("bible.ttsPlay", "Start audio bible");
            if (ttsToggleIcon) {
                ttsToggleIcon.className = "fa-solid fa-volume-high";
            }
        }
        ttsToggleButton.disabled = !currentSpeechText;
        ttsToggleButton.title = toggleLabel;
        ttsToggleButton.setAttribute("aria-label", toggleLabel);
        ttsToggleButton.classList.toggle("active", speechState.active);
        ttsToggleButton.setAttribute("aria-pressed", speechState.active ? "true" : "false");
        var stopLabel = T("bible.ttsStop", "Stop audio bible");
        ttsStopButton.title = stopLabel;
        ttsStopButton.setAttribute("aria-label", stopLabel);
        ttsStopButton.disabled = !speechState.active && !speechState.paused;
        refreshMiniBiblePlayer();
    }

    function stopSpeechPlayback() {
        var synth = getSpeechSynthesisApi();
        speechState.active = false;
        speechState.paused = false;
        speechState.mode = "none";
        if (synth) {
            synth.cancel();
        }
        if (streamAudio) {
            streamAudio.pause();
            streamAudio.removeAttribute("src");
            streamAudio.load();
        }
        releaseWakeLock();
        speakingUtterance = null;
        streamQueue = [];
        streamQueueIndex = 0;
        streamErrorCount = 0;
        updateTtsControls();
        syncMediaSessionState();
    }

    function startSpeechSynthesisPlayback() {
        if (!speechSupported) {
            updateTtsControls();
            return;
        }
        var synth = getSpeechSynthesisApi();
        if (!synth || !currentSpeechText) {
            updateTtsControls();
            return;
        }
        if (streamAudio) {
            var wasStreamMode = speechState.mode === "stream";
            if (wasStreamMode) {
                speechState.mode = "none";
            }
            streamAudio.pause();
            streamAudio.removeAttribute("src");
            streamAudio.load();
            if (wasStreamMode) {
                speechState.mode = "stream";
            }
        }
        synth.cancel();
        var utterance = new SpeechSynthesisUtterance(currentSpeechText);
        var activeLanguage = normalizeLanguage(state.language);
        utterance.lang = activeLanguage === "ta" ? "ta-IN" : "en-GB";
        utterance.rate = activeLanguage === "ta" ? 0.9 : 0.95;
        utterance.pitch = 1;
        var voice = pickNaturalVoice(activeLanguage);
        if (voice) {
            utterance.voice = voice;
        }
        utterance.onend = function () {
            if (speakingUtterance !== utterance) {
                return;
            }
            releaseWakeLock();
            speakingUtterance = null;
            speechState.active = false;
            speechState.paused = false;
            speechState.mode = "none";
            updateTtsControls();
            syncMediaSessionState();
        };
        utterance.onerror = function () {
            if (speakingUtterance !== utterance) {
                return;
            }
            releaseWakeLock();
            speakingUtterance = null;
            speechState.active = false;
            speechState.paused = false;
            speechState.mode = "none";
            updateTtsControls();
            syncMediaSessionState();
        };
        speakingUtterance = utterance;
        speechState.mode = "speech";
        speechState.active = true;
        speechState.paused = false;
        updateTtsControls();
        syncMediaSessionState();
        requestWakeLock();
        synth.speak(utterance);
    }

    function startSpeechPlayback() {
        updateSpeechTextFromSelection();
        if (!currentSpeechText) {
            updateTtsControls();
            return;
        }
        if (streamSupported && startStreamPlayback()) {
            return;
        }
        startSpeechSynthesisPlayback();
    }

    function toggleSpeechPlayback() {
        if (!speechSupported && !streamSupported) {
            return;
        }
        if (speechState.mode === "stream" && streamAudio) {
            var currentVerseChoice = getSelectedVerseStart(
                Array.isArray(currentSpeechContext.verses) ? currentSpeechContext.verses.length : 1
            );
            if (speechState.active && !speechState.paused && !streamAudio.paused) {
                streamAudio.pause();
                speechState.paused = true;
                releaseWakeLock();
                updateTtsControls();
                syncMediaSessionState();
                return;
            }
            if (speechState.active && speechState.paused) {
                if (currentVerseChoice !== currentSpeechStartVerse) {
                    startSpeechPlayback();
                    return;
                }
                streamAudio.play().catch(function () {
                    return null;
                });
                speechState.paused = false;
                requestWakeLock();
                updateTtsControls();
                syncMediaSessionState();
                return;
            }
            startSpeechPlayback();
            return;
        }
        if (!speechSupported) {
            startSpeechPlayback();
            return;
        }
        var synth = getSpeechSynthesisApi();
        if (!synth) {
            startSpeechPlayback();
            return;
        }
        if (speechState.active && synth.speaking && !synth.paused) {
            synth.pause();
            speechState.paused = true;
            releaseWakeLock();
            updateTtsControls();
            syncMediaSessionState();
            return;
        }
        if (speechState.active && synth.paused) {
            var currentVerseChoiceSpeech = getSelectedVerseStart(
                Array.isArray(currentSpeechContext.verses) ? currentSpeechContext.verses.length : 1
            );
            if (currentVerseChoiceSpeech !== currentSpeechStartVerse) {
                startSpeechPlayback();
                return;
            }
            synth.resume();
            speechState.paused = false;
            requestWakeLock();
            updateTtsControls();
            syncMediaSessionState();
            return;
        }
        startSpeechPlayback();
    }

    function normalizeLanguage(value) {
        return value === "ta" ? "ta" : "en";
    }

    function normalizeNumber(value, fallback) {
        var num = Number(value);
        return Number.isInteger(num) && num >= 0 ? num : fallback;
    }

    function getStoredState() {
        try {
            var raw = window.localStorage.getItem(BIBLE_STATE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            var source = parsed && typeof parsed === "object" ? parsed : {};
            return {
                language: normalizeLanguage(source.language),
                en: {
                    book: normalizeNumber(source.en && source.en.book, 0),
                    chapter: normalizeNumber(source.en && source.en.chapter, 0)
                },
                ta: {
                    book: normalizeNumber(source.ta && source.ta.book, 0),
                    chapter: normalizeNumber(source.ta && source.ta.chapter, 0)
                }
            };
        } catch (err) {
            return {
                language: "en",
                en: { book: 0, chapter: 0 },
                ta: { book: 0, chapter: 0 }
            };
        }
    }

    function saveState() {
        try {
            window.localStorage.setItem(BIBLE_STATE_KEY, JSON.stringify(state));
        } catch (err) {
            return null;
        }
        return null;
    }

    function setLanguageButtons() {
        var active = normalizeLanguage(state.language);
        var enActive = active === "en";
        languageEnButton.classList.toggle("active", enActive);
        languageTaButton.classList.toggle("active", !enActive);
        languageEnButton.setAttribute("aria-pressed", enActive ? "true" : "false");
        languageTaButton.setAttribute("aria-pressed", enActive ? "false" : "true");
    }

    function getBooksForLanguage(language) {
        return language === "ta" ? TAMIL_BOOKS : ENGLISH_BOOKS;
    }

    function getBookName(language, index) {
        var books = getBooksForLanguage(language);
        var fallback = T("bible.book", "Book") + " " + String(index + 1);
        return books[index] || fallback;
    }

    function setStatus(text, isError) {
        if (!statusNote) {
            return;
        }
        statusNote.textContent = text || "";
        statusNote.dataset.state = isError ? "error" : "";
    }

    function renderLoading() {
        setStatus(T("bible.loading", "Loading Bible..."), false);
        verseList.innerHTML = "" +
            "<li>" +
            "  <p>" + escapeHtml(T("bible.loading", "Loading Bible...")) + "</p>" +
            "</li>";
    }

    function renderLoadError() {
        setStatus(T("bible.error", "Could not load Bible right now."), true);
        currentSpeechContext = {
            language: normalizeLanguage(state.language),
            location: { book: 0, chapter: 0 },
            verses: []
        };
        currentSpeechText = "";
        stopSpeechPlayback();
        verseList.innerHTML = "" +
            "<li>" +
            "  <p>" + escapeHtml(T("bible.error", "Could not load Bible right now.")) + "</p>" +
            "</li>";
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getCurrentLangState() {
        var language = normalizeLanguage(state.language);
        if (!state[language]) {
            state[language] = { book: 0, chapter: 0 };
        }
        return state[language];
    }

    function isBibleRouteActive() {
        var route = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        return route === "bible";
    }

    function setFullScreenMode(open) {
        if (!bibleCard) {
            return;
        }
        var shouldOpen = Boolean(open);
        if (shouldOpen && !isBibleRouteActive()) {
            return;
        }
        document.body.classList.toggle("bible-fullscreen-open", shouldOpen);
        bibleCard.classList.toggle("bible-card-fullscreen", shouldOpen);
        if (fullScreenToggleButton) {
            var buttonLabel = shouldOpen ? T("bible.fullscreenExit", "Exit to app") : T("bible.fullscreenOpen", "Full screen reading");
            fullScreenToggleButton.setAttribute("aria-pressed", shouldOpen ? "true" : "false");
            fullScreenToggleButton.setAttribute("aria-label", buttonLabel);
            fullScreenToggleButton.title = buttonLabel;
        }
        if (fullScreenToggleIcon) {
            fullScreenToggleIcon.className = "fa-solid fa-expand";
        }
        if (shouldOpen) {
            window.scrollTo(0, 0);
        }
    }

    function exitFullScreenIfNeeded() {
        if (!document.body.classList.contains("bible-fullscreen-open")) {
            return;
        }
        if (!isBibleRouteActive()) {
            setFullScreenMode(false);
        }
    }

    function clampLocation(data, location) {
        var source = location && typeof location === "object" ? location : { book: 0, chapter: 0 };
        var books = data && Array.isArray(data.Book) ? data.Book : [];
        if (!books.length) {
            return { book: 0, chapter: 0 };
        }
        var bookIndex = Math.min(Math.max(0, normalizeNumber(source.book, 0)), books.length - 1);
        var chapters = books[bookIndex] && Array.isArray(books[bookIndex].Chapter) ? books[bookIndex].Chapter : [];
        var chapterIndex = Math.min(Math.max(0, normalizeNumber(source.chapter, 0)), Math.max(0, chapters.length - 1));
        return { book: bookIndex, chapter: chapterIndex };
    }

    function loadBible(language) {
        var lang = normalizeLanguage(language);
        if (cache[lang]) {
            return Promise.resolve(cache[lang]);
        }
        if (loadingPromise[lang]) {
            return loadingPromise[lang];
        }
        var url = lang === "ta" ? TAMIL_BIBLE_URL : ENGLISH_BIBLE_URL;
        loadingPromise[lang] = fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Bible load failed");
                }
                return response.json();
            })
            .then(function (payload) {
                if (!payload || !Array.isArray(payload.Book)) {
                    throw new Error("Invalid bible shape");
                }
                cache[lang] = payload;
                return payload;
            })
            .finally(function () {
                loadingPromise[lang] = null;
            });
        return loadingPromise[lang];
    }

    function renderSelectOptions(data) {
        var language = normalizeLanguage(state.language);
        var location = clampLocation(data, getCurrentLangState());
        state[language] = { book: location.book, chapter: location.chapter };

        var books = data && Array.isArray(data.Book) ? data.Book : [];
        bookSelect.innerHTML = books.map(function (_book, index) {
            return "<option value=\"" + String(index) + "\">" + escapeHtml(getBookName(language, index)) + "</option>";
        }).join("");
        bookSelect.value = String(location.book);

        var chapters = books[location.book] && Array.isArray(books[location.book].Chapter) ? books[location.book].Chapter : [];
        chapterSelect.innerHTML = chapters.map(function (_chapter, index) {
            return "<option value=\"" + String(index) + "\">" + String(index + 1) + "</option>";
        }).join("");
        chapterSelect.value = String(location.chapter);

        prevChapterButton.disabled = (location.book === 0 && location.chapter === 0);
        var hasNextInBook = location.chapter < Math.max(0, chapters.length - 1);
        var hasNextBook = location.book < Math.max(0, books.length - 1);
        nextChapterButton.disabled = !(hasNextInBook || hasNextBook);
    }

    function resetChapterViewPosition() {
        if (verseList) {
            verseList.scrollTop = 0;
            verseList.querySelectorAll(".bible-verse-item.highlight").forEach(function (node) {
                node.classList.remove("highlight");
            });
        }
        if (verseInput) {
            verseInput.value = "1";
        }
    }

    function renderVerses(data, options) {
        var config = options && typeof options === "object" ? options : {};
        var resetPosition = Boolean(config.resetPosition);
        var language = normalizeLanguage(state.language);
        var location = clampLocation(data, getCurrentLangState());
        state[language] = { book: location.book, chapter: location.chapter };
        saveState();

        var books = data && Array.isArray(data.Book) ? data.Book : [];
        var book = books[location.book] || {};
        var chapters = Array.isArray(book.Chapter) ? book.Chapter : [];
        var chapter = chapters[location.chapter] || {};
        var verses = Array.isArray(chapter.Verse) ? chapter.Verse : [];

        renderSelectOptions(data);
        setStatus(getBookName(language, location.book) + " " + String(location.chapter + 1), false);

        if (!verses.length) {
            currentSpeechContext = {
                language: language,
                location: { book: location.book, chapter: location.chapter },
                verses: []
            };
            currentSpeechText = "";
            verseList.innerHTML = "" +
                "<li>" +
                "  <p>" + escapeHtml(T("bible.noData", "No verses available for this chapter.")) + "</p>" +
                "</li>";
            if (resetPosition) {
                resetChapterViewPosition();
            }
            updateTtsControls();
            return;
        }

        verseList.innerHTML = verses.map(function (verseItem, index) {
            // Readingplan JSON uses global Verseid (e.g. 1001 for chapter 2 verse 1),
            // but UI should always show chapter-local numbering: 1, 2, 3...
            var safeNumber = index + 1;
            var text = String(verseItem && verseItem.Verse || "").trim();
            return "" +
                "<li class=\"bible-verse-item\" id=\"bible-verse-" + String(safeNumber) + "\" data-verse-number=\"" + String(safeNumber) + "\">" +
                "  <span class=\"bible-verse-num\">" + String(safeNumber) + "</span>" +
                "  <p class=\"bible-verse-text\">" + escapeHtml(text) + "</p>" +
                "</li>";
        }).join("");
        currentSpeechContext = {
            language: language,
            location: { book: location.book, chapter: location.chapter },
            verses: verses
        };
        updateSpeechTextFromSelection();
        if (resetPosition) {
            resetChapterViewPosition();
            updateSpeechTextFromSelection();
        }
    }

    function renderBible() {
        setLanguageButtons();
        renderLoading();
        loadBible(state.language).then(function (data) {
            renderVerses(data, { resetPosition: true });
        }).catch(function () {
            renderLoadError();
        });
    }

    function setLanguage(language) {
        stopSpeechPlayback();
        state.language = normalizeLanguage(language);
        setLanguageButtons();
        renderBible();
    }

    function moveChapter(step) {
        stopSpeechPlayback();
        loadBible(state.language).then(function (data) {
            var language = normalizeLanguage(state.language);
            var location = clampLocation(data, getCurrentLangState());
            var books = data && Array.isArray(data.Book) ? data.Book : [];
            if (!books.length) {
                return;
            }
            if (step < 0) {
                if (location.chapter > 0) {
                    location.chapter -= 1;
                } else if (location.book > 0) {
                    location.book -= 1;
                    var prevChapters = books[location.book] && Array.isArray(books[location.book].Chapter) ? books[location.book].Chapter : [];
                    location.chapter = Math.max(0, prevChapters.length - 1);
                }
            } else if (step > 0) {
                var currentChapters = books[location.book] && Array.isArray(books[location.book].Chapter) ? books[location.book].Chapter : [];
                if (location.chapter < Math.max(0, currentChapters.length - 1)) {
                    location.chapter += 1;
                } else if (location.book < books.length - 1) {
                    location.book += 1;
                    location.chapter = 0;
                }
            }
            state[language] = clampLocation(data, location);
            renderVerses(data, { resetPosition: true });
        }).catch(function () {
            renderLoadError();
        });
    }

    function jumpToVerse() {
        var verseNumber = Number(verseInput && verseInput.value);
        if (!Number.isInteger(verseNumber) || verseNumber <= 0) {
            return;
        }
        var target = verseList.querySelector("#bible-verse-" + String(verseNumber));
        if (!target) {
            return;
        }
        verseList.querySelectorAll(".bible-verse-item.highlight").forEach(function (node) {
            node.classList.remove("highlight");
        });
        target.classList.add("highlight");
        target.scrollIntoView({ block: "center", behavior: "smooth" });
        window.setTimeout(function () {
            target.classList.remove("highlight");
        }, 1600);
        updateSpeechTextFromSelection();
    }

    languageEnButton.addEventListener("click", function () {
        setLanguage("en");
    });
    languageTaButton.addEventListener("click", function () {
        setLanguage("ta");
    });
    bookSelect.addEventListener("change", function () {
        stopSpeechPlayback();
        loadBible(state.language).then(function (data) {
            var language = normalizeLanguage(state.language);
            var location = clampLocation(data, getCurrentLangState());
            location.book = normalizeNumber(bookSelect.value, location.book);
            location.chapter = 0;
            state[language] = clampLocation(data, location);
            renderVerses(data, { resetPosition: true });
        }).catch(function () {
            renderLoadError();
        });
    });
    chapterSelect.addEventListener("change", function () {
        stopSpeechPlayback();
        loadBible(state.language).then(function (data) {
            var language = normalizeLanguage(state.language);
            var location = clampLocation(data, getCurrentLangState());
            location.chapter = normalizeNumber(chapterSelect.value, location.chapter);
            state[language] = clampLocation(data, location);
            renderVerses(data, { resetPosition: true });
        }).catch(function () {
            renderLoadError();
        });
    });
    prevChapterButton.addEventListener("click", function () {
        moveChapter(-1);
    });
    nextChapterButton.addEventListener("click", function () {
        moveChapter(1);
    });
    if (verseGoButton) {
        verseGoButton.addEventListener("click", jumpToVerse);
    }
    if (verseInput) {
        verseInput.addEventListener("input", function () {
            if (!speechState.active) {
                updateSpeechTextFromSelection();
            }
        });
        verseInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                jumpToVerse();
            }
        });
    }
    if (fullScreenToggleButton) {
        fullScreenToggleButton.addEventListener("click", function () {
            var isOpen = document.body.classList.contains("bible-fullscreen-open");
            setFullScreenMode(!isOpen);
        });
    }
    if (ttsToggleButton) {
        ttsToggleButton.addEventListener("click", function () {
            toggleSpeechPlayback();
        });
    }
    if (ttsStopButton) {
        ttsStopButton.addEventListener("click", function () {
            stopSpeechPlayback();
        });
    }

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            setFullScreenMode(false);
        }
    });
    window.addEventListener("hashchange", function () {
        exitFullScreenIfNeeded();
    });
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible" && speechState.active && !speechState.paused && !screenWakeLock) {
            requestWakeLock();
        }
    });

    document.addEventListener("njc:langchange", function () {
        if (isBibleRouteActive() && !speechState.active && !speechState.paused) {
            renderBible();
            return;
        }
        updateTtsControls();
    });
    document.addEventListener("njc:cardlangchange", function () {
        if (isBibleRouteActive() && !speechState.active && !speechState.paused) {
            renderBible();
            return;
        }
        updateTtsControls();
    });

    if (speechSupported) {
        var synth = getSpeechSynthesisApi();
        if (synth && typeof synth.addEventListener === "function") {
            synth.addEventListener("voiceschanged", function () {
                updateTtsControls();
            });
        }
    }
    setupStreamAudio();
    setupMediaSessionHandlers();
    setupSermonMiniObserver();

    setFullScreenMode(false);
    updateTtsControls();
    refreshMiniBiblePlayer();
    renderBible();
})();
