(function () {
    var routes = {
        home: {
            icon: "fa-church",
            eyebrowKey: "brand.name",
            eyebrowText: "NJC Belgium",
            titleKey: "home.welcomeBack",
            titleText: "Welcome back",
            subtitleKey: "home.tagline",
            subtitleText: "Your weekly faith journey in one place."
        },
        about: {
            icon: "fa-circle-info",
            eyebrowKey: "about.eyebrow",
            eyebrowText: "About",
            titleKey: "about.title",
            titleText: "Who we are",
            subtitleKey: "about.subtitle",
            subtitleText: "A faith-centered community growing together in Christ."
        },
        events: {
            icon: "fa-calendar-days",
            eyebrowKey: "events.eyebrow",
            eyebrowText: "Events",
            titleKey: "events.title",
            titleText: "Church calendar",
            subtitleKey: "events.subtitle",
            subtitleText: "Stay in sync with services, prayer nights, and fellowship moments."
        },
        sermons: {
            icon: "fa-microphone-lines",
            eyebrowKey: "sermons.eyebrow",
            eyebrowText: "Sermons",
            titleKey: "sermons.title",
            titleText: "Recent messages",
            subtitleKey: "sermons.subtitle",
            subtitleText: "Listen again, take notes, and keep growing during the week."
        },
        contact: {
            icon: "fa-phone",
            eyebrowKey: "contact.eyebrow",
            eyebrowText: "Contact",
            titleKey: "contact.title",
            titleText: "Reach our team",
            subtitleKey: "contact.subtitle",
            subtitleText: "Questions, prayer requests, or support needs - we are available."
        }
    };

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getRouteFromHash() {
        var raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
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
            title.textContent = T(config.titleKey, config.titleText);
            subtitle.textContent = T(config.subtitleKey, config.subtitleText);
        }

        if (window.location.hash.replace(/^#/, "") !== current) {
            window.history.replaceState(null, "", "#" + current);
        }

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
})();
