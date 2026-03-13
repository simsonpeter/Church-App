(function () {
            var form = document.getElementById("prayer-request-form");
            var nameInput = document.getElementById("prayer-name");
            var messageInput = document.getElementById("prayer-message");
            var note = document.getElementById("prayer-form-note");
            var prayerWallForm = document.getElementById("prayer-wall-form");
            var prayerWallName = document.getElementById("prayer-wall-name");
            var prayerWallMessage = document.getElementById("prayer-wall-message");
            var prayerWallAnonymous = document.getElementById("prayer-wall-anonymous");
            var prayerWallUrgent = document.getElementById("prayer-wall-urgent");
            var prayerWallOpenButton = document.getElementById("prayer-wall-open-btn");
            var prayerWallCancelButton = document.getElementById("prayer-wall-cancel-btn");
            var prayerWallNote = document.getElementById("prayer-wall-note");
            var prayerWallList = document.getElementById("prayer-wall-list");
            var prayerWallSubmit = prayerWallForm ? prayerWallForm.querySelector("button[type=\"submit\"]") : null;
            var prayerDetailOverlay = document.getElementById("prayer-detail-overlay");
            var prayerDetailBackdrop = document.getElementById("prayer-detail-backdrop");
            var prayerDetailCloseButton = document.getElementById("prayer-detail-close");
            var prayerDetailName = document.getElementById("prayer-detail-name");
            var prayerDetailMessage = document.getElementById("prayer-detail-message");
            var prayerDetailDate = document.getElementById("prayer-detail-date");
            var prayerDetailUrgentBadge = document.getElementById("prayer-detail-urgent");
            var prayerDetailPrayButton = document.getElementById("prayer-detail-pray");
            var prayerDetailEditButton = document.getElementById("prayer-detail-edit");
            var prayerDetailDeleteButton = document.getElementById("prayer-detail-delete");

            var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
            var MAX_ENTRIES = 100;
            var prayerWallEntries = [];
            var prayerWallLoading = true;
            var prayerWallError = false;
            var prayerWallBusy = false;
            var activePrayerDetailId = "";

            function T(key, fallback) {
                if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
                    return window.NjcI18n.t(key, fallback);
                }
                return fallback || key;
            }

            function formatCount(template, count) {
                if (window.NjcI18n && typeof window.NjcI18n.formatCount === "function") {
                    return window.NjcI18n.formatCount(template, count);
                }
                return String(template).replace("{count}", String(count));
            }

            function escapeHtml(value) {
                return String(value || "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            }

            function getLocale() {
                if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
                    return window.NjcI18n.getLocale();
                }
                return "en-GB";
            }

            function formatLocalDate(isoText) {
                var date = new Date(isoText);
                if (Number.isNaN(date.getTime())) {
                    return "";
                }
                return new Intl.DateTimeFormat(getLocale(), {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                }).format(date);
            }

            function normalizeEntry(entry, index) {
                var source = entry && typeof entry === "object" ? entry : {};
                return {
                    id: String(source.id || ("prayer-" + index + "-" + Date.now())),
                    name: String(source.name || "").trim(),
                    message: String(source.message || "").trim(),
                    anonymous: Boolean(source.anonymous),
                    urgent: Boolean(source.urgent),
                    prayed: Math.max(0, Number(source.prayed || 0) || 0),
                    createdAt: source.createdAt ? String(source.createdAt) : new Date().toISOString(),
                    updatedAt: source.updatedAt ? String(source.updatedAt) : ""
                };
            }

            function openPrayerComposer() {
                if (!prayerWallForm || !prayerWallOpenButton) {
                    return;
                }
                prayerWallForm.hidden = false;
                prayerWallOpenButton.hidden = true;
                if (prayerWallName) {
                    prayerWallName.focus();
                }
            }

            function closePrayerComposer() {
                if (!prayerWallForm || !prayerWallOpenButton) {
                    return;
                }
                prayerWallForm.hidden = true;
                prayerWallOpenButton.hidden = false;
            }

            function getSortedPrayerEntries(entries) {
                return entries.slice().sort(function (a, b) {
                    if (Boolean(a.urgent) !== Boolean(b.urgent)) {
                        return a.urgent ? -1 : 1;
                    }
                    var aTime = a.updatedAt || a.createdAt || "";
                    var bTime = b.updatedAt || b.createdAt || "";
                    return bTime.localeCompare(aTime);
                });
            }

            function setDetailActionPrayerId(prayerId) {
                if (prayerDetailPrayButton) {
                    prayerDetailPrayButton.setAttribute("data-prayer-id", prayerId || "");
                }
                if (prayerDetailEditButton) {
                    prayerDetailEditButton.setAttribute("data-prayer-id", prayerId || "");
                }
                if (prayerDetailDeleteButton) {
                    prayerDetailDeleteButton.setAttribute("data-prayer-id", prayerId || "");
                }
            }

            function closePrayerDetail() {
                if (!prayerDetailOverlay) {
                    return;
                }
                activePrayerDetailId = "";
                prayerDetailOverlay.hidden = true;
                document.body.classList.remove("prayer-detail-open");
                setDetailActionPrayerId("");
            }

            function renderPrayerDetail() {
                if (!prayerDetailOverlay) {
                    return;
                }
                if (!activePrayerDetailId) {
                    prayerDetailOverlay.hidden = true;
                    document.body.classList.remove("prayer-detail-open");
                    setDetailActionPrayerId("");
                    return;
                }
                var entry = prayerWallEntries.find(function (item) {
                    return item.id === activePrayerDetailId;
                });
                if (!entry) {
                    closePrayerDetail();
                    return;
                }
                var safeName = entry.anonymous
                    ? T("contact.prayerWallNameAnonymous", "Anonymous")
                    : (entry.name || T("contact.prayerWallNameAnonymous", "Anonymous"));
                var prayedLabel = formatCount(T("contact.prayerWallPrayed", "Prayed ({count})"), Number(entry.prayed || 0));
                if (prayerDetailName) {
                    prayerDetailName.textContent = safeName;
                }
                if (prayerDetailMessage) {
                    prayerDetailMessage.textContent = entry.message || "";
                }
                if (prayerDetailDate) {
                    prayerDetailDate.textContent = formatLocalDate(entry.updatedAt || entry.createdAt || "");
                }
                if (prayerDetailUrgentBadge) {
                    prayerDetailUrgentBadge.hidden = !entry.urgent;
                    var urgentLabelText = T("contact.prayerWallUrgentBadge", "Urgent");
                    prayerDetailUrgentBadge.setAttribute("title", urgentLabelText);
                    var urgentLabelNode = prayerDetailUrgentBadge.querySelector("span");
                    if (urgentLabelNode) {
                        urgentLabelNode.textContent = urgentLabelText;
                    }
                }
                if (prayerDetailPrayButton) {
                    prayerDetailPrayButton.textContent = prayedLabel;
                }
                setDetailActionPrayerId(entry.id || "");
            }

            function openPrayerDetail(prayerId) {
                if (!prayerDetailOverlay || !prayerId) {
                    return;
                }
                activePrayerDetailId = prayerId;
                renderPrayerDetail();
                if (!activePrayerDetailId) {
                    return;
                }
                prayerDetailOverlay.hidden = false;
                document.body.classList.add("prayer-detail-open");
                if (prayerDetailCloseButton) {
                    prayerDetailCloseButton.focus();
                }
            }

            function setPrayerWallBusy(isBusy) {
                prayerWallBusy = Boolean(isBusy);
                if (prayerWallSubmit) {
                    prayerWallSubmit.disabled = prayerWallBusy;
                }
                if (prayerWallOpenButton) {
                    prayerWallOpenButton.disabled = prayerWallBusy;
                }
                if (prayerWallCancelButton) {
                    prayerWallCancelButton.disabled = prayerWallBusy;
                }
                if (prayerWallList) {
                    prayerWallList.querySelectorAll("button[data-prayer-open-id]").forEach(function (button) {
                        button.disabled = prayerWallBusy;
                    });
                }
                if (prayerDetailOverlay) {
                    prayerDetailOverlay.querySelectorAll("button[data-prayer-id][data-prayer-action]").forEach(function (button) {
                        button.disabled = prayerWallBusy;
                    });
                }
            }

            function showPrayerWallNote(state, key, fallback) {
                if (!prayerWallNote) {
                    return;
                }
                prayerWallNote.hidden = false;
                prayerWallNote.dataset.state = state || "";
                prayerWallNote.textContent = T(key, fallback);
            }

            async function fetchPrayerWallEntries() {
                var response = await fetch(PRAYER_WALL_URL + "?ts=" + String(Date.now()), {
                    cache: "no-store"
                });
                if (response.status === 404) {
                    var createResponse = await fetch(PRAYER_WALL_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ entries: [] })
                    });
                    if (!createResponse.ok) {
                        throw new Error("Could not initialize prayer wall");
                    }
                    return [];
                }
                if (!response.ok) {
                    throw new Error("Could not load prayer wall");
                }
                var payload = await response.json();
                var entries = payload && Array.isArray(payload.entries) ? payload.entries : [];
                return entries.map(normalizeEntry).filter(function (item) {
                    return item.message;
                }).slice(0, MAX_ENTRIES);
            }

            async function savePrayerWallEntries(entries) {
                var payload = {
                    entries: entries.slice(0, MAX_ENTRIES)
                };
                var response = await fetch(PRAYER_WALL_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error("Could not save prayer wall");
                }
                prayerWallEntries = payload.entries;
            }

            function renderPrayerWall() {
                if (!prayerWallList) {
                    return;
                }

                if (prayerWallLoading) {
                    closePrayerDetail();
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadingTitle", "Loading prayer wall...")) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadingBody", "Please wait.")) + "</p>" +
                        "</li>";
                    return;
                }

                if (prayerWallError) {
                    closePrayerDetail();
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadErrorTitle", "Could not load prayer wall")) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadErrorBody", "Please check your connection and try again.")) + "</p>" +
                        "</li>";
                    return;
                }

                var entries = getSortedPrayerEntries(prayerWallEntries).slice(0, 25);
                if (entries.length === 0) {
                    closePrayerDetail();
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallNoEntriesTitle", "No prayer requests yet")) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallNoEntriesBody", "Be the first to share a request.")) + "</p>" +
                        "</li>";
                    return;
                }

                prayerWallList.innerHTML = entries.map(function (entry) {
                    var safeName = entry.anonymous
                        ? T("contact.prayerWallNameAnonymous", "Anonymous")
                        : (entry.name || T("contact.prayerWallNameAnonymous", "Anonymous"));
                    var prayedLabel = formatCount(T("contact.prayerWallPrayed", "Prayed ({count})"), Number(entry.prayed || 0));
                    var dateText = formatLocalDate(entry.updatedAt || entry.createdAt || "");
                    var previewText = String(entry.message || "");
                    if (previewText.length > 120) {
                        previewText = previewText.slice(0, 117).trim() + "...";
                    }
                    var urgentText = T("contact.prayerWallUrgentBadge", "Urgent");
                    var urgentRibbonText = T("contact.prayerWallUrgentRibbon", "URGENT PRAYER");
                    var itemClass = entry.urgent ? "prayer-list-item prayer-list-item-urgent" : "prayer-list-item";
                    var urgentBadge = entry.urgent
                        ? ("<span class=\"prayer-list-urgent-badge\"><i class=\"fa-solid fa-bolt\" aria-hidden=\"true\"></i>" + escapeHtml(urgentText) + "</span>")
                        : "";
                    var urgentRibbon = entry.urgent
                        ? ("<div class=\"prayer-list-urgent-ribbon\"><i class=\"fa-solid fa-triangle-exclamation\" aria-hidden=\"true\"></i>" + escapeHtml(urgentRibbonText) + "</div>")
                        : "";
                    return "" +
                        "<li class=\"" + itemClass + "\">" +
                        "  " + urgentRibbon +
                        "  <button type=\"button\" class=\"prayer-list-open-btn\" data-prayer-open-id=\"" + escapeHtml(entry.id || "") + "\">" +
                        "    <div class=\"prayer-list-top\">" +
                        "      <h3 class=\"prayer-list-name\">" + escapeHtml(safeName) + "</h3>" +
                        "      " + urgentBadge +
                        "    </div>" +
                        "    <p class=\"prayer-list-preview\">" + escapeHtml(previewText) + "</p>" +
                        "    <div class=\"prayer-list-meta\">" +
                        "      <span class=\"page-note\">" + escapeHtml(dateText) + "</span>" +
                        "      <span class=\"prayer-list-prayed\">" + escapeHtml(prayedLabel) + "</span>" +
                        "      <span class=\"prayer-list-chevron\" aria-hidden=\"true\"><i class=\"fa-solid fa-chevron-right\"></i></span>" +
                        "    </div>" +
                        "  </button>" +
                        "</li>";
                }).join("");

                renderPrayerDetail();
            }

            async function runPrayerWallAction(prayerId, action) {
                if (!prayerId || !action || prayerWallBusy) {
                    return;
                }
                setPrayerWallBusy(true);
                try {
                    var latestEntries = await fetchPrayerWallEntries();
                    var targetEntry = latestEntries.find(function (entry) {
                        return entry.id === prayerId;
                    });
                    if (!targetEntry) {
                        throw new Error("Entry not found");
                    }

                    if (action === "pray") {
                        targetEntry.prayed = Number(targetEntry.prayed || 0) + 1;
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                    } else if (action === "edit") {
                        var nextMessage = window.prompt(
                            T("contact.prayerWallEditPrompt", "Edit prayer request"),
                            targetEntry.message || ""
                        );
                        if (nextMessage === null) {
                            return;
                        }
                        var trimmedMessage = String(nextMessage).trim();
                        if (!trimmedMessage) {
                            showPrayerWallNote("needMessage", "contact.prayerWallNeedMessage", "Please write your prayer request.");
                            return;
                        }
                        targetEntry.message = trimmedMessage;
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                        showPrayerWallNote("updated", "contact.prayerWallUpdated", "Prayer request updated.");
                    } else if (action === "delete") {
                        var shouldDelete = window.confirm(
                            T("contact.prayerWallDeleteConfirm", "Delete this prayer request?")
                        );
                        if (!shouldDelete) {
                            return;
                        }
                        latestEntries = latestEntries.filter(function (entry) {
                            return entry.id !== prayerId;
                        });
                        await savePrayerWallEntries(latestEntries);
                        showPrayerWallNote("deleted", "contact.prayerWallDeleted", "Prayer request deleted.");
                        activePrayerDetailId = "";
                    } else {
                        return;
                    }

                    prayerWallError = false;
                    prayerWallLoading = false;
                    renderPrayerWall();
                    if (!activePrayerDetailId) {
                        closePrayerDetail();
                    } else {
                        renderPrayerDetail();
                    }
                } catch (err) {
                    showPrayerWallNote("syncError", "contact.prayerWallSyncError", "Could not sync prayer wall. Please try again.");
                    prayerWallError = true;
                    prayerWallLoading = false;
                    renderPrayerWall();
                } finally {
                    setPrayerWallBusy(false);
                }
            }

            async function loadPrayerWall() {
                if (!prayerWallList) {
                    return;
                }
                prayerWallLoading = true;
                prayerWallError = false;
                renderPrayerWall();
                try {
                    prayerWallEntries = await fetchPrayerWallEntries();
                    prayerWallError = false;
                } catch (err) {
                    prayerWallError = true;
                }
                prayerWallLoading = false;
                renderPrayerWall();
            }

            if (form) {
                form.addEventListener("submit", function (event) {
                    event.preventDefault();
                    var nameValue = (nameInput.value || "").trim();
                    var messageValue = (messageInput.value || "").trim();

                    if (!messageValue) {
                        note.hidden = false;
                        note.textContent = T("contact.prayerNeedMessage", "Please enter your prayer request.");
                        return;
                    }

                    var subject = "Prayer Request" + (nameValue ? " - " + nameValue : "");
                    var body = (nameValue ? "Name: " + nameValue + "\n\n" : "") + "Prayer request:\n" + messageValue;
                    var mailtoUrl = "mailto:simsonpeter@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                    window.location.href = mailtoUrl;
                    note.hidden = false;
                    note.textContent = T("contact.prayerMailOpened", "Your email app has been opened.");
                });
            }

            if (prayerWallForm) {
                prayerWallForm.addEventListener("submit", async function (event) {
                    event.preventDefault();
                    if (prayerWallBusy) {
                        return;
                    }

                    var nameValue = (prayerWallName.value || "").trim();
                    var messageValue = (prayerWallMessage.value || "").trim();
                    var anonymousValue = Boolean(prayerWallAnonymous.checked);
                    var urgentValue = Boolean(prayerWallUrgent && prayerWallUrgent.checked);

                    if (!messageValue) {
                        showPrayerWallNote("needMessage", "contact.prayerWallNeedMessage", "Please write your prayer request.");
                        return;
                    }

                    setPrayerWallBusy(true);
                    try {
                        var latestEntries = await fetchPrayerWallEntries();
                        latestEntries.unshift({
                            id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000)),
                            name: nameValue,
                            message: messageValue,
                            anonymous: anonymousValue,
                            urgent: urgentValue,
                            prayed: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: ""
                        });
                        await savePrayerWallEntries(latestEntries);
                        prayerWallMessage.value = "";
                        prayerWallName.value = "";
                        prayerWallAnonymous.checked = false;
                        if (prayerWallUrgent) {
                            prayerWallUrgent.checked = false;
                        }
                        closePrayerComposer();
                        showPrayerWallNote("posted", "contact.prayerWallPosted", "Prayer request added to wall.");
                        prayerWallError = false;
                        prayerWallLoading = false;
                        renderPrayerWall();
                    } catch (err) {
                        showPrayerWallNote("syncError", "contact.prayerWallSyncError", "Could not sync prayer wall. Please try again.");
                        prayerWallError = true;
                        prayerWallLoading = false;
                        renderPrayerWall();
                    } finally {
                        setPrayerWallBusy(false);
                    }
                });
            }

            if (prayerWallOpenButton) {
                prayerWallOpenButton.addEventListener("click", function () {
                    openPrayerComposer();
                });
            }

            if (prayerWallCancelButton) {
                prayerWallCancelButton.addEventListener("click", function () {
                    closePrayerComposer();
                });
            }

            if (prayerWallList) {
                prayerWallList.addEventListener("click", function (event) {
                    var openButton = event.target.closest("button[data-prayer-open-id]");
                    if (!openButton || prayerWallBusy) {
                        return;
                    }
                    var prayerId = openButton.getAttribute("data-prayer-open-id");
                    openPrayerDetail(prayerId);
                });
            }

            if (prayerDetailOverlay) {
                prayerDetailOverlay.addEventListener("click", function (event) {
                    if (event.target === prayerDetailOverlay || event.target === prayerDetailBackdrop) {
                        closePrayerDetail();
                    }
                });
            }

            if (prayerDetailBackdrop) {
                prayerDetailBackdrop.addEventListener("click", function () {
                    closePrayerDetail();
                });
            }

            if (prayerDetailCloseButton) {
                prayerDetailCloseButton.addEventListener("click", function () {
                    closePrayerDetail();
                });
            }

            if (prayerDetailOverlay) {
                prayerDetailOverlay.addEventListener("click", function (event) {
                    var actionButton = event.target.closest("button[data-prayer-id][data-prayer-action]");
                    if (!actionButton || prayerWallBusy) {
                        return;
                    }
                    var prayerId = actionButton.getAttribute("data-prayer-id");
                    var action = actionButton.getAttribute("data-prayer-action");
                    runPrayerWallAction(prayerId, action);
                });
            }

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && prayerDetailOverlay && !prayerDetailOverlay.hidden) {
                    closePrayerDetail();
                }
            });

            window.addEventListener("hashchange", function () {
                if ((window.location.hash || "").toLowerCase() !== "#prayer") {
                    closePrayerDetail();
                }
            });

            loadPrayerWall();

            document.addEventListener("njc:langchange", function () {
                if (note && !note.hidden) {
                    if ((messageInput.value || "").trim()) {
                        note.textContent = T("contact.prayerMailOpened", "Your email app has been opened.");
                    } else {
                        note.textContent = T("contact.prayerNeedMessage", "Please enter your prayer request.");
                    }
                }
                if (prayerWallNote && !prayerWallNote.hidden) {
                    var state = prayerWallNote.dataset.state || "";
                    if (state === "posted") {
                        prayerWallNote.textContent = T("contact.prayerWallPosted", "Prayer request added to wall.");
                    } else if (state === "updated") {
                        prayerWallNote.textContent = T("contact.prayerWallUpdated", "Prayer request updated.");
                    } else if (state === "deleted") {
                        prayerWallNote.textContent = T("contact.prayerWallDeleted", "Prayer request deleted.");
                    } else if (state === "syncError") {
                        prayerWallNote.textContent = T("contact.prayerWallSyncError", "Could not sync prayer wall. Please try again.");
                    } else {
                        prayerWallNote.textContent = T("contact.prayerWallNeedMessage", "Please write your prayer request.");
                    }
                }
                renderPrayerWall();
            });
        })();
