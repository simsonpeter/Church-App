(function () {
            var upcomingEventsList = document.getElementById("upcoming-events-list");
            var upcomingSpecialEventsList = document.getElementById("upcoming-special-events-list");
            var showMoreButton = document.getElementById("show-more-events");
            var eventsUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
            var allEvents = [];
            var showAll = false;
            var twoWeekCutoff = null;
            var specialCarouselEvents = [];
            var specialCarouselIndex = 0;
            var specialCarouselTimerId = null;
            var SPECIAL_CAROUSEL_INTERVAL_MS = 5200;

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

            function translateType(typeValue) {
                if (typeValue === "Recurring") {
                    return T("events.typeRecurring", "Recurring");
                }
                if (typeValue === "Special") {
                    return T("events.typeSpecial", "Special");
                }
                return typeValue || "";
            }

            function formatEventDateLine(eventItem) {
                var date = NjcEvents.escapeHtml(NjcEvents.toDisplayDate(eventItem.year, eventItem.month, eventItem.day, getLocale()));
                var time = NjcEvents.escapeHtml(NjcEvents.toDisplayTime(eventItem.hour, eventItem.minute));
                return date + " " + NjcEvents.escapeHtml(T("common.at", "at")) + " " + time + " (" + NjcEvents.escapeHtml(T("common.belgiumTime", "Belgium time")) + ")";
            }

            function renderUpcoming() {
                var events = showAll ? allEvents : allEvents.filter(function (eventItem) {
                    return eventItem.key <= twoWeekCutoff;
                });

                if (!Array.isArray(events) || events.length === 0) {
                    upcomingEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("events.noUpcomingTitle", "No upcoming events found")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.noUpcomingBody", "Please check back for new dates.")) + "</p>" +
                        "</li>";
                    return;
                }

                upcomingEventsList.innerHTML = events.map(function (eventItem) {
                    var titleText = localizeEventTitle(eventItem.title || T("events.event", "Event"));
                    var title = NjcEvents.escapeHtml(titleText || T("events.event", "Event"));
                    var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem));
                    var typeAndDescription = NjcEvents.escapeHtml(
                        translateType(eventItem.type) + (eventItem.description ? " - " + eventItem.description : "")
                    );
                    return "" +
                        "<li>" +
                        "  <h3>" + title + "</h3>" +
                        "  <p>" + formatEventDateLine(eventItem) + "</p>" +
                        "  <p class=\"page-note\">" + typeAndDescription + "</p>" +
                        "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar")) + "</a></p>" +
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
                var titleText = localizeEventTitle(eventItem.title || T("events.specialEvent", "Special Event"));
                var title = NjcEvents.escapeHtml(titleText || T("events.specialEvent", "Special Event"));
                var description = NjcEvents.escapeHtml(eventItem.description || "");
                var calendarUrl = NjcEvents.escapeHtml(toGoogleCalendarUrl(eventItem));
                var dots = specialCarouselEvents.map(function (_item, index) {
                    var activeClass = index === specialCarouselIndex ? " active" : "";
                    return "" +
                        "<button type=\"button\" class=\"announcement-dot" + activeClass + "\" data-special-index=\"" + String(index) + "\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialDot", "Special event")) + " " + String(index + 1) + "\"></button>";
                }).join("");

                upcomingSpecialEventsList.innerHTML = "" +
                    "<li class=\"announcement-carousel-item\">" +
                    "  <h3>" + title + "</h3>" +
                    "  <p>" + formatEventDateLine(eventItem) + "</p>" +
                    (description ? "  <p class=\"page-note\">" + description + "</p>" : "") +
                    "  <p><a class=\"inline-link\" href=\"" + calendarUrl + "\" target=\"_blank\" rel=\"noopener noreferrer\">" + NjcEvents.escapeHtml(T("events.addToCalendar", "Add to calendar")) + "</a></p>" +
                    "  <div class=\"announcement-carousel-controls\">" +
                    "      <button type=\"button\" class=\"announcement-nav-btn\" data-special-action=\"prev\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialPrev", "Previous special event")) + "\"><i class=\"fa-solid fa-chevron-left\"></i></button>" +
                    "      <div class=\"announcement-dots\">" + dots + "</div>" +
                    "      <button type=\"button\" class=\"announcement-nav-btn\" data-special-action=\"next\" aria-label=\"" + NjcEvents.escapeHtml(T("events.specialNext", "Next special event")) + "\"><i class=\"fa-solid fa-chevron-right\"></i></button>" +
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
                        "  <h3>" + NjcEvents.escapeHtml(T("events.noSpecialTitle", "No upcoming special events")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.noSpecialBody", "We will show them here once dates are announced.")) + "</p>" +
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

            NjcEvents.mergeUpcomingEvents({ eventsUrl: eventsUrl, horizonDays: 210 })
                .then(function (result) {
                    allEvents = result.events || [];
                    twoWeekCutoff = NjcEvents.getWindowCutoffKey(result.nowBrussels, 14);
                    renderUpcoming();
                    renderUpcomingSpecial();
                })
                .catch(function () {
                    stopSpecialCarousel();
                    upcomingEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("events.loadUpcomingErrorTitle", "Could not calculate upcoming events")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.loadUpcomingErrorBody", "Please refresh and try again.")) + "</p>" +
                        "</li>";
                    upcomingSpecialEventsList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + NjcEvents.escapeHtml(T("events.loadSpecialErrorTitle", "Could not load special events")) + "</h3>" +
                        "  <p>" + NjcEvents.escapeHtml(T("events.loadSpecialErrorBody", "Please refresh and try again.")) + "</p>" +
                        "</li>";
                });
        })();
