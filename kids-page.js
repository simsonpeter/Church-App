(function () {
    var memGrid = document.getElementById("kids-mem-grid");
    var memStatus = document.getElementById("kids-mem-status");
    var memRestart = document.getElementById("kids-mem-restart");
    var memLevelGroup = document.getElementById("kids-mem-level-group");
    var memDeckSelect = document.getElementById("kids-mem-deck");
    var memScoreLine = document.getElementById("kids-mem-score");
    var scrambleHint = document.getElementById("kids-scramble-hint");
    var scrambleLetters = document.getElementById("kids-scramble-letters");
    var scrambleBuild = document.getElementById("kids-scramble-build");
    var scrambleFeedback = document.getElementById("kids-scramble-feedback");
    var scrambleCheck = document.getElementById("kids-scramble-check");
    var scrambleNext = document.getElementById("kids-scramble-next");
    var wordLevelGroup = document.getElementById("kids-word-level-group");
    var wordScoreLine = document.getElementById("kids-word-score");
    var totalStarsLine = document.getElementById("kids-total-stars");
    var choiceQ = document.getElementById("kids-choice-q");
    var choiceList = document.getElementById("kids-choice-list");
    var choiceFeedback = document.getElementById("kids-choice-feedback");
    var pageCard = document.querySelector(".kids-page-card");
    var kidsTabsNav = document.getElementById("kids-tabs");
    if (!pageCard) {
        return;
    }

    var KIDS_TAB_IDS = ["games", "books", "audios", "videos"];
    var KIDS_TAB_STORAGE_KEY = "njc_kids_active_tab_v1";

    var KIDS_STARS_KEY = "njc_kids_stars_v1";
    var KIDS_MEM_BEST_KEY = "njc_kids_mem_best_stars";
    var MEM_DECKS = [
        ["\uD83C\uDF0A", "\uD83C\uDF5E", "\uD83D\uDC11", "\u271D\uFE0F", "\u2B50", "\uD83C\uDF33", "\uD83C\uDF32", "\uD83C\uDFF4", "\uD83C\uDDE7\uD83C\uDDEA"],
        ["\uD83C\uDFEB", "\uD83C\uDFB5", "\uD83C\uDFB8", "\uD83C\uDF85", "\uD83C\uDF81", "\uD83C\uDFF0", "\uD83C\uDFA4", "\uD83C\uDFBC", "\uD83C\uDFB6"],
        ["\uD83C\uDFDE\uFE0F", "\u26F4\uFE0F", "\u26FA", "\uD83D\uDEEB\uFE0F", "\u2708\uFE0F", "\uD83C\uDFF7\uFE0F", "\uD83D\uDCCD", "\uD83D\uDDFA\uFE0F", "\uD83D\uDEE3\uFE0F"]
    ];
    var MEM_LEVEL_PAIRS = [3, 4, 6];
    var WORD_EASY = (function () {
        var raw = ["GOD", "ONE", "JOY", "KING", "GIFT", "HOLY", "CROSS", "BLESS", "LORD", "LIFE", "PEACE", "ADAM", "EVE", "HEAVEN", "PROMISE", "SONG", "SING"];
        var s = {};
        var o = [];
        raw.forEach(function (w) {
            if (w && !s[w]) {
                s[w] = true;
                o.push(w);
            }
        });
        return o;
    })();
    var WORD_NORMAL = (function () {
        var raw = [
            "JESUS", "PRAY", "LOVE", "HOPE", "FAITH", "GRACE", "PEACE", "BIBLE", "PETER", "DAVID", "GOSPEL", "HONOR", "MERCY", "ANGEL", "EARTH", "SAVED", "EASTER", "CHURCH", "AMEN", "PSALM", "TRUTH", "TRUST", "JESSE", "BREAD", "WATER", "SHEEP", "LAMB", "KINGS", "QUEEN", "FLOCK", "CHILD", "ROMAN", "SHEM", "MOSES", "AARON", "JONAH", "JORDAN", "BETH", "SIMEON", "RUTH", "NOAH", "JOB", "JAMES", "JUDAH", "MARK", "JOHN", "PAUL", "ELIAS", "BLESS"
        ];
        var s = {};
        var o = [];
        raw.forEach(function (w) {
            if (w && !s[w]) {
                s[w] = true;
                o.push(w);
            }
        });
        return o;
    })();
    var WORD_HARD = (function () {
        var raw = [
            "CREATION", "FELLOWSHIP", "JERUSALEM", "BETHLEHEM", "DISCIPLES", "RESURRECTION", "NATHANAEL", "CARPENTER", "PARABLES", "NAZARETH", "JEREMIAH", "PHARISEE", "PENTECOST", "REVELATION", "HALLELUJAH", "GALATIANS", "HEBREWS", "BETHANY", "ABRAHAM", "BAPTISM", "DAMASCUS", "GALILEE", "GOMORRAH", "EPHESUS", "GENESIS", "JORDAN", "CANAAN", "SAMARITAN", "BETHSAIDA", "CAPERNAUM"
        ];
        var s = {};
        var o = [];
        raw.forEach(function (w) {
            if (w && w.length >= 6 && w.length < 16 && !s[w]) {
                s[w] = true;
                o.push(w);
            }
        });
        return o;
    })();

    var memState = {
        first: null,
        busy: false,
        pairsFound: 0,
        totalPairs: 4,
        list: [],
        memLevel: 1,
        deckId: 0
    };
    var memSessionStars = 0;
    var memGameBest = 0;

    var scrambleState = {
        word: "JESUS",
        pool: [],
        slots: [],
        wordLevel: 1,
        shuffledOrder: [],
        wordOrderIdx: 0,
        earnedThisWord: false,
        sessionSolved: 0,
        sessionRunStars: 0
    };
    var choiceRounds = [
        { q: "kids.choiceQ1", a: "kids.choiceA1", b: "kids.choiceB1" },
        { q: "kids.choiceQ2", a: "kids.choiceA2", b: "kids.choiceB2" },
        { q: "kids.choiceQ3", a: "kids.choiceA3", b: "kids.choiceB3" }
    ];
    var choiceState = { index: 0 };

    function T(key, fallback) {
        if (pageCard && window.NjcI18n && typeof window.NjcI18n.tForElement === "function") {
            return window.NjcI18n.tForElement(pageCard, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function getTotalStars() {
        try {
            return Math.max(0, parseInt(String(window.localStorage.getItem(KIDS_STARS_KEY) || "0"), 10) || 0);
        } catch (e) {
            return 0;
        }
    }

    function setTotalStars(n) {
        try {
            window.localStorage.setItem(KIDS_STARS_KEY, String(Math.max(0, n)));
        } catch (e) {}
    }

    function addStars(amt) {
        if (!amt || amt < 1) {
            return;
        }
        setTotalStars(getTotalStars() + Math.floor(amt));
        updateTotalStarsDisplay();
    }

    function updateTotalStarsDisplay() {
        if (!totalStarsLine) {
            return;
        }
        var n = String(getTotalStars());
        var t = T("kids.starsLine", "Your stars: {n}");
        totalStarsLine.textContent = t.indexOf("{n}") >= 0 ? t.replace("{n}", n) : ("Your stars: " + n);
    }

    function shuffledCopy(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = a[i];
            a[i] = a[j];
            a[j] = t;
        }
        return a;
    }

    function shuffledString(word) {
        var w = String(word);
        if (w.length < 2) {
            return w.split("");
        }
        var out;
        var safety = 0;
        do {
            out = shuffledCopy(w.split(""));
            safety += 1;
        } while (safety < 20 && out.join("") === w);
        return out;
    }

    function getWordListForLevel(lvl) {
        if (lvl <= 0) {
            return WORD_EASY;
        }
        if (lvl >= 2) {
            return WORD_HARD;
        }
        return WORD_NORMAL;
    }

    function getMemPairCount() {
        return MEM_LEVEL_PAIRS[memState.memLevel] != null
            ? MEM_LEVEL_PAIRS[memState.memLevel]
            : 4;
    }

    function drawMemEmojis() {
        var d = memState.deckId;
        if (d < 0 || d >= MEM_DECKS.length) {
            d = 0;
        }
        var all = MEM_DECKS[d] || MEM_DECKS[0];
        if (!all || !all.length) {
            return ["\u2B50", "\u271D\uFE0F", "\uD83C\uDF0A"];
        }
        var n = getMemPairCount();
        n = Math.min(n, all.length);
        return shuffledCopy(all).slice(0, n);
    }

    function setMemStatus(msg) {
        if (memStatus) {
            memStatus.textContent = msg;
        }
    }

    function updateMemScoreLine() {
        if (!memScoreLine) {
            return;
        }
        var t = T("kids.memScoreLine", "This round: {run} / Best: {best}");
        if (t.indexOf("{run}") < 0) {
            t = "This round: {run} / Best: {best}";
        }
        memScoreLine.textContent = t.replace("{run}", String(memSessionStars)).replace("{best}", String(memGameBest));
    }

    function loadMemBest() {
        try {
            return Math.max(0, parseInt(String(window.localStorage.getItem(KIDS_MEM_BEST_KEY) || "0"), 10) || 0);
        } catch (e) {
            return 0;
        }
    }

    function trySaveMemBest() {
        if (memSessionStars > memGameBest) {
            memGameBest = memSessionStars;
            try {
                window.localStorage.setItem(KIDS_MEM_BEST_KEY, String(memGameBest));
            } catch (e) {}
        }
    }

    function applyMemGridClass() {
        if (!memGrid) {
            return;
        }
        var n = getMemPairCount();
        var cards = n * 2;
        memGrid.setAttribute("data-mem-cols", cards >= 10 ? "4" : cards > 6 ? "4" : "3");
        if (n >= 6) {
            memGrid.classList.add("kids-mem-grid--tall");
        } else {
            memGrid.classList.remove("kids-mem-grid--tall");
        }
    }

    function startMemory() {
        if (!memGrid) {
            return;
        }
        if (memDeckSelect) {
            memState.deckId = parseInt(memDeckSelect.value || "0", 10) || 0;
        }
        memState.first = null;
        memState.busy = false;
        memState.pairsFound = 0;
        var syms = drawMemEmojis();
        memState.totalPairs = syms.length;
        memSessionStars = 0;
        var deck = [];
        for (var i = 0; i < syms.length; i += 1) {
            deck.push({ id: i, sym: syms[i] });
            deck.push({ id: i, sym: syms[i] });
        }
        deck = shuffledCopy(deck);
        memState.list = deck;
        memGrid.innerHTML = "";
        applyMemGridClass();
        updateMemScoreLine();
        setMemStatus(T("kids.memStatusStart", "Find all pairs to win."));
        deck.forEach(function (c, index) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "kids-mem-card";
            btn.setAttribute("data-kids-idx", String(index));
            var back = document.createElement("span");
            back.className = "kids-mem-card-back";
            back.textContent = "\uFF1F";
            var front = document.createElement("span");
            front.className = "kids-mem-card-face";
            front.textContent = c.sym;
            front.setAttribute("aria-hidden", "true");
            front.hidden = true;
            btn.appendChild(back);
            btn.appendChild(front);
            btn._kids = { open: false, off: false, pair: c.id, sym: c.sym, back: back, front: front, btn: btn };
            memGrid.appendChild(btn);
        });
    }

    function onMemClick(event) {
        if (memState.busy) {
            return;
        }
        var b = event.target && event.target.closest
            ? event.target.closest("button.kids-mem-card")
            : null;
        if (!b || !b._kids || b._kids.off) {
            return;
        }
        var c = b._kids;
        if (c.open) {
            return;
        }
        c.open = true;
        c.back.hidden = true;
        c.front.hidden = false;
        if (memState.first === null) {
            memState.first = b;
            return;
        }
        var aBtn = memState.first;
        memState.first = null;
        if (aBtn === b) {
            return;
        }
        if (aBtn._kids.pair === c.pair) {
            aBtn._kids.off = true;
            b._kids.off = true;
            aBtn.disabled = true;
            b.disabled = true;
            aBtn.classList.add("kids-mem-card--match");
            b.classList.add("kids-mem-card--match");
            memState.pairsFound += 1;
            var per = memState.memLevel + 1;
            addStars(per);
            memSessionStars += per;
            if (memSessionStars > memGameBest) {
                memGameBest = memSessionStars;
            }
            updateMemScoreLine();
            if (memState.pairsFound >= memState.totalPairs) {
                var base = 3 * (memState.memLevel + 1);
                addStars(base);
                trySaveMemBest();
                setMemStatus(T("kids.memWon", "You found every pair! Great work."));
            } else {
                setMemStatus(T("kids.memStatusGood", "Great! Keep going."));
            }
        } else {
            var ob = aBtn._kids;
            var nb = c;
            memState.busy = true;
            window.setTimeout(function () {
                ob.open = false;
                nb.open = false;
                ob.back.hidden = false;
                ob.front.hidden = true;
                nb.back.hidden = false;
                nb.front.hidden = true;
                memState.busy = false;
                setMemStatus(T("kids.memStatusTry", "Not a match. Try again."));
            }, 600);
        }
    }

    function buildWordShuffleOrder() {
        var list = getWordListForLevel(scrambleState.wordLevel);
        scrambleState.shuffledOrder = shuffledCopy(list.map(function (_x, i) { return i; }));
        scrambleState.wordOrderIdx = 0;
    }

    function pickNextWord() {
        var list = getWordListForLevel(scrambleState.wordLevel);
        if (!list || !list.length) {
            scrambleState.word = "GOD";
            return;
        }
        if (!scrambleState.shuffledOrder.length) {
            buildWordShuffleOrder();
        }
        var prev = scrambleState.word;
        var w = prev;
        var safety = 0;
        do {
            if (scrambleState.wordOrderIdx >= scrambleState.shuffledOrder.length) {
                buildWordShuffleOrder();
            }
            var listIdx = scrambleState.shuffledOrder[scrambleState.wordOrderIdx];
            scrambleState.wordOrderIdx += 1;
            w = list[listIdx] || w;
            safety += 1;
        } while (safety < 50 && w === prev && list.length > 1);
        scrambleState.word = w;
        scrambleState.earnedThisWord = false;
    }

    function updateWordScoreLine() {
        if (!wordScoreLine) {
            return;
        }
        var t = T("kids.wordScoreLine", "This run: {run} / Solved: {n}");
        wordScoreLine.textContent = t
            .replace("{run}", String(scrambleState.sessionRunStars))
            .replace("{n}", String(scrambleState.sessionSolved));
    }

    function renderScramble() {
        if (!scrambleLetters || !scrambleBuild) {
            return;
        }
        if (!scrambleState.shuffledOrder || !scrambleState.shuffledOrder.length) {
            buildWordShuffleOrder();
        }
        if (!scrambleState.word) {
            pickNextWord();
        }
        var w = scrambleState.word;
        scrambleState.slots = new Array(w.length);
        for (var i = 0; i < w.length; i += 1) {
            scrambleState.slots[i] = "";
        }
        scrambleState.pool = shuffledString(w);
        if (scrambleHint) {
            scrambleHint.textContent = T("kids.scrambleHint", "Fill the line in order. Tap a pool letter, then a line slot, or tap a full slot to put a letter back.");
        }
        if (scrambleFeedback) {
            scrambleFeedback.hidden = true;
        }
        redrawScramble();
    }

    function firstEmptySlot() {
        for (var i = 0; i < scrambleState.slots.length; i += 1) {
            if (!scrambleState.slots[i]) {
                return i;
            }
        }
        return -1;
    }

    function redrawScramble() {
        if (!scrambleLetters || !scrambleBuild) {
            return;
        }
        scrambleLetters.innerHTML = "";
        for (var p = 0; p < scrambleState.pool.length; p += 1) {
            (function (pi) {
                var ch = scrambleState.pool[pi];
                if (ch === null) {
                    return;
                }
                var btn = document.createElement("button");
                btn.type = "button";
                btn.className = "kids-shuffle-letter";
                btn.setAttribute("data-pi", String(pi));
                btn.appendChild(document.createTextNode(ch));
                btn.addEventListener("click", function () {
                    var u = firstEmptySlot();
                    if (u < 0) {
                        return;
                    }
                    scrambleState.slots[u] = ch;
                    scrambleState.pool[pi] = null;
                    redrawScramble();
                });
                scrambleLetters.appendChild(btn);
            })(p);
        }
        scrambleBuild.innerHTML = "";
        for (var s = 0; s < scrambleState.slots.length; s += 1) {
            (function (si) {
                var slotB = document.createElement("button");
                slotB.type = "button";
                slotB.className = "kids-shuffle-slot";
                slotB.setAttribute("data-si", String(si));
                var t = scrambleState.slots[si] || "\u00A0";
                slotB.appendChild(document.createTextNode(t));
                slotB.addEventListener("click", function () {
                    if (!scrambleState.slots[si]) {
                        return;
                    }
                    for (var k = 0; k < scrambleState.pool.length; k += 1) {
                        if (scrambleState.pool[k] === null) {
                            scrambleState.pool[k] = scrambleState.slots[si];
                            scrambleState.slots[si] = "";
                            redrawScramble();
                            return;
                        }
                    }
                });
                scrambleBuild.appendChild(slotB);
            })(s);
        }
    }

    function checkScramble() {
        if (!scrambleFeedback) {
            return;
        }
        var s = scrambleState.slots.join("");
        if (s === scrambleState.word) {
            scrambleFeedback.textContent = T("kids.scrambleOk", "Yes! You spelled the word.");
            scrambleFeedback.className = "page-note kids-feedback-good";
            if (!scrambleState.earnedThisWord) {
                var pts = scrambleState.wordLevel + 1;
                addStars(pts);
                scrambleState.sessionRunStars += pts;
                scrambleState.sessionSolved += 1;
                scrambleState.earnedThisWord = true;
                updateWordScoreLine();
            }
        } else {
            scrambleFeedback.textContent = T("kids.scrambleBad", "Not yet. Fill all boxes, or use Next for a new word.");
            scrambleFeedback.className = "page-note kids-feedback-bad";
        }
        scrambleFeedback.hidden = false;
    }

    function nextScramble() {
        pickNextWord();
        if (scrambleFeedback) {
            scrambleFeedback.hidden = true;
        }
        renderScramble();
    }

    function renderChoiceRound() {
        if (!choiceQ || !choiceList) {
            return;
        }
        var r = choiceRounds[choiceState.index % choiceRounds.length];
        choiceQ.setAttribute("data-i18n", r.q);
        choiceQ.textContent = T(r.q, choiceQ.textContent);
        choiceList.innerHTML = "";
        if (choiceFeedback) {
            choiceFeedback.hidden = true;
        }
        [["a", 1, r.a], ["b", 0, r.b]].forEach(function (x) {
            var li = document.createElement("li");
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "button-link button-secondary kids-choice-btn";
            btn.setAttribute("data-correct", x[1] ? "1" : "0");
            btn.setAttribute("data-i18n", x[2]);
            btn.textContent = T(x[2], btn.textContent);
            li.appendChild(btn);
            choiceList.appendChild(li);
        });
    }

    function onChoiceClick(event) {
        var b = event.target && event.target.closest
            ? event.target.closest("button.kids-choice-btn")
            : null;
        if (!b || !choiceFeedback) {
            return;
        }
        if (b.getAttribute("data-correct") === "1") {
            choiceFeedback.textContent = T("kids.choiceRight", "That sounds like the kind of choice Jesus would be pleased with.");
            choiceFeedback.className = "page-note kids-feedback-good";
            addStars(1);
        } else {
            choiceFeedback.textContent = T("kids.choiceOther", "Another answer might be better. Talk about it with a parent or leader.");
            choiceFeedback.className = "page-note kids-feedback-bad";
        }
        choiceFeedback.hidden = false;
    }

    function resetWordRun() {
        scrambleState.sessionSolved = 0;
        scrambleState.sessionRunStars = 0;
        buildWordShuffleOrder();
        updateWordScoreLine();
    }

    function syncMemLevelUI() {
        if (!memLevelGroup) {
            return;
        }
        memLevelGroup.querySelectorAll("[data-mem-level]").forEach(function (el) {
            var lv = parseInt(el.getAttribute("data-mem-level") || "0", 10);
            var on = lv === memState.memLevel;
            el.classList.toggle("active", on);
            el.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    function syncWordLevelUI() {
        if (!wordLevelGroup) {
            return;
        }
        wordLevelGroup.querySelectorAll("[data-word-level]").forEach(function (el) {
            var lv = parseInt(el.getAttribute("data-word-level") || "0", 10);
            var on = lv === scrambleState.wordLevel;
            el.classList.toggle("active", on);
            el.setAttribute("aria-pressed", on ? "true" : "false");
        });
    }

    if (memLevelGroup) {
        memLevelGroup.addEventListener("click", function (event) {
            var t = event.target && event.target.closest
                ? event.target.closest("button[data-mem-level]")
                : null;
            if (!t) {
                return;
            }
            memState.memLevel = parseInt(t.getAttribute("data-mem-level") || "1", 10);
            if (memState.memLevel < 0) {
                memState.memLevel = 0;
            }
            if (memState.memLevel > 2) {
                memState.memLevel = 2;
            }
            syncMemLevelUI();
            startMemory();
        });
    }
    if (memDeckSelect) {
        memDeckSelect.addEventListener("change", function () {
            startMemory();
        });
    }
    if (wordLevelGroup) {
        wordLevelGroup.addEventListener("click", function (event) {
            var t = event.target && event.target.closest
                ? event.target.closest("button[data-word-level]")
                : null;
            if (!t) {
                return;
            }
            scrambleState.wordLevel = parseInt(t.getAttribute("data-word-level") || "1", 10);
            if (scrambleState.wordLevel < 0) {
                scrambleState.wordLevel = 0;
            }
            if (scrambleState.wordLevel > 2) {
                scrambleState.wordLevel = 2;
            }
            syncWordLevelUI();
            resetWordRun();
            pickNextWord();
            if (scrambleFeedback) {
                scrambleFeedback.hidden = true;
            }
            renderScramble();
        });
    }
    if (memGrid) {
        memGrid.addEventListener("click", onMemClick);
    }
    if (memRestart) {
        memRestart.addEventListener("click", startMemory);
    }
    if (scrambleCheck) {
        scrambleCheck.addEventListener("click", checkScramble);
    }
    if (scrambleNext) {
        scrambleNext.addEventListener("click", nextScramble);
    }
    if (choiceList) {
        choiceList.addEventListener("click", onChoiceClick);
    }
    if (choiceQ) {
        choiceQ.addEventListener("dblclick", function () {
            choiceState.index = (choiceState.index + 1) % choiceRounds.length;
            renderChoiceRound();
        });
    }

    function boot() {
        memGameBest = loadMemBest();
        syncMemLevelUI();
        syncWordLevelUI();
        updateTotalStarsDisplay();
        resetWordRun();
        pickNextWord();
        renderScramble();
        startMemory();
        renderChoiceRound();
    }

    function normalizeKidsTabId(raw) {
        var s = String(raw || "").toLowerCase().trim();
        if (KIDS_TAB_IDS.indexOf(s) >= 0) {
            return s;
        }
        return "games";
    }

    function readKidsTabFromHash() {
        try {
            if (window.NjcSpaRouter && typeof window.NjcSpaRouter.splitHashRoute === "function") {
                var p = window.NjcSpaRouter.splitHashRoute();
                var sub = (p && p.subPath) ? String(p.subPath).split("/")[0].toLowerCase().trim() : "";
                if (sub) {
                    return normalizeKidsTabId(sub);
                }
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    function rememberKidsTab(tabId) {
        try {
            window.localStorage.setItem(KIDS_TAB_STORAGE_KEY, tabId);
        } catch (e1) {
            return null;
        }
    }

    function recallKidsTab() {
        try {
            return normalizeKidsTabId(window.localStorage.getItem(KIDS_TAB_STORAGE_KEY));
        } catch (e2) {
            return "games";
        }
    }

    function setKidsHashForTab(tabId) {
        var id = normalizeKidsTabId(tabId);
        var next = id === "games" ? "#kids" : "#kids/" + id;
        try {
            if (String(window.location.hash || "") === next) {
                return;
            }
            window.history.replaceState(null, "", next);
        } catch (e3) {
            return null;
        }
    }

    function applyKidsTab(tabId, options) {
        var opts = options || {};
        var id = normalizeKidsTabId(tabId);
        if (!kidsTabsNav) {
            return;
        }
        var buttons = kidsTabsNav.querySelectorAll(".kids-tab[data-kids-tab]");
        var panels = pageCard.querySelectorAll(".kids-tab-panel");
        buttons.forEach(function (btn) {
            var bid = btn.getAttribute("data-kids-tab");
            var on = bid === id;
            btn.classList.toggle("active", on);
            btn.setAttribute("aria-selected", on ? "true" : "false");
        });
        panels.forEach(function (panel) {
            var pid = panel.id.replace(/^kids-panel-/, "");
            var show = pid === id;
            panel.classList.toggle("active", show);
            panel.hidden = !show;
        });
        if (!opts.skipHash) {
            setKidsHashForTab(id);
        }
        rememberKidsTab(id);
        if (id === "books" && window.NjcLibrary && typeof window.NjcLibrary.loadKidsShelf === "function") {
            window.NjcLibrary.loadKidsShelf();
        }
    }

    function initKidsTabs() {
        if (!kidsTabsNav) {
            return;
        }
        kidsTabsNav.addEventListener("click", function (event) {
            var btn = event.target && event.target.closest
                ? event.target.closest("button[data-kids-tab]")
                : null;
            if (!btn || !kidsTabsNav.contains(btn)) {
                return;
            }
            event.preventDefault();
            applyKidsTab(btn.getAttribute("data-kids-tab"));
        });
        document.addEventListener("njc:routechange", function (event) {
            var d = (event && event.detail) || {};
            if ((d.route || "").toLowerCase() !== "kids") {
                return;
            }
            var fromHash = readKidsTabFromHash();
            applyKidsTab(fromHash || recallKidsTab(), { skipHash: true });
            var tabId = fromHash || recallKidsTab();
            if ((tabId || "games") === "books" && window.NjcLibrary && typeof window.NjcLibrary.loadKidsShelf === "function") {
                window.NjcLibrary.loadKidsShelf();
            }
        });
        window.addEventListener("hashchange", function () {
            try {
                if (window.NjcSpaRouter && typeof window.NjcSpaRouter.getRouteFromHash === "function"
                    && window.NjcSpaRouter.getRouteFromHash() !== "kids") {
                    return;
                }
            } catch (e4) {
                return;
            }
            var fromHash = readKidsTabFromHash();
            applyKidsTab(fromHash || "games", { skipHash: true });
        });
        var initial = readKidsTabFromHash() || recallKidsTab();
        applyKidsTab(initial, { skipHash: Boolean(readKidsTabFromHash()) });
    }

    document.addEventListener("njc:cardlangchange", function (event) {
        if (!pageCard) {
            return;
        }
        if (event && event.target && (event.target === pageCard || (pageCard.contains && pageCard.contains(event.target)))) {
            setMemStatus(T("kids.memStatusStart", "Find all pairs to win."));
            if (scrambleHint) {
                scrambleHint.textContent = T("kids.scrambleHint", "Fill the line in order. Tap a pool letter, then a line slot, or tap a full slot to put a letter back.");
            }
            if (scrambleFeedback) {
                scrambleFeedback.hidden = true;
            }
            updateMemScoreLine();
            updateWordScoreLine();
            updateTotalStarsDisplay();
            renderScramble();
            renderChoiceRound();
        }
    });
    boot();
    initKidsTabs();
})();
