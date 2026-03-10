(function () {
    var prefetched = new Set();
    var STATE_KEY = "njc_sermon_player_v1";

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

    document.addEventListener("DOMContentLoaded", function () {
        setupTabPrefetch();
        setupIntentPrefetch();
        createGlobalMiniPlayer();
    });
})();
