(function () {
            var form = document.getElementById("prayer-request-form");
            var nameInput = document.getElementById("prayer-name");
            var messageInput = document.getElementById("prayer-message");
            var note = document.getElementById("prayer-form-note");
            var prayerWallForm = document.getElementById("prayer-wall-form");
            var prayerWallName = document.getElementById("prayer-wall-name");
            var prayerWallMessage = document.getElementById("prayer-wall-message");
            var prayerWallAnonymous = document.getElementById("prayer-wall-anonymous");
            var prayerWallNote = document.getElementById("prayer-wall-note");
            var prayerWallList = document.getElementById("prayer-wall-list");
            var prayerWallSubmit = prayerWallForm ? prayerWallForm.querySelector("button[type=\"submit\"]") : null;

            var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
            var MAX_ENTRIES = 100;
            var prayerWallEntries = [];
            var prayerWallLoading = true;
            var prayerWallError = false;
            var prayerWallBusy = false;

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
                    prayed: Math.max(0, Number(source.prayed || 0) || 0),
                    createdAt: source.createdAt ? String(source.createdAt) : new Date().toISOString(),
                    updatedAt: source.updatedAt ? String(source.updatedAt) : ""
                };
            }

            function setPrayerWallBusy(isBusy) {
                prayerWallBusy = Boolean(isBusy);
                if (prayerWallSubmit) {
                    prayerWallSubmit.disabled = prayerWallBusy;
                }
                if (prayerWallList) {
                    prayerWallList.querySelectorAll("button[data-prayer-id]").forEach(function (button) {
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
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadingTitle", "Loading prayer wall...")) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadingBody", "Please wait.")) + "</p>" +
                        "</li>";
                    return;
                }

                if (prayerWallError) {
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadErrorTitle", "Could not load prayer wall")) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadErrorBody", "Please check your connection and try again.")) + "</p>" +
                        "</li>";
                    return;
                }

                var entries = prayerWallEntries.slice(0, 25);
                if (entries.length === 0) {
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
                    return "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(safeName) + "</h3>" +
                        "  <p>" + escapeHtml(entry.message || "") + "</p>" +
                        "  <div class=\"prayer-meta-row\">" +
                        "    <span class=\"page-note\">" + escapeHtml(dateText) + "</span>" +
                        "    <div class=\"prayer-action-row\">" +
                        "      <button type=\"button\" class=\"prayer-action-btn\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\" data-prayer-action=\"pray\">" + escapeHtml(prayedLabel) + "</button>" +
                        "      <button type=\"button\" class=\"prayer-action-btn\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\" data-prayer-action=\"edit\">" + escapeHtml(T("contact.prayerWallEdit", "Edit")) + "</button>" +
                        "      <button type=\"button\" class=\"prayer-action-btn prayer-action-danger\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\" data-prayer-action=\"delete\">" + escapeHtml(T("contact.prayerWallDelete", "Delete")) + "</button>" +
                        "    </div>" +
                        "  </div>" +
                        "</li>";
                }).join("");
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
                            prayed: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: ""
                        });
                        await savePrayerWallEntries(latestEntries);
                        prayerWallMessage.value = "";
                        prayerWallName.value = "";
                        prayerWallAnonymous.checked = false;
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

            if (prayerWallList) {
                prayerWallList.addEventListener("click", async function (event) {
                    var button = event.target.closest("button[data-prayer-id]");
                    if (!button || prayerWallBusy) {
                        return;
                    }
                    var prayerId = button.getAttribute("data-prayer-id");
                    var action = button.getAttribute("data-prayer-action");
                    if (!prayerId || !action) {
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
                                setPrayerWallBusy(false);
                                return;
                            }
                            var trimmedMessage = String(nextMessage).trim();
                            if (!trimmedMessage) {
                                showPrayerWallNote("needMessage", "contact.prayerWallNeedMessage", "Please write your prayer request.");
                                setPrayerWallBusy(false);
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
                                setPrayerWallBusy(false);
                                return;
                            }
                            latestEntries = latestEntries.filter(function (entry) {
                                return entry.id !== prayerId;
                            });
                            await savePrayerWallEntries(latestEntries);
                            showPrayerWallNote("deleted", "contact.prayerWallDeleted", "Prayer request deleted.");
                        }

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
