(function () {
            var upcomingEventsList = document.getElementById("upcoming-events-list");
            var upcomingSpecialEventsList = document.getElementById("upcoming-special-events-list");
            var showMoreButton = document.getElementById("show-more-events");
            var upcomingCard = upcomingEventsList ? upcomingEventsList.closest(".card") : null;
            var specialCard = upcomingSpecialEventsList ? upcomingSpecialEventsList.closest(".card") : null;
            var eventsUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
            var adminEventsUrl = "https://mantledb.sh/v2/njc-belgium-admin-events/entries";
            var allEvents = [];
            var showAll = false;
            var twoWeekCutoff = null;
            var specialCarouselEvents = [];
            var specialCarouselIndex = 0;
            var specialCarouselTimerId = null;
            var SPECIAL_CAROUSEL_INTERVAL_MS = 5200;

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
                return "en-GB";
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

            function toEventKey(year, month, day, hour, minute) {
                return (year * 100000000) + (month * 1000000) + (day * 10000) + (hour * 100) + minute;
            }

            function parseTimeTo24(value) {
                var input = String(value || "").trim();
                var match = input.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
                if (!match) {
                    return { hour: 19, minute: 0 };
                }
                var hour = Number(match[1]);
                var minute = Number(match[2]);
                var meridiem = match[3] ? match[3].toUpperCase() : "";
                if (meridiem === "PM" && hour < 12) {
                    hour += 12;
                } else if (meridiem === "AM" && hour === 12) {
                    hour = 0;
                }
                if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
                    return { hour: 19, minute: 0 };
                }
                return { hour: hour, minute: minute };
            }

            function fetchAdminEvents() {
                return fetch(adminEventsUrl + "?ts=" + String(Date.now()), { cache: "no-store" })
                    .then(function (response) {
                        if (response.status === 404) {
                            return [];
                        }
                        if (!response.ok) {
                            throw new Error("Could not load admin events");
                        }
                        return response.json().then(function (payload) {
                            return payload && Array.isArray(payload.entries) ? payload.entries : [];
                        });
                    })
                    .catch(function () {
                        return [];
                    });
            }

            function normalizeAdminEvents(entries, nowBrussels) {
                var nowKey = Number(nowBrussels && nowBrussels.key || 0);
                return (Array.isArray(entries) ? entries : []).map(function (entry) {
                    var source = entry && typeof entry === "object" ? entry : {};
                    var title = String(source.title || "").trim();
                    var dateText = String(source.date || "").trim();
                    var dateMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})$/);
                    if (!title || !dateMatch) {
                        return null;
                    }
                    var year = Number(dateMatch[1]);
                    var month = Number(dateMatch[2]);
                    var day = Number(dateMatch[3]);
                    var parsedTime = parseTimeTo24(source.time);
                    var key = toEventKey(year, month, day, parsedTime.hour, parsedTime.minute);
                    if (key < nowKey) {
                        return null;
                    }
                    return {
                        title: title,
                        description: String(source.description || "").trim(),
                        year: year,
                        month: month,
                        day: day,
                        hour: parsedTime.hour,
                        minute: parsedTime.minute,
                        type: source.type === "Recurring" ? "Recurring" : "Special",
                        key: key
                    };
                }).filter(function (item) {
                    return Boolean(item);
                });
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

            function localizeEventTitle(title, sourceElement) {
                var raw = String(title || "").trim();
                var isTamil = window.NjcI18n && (
                    (sourceElement && typeof window.NjcI18n.getLanguageForElement === "function" && window.NjcI18n.getLanguageForElement(sourceElement) === "ta") ||
                    (!sourceElement && typeof window.NjcI18n.getLanguage === "function" && window.NjcI18n.getLanguage() === "ta")
                );
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

            function translateType(typeValue, sourceElement) {
                if (typeValue === "Recurring") {
                    return T("events.typeRecurring", "Recurring", sourceElement);
                }
                if (typeValue === "Special") {
                    return T("events.typeSpecial", "Special", sourceElement);
                }
                return typeValue || "";
            }

            function formatEventDateLine(eventItem, sourceElement) {
                var date = NjcEvents.escapeHtml(NjcEvents.toDisplayDate(eventItem.year, eventItem.month, eventItem.day, getLocale(sourceElement)));
                var time = NjcEvents.escapeHtml(NjcEvents.toDisplayTime(eventItem.hour, eventItem.minute));
                return date + " " + NjcEvents.escapeHtml(T("common.at", "at", sourceElement)) + " " + time + " (" + NjcEvents.escapeHtml(T("common.belgiumTime", "Belgium time", sourceElement)) + ")";
            }

            function renderUpcoming() {
                var events = showAll ? allEvents : allEvents.filter(function (eventItem) {
                    return eventItem.key <= twoWeekCutoff;
                });

                if (!Array.isArray(events) || events.length === 0) {
                    upcomingEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("events.noUpcomingTitle", "No upcoming church events", upcomingCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.noUpcomingBody", "Please check back for new dates.", upcomingCard)) + "</p>" +
                        "</li>";
                    return;
                }

                upcomingEventsList.innerHTML = events.map(function (eventItem) {
                    var titleText = localizeEventTitle(eventItem.title || T("events.event", "Event", upcomingCard), upcomingCard);
                    var title = NjcEvents.escapeHtml(titleText || T("events.event", "Event", upcomingCard));
                    var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem, upcomingCard));
                    var typeAndDescription = NjcEvents.escapeHtml(
                        translateType(eventItem.type, upcomingCard) + (eventItem.description ? " - " + eventItem.description : "")
                    );
                    return "" +
                        "<li>" +
                        "  <h3>" + title + "</h3>" +
                        "  <p>" + formatEventDateLine(eventItem, upcomingCard) + "</p>" +
                        "  <p class=\"page-note\">" + typeAndDescription + "</p>" +
                        "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar", upcomingCard)) + "</a></p>" +
                        "</li>";
                }).join("");

                showMoreButton.hidden = showAll || allEvents.length <= events.length;
            }

            function stopSpecialCarousel() {
                if (specialCarouselTimerId !== null) {
                    window.clearInterval(specialCarouselTimerId);
                    specialCarouselTimerId = null;
                }
            }

            function nextSpecialIndex(step) {
                if (!specialCarouselEvents.length) {
                    return 0;
                }
                return (specialCarouselIndex + step + specialCarouselEvents.length) % specialCarouselEvents.length;
            }

            function renderSpecialCarouselFrame() {
                if (!upcomingSpecialEventsList || !specialCarouselEvents.length) {
                    return;
                }
                var eventItem = specialCarouselEvents[specialCarouselIndex];
                var titleText = localizeEventTitle(eventItem.title || T("events.specialEvent", "Special Event", specialCard), specialCard);
                var title = NjcEvents.escapeHtml(titleText || T("events.specialEvent", "Special Event", specialCard));
                var description = NjcEvents.escapeHtml(eventItem.description || "");
                var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem, specialCard));
                var dots = specialCarouselEvents.map(function (_item, index) {
                    var activeClass = index === specialCarouselIndex ? " active" : "";
                    return "" +
                        "<button type=\"button\" class=\"announcement-dot" + activeClass + "\" data-special-index=\"" + String(index) + "\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialDot", "Special event", specialCard)) + " " + String(index + 1) + "\"></button>";
                }).join("");

                upcomingSpecialEventsList.innerHTML = "" +
                    "<li class=\"announcement-carousel-item\">" +
                    "  <h3>" + title + "</h3>" +
                    "  <p>" + formatEventDateLine(eventItem, specialCard) + "</p>" +
                    (description ? "  <p class=\"page-note\">" + description + "</p>" : "") +
                    "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar", specialCard)) + "</a></p>" +
                    "  <div class=\"announcement-carousel-controls\">" +
                    "      <button type=\"button\" class=\"announcement-nav-btn\" data-special-action=\"prev\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialPrev", "Previous special event", specialCard)) + "\"><i class=\"fa-solid fa-chevron-left\"></i></button>" +
                    "      <div class=\"announcement-dots\">" + dots + "</div>" +
                    "      <button type=\"button\" class=\"announcement-nav-btn\" data-special-action=\"next\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialNext", "Next special event", specialCard)) + "\"><i class=\"fa-solid fa-chevron-right\"></i></button>" +
                    "  </div>" +
                    "</li>";
            }

            function startSpecialCarousel() {
                stopSpecialCarousel();
                if (specialCarouselEvents.length <= 1) {
                    return;
                }
                specialCarouselTimerId = window.setInterval(function () {
                    specialCarouselIndex = nextSpecialIndex(1);
                    renderSpecialCarouselFrame();
                }, SPECIAL_CAROUSEL_INTERVAL_MS);
            }

            function renderUpcomingSpecial() {
                var specialEvents = allEvents.filter(function (eventItem) {
                    return eventItem.type === "Special";
                });

                if (specialEvents.length === 0) {
                    specialCarouselEvents = [];
                    specialCarouselIndex = 0;
                    stopSpecialCarousel();
                    upcomingSpecialEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("events.noSpecialTitle", "No upcoming special church events", specialCard)) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.noSpecialBody", "We will show them here once dates are announced.", specialCard)) + "</p>" +
                        "</li>";
                    return;
                }

                specialCarouselEvents = specialEvents.slice();
                if (specialCarouselIndex >= specialCarouselEvents.length) {
                    specialCarouselIndex = 0;
                }
                renderSpecialCarouselFrame();
                startSpecialCarousel();
            }

            showMoreButton.addEventListener("click", function () {
                showAll = true;
                renderUpcoming();
            });

            if (upcomingSpecialEventsList) {
                upcomingSpecialEventsList.addEventListener("click", function (event) {
                    var actionButton = event.target.closest("button[data-special-action]");
                    if (actionButton) {
                        var action = actionButton.getAttribute("data-special-action");
                        if (action === "prev") {
                            specialCarouselIndex = nextSpecialIndex(-1);
                        } else if (action === "next") {
                            specialCarouselIndex = nextSpecialIndex(1);
                        }
                        renderSpecialCarouselFrame();
                        startSpecialCarousel();
                        return;
                    }
                    var dotButton = event.target.closest("button[data-special-index]");
                    if (!dotButton) {
                        return;
                    }
                    var nextIndex = Number(dotButton.getAttribute("data-special-index"));
                    if (!Number.isInteger(nextIndex) || nextIndex < 0 || nextIndex >= specialCarouselEvents.length) {
                        return;
                    }
                    specialCarouselIndex = nextIndex;
                    renderSpecialCarouselFrame();
                    startSpecialCarousel();
                });

                upcomingSpecialEventsList.addEventListener("mouseenter", function () {
                    stopSpecialCarousel();
                });
                upcomingSpecialEventsList.addEventListener("mouseleave", function () {
                    startSpecialCarousel();
                });
            }

            document.addEventListener("njc:langchange", function () {
                if (twoWeekCutoff === null && allEvents.length === 0) {
                    return;
                }
                renderUpcoming();
                renderUpcomingSpecial();
            });

            document.addEventListener("njc:cardlangchange", function () {
                if (twoWeekCutoff === null && allEvents.length === 0) {
                    return;
                }
                renderUpcoming();
                renderUpcomingSpecial();
            });

            function loadEventsData() {
                NjcEvents.mergeUpcomingEvents({ eventsUrl: eventsUrl, horizonDays: 210 })
                    .then(function (result) {
                        return fetchAdminEvents().then(function (adminEntries) {
                            var merged = (result.events || []).concat(normalizeAdminEvents(adminEntries, result.nowBrussels));
                            var seen = {};
                            allEvents = merged.filter(function (item) {
                                var key = String(item.key) + "|" + String(item.title || "").trim();
                                if (!key || seen[key]) {
                                    return false;
                                }
                                seen[key] = true;
                                return true;
                            }).sort(function (a, b) {
                                return a.key - b.key;
                            });
                            twoWeekCutoff = NjcEvents.getWindowCutoffKey(result.nowBrussels, 14);
                            renderUpcoming();
                            renderUpcomingSpecial();
                        });
                    })
                    .catch(function () {
                        stopSpecialCarousel();
                        upcomingEventsList.innerHTML = "" +
                            "<li>" +
                            "  <h3>" + NjcEvents.escapeHtml(T("events.loadUpcomingErrorTitle", "Could not calculate upcoming church events", upcomingCard)) + "</h3>" +
                            "  <p>" + NjcEvents.escapeHtml(T("events.loadUpcomingErrorBody", "Please refresh and try again.", upcomingCard)) + "</p>" +
                            "</li>";
                        upcomingSpecialEventsList.innerHTML = "" +
                            "<li>" +
                            "  <h3>" + NjcEvents.escapeHtml(T("events.loadSpecialErrorTitle", "Could not load special church events", specialCard)) + "</h3>" +
                            "  <p>" + NjcEvents.escapeHtml(T("events.loadSpecialErrorBody", "Please refresh and try again.", specialCard)) + "</p>" +
                            "</li>";
                    });
            }

            document.addEventListener("njc:admin-events-updated", function () {
                loadEventsData();
            });

            loadEventsData();
        })();
