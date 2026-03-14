(function () {
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
            subtitleText: "",
            viewRoute: "more",
            moreModule: "prayer"
        },
        events: {
            icon: "fa-calendar-days",
            eyebrowKey: "events.eyebrow",
            eyebrowText: "Events",
            titleKey: "events.title",
            titleText: "Church calendar",
            subtitleKey: "",
            subtitleText: "",
            viewRoute: "more",
            moreModule: "events"
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
        songbook: {
            icon: "fa-music",
            eyebrowKey: "songbook.eyebrow",
            eyebrowText: "Songbook",
            titleKey: "songbook.title",
            titleText: "NJC Songbook",
            subtitleKey: "",
            subtitleText: ""
        },
        contact: {
            icon: "fa-phone",
            eyebrowKey: "contact.eyebrow",
            eyebrowText: "Contact",
            titleKey: "contact.title",
            titleText: "Reach our team",
            subtitleKey: "",
            subtitleText: "",
            viewRoute: "more",
            moreModule: "contact"
        },
        more: {
            icon: "fa-ellipsis",
            eyebrowKey: "more.eyebrow",
            eyebrowText: "More",
            titleKey: "more.title",
            titleText: "More",
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

    function getRouteFromHash() {
        var raw = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (raw === "about") {
            return "prayer";
        }
        return routes[raw] ? raw : "home";
    }

    function setActiveRoute(route) {
        var current = routes[route] ? route : "home";
        var config = routes[current];
        var viewRoute = config.viewRoute || current;

        document.querySelectorAll(".page-view").forEach(function (view) {
            view.classList.toggle("active", view.getAttribute("data-route") === viewRoute);
        });

        document.querySelectorAll(".tab-nav .tab").forEach(function (tab) {
            tab.classList.toggle("active", tab.getAttribute("data-route") === viewRoute);
        });

        var activeMoreModule = config.moreModule || "";
        document.querySelectorAll("[data-more-module]").forEach(function (section) {
            section.classList.toggle("active", section.getAttribute("data-more-module") === activeMoreModule);
        });
        document.querySelectorAll("[data-more-route]").forEach(function (button) {
            button.classList.toggle("active", button.getAttribute("data-more-route") === current);
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
            var subtitleValue = config.subtitleKey ? T(config.subtitleKey, config.subtitleText) : (config.subtitleText || "");
            subtitle.textContent = subtitleValue;
            subtitle.hidden = !subtitleValue;
        }

        if (!routes[(window.location.hash || "").replace(/^#/, "").trim().toLowerCase()]) {
            window.history.replaceState(null, "", "#" + current);
        }

        window.setTimeout(function () {
            if (config.moreModule) {
                var target = document.querySelector("[data-more-module=\"" + config.moreModule + "\"]");
                if (target && typeof target.scrollIntoView === "function") {
                    target.scrollIntoView({ block: "start" });
                    return;
                }
            }
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
