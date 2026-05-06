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
    var quizQuestionEl = document.getElementById("kids-quiz-question");
    var quizChoicesEl = document.getElementById("kids-quiz-choices");
    var quizFeedbackEl = document.getElementById("kids-quiz-feedback");
    var quizNextBtn = document.getElementById("kids-quiz-next");
    var tfStatementEl = document.getElementById("kids-tf-statement");
    var tfTrueBtn = document.getElementById("kids-tf-true");
    var tfFalseBtn = document.getElementById("kids-tf-false");
    var tfFeedbackEl = document.getElementById("kids-tf-feedback");
    var tfNextBtn = document.getElementById("kids-tf-next");
    var orderStoryEl = document.getElementById("kids-order-story");
    var orderStepsEl = document.getElementById("kids-order-steps");
    var orderFeedbackEl = document.getElementById("kids-order-feedback");
    var orderResetBtn = document.getElementById("kids-order-reset");
    var orderNextBtn = document.getElementById("kids-order-next");
    var totalStarsLine = document.getElementById("kids-total-stars");
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

    /** Multiple-choice Bible trivia (i18n keys + English fallbacks). */
    var KIDS_QUIZ_BANK = [
        {
            qKey: "kids.quizQ1",
            qFb: "Who built a big boat because God asked him to?",
            opts: [
                { k: "kids.quizQ1a", fb: "Noah", ok: true },
                { k: "kids.quizQ1b", fb: "Jonah", ok: false },
                { k: "kids.quizQ1c", fb: "Samson", ok: false }
            ]
        },
        {
            qKey: "kids.quizQ2",
            qFb: "Who was thrown into a lions’ den but God kept him safe?",
            opts: [
                { k: "kids.quizQ2a", fb: "Daniel", ok: true },
                { k: "kids.quizQ2b", fb: "Paul", ok: false },
                { k: "kids.quizQ2c", fb: "Peter", ok: false }
            ]
        },
        {
            qKey: "kids.quizQ3",
            qFb: "What did David use to beat Goliath?",
            opts: [
                { k: "kids.quizQ3a", fb: "A sling and a stone", ok: true },
                { k: "kids.quizQ3b", fb: "A sword only", ok: false },
                { k: "kids.quizQ3c", fb: "A big shield", ok: false }
            ]
        },
        {
            qKey: "kids.quizQ4",
            qFb: "How many days was Jesus in the tomb before He rose again?",
            opts: [
                { k: "kids.quizQ4a", fb: "Three days", ok: true },
                { k: "kids.quizQ4b", fb: "One day", ok: false },
                { k: "kids.quizQ4c", fb: "Seven days", ok: false }
            ]
        },
        {
            qKey: "kids.quizQ5",
            qFb: "Who led God’s people through the sea?",
            opts: [
                { k: "kids.quizQ5a", fb: "Moses", ok: true },
                { k: "kids.quizQ5b", fb: "Joshua", ok: false },
                { k: "kids.quizQ5c", fb: "Joseph", ok: false }
            ]
        },
        {
            qKey: "kids.quizQ6",
            qFb: "What is the first book of the Bible?",
            opts: [
                { k: "kids.quizQ6a", fb: "Genesis", ok: true },
                { k: "kids.quizQ6b", fb: "Matthew", ok: false },
                { k: "kids.quizQ6c", fb: "Psalms", ok: false }
            ]
        }
    ];

    var quizState = { order: [], idx: 0, locked: false };

    var KIDS_TF_BANK = [
        { key: "kids.tfS1", fb: "Jesus welcomed children and blessed them.", truth: true },
        { key: "kids.tfS2", fb: "The wise men brought gifts to baby Moses.", truth: false },
        { key: "kids.tfS3", fb: "Jesus fed thousands with bread and fish.", truth: true },
        { key: "kids.tfS4", fb: "Jonah stayed inside the big fish for only one hour.", truth: false },
        { key: "kids.tfS5", fb: "David wrote many psalms.", truth: true },
        { key: "kids.tfS6", fb: "The prodigal son story teaches that God loves us when we turn back to Him.", truth: true }
    ];

    var tfState = { order: [], idx: 0, locked: false };
    var currentTf = null;

    var KIDS_ORDER_BANK = [
        {
            titleKey: "kids.orderT1",
            titleFb: "Creation — light first",
            steps: [
                { key: "kids.orderT1s1", fb: "God said, “Let there be light.”" },
                { key: "kids.orderT1s2", fb: "God separated light from darkness." },
                { key: "kids.orderT1s3", fb: "Evening and morning — day one." }
            ]
        },
        {
            titleKey: "kids.orderT2",
            titleFb: "Daniel and the lions",
            steps: [
                { key: "kids.orderT2s1", fb: "Daniel prayed to God." },
                { key: "kids.orderT2s2", fb: "He was put in the lions’ den." },
                { key: "kids.orderT2s3", fb: "God shut the lions’ mouths; Daniel was safe." }
            ]
        },
        {
            titleKey: "kids.orderT3",
            titleFb: "Good Samaritan (kind neighbour)",
            steps: [
                { key: "kids.orderT3s1", fb: "A man was hurt on the road." },
                { key: "kids.orderT3s2", fb: "A kind stranger stopped to help." },
                { key: "kids.orderT3s3", fb: "He cared for him — Jesus tells us to love others too." }
            ]
        },
        {
            titleKey: "kids.orderT4",
            titleFb: "Zacchaeus meets Jesus",
            steps: [
                { key: "kids.orderT4s1", fb: "Zacchaeus climbed a tree to see Jesus." },
                { key: "kids.orderT4s2", fb: "Jesus said He would visit his home." },
                { key: "kids.orderT4s3", fb: "Zacchaeus chose to make things right and follow Jesus." }
            ]
        }
    ];

    var orderState = {
        storyOrder: [],
        storyIdx: 0,
        expect: 0,
        locked: false,
        currentStory: null
    };

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

    function buildQuizOrder() {
        quizState.order = shuffledCopy(KIDS_QUIZ_BANK.map(function (_r, i) { return i; }));
        quizState.idx = 0;
        quizState.locked = false;
    }

    function pickNextQuiz() {
        if (!quizState.order.length || quizState.idx >= quizState.order.length) {
            buildQuizOrder();
        }
        var bankIdx = quizState.order[quizState.idx];
        quizState.idx += 1;
        return KIDS_QUIZ_BANK[bankIdx];
    }

    function renderQuiz() {
        if (!quizQuestionEl || !quizChoicesEl) {
            return;
        }
        var item = pickNextQuiz();
        if (!item) {
            return;
        }
        quizState.locked = false;
        if (quizFeedbackEl) {
            quizFeedbackEl.hidden = true;
            quizFeedbackEl.textContent = "";
        }
        quizQuestionEl.textContent = T(item.qKey, item.qFb);
        var opts = shuffledCopy(item.opts.slice());
        quizChoicesEl.innerHTML = "";
        opts.forEach(function (opt) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "button-link kids-quiz-choice";
            btn.setAttribute("data-correct", opt.ok ? "1" : "0");
            btn.textContent = T(opt.k, opt.fb);
            btn.addEventListener("click", function () {
                if (quizState.locked || !quizFeedbackEl) {
                    return;
                }
                quizState.locked = true;
                var correct = btn.getAttribute("data-correct") === "1";
                if (correct) {
                    quizFeedbackEl.textContent = T("kids.quizRight", "That’s right!");
                    quizFeedbackEl.className = "page-note kids-feedback-good";
                    addStars(2);
                } else {
                    quizFeedbackEl.textContent = T("kids.quizWrong", "Not quite — try the next question!");
                    quizFeedbackEl.className = "page-note kids-feedback-bad";
                }
                quizFeedbackEl.hidden = false;
            });
            quizChoicesEl.appendChild(btn);
        });
    }

    function buildTfOrder() {
        tfState.order = shuffledCopy(KIDS_TF_BANK.map(function (_r, i) { return i; }));
        tfState.idx = 0;
        tfState.locked = false;
    }

    function pickNextTf() {
        if (!tfState.order.length || tfState.idx >= tfState.order.length) {
            buildTfOrder();
        }
        var bankIdx = tfState.order[tfState.idx];
        tfState.idx += 1;
        currentTf = KIDS_TF_BANK[bankIdx];
        return currentTf;
    }

    function renderTf() {
        if (!tfStatementEl) {
            return;
        }
        pickNextTf();
        tfState.locked = false;
        if (tfFeedbackEl) {
            tfFeedbackEl.hidden = true;
        }
        if (currentTf) {
            tfStatementEl.textContent = T(currentTf.key, currentTf.fb);
        }
    }

    function answerTf(userTrue) {
        if (tfState.locked || !currentTf || !tfFeedbackEl) {
            return;
        }
        tfState.locked = true;
        var ok = userTrue === currentTf.truth;
        if (ok) {
            tfFeedbackEl.textContent = T("kids.tfRight", "Yes, that’s right!");
            tfFeedbackEl.className = "page-note kids-feedback-good";
            addStars(1);
        } else {
            tfFeedbackEl.textContent = T("kids.tfWrong", "Good try! The answer was the other one.");
            tfFeedbackEl.className = "page-note kids-feedback-bad";
        }
        tfFeedbackEl.hidden = false;
    }

    function buildOrderStoryOrder() {
        orderState.storyOrder = shuffledCopy(KIDS_ORDER_BANK.map(function (_r, i) { return i; }));
        orderState.storyIdx = 0;
    }

    function advanceOrderStory() {
        if (!orderState.storyOrder.length || orderState.storyIdx >= orderState.storyOrder.length) {
            buildOrderStoryOrder();
            orderState.storyIdx = 0;
        }
        var bankIdx = orderState.storyOrder[orderState.storyIdx];
        orderState.storyIdx += 1;
        orderState.currentStory = KIDS_ORDER_BANK[bankIdx];
    }

    function buildOrderStepsFromStory(story) {
        if (!story || !orderStoryEl || !orderStepsEl) {
            return;
        }
        orderState.locked = false;
        orderState.expect = 1;
        if (orderFeedbackEl) {
            orderFeedbackEl.hidden = true;
        }
        orderStoryEl.textContent = T(story.titleKey, story.titleFb);
        var labels = story.steps.map(function (step, i) {
            return { n: i + 1, text: T(step.key, step.fb) };
        });
        var perm = shuffledCopy(labels.map(function (x) { return x.n; }));
        orderStepsEl.innerHTML = "";
        perm.forEach(function (num) {
            var lab = labels[num - 1];
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "kids-order-step-btn";
            btn.setAttribute("data-step-n", String(lab.n));
            btn.appendChild(document.createTextNode(lab.text));
            btn.addEventListener("click", function () {
                if (orderState.locked) {
                    return;
                }
                var n = parseInt(btn.getAttribute("data-step-n") || "0", 10);
                if (n !== orderState.expect) {
                    orderState.locked = true;
                    if (orderFeedbackEl) {
                        orderFeedbackEl.textContent = T("kids.orderWrong", "Oops — tap Try again and start from step 1.");
                        orderFeedbackEl.className = "page-note kids-feedback-bad";
                        orderFeedbackEl.hidden = false;
                    }
                    return;
                }
                btn.disabled = true;
                btn.classList.add("kids-order-step-btn--done");
                orderState.expect += 1;
                if (orderState.expect > labels.length) {
                    orderState.locked = true;
                    if (orderFeedbackEl) {
                        orderFeedbackEl.textContent = T("kids.orderWin", "You got the story order!");
                        orderFeedbackEl.className = "page-note kids-feedback-good";
                        orderFeedbackEl.hidden = false;
                    }
                    addStars(3);
                }
            });
            orderStepsEl.appendChild(btn);
        });
    }

    function renderOrderStory() {
        advanceOrderStory();
        buildOrderStepsFromStory(orderState.currentStory);
    }

    function resetOrderStory() {
        buildOrderStepsFromStory(orderState.currentStory);
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
    if (quizNextBtn) {
        quizNextBtn.addEventListener("click", renderQuiz);
    }
    if (tfTrueBtn) {
        tfTrueBtn.addEventListener("click", function () {
            answerTf(true);
        });
    }
    if (tfFalseBtn) {
        tfFalseBtn.addEventListener("click", function () {
            answerTf(false);
        });
    }
    if (tfNextBtn) {
        tfNextBtn.addEventListener("click", renderTf);
    }
    if (orderResetBtn) {
        orderResetBtn.addEventListener("click", resetOrderStory);
    }
    if (orderNextBtn) {
        orderNextBtn.addEventListener("click", renderOrderStory);
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
        renderQuiz();
        renderTf();
        renderOrderStory();
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

    function isKidsRouteActive() {
        try {
            if (window.NjcSpaRouter && typeof window.NjcSpaRouter.getRouteFromHash === "function") {
                return window.NjcSpaRouter.getRouteFromHash() === "kids";
            }
        } catch (e0) {
            return false;
        }
        return false;
    }

    function setKidsHashForTab(tabId) {
        if (!isKidsRouteActive()) {
            return;
        }
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
        if (id === "audios" && window.NjcKidsAudio && typeof window.NjcKidsAudio.load === "function") {
            window.NjcKidsAudio.load();
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
            if ((tabId || "games") === "audios" && window.NjcKidsAudio && typeof window.NjcKidsAudio.load === "function") {
                window.NjcKidsAudio.load();
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
        if (!isKidsRouteActive()) {
            return;
        }
        var subFromHash = readKidsTabFromHash();
        var initial = subFromHash || recallKidsTab();
        applyKidsTab(initial, { skipHash: Boolean(subFromHash) });
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
            renderQuiz();
            renderTf();
            if (orderStoryEl && orderState.currentStory) {
                orderStoryEl.textContent = T(orderState.currentStory.titleKey, orderState.currentStory.titleFb);
                resetOrderStory();
            }
        }
    });
    boot();
    initKidsTabs();
})();
