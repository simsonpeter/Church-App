(function () {
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var PROFILE_STORAGE_KEY = "njc_user_profiles_v1";
    var routes = {
        home: {
            icon: "fa-church",
            eyebrowKey: "brand.name",
            eyebrowText: "NJC Belgium",
            titleKey: "home.welcomeBack",
            titleText: "Welcome back",
            subtitleKey: "",
            subtitleText: ""
        },
        prayer: {
            icon: "fa-hands-praying",
            eyebrowKey: "prayer.eyebrow",
            eyebrowText: "Prayer",
            titleKey: "prayer.title",
            titleText: "Prayer Wall",
            subtitleKey: "",
            subtitleText: ""
        },
        events: {
            icon: "fa-calendar-days",
            eyebrowKey: "events.eyebrow",
            eyebrowText: "Events",
            titleKey: "events.title",
            titleText: "Events",
            subtitleKey: "",
            subtitleText: ""
        },
        sermons: {
            icon: "fa-microphone-lines",
            eyebrowKey: "sermons.eyebrow",
            eyebrowText: "Sermons",
            titleKey: "sermons.title",
            titleText: "Recent messages",
            subtitleKey: "",
            subtitleText: ""
        },
        bible: {
            icon: "fa-book-bible",
            eyebrowKey: "bible.eyebrow",
            eyebrowText: "Bible",
            titleKey: "bible.title",
            titleText: "Bible Reader",
            subtitleKey: "",
            subtitleText: ""
        },
        songbook: {
            icon: "fa-music",
            eyebrowKey: "songbook.eyebrow",
            eyebrowText: "Songbook",
            titleKey: "songbook.title",
            titleText: "NJC Songbook",
            subtitleKey: "",
            subtitleText: ""
        },
        "daily-bread": {
            icon: "fa-bread-slice",
            eyebrowKey: "dailyBread.eyebrow",
            eyebrowText: "Daily bread",
            titleKey: "dailyBread.title",
            titleText: "Daily bread",
            subtitleKey: "dailyBread.subtitle",
            subtitleText: ""
        },
        trivia: {
            icon: "fa-question-circle",
            eyebrowKey: "trivia.eyebrow",
            eyebrowText: "Bible Quiz",
            titleKey: "trivia.title",
            titleText: "Today's Bible Quiz",
            subtitleKey: "",
            subtitleText: ""
        },
        "user-achievements": {
            icon: "fa-trophy",
            eyebrowKey: "userAchievements.eyebrow",
            eyebrowText: "Community",
            titleKey: "userAchievements.title",
            titleText: "User achievements",
            subtitleKey: "userAchievements.subtitle",
            subtitleText: "Bible Quiz and Bible reading points"
        },
        chat: {
            icon: "fa-comments",
            eyebrowKey: "chat.eyebrow",
            eyebrowText: "Community",
            titleKey: "chat.title",
            titleText: "Chat",
            subtitleKey: "chat.subtitle",
            subtitleText: "Text only, members only"
        },
        contact: {
            icon: "fa-phone",
            eyebrowKey: "contact.eyebrow",
            eyebrowText: "Contact",
            titleKey: "contact.title",
            titleText: "Reach our team",
            subtitleKey: "",
            subtitleText: ""
        },
        profile: {
            icon: "fa-user",
            eyebrowKey: "profile.eyebrow",
            eyebrowText: "Profile",
            titleKey: "profile.title",
            titleText: "Your profile",
            subtitleKey: "",
            subtitleText: ""
        },
        settings: {
            icon: "fa-sliders",
            eyebrowKey: "settings.eyebrow",
            eyebrowText: "Settings",
            titleKey: "settings.title",
            titleText: "Settings",
            subtitleKey: "",
            subtitleText: ""
        },
        admin: {
            icon: "fa-screwdriver-wrench",
            eyebrowKey: "admin.eyebrow",
            eyebrowText: "Admin",
            titleKey: "admin.title",
            titleText: "Admin Dashboard",
            subtitleKey: "",
            subtitleText: ""
        },
        mailbox: {
            icon: "fa-inbox",
            eyebrowKey: "mailbox.eyebrow",
            eyebrowText: "Mailbox",
            titleKey: "mailbox.title",
            titleText: "Admin Mailbox",
            subtitleKey: "",
            subtitleText: ""
        }
    };

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function isAdminUser() {
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return false;
        }
        var activeUser = window.NjcAuth.getUser();
        var email = String(activeUser && activeUser.email || "").trim().toLowerCase();
        return email === ADMIN_EMAIL;
    }

    function getStoredProfileMap() {
        try {
            var raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
            var parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === "object" ? parsed : {};
        } catch (err) {
            return {};
        }
    }

    function getProfileForUser(activeUser) {
        var uid = String(activeUser && activeUser.uid || "").trim();
        if (!uid) {
            return {};
        }
        var map = getStoredProfileMap();
        var profile = map[uid];
        return profile && typeof profile === "object" ? profile : {};
    }

    function pickFirstName(nameText) {
        var value = String(nameText || "").trim();
        if (!value) {
            return "";
        }
        var firstToken = value
            .replace(/[|,/\\]+/g, " ")
            .split(/[\s._-]+/)
            .filter(Boolean)[0] || "";
        if (!firstToken) {
            return "";
        }
        var camelMatch = firstToken.match(/^([A-Z][a-z]+|[a-z]+)/);
        if (camelMatch && camelMatch[1] && camelMatch[1].length < firstToken.length) {
            firstToken = camelMatch[1];
        }
        return firstToken.charAt(0).toUpperCase() + firstToken.slice(1);
    }

    function pickFirstNameFromEmail(email) {
        var raw = String(email || "").trim().toLowerCase();
        if (!raw || raw.indexOf("@") < 1) {
            return "";
        }
        var localPart = raw.split("@")[0];
        var firstToken = localPart.split(/[._-]+/).filter(Boolean)[0] || "";
        return pickFirstName(firstToken);
    }

    function getHomeWelcomeTitle(config) {
        var baseText = T(config.titleKey, "Welcome");
        if (!window.NjcAuth || typeof window.NjcAuth.getUser !== "function") {
            return baseText;
        }
        var activeUser = window.NjcAuth.getUser();
        var profile = getProfileForUser(activeUser);
        var firstName = pickFirstName(profile && profile.firstName)
            || pickFirstName(profile && profile.fullName)
            || pickFirstName(activeUser && activeUser.displayName)
            || pickFirstNameFromEmail(activeUser && activeUser.email);
        return firstName ? (baseText + " " + firstName) : baseText;
    }

    function getRouteFromHash() {
        var raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (raw === "about") {
            return "prayer";
        }
        if ((raw === "mailbox" || raw === "admin") && !isAdminUser()) {
            return "home";
        }
        return routes[raw] ? raw : "home";
    }

    function setActiveRoute(route) {
        var current = routes[route] ? route : "home";
        var config = routes[current];

        document.querySelectorAll(".page-view").forEach(function (view) {
            view.classList.toggle("active", view.getAttribute("data-route") === current);
        });

        document.querySelectorAll(".tab-nav .tab").forEach(function (tab) {
            tab.classList.toggle("active", tab.getAttribute("data-route") === current);
        });

        var header = document.getElementById("spa-header");
        var eyebrow = document.getElementById("spa-header-eyebrow");
        var icon = document.getElementById("spa-header-icon");
        var eyebrowText = document.getElementById("spa-header-eyebrow-text");
        var title = document.getElementById("spa-header-title");
        var subtitle = document.getElementById("spa-header-subtitle");

        if (header && eyebrow && icon && eyebrowText && title && subtitle) {
            header.classList.toggle("home-header", current === "home");
            eyebrow.classList.toggle("brand-title", current === "home");
            icon.className = "fa-solid " + config.icon;
            eyebrowText.textContent = T(config.eyebrowKey, config.eyebrowText);
            title.textContent = current === "home"
                ? getHomeWelcomeTitle(config)
                : T(config.titleKey, config.titleText);
            var subtitleValue = config.subtitleKey ? T(config.subtitleKey, config.subtitleText) : (config.subtitleText || "");
            subtitle.textContent = subtitleValue;
            subtitle.hidden = !subtitleValue;
        }

        if (window.location.hash.replace(/^#/, "") !== current) {
            window.history.replaceState(null, "", "#" + current);
        }

        document.dispatchEvent(new CustomEvent("njc:routechange", { detail: { route: current } }));

        window.setTimeout(function () {
            window.scrollTo(0, 0);
        }, 0);
    }

    function onRouteChange() {
        setActiveRoute(getRouteFromHash());
    }

    document.addEventListener("DOMContentLoaded", function () {
        onRouteChange();
    });

    window.addEventListener("hashchange", onRouteChange);
    document.addEventListener("njc:langchange", onRouteChange);
    document.addEventListener("njc:authchange", onRouteChange);
})();
