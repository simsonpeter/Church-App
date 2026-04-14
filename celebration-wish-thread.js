(function () {
    var COLLECTION = "celebrationWishes";
    var BRUSSELS_TZ = "Europe/Brussels";
    var MAX_TEXT = 2000;
    var PAGE_LIMIT = 40;
    var PROFILE_KEY = "njc_user_profiles_v1";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";

    function getBrusselsTodayKey() {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: BRUSSELS_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(new Date());

        function partValue(type) {
            var found = parts.find(function (part) {
                return part.type === type;
            });
            return found ? Number(found.value) : 0;
        }

        var y = partValue("year");
        var m = partValue("month");
        var d = partValue("day");
        return String(y) + "-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    }

    function threadIdForToday() {
        return "celebration-" + getBrusselsTodayKey();
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function escapeHtml(s) {
        return String(s || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function getUser() {
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            return window.NjcAuth.getUser();
        }
        return null;
    }

    function isAdminUser() {
        var u = getUser();
        var em = String(u && u.email || "").trim().toLowerCase();
        return em === ADMIN_EMAIL;
    }

    function displayNameForUser(user) {
        if (!user || !user.uid) {
            return "";
        }
        try {
            var raw = window.localStorage.getItem(PROFILE_KEY);
            var map = raw ? JSON.parse(raw) : {};
            var row = map[user.uid];
            var n = row && String(row.fullName || "").trim();
            if (n) {
                return n.slice(0, 120);
            }
        } catch (e1) {}
        var dn = String(user.displayName || "").trim();
        if (dn && dn.indexOf("@") < 0) {
            return dn.slice(0, 120);
        }
        var em = String(user.email || "").trim();
        if (em) {
            return em.split("@")[0].replace(/[._-]+/g, " ").trim().slice(0, 120) || "Member";
        }
        return "Member";
    }

    var mountsByRoot = typeof WeakMap !== "undefined" ? new WeakMap() : null;
    var fallbackMounts = [];

    function destroyMountForRoot(rootEl) {
        if (!rootEl) {
            return;
        }
        if (mountsByRoot) {
            var prev = mountsByRoot.get(rootEl);
            if (prev && typeof prev.destroy === "function") {
                prev.destroy();
            }
            mountsByRoot.delete(rootEl);
            return;
        }
        for (var i = 0; i < fallbackMounts.length; i += 1) {
            if (fallbackMounts[i] && fallbackMounts[i].root === rootEl) {
                if (typeof fallbackMounts[i].destroy === "function") {
                    fallbackMounts[i].destroy();
                }
                fallbackMounts.splice(i, 1);
                return;
            }
        }
    }

    function formatTime(ts) {
        if (!ts || typeof ts.toDate !== "function") {
            return "";
        }
        try {
            return ts.toDate().toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e2) {
            return "";
        }
    }

    function mountInto(rootEl, options) {
        if (!rootEl) {
            return;
        }
        destroyMountForRoot(rootEl);
        var opts = options && typeof options === "object" ? options : {};
        var threadId = String(opts.threadId || "").trim() || threadIdForToday();
        var i18nCard = opts.i18nScope || rootEl.closest(".card") || rootEl;

        function tLocal(key, fallback) {
            if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && i18nCard) {
                return window.NjcI18n.tForElement(i18nCard, key, fallback);
            }
            return T(key, fallback);
        }

        var sid = "cw-" + String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
        rootEl.innerHTML = "" +
            "<div class=\"celebration-wish-thread celebration-wish-thread--panel\" data-celebration-wish-suffix=\"" + sid + "\">" +
            "  <p class=\"page-note celebration-wish-status\" id=\"celebration-wish-status-" + sid + "\" hidden></p>" +
            "  <p class=\"page-note celebration-wish-login\" id=\"celebration-wish-login-" + sid + "\" hidden></p>" +
            "  <div class=\"celebration-wish-toolbar\">" +
            "    <input type=\"text\" id=\"celebration-wish-input-" + sid + "\" class=\"search-input celebration-wish-input\" maxlength=\"" + String(MAX_TEXT) + "\" autocomplete=\"off\" aria-label=\"\">" +
            "    <button type=\"button\" class=\"celebration-wish-chevron\" id=\"celebration-wish-chevron-" + sid + "\" aria-expanded=\"false\" aria-controls=\"celebration-wish-dropdown-" + sid + "\" title=\"\"><i class=\"fa-solid fa-chevron-down\" aria-hidden=\"true\"></i></button>" +
            "    <button type=\"button\" class=\"button-link button-secondary celebration-wish-wishfill\" id=\"celebration-wish-wishfill-" + sid + "\"></button>" +
            "    <button type=\"button\" class=\"button-link celebration-wish-send\" id=\"celebration-wish-send-" + sid + "\"></button>" +
            "  </div>" +
            "  <div class=\"celebration-wish-dropdown\" id=\"celebration-wish-dropdown-" + sid + "\" hidden>" +
            "    <div class=\"celebration-wish-dropdown-head\">" +
            "      <span class=\"celebration-wish-dropdown-title\" id=\"celebration-wish-drop-title-" + sid + "\"></span>" +
            "      <button type=\"button\" class=\"button-link button-secondary celebration-wish-clear-all\" id=\"celebration-wish-clear-" + sid + "\" hidden></button>" +
            "    </div>" +
            "    <div class=\"celebration-wish-messages\" id=\"celebration-wish-messages-" + sid + "\" aria-live=\"polite\"></div>" +
            "  </div>" +
            "</div>";

        var messagesEl = rootEl.querySelector("#celebration-wish-messages-" + sid);
        var statusEl = rootEl.querySelector("#celebration-wish-status-" + sid);
        var inputEl = rootEl.querySelector("#celebration-wish-input-" + sid);
        var sendBtn = rootEl.querySelector("#celebration-wish-send-" + sid);
        var wishFillBtn = rootEl.querySelector("#celebration-wish-wishfill-" + sid);
        var loginEl = rootEl.querySelector("#celebration-wish-login-" + sid);
        var chevronBtn = rootEl.querySelector("#celebration-wish-chevron-" + sid);
        var dropdownEl = rootEl.querySelector("#celebration-wish-dropdown-" + sid);
        var clearBtn = rootEl.querySelector("#celebration-wish-clear-" + sid);
        var dropTitleEl = rootEl.querySelector("#celebration-wish-drop-title-" + sid);

        if (inputEl) {
            inputEl.setAttribute("placeholder", tLocal("celebrations.wishThreadPlaceholder", "Write a wish…"));
            inputEl.setAttribute("aria-label", tLocal("celebrations.wishThreadPlaceholder", "Write a wish…"));
        }
        if (sendBtn) {
            sendBtn.textContent = tLocal("celebrations.wishThreadSend", "Send");
        }
        if (wishFillBtn) {
            wishFillBtn.textContent = tLocal("celebrations.wishButton", "Wish");
        }
        if (chevronBtn) {
            chevronBtn.setAttribute("title", tLocal("celebrations.toggleThread", "Show wishes"));
        }
        if (dropTitleEl) {
            dropTitleEl.textContent = tLocal("celebrations.wishThreadMessagesTitle", "Wishes & replies");
        }
        if (clearBtn) {
            clearBtn.textContent = tLocal("celebrations.clearThread", "Clear all");
        }

        var unsubscribe = null;
        var sending = false;
        var dropdownOpen = false;

        function setStatus(msg, isError) {
            if (!statusEl) {
                return;
            }
            statusEl.textContent = msg || "";
            statusEl.hidden = !msg;
            statusEl.dataset.state = isError ? "error" : "";
        }

        function docCreatedMs(docSnap) {
            var ts = docSnap && docSnap.data && (docSnap.data() || {}).createdAt;
            if (!ts) {
                return 0;
            }
            if (typeof ts.toMillis === "function") {
                return ts.toMillis();
            }
            if (typeof ts.seconds === "number") {
                return ts.seconds * 1000;
            }
            return 0;
        }

        function scrollBottom() {
            if (!messagesEl) {
                return;
            }
            window.requestAnimationFrame(function () {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });
        }

        function setDropdownOpen(open) {
            dropdownOpen = Boolean(open);
            if (dropdownEl) {
                dropdownEl.hidden = !dropdownOpen;
            }
            if (chevronBtn) {
                chevronBtn.setAttribute("aria-expanded", dropdownOpen ? "true" : "false");
                chevronBtn.classList.toggle("is-open", dropdownOpen);
            }
            if (dropdownOpen) {
                scrollBottom();
            }
        }

        function toolbarWishText() {
            var sug = "";
            try {
                if (window.NjcCelebrations && typeof window.NjcCelebrations.getLastWishSuggestion === "function") {
                    sug = String(window.NjcCelebrations.getLastWishSuggestion() || "").trim();
                }
            } catch (eS) {}
            if (sug) {
                return sug;
            }
            try {
                if (window.NjcCelebrations && typeof window.NjcCelebrations.getDefaultToolbarWishText === "function") {
                    return String(window.NjcCelebrations.getDefaultToolbarWishText() || "").trim();
                }
            } catch (eD) {}
            return "";
        }

        function renderDocs(docs) {
            if (!messagesEl) {
                return;
            }
            var user = getUser();
            var uid = user && user.uid ? String(user.uid) : "";
            var admin = isAdminUser();
            var rows = Array.isArray(docs) ? docs.slice().reverse() : [];
            if (!rows.length) {
                messagesEl.innerHTML = "<p class=\"page-note celebration-wish-empty\">" + escapeHtml(tLocal("celebrations.wishThreadEmpty", "No wishes yet — be the first!")) + "</p>";
                scrollBottom();
                return;
            }
            var delLabel = tLocal("celebrations.deleteWish", "Delete");
            messagesEl.innerHTML = rows.map(function (docSnap) {
                var d = docSnap.data() || {};
                var docId = docSnap.id;
                var sidSend = String(d.senderUid || "");
                var mine = uid && sidSend === uid;
                var bubbleClass = mine ? "chat-bubble chat-bubble--mine" : "chat-bubble";
                var name = escapeHtml(d.senderName || "");
                var time = formatTime(d.createdAt);
                var body = "<p class=\"chat-text\">" + escapeHtml(String(d.text || "")).replace(/\n/g, "<br>") + "</p>";
                var showDel = (mine || admin) && docId;
                var delBtn = showDel
                    ? ("<button type=\"button\" class=\"button-link celebration-msg-delete\" data-del-id=\"" + escapeHtml(docId) + "\">" + escapeHtml(delLabel) + "</button>")
                    : "";
                return "" +
                    "<div class=\"chat-row celebration-msg-row" + (mine ? " chat-row--mine" : "") + "\">" +
                    "  <div class=\"" + bubbleClass + "\">" +
                    "    <div class=\"chat-meta\"><span class=\"chat-name\">" + name + "</span>" +
                    (time ? "<span class=\"chat-time\">" + escapeHtml(time) + "</span>" : "") + "</div>" +
                    body +
                    (delBtn ? ("<div class=\"celebration-msg-actions\">" + delBtn + "</div>") : "") +
                    "  </div>" +
                    "</div>";
            }).join("");
            scrollBottom();
        }

        function stopListen() {
            if (typeof unsubscribe === "function") {
                unsubscribe();
                unsubscribe = null;
            }
        }

        function updateGuestUi() {
            var member = window.NjcAuth && typeof window.NjcAuth.isRegisteredMember === "function" && window.NjcAuth.isRegisteredMember();
            if (loginEl) {
                loginEl.hidden = member;
                loginEl.textContent = member
                    ? ""
                    : tLocal("celebrations.wishThreadSignInToView", "Sign in to view and post celebration wishes.");
            }
            if (inputEl) {
                inputEl.disabled = !member || sending;
            }
            if (sendBtn) {
                sendBtn.disabled = !member || sending;
            }
            if (wishFillBtn) {
                wishFillBtn.disabled = !member;
            }
            if (clearBtn) {
                clearBtn.hidden = !isAdminUser() || !member;
            }
        }

        function startListen() {
            stopListen();
            var u = getUser();
            var member = window.NjcAuth && typeof window.NjcAuth.isRegisteredMember === "function" && window.NjcAuth.isRegisteredMember();
            if (!u || !u.uid || !member) {
                if (messagesEl) {
                    messagesEl.innerHTML = "<p class=\"page-note\">" + escapeHtml(tLocal("celebrations.wishThreadMembersOnly", "Sign in to see community wishes.")) + "</p>";
                }
                setStatus("");
                updateGuestUi();
                return;
            }
            if (!messagesEl || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                if (messagesEl) {
                    messagesEl.innerHTML = "<p class=\"page-note\">" + escapeHtml(tLocal("celebrations.wishThreadUnavailable", "Wishes are unavailable right now.")) + "</p>";
                }
                return;
            }
            try {
                var db = window.firebase.firestore();
                var q = db.collection(COLLECTION)
                    .where("threadId", "==", threadId)
                    .limit(PAGE_LIMIT);
                unsubscribe = q.onSnapshot(function (snap) {
                    var list = [];
                    snap.forEach(function (doc) {
                        list.push(doc);
                    });
                    list.sort(function (a, b) {
                        return docCreatedMs(b) - docCreatedMs(a);
                    });
                    renderDocs(list);
                    setStatus("");
                    updateGuestUi();
                }, function () {
                    setStatus(tLocal("celebrations.wishThreadLoadError", "Could not load wishes."), true);
                    if (messagesEl) {
                        messagesEl.innerHTML = "<p class=\"page-note\">" + escapeHtml(tLocal("celebrations.wishThreadLoadError", "Could not load wishes.")) + "</p>";
                    }
                });
            } catch (e3) {
                setStatus(tLocal("celebrations.wishThreadLoadError", "Could not load wishes."), true);
            }
        }

        function sendText() {
            var user = getUser();
            if (!user || !user.uid || sending) {
                return;
            }
            if (!window.NjcAuth || typeof window.NjcAuth.isRegisteredMember !== "function" || !window.NjcAuth.isRegisteredMember()) {
                return;
            }
            var text = String(inputEl && inputEl.value || "").trim();
            if (!text) {
                return;
            }
            if (text.length > MAX_TEXT) {
                setStatus(tLocal("celebrations.wishThreadTooLong", "Message is too long."), true);
                return;
            }
            if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                return;
            }
            sending = true;
            updateGuestUi();
            setStatus("");
            var db = window.firebase.firestore();
            var payload = {
                threadId: threadId,
                eventKey: threadId,
                text: text,
                senderUid: user.uid,
                senderName: displayNameForUser(user),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection(COLLECTION).add(payload)
                .then(function () {
                    if (inputEl) {
                        inputEl.value = "";
                    }
                    setStatus(tLocal("celebrations.wishThreadSent", "Sent!"), false);
                    window.setTimeout(function () {
                        setStatus("");
                    }, 2200);
                    setDropdownOpen(true);
                    scrollBottom();
                })
                .catch(function (err) {
                    var code = err && err.code ? String(err.code) : "";
                    if (code === "permission-denied") {
                        setStatus(tLocal("celebrations.wishThreadSendDenied", "Could not send — check Firestore rules."), true);
                    } else if (code === "failed-precondition" || (err && String(err.message || "").indexOf("index") >= 0)) {
                        setStatus(tLocal("celebrations.wishThreadIndexError", "Could not send — try again in a minute."), true);
                    } else {
                        setStatus(tLocal("celebrations.wishThreadSendError", "Could not send. Try again."), true);
                    }
                })
                .finally(function () {
                    sending = false;
                    updateGuestUi();
                });
        }

        function deleteDoc(docId) {
            if (!docId || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                return;
            }
            var db = window.firebase.firestore();
            db.collection(COLLECTION).doc(String(docId)).delete().catch(function () {
                setStatus(tLocal("celebrations.deleteFailed", "Could not delete."), true);
            });
        }

        function clearEntireThread() {
            if (!isAdminUser() || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                return;
            }
            var db = window.firebase.firestore();
            db.collection(COLLECTION).where("threadId", "==", threadId).limit(PAGE_LIMIT).get()
                .then(function (snap) {
                    var batch = db.batch();
                    var n = 0;
                    snap.forEach(function (doc) {
                        batch.delete(doc.ref);
                        n += 1;
                    });
                    if (!n) {
                        return null;
                    }
                    return batch.commit();
                })
                .catch(function () {
                    setStatus(tLocal("celebrations.clearFailed", "Could not clear thread."), true);
                });
        }

        if (chevronBtn && dropdownEl) {
            chevronBtn.addEventListener("click", function () {
                setDropdownOpen(!dropdownOpen);
            });
        }
        if (wishFillBtn && inputEl) {
            wishFillBtn.addEventListener("click", function () {
                var t = toolbarWishText();
                if (t) {
                    inputEl.value = t;
                    inputEl.focus();
                    try {
                        inputEl.setSelectionRange(t.length, t.length);
                    } catch (e4) {}
                }
            });
        }
        if (sendBtn) {
            sendBtn.addEventListener("click", function (ev) {
                ev.preventDefault();
                sendText();
            });
        }
        if (inputEl) {
            inputEl.addEventListener("keydown", function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    sendText();
                }
            });
        }
        if (messagesEl) {
            messagesEl.addEventListener("click", function (event) {
                var del = event.target.closest(".celebration-msg-delete");
                if (!del) {
                    return;
                }
                var id = del.getAttribute("data-del-id");
                if (!id) {
                    return;
                }
                if (!window.confirm(tLocal("celebrations.deleteConfirm", "Delete this message?"))) {
                    return;
                }
                deleteDoc(id);
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener("click", function () {
                if (!window.confirm(tLocal("celebrations.clearConfirm", "Delete all messages in this thread?"))) {
                    return;
                }
                clearEntireThread();
            });
        }

        updateGuestUi();
        startListen();

        var onAuth = function () {
            updateGuestUi();
            startListen();
        };
        document.addEventListener("njc:authchange", onAuth);
        document.addEventListener("njc:langchange", function () {
            if (inputEl) {
                inputEl.setAttribute("placeholder", tLocal("celebrations.wishThreadPlaceholder", "Write a wish…"));
                inputEl.setAttribute("aria-label", tLocal("celebrations.wishThreadPlaceholder", "Write a wish…"));
            }
            if (sendBtn) {
                sendBtn.textContent = tLocal("celebrations.wishThreadSend", "Send");
            }
            if (wishFillBtn) {
                wishFillBtn.textContent = tLocal("celebrations.wishButton", "Wish");
            }
            if (chevronBtn) {
                chevronBtn.setAttribute("title", tLocal("celebrations.toggleThread", "Show wishes"));
            }
            if (dropTitleEl) {
                dropTitleEl.textContent = tLocal("celebrations.wishThreadMessagesTitle", "Wishes & replies");
            }
            if (clearBtn) {
                clearBtn.textContent = tLocal("celebrations.clearThread", "Clear all");
            }
            if (loginEl && !getUser()) {
                loginEl.textContent = tLocal("celebrations.wishThreadSignInToView", "Sign in to view and post celebration wishes.");
            }
        });

        var handle = {
            root: rootEl,
            destroy: function () {
                document.removeEventListener("njc:authchange", onAuth);
                stopListen();
                if (rootEl) {
                    rootEl.innerHTML = "";
                }
                if (!mountsByRoot) {
                    for (var j = 0; j < fallbackMounts.length; j += 1) {
                        if (fallbackMounts[j] === handle) {
                            fallbackMounts.splice(j, 1);
                            break;
                        }
                    }
                }
            }
        };
        if (mountsByRoot) {
            mountsByRoot.set(rootEl, handle);
        } else {
            fallbackMounts.push(handle);
        }
    }

    function setComposerText(text) {
        var inputs = document.querySelectorAll(".celebration-wish-input");
        var t = String(text || "").trim();
        if (!t || !inputs.length) {
            return false;
        }
        inputs.forEach(function (inp) {
            inp.value = t;
        });
        var last = inputs[inputs.length - 1];
        if (last && typeof last.focus === "function") {
            last.focus();
            try {
                last.setSelectionRange(t.length, t.length);
            } catch (e4) {
                return null;
            }
        }
        return true;
    }

    window.NjcCelebrationWish = {
        getThreadIdForToday: threadIdForToday,
        getBrusselsTodayKey: getBrusselsTodayKey,
        mount: mountInto,
        destroy: destroyMountForRoot,
        setComposerText: setComposerText
    };
})();
