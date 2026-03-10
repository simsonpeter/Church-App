(function () {
    var prefetched = new Set();
    var STATE_KEY = "njc_sermon_player_v1";
    var SPLASH_KEY = "njc_splash_seen_v1";
    var THEME_KEY = "njc_theme_v1";
    var LANGUAGE_KEY = "njc_language_v1";
    var NOTIFICATION_SETTINGS_KEY = "njc_notification_settings_v1";
    var NOTIFICATION_SENT_KEY = "njc_notification_sent_v1";
    var NOTIFICATION_LAST_SERMON_KEY = "njc_notification_last_sermon_v1";
    var EVENTS_FEED_URL = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/events.json";
    var SERMONS_FEED_URL = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/sermons.json";
    var activeLanguage = "en";
    var notificationIntervalId = null;
    var tamilTranslations = {
        "brand.name": "புதிய எருசலேம் சபை",
        "nav.home": "முகப்பு",
        "nav.about": "பற்றி",
        "nav.events": "நிகழ்வு",
        "nav.sermons": "பிரசங்கம்",
        "nav.contact": "தொடர்பு",
        "toggle.language.toTamil": "தமிழுக்கு மாற்று",
        "toggle.language.toEnglish": "Switch to English",
        "toggle.theme.toLight": "ஒளி நிலைக்கு மாற்று",
        "toggle.theme.toDark": "இருள் நிலைக்கு மாற்று",
        "splash.main": "புதிய எருசலேம் சபை",
        "splash.sub": "பெல்ஜியம்",
        "home.welcomeBack": "வரவேற்கிறோம்",
        "home.tagline": "உங்கள் வாராந்திர விசுவாசப் பயணம் ஒரே இடத்தில்.",
        "home.bibleReadingTitle": "இன்றைய வேத வாசிப்பு",
        "home.readingDatePrefix": "இன்று:",
        "home.morningReading": "காலை வாசிப்பு",
        "home.eveningReading": "மாலை வாசிப்பு",
        "home.loadingReadingTitle": "இன்றைய வாசிப்பு திட்டம் ஏற்றப்படுகிறது...",
        "home.loadingReadingBody": "இன்றைய அட்டவணையை ஏற்றும் வரை காத்திருக்கவும்.",
        "home.noReadingTitle": "இன்று வாசிப்பு பதிவு இல்லை",
        "home.noReadingBody": "உங்கள் Readingplan செயலியை பார்க்கவும்.",
        "home.loadReadingErrorTitle": "இன்றைய வாசிப்பு திட்டத்தை ஏற்ற முடியவில்லை",
        "home.loadReadingErrorBody": "சற்று நேரத்தில் மீண்டும் முயற்சிக்கவும்.",
        "home.thisWeekTitle": "இந்த வாரம்",
        "home.loadingWeekTitle": "இந்த வார நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "home.loadingWeekBody": "அடுத்த தேதிகளை கணக்கிட காத்திருக்கவும்.",
        "home.noEventsTitle": "இப்போது நிகழ்வுகள் இல்லை",
        "home.noEventsBody": "புதுப்பிப்புகளுக்கு நிகழ்வுகள் பக்கத்தை பார்க்கவும்.",
        "home.loadEventsErrorTitle": "இந்த வார நிகழ்வுகளை ஏற்ற முடியவில்லை",
        "home.loadEventsErrorBody": "புதுப்பிக்க நிகழ்வுகள் தாவலைத் திறக்கவும்.",
        "actions.events": "நிகழ்வு",
        "actions.sermons": "பிரசங்கம்",
        "actions.contact": "தொடர்பு",
        "actions.calendar": "காலண்டர்",
        "actions.messages": "செய்திகள்",
        "actions.joinUs": "எங்களுடன் சேருங்கள்",
        "actions.dashboard": "முகப்பு",
        "actions.rsvp": "பங்கேற்பு பதிவு",
        "actions.live": "நேரலை",
        "actions.audio": "ஒலிக்கோவை",
        "actions.notes": "குறிப்புகள்",
        "actions.email": "மின்னஞ்சல்",
        "actions.call": "அழைப்பு",
        "actions.visit": "வருகை",
        "about.eyebrow": "பற்றி",
        "about.title": "நாங்கள் யார்",
        "about.subtitle": "கிறிஸ்துவில் ஒன்றாக வளரும் விசுவாசக் குடும்பம்.",
        "about.missionTitle": "எங்கள் பணிக்கூற்று",
        "about.missionBody": "நம்பிக்கையை பகிர, சீடர்களை உருவாக்க, பெல்ஜியத்தில் குடும்பங்களை அன்புடன் சேவிக்க நாங்கள் இருக்கிறோம்.",
        "about.valuesTitle": "முக்கிய மதிப்புகள்",
        "about.valueWorship": "ஆராதனை",
        "about.valueWorshipBody": "மனமார்ந்த ஸ்தோத்திரமும் ஜெபத்தாலும் தேவனை கௌரவிக்கிறோம்.",
        "about.valueCommunity": "சமூகம்",
        "about.valueCommunityBody": "எந்த காலத்திலும் ஒருவருக்கொருவர் துணையாக இருக்கிறோம்.",
        "about.valueService": "சேவை",
        "about.valueServiceBody": "சபை உள்ளும் வெளியும் இரக்கத்துடன் சேவை செய்கிறோம்.",
        "about.leadershipTitle": "தலைமை",
        "about.leadershipBody": "எங்கள் மேய்ப்பர்களும் குழுத் தலைவர்களும் வாரம் முழுவதும் ஜெபம், பராமரிப்பு, வழிகாட்டலுக்கு தயாராக உள்ளனர்.",
        "events.eyebrow": "நிகழ்வுகள்",
        "events.title": "நிகழ்வு நாட்காட்டி",
        "events.subtitle": "ஆராதனை, ஜெப இரவுகள், சகோதரத்துவ தருணங்களுடன் இணைந்திருங்கள்.",
        "events.upcomingTitle": "வரவிருக்கும் நிகழ்வுகள்",
        "events.loadingUpcomingTitle": "வரவிருக்கும் நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "events.loadingUpcomingBody": "அடுத்த தேதிகளை கணக்கிட காத்திருக்கவும்.",
        "events.seeMore": "மேலும் நிகழ்வுகள் காண்க",
        "events.scheduleRules": "அட்டவணை விதிகள்",
        "events.holyServiceTitle": "பரிசுத்த ஆராதனையும் திருவிருந்தும்",
        "events.holyServiceTime": "ஒவ்வொரு ஞாயிறும் 14:30 (பெல்ஜியம் நேரம்)",
        "events.specialPrayerTitle": "விசேட ஜெபக்கூடுகை",
        "events.specialPrayerTime": "2வது மற்றும் 4வது சனிக்கிழமை 17:00 (பெல்ஜியம் நேரம்)",
        "events.upcomingSpecialTitle": "வரவிருக்கும் சிறப்பு நிகழ்வுகள்",
        "events.loadingSpecialTitle": "சிறப்பு நிகழ்வுகள் ஏற்றப்படுகின்றன...",
        "events.loadingSpecialBody": "வரவிருக்கும் சிறப்பு நிகழ்வுகளை ஏற்ற காத்திருக்கவும்.",
        "events.noUpcomingTitle": "வரவிருக்கும் நிகழ்வுகள் இல்லை",
        "events.noUpcomingBody": "புதிய தேதிகளுக்காக பின்னர் பார்க்கவும்.",
        "events.noSpecialTitle": "வரவிருக்கும் சிறப்பு நிகழ்வுகள் இல்லை",
        "events.noSpecialBody": "தேதிகள் அறிவிக்கப்பட்டவுடன் இங்கே காட்டப்படும்.",
        "events.loadUpcomingErrorTitle": "வரவிருக்கும் நிகழ்வுகளை கணக்கிட முடியவில்லை",
        "events.loadUpcomingErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "events.loadSpecialErrorTitle": "சிறப்பு நிகழ்வுகளை ஏற்ற முடியவில்லை",
        "events.loadSpecialErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "events.event": "நிகழ்வு",
        "events.specialEvent": "சிறப்பு நிகழ்வு",
        "events.typeRecurring": "மறுமொழி",
        "events.typeSpecial": "சிறப்பு",
        "sermons.eyebrow": "பிரசங்கம்",
        "sermons.title": "சமீபத்திய செய்திகள்",
        "sermons.subtitle": "மீண்டும் கேளுங்கள், குறிப்பெடுங்கள், வாரம் முழுவதும் வளருங்கள்.",
        "sermons.latestTitle": "சமீபத்திய பிரசங்கங்கள்",
        "sermons.loadingTitle": "பிரசங்கங்கள் ஏற்றப்படுகின்றன...",
        "sermons.loadingBody": "சமீபத்திய செய்திகளை ஏற்ற காத்திருக்கவும்.",
        "sermons.seeMore": "மேலும் பிரசங்கங்கள் காண்க",
        "sermons.archiveTitle": "காப்பகம்",
        "sermons.archiveLoading": "காப்பக சுருக்கம் ஏற்றப்படுகிறது...",
        "sermons.tip": "குறிப்பு: சமீபத்திய பட்டியலில் இருந்து செயலிக்குள் நேரடியாக ஆடியோ திறக்கலாம்.",
        "sermons.nowPlaying": "இப்போது ஒலிக்கிறது",
        "sermons.noSermonsTitle": "இன்னும் பிரசங்கங்கள் இல்லை",
        "sermons.noSermonsBody": "தயவுசெய்து பின்னர் மீண்டும் பார்க்கவும்.",
        "sermons.archiveEmpty": "பிரசங்க காப்பகம் இன்னும் இல்லை.",
        "sermons.archiveTotal": "மொத்தம் கிடைக்கும் பிரசங்கங்கள்: {count}.",
        "sermons.speakerPrefix": "பேச்சாளர்",
        "sermons.tapToPlayInApp": "செயலியில் கேட்க தட்டவும்",
        "sermons.audioNotAvailable": "ஆடியோ கிடைக்கவில்லை",
        "sermons.dateUnavailable": "தேதி கிடைக்கவில்லை",
        "sermons.loadErrorTitle": "பிரசங்கங்களை ஏற்ற முடியவில்லை",
        "sermons.loadErrorBody": "புதுப்பித்து மீண்டும் முயற்சிக்கவும்.",
        "sermons.archiveUnavailable": "பிரசங்க காப்பகம் தற்காலிகமாக கிடைக்கவில்லை.",
        "sermons.searchPlaceholder": "தலைப்பு, பேச்சாளர், தேதியால் பிரசங்கம் தேடுக",
        "sermons.searchNoResultsTitle": "பொருந்தும் பிரசங்கம் இல்லை",
        "sermons.searchNoResultsBody": "மற்றொரு சொல் வைத்து தேடிப் பார்க்கவும்.",
        "sermons.searchMatches": "{count} முடிவுகள் கிடைத்தன.",
        "notify.title": "அறிவிப்புகள்",
        "notify.subtitle": "சேவை நினைவூட்டல் மற்றும் புதிய பிரசங்க அறிவிப்புகளைப் பெறுங்கள்.",
        "notify.statusOn": "அறிவிப்புகள் செயல்பாட்டில் உள்ளன.",
        "notify.statusOff": "அறிவிப்புகள் தற்போது அணைக்கப்பட்டுள்ளன.",
        "notify.statusBlocked": "Browser-ல் அறிவிப்புகள் தடுக்கப்பட்டுள்ளன. Settings-ல் அனுமதி அளிக்கவும்.",
        "notify.statusUnsupported": "இந்த சாதனத்தில் அறிவிப்புகள் ஆதரிக்கப்படவில்லை.",
        "notify.enable": "அறிவிப்புகளை இயக்கு",
        "notify.disable": "அறிவிப்புகளை அணை",
        "notify.reminderLabel": "நினைவூட்டல் நேரம்",
        "notify.reminder15": "15 நிமிடம் முன்",
        "notify.reminder30": "30 நிமிடம் முன்",
        "notify.reminder60": "60 நிமிடம் முன்",
        "notify.eventSoonTitle": "நிகழ்வு நினைவூட்டல்",
        "notify.newSermonTitle": "புதிய பிரசங்கம் கிடைக்கிறது",
        "sermons.filterSpeaker": "பேச்சாளர்",
        "sermons.filterMonth": "மாதம்",
        "sermons.filterAll": "அனைத்தும்",
        "offline.active": "ஆஃப்லைன் முறை செயல்பாட்டில் உள்ளது",
        "player.openSermonsPage": "பிரசங்கங்கள் பக்கத்தைத் திற",
        "player.playOrPause": "ஒலிக்க அல்லது நிறுத்த",
        "player.stopAndClose": "நிறுத்தி மூட",
        "player.close": "ப்ளேயரை மூடு",
        "player.minimize": "ப்ளேயரை சிறிதாக்கு",
        "player.seekPosition": "இடத்தை மாற்று",
        "player.previousSermon": "முந்தைய பிரசங்கம்",
        "player.nextSermon": "அடுத்த பிரசங்கம்",
        "player.controls": "ப்ளேயர் கட்டுப்பாடுகள்",
        "contact.eyebrow": "தொடர்பு",
        "contact.title": "எங்கள் குழுவை அணுகுங்கள்",
        "contact.subtitle": "கேள்விகள், ஜெப வேண்டுதல்கள், அல்லது உதவி தேவைகள் - நாங்கள் உங்களுக்காக உள்ளோம்.",
        "contact.getInTouch": "தொடர்பு கொள்ள",
        "contact.emailLabel": "மின்னஞ்சல்:",
        "contact.phoneLabel": "தொலைபேசி:",
        "contact.officeHours": "அலுவலக நேரம்",
        "contact.weekdays": "வார நாட்கள்",
        "contact.weekendSupport": "வார இறுதி உதவி",
        "contact.weekendSupportTime": "ஞாயிறு ஆராதனைக்கு முன் மற்றும் பின்",
        "contact.location": "இடம்",
        "contact.locationName": "புதிய எருசலேம் சபை பெல்ஜியம்",
        "common.at": "மணிக்கு",
        "common.belgiumTime": "பெல்ஜியம் நேரம்",
        "common.today": "இன்று"
    };

    function isSameOriginHttp(url) {
        return (url.protocol === "http:" || url.protocol === "https:") && url.origin === window.location.origin;
    }

    function getStoredLanguage() {
        try {
            var value = window.localStorage.getItem(LANGUAGE_KEY);
            if (value === "en" || value === "ta") {
                return value;
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    function getActiveLanguage() {
        return getStoredLanguage() || "en";
    }

    function getLocale() {
        return activeLanguage === "ta" ? "ta-IN" : "en-GB";
    }

    function t(key, fallback) {
        if (activeLanguage === "ta" && Object.prototype.hasOwnProperty.call(tamilTranslations, key)) {
            return tamilTranslations[key];
        }
        return fallback || key;
    }

    function translateCountText(template, count) {
        return String(template).replace("{count}", String(count));
    }

    function applyTranslations(root) {
        var scope = root || document;

        scope.querySelectorAll("[data-i18n]").forEach(function (node) {
            var key = node.getAttribute("data-i18n");
            if (!node.hasAttribute("data-i18n-fallback")) {
                node.setAttribute("data-i18n-fallback", node.textContent);
            }
            var fallback = node.getAttribute("data-i18n-fallback") || "";
            node.textContent = t(key, fallback);
        });

        scope.querySelectorAll("[data-i18n-aria-label]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-aria-label");
            if (!node.hasAttribute("data-i18n-aria-fallback")) {
                node.setAttribute("data-i18n-aria-fallback", node.getAttribute("aria-label") || "");
            }
            var fallback = node.getAttribute("data-i18n-aria-fallback") || "";
            node.setAttribute("aria-label", t(key, fallback));
        });

        scope.querySelectorAll("[data-i18n-title]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-title");
            if (!node.hasAttribute("data-i18n-title-fallback")) {
                node.setAttribute("data-i18n-title-fallback", node.getAttribute("title") || "");
            }
            var fallback = node.getAttribute("data-i18n-title-fallback") || "";
            node.setAttribute("title", t(key, fallback));
        });

        scope.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
            var key = node.getAttribute("data-i18n-placeholder");
            if (!node.hasAttribute("data-i18n-placeholder-fallback")) {
                node.setAttribute("data-i18n-placeholder-fallback", node.getAttribute("placeholder") || "");
            }
            var fallback = node.getAttribute("data-i18n-placeholder-fallback") || "";
            node.setAttribute("placeholder", t(key, fallback));
        });
    }

    function setLanguage(language, persist, shouldDispatch) {
        var next = (language === "ta") ? "ta" : "en";
        activeLanguage = next;
        document.documentElement.setAttribute("lang", next);
        applyTranslations(document);

        if (persist) {
            try {
                window.localStorage.setItem(LANGUAGE_KEY, next);
            } catch (err) {
                return null;
            }
        }

        if (shouldDispatch) {
            document.dispatchEvent(new CustomEvent("njc:langchange", {
                detail: {
                    language: next
                }
            }));
        }
        return null;
    }

    function ensureHeaderControls(header) {
        var controls = header.querySelector(".header-controls");
        if (controls) {
            return controls;
        }
        controls = document.createElement("div");
        controls.className = "header-controls";
        header.appendChild(controls);
        return controls;
    }

    function setLanguageButtonLabel(button) {
        var nextLanguage = activeLanguage === "ta" ? "en" : "ta";
        button.textContent = activeLanguage === "ta" ? "EN" : "TA";
        var label = nextLanguage === "ta"
            ? t("toggle.language.toTamil", "Switch language to Tamil")
            : t("toggle.language.toEnglish", "Switch language to English");
        button.setAttribute("aria-label", label);
        button.title = label;
    }

    function setupLanguageToggle() {
        var header = document.querySelector(".app-header");
        if (!header || document.getElementById("language-toggle-btn")) {
            return;
        }

        var button = document.createElement("button");
        button.id = "language-toggle-btn";
        button.className = "lang-toggle";
        button.type = "button";
        setLanguageButtonLabel(button);

        button.addEventListener("click", function () {
            var next = activeLanguage === "ta" ? "en" : "ta";
            setLanguage(next, true, true);
        });

        document.addEventListener("njc:langchange", function () {
            setLanguageButtonLabel(button);
        });

        ensureHeaderControls(header).appendChild(button);
    }

    function isNavigableAnchor(anchor) {
        if (!anchor) {
            return false;
        }

        var rawHref = anchor.getAttribute("href");
        if (!rawHref || rawHref === "#" || rawHref.startsWith("#")) {
            return false;
        }

        if (anchor.target && anchor.target !== "_self") {
            return false;
        }

        if (anchor.hasAttribute("download")) {
            return false;
        }

        var url = new URL(anchor.href, window.location.href);
        if (!isSameOriginHttp(url)) {
            return false;
        }

        var current = new URL(window.location.href);
        if (url.pathname === current.pathname && url.search === current.search && url.hash === current.hash) {
            return false;
        }

        return true;
    }

    function prefetchUrl(url) {
        var key = url.href;
        if (prefetched.has(key)) {
            return;
        }
        prefetched.add(key);

        var prefetchLink = document.createElement("link");
        prefetchLink.rel = "prefetch";
        prefetchLink.href = key;
        document.head.appendChild(prefetchLink);

        if (window.fetch) {
            fetch(key, { credentials: "same-origin" }).catch(function () {
                return null;
            });
        }
    }

    function prefetchFromAnchor(anchor) {
        if (!isNavigableAnchor(anchor)) {
            return;
        }
        prefetchUrl(new URL(anchor.href, window.location.href));
    }

    function setupTabPrefetch() {
        var tabLinks = document.querySelectorAll(".tab-nav a.tab[href]");
        tabLinks.forEach(function (link) {
            prefetchFromAnchor(link);
        });
    }

    function setupIntentPrefetch() {
        document.addEventListener("mouseover", function (event) {
            var anchor = event.target.closest("a[href]");
            if (anchor) {
                prefetchFromAnchor(anchor);
            }
        });

        document.addEventListener("touchstart", function (event) {
            var anchor = event.target.closest("a[href]");
            if (anchor) {
                prefetchFromAnchor(anchor);
            }
        }, { passive: true });
    }

    function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) {
            return;
        }
        navigator.serviceWorker.register("service-worker.js").catch(function () {
            return null;
        });
    }

    function notificationsSupported() {
        return ("Notification" in window) && ("serviceWorker" in navigator);
    }

    function normalizeReminderMinutes(value) {
        var num = Number(value);
        if (num === 15 || num === 30 || num === 60) {
            return num;
        }
        return 60;
    }

    function getNotificationSettings() {
        try {
            var raw = window.localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
            if (!raw) {
                return { enabled: false, reminderMinutes: 60 };
            }
            var parsed = JSON.parse(raw);
            return {
                enabled: Boolean(parsed && parsed.enabled),
                reminderMinutes: normalizeReminderMinutes(parsed && parsed.reminderMinutes)
            };
        } catch (err) {
            return { enabled: false, reminderMinutes: 60 };
        }
    }

    function setNotificationSettings(settings) {
        try {
            window.localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
                enabled: Boolean(settings && settings.enabled),
                reminderMinutes: normalizeReminderMinutes(settings && settings.reminderMinutes)
            }));
        } catch (err) {
            return null;
        }
        return null;
    }

    function getNotificationPermission() {
        if (!notificationsSupported()) {
            return "unsupported";
        }
        return Notification.permission;
    }

    function getNotificationStatus() {
        var supported = notificationsSupported();
        var permission = getNotificationPermission();
        var settings = getNotificationSettings();
        return {
            supported: supported,
            permission: permission,
            enabled: settings.enabled,
            reminderMinutes: settings.reminderMinutes
        };
    }

    function emitNotificationStatus() {
        document.dispatchEvent(new CustomEvent("njc:notificationstatus", {
            detail: getNotificationStatus()
        }));
    }

    function getNotifiedMap() {
        try {
            var raw = window.localStorage.getItem(NOTIFICATION_SENT_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function markAsNotified(key) {
        var map = getNotifiedMap();
        map[key] = Date.now();
        var entries = Object.keys(map).sort(function (a, b) {
            return map[b] - map[a];
        }).slice(0, 120);
        var next = {};
        entries.forEach(function (entryKey) {
            next[entryKey] = map[entryKey];
        });
        try {
            window.localStorage.setItem(NOTIFICATION_SENT_KEY, JSON.stringify(next));
        } catch (err) {
            return null;
        }
        return null;
    }

    function wasNotified(key) {
        var map = getNotifiedMap();
        return Boolean(map[key]);
    }

    function showNotification(options) {
        var config = options || {};
        if (!notificationsSupported() || getNotificationPermission() !== "granted") {
            return Promise.resolve(false);
        }

        var payload = {
            body: config.body || "",
            tag: config.tag || "",
            icon: "logo.png",
            badge: "logo.png",
            data: {
                url: config.url || "index.html"
            }
        };

        return navigator.serviceWorker.getRegistration().then(function (registration) {
            if (registration && registration.showNotification) {
                return registration.showNotification(config.title || "NJC", payload).then(function () {
                    return true;
                });
            }
            var fallback = new Notification(config.title || "NJC", payload);
            fallback.onclick = function () {
                window.location.href = payload.data.url;
            };
            return true;
        }).catch(function () {
            return false;
        });
    }

    function diffMinutesFromBrusselsNow(nowBrussels, eventItem) {
        var nowUtc = Date.UTC(nowBrussels.year, nowBrussels.month - 1, nowBrussels.day, nowBrussels.hour, nowBrussels.minute);
        var eventUtc = Date.UTC(eventItem.year, eventItem.month - 1, eventItem.day, eventItem.hour, eventItem.minute);
        return Math.round((eventUtc - nowUtc) / 60000);
    }

    function checkEventReminder() {
        if (!window.NjcEvents || typeof window.NjcEvents.mergeUpcomingEvents !== "function") {
            return Promise.resolve();
        }
        var settings = getNotificationSettings();
        return window.NjcEvents.mergeUpcomingEvents({ eventsUrl: EVENTS_FEED_URL, horizonDays: 2 })
            .then(function (result) {
                var nowBrussels = result.nowBrussels;
                var nextEvent = (result.events || []).find(function (item) {
                    return item.key >= nowBrussels.key;
                });

                if (!nextEvent) {
                    return null;
                }

                var mins = diffMinutesFromBrusselsNow(nowBrussels, nextEvent);
                var notifyKey = "event:" + String(nextEvent.key);
                if (mins < 0 || mins > settings.reminderMinutes || wasNotified(notifyKey)) {
                    return null;
                }

                var dateText = window.NjcEvents.toDisplayDate(nextEvent.year, nextEvent.month, nextEvent.day, getLocale());
                var timeText = window.NjcEvents.toDisplayTime(nextEvent.hour, nextEvent.minute);
                var title = nextEvent.title || t("events.event", "Event");
                var body = title + " - " + dateText + " " + t("common.at", "at") + " " + timeText + " (" + t("common.belgiumTime", "Belgium time") + ")";

                return showNotification({
                    title: t("notify.eventSoonTitle", "Event reminder"),
                    body: body,
                    tag: notifyKey,
                    url: "events.html"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function checkNewSermonNotification() {
        return fetch(SERMONS_FEED_URL)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Unable to load sermons");
                }
                return response.json();
            })
            .then(function (raw) {
                var sermons = Array.isArray(raw) ? raw : [];
                var sorted = sermons
                    .filter(function (item) { return item && item.title; })
                    .sort(function (a, b) {
                        return String(b.date || "").localeCompare(String(a.date || ""));
                    });
                var latest = sorted[0];
                if (!latest) {
                    return null;
                }

                var latestKey = String(latest.date || "") + "|" + String(latest.title || "");
                var previousKey = "";
                try {
                    previousKey = window.localStorage.getItem(NOTIFICATION_LAST_SERMON_KEY) || "";
                } catch (err) {
                    previousKey = "";
                }

                if (!previousKey) {
                    try {
                        window.localStorage.setItem(NOTIFICATION_LAST_SERMON_KEY, latestKey);
                    } catch (err) {
                        return null;
                    }
                    return null;
                }

                if (latestKey === previousKey) {
                    return null;
                }

                var notifyKey = "sermon:" + latestKey;
                if (wasNotified(notifyKey)) {
                    return null;
                }

                return showNotification({
                    title: t("notify.newSermonTitle", "New sermon available"),
                    body: latest.title || "Latest message is ready to listen",
                    tag: notifyKey,
                    url: "sermons.html"
                }).then(function (sent) {
                    if (sent) {
                        markAsNotified(notifyKey);
                        try {
                            window.localStorage.setItem(NOTIFICATION_LAST_SERMON_KEY, latestKey);
                        } catch (err) {
                            return null;
                        }
                    }
                    return null;
                });
            })
            .catch(function () {
                return null;
            });
    }

    function runNotificationChecks() {
        var status = getNotificationStatus();
        if (!status.supported || !status.enabled || status.permission !== "granted") {
            return;
        }
        checkEventReminder();
        checkNewSermonNotification();
    }

    function startNotificationLoop() {
        if (notificationIntervalId) {
            window.clearInterval(notificationIntervalId);
        }
        runNotificationChecks();
        notificationIntervalId = window.setInterval(runNotificationChecks, 5 * 60 * 1000);
    }

    function stopNotificationLoop() {
        if (notificationIntervalId) {
            window.clearInterval(notificationIntervalId);
            notificationIntervalId = null;
        }
    }

    function syncNotificationLoop() {
        var status = getNotificationStatus();
        if (status.supported && status.enabled && status.permission === "granted") {
            startNotificationLoop();
        } else {
            stopNotificationLoop();
        }
    }

    function requestNotificationPermission() {
        if (!notificationsSupported()) {
            return Promise.resolve("unsupported");
        }
        if (Notification.permission === "granted") {
            return Promise.resolve("granted");
        }
        if (Notification.permission === "denied") {
            return Promise.resolve("denied");
        }
        return Notification.requestPermission();
    }

    function toggleNotificationsEnabled() {
        var status = getNotificationStatus();
        if (!status.supported) {
            emitNotificationStatus();
            return Promise.resolve(getNotificationStatus());
        }

        if (status.enabled) {
            setNotificationSettings({ enabled: false, reminderMinutes: status.reminderMinutes });
            syncNotificationLoop();
            emitNotificationStatus();
            return Promise.resolve(getNotificationStatus());
        }

        return requestNotificationPermission().then(function (permission) {
            if (permission === "granted") {
                setNotificationSettings({ enabled: true, reminderMinutes: status.reminderMinutes });
            } else {
                setNotificationSettings({ enabled: false, reminderMinutes: status.reminderMinutes });
            }
            syncNotificationLoop();
            emitNotificationStatus();
            return getNotificationStatus();
        });
    }

    function setNotificationReminderMinutes(minutes) {
        var status = getNotificationStatus();
        var nextMinutes = normalizeReminderMinutes(minutes);
        setNotificationSettings({
            enabled: status.enabled,
            reminderMinutes: nextMinutes
        });
        emitNotificationStatus();
        runNotificationChecks();
        return getNotificationStatus();
    }

    function setupNotifications() {
        window.NjcNotifications = {
            getStatus: getNotificationStatus,
            toggleEnabled: toggleNotificationsEnabled,
            setReminderMinutes: setNotificationReminderMinutes,
            requestPermission: requestNotificationPermission,
            refreshNow: function () {
                runNotificationChecks();
            }
        };
        syncNotificationLoop();
        emitNotificationStatus();
        document.addEventListener("visibilitychange", function () {
            if (!document.hidden) {
                runNotificationChecks();
            }
        });
    }

    function setupOfflineBadge() {
        var existing = document.getElementById("offline-badge");
        if (existing) {
            existing.remove();
        }

        var badge = document.createElement("div");
        badge.id = "offline-badge";
        badge.className = "offline-badge";
        badge.textContent = t("offline.active", "Offline mode active");
        badge.hidden = navigator.onLine;
        document.body.appendChild(badge);

        function refresh() {
            badge.hidden = navigator.onLine;
        }

        window.addEventListener("online", refresh);
        window.addEventListener("offline", refresh);
        document.addEventListener("njc:langchange", function () {
            badge.textContent = t("offline.active", "Offline mode active");
        });
    }

    function getStoredState() {
        try {
            var raw = window.localStorage.getItem(STATE_KEY);
            if (!raw) {
                return null;
            }
            var parsed = JSON.parse(raw);
            if (!parsed || !parsed.audioUrl) {
                return null;
            }
            return parsed;
        } catch (err) {
            return null;
        }
    }

    function setStoredState(state) {
        try {
            window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
        } catch (err) {
            return null;
        }
        return null;
    }

    function clearStoredState() {
        try {
            window.localStorage.removeItem(STATE_KEY);
        } catch (err) {
            return null;
        }
        return null;
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "00:00";
        }
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        return mins + ":" + (secs < 10 ? "0" + secs : String(secs));
    }

    function createGlobalMiniPlayer() {
        if (document.getElementById("global-mini-player")) {
            return;
        }

        if (window.location.pathname.endsWith("/sermons.html")) {
            return;
        }

        var state = getStoredState();
        if (!state || !state.audioUrl) {
            return;
        }

        var container = document.createElement("div");
        container.id = "global-mini-player";
        container.className = "mini-sermon-player";

        var openButton = document.createElement("button");
        openButton.type = "button";
        openButton.className = "mini-player-open";
        openButton.setAttribute("aria-label", t("player.openSermonsPage", "Open sermons page"));

        var titleNode = document.createElement("span");
        titleNode.className = "mini-player-title";
        titleNode.textContent = state.title || t("sermons.nowPlaying", "Now Playing");
        openButton.appendChild(titleNode);

        var timeNode = document.createElement("span");
        timeNode.className = "mini-player-time";
        timeNode.textContent = "00:00 / 00:00";
        openButton.appendChild(timeNode);

        var playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "mini-player-btn";
        playButton.setAttribute("aria-label", t("player.playOrPause", "Play or pause"));
        playButton.innerHTML = "<i class=\"fa-solid fa-play\"></i>";

        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "mini-player-btn";
        closeButton.setAttribute("aria-label", t("player.stopAndClose", "Stop and close player"));
        closeButton.innerHTML = "<i class=\"fa-solid fa-xmark\"></i>";

        container.appendChild(openButton);
        container.appendChild(playButton);
        container.appendChild(closeButton);
        document.body.appendChild(container);

        var audio = new Audio();
        audio.preload = "metadata";
        audio.src = state.audioUrl;

        function saveState() {
            setStoredState({
                audioUrl: audio.currentSrc || state.audioUrl,
                title: titleNode.textContent,
                subtitle: state.subtitle || "",
                speaker: state.speaker || "",
                dateText: state.dateText || "",
                currentTime: audio.currentTime || 0,
                isPlaying: !audio.paused
            });
        }

        function refreshMini() {
            var current = audio.currentTime || 0;
            var duration = audio.duration || 0;
            timeNode.textContent = formatTime(current) + " / " + formatTime(duration);
            var icon = audio.paused ? "fa-play" : "fa-pause";
            playButton.innerHTML = "<i class=\"fa-solid " + icon + "\"></i>";
        }

        audio.addEventListener("loadedmetadata", function () {
            if (Number.isFinite(state.currentTime) && state.currentTime > 0) {
                try {
                    audio.currentTime = Math.min(state.currentTime, audio.duration || state.currentTime);
                } catch (err) {
                    return null;
                }
            }
            refreshMini();
        });

        audio.addEventListener("timeupdate", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("play", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("pause", function () {
            refreshMini();
            saveState();
        });

        audio.addEventListener("ended", function () {
            refreshMini();
            saveState();
        });

        openButton.addEventListener("click", function () {
            window.location.href = "sermons.html";
        });

        playButton.addEventListener("click", function () {
            if (audio.paused) {
                audio.play().catch(function () {
                    return null;
                });
            } else {
                audio.pause();
            }
        });

        closeButton.addEventListener("click", function () {
            audio.pause();
            clearStoredState();
            container.remove();
        });

        document.addEventListener("njc:langchange", function () {
            openButton.setAttribute("aria-label", t("player.openSermonsPage", "Open sermons page"));
            playButton.setAttribute("aria-label", t("player.playOrPause", "Play or pause"));
            closeButton.setAttribute("aria-label", t("player.stopAndClose", "Stop and close player"));
            if (!state.title) {
                titleNode.textContent = t("sermons.nowPlaying", "Now Playing");
            }
        });

        if (state.isPlaying) {
            audio.play().catch(function () {
                refreshMini();
                saveState();
            });
        } else {
            refreshMini();
        }
    }

    function getStoredTheme() {
        try {
            var value = window.localStorage.getItem(THEME_KEY);
            if (value === "light" || value === "dark") {
                return value;
            }
        } catch (err) {
            return null;
        }
        return null;
    }

    function getSystemTheme() {
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function getActiveTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
    }

    function persistTheme(theme) {
        try {
            window.localStorage.setItem(THEME_KEY, theme);
        } catch (err) {
            return null;
        }
        return null;
    }

    function setToggleIcon(button, theme) {
        var icon = theme === "dark" ? "fa-sun" : "fa-moon";
        var label = theme === "dark"
            ? t("toggle.theme.toLight", "Switch to light mode")
            : t("toggle.theme.toDark", "Switch to dark mode");
        button.innerHTML = "<i class=\"fa-solid " + icon + "\"></i>";
        button.setAttribute("aria-label", label);
        button.title = label;
    }

    function setupThemeToggle() {
        var header = document.querySelector(".app-header");
        if (!header || document.getElementById("theme-toggle-btn")) {
            return;
        }

        var button = document.createElement("button");
        button.id = "theme-toggle-btn";
        button.className = "theme-toggle";
        button.type = "button";

        var activeTheme = getActiveTheme();
        applyTheme(activeTheme);
        setToggleIcon(button, activeTheme);

        button.addEventListener("click", function () {
            var nextTheme = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
            applyTheme(nextTheme);
            persistTheme(nextTheme);
            setToggleIcon(button, nextTheme);
        });

        ensureHeaderControls(header).appendChild(button);

        var media = window.matchMedia("(prefers-color-scheme: dark)");
        if (media && media.addEventListener) {
            media.addEventListener("change", function () {
                if (!getStoredTheme()) {
                    var systemTheme = getSystemTheme();
                    applyTheme(systemTheme);
                    setToggleIcon(button, systemTheme);
                }
            });
        }

        document.addEventListener("njc:langchange", function () {
            setToggleIcon(button, document.documentElement.getAttribute("data-theme") || getActiveTheme());
        });
    }

    function showSplashScreenOnce() {
        try {
            if (window.sessionStorage.getItem(SPLASH_KEY)) {
                return;
            }
            window.sessionStorage.setItem(SPLASH_KEY, "1");
        } catch (err) {
            return;
        }

        var splash = document.createElement("div");
        splash.className = "splash-screen startup-static";
        splash.innerHTML = "" +
            "<div class=\"splash-inner\">" +
            "  <img class=\"splash-logo\" src=\"logo.png\" alt=\"New Jerusalem Church Belgium logo\">" +
            "</div>";

        document.body.appendChild(splash);
        document.body.classList.add("splash-active");

        requestAnimationFrame(function () {
            splash.classList.add("show");
        });

        window.setTimeout(function () {
            splash.classList.remove("show");
            splash.classList.add("hide");
            document.body.classList.remove("splash-active");
            window.setTimeout(function () {
                splash.remove();
            }, 320);
        }, 2600);
    }

    document.addEventListener("DOMContentLoaded", function () {
        registerServiceWorker();
        activeLanguage = getActiveLanguage();
        window.NjcI18n = {
            t: t,
            getLanguage: function () {
                return activeLanguage;
            },
            getLocale: getLocale,
            setLanguage: function (language) {
                setLanguage(language, true, true);
            },
            apply: applyTranslations,
            formatCount: translateCountText
        };
        setLanguage(activeLanguage, false, true);
        setupLanguageToggle();
        setupThemeToggle();
        setupNotifications();
        setupOfflineBadge();
        showSplashScreenOnce();
        setupTabPrefetch();
        setupIntentPrefetch();
        createGlobalMiniPlayer();
    });
})();
