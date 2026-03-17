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

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && bibleCard) {
            return window.NjcI18n.tForElement(bibleCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
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

    function renderVerses(data) {
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
            verseList.innerHTML = "" +
                "<li>" +
                "  <p>" + escapeHtml(T("bible.noData", "No verses available for this chapter.")) + "</p>" +
                "</li>";
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
    }

    function renderBible() {
        setLanguageButtons();
        renderLoading();
        loadBible(state.language).then(function (data) {
            renderVerses(data);
        }).catch(function () {
            renderLoadError();
        });
    }

    function setLanguage(language) {
        state.language = normalizeLanguage(language);
        setLanguageButtons();
        renderBible();
    }

    function moveChapter(step) {
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
            renderVerses(data);
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
    }

    languageEnButton.addEventListener("click", function () {
        setLanguage("en");
    });
    languageTaButton.addEventListener("click", function () {
        setLanguage("ta");
    });
    bookSelect.addEventListener("change", function () {
        loadBible(state.language).then(function (data) {
            var language = normalizeLanguage(state.language);
            var location = clampLocation(data, getCurrentLangState());
            location.book = normalizeNumber(bookSelect.value, location.book);
            location.chapter = 0;
            state[language] = clampLocation(data, location);
            renderVerses(data);
        }).catch(function () {
            renderLoadError();
        });
    });
    chapterSelect.addEventListener("change", function () {
        loadBible(state.language).then(function (data) {
            var language = normalizeLanguage(state.language);
            var location = clampLocation(data, getCurrentLangState());
            location.chapter = normalizeNumber(chapterSelect.value, location.chapter);
            state[language] = clampLocation(data, location);
            renderVerses(data);
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
        verseInput.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                jumpToVerse();
            }
        });
    }

    document.addEventListener("njc:langchange", function () {
        renderBible();
    });
    document.addEventListener("njc:cardlangchange", function () {
        renderBible();
    });

    renderBible();
})();
