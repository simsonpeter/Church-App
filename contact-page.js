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
            var PRAYER_WALL_KEY = "njc_prayer_wall_v1";

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

            function readPrayerWall() {
                try {
                    var raw = window.localStorage.getItem(PRAYER_WALL_KEY);
                    var parsed = raw ? JSON.parse(raw) : [];
                    return Array.isArray(parsed) ? parsed : [];
                } catch (err) {
                    return [];
                }
            }

            function savePrayerWall(entries) {
                try {
                    window.localStorage.setItem(PRAYER_WALL_KEY, JSON.stringify(entries));
                } catch (err) {
                    return null;
                }
                return null;
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

            function renderPrayerWall() {
                if (!prayerWallList) {
                    return;
                }
                var entries = readPrayerWall().slice(0, 25);
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
                    var dateText = formatLocalDate(entry.createdAt || "");
                    return "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(safeName) + "</h3>" +
                        "  <p>" + escapeHtml(entry.message || "") + "</p>" +
                        "  <div class=\"prayer-meta-row\">" +
                        "    <span class=\"page-note\">" + escapeHtml(dateText) + "</span>" +
                        "    <button type=\"button\" class=\"prayer-prayed-btn\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\">" + escapeHtml(prayedLabel) + "</button>" +
                        "  </div>" +
                        "</li>";
                }).join("");
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
                prayerWallForm.addEventListener("submit", function (event) {
                    event.preventDefault();
                    var nameValue = (prayerWallName.value || "").trim();
                    var messageValue = (prayerWallMessage.value || "").trim();
                    var anonymousValue = Boolean(prayerWallAnonymous.checked);

                    if (!messageValue) {
                        prayerWallNote.hidden = false;
                        prayerWallNote.dataset.state = "needMessage";
                        prayerWallNote.textContent = T("contact.prayerWallNeedMessage", "Please write your prayer request.");
                        return;
                    }

                    var entries = readPrayerWall();
                    entries.unshift({
                        id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000)),
                        name: nameValue,
                        message: messageValue,
                        anonymous: anonymousValue,
                        prayed: 0,
                        createdAt: new Date().toISOString()
                    });
                    savePrayerWall(entries.slice(0, 100));
                    prayerWallMessage.value = "";
                    prayerWallName.value = "";
                    prayerWallAnonymous.checked = false;
                    prayerWallNote.hidden = false;
                    prayerWallNote.dataset.state = "posted";
                    prayerWallNote.textContent = T("contact.prayerWallPosted", "Prayer request added to wall.");
                    renderPrayerWall();
                });
            }

            if (prayerWallList) {
                prayerWallList.addEventListener("click", function (event) {
                    var button = event.target.closest("button[data-prayer-id]");
                    if (!button) {
                        return;
                    }
                    var prayerId = button.getAttribute("data-prayer-id");
                    if (!prayerId) {
                        return;
                    }
                    var entries = readPrayerWall();
                    var changed = false;
                    entries.forEach(function (entry) {
                        if (entry.id === prayerId) {
                            entry.prayed = Number(entry.prayed || 0) + 1;
                            changed = true;
                        }
                    });
                    if (changed) {
                        savePrayerWall(entries);
                        renderPrayerWall();
                    }
                });
            }

            renderPrayerWall();

            document.addEventListener("njc:langchange", function () {
                if (note && !note.hidden) {
                    if ((messageInput.value || "").trim()) {
                        note.textContent = T("contact.prayerMailOpened", "Your email app has been opened.");
                    } else {
                        note.textContent = T("contact.prayerNeedMessage", "Please enter your prayer request.");
                    }
                }
                if (prayerWallNote && !prayerWallNote.hidden) {
                    prayerWallNote.textContent = prayerWallNote.dataset.state === "posted"
                        ? T("contact.prayerWallPosted", "Prayer request added to wall.")
                        : T("contact.prayerWallNeedMessage", "Please write your prayer request.");
                }
                renderPrayerWall();
            });
        })();
