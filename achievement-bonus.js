(function () {
    var READING_BONUS_POINTS_KEY = "njc_reading_bonus_points_v1";
    var SERMON_LISTENED_KEY = "njc_sermon_listened_award_v1";
    var BIBLE_MS_BANK_KEY = "njc_bible_reader_ms_bank_v1";
    var SERMON_LISTEN_POINTS = 10;
    var BIBLE_MS_PER_POINT = 60000;
    var TICK_MS = 10000;

    function getTriviaUserId() {
        var user = window.NjcAuth && typeof window.NjcAuth.getUser === "function" ? window.NjcAuth.getUser() : null;
        if (user && user.uid) {
            return "u:" + String(user.uid);
        }
        try {
            var gid = window.localStorage.getItem("njc_trivia_guest_id_v1");
            if (gid) {
                return "g:" + gid;
            }
            gid = "guest-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
            window.localStorage.setItem("njc_trivia_guest_id_v1", gid);
            return "g:" + gid;
        } catch (e) {
            return "anon";
        }
    }

    function addBonusFallback(delta) {
        var d = Number(delta) || 0;
        if (d <= 0) {
            return;
        }
        var uid = getTriviaUserId();
        try {
            var raw = window.localStorage.getItem(READING_BONUS_POINTS_KEY);
            var data = raw ? JSON.parse(raw) : {};
            data[uid] = (Number(data[uid]) || 0) + d;
            window.localStorage.setItem(READING_BONUS_POINTS_KEY, JSON.stringify(data));
        } catch (e) {
            return null;
        }
        if (window.NjcReadingPoints && typeof window.NjcReadingPoints.recalc === "function") {
            window.NjcReadingPoints.recalc();
        }
        return null;
    }

    function addBonus(delta) {
        if (window.NjcReadingPoints && typeof window.NjcReadingPoints.addBonus === "function") {
            window.NjcReadingPoints.addBonus(delta);
        } else {
            addBonusFallback(delta);
        }
    }

    function sermonStorageKey(uid, audioUrl) {
        return String(uid || "") + "|" + String(audioUrl || "");
    }

    function wasSermonAlreadyAwarded(uid, audioUrl) {
        try {
            var raw = window.localStorage.getItem(SERMON_LISTENED_KEY);
            var data = raw ? JSON.parse(raw) : {};
            return Boolean(data[sermonStorageKey(uid, audioUrl)]);
        } catch (e) {
            return false;
        }
    }

    function markSermonAwarded(uid, audioUrl) {
        try {
            var raw = window.localStorage.getItem(SERMON_LISTENED_KEY);
            var data = raw ? JSON.parse(raw) : {};
            data[sermonStorageKey(uid, audioUrl)] = 1;
            window.localStorage.setItem(SERMON_LISTENED_KEY, JSON.stringify(data));
        } catch (e) {
            return null;
        }
        return null;
    }

    document.addEventListener("njc:sermon-listen-complete", function (ev) {
        var detail = ev && ev.detail ? ev.detail : {};
        var audioUrl = String(detail.audioUrl || "").trim();
        var duration = Number(detail.duration) || 0;
        var currentTime = Number(detail.currentTime) || 0;
        if (!audioUrl || duration <= 0) {
            return;
        }
        if (currentTime < duration * 0.92) {
            return;
        }
        var uid = getTriviaUserId();
        if (wasSermonAlreadyAwarded(uid, audioUrl)) {
            return;
        }
        markSermonAwarded(uid, audioUrl);
        addBonus(SERMON_LISTEN_POINTS);
        if (window.NjcEvents && typeof window.NjcEvents.showToast === "function") {
            window.NjcEvents.showToast("+10 reading points — sermon completed");
        }
    });

    function loadMsBank(uid) {
        try {
            var raw = window.localStorage.getItem(BIBLE_MS_BANK_KEY);
            var data = raw ? JSON.parse(raw) : {};
            var v = Number(data[String(uid || "")]) || 0;
            return Math.max(0, v);
        } catch (e) {
            return 0;
        }
    }

    function saveMsBank(uid, ms) {
        try {
            var raw = window.localStorage.getItem(BIBLE_MS_BANK_KEY);
            var data = raw ? JSON.parse(raw) : {};
            data[String(uid || "")] = Math.max(0, Math.floor(Number(ms) || 0));
            window.localStorage.setItem(BIBLE_MS_BANK_KEY, JSON.stringify(data));
        } catch (e) {
            return null;
        }
        return null;
    }

    var bibleIntervalId = null;
    var bibleLastTick = 0;
    var bibleMsRemainder = 0;
    var bibleRouteActive = false;

    function applyBibleDwellDelta() {
        var uid = getTriviaUserId();
        var now = Date.now();
        var delta = bibleLastTick ? Math.min(now - bibleLastTick, 120000) : 0;
        bibleLastTick = now;
        if (delta > 0) {
            bibleMsRemainder += delta;
        }
        var whole = Math.floor(bibleMsRemainder / BIBLE_MS_PER_POINT);
        if (whole > 0) {
            bibleMsRemainder -= whole * BIBLE_MS_PER_POINT;
            addBonus(whole);
        }
        saveMsBank(uid, bibleMsRemainder);
    }

    function flushBibleDwellTick() {
        if (!bibleRouteActive) {
            return;
        }
        applyBibleDwellDelta();
    }

    function stopBibleDwell() {
        if (bibleIntervalId) {
            window.clearInterval(bibleIntervalId);
            bibleIntervalId = null;
        }
        if (bibleRouteActive) {
            applyBibleDwellDelta();
        }
        bibleRouteActive = false;
        bibleLastTick = 0;
    }

    function startBibleDwell() {
        var uid = getTriviaUserId();
        bibleMsRemainder = loadMsBank(uid);
        bibleRouteActive = true;
        bibleLastTick = Date.now();
        if (bibleIntervalId) {
            window.clearInterval(bibleIntervalId);
        }
        bibleIntervalId = window.setInterval(flushBibleDwellTick, TICK_MS);
    }

    document.addEventListener("njc:routechange", function (ev) {
        var route = ev && ev.detail && ev.detail.route ? ev.detail.route : "";
        if (route === "bible") {
            startBibleDwell();
        } else {
            stopBibleDwell();
        }
    });

    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            if (bibleRouteActive) {
                applyBibleDwellDelta();
            }
        } else if (bibleRouteActive) {
            bibleLastTick = Date.now();
        }
    });

    window.addEventListener("pagehide", function () {
        if (bibleRouteActive) {
            applyBibleDwellDelta();
        }
    });

    document.addEventListener("njc:authchange", function () {
        stopBibleDwell();
        var route = (window.location.hash || "").replace(/^#/, "").trim().toLowerCase();
        if (route === "bible") {
            startBibleDwell();
        }
    });

})();
