(function () {
            var READING_PROGRESS_KEY = "njc_reading_progress_v1";
            var READING_POINTS_KEY = "njc_reading_points_v1";
            var READING_BONUS_POINTS_KEY = "njc_reading_bonus_points_v1";
            var DAILY_VERSE_LANGUAGE_KEY = "njc_daily_verse_language_v1";
            var todayReadingPlanList = document.getElementById("today-reading-plan-list");
            var todayReadingPlanMeta = document.getElementById("today-reading-plan-meta");
            var readingProgressTitle = document.getElementById("reading-progress-title");
            var readingProgressPercent = document.getElementById("reading-progress-percent");
            var readingProgressTrack = document.getElementById("reading-progress-track");
            var readingProgressFill = document.getElementById("reading-progress-fill");
            var readingProgressSummary = document.getElementById("reading-progress-summary");
            var readingProgressRemaining = document.getElementById("reading-progress-remaining");
            var readingUnreadToggle = document.getElementById("reading-unread-toggle");
            var readingUnreadList = document.getElementById("reading-unread-list");
            var readingStreakLine = document.getElementById("reading-streak-line");
            var readingNudgeLine = document.getElementById("reading-nudge-line");
            var readingShareProgressBtn = document.getElementById("reading-share-progress-btn");
            var dailyVerseText = document.getElementById("daily-verse-text");
            var dailyVerseReference = document.getElementById("daily-verse-reference");
            var DAILY_VERSE_CARD_LANG_ID = "home-daily-verse";
            var CARD_LANG_MAP_KEY = "njc_card_language_map_v1";
            var announcementsList = document.getElementById("home-announcements-list");
            var readingPlanUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/plan/njcplan.json";
            var kjvBibleUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/englishbible.json";
            var tamilBsiOldBibleUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/tamilbible.json";
            var announcementsUrl = "./announcements.json";
            var announcementsFallbackUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/announcements.json";
            var defaultAnnouncementImageUrl = "announcements-banner.jpg?v=20260428img1";
            var ANNOUNCEMENT_TRANSLATION_CACHE_KEY = "njc_announcement_translation_cache_v1";
            var ANNOUNCEMENT_DISMISSED_KEY = "njc_announcement_dismissed_v1";
            var adminNoticesUrl = "https://mantledb.sh/v2/njc-belgium-admin-notices/entries";
            var adminTriviaUrl = "https://mantledb.sh/v2/njc-belgium-admin-trivia/entries";
            var thisWeekEventsList = document.getElementById("this-week-events-list");
            var triviaContent = document.getElementById("trivia-content");
            var triviaLoading = document.getElementById("trivia-loading");
            var triviaQuestionWrap = document.getElementById("trivia-question-wrap");
            var triviaQuestionText = document.getElementById("trivia-question-text");
            var triviaReference = document.getElementById("trivia-reference");
            var triviaOptions = document.getElementById("trivia-options");
            var triviaFeedback = document.getElementById("trivia-feedback");
            var triviaEmpty = document.getElementById("trivia-empty");
            var triviaCard = document.getElementById("trivia-card");
            var triviaLoadingHome = document.getElementById("trivia-loading-home");
            var triviaQuestionWrapHome = document.getElementById("trivia-question-wrap-home");
            var triviaQuestionTextHome = document.getElementById("trivia-question-text-home");
            var triviaReferenceHome = document.getElementById("trivia-reference-home");
            var triviaOptionsHome = document.getElementById("trivia-options-home");
            var triviaFeedbackHome = document.getElementById("trivia-feedback-home");
            var triviaEmptyHome = document.getElementById("trivia-empty-home");
            var triviaCardHome = document.getElementById("trivia-card-home");
            var triviaExpandBtnHome = document.getElementById("trivia-expand-btn-home");
            var triviaOptionsWrapHome = document.getElementById("trivia-options-wrap-home");
            var triviaWrongOverlay = document.getElementById("trivia-wrong-overlay");
            var triviaWrongAnswer = document.getElementById("trivia-wrong-answer");
            var triviaWrongBackdrop = document.getElementById("trivia-wrong-backdrop");
            var triviaWrongClose = document.getElementById("trivia-wrong-close");
            var triviaShareBtnHome = document.getElementById("trivia-share-btn-home");
            var triviaShareBtn = document.getElementById("trivia-share-btn");
            var triviaStatsEl = document.getElementById("trivia-stats");
            var triviaStatPoints = document.getElementById("trivia-stat-points");
            var triviaStatCorrect = document.getElementById("trivia-stat-correct");
            var triviaStatWrong = document.getElementById("trivia-stat-wrong");
            var triviaStatStreak = document.getElementById("trivia-stat-streak");
            var TRIVIA_ANSWERED_KEY = "njc_trivia_answered_v1";
            var TRIVIA_POINTS_KEY = "njc_trivia_points_v1";
            var TRIVIA_GUEST_ID_KEY = "njc_trivia_guest_id_v1";
            var TRIVIA_POINTS_PER_CORRECT = 1;
            var ADMIN_TRIVIA_REPORT_MAX_DATES = 120;
            var readingCard = todayReadingPlanList ? todayReadingPlanList.closest(".card") : null;
            var verseCard = dailyVerseText ? dailyVerseText.closest(".card") : null;
            var announcementsCard = announcementsList ? announcementsList.closest(".card") : null;
            var announcementsCardBanner = announcementsCard ? announcementsCard.querySelector(".card-banner") : null;
            var announcementsBannerImg = announcementsCard ? announcementsCard.querySelector(".card-banner img") : null;
            var DEFAULT_ANNOUNCEMENTS_BANNER_SRC = "announcements-banner.jpg?v=20260428img1";
            var announcementsSubtitle = announcementsCard ? announcementsCard.querySelector("[data-i18n='home.announcementsSubtitle']") : null;
            var thisWeekCard = thisWeekEventsList ? thisWeekEventsList.closest(".card") : null;
            var eventsUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
            var brusselsTimeZone = "Europe/Brussels";
            var todayYmd = getBrusselsYmd();
            var todayPlanData = null;
            var fullReadingPlan = [];
            var readingPlanError = false;
            var unreadListOpen = false;
            var allUpcomingEvents = [];
            var allAnnouncements = [];
            var announcementsError = false;
            var MAX_VISIBLE_ANNOUNCEMENTS = 12;
            var announcementCarouselItems = [];
            var announcementCarouselIndex = 0;
            var announcementCarouselPreviousIndex = -1;
            var announcementCarouselTimerId = null;
            var eventsMeta = null;
            var eventsError = false;
            var announcementTranslationCache = getAnnouncementTranslationCache();
            var announcementTranslationPending = {};
            var announcementTranslationSaveTimerId = null;
            function readCardLanguageMap() {
                try {
                    var raw = window.localStorage.getItem(CARD_LANG_MAP_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (e) {
                    return {};
                }
            }

            function writeCardLanguageMap(map) {
                try {
                    window.localStorage.setItem(CARD_LANG_MAP_KEY, JSON.stringify(map && typeof map === "object" ? map : {}));
                } catch (e) {
                    return null;
                }
                return null;
            }

            function getInitialVerseLanguage() {
                var map = readCardLanguageMap();
                var fromCard = map[DAILY_VERSE_CARD_LANG_ID];
                if (fromCard === "en" || fromCard === "ta") {
                    return fromCard;
                }
                var legacy = getStoredVerseLanguage();
                map[DAILY_VERSE_CARD_LANG_ID] = legacy;
                writeCardLanguageMap(map);
                return legacy;
            }

            var verseLanguage = getInitialVerseLanguage();
            var dailyVerseRenderToken = 0;
            var kjvBiblePromise = null;
            var tamilBiblePromise = null;
            /** Reject if `promise` does not settle within `ms` (fail fast on slow networks). */
            function promiseWithTimeout(promise, ms, errMsg) {
                var msNum = Number(ms) || 10000;
                return Promise.race([
                    promise,
                    new Promise(function (_, reject) {
                        setTimeout(function () {
                            reject(new Error(errMsg || "timeout"));
                        }, msNum);
                    })
                ]);
            }
            /** Run non-critical work after first paint / when the browser is idle. */
            function runWhenIdle(fn, timeoutMs) {
                var t = Number(timeoutMs);
                if (!Number.isFinite(t) || t < 0) {
                    t = 1800;
                }
                if (typeof window.requestIdleCallback === "function") {
                    window.requestIdleCallback(function () {
                        try {
                            fn();
                        } catch (e) {}
                    }, { timeout: t });
                } else {
                    setTimeout(function () {
                        try {
                            fn();
                        } catch (e) {}
                    }, 80);
                }
            }
            var bookMapEnglish = {
                "Gen.": "Genesis", "Exo.": "Exodus", "Lev.": "Leviticus", "Num.": "Numbers", "Deu.": "Deuteronomy",
                "Jos.": "Joshua", "Judg.": "Judges", "Ruth.": "Ruth", "1 Sam.": "1 Samuel", "2 Sam.": "2 Samuel",
                "1 King.": "1 Kings", "2 King.": "2 Kings", "1 Chro.": "1 Chronicles", "2 Chro.": "2 Chronicles",
                "Ezra.": "Ezra", "Neh.": "Nehemiah", "Esth.": "Esther", "Job.": "Job", "Psa.": "Psalms",
                "Pro.": "Proverbs", "Ecc.": "Ecclesiastes", "Song.": "Song of Songs", "Isa.": "Isaiah",
                "Jer.": "Jeremiah", "Lam.": "Lamentations", "Ezek.": "Ezekiel", "Dan.": "Daniel", "Hos.": "Hosea",
                "Joel.": "Joel", "Amos.": "Amos", "Obad.": "Obadiah", "Jonah.": "Jonah", "Mic.": "Micah",
                "Nah.": "Nahum", "Hab.": "Habakkuk", "Zep.": "Zephaniah", "Hag.": "Haggai", "Zach.": "Zechariah",
                "Mal.": "Malachi", "Mat.": "Matthew", "Mar.": "Mark", "Luk.": "Luke", "John.": "John",
                "Act.": "Acts", "Rom.": "Romans", "1 Cor.": "1 Corinthians", "2 Cor.": "2 Corinthians",
                "Gal.": "Galatians", "Eph.": "Ephesians", "Phil.": "Philippians", "Col.": "Colossians",
                "1 Thes.": "1 Thessalonians", "2 Thes.": "2 Thessalonians", "1 Tim.": "1 Timothy", "2 Tim.": "2 Timothy",
                "Tit.": "Titus", "Phm.": "Philemon", "Heb.": "Hebrews", "Jam.": "James", "1 Pet.": "1 Peter",
                "2 Pet.": "2 Peter", "1 John.": "1 John", "2 John.": "2 John", "3 John.": "3 John",
                "Jude.": "Jude", "Rev.": "Revelation"
            };
            var bookMapTamil = {
                "Gen.": "ஆதியாகமம்", "Exo.": "யாத்திராகமம்", "Lev.": "லேவியராகமம்", "Num.": "எண்ணாகமம்", "Deu.": "உபாகமம்",
                "Jos.": "யோசுவா", "Judg.": "நியாயாதிபதிகள்", "Ruth.": "ரூத்து", "1 Sam.": "1 சாமுவேல்", "2 Sam.": "2 சாமுவேல்",
                "1 King.": "1 இராஜாக்கள்", "2 King.": "2 இராஜாக்கள்", "1 Chro.": "1 நாளாகமம்", "2 Chro.": "2 நாளாகமம்",
                "Ezra.": "எஸ்றா", "Neh.": "நேகேமியா", "Esth.": "எஸ்தர்", "Job.": "யோபு", "Psa.": "சங்கீதம்",
                "Pro.": "நீதிமொழிகள்", "Ecc.": "பிரசங்கி", "Song.": "உன்னதப்பாட்டு", "Isa.": "ஏசாயா",
                "Jer.": "எரேமியா", "Lam.": "புலம்பல்", "Ezek.": "எசேக்கியேல்", "Dan.": "தானியேல்", "Hos.": "ஓசியா",
                "Joel.": "யோவேல்", "Amos.": "ஆமோஸ்", "Obad.": "ஒபதியா", "Jonah.": "யோனா", "Mic.": "மீகா",
                "Nah.": "நாகூம்", "Hab.": "ஆபகூக்", "Zep.": "செப்பனியா", "Hag.": "ஆகாய்", "Zach.": "சகரியா",
                "Mal.": "மல்கியா", "Mat.": "மத்தேயு", "Mar.": "மாற்கு", "Luk.": "லூக்கா", "John.": "யோவான்",
                "Act.": "அப்போஸ்தலர் செயல்கள்", "Rom.": "ரோமர்", "1 Cor.": "1 கொரிந்தியர்", "2 Cor.": "2 கொரிந்தியர்",
                "Gal.": "கலாத்தியர்", "Eph.": "எபேசியர்", "Phil.": "பிலிப்பியர்", "Col.": "கொலோசெயர்",
                "1 Thes.": "1 தெசலோனிக்கேயர்", "2 Thes.": "2 தெசலோனிக்கேயர்", "1 Tim.": "1 தீமோத்தேயு", "2 Tim.": "2 தீமோத்தேயு",
                "Tit.": "தீத்து", "Phm.": "பிலேமோன்", "Heb.": "எபிரெயர்", "Jam.": "யாக்கோபு", "1 Pet.": "1 பேதுரு",
                "2 Pet.": "2 பேதுரு", "1 John.": "1 யோவான்", "2 John.": "2 யோவான்", "3 John.": "3 யோவான்",
                "Jude.": "யூதா", "Rev.": "வெளிப்படுத்தல்"
            };
            var englishNameToTamil = Object.keys(bookMapEnglish).reduce(function (acc, key) {
                acc[bookMapEnglish[key]] = bookMapTamil[key] || bookMapEnglish[key];
                return acc;
            }, {});
            var bibleBookOrder = [
                "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
                "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
                "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
                "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
                "Ecclesiastes", "Song of Songs", "Isaiah", "Jeremiah", "Lamentations",
                "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
                "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
                "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew",
                "Mark", "Luke", "John", "Acts", "Romans",
                "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
                "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
                "Titus", "Philemon", "Hebrews", "James", "1 Peter",
                "2 Peter", "1 John", "2 John", "3 John", "Jude",
                "Revelation"
            ];
            var bibleBookIndexMap = bibleBookOrder.reduce(function (acc, name, index) {
                acc[name.toLowerCase()] = index;
                return acc;
            }, {
                "psalm": 18,
                "psalms": 18,
                "song of solomon": 21
            });

            /** Raw plan ref (e.g. Mat.5:1-26) → { book, chapter0, verse } for Bible reader, or null. */
            function readingRefToBibleOpen(rawRef) {
                var value = String(rawRef || "").trim();
                var match = value.match(/^(\d+\s+)?([A-Za-z]+)\.(.+)$/);
                if (!match) {
                    return null;
                }
                var prefix = match[1] ? match[1].trim() + " " : "";
                var shortBook = prefix + match[2] + ".";
                var tail = String(match[3] || "").trim();
                var fullBook = bookMapEnglish[shortBook];
                if (!fullBook || !tail) {
                    return null;
                }
                var bookIndex = bibleBookIndexMap[String(fullBook).toLowerCase()];
                if (!Number.isInteger(bookIndex) || bookIndex < 0) {
                    return null;
                }
                var rangeOnly = tail.match(/^(\d+)-(\d+)$/);
                var chapter1;
                var verse1;
                if (rangeOnly) {
                    chapter1 = Number(rangeOnly[1]);
                    verse1 = 1;
                } else {
                    var cv = tail.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?$/);
                    if (!cv) {
                        return null;
                    }
                    chapter1 = Number(cv[1]);
                    verse1 = cv[2] ? Number(cv[2]) : 1;
                }
                if (!Number.isInteger(chapter1) || chapter1 < 1) {
                    return null;
                }
                if (!Number.isInteger(verse1) || verse1 < 1) {
                    verse1 = 1;
                }
                return {
                    book: bookIndex,
                    chapter0: chapter1 - 1,
                    verse: verse1
                };
            }

            function bibleHrefFromReadingRef(rawRef) {
                var open = readingRefToBibleOpen(rawRef);
                if (!open) {
                    return "";
                }
                return "#bible?b=" + String(open.book) + "&c=" + String(open.chapter0 + 1) + "&v=" + String(open.verse);
            }

            function buildReadingRefsLinksHtml(refs, sourceElement) {
                var list = Array.isArray(refs) ? refs.filter(Boolean) : [];
                if (!list.length) {
                    return "";
                }
                var openLabel = T("home.openInBible", "Open in Bible", sourceElement);
                return list.map(function (ref) {
                    var friendly = toFriendlyReference(ref, sourceElement);
                    var esc = NjcEvents.escapeHtml(friendly);
                    var href = bibleHrefFromReadingRef(ref);
                    if (!href) {
                        return esc;
                    }
                    return "<a class=\"reading-ref-link\" href=\"" + NjcEvents.escapeHtml(href) + "\" aria-label=\"" + NjcEvents.escapeHtml(openLabel + ": " + friendly) + "\">" + esc + "</a>";
                }).join(", ");
            }
            var dailyVersePool = [
                { reference: "Psalm 23:1", textEn: "The Lord is my shepherd; I shall not want.", textTa: "கர்த்தர் என் மேய்ப்பராயிருக்கிறார்; எனக்கு குறைவாயிருக்காது." },
                { reference: "Proverbs 3:5", textEn: "Trust in the Lord with all your heart and lean not on your own understanding.", textTa: "உன் முழு இருதயத்தோடும் கர்த்தர்மேல் நம்பிக்கையாயிரு; உன் புத்தியின்மேல் சாய்ந்திருக்காதே." },
                { reference: "Isaiah 41:10", textEn: "Do not fear, for I am with you; do not be dismayed, for I am your God.", textTa: "பயப்படாதே, நான் உன்னோடிருக்கிறேன்; கலங்காதே, நான் உன் தேவன்." },
                { reference: "Matthew 11:28", textEn: "Come to me, all you who are weary and burdened, and I will give you rest.", textTa: "சுமைப்பட்டு உழைக்கிறவர்களே, நீங்கள் எல்லாரும் என்னிடத்தில் வாருங்கள்; நான் உங்களுக்கு இளைப்பாறுதலை அளிப்பேன்." },
                { reference: "John 14:27", textEn: "Peace I leave with you; my peace I give you.", textTa: "சமாதானத்தை உங்களிடத்தில் விட்டு செல்கிறேன்; என் சமாதானத்தையே உங்களுக்கு அளிக்கிறேன்." },
                { reference: "Romans 8:28", textEn: "In all things God works for the good of those who love him.", textTa: "தேவனை நேசிக்கிறவர்களுக்கு சகலமும் நன்மைக்கே ஏதுவாயிருக்கிறது." },
                { reference: "2 Corinthians 5:7", textEn: "For we live by faith, not by sight.", textTa: "நாம் காண்பதினால் அல்ல, விசுவாசத்தினாலே நடக்கிறோம்." },
                { reference: "Philippians 4:6", textEn: "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.", textTa: "எதற்கும் கவலைப்படாதீர்கள்; எல்லாவற்றிலும் ஜெபத்தினாலும் வேண்டுதலினாலும் உங்கள் கோரிக்கைகளை தேவனுக்குத் தெரியப்படுத்துங்கள்." },
                { reference: "Philippians 4:13", textEn: "I can do all this through him who gives me strength.", textTa: "எனக்கு பலம் அளிக்கும் கிறிஸ்துவினாலே எல்லாவற்றையும் செய்ய முடியும்." },
                { reference: "Hebrews 13:8", textEn: "Jesus Christ is the same yesterday and today and forever.", textTa: "இயேசு கிறிஸ்து நேற்று இன்று என்றும் அதேவரே." },
                { reference: "1 Peter 5:7", textEn: "Cast all your anxiety on him because he cares for you.", textTa: "உங்கள் கவலைகளையெல்லாம் அவர்மேல் போடுங்கள்; அவர் உங்களைப் பற்றிக் கவலைப்படுகிறார்." },
                { reference: "1 John 4:19", textEn: "We love because he first loved us.", textTa: "அவர் முன்பாக நம்மை நேசித்ததால் நாம் நேசிக்கிறோம்." }
            ];

            function T(key, fallback, sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
                    if (sourceElement && typeof window.NjcI18n.tForElement === "function") {
                        return window.NjcI18n.tForElement(sourceElement, key, fallback);
                    }
                    return window.NjcI18n.t(key, fallback);
                }
                return fallback || key;
            }

            function formatCount(template, count) {
                var pattern = String(template || "");
                if (window.NjcI18n && typeof window.NjcI18n.formatCount === "function") {
                    return window.NjcI18n.formatCount(pattern, count);
                }
                return pattern.replace("{count}", String(count));
            }

            function getLocale(sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
                    if (sourceElement && typeof window.NjcI18n.getLocaleForElement === "function") {
                        return window.NjcI18n.getLocaleForElement(sourceElement);
                    }
                    return window.NjcI18n.getLocale();
                }
                return "en-GB";
            }

            function isTamilLanguage(sourceElement) {
                if (!window.NjcI18n) {
                    return false;
                }
                if (sourceElement && typeof window.NjcI18n.getLanguageForElement === "function") {
                    return window.NjcI18n.getLanguageForElement(sourceElement) === "ta";
                }
                return typeof window.NjcI18n.getLanguage === "function" && window.NjcI18n.getLanguage() === "ta";
            }

            function getStoredVerseLanguage() {
                try {
                    var saved = window.localStorage.getItem(DAILY_VERSE_LANGUAGE_KEY);
                    if (saved === "en" || saved === "ta") {
                        return saved;
                    }
                } catch (err) {
                    return "en";
                }
                return "en";
            }

            function saveVerseLanguage(language) {
                try {
                    window.localStorage.setItem(DAILY_VERSE_LANGUAGE_KEY, language);
                } catch (err) {
                    return null;
                }
                var map = readCardLanguageMap();
                map[DAILY_VERSE_CARD_LANG_ID] = language;
                writeCardLanguageMap(map);
                return null;
            }

            function getAnnouncementTranslationCache() {
                try {
                    var raw = window.localStorage.getItem(ANNOUNCEMENT_TRANSLATION_CACHE_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (err) {
                    return {};
                }
            }

            function saveAnnouncementTranslationCacheSoon() {
                if (announcementTranslationSaveTimerId) {
                    window.clearTimeout(announcementTranslationSaveTimerId);
                }
                announcementTranslationSaveTimerId = window.setTimeout(function () {
                    announcementTranslationSaveTimerId = null;
                    try {
                        window.localStorage.setItem(ANNOUNCEMENT_TRANSLATION_CACHE_KEY, JSON.stringify(announcementTranslationCache));
                    } catch (err) {
                        return;
                    }
                }, 120);
            }

            function hasTamilCharacters(text) {
                return /[\u0B80-\u0BFF]/.test(String(text || ""));
            }

            function hasLatinCharacters(text) {
                return /[A-Za-z]/.test(String(text || ""));
            }

            function shouldTranslateAnnouncementText(text, targetLanguage) {
                if (!text || String(text).trim().length > 700) {
                    return false;
                }
                if (targetLanguage === "ta") {
                    return hasLatinCharacters(text);
                }
                return hasTamilCharacters(text);
            }

            function buildAnnouncementTranslationKey(text, targetLanguage) {
                return String(targetLanguage || "en") + "::" + String(text || "");
            }

            function extractGoogleTranslatedText(payload) {
                if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
                    return "";
                }
                var chunks = payload[0].map(function (part) {
                    return Array.isArray(part) ? String(part[0] || "") : "";
                }).filter(Boolean);
                return chunks.join("").trim();
            }

            function fetchAnnouncementTranslationGoogle(text, targetLanguage) {
                var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
                    encodeURIComponent(targetLanguage) +
                    "&dt=t&q=" + encodeURIComponent(text);
                return fetch(url, { cache: "no-store" })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Translate request failed");
                        }
                        return response.json();
                    })
                    .then(function (payload) {
                        var translated = extractGoogleTranslatedText(payload);
                        if (!translated) {
                            throw new Error("Empty translate result");
                        }
                        return translated;
                    });
            }

            function fetchAnnouncementTranslationMyMemory(text, targetLanguage) {
                var url = "https://api.mymemory.translated.net/get?q=" +
                    encodeURIComponent(text) +
                    "&langpair=auto|" + encodeURIComponent(targetLanguage);
                return fetch(url, { cache: "no-store" })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Fallback translate failed");
                        }
                        return response.json();
                    })
                    .then(function (payload) {
                        var translated = payload && payload.responseData ? String(payload.responseData.translatedText || "").trim() : "";
                        if (!translated) {
                            throw new Error("Empty fallback translate result");
                        }
                        return translated;
                    });
            }

            function requestAnnouncementTranslation(text, targetLanguage) {
                return fetchAnnouncementTranslationGoogle(text, targetLanguage)
                    .catch(function () {
                        return fetchAnnouncementTranslationMyMemory(text, targetLanguage);
                    })
                    .catch(function () {
                        return text;
                    });
            }

            function getTranslatedAnnouncementText(text, targetLanguage) {
                var original = String(text || "").trim();
                if (!shouldTranslateAnnouncementText(original, targetLanguage)) {
                    return Promise.resolve(original);
                }
                var cacheKey = buildAnnouncementTranslationKey(original, targetLanguage);
                if (Object.prototype.hasOwnProperty.call(announcementTranslationCache, cacheKey)) {
                    return Promise.resolve(String(announcementTranslationCache[cacheKey] || original));
                }
                if (announcementTranslationPending[cacheKey]) {
                    return announcementTranslationPending[cacheKey];
                }
                announcementTranslationPending[cacheKey] = requestAnnouncementTranslation(original, targetLanguage)
                    .then(function (translated) {
                        var finalText = String(translated || "").trim() || original;
                        announcementTranslationCache[cacheKey] = finalText;
                        saveAnnouncementTranslationCacheSoon();
                        delete announcementTranslationPending[cacheKey];
                        return finalText;
                    })
                    .catch(function () {
                        delete announcementTranslationPending[cacheKey];
                        return original;
                    });
                return announcementTranslationPending[cacheKey];
            }

            function localizeEventTitle(title, sourceElement) {
                var raw = String(title || "").trim();
                var isTamil = isTamilLanguage(sourceElement);
                if (!isTamil) {
                    return raw;
                }
                if (raw === "Holy Service with Communion") {
                    return T("events.holyServiceTitle", "பரிசுத்த ஆராதனையும் திருவிருந்தும்", sourceElement);
                }
                if (raw === "Special Prayer") {
                    return T("events.specialPrayerTitle", "விசேட ஜெபக்கூடுகை", sourceElement);
                }
                return raw;
            }

            function pad2(value) {
                return value < 10 ? "0" + value : String(value);
            }

            function toCalendarDateTime(year, month, day, hour, minute) {
                return String(year) + pad2(month) + pad2(day) + "T" + pad2(hour) + pad2(minute) + "00";
            }

            function addMinutesToParts(year, month, day, hour, minute, extraMinutes) {
                var dt = new Date(Date.UTC(year, month - 1, day, hour, minute + extraMinutes, 0));
                return {
                    year: dt.getUTCFullYear(),
                    month: dt.getUTCMonth() + 1,
                    day: dt.getUTCDate(),
                    hour: dt.getUTCHours(),
                    minute: dt.getUTCMinutes()
                };
            }

            function toGoogleCalendarUrl(eventItem, sourceElement) {
                var end = addMinutesToParts(eventItem.year, eventItem.month, eventItem.day, eventItem.hour, eventItem.minute, 90);
                var dates = toCalendarDateTime(eventItem.year, eventItem.month, eventItem.day, eventItem.hour, eventItem.minute) +
                    "/" +
                    toCalendarDateTime(end.year, end.month, end.day, end.hour, end.minute);
                var params = new URLSearchParams({
                    action: "TEMPLATE",
                    text: eventItem.title || T("events.event", "Event", sourceElement),
                    dates: dates,
                    ctz: "Europe/Brussels",
                    details: (eventItem.description || "") + " - NJC Belgium",
                    location: "New Jerusalem Church Belgium, Ten Eekhovelei 292, 2100 Antwerpen"
                });
                return "https://calendar.google.com/calendar/render?" + params.toString();
            }

            function updateReadingPlanMeta() {
                var dateUtc = new Date(Date.UTC(todayYmd.year, todayYmd.month - 1, todayYmd.day, 12, 0, 0));
                var dateLabel = new Intl.DateTimeFormat(getLocale(readingCard), {
                    timeZone: "UTC",
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }).format(dateUtc);
                todayReadingPlanMeta.textContent = T("home.readingDatePrefix", "Today:", readingCard) + " " + dateLabel;
            }

            function setDailyVerseToggleLabel() {
                var toggle = verseCard ? verseCard.querySelector(".card-lang-toggle") : null;
                if (!toggle) {
                    return;
                }
                var nextLanguage = verseLanguage === "ta" ? "en" : "ta";
                var label = nextLanguage === "ta"
                    ? T("home.dailyVerseToggleToTamil", "Switch verse to Tamil", verseCard)
                    : T("home.dailyVerseToggleToEnglish", "Switch verse to English", verseCard);
                toggle.textContent = nextLanguage.toUpperCase();
                toggle.setAttribute("aria-label", label);
                toggle.title = label;
            }

            function syncVerseLanguageFromCardMap() {
                var map = readCardLanguageMap();
                var c = map[DAILY_VERSE_CARD_LANG_ID];
                if (c === "en" || c === "ta") {
                    verseLanguage = c;
                }
            }

            function getVerseVersionLabel(showTamil) {
                return showTamil
                    ? T("home.dailyVerseVersionTamil", "BSI (Old)", verseCard)
                    : T("home.dailyVerseVersionEnglish", "KJV", verseCard);
            }

            function votdCacheDateKey() {
                return String(todayYmd.year) + "-" + String(todayYmd.month).padStart(2, "0") + "-" + String(todayYmd.day).padStart(2, "0");
            }

            var DAILY_VERSE_VOTD_CACHE_KEY = "njc_daily_verse_votd_cache_v1";

            function readVerseOfTheDayCache() {
                try {
                    var raw = window.localStorage.getItem(DAILY_VERSE_VOTD_CACHE_KEY);
                    if (!raw) {
                        return null;
                    }
                    var parsed = JSON.parse(raw);
                    if (!parsed || typeof parsed !== "object") {
                        return null;
                    }
                    if (parsed.dateKey !== votdCacheDateKey()) {
                        return null;
                    }
                    var reference = String(parsed.reference || "").trim();
                    if (!reference) {
                        return null;
                    }
                    return { reference: reference };
                } catch (err) {
                    return null;
                }
            }

            function saveVerseOfTheDayCache(entry) {
                try {
                    window.localStorage.setItem(DAILY_VERSE_VOTD_CACHE_KEY, JSON.stringify({
                        dateKey: votdCacheDateKey(),
                        reference: entry.reference
                    }));
                } catch (err) {
                    return null;
                }
                return null;
            }

            function fetchVerseOfTheDayFromApi() {
                var url = "https://labs.bible.org/api/?passage=votd&type=json";
                return promiseWithTimeout(
                    fetch(url, { cache: "no-store" })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Daily verse request failed");
                        }
                        return response.json();
                    })
                    .then(function (rows) {
                        var row = Array.isArray(rows) && rows.length ? rows[0] : null;
                        if (!row || typeof row !== "object") {
                            throw new Error("Daily verse payload empty");
                        }
                        var book = String(row.bookname || "").trim();
                        var chapter = String(row.chapter || "").trim();
                        var verse = String(row.verse || "").trim();
                        if (!book || !chapter || !verse) {
                            throw new Error("Daily verse payload incomplete");
                        }
                        return {
                            reference: book + " " + chapter + ":" + verse
                        };
                    }),
                    6000,
                    "VOTD timeout"
                );
            }

            function parseSingleVerseReference(reference) {
                var text = String(reference || "").trim();
                var match = text.match(/^(.+?)\s+(\d+):(\d+)$/);
                if (!match) {
                    return null;
                }
                var rawBookName = match[1].trim().replace(/\s+/g, " ").toLowerCase();
                var chapterNumber = Number(match[2]);
                var verseNumber = Number(match[3]);
                if (!chapterNumber || !verseNumber) {
                    return null;
                }
                var bookIndex = bibleBookIndexMap[rawBookName];
                if (!Number.isInteger(bookIndex)) {
                    return null;
                }
                return {
                    bookIndex: bookIndex,
                    chapterIndex: chapterNumber - 1,
                    verseIndex: verseNumber - 1
                };
            }

            function extractVerseTextFromBible(bibleData, reference) {
                var pointer = parseSingleVerseReference(reference);
                if (!pointer || !bibleData || !Array.isArray(bibleData.Book)) {
                    return "";
                }
                var book = bibleData.Book[pointer.bookIndex];
                var chapterList = book && Array.isArray(book.Chapter) ? book.Chapter : null;
                var chapter = chapterList ? chapterList[pointer.chapterIndex] : null;
                var verseList = chapter && Array.isArray(chapter.Verse) ? chapter.Verse : null;
                var verse = verseList ? verseList[pointer.verseIndex] : null;
                return verse && typeof verse.Verse === "string" ? verse.Verse.trim() : "";
            }

            function loadBibleData(languageKey) {
                var targetUrl = languageKey === "ta" ? tamilBsiOldBibleUrl : kjvBibleUrl;
                var targetPromise = languageKey === "ta" ? tamilBiblePromise : kjvBiblePromise;
                if (!targetPromise) {
                    targetPromise = fetch(targetUrl)
                        .then(function (response) {
                            if (!response.ok) {
                                throw new Error("Unable to load bible data");
                            }
                            return response.json();
                        })
                        .then(function (payload) {
                            if (!payload || !Array.isArray(payload.Book)) {
                                throw new Error("Invalid bible structure");
                            }
                            return payload;
                        })
                        .catch(function () {
                            return null;
                        });
                    if (languageKey === "ta") {
                        tamilBiblePromise = targetPromise;
                    } else {
                        kjvBiblePromise = targetPromise;
                    }
                }
                return targetPromise;
            }

            (function preloadBibleJsonForHome() {
                try {
                    loadBibleData(verseLanguage === "ta" ? "ta" : "en");
                } catch (e) {}
            })();

            function resolveDailyVerseText(reference, languageKey) {
                return loadBibleData(languageKey).then(function (bibleData) {
                    if (!bibleData) {
                        return "";
                    }
                    return extractVerseTextFromBible(bibleData, reference);
                });
            }

            function renderDailyVerse() {
                if (!dailyVerseText || !dailyVerseReference) {
                    return;
                }
                syncVerseLanguageFromCardMap();
                /* Calendar must be current: otherwise VOTD cache dateKey never advances while the tab stays open. */
                todayYmd = getBrusselsYmd();
                var dayNum = getDayOfYear(todayYmd);
                dailyVerseRenderToken += 1;
                var renderToken = dailyVerseRenderToken;
                var showTamil = verseLanguage === "ta";
                var languageKey = showTamil ? "ta" : "en";

                function renderDailyVerseFallback() {
                    if (!Array.isArray(dailyVersePool) || dailyVersePool.length === 0) {
                        dailyVerseText.textContent = T("home.dailyVerseEmptyBody", "Daily verse is unavailable.", verseCard);
                        dailyVerseReference.textContent = "";
                        setDailyVerseToggleLabel();
                        return;
                    }
                    var verseIndex = (dayNum - 1) % dailyVersePool.length;
                    var verseItem = dailyVersePool[verseIndex];
                    dailyVerseText.textContent = showTamil ? (verseItem.textTa || verseItem.textEn) : verseItem.textEn;
                    dailyVerseReference.textContent = (verseItem.reference || "") + " • " + getVerseVersionLabel(showTamil);
                    setDailyVerseToggleLabel();
                    resolveDailyVerseText(verseItem.reference, languageKey).then(function (text) {
                        if (renderToken !== dailyVerseRenderToken) {
                            return;
                        }
                        if (text) {
                            dailyVerseText.textContent = text;
                        }
                    });
                }

                function applyVerseOfTheDay(entry) {
                    dailyVerseReference.textContent = entry.reference + " • " + getVerseVersionLabel(showTamil);
                    setDailyVerseToggleLabel();
                    dailyVerseText.textContent = T("home.dailyVerseLoading", "Loading daily verse...", verseCard);
                    resolveDailyVerseText(entry.reference, languageKey).then(function (text) {
                        if (renderToken !== dailyVerseRenderToken) {
                            return;
                        }
                        if (text) {
                            dailyVerseText.textContent = text;
                        } else {
                            dailyVerseText.textContent = T("home.dailyVerseEmptyBody", "Daily verse is unavailable.", verseCard);
                        }
                    });
                }

                var cachedVotd = readVerseOfTheDayCache();
                if (cachedVotd) {
                    applyVerseOfTheDay(cachedVotd);
                    return;
                }

                dailyVerseText.textContent = T("home.dailyVerseLoading", "Loading daily verse...", verseCard);
                dailyVerseReference.textContent = "";
                setDailyVerseToggleLabel();

                fetchVerseOfTheDayFromApi()
                    .then(function (entry) {
                        saveVerseOfTheDayCache(entry);
                        if (renderToken !== dailyVerseRenderToken) {
                            return;
                        }
                        applyVerseOfTheDay(entry);
                    })
                    .catch(function () {
                        if (renderToken !== dailyVerseRenderToken) {
                            return;
                        }
                        renderDailyVerseFallback();
                    });
            }

            function getTodayKey() {
                return String(todayYmd.year) + "-" + String(todayYmd.month).padStart(2, "0") + "-" + String(todayYmd.day).padStart(2, "0");
            }

            function getProgressMap() {
                try {
                    var raw = window.localStorage.getItem(READING_PROGRESS_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (err) {
                    return {};
                }
            }

            function saveProgressMap(progressMap) {
                try {
                    window.localStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(progressMap));
                    document.dispatchEvent(new CustomEvent("njc:progress-updated", {
                        detail: { progressMap: progressMap || {} }
                    }));
                } catch (err) {
                    return null;
                }
                return null;
            }

            function getTodayProgress() {
                return getProgressForDate(getTodayKey());
            }

            function getProgressForDate(dateKey) {
                var map = getProgressMap();
                var entry = map[String(dateKey || "")] || {};
                return {
                    morning: Boolean(entry.morning),
                    evening: Boolean(entry.evening)
                };
            }

            function setTodayProgress(part, value) {
                setProgressForDate(getTodayKey(), part, value);
            }

            function setProgressForDate(dateKey, part, value) {
                var map = getProgressMap();
                var targetKey = String(dateKey || "");
                if (!/^\d{4}-\d{2}-\d{2}$/.test(targetKey)) {
                    return;
                }
                var entry = map[targetKey] || {};
                entry[part] = Boolean(value);
                map[targetKey] = entry;
                saveProgressMap(map);
                recalcAndStoreReadingPoints();
            }

            function computeReadingPointsTotal() {
                var map = getProgressMap();
                var halfCount = 0;
                Object.keys(map).forEach(function (k) {
                    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) {
                        return;
                    }
                    var e = map[k];
                    if (!e || typeof e !== "object") {
                        return;
                    }
                    if (e.morning) {
                        halfCount += 1;
                    }
                    if (e.evening) {
                        halfCount += 1;
                    }
                });
                return halfCount * 0.5;
            }

            function getReadingBonusPoints(uid) {
                try {
                    var raw = window.localStorage.getItem(READING_BONUS_POINTS_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    return Number(data[String(uid || "")]) || 0;
                } catch (e) {
                    return 0;
                }
            }

            function syncReadingPointsToCloud(uid, points) {
                var doc = getTriviaFirestoreDoc(uid);
                if (!doc) {
                    return;
                }
                doc.set({ readingPoints: Number(points) || 0 }, { merge: true }).catch(function () {});
            }

            function recalcAndStoreReadingPoints() {
                var planPts = computeReadingPointsTotal();
                var uid = getTriviaUserId();
                var bonus = getReadingBonusPoints(uid);
                var total = planPts + bonus;
                var isUser = uid && uid.indexOf("u:") === 0;
                var firebaseUid = isUser ? uid.replace(/^u:/, "") : null;
                try {
                    var raw = window.localStorage.getItem(READING_POINTS_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    data[uid] = total;
                    window.localStorage.setItem(READING_POINTS_KEY, JSON.stringify(data));
                } catch (err) {
                    return null;
                }
                if (firebaseUid) {
                    syncReadingPointsToCloud(firebaseUid, total);
                    if (window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
                        window.NjcAchievementBoard.syncMyPublicScore();
                    }
                }
                document.dispatchEvent(new CustomEvent("njc:reading-points-updated", { detail: { points: total } }));
                return null;
            }

            function addReadingBonusPoints(delta) {
                var d = Number(delta) || 0;
                if (d <= 0) {
                    return;
                }
                var uid = getTriviaUserId();
                try {
                    var raw = window.localStorage.getItem(READING_BONUS_POINTS_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    data[uid] = (Number(data[uid]) || 0) + d;
                    window.localStorage.setItem(READING_BONUS_POINTS_KEY, JSON.stringify(data));
                } catch (e) {
                    return null;
                }
                recalcAndStoreReadingPoints();
                return null;
            }

            window.NjcReadingPoints = {
                recalc: recalcAndStoreReadingPoints,
                addBonus: addReadingBonusPoints
            };

            function getBrusselsYmd() {
                var parts = new Intl.DateTimeFormat("en-GB", {
                    timeZone: brusselsTimeZone,
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

                return {
                    year: partValue("year"),
                    month: partValue("month"),
                    day: partValue("day")
                };
            }

            /** Bible Quiz "today" matches Brussels calendar date (midnight), same as daily verse & reading plan. */
            function getTriviaEffectiveDate() {
                var ymd = getBrusselsYmd();
                return String(ymd.year) + "-" + String(ymd.month).padStart(2, "0") + "-" + String(ymd.day).padStart(2, "0");
            }

            function isTriviaWeekday(ymd) {
                if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return true;
                var parts = ymd.split("-");
                var year = parseInt(parts[0], 10);
                var month = parseInt(parts[1], 10) - 1;
                var day = parseInt(parts[2], 10);
                var date = new Date(Date.UTC(year, month, day));
                var dow = date.getUTCDay();
                return dow >= 1 && dow <= 5;
            }

            function getDayOfYear(ymd) {
                var yearStart = Date.UTC(ymd.year, 0, 1);
                var current = Date.UTC(ymd.year, ymd.month - 1, ymd.day);
                return Math.floor((current - yearStart) / 86400000) + 1;
            }

            function toYmdKeyFromDayNumber(year, dayNumber) {
                if (!year || !dayNumber) {
                    return "";
                }
                var dateUtc = new Date(Date.UTC(year, 0, dayNumber));
                var y = dateUtc.getUTCFullYear();
                var m = dateUtc.getUTCMonth() + 1;
                var d = dateUtc.getUTCDate();
                return String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
            }

            function toYmdKey(value) {
                var raw = String(value || "").trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
                    return "";
                }
                return raw;
            }

            function normalizeAnnouncementImageUrl(value) {
                var raw = String(value || "").trim();
                if (!raw) {
                    return "";
                }
                if (/^https?:\/\//i.test(raw)) {
                    return raw;
                }
                if (/^data:image\//i.test(raw)) {
                    return raw;
                }
                if (/^(\.?\/)?[A-Za-z0-9_@~%+=:,./-]+\.(png|jpe?g|gif|webp|avif|svg)(\?[A-Za-z0-9_@~%+=:,./&-]*)?$/i.test(raw)) {
                    return raw;
                }
                return "";
            }

            function formatYmdForLocale(ymdKey, sourceElement) {
                if (!ymdKey) {
                    return "";
                }
                var parts = ymdKey.split("-");
                var year = Number(parts[0]);
                var month = Number(parts[1]);
                var day = Number(parts[2]);
                if (!year || !month || !day) {
                    return "";
                }
                var dateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                return new Intl.DateTimeFormat(getLocale(sourceElement), {
                    timeZone: "UTC",
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }).format(dateUtc);
            }

            function pickAnnouncementImageUrl(source) {
                var obj = source && typeof source === "object" ? source : {};
                var keys = ["imageUrl", "image", "bannerUrl", "bannerImage"];
                for (var i = 0; i < keys.length; i++) {
                    var v = String(obj[keys[i]] || "").trim();
                    if (v) {
                        return v;
                    }
                }
                return "";
            }

            function syncAnnouncementsBanner(imageSrc) {
                if (!announcementsBannerImg) {
                    return;
                }
                var next = String(imageSrc || "").trim() || DEFAULT_ANNOUNCEMENTS_BANNER_SRC;
                if (announcementsBannerImg.getAttribute("src") !== next) {
                    announcementsBannerImg.setAttribute("src", next);
                }
            }

            function pickAnnouncementScheduleStart(source) {
                var obj = source && typeof source === "object" ? source : {};
                var keys = ["visibleFrom", "showFrom", "startDate", "validFrom"];
                for (var i = 0; i < keys.length; i++) {
                    var y = toYmdKey(obj[keys[i]]);
                    if (y) {
                        return y;
                    }
                }
                return "";
            }

            function pickAnnouncementScheduleEnd(source) {
                var obj = source && typeof source === "object" ? source : {};
                var keys = ["visibleUntil", "endDate", "hideAfter", "validUntil"];
                for (var i = 0; i < keys.length; i++) {
                    var y = toYmdKey(obj[keys[i]]);
                    if (y) {
                        return y;
                    }
                }
                return "";
            }

            function normalizeAnnouncement(item, index) {
                var source = item && typeof item === "object" ? item : {};
                var title = String(source.title || "").trim();
                var body = String(source.body || "").trim();
                var imageUrl = pickAnnouncementImageUrl(source);
                var imageOnly = Boolean(source.imageOnly) || (!title && !body && Boolean(imageUrl));
                var visibleFromYmd = pickAnnouncementScheduleStart(source);
                var visibleUntilYmd = pickAnnouncementScheduleEnd(source);
                var expiresLegacy = toYmdKey(source.expires);
                return {
                    id: String(source.id || ("announcement-" + index)),
                    title: title,
                    titleTa: String(source.titleTa || "").trim(),
                    body: body,
                    bodyTa: String(source.bodyTa || "").trim(),
                    date: toYmdKey(source.date),
                    expires: expiresLegacy,
                    visibleFromYmd: visibleFromYmd,
                    visibleUntilYmd: visibleUntilYmd,
                    urgent: Boolean(source.urgent),
                    important: Boolean(source.important),
                    link: String(source.link || "").trim(),
                    imageUrl: imageUrl,
                    imageOnly: imageOnly
                };
            }

            function normalizeAdminNotice(item, index) {
                var source = item && typeof item === "object" ? item : {};
                var createdAt = String(source.createdAt || source.updatedAt || "").trim();
                var createdYmd = toYmdKey(createdAt.slice(0, 10));
                var title = String(source.title || "").trim();
                var body = String(source.body || "").trim();
                var imageUrl = pickAnnouncementImageUrl(source);
                var imageOnly = Boolean(source.imageOnly) || (!title && !body && Boolean(imageUrl));
                var visibleFromYmd = pickAnnouncementScheduleStart(source);
                var visibleUntilYmd = pickAnnouncementScheduleEnd(source);
                var expiresLegacy = toYmdKey(source.expires);
                return {
                    id: String(source.id || ("admin-notice-" + index)),
                    title: title,
                    titleTa: String(source.titleTa || "").trim(),
                    body: body,
                    bodyTa: String(source.bodyTa || "").trim(),
                    date: toYmdKey(source.date) || createdYmd,
                    expires: expiresLegacy,
                    visibleFromYmd: visibleFromYmd,
                    visibleUntilYmd: visibleUntilYmd,
                    urgent: Boolean(source.urgent),
                    important: Boolean(source.important),
                    link: String(source.link || "").trim(),
                    imageUrl: imageUrl,
                    imageOnly: imageOnly
                };
            }

            function announcementVisibleBySchedule(item, todayKey) {
                if (!item || item.personalWish) {
                    return true;
                }
                var start = String(item.visibleFromYmd || "").trim();
                if (start && start > todayKey) {
                    return false;
                }
                var end = String(item.visibleUntilYmd || "").trim();
                if (!end) {
                    end = String(item.expires || "").trim();
                }
                if (end && end < todayKey) {
                    return false;
                }
                return true;
            }

            function isRenderableAnnouncement(item) {
                if (!item || item.personalWish) {
                    return Boolean(item);
                }
                if (item.imageOnly) {
                    return Boolean(String(item.imageUrl || "").trim());
                }
                return Boolean(
                    String(item.title || "").trim()
                    || String(item.body || "").trim()
                    || String(item.titleTa || "").trim()
                    || String(item.bodyTa || "").trim()
                );
            }

            function setAnnouncementsStandardMediaVisible(visible) {
                var active = visible !== false;
                if (announcementsCardBanner) {
                    announcementsCardBanner.hidden = !active;
                }
                if (announcementsSubtitle) {
                    announcementsSubtitle.hidden = !active;
                }
            }

            var USER_PROFILES_STORAGE_KEY = "njc_user_profiles_v1";

            function monthDayMatchesStoredDate(ymdStr, brusselsYmd) {
                if (!brusselsYmd || !ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
                    return false;
                }
                var parts = ymdStr.split("-");
                return Number(parts[1]) === brusselsYmd.month && Number(parts[2]) === brusselsYmd.day;
            }

            function pickWishDisplayName(fullName, displayName, email) {
                var fromName = String(fullName || displayName || "").trim();
                if (fromName) {
                    var first = fromName.split(/\s+/).filter(Boolean)[0] || "";
                    if (first) {
                        return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
                    }
                }
                var local = String(email || "").trim().split("@")[0];
                if (local) {
                    return local.charAt(0).toUpperCase() + local.slice(1).toLowerCase();
                }
                return "";
            }

            function getSavedUserProfile(uid) {
                if (!uid) {
                    return null;
                }
                try {
                    var raw = window.localStorage.getItem(USER_PROFILES_STORAGE_KEY);
                    var map = raw ? JSON.parse(raw) : {};
                    var row = map[String(uid)];
                    return row && typeof row === "object" ? row : null;
                } catch (err) {
                    return null;
                }
            }

            function buildPersonalWishAnnouncements() {
                var auth = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                var uid = auth && auth.uid ? String(auth.uid) : "";
                if (!uid) {
                    return [];
                }
                var profile = getSavedUserProfile(uid);
                if (!profile) {
                    return [];
                }
                var today = todayYmd;
                var displayName = pickWishDisplayName(
                    String(profile.fullName || "").trim(),
                    String(auth.displayName || "").trim(),
                    String(auth.email || "").trim()
                );
                var nameToken = displayName || T("home.personalWishFriend", "friend", announcementsCard);
                var items = [];
                if (monthDayMatchesStoredDate(String(profile.dob || "").trim(), today)) {
                    items.push({
                        id: "njc-personal-birthday",
                        personalWish: "birthday",
                        personalDisplayName: nameToken,
                        title: "",
                        titleTa: "",
                        body: "",
                        bodyTa: "",
                        date: getTodayKey(),
                        expires: "",
                        urgent: false,
                        important: false,
                        imageUrl: "",
                        imageOnly: false,
                        link: ""
                    });
                }
                if (monthDayMatchesStoredDate(String(profile.anniversary || "").trim(), today)) {
                    items.push({
                        id: "njc-personal-anniversary",
                        personalWish: "anniversary",
                        personalDisplayName: nameToken,
                        title: "",
                        titleTa: "",
                        body: "",
                        bodyTa: "",
                        date: getTodayKey(),
                        expires: "",
                        urgent: false,
                        important: false,
                        imageUrl: "",
                        imageOnly: false,
                        link: ""
                    });
                }
                return items;
            }

            function stopAnnouncementsCarousel() {
                if (announcementCarouselTimerId) {
                    window.clearInterval(announcementCarouselTimerId);
                    announcementCarouselTimerId = null;
                }
            }

            function applyAnnouncementsCardGradient() {
                if (!announcementsCard) {
                    return;
                }
                var a = 0;
                var b = 0;
                try {
                    if (window.crypto && window.crypto.getRandomValues) {
                        var buf = new Uint32Array(2);
                        window.crypto.getRandomValues(buf);
                        a = buf[0];
                        b = buf[1];
                    } else {
                        a = Math.floor(Math.random() * 0xffffffff);
                        b = Math.floor(Math.random() * 0xffffffff);
                    }
                } catch (err) {
                    a = Math.floor(Math.random() * 0xffffffff);
                    b = Math.floor(Math.random() * 0xffffffff);
                }
                var angle = 142 + (a % 27);
                var midStop = 44 + (a >>> 8) % 14;
                var goldX = 86 + (b % 13);
                var goldY = 2 + (b >>> 8) % 10;
                var redX = 4 + (b >>> 16) % 14;
                var redY = 78 + (b >>> 24) % 18;
                var goldA = 0.09 + ((a >>> 16) % 7) / 100;
                var redA = 0.055 + ((a >>> 20) % 6) / 100;
                announcementsCard.style.setProperty("--ann-angle", String(angle) + "deg");
                announcementsCard.style.setProperty("--ann-mix", String(midStop) + "%");
                announcementsCard.style.setProperty("--ann-gold-x", String(goldX) + "%");
                announcementsCard.style.setProperty("--ann-gold-y", String(goldY) + "%");
                announcementsCard.style.setProperty("--ann-red-x", String(redX) + "%");
                announcementsCard.style.setProperty("--ann-red-y", String(redY) + "%");
                announcementsCard.style.setProperty("--ann-gold-a", String(goldA));
                announcementsCard.style.setProperty("--ann-red-a", String(redA));
            }

            function nextAnnouncementIndex(step) {
                var total = announcementCarouselItems.length;
                if (total <= 1) {
                    return 0;
                }
                var next = announcementCarouselIndex + step;
                if (next < 0) {
                    return total - 1;
                }
                if (next >= total) {
                    return 0;
                }
                return next;
            }

            function announcementSlideAnimClass(prevIndex, currIndex, total) {
                if (total <= 1 || prevIndex < 0 || currIndex < 0 || prevIndex === currIndex) {
                    return "";
                }
                var forwardSteps = (currIndex - prevIndex + total) % total;
                var backwardSteps = (prevIndex - currIndex + total) % total;
                if (forwardSteps < backwardSteps) {
                    return " announcement-slide-dir-next";
                }
                if (backwardSteps < forwardSteps) {
                    return " announcement-slide-dir-prev";
                }
                return currIndex > prevIndex ? " announcement-slide-dir-next" : " announcement-slide-dir-prev";
            }

            function renderAnnouncementCarouselFrame() {
                if (!announcementsList) {
                    return;
                }
                if (!announcementCarouselItems.length) {
                    announcementCarouselPreviousIndex = -1;
                    return;
                }

                var totalSlides = announcementCarouselItems.length;
                var currIdx = announcementCarouselIndex;
                var slideAnimClass = announcementSlideAnimClass(announcementCarouselPreviousIndex, currIdx, totalSlides);
                announcementCarouselPreviousIndex = currIdx;

                var item = announcementCarouselItems[announcementCarouselIndex];
                var isTamil = isTamilLanguage(announcementsCard);
                var isImageOnly = Boolean(item.imageOnly && String(item.imageUrl || "").trim() && !item.personalWish);
                if (isImageOnly) {
                    setAnnouncementsStandardMediaVisible(false);
                } else {
                    syncAnnouncementsBanner("");
                    setAnnouncementsStandardMediaVisible(true);
                }
                var titleText;
                var bodyText;
                var pname = String(item.personalDisplayName || "").trim() || T("home.personalWishFriend", "friend", announcementsCard);
                if (item.personalWish === "birthday") {
                    titleText = T("home.personalBirthdayTitle", "Happy birthday!", announcementsCard);
                    bodyText = T("home.personalBirthdayBody", "Warm wishes on your special day, {name}. God bless you!").replace(/\{name\}/g, pname);
                } else if (item.personalWish === "anniversary") {
                    titleText = T("home.personalAnniversaryTitle", "Happy anniversary!", announcementsCard);
                    bodyText = T("home.personalAnniversaryBody", "Celebrating your wedding anniversary today, {name}. God bless your marriage!").replace(/\{name\}/g, pname);
                } else {
                    titleText = isTamil
                        ? (item.titleTa || item.titleTaAuto || item.title)
                        : (item.title || item.titleEnAuto || item.titleTa || item.titleTaAuto);
                    bodyText = isTamil
                        ? (item.bodyTa || item.bodyTaAuto || item.body)
                        : (item.body || item.bodyEnAuto || item.bodyTa || item.bodyTaAuto);
                }
                var dateText = formatYmdForLocale(item.date, announcementsCard);
                var importantBadge = !item.personalWish && item.important
                    ? ("<span class=\"announcement-badge announcement-badge-important\">" + NjcEvents.escapeHtml(T("home.announcementImportant", "Important", announcementsCard)) + "</span>")
                    : "";
                var urgentBadge = item.urgent
                    ? ("<span class=\"announcement-badge\">" + NjcEvents.escapeHtml(T("home.announcementUrgent", "Urgent", announcementsCard)) + "</span>")
                    : "";
                var titleBadges = urgentBadge + importantBadge;
                var metaLine = dateText ? ("<p class=\"page-note\">" + NjcEvents.escapeHtml(dateText) + "</p>") : "";
                var bodyLine = bodyText
                    ? ("<p class=\"announcement-body\">" + NjcEvents.escapeHtml(bodyText) + "</p>")
                    : "";
                var linkLine = !isImageOnly && item.link
                    ? ("<p><a class=\"inline-link\" href=\"" + NjcEvents.escapeHtml(item.link) + "\">" + NjcEvents.escapeHtml(T("home.readMore", "Read more", announcementsCard)) + "</a></p>")
                    : "";
                var dismissBtn = !item.personalWish
                    ? ("<p><button type=\"button\" class=\"button-link button-secondary announcement-dismiss-btn\" data-announcement-dismiss=\"" + NjcEvents.escapeHtml(String(item.id || "")) + "\">" + NjcEvents.escapeHtml(T("home.announcementDismiss", "Mark as read", announcementsCard)) + "</button></p>")
                    : "";
                var imageAltText = titleText || bodyText || T("home.announcementBannerAlt", "Announcement banner", announcementsCard);
                var imageHtml = "";
                if (isImageOnly) {
                    var imageTag = "<img class=\"announcement-slide-image announcement-image\" src=\"" + NjcEvents.escapeHtml(item.imageUrl) + "\" alt=\"" + NjcEvents.escapeHtml(imageAltText) + "\" loading=\"eager\" fetchpriority=\"high\" decoding=\"async\">";
                    imageHtml = item.link
                        ? ("<div class=\"announcement-image-wrap\"><a class=\"announcement-image-link\" href=\"" + NjcEvents.escapeHtml(item.link) + "\">" + imageTag + "</a></div>")
                        : ("<div class=\"announcement-image-wrap\">" + imageTag + "</div>");
                }

                var controls = "";
                if (announcementCarouselItems.length > 1) {
                    var dots = announcementCarouselItems.map(function (_, index) {
                        var activeClass = index === announcementCarouselIndex ? " active" : "";
                        return "<button type=\"button\" class=\"announcement-dot" + activeClass + "\" data-announcement-index=\"" + String(index) + "\" aria-label=\"" + NjcEvents.escapeHtml(T("home.announcementDot", "Announcement", announcementsCard)) + " " + String(index + 1) + "\"></button>";
                    }).join("");
                    controls = "" +
                        "<div class=\"announcement-carousel-controls\">" +
                        "  <button type=\"button\" class=\"announcement-nav-btn\" data-announcement-action=\"prev\" aria-label=\"" + NjcEvents.escapeHtml(T("home.announcementPrev", "Previous announcement", announcementsCard)) + "\"><i class=\"fa-solid fa-chevron-left\"></i></button>" +
                        "  <div class=\"announcement-dots\">" + dots + "</div>" +
                        "  <button type=\"button\" class=\"announcement-nav-btn\" data-announcement-action=\"next\" aria-label=\"" + NjcEvents.escapeHtml(T("home.announcementNext", "Next announcement", announcementsCard)) + "\"><i class=\"fa-solid fa-chevron-right\"></i></button>" +
                        "</div>";
                }

                var liClass = "announcement-carousel-item" +
                    (item.personalWish ? " announcement-personal-wish" : "") +
                    (isImageOnly ? " announcement-image-only" : "") +
                    slideAnimClass;
                var srHeading = "<h3 class=\"announcement-title announcement-title-sr-only\">" + NjcEvents.escapeHtml(T("home.announcementBannerImageAlt", "Announcement image", announcementsCard)) + "</h3>";
                var mainBlock = isImageOnly
                    ? (srHeading + imageHtml)
                    : ("  <h3 class=\"announcement-title\">" + titleBadges + NjcEvents.escapeHtml(titleText || T("home.announcementsTitle", "Announcements", announcementsCard)) + "</h3>" +
                        bodyLine);
                announcementsList.innerHTML = "" +
                    "<li class=\"" + liClass + "\">" +
                    mainBlock +
                    metaLine +
                    linkLine +
                    dismissBtn +
                    controls +
                    "</li>";

                var activeAnnouncementId = String(item.id || "");
                var activeIndex = announcementCarouselIndex;
                if (isTamil && !item.personalWish && !isImageOnly) {
                    if (!item.titleTa && !item.titleTaAuto && item.title) {
                        getTranslatedAnnouncementText(item.title, "ta").then(function (translatedTitle) {
                            if (!translatedTitle || !announcementsList || activeIndex !== announcementCarouselIndex) {
                                return;
                            }
                            if (String((announcementCarouselItems[announcementCarouselIndex] || {}).id || "") !== activeAnnouncementId) {
                                return;
                            }
                            if (!isTamilLanguage(announcementsCard)) {
                                return;
                            }
                            item.titleTaAuto = translatedTitle;
                            var titleNode = announcementsList.querySelector(".announcement-title");
                            if (titleNode) {
                                var ib = item.important
                                    ? ("<span class=\"announcement-badge announcement-badge-important\">" + NjcEvents.escapeHtml(T("home.announcementImportant", "Important", announcementsCard)) + "</span>")
                                    : "";
                                var ub = item.urgent
                                    ? ("<span class=\"announcement-badge\">" + NjcEvents.escapeHtml(T("home.announcementUrgent", "Urgent", announcementsCard)) + "</span>")
                                    : "";
                                titleNode.innerHTML = ub + ib + NjcEvents.escapeHtml(translatedTitle);
                            }
                            var imgNode = announcementsList.querySelector(".announcement-image");
                            if (imgNode && !imgNode.getAttribute("alt")) {
                                imgNode.setAttribute("alt", translatedTitle);
                            }
                        });
                    }
                    if (!item.bodyTa && !item.bodyTaAuto && item.body) {
                        getTranslatedAnnouncementText(item.body, "ta").then(function (translatedBody) {
                            if (!translatedBody || !announcementsList || activeIndex !== announcementCarouselIndex) {
                                return;
                            }
                            if (String((announcementCarouselItems[announcementCarouselIndex] || {}).id || "") !== activeAnnouncementId) {
                                return;
                            }
                            if (!isTamilLanguage(announcementsCard)) {
                                return;
                            }
                            item.bodyTaAuto = translatedBody;
                            var bodyNode = announcementsList.querySelector(".announcement-body");
                            if (bodyNode) {
                                bodyNode.textContent = translatedBody;
                            }
                        });
                    }
                }
            }

            function startAnnouncementsCarousel() {
                stopAnnouncementsCarousel();
                if (announcementCarouselItems.length <= 1) {
                    return;
                }
                announcementCarouselTimerId = window.setInterval(function () {
                    announcementCarouselIndex = nextAnnouncementIndex(1);
                    renderAnnouncementCarouselFrame();
                }, 5000);
            }

            function renderAnnouncements() {
                if (!announcementsList) {
                    return;
                }

                if (announcementsError) {
                    syncAnnouncementsBanner("");
                    announcementCarouselItems = [];
                    stopAnnouncementsCarousel();
                    setAnnouncementsStandardMediaVisible(true);
                    announcementsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadAnnouncementsErrorTitle", "Could not load announcements", announcementsCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadAnnouncementsErrorBody", "Please try again shortly.", announcementsCard)) + "</p>" +
                        "</li>";
                    return;
                }

                var todayKey = getTodayKey();
                var dismissed = getAnnouncementDismissedSet();
                var visibleItems = allAnnouncements
                    .filter(function (item) {
                        if (item.personalWish) {
                            return true;
                        }
                        var sid = String(item.id || "");
                        if (sid && dismissed[sid] && !item.urgent && !item.important) {
                            return false;
                        }
                        return announcementVisibleBySchedule(item, todayKey);
                    })
                    .sort(function (a, b) {
                        var ap = Boolean(a.personalWish);
                        var bp = Boolean(b.personalWish);
                        if (ap !== bp) {
                            return ap ? -1 : 1;
                        }
                        if (ap && bp) {
                            var order = { birthday: 0, anniversary: 1 };
                            return (order[a.personalWish] || 9) - (order[b.personalWish] || 9);
                        }
                        if (a.urgent !== b.urgent) {
                            return a.urgent ? -1 : 1;
                        }
                        if (a.important !== b.important) {
                            return a.important ? -1 : 1;
                        }
                        return (b.date || "").localeCompare(a.date || "");
                    })
                    .slice(0, MAX_VISIBLE_ANNOUNCEMENTS);

                if (visibleItems.length === 0) {
                    syncAnnouncementsBanner("");
                    announcementCarouselItems = [];
                    announcementCarouselPreviousIndex = -1;
                    stopAnnouncementsCarousel();
                    setAnnouncementsStandardMediaVisible(true);
                    announcementsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.noAnnouncementsTitle", "No announcements right now", announcementsCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.noAnnouncementsBody", "Check back later for updates.", announcementsCard)) + "</p>" +
                        "</li>";
                    return;
                }

                announcementCarouselItems = visibleItems;
                if (announcementCarouselIndex >= announcementCarouselItems.length) {
                    announcementCarouselIndex = 0;
                }
                announcementCarouselPreviousIndex = -1;
                renderAnnouncementCarouselFrame();
                startAnnouncementsCarousel();
            }

            function loadAnnouncements() {
                function fetchJson(url) {
                    return fetch(url).then(function (response) {
                        if (!response.ok) {
                            throw new Error("Failed to load " + url);
                        }
                        return response.json();
                    });
                }

                function fetchStaticAnnouncements() {
                    return fetchJson(announcementsUrl)
                        .catch(function () {
                            return fetchJson(announcementsFallbackUrl);
                        })
                        .then(function (data) {
                            var items = data && Array.isArray(data.items) ? data.items : [];
                            return items.map(normalizeAnnouncement).filter(function (item) {
                                return isRenderableAnnouncement(item);
                            });
                        })
                        .catch(function () {
                            return [];
                        });
                }

                function extractNoticeArray(payload) {
                    if (!payload) {
                        return [];
                    }
                    if (Array.isArray(payload)) {
                        return payload;
                    }
                    if (Array.isArray(payload.entries)) {
                        return payload.entries;
                    }
                    if (Array.isArray(payload.items)) {
                        return payload.items;
                    }
                    if (payload.data && Array.isArray(payload.data.entries)) {
                        return payload.data.entries;
                    }
                    if (payload.data && Array.isArray(payload.data)) {
                        return payload.data;
                    }
                    return [];
                }

                function fetchAdminNotices() {
                    return fetch(adminNoticesUrl + "?ts=" + String(Date.now()), { cache: "no-store" })
                        .then(function (response) {
                            if (response.status === 404) {
                                return [];
                            }
                            if (!response.ok) {
                                throw new Error("Failed to load admin notices");
                            }
                            return response.json().then(function (payload) {
                                var entries = extractNoticeArray(payload);
                                return entries.map(normalizeAdminNotice).filter(function (item) {
                                    return isRenderableAnnouncement(item);
                                });
                            });
                        })
                        .catch(function () {
                            return [];
                        });
                }

                Promise.all([fetchStaticAnnouncements(), fetchAdminNotices()])
                    .then(function (result) {
                        var personal = buildPersonalWishAnnouncements();
                        var merged = personal.concat((result[0] || []).concat(result[1] || []));
                        var seen = {};
                        allAnnouncements = merged.filter(function (item) {
                            if (item.personalWish) {
                                var pkey = String(item.id || "").trim();
                                if (!pkey || seen[pkey]) {
                                    return false;
                                }
                                seen[pkey] = true;
                                return true;
                            }
                            var key = String(item.id || (item.title + "|" + item.date + "|" + item.body + "|" + item.imageUrl)).trim();
                            if (!key || seen[key]) {
                                return false;
                            }
                            seen[key] = true;
                            return true;
                        });
                        announcementsError = false;
                        renderAnnouncements();
                    })
                    .catch(function () {
                        announcementsError = true;
                        renderAnnouncements();
                    });
            }

            function toFriendlyReference(ref, sourceElement) {
                var value = String(ref || "").trim();
                var match = value.match(/^(\d+\s+)?([A-Za-z]+)\.(.+)$/);
                if (!match) {
                    if (isTamilLanguage(sourceElement)) {
                        var plainMatch = value.match(/^([1-3]\s+[A-Za-z]+|[A-Za-z][A-Za-z\s]+)\s+(.+)$/);
                        if (plainMatch) {
                            var englishBook = plainMatch[1].trim();
                            var tailRef = plainMatch[2].trim();
                            var tamilBook = englishNameToTamil[englishBook];
                            if (tamilBook) {
                                return tamilBook + " " + tailRef;
                            }
                        }
                    }
                    return value;
                }

                var prefix = match[1] ? match[1].trim() + " " : "";
                var shortBook = prefix + match[2] + ".";
                var tail = match[3].trim();
                var selectedMap = isTamilLanguage(sourceElement) ? bookMapTamil : bookMapEnglish;
                var fullBook = selectedMap[shortBook] || bookMapEnglish[shortBook] || shortBook;
                return fullBook + " " + tail;
            }

            function getReadTooltip(part, isDone, sourceElement) {
                if (isDone) {
                    return T("home.readTooltipDone", "Marked as read", sourceElement);
                }
                if (part === "morning") {
                    return T("home.markMorningDone", "Morning reading done", sourceElement);
                }
                if (part === "evening") {
                    return T("home.markEveningDone", "Evening reading done", sourceElement);
                }
                return T("home.readTooltipPending", "Mark as read", sourceElement);
            }

            function planBlock(titleKey, titleFallback, refs, part, progress, sourceElement) {
                var cleanRefs = Array.isArray(refs) ? refs.filter(Boolean).map(function (ref) {
                    return toFriendlyReference(ref, sourceElement);
                }) : [];
                if (cleanRefs.length === 0) {
                    return "";
                }
                var partKey = (part === "morning" || part === "evening") ? part : "";
                var checked = partKey ? Boolean(progress && progress[partKey]) : false;
                var checkedAttr = checked ? " checked" : "";
                var tooltip = NjcEvents.escapeHtml(getReadTooltip(partKey, checked, sourceElement));
                var tick = partKey
                    ? ("<input class=\"reading-inline-tick\" type=\"checkbox\" data-reading-part=\"" + partKey + "\"" + checkedAttr + " title=\"" + tooltip + "\" aria-label=\"" + tooltip + "\">")
                    : "";
                return "" +
                    "<div class=\"reading-compact-item\">" +
                    "  <h3 class=\"reading-item-title\">" + tick + NjcEvents.escapeHtml(T(titleKey, titleFallback, sourceElement)) + "</h3>" +
                    "  <p class=\"reading-compact-ref\">" + buildReadingRefsLinksHtml(refs, sourceElement) + "</p>" +
                    "</div>";
            }

            function getRefsForPart(dayPlan, part) {
                var value = dayPlan && Array.isArray(dayPlan[part]) ? dayPlan[part] : [];
                return value.filter(function (ref) {
                    return String(ref || "").trim().length > 0;
                });
            }

            function isPlanDayComplete(dayPlan, progress) {
                var morningRefs = getRefsForPart(dayPlan, "morning");
                var eveningRefs = getRefsForPart(dayPlan, "evening");
                var morningDone = morningRefs.length === 0 || Boolean(progress && progress.morning);
                var eveningDone = eveningRefs.length === 0 || Boolean(progress && progress.evening);
                return morningDone && eveningDone;
            }

            function buildReadingProgressData() {
                if (!Array.isArray(fullReadingPlan) || fullReadingPlan.length === 0) {
                    return null;
                }
                var progressMap = getProgressMap();
                var todayDayNumber = getDayOfYear(todayYmd);
                var totalDays = fullReadingPlan.length;
                var completedDays = 0;
                var unreadBacklog = [];
                for (var index = 0; index < fullReadingPlan.length; index += 1) {
                    var dayPlan = fullReadingPlan[index] || {};
                    var dayNumber = index + 1;
                    var ymdKey = toYmdKeyFromDayNumber(todayYmd.year, dayNumber);
                    var progress = progressMap[ymdKey] || {};
                    var morningRefs = getRefsForPart(dayPlan, "morning");
                    var eveningRefs = getRefsForPart(dayPlan, "evening");
                    var morningMissing = morningRefs.length > 0 && !Boolean(progress.morning);
                    var eveningMissing = eveningRefs.length > 0 && !Boolean(progress.evening);
                    if (isPlanDayComplete(dayPlan, progress)) {
                        completedDays += 1;
                    } else if (dayNumber <= todayDayNumber && (morningMissing || eveningMissing)) {
                        unreadBacklog.push({
                            dateKey: ymdKey,
                            dayNumber: dayNumber,
                            morningMissing: morningMissing,
                            eveningMissing: eveningMissing,
                            morningRefs: morningRefs,
                            eveningRefs: eveningRefs
                        });
                    }
                }
                var percentComplete = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;
                if (percentComplete < 0) {
                    percentComplete = 0;
                }
                if (percentComplete > 100) {
                    percentComplete = 100;
                }
                var remainingDays = Math.max(0, totalDays - completedDays);
                var percentRemaining = Math.max(0, 100 - percentComplete);
                return {
                    totalDays: totalDays,
                    completedDays: completedDays,
                    remainingDays: remainingDays,
                    percentComplete: percentComplete,
                    percentRemaining: percentRemaining,
                    unreadBacklog: unreadBacklog
                };
            }

            function ymdToUtcNoon(ymd) {
                if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
                    return null;
                }
                var p = ymd.split("-");
                return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 12, 0, 0));
            }

            function brusselsYmdFromDate(d) {
                var parts = new Intl.DateTimeFormat("en-CA", {
                    timeZone: brusselsTimeZone,
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).formatToParts(d);
                var y = "";
                var m = "";
                var day = "";
                parts.forEach(function (pt) {
                    if (pt.type === "year") y = pt.value;
                    if (pt.type === "month") m = pt.value;
                    if (pt.type === "day") day = pt.value;
                });
                if (!y || !m || !day) {
                    return "";
                }
                return y + "-" + m + "-" + day;
            }

            function addDaysToYmd(ymd, deltaDays) {
                var d = ymdToUtcNoon(ymd);
                if (!d) {
                    return "";
                }
                d.setUTCDate(d.getUTCDate() + deltaDays);
                var yy = d.getUTCFullYear();
                var mm = String(d.getUTCMonth() + 1).padStart(2, "0");
                var dd = String(d.getUTCDate()).padStart(2, "0");
                return yy + "-" + mm + "-" + dd;
            }

            function isReadingDayCompleteBrussels(ymdKey) {
                if (!Array.isArray(fullReadingPlan) || fullReadingPlan.length === 0 || !ymdKey) {
                    return false;
                }
                var parts = ymdKey.split("-");
                var dayNumber = getDayOfYear({
                    year: Number(parts[0]),
                    month: Number(parts[1]),
                    day: Number(parts[2])
                });
                var dayPlan = fullReadingPlan[dayNumber - 1];
                if (!dayPlan) {
                    return false;
                }
                var progressMap = getProgressMap();
                var progress = progressMap[ymdKey] || {};
                return isPlanDayComplete(dayPlan, progress);
            }

            function computeReadingDayStreakBrussels() {
                var todayB = brusselsYmdFromDate(new Date());
                if (!todayB) {
                    return 0;
                }
                var streak = 0;
                var y = todayB;
                for (var i = 0; i < 800; i++) {
                    if (!isReadingDayCompleteBrussels(y)) {
                        break;
                    }
                    streak++;
                    y = addDaysToYmd(y, -1);
                    if (!y) {
                        break;
                    }
                }
                return streak;
            }

            function renderReadingStreakAndNudge() {
                if (readingStreakLine) {
                    var streak = computeReadingDayStreakBrussels();
                    if (streak > 0) {
                        readingStreakLine.textContent = formatCount(T("home.readingStreakDays", "{count}-day reading streak (Brussels days)", readingCard), streak);
                        readingStreakLine.hidden = false;
                    } else {
                        readingStreakLine.textContent = "";
                        readingStreakLine.hidden = true;
                    }
                }
                if (readingNudgeLine) {
                    var todayB = brusselsYmdFromDate(new Date());
                    var hour = new Date().getHours();
                    var prog = todayB ? getProgressForDate(todayB) : { morning: false, evening: false };
                    var msg = "";
                    if (todayB && hour >= 5 && hour < 14 && !prog.morning) {
                        msg = T("home.readingNudgeMorning", "Don’t forget today’s morning reading.", readingCard);
                    } else if (todayB && hour >= 14 && hour < 22 && !prog.evening) {
                        msg = T("home.readingNudgeEvening", "Don’t forget today’s evening reading.", readingCard);
                    }
                    readingNudgeLine.textContent = msg;
                    readingNudgeLine.hidden = !msg;
                }
            }

            function getAnnouncementDismissedSet() {
                try {
                    var raw = window.localStorage.getItem(ANNOUNCEMENT_DISMISSED_KEY);
                    var o = raw ? JSON.parse(raw) : {};
                    return o && typeof o === "object" ? o : {};
                } catch (e) {
                    return {};
                }
            }

            function markAnnouncementDismissed(id) {
                if (!id) {
                    return;
                }
                try {
                    var o = getAnnouncementDismissedSet();
                    o[String(id)] = Date.now();
                    window.localStorage.setItem(ANNOUNCEMENT_DISMISSED_KEY, JSON.stringify(o));
                } catch (e) {}
            }

            function renderUnreadBacklog(items) {
                if (!readingUnreadList) {
                    return;
                }
                if (!unreadListOpen) {
                    readingUnreadList.hidden = true;
                    readingUnreadList.innerHTML = "";
                    return;
                }
                var entries = Array.isArray(items) ? items : [];
                readingUnreadList.hidden = false;
                if (!entries.length) {
                    readingUnreadList.innerHTML = "" +
                        "<li>" +
                        "  <p class=\"page-note\">" + NjcEvents.escapeHtml(T("home.unreadDaysEmpty", "No missed readings so far.", readingCard)) + "</p>" +
                        "</li>";
                    return;
                }
                var morningLabel = T("home.morningShort", "Morning", readingCard);
                var eveningLabel = T("home.eveningShort", "Evening", readingCard);
                readingUnreadList.innerHTML = entries.map(function (item) {
                    var dateLabel = formatYmdForLocale(item.dateKey, readingCard);
                    var lines = [];
                    if (item.morningMissing) {
                        lines.push(
                            "<label class=\"reading-unread-line\">" +
                            "  <input type=\"checkbox\" data-reading-date=\"" + NjcEvents.escapeHtml(item.dateKey) + "\" data-reading-part=\"morning\">" +
                            "  <span><strong>" + NjcEvents.escapeHtml(morningLabel) + ":</strong> " + buildReadingRefsLinksHtml(item.morningRefs, readingCard) + "</span>" +
                            "</label>"
                        );
                    }
                    if (item.eveningMissing) {
                        lines.push(
                            "<label class=\"reading-unread-line\">" +
                            "  <input type=\"checkbox\" data-reading-date=\"" + NjcEvents.escapeHtml(item.dateKey) + "\" data-reading-part=\"evening\">" +
                            "  <span><strong>" + NjcEvents.escapeHtml(eveningLabel) + ":</strong> " + buildReadingRefsLinksHtml(item.eveningRefs, readingCard) + "</span>" +
                            "</label>"
                        );
                    }
                    return "" +
                        "<li class=\"reading-unread-item\">" +
                        "  <h3>" + NjcEvents.escapeHtml(dateLabel || item.dateKey) + "</h3>" +
                        "  " + lines.join("") +
                        "</li>";
                }).join("");
            }

            function renderReadingProgress() {
                if (!readingProgressTitle || !readingProgressPercent || !readingProgressSummary || !readingProgressRemaining || !readingProgressFill || !readingUnreadToggle) {
                    return;
                }
                readingProgressTitle.textContent = T("home.readingProgressTitle", "Reading progress", readingCard);
                var progress = buildReadingProgressData();
                if (!progress) {
                    readingProgressPercent.textContent = "0%";
                    readingProgressFill.style.width = "0%";
                    if (readingProgressTrack) {
                        readingProgressTrack.setAttribute("aria-valuenow", "0");
                    }
                    readingProgressSummary.textContent = "";
                    readingProgressRemaining.textContent = "";
                    readingUnreadToggle.textContent = T("home.unreadDaysShow", "Unread days (0)", readingCard).replace("{count}", "0");
                    readingUnreadToggle.disabled = true;
                    renderUnreadBacklog([]);
                    return;
                }

                var summaryTemplate = T("home.readingProgressSummary", "{done}/{total} days completed", readingCard);
                readingProgressSummary.textContent = summaryTemplate
                    .replace("{done}", String(progress.completedDays))
                    .replace("{total}", String(progress.totalDays));
                readingProgressPercent.textContent = String(progress.percentComplete) + "%";
                readingProgressFill.style.width = String(progress.percentComplete) + "%";
                if (readingProgressTrack) {
                    readingProgressTrack.setAttribute("aria-valuenow", String(progress.percentComplete));
                }
                var remainingDaysText = formatCount(T("home.readingRemainingDays", "{count} days to go", readingCard), progress.remainingDays);
                var remainingPercentText = formatCount(T("home.readingRemainingPercent", "{count}% remaining", readingCard), progress.percentRemaining);
                readingProgressRemaining.textContent = remainingDaysText + " • " + remainingPercentText;

                var unreadCount = progress.unreadBacklog.length;
                if (unreadListOpen) {
                    readingUnreadToggle.textContent = T("home.unreadDaysHide", "Hide unread list", readingCard);
                } else {
                    readingUnreadToggle.textContent = formatCount(T("home.unreadDaysShow", "Unread days ({count})", readingCard), unreadCount);
                }
                readingUnreadToggle.disabled = false;
                renderUnreadBacklog(progress.unreadBacklog);
                renderReadingStreakAndNudge();
            }

            function renderReadingPlan() {
                if (readingPlanError) {
                    todayReadingPlanList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadReadingErrorTitle", "Could not load today's reading plan", readingCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadReadingErrorBody", "Please try again shortly.", readingCard)) + "</p>" +
                        "</li>";
                    renderReadingProgress();
                    return;
                }

                if (!todayPlanData) {
                    renderReadingProgress();
                    return;
                }

                var progress = getTodayProgress();
                var morningBlock = planBlock("home.morningShort", "Morning", todayPlanData.morning, "morning", progress, readingCard);
                var eveningBlock = planBlock("home.eveningShort", "Evening", todayPlanData.evening, "evening", progress, readingCard);
                var compactHtml = morningBlock + eveningBlock;

                if (!compactHtml) {
                    todayReadingPlanList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.noReadingTitle", "No reading entries today", readingCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.noReadingBody", "Please check your Readingplan app.", readingCard)) + "</p>" +
                        "</li>";
                    renderReadingProgress();
                    return;
                }

                todayReadingPlanList.innerHTML = "<li class=\"reading-compact-row\">" + compactHtml + "</li>";
                renderReadingProgress();
            }

            function loadTodayReadingPlan() {
                var dayOfYear = getDayOfYear(todayYmd);

                promiseWithTimeout(fetch(readingPlanUrl), 12000, "Reading plan timeout")
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error("Could not load reading plan");
                        }
                        return response.json();
                    })
                    .then(function (planData) {
                        var readingPlan = planData && Array.isArray(planData.readingPlan) ? planData.readingPlan : [];
                        fullReadingPlan = readingPlan;
                        var todayPlan = readingPlan[dayOfYear - 1];
                        if (!todayPlan) {
                            throw new Error("No plan for today");
                        }
                        todayPlanData = todayPlan;
                        renderReadingPlan();
                    })
                    .catch(function () {
                        fullReadingPlan = [];
                        readingPlanError = true;
                        renderReadingPlan();
                    });
            }

            function renderThisWeekEvents() {
                if (eventsError) {
                    thisWeekEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadEventsErrorTitle", "Could not load events for this week", thisWeekCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadEventsErrorBody", "Please open the Events tab to refresh.", thisWeekCard)) + "</p>" +
                        "</li>";
                    return;
                }

                if (!eventsMeta) {
                    return;
                }

                var thisWeekCutoff = NjcEvents.getWindowCutoffKey(eventsMeta.nowBrussels, 7);
                var thisWeekEvents = allUpcomingEvents.filter(function (eventItem) {
                        return eventItem.key <= thisWeekCutoff;
                    }).slice(0, 4);

                var eventsToShow = thisWeekEvents.length > 0 ? thisWeekEvents : allUpcomingEvents.slice(0, 2);

                if (eventsToShow.length === 0) {
                    thisWeekEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.noEventsTitle", "No events available right now", thisWeekCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.noEventsBody", "Please check the Events tab for updates.", thisWeekCard)) + "</p>" +
                        "</li>";
                    return;
                }

                thisWeekEventsList.innerHTML = eventsToShow.map(function (eventItem) {
                    var titleText = localizeEventTitle(eventItem.title || T("events.event", "Event", thisWeekCard), thisWeekCard);
                    var title = NjcEvents.escapeHtml(titleText || T("events.event", "Event", thisWeekCard));
                    var date = NjcEvents.escapeHtml(NjcEvents.toDisplayDate(eventItem.year, eventItem.month, eventItem.day, getLocale(thisWeekCard)));
                    var time = NjcEvents.escapeHtml(NjcEvents.toDisplayTime(eventItem.hour, eventItem.minute));
                    var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem, thisWeekCard));
                    return "" +
                        "<li>" +
                        "  <h3>" + title + "</h3>" +
                        "  <p>" + date + " " + NjcEvents.escapeHtml(T("common.at", "at", thisWeekCard)) + " " + time + " (" + NjcEvents.escapeHtml(T("common.belgiumTime", "Belgium time", thisWeekCard)) + ")</p>" +
                        "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar", thisWeekCard)) + "</a></p>" +
                        "</li>";
                }).join("");
            }

            function loadThisWeekEvents() {
                NjcEvents.mergeUpcomingEvents({ eventsUrl: eventsUrl, horizonDays: 90 })
                    .then(function (result) {
                        eventsMeta = result;
                        allUpcomingEvents = result.events || [];
                        renderThisWeekEvents();
                    })
                    .catch(function () {
                        eventsError = true;
                        renderThisWeekEvents();
                    });
            }

            document.addEventListener("njc:langchange", function () {
                updateReadingPlanMeta();
                renderReadingPlan();
                renderDailyVerse();
                renderAnnouncements();
                loadTrivia();
                renderThisWeekEvents();
            });

            document.addEventListener("njc:cardlangchange", function (ev) {
                var d = ev && ev.detail;
                if (d && d.cardId === DAILY_VERSE_CARD_LANG_ID) {
                    verseLanguage = d.language === "ta" ? "ta" : "en";
                    saveVerseLanguage(verseLanguage);
                    renderDailyVerse();
                }
                updateReadingPlanMeta();
                renderReadingPlan();
                renderAnnouncements();
                loadTrivia();
                renderThisWeekEvents();
            });

            document.addEventListener("njc:userdata-updated", function () {
                renderReadingPlan();
                recalcAndStoreReadingPoints();
            });
            document.addEventListener("njc:admin-notices-updated", function () {
                loadAnnouncements();
            });
            document.addEventListener("njc:profile-updated", function () {
                loadAnnouncements();
            });
            document.addEventListener("njc:admin-trivia-updated", function () {
                loadTrivia();
            });
            document.addEventListener("njc:trivia-points-updated", function () {
                var card = document.getElementById("trivia-card");
                if (card) renderTriviaStats(card);
            });

            function capTriviaByDateMap(byDate, maxKeys) {
                var cap = Math.max(30, Number(maxKeys) || 120);
                var keys = Object.keys(byDate || {}).filter(function (d) {
                    return /^\d{4}-\d{2}-\d{2}$/.test(d);
                }).sort();
                if (keys.length <= cap) {
                    return byDate;
                }
                var drop = keys.length - cap;
                var next = {};
                keys.slice(drop).forEach(function (k) {
                    next[k] = byDate[k];
                });
                return next;
            }

            function buildAdminTriviaReportPayload(firebaseUid) {
                var storedUid = "u:" + String(firebaseUid || "");
                var byDate = {};
                try {
                    var raw = window.localStorage.getItem(TRIVIA_ANSWERED_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    byDate = (data && data[storedUid] && typeof data[storedUid] === "object") ? data[storedUid] : {};
                } catch (e1) {
                    byDate = {};
                }
                var correct = 0;
                var wrong = 0;
                var lastQuizDate = "";
                var lastResult = "";
                var sortedDates = [];
                for (var d in byDate) {
                    if (!Object.prototype.hasOwnProperty.call(byDate, d) || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
                        continue;
                    }
                    var v = byDate[d];
                    if (v === "correct") {
                        correct += 1;
                    } else if (v === "wrong") {
                        wrong += 1;
                    }
                    sortedDates.push(d);
                }
                sortedDates.sort();
                if (sortedDates.length) {
                    lastQuizDate = sortedDates[sortedDates.length - 1];
                    lastResult = String(byDate[lastQuizDate] || "");
                    if (lastResult !== "correct" && lastResult !== "wrong") {
                        lastResult = "";
                    }
                }
                var capped = capTriviaByDateMap(byDate, ADMIN_TRIVIA_REPORT_MAX_DATES);
                return {
                    correctCount: correct,
                    wrongCount: wrong,
                    lastQuizDate: lastQuizDate,
                    lastResult: lastResult,
                    triviaByDate: capped,
                    lastUpdatedAt: window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue
                        ? window.firebase.firestore.FieldValue.serverTimestamp()
                        : null
                };
            }

            function syncTriviaAdminReportToCloud(firebaseUid) {
                if (!firebaseUid || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                    return;
                }
                if (!window.firebase.firestore || !window.firebase.firestore.FieldValue) {
                    return;
                }
                try {
                    var payload = buildAdminTriviaReportPayload(firebaseUid);
                    if (!payload.lastUpdatedAt) {
                        return;
                    }
                    window.firebase.firestore()
                        .collection("adminTriviaReports")
                        .doc(String(firebaseUid))
                        .set(payload, { merge: true })
                        .catch(function () {});
                } catch (e2) {}
            }

            function syncTriviaPointsForUser() {
                var user = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                if (!user || !user.uid) return;
                var uid = "u:" + String(user.uid);
                var guestId = null;
                try {
                    guestId = window.localStorage.getItem(TRIVIA_GUEST_ID_KEY);
                } catch (e) {}
                var guestPoints = 0;
                if (guestId) {
                    try {
                        var raw = window.localStorage.getItem(TRIVIA_POINTS_KEY);
                        var data = raw ? JSON.parse(raw) : {};
                        guestPoints = Number(data["g:" + guestId]) || 0;
                    } catch (e) {}
                }
                loadTriviaPointsFromCloud(user.uid).then(function (cloudPoints) {
                    try {
                        var raw = window.localStorage.getItem(TRIVIA_POINTS_KEY);
                        var data = raw ? JSON.parse(raw) : {};
                        var localUser = Number(data[uid]) || 0;
                        var cloud = Number(cloudPoints) || 0;
                        var total = Math.max(localUser, cloud, 0) + (guestPoints || 0);
                        data[uid] = total;
                        if (guestPoints > 0 && guestId) {
                            delete data["g:" + guestId];
                        }
                        window.localStorage.setItem(TRIVIA_POINTS_KEY, JSON.stringify(data));
                        syncTriviaPointsToCloud(user.uid, total);
                        syncTriviaAdminReportToCloud(user.uid);
                        if (window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
                            window.NjcAchievementBoard.syncMyPublicScore();
                        }
                        document.dispatchEvent(new CustomEvent("njc:trivia-points-updated", { detail: { points: total } }));
                    } catch (e) {}
                });
            }

            document.addEventListener("njc:authchange", function () {
                syncTriviaPointsForUser();
                recalcAndStoreReadingPoints();
                loadAnnouncements();
            });

            function getTriviaUserId() {
                var user = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                if (user && user.uid) {
                    return "u:" + String(user.uid);
                }
                try {
                    var gid = window.localStorage.getItem(TRIVIA_GUEST_ID_KEY);
                    if (gid) return "g:" + gid;
                    gid = "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
                    window.localStorage.setItem(TRIVIA_GUEST_ID_KEY, gid);
                    return "g:" + gid;
                } catch (e) {
                    return "anon";
                }
            }

            function getTriviaAnswered(date) {
                try {
                    var raw = window.localStorage.getItem(TRIVIA_ANSWERED_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    return (data[uid] && data[uid][date]) || null;
                } catch (e) {
                    return null;
                }
            }

            function setTriviaAnswered(date, result) {
                try {
                    var raw = window.localStorage.getItem(TRIVIA_ANSWERED_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    if (!data[uid]) data[uid] = {};
                    data[uid][date] = result;
                    window.localStorage.setItem(TRIVIA_ANSWERED_KEY, JSON.stringify(data));
                    var user = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
                    if (user && user.uid && uid.indexOf("u:") === 0) {
                        syncTriviaAdminReportToCloud(user.uid);
                    }
                } catch (e) {}
            }

            function getTriviaPoints() {
                try {
                    var raw = window.localStorage.getItem(TRIVIA_POINTS_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    return Number(data[uid]) || 0;
                } catch (e) {
                    return 0;
                }
            }

            function getTriviaStats() {
                var points = getTriviaPoints();
                var correct = 0;
                var wrong = 0;
                var byDate = {};
                try {
                    var raw = window.localStorage.getItem(TRIVIA_ANSWERED_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    byDate = data[uid] || {};
                    for (var d in byDate) {
                        if (Object.prototype.hasOwnProperty.call(byDate, d) && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
                            if (byDate[d] === "correct") correct++;
                            else if (byDate[d] === "wrong") wrong++;
                        }
                    }
                } catch (e) {}
                var streak = 0;
                var today = getTriviaEffectiveDate();
                for (var daysAgo = 0; daysAgo < 365; daysAgo++) {
                    var d = getDateDaysAgo(today, daysAgo);
                    if (byDate[d] === "correct") streak++;
                    else break;
                }
                return { points: points, correct: correct, wrong: wrong, total: correct + wrong, streak: streak };
            }

            function getDateDaysAgo(fromYmd, daysAgo) {
                try {
                    var parts = fromYmd.split("-");
                    var y = parseInt(parts[0], 10);
                    var m = parseInt(parts[1], 10) - 1;
                    var d = parseInt(parts[2], 10);
                    var dt = new Date(Date.UTC(y, m, d));
                    dt.setUTCDate(dt.getUTCDate() - daysAgo);
                    var yy = dt.getUTCFullYear();
                    var mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
                    var dd = String(dt.getUTCDate()).padStart(2, "0");
                    return yy + "-" + mm + "-" + dd;
                } catch (e) {
                    return "";
                }
            }

            function getTriviaWeeklyStats() {
                var s = getTriviaStats();
                var today = getTriviaEffectiveDate();
                var weekCorrect = 0;
                var weekWrong = 0;
                try {
                    var raw = window.localStorage.getItem(TRIVIA_ANSWERED_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    var byDate = data[uid] || {};
                    for (var i = 0; i < 7; i++) {
                        var d = getDateDaysAgo(today, i);
                        if (byDate[d] === "correct") weekCorrect++;
                        else if (byDate[d] === "wrong") weekWrong++;
                    }
                } catch (e) {}
                return { correct: weekCorrect, wrong: weekWrong };
            }

            function renderTriviaWeeklySummary(card) {
                var el = card ? card.querySelector(".trivia-weekly-summary") : null;
                if (!el) return;
                var w = getTriviaWeeklyStats();
                if (w.correct === 0 && w.wrong === 0) {
                    el.hidden = true;
                    return;
                }
                el.hidden = false;
                el.textContent = T("home.triviaWeeklySummary", "This week: {correct} correct, {wrong} wrong", card)
                    .replace("{correct}", String(w.correct))
                    .replace("{wrong}", String(w.wrong));
            }

            function renderTriviaStats(card) {
                if (!triviaStatsEl || !card || card.id !== "trivia-card") return;
                var s = getTriviaStats();
                triviaStatsEl.hidden = false;
                if (triviaStatPoints) triviaStatPoints.textContent = String(s.points);
                if (triviaStatCorrect) triviaStatCorrect.textContent = String(s.correct);
                if (triviaStatWrong) triviaStatWrong.textContent = String(s.wrong);
                if (triviaStatStreak) triviaStatStreak.textContent = String(s.streak);
            }

            function getTriviaFirestoreDoc(uid) {
                if (!uid || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) return null;
                try {
                    return window.firebase.firestore()
                        .collection("users").doc(uid)
                        .collection("profile").doc("basic");
                } catch (e) { return null; }
            }

            function syncTriviaPointsToCloud(uid, points) {
                var doc = getTriviaFirestoreDoc(uid);
                if (!doc) return;
                doc.set({ triviaPoints: Number(points) || 0 }, { merge: true }).catch(function () {});
            }

            function loadTriviaPointsFromCloud(uid) {
                var doc = getTriviaFirestoreDoc(uid);
                if (!doc) return Promise.resolve(null);
                return doc.get().then(function (snap) {
                    return snap.exists ? Number(snap.data().triviaPoints) || 0 : null;
                }).catch(function () { return null; });
            }

            function addTriviaPoints(n) {
                try {
                    var raw = window.localStorage.getItem(TRIVIA_POINTS_KEY);
                    var data = raw ? JSON.parse(raw) : {};
                    var uid = getTriviaUserId();
                    var isUser = uid && uid.indexOf("u:") === 0;
                    var firebaseUid = isUser ? uid.replace(/^u:/, "") : null;
                    data[uid] = (Number(data[uid]) || 0) + (Number(n) || 0);
                    window.localStorage.setItem(TRIVIA_POINTS_KEY, JSON.stringify(data));
                    if (firebaseUid) {
                        syncTriviaPointsToCloud(firebaseUid, data[uid]);
                        if (window.NjcAchievementBoard && typeof window.NjcAchievementBoard.syncMyPublicScore === "function") {
                            window.NjcAchievementBoard.syncMyPublicScore();
                        }
                    }
                    document.dispatchEvent(new CustomEvent("njc:trivia-points-updated", { detail: { points: data[uid] } }));
                } catch (e) {}
            }

            function showTriviaWrongPopup(correctAnswer, card) {
                if (!triviaWrongOverlay || !triviaWrongAnswer) return;
                triviaWrongAnswer.textContent = correctAnswer || "";
                triviaWrongOverlay.hidden = false;
            }

            function hideTriviaWrongPopup() {
                if (triviaWrongOverlay) triviaWrongOverlay.hidden = true;
            }

            function playTriviaSuccessSound() {
                if (window.NjcUiFeedback && typeof window.NjcUiFeedback.celebrateSuccess === "function") {
                    window.NjcUiFeedback.celebrateSuccess();
                }
            }

            function shareTriviaResult(card) {
                var text = T("home.triviaShareText", "I got today's Bible Quiz correct! +1 point");
                if (navigator.share && navigator.canShare && navigator.canShare({ text: text })) {
                    navigator.share({ text: text }).catch(function () {
                        copyTriviaShareToClipboard(text);
                    });
                } else {
                    copyTriviaShareToClipboard(text);
                }
            }

            function copyTriviaShareToClipboard(text) {
                navigator.clipboard.writeText(text).then(function () {
                    if (window.NjcEvents && typeof window.NjcEvents.showToast === "function") {
                        window.NjcEvents.showToast(T("home.triviaShareCopied", "Copied to clipboard"));
                    }
                }).catch(function () {});
            }

            window.addEventListener("hashchange", function () {
                var route = String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
                if (route === "home" || route === "trivia") {
                    loadTrivia();
                }
                if (route === "home" || route === "trivia" || route === "profile") {
                    syncTriviaPointsForUser();
                }
            });

            function loadTrivia() {
                var hasPage = triviaLoading && triviaQuestionWrap && triviaQuestionText && triviaOptions && triviaEmpty;
                var hasHome = triviaLoadingHome && triviaQuestionWrapHome && triviaQuestionTextHome && triviaOptionsHome && triviaEmptyHome;
                if (!hasPage && !hasHome) return;
                function setLoading(loading, wrap, empty, card) {
                    if (loading) { loading.hidden = false; loading.textContent = T("home.triviaLoading", "Loading Bible Quiz...", card); }
                    if (wrap) wrap.hidden = true;
                    if (empty) empty.hidden = true;
                }
                function setMatch(match, loading, wrap, qText, ref, opts, empty, feedback, card, optsWrap, expandBtn, effectiveDate) {
                    if (!loading || !wrap || !qText || !opts || !empty) return;
                    loading.hidden = true;
                    if (card && card.id === "trivia-card") renderTriviaStats(card);
                    if (card && card.id === "trivia-card-home") renderTriviaWeeklySummary(card);
                    if (!match) {
                        empty.hidden = false;
                        empty.textContent = isTriviaWeekday(effectiveDate)
                            ? T("home.triviaEmpty", "No Bible Quiz for today. Check back tomorrow from midnight (Belgium time).", card)
                            : T("home.triviaEmptyWeekend", "Bible Quiz is available Monday to Friday from midnight (Belgium time).", card);
                        return;
                    }
                    var question = String(match.question || "").trim();
                    var options = Array.isArray(match.options) ? match.options : [];
                    var correctIndex = Number(match.correctIndex) || 0;
                    var correctAnswer = options[correctIndex] || "";
                    var reference = String(match.reference || "").trim();
                    empty.hidden = true;
                    qText.textContent = question || T("home.triviaNoQuestion", "No question", card);
                    if (ref) { ref.textContent = reference; ref.hidden = false; } else { ref.hidden = true; }
                    opts.innerHTML = options.map(function (opt, index) {
                        var label = String(opt || "").trim() || "-";
                        return "<button type=\"button\" class=\"trivia-option-btn\" data-trivia-index=\"" + String(index) + "\" data-trivia-correct=\"" + (index === correctIndex ? "1" : "0") + "\">" + NjcEvents.escapeHtml(label) + "</button>";
                    }).join("");
                    opts.dataset.triviaCorrectAnswer = correctAnswer;
                    wrap.hidden = false;
                    if (feedback) feedback.hidden = true;
                    var shareBtnEl = card ? card.querySelector(".trivia-share-btn") : null;
                    if (shareBtnEl) shareBtnEl.hidden = true;
                    var participatedEl = card ? card.querySelector(".trivia-participated") : null;
                    if (participatedEl) participatedEl.hidden = true;
                    var answered = effectiveDate ? getTriviaAnswered(effectiveDate) : null;
                    if (optsWrap && expandBtn) {
                        if (answered) {
                            if (participatedEl) {
                                participatedEl.hidden = false;
                                participatedEl.textContent = T("home.triviaParticipated", "You already participated for today. Come back tomorrow!", card);
                            }
                            expandBtn.hidden = false;
                            expandBtn.disabled = true;
                            expandBtn.classList.add("expanded");
                            optsWrap.hidden = false;
                            opts.querySelectorAll(".trivia-option-btn").forEach(function (b) { b.disabled = true; });
                            if (feedback) {
                                feedback.hidden = false;
                                feedback.textContent = answered === "correct" ? T("home.triviaCorrect", "Correct! Well done.", card) + " +" + TRIVIA_POINTS_PER_CORRECT + " " + T("home.triviaPoints", "pts", card) : T("home.triviaWrong", "Not quite. Try again tomorrow!", card);
                                feedback.dataset.state = answered === "correct" ? "success" : "error";
                            }
                            var shareBtn = card ? card.querySelector(".trivia-share-btn") : null;
                            if (shareBtn) shareBtn.hidden = answered !== "correct";
                        } else {
                            expandBtn.hidden = false;
                            expandBtn.classList.remove("expanded");
                            optsWrap.hidden = true;
                            opts.querySelectorAll(".trivia-option-btn").forEach(function (btn) { btn.disabled = false; });
                        }
                    } else {
                        if (answered) {
                            if (participatedEl) {
                                participatedEl.hidden = false;
                                participatedEl.textContent = T("home.triviaParticipated", "You already participated for today. Come back tomorrow!", card);
                            }
                            opts.querySelectorAll(".trivia-option-btn").forEach(function (b) { b.disabled = true; });
                            if (feedback) {
                                feedback.hidden = false;
                                feedback.textContent = answered === "correct" ? T("home.triviaCorrect", "Correct! Well done.", card) + " +" + TRIVIA_POINTS_PER_CORRECT + " " + T("home.triviaPoints", "pts", card) : T("home.triviaWrong", "Not quite. Try again tomorrow!", card);
                                feedback.dataset.state = answered === "correct" ? "success" : "error";
                            }
                            var shareBtn = card ? card.querySelector(".trivia-share-btn") : null;
                            if (shareBtn) shareBtn.hidden = answered !== "correct";
                        } else {
                            opts.querySelectorAll(".trivia-option-btn").forEach(function (btn) { btn.disabled = false; });
                        }
                    }
                }
                function setError(loading, empty, card) {
                    if (loading) loading.hidden = true;
                    if (empty) { empty.hidden = false; empty.textContent = T("home.triviaError", "Could not load Bible Quiz. Try again later.", card); }
                }
                var effectiveDate = getTriviaEffectiveDate();
                if (!isTriviaWeekday(effectiveDate)) {
                    if (hasPage) {
                        triviaLoading.hidden = true;
                        triviaEmpty.hidden = false;
                        triviaEmpty.textContent = T("home.triviaEmptyWeekend", "Bible Quiz is available Monday to Friday from midnight (Belgium time).", triviaCard);
                    }
                    if (hasHome) {
                        triviaLoadingHome.hidden = true;
                        triviaEmptyHome.hidden = false;
                        triviaEmptyHome.textContent = T("home.triviaEmptyWeekend", "Bible Quiz is available Monday to Friday from midnight (Belgium time).", triviaCardHome);
                        renderTriviaWeeklySummary(triviaCardHome);
                    }
                    return;
                }
                if (hasPage) setLoading(triviaLoading, triviaQuestionWrap, triviaEmpty, triviaCard);
                if (hasHome) setLoading(triviaLoadingHome, triviaQuestionWrapHome, triviaEmptyHome, triviaCardHome);
                var timeoutMs = 15000;
                var timeoutPromise = new Promise(function (_, reject) {
                    setTimeout(function () { reject(new Error("Bible Quiz load timeout")); }, timeoutMs);
                });
                Promise.race([
                    fetch(adminTriviaUrl + "?ts=" + String(Date.now()), { cache: "no-store" })
                        .then(function (response) {
                            if (response.status === 404) {
                                return { entries: [] };
                            }
                            if (!response.ok) {
                                throw new Error("Bible Quiz load failed");
                            }
                            return response.json();
                        }),
                    timeoutPromise
                ]).then(function (payload) {
                        var entries = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
                        var match = entries.find(function (item) {
                            var showDate = String(item && (item.showDate || item.date) || "").trim();
                            return showDate === effectiveDate;
                        });
                        if (hasPage) setMatch(match, triviaLoading, triviaQuestionWrap, triviaQuestionText, triviaReference, triviaOptions, triviaEmpty, triviaFeedback, triviaCard, null, null, effectiveDate);
                        if (hasHome) setMatch(match, triviaLoadingHome, triviaQuestionWrapHome, triviaQuestionTextHome, triviaReferenceHome, triviaOptionsHome, triviaEmptyHome, triviaFeedbackHome, triviaCardHome, triviaOptionsWrapHome, triviaExpandBtnHome, effectiveDate);
                    })
                    .catch(function () {
                        if (hasPage) setError(triviaLoading, triviaEmpty, triviaCard);
                        if (hasHome) setError(triviaLoadingHome, triviaEmptyHome, triviaCardHome);
                    });
            }

            function setupTriviaOptionClicks() {
                document.addEventListener("click", function (event) {
                    var btn = event.target.closest(".trivia-option-btn");
                    if (!btn || btn.disabled) return;
                    var opts = btn.closest(".trivia-options");
                    var feedback = opts && opts.parentElement ? opts.parentElement.querySelector(".trivia-feedback") : null;
                    var card = opts && opts.closest(".card") ? opts.closest(".card") : null;
                    if (!opts || !feedback) return;
                    var effectiveDate = getTriviaEffectiveDate();
                    if (getTriviaAnswered(effectiveDate)) return;
                    var isCorrect = btn.getAttribute("data-trivia-correct") === "1";
                    var correctAnswer = opts.dataset.triviaCorrectAnswer || "";
                    setTriviaAnswered(effectiveDate, isCorrect ? "correct" : "wrong");
                    opts.querySelectorAll(".trivia-option-btn").forEach(function (b) { b.disabled = true; });
                    feedback.hidden = false;
                    if (isCorrect) {
                        addTriviaPoints(TRIVIA_POINTS_PER_CORRECT);
                        feedback.textContent = T("home.triviaCorrect", "Correct! Well done.", card) + " +" + TRIVIA_POINTS_PER_CORRECT + " " + T("home.triviaPoints", "pts", card);
                        feedback.dataset.state = "success";
                        feedback.classList.add("trivia-feedback-success");
                        setTimeout(function () { feedback.classList.remove("trivia-feedback-success"); }, 600);
                        playTriviaSuccessSound();
                        var shareBtn = opts.parentElement ? opts.parentElement.querySelector(".trivia-share-btn") : null;
                        if (shareBtn) {
                            shareBtn.hidden = false;
                            shareBtn.onclick = function () { shareTriviaResult(card); };
                        }
                        if (card && card.id === "trivia-card-home") renderTriviaWeeklySummary(card);
                    } else {
                        feedback.textContent = T("home.triviaWrong", "Not quite. Try again tomorrow!", card);
                        feedback.dataset.state = "error";
                        showTriviaWrongPopup(correctAnswer, card);
                    }
                });
            }
            setupTriviaOptionClicks();

            if (triviaExpandBtnHome && triviaOptionsWrapHome) {
                triviaExpandBtnHome.addEventListener("click", function () {
                    var expanded = triviaOptionsWrapHome.hidden;
                    triviaOptionsWrapHome.hidden = !expanded;
                    triviaExpandBtnHome.classList.toggle("expanded", !expanded);
                });
            }
            if (triviaWrongBackdrop) {
                triviaWrongBackdrop.addEventListener("click", hideTriviaWrongPopup);
            }
            if (triviaWrongClose) {
                triviaWrongClose.addEventListener("click", hideTriviaWrongPopup);
            }

            if (readingUnreadToggle) {
                readingUnreadToggle.addEventListener("click", function () {
                    unreadListOpen = !unreadListOpen;
                    renderReadingProgress();
                });
            }

            todayReadingPlanList.addEventListener("change", function (event) {
                var target = event.target;
                if (!target || target.tagName !== "INPUT") {
                    return;
                }
                var part = target.getAttribute("data-reading-part");
                if (part !== "morning" && part !== "evening") {
                    return;
                }
                var dateKey = target.getAttribute("data-reading-date");
                if (dateKey) {
                    setProgressForDate(dateKey, part, target.checked);
                } else {
                    setTodayProgress(part, target.checked);
                }
                if (target.checked && window.NjcUiFeedback && typeof window.NjcUiFeedback.readingCheckIn === "function") {
                    window.NjcUiFeedback.readingCheckIn();
                }
                var tooltip = getReadTooltip(part, target.checked, readingCard);
                target.title = tooltip;
                target.setAttribute("aria-label", tooltip);
                renderReadingProgress();
            });

            if (readingUnreadList) {
                readingUnreadList.addEventListener("change", function (event) {
                    var target = event.target;
                    if (!target || target.tagName !== "INPUT") {
                        return;
                    }
                    var part = target.getAttribute("data-reading-part");
                    var dateKey = target.getAttribute("data-reading-date");
                    if ((part !== "morning" && part !== "evening") || !dateKey) {
                        return;
                    }
                    setProgressForDate(dateKey, part, target.checked);
                    if (target.checked && window.NjcUiFeedback && typeof window.NjcUiFeedback.readingCheckIn === "function") {
                        window.NjcUiFeedback.readingCheckIn();
                    }
                    renderReadingPlan();
                });
            }

            if (readingShareProgressBtn) {
                readingShareProgressBtn.addEventListener("click", function () {
                    var prog = buildReadingProgressData();
                    var pct = prog ? prog.percentComplete : 0;
                    var done = prog ? prog.completedDays : 0;
                    var tot = prog ? prog.totalDays : 0;
                    var line = T("home.readingShareLine", "My Bible reading plan: {done}/{total} days ({pct}%) — NJC App").replace("{done}", String(done)).replace("{total}", String(tot)).replace("{pct}", String(pct));
                    if (navigator.share) {
                        navigator.share({ text: line }).catch(function () {});
                    } else {
                        try {
                            navigator.clipboard.writeText(line);
                        } catch (e) {}
                    }
                });
            }

            if (announcementsList) {
                announcementsList.addEventListener("click", function (event) {
                    var dismissBtnEl = event.target.closest("button[data-announcement-dismiss]");
                    if (dismissBtnEl) {
                        var did = dismissBtnEl.getAttribute("data-announcement-dismiss") || "";
                        markAnnouncementDismissed(did);
                        renderAnnouncements();
                        return;
                    }
                    var actionButton = event.target.closest("button[data-announcement-action]");
                    if (actionButton) {
                        var action = actionButton.getAttribute("data-announcement-action");
                        if (action === "prev") {
                            announcementCarouselIndex = nextAnnouncementIndex(-1);
                            renderAnnouncementCarouselFrame();
                            startAnnouncementsCarousel();
                        } else if (action === "next") {
                            announcementCarouselIndex = nextAnnouncementIndex(1);
                            renderAnnouncementCarouselFrame();
                            startAnnouncementsCarousel();
                        }
                        return;
                    }
                    var dotButton = event.target.closest("button[data-announcement-index]");
                    if (!dotButton) {
                        return;
                    }
                    var nextIndex = Number(dotButton.getAttribute("data-announcement-index"));
                    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= announcementCarouselItems.length) {
                        return;
                    }
                    announcementCarouselIndex = nextIndex;
                    renderAnnouncementCarouselFrame();
                    startAnnouncementsCarousel();
                });
            }

            function ymdKey(ymd) {
                return String(ymd.year) + "-" + String(ymd.month).padStart(2, "0") + "-" + String(ymd.day).padStart(2, "0");
            }

            function maybeRefreshDailyVerseForNewCalendarDay() {
                var fresh = getBrusselsYmd();
                if (ymdKey(fresh) !== ymdKey(todayYmd)) {
                    todayYmd = fresh;
                    renderDailyVerse();
                }
            }

            document.addEventListener("visibilitychange", function () {
                if (document.visibilityState === "visible") {
                    maybeRefreshDailyVerseForNewCalendarDay();
                }
            });
            window.addEventListener("pageshow", function (ev) {
                if (ev && ev.persisted) {
                    maybeRefreshDailyVerseForNewCalendarDay();
                }
            });
            window.setInterval(maybeRefreshDailyVerseForNewCalendarDay, 60000);

            updateReadingPlanMeta();
            renderReadingProgress();
            window.requestAnimationFrame(function () {
                setDailyVerseToggleLabel();
                renderDailyVerse();
            });
            applyAnnouncementsCardGradient();
            loadTodayReadingPlan();
            loadAnnouncements();
            recalcAndStoreReadingPoints();
            /* Trivia + events + cloud sync are not needed for first paint — defer to idle time. */
            runWhenIdle(function () {
                loadTrivia();
                syncTriviaPointsForUser();
                loadThisWeekEvents();
            }, 2200);
        })();
