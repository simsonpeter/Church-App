(function () {
            var READING_PROGRESS_KEY = "njc_reading_progress_v1";
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
            var dailyVerseText = document.getElementById("daily-verse-text");
            var dailyVerseReference = document.getElementById("daily-verse-reference");
            var dailyVerseLanguageToggle = document.getElementById("daily-verse-language-toggle");
            var announcementsList = document.getElementById("home-announcements-list");
            var readingPlanUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/plan/njcplan.json";
            var kjvBibleUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/englishbible.json";
            var tamilBsiOldBibleUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/bibles/tamilbible.json";
            var announcementsUrl = "./announcements.json";
            var announcementsFallbackUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/announcements.json";
            var ANNOUNCEMENT_TRANSLATION_CACHE_KEY = "njc_announcement_translation_cache_v1";
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
            var readingCard = todayReadingPlanList ? todayReadingPlanList.closest(".card") : null;
            var verseCard = dailyVerseText ? dailyVerseText.closest(".card") : null;
            var announcementsCard = announcementsList ? announcementsList.closest(".card") : null;
            var triviaCard = document.getElementById("trivia-card");
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
            var announcementCarouselItems = [];
            var announcementCarouselIndex = 0;
            var announcementCarouselTimerId = null;
            var eventsMeta = null;
            var eventsError = false;
            var announcementTranslationCache = getAnnouncementTranslationCache();
            var announcementTranslationPending = {};
            var announcementTranslationSaveTimerId = null;
            var verseLanguage = getStoredVerseLanguage();
            var dailyVerseRenderToken = 0;
            var kjvBiblePromise = null;
            var tamilBiblePromise = null;
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
                if (!dailyVerseLanguageToggle) {
                    return;
                }
                var nextLanguage = verseLanguage === "ta" ? "en" : "ta";
                var label = nextLanguage === "ta"
                    ? T("home.dailyVerseToggleToTamil", "Switch verse to Tamil", verseCard)
                    : T("home.dailyVerseToggleToEnglish", "Switch verse to English", verseCard);
                dailyVerseLanguageToggle.textContent = nextLanguage.toUpperCase();
                dailyVerseLanguageToggle.setAttribute("aria-label", label);
                dailyVerseLanguageToggle.title = label;
            }

            function getVerseVersionLabel(showTamil) {
                return showTamil
                    ? T("home.dailyVerseVersionTamil", "BSI (Old)", verseCard)
                    : T("home.dailyVerseVersionEnglish", "KJV", verseCard);
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
                if (!Array.isArray(dailyVersePool) || dailyVersePool.length === 0) {
                    dailyVerseText.textContent = T("home.dailyVerseEmptyBody", "Daily verse is unavailable.", verseCard);
                    dailyVerseReference.textContent = "";
                    return;
                }
                dailyVerseRenderToken += 1;
                var renderToken = dailyVerseRenderToken;
                var verseIndex = (getDayOfYear(todayYmd) - 1) % dailyVersePool.length;
                var verseItem = dailyVersePool[verseIndex];
                var showTamil = verseLanguage === "ta";
                var languageKey = showTamil ? "ta" : "en";
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
            }

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

            function getLocalEffectiveDate() {
                var now = new Date();
                var hour = now.getHours();
                var localDate = new Date(now);
                if (hour < 8) {
                    localDate.setDate(localDate.getDate() - 1);
                }
                var y = localDate.getFullYear();
                var m = String(localDate.getMonth() + 1).padStart(2, "0");
                var d = String(localDate.getDate()).padStart(2, "0");
                return String(y) + "-" + m + "-" + d;
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

            function normalizeAnnouncement(item, index) {
                var source = item && typeof item === "object" ? item : {};
                var title = String(source.title || "").trim();
                var body = String(source.body || "").trim();
                return {
                    id: String(source.id || ("announcement-" + index)),
                    title: title,
                    titleTa: String(source.titleTa || "").trim(),
                    body: body,
                    bodyTa: String(source.bodyTa || "").trim(),
                    date: toYmdKey(source.date),
                    expires: toYmdKey(source.expires),
                    urgent: Boolean(source.urgent),
                    link: String(source.link || "").trim()
                };
            }

            function normalizeAdminNotice(item, index) {
                var source = item && typeof item === "object" ? item : {};
                var createdAt = String(source.createdAt || source.updatedAt || "").trim();
                var createdYmd = toYmdKey(createdAt.slice(0, 10));
                return {
                    id: String(source.id || ("admin-notice-" + index)),
                    title: String(source.title || "").trim(),
                    titleTa: String(source.titleTa || "").trim(),
                    body: String(source.body || "").trim(),
                    bodyTa: String(source.bodyTa || "").trim(),
                    date: toYmdKey(source.date) || createdYmd,
                    expires: toYmdKey(source.expires),
                    urgent: Boolean(source.urgent),
                    link: String(source.link || "").trim()
                };
            }

            function stopAnnouncementsCarousel() {
                if (announcementCarouselTimerId) {
                    window.clearInterval(announcementCarouselTimerId);
                    announcementCarouselTimerId = null;
                }
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

            function renderAnnouncementCarouselFrame() {
                if (!announcementsList) {
                    return;
                }
                if (!announcementCarouselItems.length) {
                    return;
                }

                var item = announcementCarouselItems[announcementCarouselIndex];
                var isTamil = isTamilLanguage(announcementsCard);
                var titleText = isTamil
                    ? (item.titleTa || item.titleTaAuto || item.title)
                    : (item.title || item.titleEnAuto || item.titleTa || item.titleTaAuto);
                var bodyText = isTamil
                    ? (item.bodyTa || item.bodyTaAuto || item.body)
                    : (item.body || item.bodyEnAuto || item.bodyTa || item.bodyTaAuto);
                var dateText = formatYmdForLocale(item.date, announcementsCard);
                var urgentBadge = item.urgent
                    ? ("<span class=\"announcement-badge\">" + NjcEvents.escapeHtml(T("home.announcementUrgent", "Urgent", announcementsCard)) + "</span>")
                    : "";
                var metaLine = dateText ? ("<p class=\"page-note\">" + NjcEvents.escapeHtml(dateText) + "</p>") : "";
                var linkLine = item.link
                    ? ("<p><a class=\"inline-link\" href=\"" + NjcEvents.escapeHtml(item.link) + "\">" + NjcEvents.escapeHtml(T("home.readMore", "Read more", announcementsCard)) + "</a></p>")
                    : "";

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

                announcementsList.innerHTML = "" +
                    "<li class=\"announcement-carousel-item\">" +
                    "  <h3 class=\"announcement-title\">" + urgentBadge + NjcEvents.escapeHtml(titleText || T("home.announcementsTitle", "Announcements", announcementsCard)) + "</h3>" +
                    "  <p class=\"announcement-body\">" + NjcEvents.escapeHtml(bodyText || "") + "</p>" +
                    metaLine +
                    linkLine +
                    controls +
                    "</li>";

                var activeAnnouncementId = String(item.id || "");
                var activeIndex = announcementCarouselIndex;
                if (isTamil) {
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
                                titleNode.innerHTML = urgentBadge + NjcEvents.escapeHtml(translatedTitle);
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
                    announcementCarouselItems = [];
                    stopAnnouncementsCarousel();
                    announcementsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadAnnouncementsErrorTitle", "Could not load announcements", announcementsCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadAnnouncementsErrorBody", "Please try again shortly.", announcementsCard)) + "</p>" +
                        "</li>";
                    return;
                }

                var todayKey = getTodayKey();
                var visibleItems = allAnnouncements
                    .filter(function (item) {
                        return !item.expires || item.expires >= todayKey;
                    })
                    .sort(function (a, b) {
                        if (a.urgent !== b.urgent) {
                            return a.urgent ? -1 : 1;
                        }
                        return (b.date || "").localeCompare(a.date || "");
                    })
                    .slice(0, 5);

                if (visibleItems.length === 0) {
                    announcementCarouselItems = [];
                    stopAnnouncementsCarousel();
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
                                return item.title || item.body;
                            });
                        })
                        .catch(function () {
                            return [];
                        });
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
                                var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
                                return entries.map(normalizeAdminNotice).filter(function (item) {
                                    return item.title || item.body;
                                });
                            });
                        })
                        .catch(function () {
                            return [];
                        });
                }

                Promise.all([fetchStaticAnnouncements(), fetchAdminNotices()])
                    .then(function (result) {
                        var merged = (result[0] || []).concat(result[1] || []);
                        var seen = {};
                        allAnnouncements = merged.filter(function (item) {
                            var key = String(item.id || (item.title + "|" + item.date + "|" + item.body)).trim();
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
                    "  <p class=\"reading-compact-ref\">" + NjcEvents.escapeHtml(cleanRefs.join(", ")) + "</p>" +
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
                            "  <span><strong>" + NjcEvents.escapeHtml(morningLabel) + ":</strong> " + NjcEvents.escapeHtml(item.morningRefs.map(function (ref) { return toFriendlyReference(ref, readingCard); }).join(", ")) + "</span>" +
                            "</label>"
                        );
                    }
                    if (item.eveningMissing) {
                        lines.push(
                            "<label class=\"reading-unread-line\">" +
                            "  <input type=\"checkbox\" data-reading-date=\"" + NjcEvents.escapeHtml(item.dateKey) + "\" data-reading-part=\"evening\">" +
                            "  <span><strong>" + NjcEvents.escapeHtml(eveningLabel) + ":</strong> " + NjcEvents.escapeHtml(item.eveningRefs.map(function (ref) { return toFriendlyReference(ref, readingCard); }).join(", ")) + "</span>" +
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

                fetch(readingPlanUrl)
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
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadEventsErrorTitle", "Could not load this week events", thisWeekCard)) + "</h3>" +
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
                        "  <p>" + NjcEvents.escapeHtml(T("home.noEventsBody", "Please check the Events page for updates.", thisWeekCard)) + "</p>" +
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

            document.addEventListener("njc:cardlangchange", function () {
                updateReadingPlanMeta();
                renderReadingPlan();
                renderAnnouncements();
                loadTrivia();
                renderThisWeekEvents();
            });

            document.addEventListener("njc:userdata-updated", function () {
                renderReadingPlan();
            });
            document.addEventListener("njc:admin-notices-updated", function () {
                loadAnnouncements();
            });
            document.addEventListener("njc:admin-trivia-updated", function () {
                loadTrivia();
            });

            window.addEventListener("hashchange", function () {
                if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "home") {
                    loadTrivia();
                }
            });

            function loadTrivia() {
                if (!triviaLoading || !triviaQuestionWrap || !triviaQuestionText || !triviaOptions || !triviaEmpty) {
                    return;
                }
                var effectiveDate = getLocalEffectiveDate();
                triviaLoading.hidden = false;
                triviaQuestionWrap.hidden = true;
                triviaEmpty.hidden = true;
                triviaLoading.textContent = T("home.triviaLoading", "Loading trivia...", triviaCard);
                fetch(adminTriviaUrl + "?ts=" + String(Date.now()), { cache: "no-store" })
                    .then(function (response) {
                        if (response.status === 404) {
                            return { entries: [] };
                        }
                        if (!response.ok) {
                            throw new Error("Trivia load failed");
                        }
                        return response.json();
                    })
                    .then(function (payload) {
                        var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
                        var match = entries.find(function (item) {
                            var showDate = String(item && (item.showDate || item.date) || "").trim();
                            return showDate === effectiveDate;
                        });
                        triviaLoading.hidden = true;
                        if (!match) {
                            triviaEmpty.hidden = false;
                            triviaEmpty.textContent = T("home.triviaEmpty", "No trivia for today. Check back tomorrow from 8 AM.", triviaCard);
                            return;
                        }
                        var question = String(match.question || "").trim();
                        var options = Array.isArray(match.options) ? match.options : [];
                        var correctIndex = Number(match.correctIndex) || 0;
                        var reference = String(match.reference || "").trim();
                        triviaQuestionText.textContent = question || T("home.triviaNoQuestion", "No question", triviaCard);
                        if (reference) {
                            triviaReference.textContent = reference;
                            triviaReference.hidden = false;
                        } else {
                            triviaReference.hidden = true;
                        }
                        triviaOptions.innerHTML = options.map(function (opt, index) {
                            var label = String(opt || "").trim() || "-";
                            return "<button type=\"button\" class=\"trivia-option-btn\" data-trivia-index=\"" + String(index) + "\" data-trivia-correct=\"" + (index === correctIndex ? "1" : "0") + "\">" + NjcEvents.escapeHtml(label) + "</button>";
                        }).join("");
                        triviaQuestionWrap.hidden = false;
                        triviaFeedback.hidden = true;
                        triviaOptions.querySelectorAll(".trivia-option-btn").forEach(function (btn) {
                            btn.disabled = false;
                        });
                    })
                    .catch(function () {
                        triviaLoading.hidden = true;
                        triviaEmpty.hidden = false;
                        triviaEmpty.textContent = T("home.triviaError", "Could not load trivia. Try again later.", triviaCard);
                    });
            }

            function setupTriviaOptionClicks() {
                if (!triviaOptions || !triviaFeedback) {
                    return;
                }
                triviaOptions.addEventListener("click", function (event) {
                    var btn = event.target.closest(".trivia-option-btn");
                    if (!btn || btn.disabled) {
                        return;
                    }
                    var isCorrect = btn.getAttribute("data-trivia-correct") === "1";
                    triviaOptions.querySelectorAll(".trivia-option-btn").forEach(function (b) {
                        b.disabled = true;
                    });
                    triviaFeedback.hidden = false;
                    if (isCorrect) {
                        triviaFeedback.textContent = T("home.triviaCorrect", "Correct! Well done.", triviaCard);
                        triviaFeedback.dataset.state = "success";
                    } else {
                        triviaFeedback.textContent = T("home.triviaWrong", "Not quite. Try again tomorrow!", triviaCard);
                        triviaFeedback.dataset.state = "error";
                    }
                });
            }
            setupTriviaOptionClicks();

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
                    renderReadingPlan();
                });
            }

            if (announcementsList) {
                announcementsList.addEventListener("click", function (event) {
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

            if (dailyVerseLanguageToggle) {
                dailyVerseLanguageToggle.addEventListener("click", function () {
                    verseLanguage = verseLanguage === "ta" ? "en" : "ta";
                    saveVerseLanguage(verseLanguage);
                    renderDailyVerse();
                });
            }

            updateReadingPlanMeta();
            renderReadingProgress();
            renderDailyVerse();
            loadTodayReadingPlan();
            loadAnnouncements();
            loadTrivia();
            loadThisWeekEvents();
        })();
