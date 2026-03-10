(function () {
    var brusselsTimeZone = "Europe/Brussels";

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function numberFromPart(parts, type) {
        var found = parts.find(function (part) {
            return part.type === type;
        });
        return found ? Number(found.value) : 0;
    }

    function eventKey(year, month, day, hour, minute) {
        return (year * 100000000) + (month * 1000000) + (day * 10000) + (hour * 100) + minute;
    }

    function getNowInBrussels() {
        var now = new Date();
        var formatter = new Intl.DateTimeFormat("en-GB", {
            timeZone: brusselsTimeZone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23"
        });
        var parts = formatter.formatToParts(now);
        var year = numberFromPart(parts, "year");
        var month = numberFromPart(parts, "month");
        var day = numberFromPart(parts, "day");
        var hour = numberFromPart(parts, "hour");
        var minute = numberFromPart(parts, "minute");

        return {
            year: year,
            month: month,
            day: day,
            hour: hour,
            minute: minute,
            key: eventKey(year, month, day, hour, minute)
        };
    }

    function toDisplayDate(year, month, day, locale) {
        var dateUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
        return dateUtc.toLocaleDateString(locale || "en-BE", {
            timeZone: "UTC",
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function pad2(value) {
        return value < 10 ? "0" + value : String(value);
    }

    function toDisplayTime(hour, minute) {
        return pad2(hour) + ":" + pad2(minute);
    }

    function parseTimeTo24(timeValue) {
        if (!timeValue) {
            return { hour: 23, minute: 59 };
        }

        var input = String(timeValue).trim();
        var match = input.match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
        if (!match) {
            return { hour: 23, minute: 59 };
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
            return { hour: 23, minute: 59 };
        }
        return { hour: hour, minute: minute };
    }

    function isSecondOrFourthSaturday(dayOfMonth) {
        return (dayOfMonth >= 8 && dayOfMonth <= 14) || (dayOfMonth >= 22 && dayOfMonth <= 28);
    }

    function buildRecurringEvents(nowBrussels, horizonDays) {
        var recurring = [];
        var baseUtcDate = Date.UTC(nowBrussels.year, nowBrussels.month - 1, nowBrussels.day);
        var days = typeof horizonDays === "number" ? horizonDays : 210;

        function maybePushRecurring(title, description, year, month, day, hour, minute) {
            var key = eventKey(year, month, day, hour, minute);
            if (key >= nowBrussels.key) {
                recurring.push({
                    title: title,
                    description: description,
                    year: year,
                    month: month,
                    day: day,
                    hour: hour,
                    minute: minute,
                    type: "Recurring",
                    key: key
                });
            }
        }

        for (var dayOffset = 0; dayOffset <= days; dayOffset += 1) {
            var currentDate = new Date(baseUtcDate + (dayOffset * 24 * 60 * 60 * 1000));
            var year = currentDate.getUTCFullYear();
            var month = currentDate.getUTCMonth() + 1;
            var day = currentDate.getUTCDate();
            var dayOfWeek = currentDate.getUTCDay();

            if (dayOfWeek === 0) {
                maybePushRecurring(
                    "Holy Service with Communion",
                    "Weekly service",
                    year,
                    month,
                    day,
                    14,
                    30
                );
            }

            if (dayOfWeek === 6 && isSecondOrFourthSaturday(day)) {
                maybePushRecurring(
                    "Special Prayer",
                    "2nd and 4th Saturday",
                    year,
                    month,
                    day,
                    17,
                    0
                );
            }
        }

        return recurring;
    }

    function parseSpecialEvents(rawEvents, nowBrussels) {
        if (!Array.isArray(rawEvents)) {
            return [];
        }

        return rawEvents
            .map(function (eventItem) {
                if (!eventItem || !eventItem.date) {
                    return null;
                }

                var dateMatch = String(eventItem.date).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
                if (!dateMatch) {
                    return null;
                }

                var year = Number(dateMatch[1]);
                var month = Number(dateMatch[2]);
                var day = Number(dateMatch[3]);
                var parsedTime = parseTimeTo24(eventItem.time);
                var key = eventKey(year, month, day, parsedTime.hour, parsedTime.minute);

                if (key < nowBrussels.key) {
                    return null;
                }

                return {
                    title: eventItem.title || "Special Event",
                    description: eventItem.description || "",
                    year: year,
                    month: month,
                    day: day,
                    hour: parsedTime.hour,
                    minute: parsedTime.minute,
                    type: "Special",
                    key: key
                };
            })
            .filter(function (item) {
                return Boolean(item);
            });
    }

    function getWindowCutoffKey(nowBrussels, daysAhead) {
        var baseUtcDate = Date.UTC(nowBrussels.year, nowBrussels.month - 1, nowBrussels.day);
        var windowDate = new Date(baseUtcDate + (daysAhead * 24 * 60 * 60 * 1000));
        return eventKey(
            windowDate.getUTCFullYear(),
            windowDate.getUTCMonth() + 1,
            windowDate.getUTCDate(),
            23,
            59
        );
    }

    function mergeUpcomingEvents(options) {
        var config = options || {};
        var nowBrussels = getNowInBrussels();
        var eventsUrl = config.eventsUrl || "";
        var recurringEvents = buildRecurringEvents(nowBrussels, config.horizonDays || 210);

        return fetch(eventsUrl)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load events");
                }
                return response.json();
            })
            .then(function (specialEventsRaw) {
                var specialEvents = parseSpecialEvents(specialEventsRaw, nowBrussels);
                return recurringEvents.concat(specialEvents);
            })
            .catch(function () {
                return recurringEvents;
            })
            .then(function (events) {
                return {
                    nowBrussels: nowBrussels,
                    events: events.sort(function (a, b) {
                        return a.key - b.key;
                    })
                };
            });
    }

    window.NjcEvents = {
        escapeHtml: escapeHtml,
        toDisplayDate: toDisplayDate,
        toDisplayTime: toDisplayTime,
        getWindowCutoffKey: getWindowCutoffKey,
        mergeUpcomingEvents: mergeUpcomingEvents
    };
})();
