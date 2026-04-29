(function () {
    var memGrid = document.getElementById("kids-mem-grid");
    var memStatus = document.getElementById("kids-mem-status");
    var memRestart = document.getElementById("kids-mem-restart");
    var scrambleHint = document.getElementById("kids-scramble-hint");
    var scrambleLetters = document.getElementById("kids-scramble-letters");
    var scrambleBuild = document.getElementById("kids-scramble-build");
    var scrambleFeedback = document.getElementById("kids-scramble-feedback");
    var scrambleCheck = document.getElementById("kids-scramble-check");
    var scrambleNext = document.getElementById("kids-scramble-next");
    var choiceQ = document.getElementById("kids-choice-q");
    var choiceList = document.getElementById("kids-choice-list");
    var choiceFeedback = document.getElementById("kids-choice-feedback");
    var pageCard = document.querySelector(".kids-page-card");
    if (!pageCard) {
        return;
    }

    var MEM_EMOJIS = ["\uD83C\uDF0A", "\uD83C\uDF5E", "\uD83D\uDC11", "\u271D\uFE0F"];
    var SCRAMBLE_WORDS = ["JESUS", "PRAY", "LOVE", "HOPE", "FAITH"];
    var scrambleState = { word: "JESUS", wordIdx: 0, pool: [], slots: [] };
    var memState = { first: null, busy: false, pairsFound: 0, totalPairs: 4, list: [] };

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

    function setMemStatus(msg) {
        if (memStatus) {
            memStatus.textContent = msg;
        }
    }

    function startMemory() {
        if (!memGrid) {
            return;
        }
        memState.first = null;
        memState.busy = false;
        memState.pairsFound = 0;
        var deck = [];
        for (var i = 0; i < 4; i += 1) {
            var sym = MEM_EMOJIS[i] || String(i);
            deck.push({ id: i, sym: sym });
            deck.push({ id: i, sym: sym });
        }
        for (var s = deck.length - 1; s > 0; s -= 1) {
            var j = Math.floor(Math.random() * (s + 1));
            var t = deck[s];
            deck[s] = deck[j];
            deck[j] = t;
        }
        memState.list = deck;
        memGrid.innerHTML = "";
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
            if (memState.pairsFound >= 4) {
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

    function shuffledArray(word) {
        var arr = word.split("");
        for (var i = arr.length - 1; i > 0; i -= 1) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = arr[i];
            arr[i] = arr[j];
            arr[j] = t;
        }
        if (word.length > 1 && arr.join("") === word) {
            return shuffledArray(word);
        }
        return arr;
    }

    function renderScramble() {
        if (!scrambleLetters || !scrambleBuild) {
            return;
        }
        var w = SCRAMBLE_WORDS[scrambleState.wordIdx % SCRAMBLE_WORDS.length];
        scrambleState.word = w;
        scrambleState.slots = new Array(w.length);
        for (var i = 0; i < w.length; i += 1) {
            scrambleState.slots[i] = "";
        }
        scrambleState.pool = shuffledArray(w);
        if (scrambleHint) {
            scrambleHint.textContent = T("kids.scrambleHint", "Fill the line in order. Tap a letter, then a box (or the next free box by tapping a letter).");
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

    function poolFirstUnusedIndex() {
        for (var i = 0; i < scrambleState.pool.length; i += 1) {
            if (scrambleState.pool[i] !== null) {
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
        } else {
            scrambleFeedback.textContent = T("kids.scrambleBad", "Not yet. Fill all boxes, or use Next for a new mix.");
            scrambleFeedback.className = "page-note kids-feedback-bad";
        }
        scrambleFeedback.hidden = false;
    }

    function nextScramble() {
        scrambleState.wordIdx = (scrambleState.wordIdx + 1) % SCRAMBLE_WORDS.length;
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
        } else {
            choiceFeedback.textContent = T("kids.choiceOther", "Another answer might be better. Talk about it with a parent or leader.");
            choiceFeedback.className = "page-note kids-feedback-bad";
        }
        choiceFeedback.hidden = false;
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
        startMemory();
        renderScramble();
        renderChoiceRound();
    }

    document.addEventListener("njc:cardlangchange", function (event) {
        if (!pageCard) {
            return;
        }
        if (event && event.target && (event.target === pageCard || (pageCard.contains && pageCard.contains(event.target)))) {
            setMemStatus(T("kids.memStatusStart", "Find all pairs to win."));
            renderScramble();
            renderChoiceRound();
        }
    });
    boot();
})();
