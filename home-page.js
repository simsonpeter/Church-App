(function () {
            var READING_PROGRESS_KEY = "njc_reading_progress_v1";
            var todayReadingPlanList = document.getElementById("today-reading-plan-list");
            var todayReadingPlanMeta = document.getElementById("today-reading-plan-meta");
            var readingMorningDone = document.getElementById("reading-morning-done");
            var readingEveningDone = document.getElementById("reading-evening-done");
            var readingStreakNote = document.getElementById("reading-streak-note");
            var readingPlanUrl = "https://raw.githubusercontent.com/simsonpeter/Readingplan/main/plan/njcplan.json";
            var thisWeekEventsList = document.getElementById("this-week-events-list");
            var eventsUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
            var brusselsTimeZone = "Europe/Brussels";
            var todayYmd = getBrusselsYmd();
            var todayPlanData = null;
            var readingPlanError = false;
            var allUpcomingEvents = [];
            var eventsMeta = null;
            var eventsError = false;
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

            function T(key, fallback) {
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

            function isTamilLanguage() {
                return window.NjcI18n && typeof window.NjcI18n.getLanguage === "function" && window.NjcI18n.getLanguage() === "ta";
            }

            function localizeEventTitle(title) {
                var raw = String(title || "").trim();
                var isTamil = window.NjcI18n && typeof window.NjcI18n.getLanguage === "function" && window.NjcI18n.getLanguage() === "ta";
                if (!isTamil) {
                    return raw;
                }
                if (raw === "Holy Service with Communion") {
                    return T("events.holyServiceTitle", "பரிசுத்த ஆராதனையும் திருவிருந்தும்");
                }
                if (raw === "Special Prayer") {
                    return T("events.specialPrayerTitle", "விசேட ஜெபக்கூடுகை");
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

            function toGoogleCalendarUrl(eventItem) {
                var end = addMinutesToParts(eventItem.year, eventItem.month, eventItem.day, eventItem.hour, eventItem.minute, 90);
                var dates = toCalendarDateTime(eventItem.year, eventItem.month, eventItem.day, eventItem.hour, eventItem.minute) +
                    "/" +
                    toCalendarDateTime(end.year, end.month, end.day, end.hour, end.minute);
                var params = new URLSearchParams({
                    action: "TEMPLATE",
                    text: eventItem.title || T("events.event", "Event"),
                    dates: dates,
                    ctz: "Europe/Brussels",
                    details: (eventItem.description || "") + " - NJC Belgium",
                    location: "New Jerusalem Church Belgium, Ten Eekhovelei 292, 2100 Antwerpen"
                });
                return "https://calendar.google.com/calendar/render?" + params.toString();
            }

            function updateReadingPlanMeta() {
                var dateUtc = new Date(Date.UTC(todayYmd.year, todayYmd.month - 1, todayYmd.day, 12, 0, 0));
                var dateLabel = new Intl.DateTimeFormat(getLocale(), {
                    timeZone: "UTC",
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                }).format(dateUtc);
                todayReadingPlanMeta.textContent = T("home.readingDatePrefix", "Today:") + " " + dateLabel;
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
                } catch (err) {
                    return null;
                }
                return null;
            }

            function getTodayProgress() {
                var map = getProgressMap();
                var todayKey = getTodayKey();
                var entry = map[todayKey] || {};
                return {
                    morning: Boolean(entry.morning),
                    evening: Boolean(entry.evening)
                };
            }

            function setTodayProgress(part, value) {
                var map = getProgressMap();
                var todayKey = getTodayKey();
                var entry = map[todayKey] || {};
                entry[part] = Boolean(value);
                map[todayKey] = entry;
                saveProgressMap(map);
            }

            function calculateReadingStreak() {
                var map = getProgressMap();
                var streak = 0;
                var startUtc = Date.UTC(todayYmd.year, todayYmd.month - 1, todayYmd.day);

                for (var dayOffset = 0; dayOffset < 400; dayOffset += 1) {
                    var dateObj = new Date(startUtc - (dayOffset * 86400000));
                    var key = String(dateObj.getUTCFullYear()) + "-" +
                        String(dateObj.getUTCMonth() + 1).padStart(2, "0") + "-" +
                        String(dateObj.getUTCDate()).padStart(2, "0");
                    var entry = map[key];
                    if (!entry || !entry.morning || !entry.evening) {
                        break;
                    }
                    streak += 1;
                }

                return streak;
            }

            function renderReadingProgress() {
                var progress = getTodayProgress();
                readingMorningDone.checked = progress.morning;
                readingEveningDone.checked = progress.evening;
                var streak = calculateReadingStreak();
                readingStreakNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
                    ? window.NjcI18n.formatCount(T("home.readingStreak", "Streak days: {count}"), streak)
                    : ("Streak days: " + streak);
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

            function getDayOfYear(ymd) {
                var yearStart = Date.UTC(ymd.year, 0, 1);
                var current = Date.UTC(ymd.year, ymd.month - 1, ymd.day);
                return Math.floor((current - yearStart) / 86400000) + 1;
            }

            function toFriendlyReference(ref) {
                var value = String(ref || "").trim();
                var match = value.match(/^(\d+\s+)?([A-Za-z]+)\.(.+)$/);
                if (!match) {
                    if (isTamilLanguage()) {
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
                var selectedMap = isTamilLanguage() ? bookMapTamil : bookMapEnglish;
                var fullBook = selectedMap[shortBook] || bookMapEnglish[shortBook] || shortBook;
                return fullBook + " " + tail;
            }

            function planLine(titleKey, titleFallback, refs) {
                var cleanRefs = Array.isArray(refs) ? refs.filter(Boolean).map(toFriendlyReference) : [];
                if (cleanRefs.length === 0) {
                    return "";
                }
                return "" +
                    "<li>" +
                    "  <h3>" + NjcEvents.escapeHtml(T(titleKey, titleFallback)) + "</h3>" +
                    "  <p>" + NjcEvents.escapeHtml(cleanRefs.join(", ")) + "</p>" +
                    "</li>";
            }

            function renderReadingPlan() {
                if (readingPlanError) {
                    todayReadingPlanList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadReadingErrorTitle", "Could not load today's reading plan")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadReadingErrorBody", "Please try again shortly.")) + "</p>" +
                        "</li>";
                    return;
                }

                if (!todayPlanData) {
                    return;
                }

                var html = "";
                html += planLine("home.morningReading", "Morning Reading", todayPlanData.morning);
                html += planLine("home.eveningReading", "Evening Reading", todayPlanData.evening);

                if (!html) {
                    html = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.noReadingTitle", "No reading entries today")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.noReadingBody", "Please check your Readingplan app.")) + "</p>" +
                        "</li>";
                }

                todayReadingPlanList.innerHTML = html;
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
                        var todayPlan = readingPlan[dayOfYear - 1];
                        if (!todayPlan) {
                            throw new Error("No plan for today");
                        }
                        todayPlanData = todayPlan;
                        renderReadingPlan();
                    })
                    .catch(function () {
                        readingPlanError = true;
                        renderReadingPlan();
                    });
            }

            function renderThisWeekEvents() {
                if (eventsError) {
                    thisWeekEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("home.loadEventsErrorTitle", "Could not load this week events")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.loadEventsErrorBody", "Please open the Events tab to refresh.")) + "</p>" +
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
                        "  <h3>" + NjcEvents.escapeHtml(T("home.noEventsTitle", "No events available right now")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("home.noEventsBody", "Please check the Events page for updates.")) + "</p>" +
                        "</li>";
                    return;
                }

                thisWeekEventsList.innerHTML = eventsToShow.map(function (eventItem) {
                    var titleText = localizeEventTitle(eventItem.title || T("events.event", "Event"));
                    var title = NjcEvents.escapeHtml(titleText || T("events.event", "Event"));
                    var date = NjcEvents.escapeHtml(NjcEvents.toDisplayDate(eventItem.year, eventItem.month, eventItem.day, getLocale()));
                    var time = NjcEvents.escapeHtml(NjcEvents.toDisplayTime(eventItem.hour, eventItem.minute));
                    var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem));
                    return "" +
                        "<li>" +
                        "  <h3>" + title + "</h3>" +
                        "  <p>" + date + " " + NjcEvents.escapeHtml(T("common.at", "at")) + " " + time + " (" + NjcEvents.escapeHtml(T("common.belgiumTime", "Belgium time")) + ")</p>" +
                        "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar")) + "</a></p>" +
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
                renderReadingProgress();
                renderThisWeekEvents();
            });

            readingMorningDone.addEventListener("change", function () {
                setTodayProgress("morning", readingMorningDone.checked);
                renderReadingProgress();
            });

            readingEveningDone.addEventListener("change", function () {
                setTodayProgress("evening", readingEveningDone.checked);
                renderReadingProgress();
            });

            updateReadingPlanMeta();
            renderReadingProgress();
            loadTodayReadingPlan();
            loadThisWeekEvents();
        })();
