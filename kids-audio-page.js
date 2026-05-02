(function () {
    var MANTLE_URL = "https://mantledb.sh/v2/njc-belgium-kids-audio/entries";

    var panel = document.getElementById("kids-panel-audios");
    var listEl = document.getElementById("kids-audio-list");
    var statusEl = document.getElementById("kids-audio-status");
    var pageCard = document.querySelector(".kids-page-card");

    var playerOverlay = document.getElementById("kids-audio-player");
    var playerBackdrop = document.getElementById("kids-audio-player-backdrop");
    var playerCloseBtn = document.getElementById("kids-audio-player-close-btn");
    var playerMinimize = document.getElementById("kids-audio-player-minimize");
    var playerWheelMenu = document.getElementById("kids-player-wheel-menu");
    var playerPrev = document.getElementById("kids-player-prev");
    var playerNext = document.getElementById("kids-player-next");
    var playerPlay = document.getElementById("kids-player-play");
    var playerCenter = document.getElementById("kids-player-center");
    var playerTitle = document.getElementById("kids-player-title");
    var playerSubtitle = document.getElementById("kids-player-subtitle");
    var playerMeta = document.getElementById("kids-player-meta");
    var playerSeek = document.getElementById("kids-player-seek");
    var playerTime = document.getElementById("kids-player-time");
    var playerSpeed = document.getElementById("kids-player-speed");
    var playerSleep = document.getElementById("kids-player-sleep");
    var playerSleepNote = document.getElementById("kids-player-sleep-note");
    var audioEl = document.getElementById("kids-audio-element");

    var miniPlayer = document.getElementById("mini-kids-audio-player");
    var miniOpen = document.getElementById("mini-kids-audio-open");
    var miniTitle = document.getElementById("mini-kids-audio-title");
    var miniTime = document.getElementById("mini-kids-audio-time");
    var miniPlay = document.getElementById("mini-kids-audio-play");
    var miniClose = document.getElementById("mini-kids-audio-close");

    if (!panel || !listEl || !playerOverlay || !audioEl) {
        return;
    }

    var playlist = [];
    var currentIndex = -1;
    var inflight = null;
    var sleepTimerId = null;

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            if (pageCard && typeof window.NjcI18n.tForElement === "function") {
                return window.NjcI18n.tForElement(pageCard, key, fallback);
            }
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getLang() {
        try {
            if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
                return window.NjcI18n.getLanguage() || "en";
            }
        } catch (e) {}
        return "en";
    }

    function isHttpsAudio(url) {
        return /^https:\/\//i.test(String(url || "").trim());
    }

    function isLikelyImageUrl(url) {
        var u = String(url || "").trim().toLowerCase();
        if (!/^https:\/\//i.test(u)) {
            return false;
        }
        if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i.test(u)) {
            return true;
        }
        return u.indexOf("image") !== -1;
    }

    function normalizeRow(raw, index) {
        var r = raw && typeof raw === "object" ? raw : {};
        var audioUrl = String(r.audioUrl || r.url || r.href || "").trim();
        return {
            id: String(r.id || "").trim() || ("kids-audio-" + index),
            title: String(r.title || "").trim(),
            titleTa: String(r.titleTa || "").trim(),
            description: String(r.description || "").trim(),
            descriptionTa: String(r.descriptionTa || "").trim(),
            audioUrl: audioUrl,
            coverImageUrl: String(r.coverImageUrl || r.coverUrl || r.imageUrl || "").trim(),
            durationLabel: String(r.durationLabel || r.duration || "").trim(),
            sortOrder: Number(r.sortOrder) || 0
        };
    }

    function pickLang(entry) {
        var lang = getLang();
        if (lang === "ta") {
            return {
                title: entry.titleTa || entry.title || T("kids.audioUntitled", "Untitled"),
                subtitle: entry.title && entry.titleTa && entry.title !== entry.titleTa ? entry.title : "",
                description: entry.descriptionTa || entry.description || ""
            };
        }
        return {
            title: entry.title || entry.titleTa || T("kids.audioUntitled", "Untitled"),
            subtitle: entry.titleTa && entry.title && entry.title !== entry.titleTa ? entry.titleTa : "",
            description: entry.description || entry.descriptionTa || ""
        };
    }

    function avatarTextFromEntry(entry) {
        var p = pickLang(entry);
        var base = String(p.title || "").trim();
        if (!base) {
            return "♪";
        }
        var parts = base.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
        }
        return base.slice(0, 2).toUpperCase();
    }

    function metaLine(entry) {
        return entry.durationLabel ? String(entry.durationLabel).trim() : "";
    }

    function secondaryLine(entry) {
        var p = pickLang(entry);
        if (p.subtitle) {
            return p.subtitle;
        }
        if (p.description) {
            return p.description.replace(/\s+/g, " ").trim().slice(0, 160);
        }
        return "";
    }

    function pauseOtherMedia() {
        try {
            var sermonEl = document.getElementById("sermon-audio");
            if (sermonEl && !sermonEl.paused) {
                sermonEl.pause();
            }
        } catch (e1) {}
        try {
            var bibleEl = document.getElementById("bible-stream-audio");
            if (bibleEl && !bibleEl.paused) {
                bibleEl.pause();
            }
        } catch (e2) {}
    }

    function fetchEntries() {
        return fetch(MANTLE_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("load");
                }
                return response.json().then(function (payload) {
                    if (Array.isArray(payload)) {
                        return payload;
                    }
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            });
    }

    function formatTime(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return "00:00";
        }
        var mins = Math.floor(seconds / 60);
        var secs = Math.floor(seconds % 60);
        var paddedSecs = secs < 10 ? "0" + secs : String(secs);
        return mins + ":" + paddedSecs;
    }

    function clearSleepTimer() {
        if (sleepTimerId) {
            window.clearTimeout(sleepTimerId);
            sleepTimerId = null;
        }
    }

    function setSleepNote(minutes) {
        if (!playerSleepNote) {
            return;
        }
        if (!minutes || minutes <= 0) {
            playerSleepNote.textContent = "";
            return;
        }
        playerSleepNote.textContent = (window.NjcI18n && typeof window.NjcI18n.formatCount === "function")
            ? window.NjcI18n.formatCount(T("sermons.sleepActive", "Stops in {count} min"), minutes)
            : ("Stops in " + minutes + " min");
    }

    function setSleepTimer(minutes) {
        clearSleepTimer();
        var mins = Number(minutes);
        if (!Number.isFinite(mins) || mins <= 0) {
            setSleepNote(0);
            return;
        }
        setSleepNote(mins);
        sleepTimerId = window.setTimeout(function () {
            audioEl.pause();
            if (playerSleep) {
                playerSleep.value = "0";
            }
            setSleepNote(0);
            sleepTimerId = null;
        }, mins * 60000);
    }

    function updatePlayerButtons() {
        var isPaused = audioEl.paused;
        var playIcon = isPaused ? "fa-play" : "fa-pause";
        var html = "<i class=\"fa-solid " + playIcon + "\"></i>";
        if (playerPlay) {
            playerPlay.innerHTML = html;
        }
        if (playerCenter) {
            playerCenter.innerHTML = html;
        }
        if (miniPlay) {
            miniPlay.innerHTML = html;
        }
    }

    function refreshPlayerTime() {
        var current = audioEl.currentTime || 0;
        var duration = audioEl.duration || 0;
        var percent = duration > 0 ? Math.round((current / duration) * 100) : 0;
        if (playerSeek) {
            playerSeek.value = String(percent);
        }
        var line = formatTime(current) + " / " + formatTime(duration);
        if (playerTime) {
            playerTime.textContent = line;
        }
        if (miniTime) {
            miniTime.textContent = line;
        }
    }

    function syncPlayerText() {
        if (currentIndex < 0 || currentIndex >= playlist.length) {
            return;
        }
        var entry = playlist[currentIndex];
        var p = pickLang(entry);
        if (playerTitle) {
            playerTitle.textContent = p.title;
        }
        if (playerSubtitle) {
            var sub = secondaryLine(entry);
            playerSubtitle.textContent = sub;
            playerSubtitle.hidden = !sub;
        }
        if (playerMeta) {
            var meta = metaLine(entry);
            playerMeta.textContent = meta;
            playerMeta.hidden = !meta;
        }
        if (miniTitle) {
            miniTitle.textContent = p.title;
        }
    }

    function openPlayer(index, autoplay) {
        if (index < 0 || index >= playlist.length) {
            return;
        }
        var entry = playlist[index];
        if (!entry || !isHttpsAudio(entry.audioUrl)) {
            return;
        }
        pauseOtherMedia();
        currentIndex = index;
        syncPlayerText();
        playerOverlay.hidden = false;
        if (miniPlayer) {
            miniPlayer.hidden = true;
        }
        document.body.classList.add("kids-audio-player-open");

        if (audioEl.src !== entry.audioUrl) {
            audioEl.src = entry.audioUrl;
            audioEl.load();
        }
        audioEl.playbackRate = playerSpeed ? Number(playerSpeed.value) || 1 : 1;

        if (autoplay) {
            audioEl.play().catch(function () {
                return null;
            });
        }
        updatePlayerButtons();
    }

    function minimizePlayer() {
        if (playerOverlay.hidden) {
            return;
        }
        playerOverlay.hidden = true;
        if (miniPlayer) {
            miniPlayer.hidden = false;
        }
        document.body.classList.remove("kids-audio-player-open");
        refreshPlayerTime();
        updatePlayerButtons();
    }

    function restorePlayer() {
        playerOverlay.hidden = false;
        if (miniPlayer) {
            miniPlayer.hidden = true;
        }
        document.body.classList.add("kids-audio-player-open");
        refreshPlayerTime();
    }

    function closePlayer() {
        audioEl.pause();
        clearSleepTimer();
        if (playerSleep) {
            playerSleep.value = "0";
        }
        setSleepNote(0);
        playerOverlay.hidden = true;
        if (miniPlayer) {
            miniPlayer.hidden = true;
        }
        document.body.classList.remove("kids-audio-player-open");
        audioEl.removeAttribute("src");
        try {
            audioEl.load();
        } catch (e) {}
        currentIndex = -1;
        updatePlayerButtons();
    }

    function playAdjacent(delta) {
        if (!playlist.length) {
            return;
        }
        var next = currentIndex + delta;
        if (next < 0) {
            next = playlist.length - 1;
        }
        if (next >= playlist.length) {
            next = 0;
        }
        openPlayer(next, true);
    }

    function togglePlayPause() {
        if (!audioEl.src && playlist.length) {
            openPlayer(0, true);
            return;
        }
        if (audioEl.paused) {
            pauseOtherMedia();
            audioEl.play().catch(function () {
                return null;
            });
        } else {
            audioEl.pause();
        }
        updatePlayerButtons();
    }

    function renderList() {
        if (!playlist.length) {
            listEl.innerHTML = "";
            listEl.hidden = true;
            return;
        }
        listEl.hidden = false;
        var playAria = escapeHtml(T("kids.audioPlayThis", "Play"));
        listEl.innerHTML = playlist.map(function (entry, index) {
            var p = pickLang(entry);
            var titleLine = escapeHtml(p.title);
            var meta = metaLine(entry);
            var metaHtml = escapeHtml(meta);
            var cover = String(entry.coverImageUrl || "").trim();
            var useImg = isLikelyImageUrl(cover);
            var avatar = escapeHtml(avatarTextFromEntry(entry));
            var thumbInner = useImg
                ? ("<img class=\"kids-audio-thumb-img\" src=\"" + escapeHtml(cover) + "\" alt=\"\" loading=\"lazy\" decoding=\"async\" />")
                : ("<span class=\"kids-audio-thumb-fallback\" aria-hidden=\"true\">" + avatar + "</span>");
            return "" +
                "<li class=\"kids-audio-row\">" +
                "  <div class=\"kids-audio-row-inner kids-audio-row-click\" role=\"button\" tabindex=\"0\" data-kids-audio-index=\"" + index + "\">" +
                "    <div class=\"kids-audio-thumb\">" + thumbInner + "</div>" +
                "    <div class=\"kids-audio-row-text\">" +
                "      <span class=\"kids-audio-row-title\">" + titleLine + "</span>" +
                (metaHtml ? ("<span class=\"kids-audio-row-meta\">" + metaHtml + "</span>") : "") +
                "    </div>" +
                "    <button type=\"button\" class=\"kids-audio-play-btn\" data-kids-audio-index=\"" + index + "\" aria-label=\"" + playAria + "\">" +
                "      <i class=\"fa-solid fa-circle-play\" aria-hidden=\"true\"></i>" +
                "    </button>" +
                "  </div>" +
                "</li>";
        }).join("");
    }

    function applyRows(rows) {
        playlist = rows.map(function (r, i) {
            return normalizeRow(r, i);
        }).filter(function (e) {
            return e && isHttpsAudio(e.audioUrl);
        });
        playlist.sort(function (a, b) {
            var ao = Number(a.sortOrder) || 0;
            var bo = Number(b.sortOrder) || 0;
            if (ao !== bo) {
                return ao - bo;
            }
            return String(a.title || "").localeCompare(String(b.title || ""));
        });
        renderList();
    }

    function setStatus(key, fallback, isError) {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = false;
        statusEl.textContent = T(key, fallback);
        statusEl.dataset.state = isError ? "error" : "";
    }

    function clearStatus() {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.dataset.state = "";
    }

    function loadKidsAudios() {
        if (inflight) {
            return inflight;
        }
        clearStatus();
        listEl.innerHTML = "";
        listEl.hidden = true;
        setStatus("kids.audioLoading", "Loading audio list…", false);
        inflight = fetchEntries()
            .then(function (raw) {
                applyRows(Array.isArray(raw) ? raw : []);
                clearStatus();
                if (!playlist.length) {
                    setStatus("kids.audioEmpty", "No audio yet. Your church can add links in the admin dashboard.", false);
                }
            })
            .catch(function () {
                playlist = [];
                renderList();
                setStatus("kids.audioError", "Could not load audio. Try again later.", true);
            })
            .finally(function () {
                inflight = null;
            });
        return inflight;
    }

    function openFromRow(row) {
        if (!row) {
            return;
        }
        var idx = Number(row.getAttribute("data-kids-audio-index"));
        if (Number.isNaN(idx)) {
            return;
        }
        openPlayer(idx, true);
    }

    if (listEl) {
        listEl.addEventListener("click", function (event) {
            var btn = event.target.closest(".kids-audio-play-btn");
            if (btn && listEl.contains(btn)) {
                event.preventDefault();
                event.stopPropagation();
                openFromRow(btn);
                return;
            }
            var row = event.target.closest(".kids-audio-row-click");
            openFromRow(row);
        });
        listEl.addEventListener("keydown", function (event) {
            if (event.key !== "Enter" && event.key !== " ") {
                return;
            }
            var row = event.target.closest(".kids-audio-row-click");
            if (!row || !listEl.contains(row)) {
                return;
            }
            event.preventDefault();
            openFromRow(row);
        });
    }

    if (playerBackdrop) {
        playerBackdrop.addEventListener("click", closePlayer);
    }
    if (playerCloseBtn) {
        playerCloseBtn.addEventListener("click", closePlayer);
    }
    if (playerMinimize) {
        playerMinimize.addEventListener("click", minimizePlayer);
    }
    if (playerWheelMenu) {
        playerWheelMenu.addEventListener("click", closePlayer);
    }
    if (playerPrev) {
        playerPrev.addEventListener("click", function () {
            playAdjacent(-1);
        });
    }
    if (playerNext) {
        playerNext.addEventListener("click", function () {
            playAdjacent(1);
        });
    }
    if (playerPlay) {
        playerPlay.addEventListener("click", togglePlayPause);
    }
    if (playerCenter) {
        playerCenter.addEventListener("click", togglePlayPause);
    }
    if (playerSeek) {
        playerSeek.addEventListener("input", function () {
            var duration = audioEl.duration || 0;
            if (duration <= 0) {
                return;
            }
            var nextTime = (Number(playerSeek.value) / 100) * duration;
            audioEl.currentTime = nextTime;
            refreshPlayerTime();
        });
    }
    if (playerSpeed) {
        playerSpeed.addEventListener("change", function () {
            audioEl.playbackRate = Number(playerSpeed.value) || 1;
        });
    }
    if (playerSleep) {
        playerSleep.addEventListener("change", function () {
            setSleepTimer(Number(playerSleep.value));
        });
    }
    if (miniOpen) {
        miniOpen.addEventListener("click", restorePlayer);
    }
    if (miniPlay) {
        miniPlay.addEventListener("click", togglePlayPause);
    }
    if (miniClose) {
        miniClose.addEventListener("click", closePlayer);
    }

    audioEl.addEventListener("timeupdate", refreshPlayerTime);
    audioEl.addEventListener("loadedmetadata", refreshPlayerTime);
    audioEl.addEventListener("play", updatePlayerButtons);
    audioEl.addEventListener("pause", updatePlayerButtons);
    audioEl.addEventListener("ended", function () {
        playAdjacent(1);
    });

    document.addEventListener("njc:langchange", function () {
        if (playlist.length) {
            renderList();
            syncPlayerText();
            refreshPlayerTime();
            setSleepNote(Number(playerSleep && playerSleep.value));
        }
    });

    document.addEventListener("njc:admin-kids-audio-updated", function () {
        loadKidsAudios();
    });

    window.NjcKidsAudio = {
        load: loadKidsAudios,
        mantleUrl: MANTLE_URL,
        pause: function () {
            try {
                audioEl.pause();
            } catch (e) {}
        }
    };
})();
