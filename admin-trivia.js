/**
 * Standalone Bible Trivia admin - runs independently of admin-dashboard-page.js
 * so trivia form works even when the main dashboard early-returns.
 */
(function () {
    var TRIVIA_URL = "https://mantledb.sh/v2/njc-belgium-admin-trivia/entries";
    var MAX_ENTRIES = 250;

    var triviaForm = document.getElementById("admin-trivia-form");
    var triviaList = document.getElementById("admin-trivia-list");
    var triviaNote = document.getElementById("admin-trivia-note");
    var triviaQuestionInput = document.getElementById("admin-trivia-question");
    var triviaOption1Input = document.getElementById("admin-trivia-option1");
    var triviaOption2Input = document.getElementById("admin-trivia-option2");
    var triviaOption3Input = document.getElementById("admin-trivia-option3");
    var triviaOption4Input = document.getElementById("admin-trivia-option4");
    var triviaCorrectInput = document.getElementById("admin-trivia-correct");
    var triviaReferenceInput = document.getElementById("admin-trivia-reference");
    var triviaShowDateInput = document.getElementById("admin-trivia-show-date");
    var triviaSubmit = document.getElementById("admin-trivia-submit");

    if (!triviaForm || !triviaList) {
        return;
    }

    var cachedTrivia = [];
    var triviaBusy = false;

    function T(key, fallback) {
        var container = triviaForm && triviaForm.closest(".page-view");
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && container) {
            return window.NjcI18n.tForElement(container, key, fallback);
        }
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function getUser() {
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            return window.NjcAuth.getUser();
        }
        return null;
    }

    function isAdminUser() {
        var user = getUser();
        var email = String((user && user.email) || "").trim().toLowerCase();
        return email === "simsonpeter@gmail.com";
    }

    function showTriviaNote(state, key, fallback) {
        var msg = T(key, fallback);
        if (triviaNote) {
            triviaNote.hidden = false;
            triviaNote.textContent = msg;
            triviaNote.dataset.state = state || "";
        }
    }

    function setTriviaBusy(value) {
        triviaBusy = Boolean(value);
        if (triviaSubmit) {
            triviaSubmit.disabled = triviaBusy;
        }
        triviaList.querySelectorAll("button[data-admin-trivia-id]").forEach(function (btn) {
            btn.disabled = triviaBusy;
        });
    }

    function makeEntryId(prefix) {
        return String(prefix || "entry") + "-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000));
    }

    function fetchTrivia() {
        var timeoutMs = 15000;
        var timeoutPromise = new Promise(function (_, reject) {
            setTimeout(function () { reject(new Error("Load timeout")); }, timeoutMs);
        });
        return Promise.race([
            fetch(TRIVIA_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
                .then(function (response) {
                    if (response.status === 404) {
                        return fetch(TRIVIA_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ entries: [] })
                        }).then(function (createResponse) {
                            if (!createResponse.ok) {
                                throw new Error("Init failed");
                            }
                            return [];
                        });
                    }
                    if (!response.ok) {
                        throw new Error("Load failed");
                    }
                    return response.json().then(function (payload) {
                        return Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
                    });
                }),
            timeoutPromise
        ]);
    }

    function saveTrivia(entries) {
        return fetch(TRIVIA_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entries: (Array.isArray(entries) ? entries : []).slice(0, MAX_ENTRIES) })
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("Save failed");
            }
            return true;
        });
    }

    function prependAndSaveTrivia(entry) {
        var nextEntries = [entry].concat(cachedTrivia);
        return saveTrivia(nextEntries).then(function () {
            return fetchTrivia();
        });
    }

    function renderTriviaList() {
        if (!cachedTrivia.length) {
            triviaList.innerHTML = "" +
                "<li>" +
                "  <h3>" + escapeHtml(T("admin.triviaEmptyTitle", "No trivia yet")) + "</h3>" +
                "  <p>" + escapeHtml(T("admin.triviaEmptyBody", "Add Bible trivia questions in Tamil. They will appear on the home page by scheduled date.")) + "</p>" +
                "</li>";
            return;
        }
        var sorted = cachedTrivia.slice().sort(function (a, b) {
            var aDate = String((a && (a.showDate || a.date)) || "");
            var bDate = String((b && (b.showDate || b.date)) || "");
            var cmp = bDate.localeCompare(aDate);
            if (cmp !== 0) {
                return cmp;
            }
            var aTime = String((a && (a.updatedAt || a.createdAt)) || "");
            var bTime = String((b && (b.updatedAt || b.createdAt)) || "");
            return bTime.localeCompare(aTime);
        }).slice(0, 50);
        triviaList.innerHTML = sorted.map(function (entry) {
            var id = String(entry && entry.id || "").trim();
            var question = String(entry && (entry.questionTa || entry.question) || "").trim();
            var options = Array.isArray(entry && entry.options) ? entry.options : [];
            var correctIndex = Number(entry && entry.correctIndex) || 0;
            var answerTa = String(entry && entry.answerTa || "").trim();
            var reference = String(entry && entry.reference || "").trim();
            var showDate = String(entry && (entry.showDate || entry.date) || "").trim();
            var preview = options.length >= 1
                ? options.map(function (o, i) { return (i === correctIndex ? "✓ " : "") + String(o || "").slice(0, 25); }).join(" | ")
                : (answerTa ? answerTa.slice(0, 80) + (answerTa.length > 80 ? "…" : "") : "");
            return "" +
                "<li>" +
                "  <h3>" + escapeHtml(question || T("admin.triviaTitle", "Bible Trivia")) + "</h3>" +
                "  <p class=\"page-note\">" + escapeHtml(showDate || "-") + (reference ? (" • " + escapeHtml(reference)) : "") + "</p>" +
                (preview ? ("  <p class=\"admin-item-body\">" + escapeHtml(preview) + "</p>") : "") +
                "  <div class=\"admin-item-actions\">" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-trivia-id=\"" + escapeHtml(id) + "\" data-admin-trivia-action=\"edit\">" + escapeHtml(T("admin.triviaEdit", "Edit")) + "</button>" +
                "    <button type=\"button\" class=\"button-link button-secondary\" data-admin-trivia-id=\"" + escapeHtml(id) + "\" data-admin-trivia-action=\"delete\">" + escapeHtml(T("admin.triviaDelete", "Delete")) + "</button>" +
                "  </div>" +
                "</li>";
        }).join("");
        triviaList.querySelectorAll("button[data-admin-trivia-id]").forEach(function (button) {
            button.disabled = triviaBusy;
        });
    }

    function loadTrivia() {
        setTriviaBusy(true);
        fetchTrivia().then(function (entries) {
            cachedTrivia = Array.isArray(entries) ? entries : [];
            renderTriviaList();
        }).catch(function () {
            showTriviaNote("error", "admin.syncError", "Could not load trivia.");
            triviaList.innerHTML = "<li><h3>" + escapeHtml(T("admin.syncError", "Could not load trivia.")) + "</h3><p>" + escapeHtml(T("admin.syncErrorBody", "Check your connection and try again.")) + "</p></li>";
        }).finally(function () {
            setTriviaBusy(false);
        });
    }

    triviaForm.addEventListener("submit", function (event) {
        event.preventDefault();
        if (triviaBusy) {
            return;
        }
        if (!isAdminUser()) {
            showTriviaNote("validation", "admin.accessDenied", "Please sign in as admin to add trivia.");
            return;
        }
        var question = String(triviaQuestionInput && triviaQuestionInput.value || "").trim();
        var opt1 = String(triviaOption1Input && triviaOption1Input.value || "").trim();
        var opt2 = String(triviaOption2Input && triviaOption2Input.value || "").trim();
        var opt3 = String(triviaOption3Input && triviaOption3Input.value || "").trim();
        var opt4 = String(triviaOption4Input && triviaOption4Input.value || "").trim();
        var options = [opt1, opt2, opt3, opt4].filter(Boolean);
        var correctIndex = Math.max(0, Math.min(3, Number(triviaCorrectInput && triviaCorrectInput.value) || 0));
        var reference = String(triviaReferenceInput && triviaReferenceInput.value || "").trim();
        var showDate = String(triviaShowDateInput && triviaShowDateInput.value || "").trim();
        if (!question || options.length !== 4) {
            showTriviaNote("validation", "admin.triviaNeedFields", "Please enter question and all 4 options.");
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(showDate)) {
            showTriviaNote("validation", "admin.triviaNeedDate", "Show date must be YYYY-MM-DD.");
            return;
        }
        setTriviaBusy(true);
        showTriviaNote("", "admin.saving", "Saving...");
        prependAndSaveTrivia({
            id: makeEntryId("trivia"),
            question: question,
            questionTa: question,
            options: options,
            correctIndex: correctIndex,
            answerTa: options[correctIndex] || "",
            reference: reference,
            showDate: showDate,
            date: showDate,
            createdAt: new Date().toISOString(),
            createdByEmail: String((getUser() && getUser().email) || "").trim().toLowerCase()
        }).then(function (entries) {
            cachedTrivia = entries;
            if (triviaQuestionInput) triviaQuestionInput.value = "";
            if (triviaOption1Input) triviaOption1Input.value = "";
            if (triviaOption2Input) triviaOption2Input.value = "";
            if (triviaOption3Input) triviaOption3Input.value = "";
            if (triviaOption4Input) triviaOption4Input.value = "";
            if (triviaCorrectInput) triviaCorrectInput.value = "0";
            if (triviaReferenceInput) triviaReferenceInput.value = "";
            if (triviaShowDateInput) triviaShowDateInput.value = "";
            renderTriviaList();
            showTriviaNote("success", "admin.triviaSaved", "Bible trivia added.");
            document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
        }).catch(function () {
            showTriviaNote("error", "admin.syncError", "Could not save. Check your connection.");
        }).finally(function () {
            setTriviaBusy(false);
        });
    });

    triviaList.addEventListener("click", function (event) {
        var button = event.target.closest("button[data-admin-trivia-id][data-admin-trivia-action]");
        if (!button || triviaBusy || !isAdminUser()) {
            return;
        }
        var triviaId = String(button.getAttribute("data-admin-trivia-id") || "").trim();
        var action = String(button.getAttribute("data-admin-trivia-action") || "").trim();
        if (!triviaId || (action !== "edit" && action !== "delete")) {
            return;
        }
        var source = cachedTrivia.slice(0, MAX_ENTRIES);
        var targetIndex = source.findIndex(function (entry) {
            return String(entry && entry.id || "").trim() === triviaId;
        });
        if (targetIndex < 0) {
            showTriviaNote("error", "admin.syncError", "Could not load trivia data.");
            return;
        }
        if (action === "delete") {
            if (!window.confirm(T("admin.triviaDeleteConfirm", "Delete this trivia?"))) {
                return;
            }
            source.splice(targetIndex, 1);
            setTriviaBusy(true);
            saveTrivia(source).then(function () {
                return fetchTrivia();
            }).then(function (entries) {
                cachedTrivia = Array.isArray(entries) ? entries : [];
                renderTriviaList();
                showTriviaNote("success", "admin.triviaDeleted", "Trivia deleted.");
                document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
            }).catch(function () {
                showTriviaNote("error", "admin.syncError", "Could not save.");
            }).finally(function () {
                setTriviaBusy(false);
            });
            return;
        }
        var current = source[targetIndex] || {};
        var opts = Array.isArray(current.options) ? current.options : [current.answerTa || "", "", "", ""];
        while (opts.length < 4) {
            opts.push("");
        }
        var nextQuestion = window.prompt(T("admin.triviaEditPromptQuestion", "Edit question (Tamil)"), String(current.questionTa || current.question || ""));
        if (nextQuestion === null) return;
        var nextOpt1 = window.prompt(T("admin.triviaEditPromptOption", "Option 1"), String(opts[0] || ""));
        if (nextOpt1 === null) return;
        var nextOpt2 = window.prompt(T("admin.triviaEditPromptOption", "Option 2"), String(opts[1] || ""));
        if (nextOpt2 === null) return;
        var nextOpt3 = window.prompt(T("admin.triviaEditPromptOption", "Option 3"), String(opts[2] || ""));
        if (nextOpt3 === null) return;
        var nextOpt4 = window.prompt(T("admin.triviaEditPromptOption", "Option 4"), String(opts[3] || ""));
        if (nextOpt4 === null) return;
        var nextCorrect = window.prompt(T("admin.triviaEditPromptCorrect", "Correct option (1-4)"), String((Number(current.correctIndex) || 0) + 1));
        if (nextCorrect === null) return;
        var nextReference = window.prompt(T("admin.triviaEditPromptReference", "Edit reference (optional)"), String(current.reference || ""));
        if (nextReference === null) return;
        var nextDate = window.prompt(T("admin.triviaEditPromptDate", "Edit date (YYYY-MM-DD)"), String(current.showDate || current.date || ""));
        if (nextDate === null) return;
        var cleanQuestion = String(nextQuestion || "").trim();
        var cleanOptions = [String(nextOpt1 || "").trim(), String(nextOpt2 || "").trim(), String(nextOpt3 || "").trim(), String(nextOpt4 || "").trim()];
        var cleanCorrectIndex = Math.max(0, Math.min(3, (Number(nextCorrect) || 1) - 1));
        var cleanDate = String(nextDate || "").trim();
        if (!cleanQuestion || cleanOptions.filter(Boolean).length !== 4 || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            showTriviaNote("validation", "admin.triviaNeedFields", "Please enter question, all 4 options and valid date.");
            return;
        }
        source[targetIndex] = Object.assign({}, current, {
            question: cleanQuestion,
            questionTa: cleanQuestion,
            options: cleanOptions,
            correctIndex: cleanCorrectIndex,
            answerTa: cleanOptions[cleanCorrectIndex],
            reference: String(nextReference || "").trim(),
            showDate: cleanDate,
            date: cleanDate,
            updatedAt: new Date().toISOString()
        });
        setTriviaBusy(true);
        saveTrivia(source).then(function () {
            return fetchTrivia();
        }).then(function (entries) {
            cachedTrivia = Array.isArray(entries) ? entries : [];
            renderTriviaList();
            showTriviaNote("success", "admin.triviaUpdated", "Trivia updated.");
            document.dispatchEvent(new CustomEvent("njc:admin-trivia-updated"));
        }).catch(function () {
            showTriviaNote("error", "admin.syncError", "Could not save.");
        }).finally(function () {
            setTriviaBusy(false);
        });
    });

    document.addEventListener("njc:langchange", function () {
        renderTriviaList();
    });

    if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
        loadTrivia();
    }
    window.addEventListener("hashchange", function () {
        if (String(window.location.hash || "").replace(/^#/, "").trim().toLowerCase() === "admin") {
            loadTrivia();
        }
    });
})();
