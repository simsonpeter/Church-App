(function () {
    var prefetched = new Set();
    var STATE_KEY = "njc_sermon_player_v1";
    var SPLASH_KEY = "njc_splash_seen_v1";
    var THEME_KEY = "njc_theme_v1";

    function isSameOriginHttp(url) {
        return (url.protocol === "http:" || url.protocol === "https:") && url.origin === window.location.origin;
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
        openButton.setAttribute("aria-label", "Open sermons page");

        var titleNode = document.createElement("span");
        titleNode.className = "mini-player-title";
        titleNode.textContent = state.title || "Now Playing";
        openButton.appendChild(titleNode);

        var timeNode = document.createElement("span");
        timeNode.className = "mini-player-time";
        timeNode.textContent = "00:00 / 00:00";
        openButton.appendChild(timeNode);

        var playButton = document.createElement("button");
        playButton.type = "button";
        playButton.className = "mini-player-btn";
        playButton.setAttribute("aria-label", "Play or pause");
        playButton.innerHTML = "<i class=\"fa-solid fa-play\"></i>";

        var closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "mini-player-btn";
        closeButton.setAttribute("aria-label", "Stop and close player");
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
        var label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
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

        header.appendChild(button);

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
        splash.className = "splash-screen";
        splash.innerHTML = "" +
            "<div class=\"splash-inner\">" +
            "  <img class=\"splash-logo\" src=\"logo.png\" alt=\"New Jerusalem Church Belgium logo\">" +
            "  <div class=\"splash-text\">" +
            "    <span class=\"splash-text-main\">New Jerusalem Church</span>" +
            "    <span class=\"splash-text-sub\">Belgium</span>" +
            "  </div>" +
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
        }, 1550);
    }

    document.addEventListener("DOMContentLoaded", function () {
        setupThemeToggle();
        showSplashScreenOnce();
        setupTabPrefetch();
        setupIntentPrefetch();
        createGlobalMiniPlayer();
    });
})();
