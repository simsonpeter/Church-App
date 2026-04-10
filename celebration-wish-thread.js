(function () {
    var COLLECTION = "celebrationWishes";
    var BRUSSELS_TZ = "Europe/Brussels";
    var MAX_TEXT = 2000;
    var PAGE_LIMIT = 40;
    var PROFILE_KEY = "njc_user_profiles_v1";

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
            "<div class=\"celebration-wish-thread\" data-celebration-wish-suffix=\"" + sid + "\">" +
            "  <div class=\"celebration-wish-messages\" id=\"celebration-wish-messages-" + sid + "\" aria-live=\"polite\"></div>" +
            "  <p class=\"page-note celebration-wish-status\" id=\"celebration-wish-status-" + sid + "\" hidden></p>" +
            "  <form class=\"celebration-wish-form chat-form\" id=\"celebration-wish-form-" + sid + "\" hidden>" +
            "    <input type=\"text\" id=\"celebration-wish-input-" + sid + "\" class=\"search-input chat-input celebration-wish-input\" maxlength=\"" + String(MAX_TEXT) + "\" autocomplete=\"off\" placeholder=\"\">" +
            "    <button type=\"submit\" class=\"button-link\" id=\"celebration-wish-send-" + sid + "\"></button>" +
            "  </form>" +
            "  <p class=\"page-note celebration-wish-login\" id=\"celebration-wish-login-" + sid + "\" hidden></p>" +
            "</div>";

        var messagesEl = rootEl.querySelector("#celebration-wish-messages-" + sid);
        var statusEl = rootEl.querySelector("#celebration-wish-status-" + sid);
        var formEl = rootEl.querySelector("#celebration-wish-form-" + sid);
        var inputEl = rootEl.querySelector("#celebration-wish-input-" + sid);
        var sendBtn = rootEl.querySelector("#celebration-wish-send-" + sid);
        var loginEl = rootEl.querySelector("#celebration-wish-login-" + sid);

        if (inputEl) {
            inputEl.setAttribute("placeholder", tLocal("celebrations.wishThreadPlaceholder", "Write a birthday wish…"));
        }
        if (sendBtn) {
            sendBtn.textContent = tLocal("celebrations.wishThreadSend", "Send");
        }

        var unsubscribe = null;
        var sending = false;

        function setStatus(msg, isError) {
            if (!statusEl) {
                return;
            }
            statusEl.textContent = msg || "";
            statusEl.hidden = !msg;
            statusEl.dataset.state = isError ? "error" : "";
        }

        function scrollBottom() {
            if (!messagesEl) {
                return;
            }
            window.requestAnimationFrame(function () {
                messagesEl.scrollTop = messagesEl.scrollHeight;
            });
        }

        function renderDocs(docs) {
            if (!messagesEl) {
                return;
            }
            var user = getUser();
            var uid = user && user.uid ? String(user.uid) : "";
            var rows = Array.isArray(docs) ? docs.slice().reverse() : [];
            if (!rows.length) {
                messagesEl.innerHTML = "<p class=\"page-note celebration-wish-empty\">" + escapeHtml(tLocal("celebrations.wishThreadEmpty", "No wishes yet — be the first!")) + "</p>";
                scrollBottom();
                return;
            }
            messagesEl.innerHTML = rows.map(function (docSnap) {
                var d = docSnap.data() || {};
                var sid = String(d.senderUid || "");
                var mine = uid && sid === uid;
                var bubbleClass = mine ? "chat-bubble chat-bubble--mine" : "chat-bubble";
                var name = escapeHtml(d.senderName || "");
                var time = formatTime(d.createdAt);
                var body = "<p class=\"chat-text\">" + escapeHtml(String(d.text || "")).replace(/\n/g, "<br>") + "</p>";
                return "" +
                    "<div class=\"chat-row" + (mine ? " chat-row--mine" : "") + "\">" +
                    "  <div class=\"" + bubbleClass + "\">" +
                    "    <div class=\"chat-meta\"><span class=\"chat-name\">" + name + "</span>" +
                    (time ? "<span class=\"chat-time\">" + escapeHtml(time) + "</span>" : "") + "</div>" +
                    body +
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
            var loggedIn = Boolean(getUser() && getUser().uid);
            if (formEl) {
                formEl.hidden = !loggedIn;
            }
            if (loginEl) {
                loginEl.hidden = loggedIn;
                loginEl.textContent = tLocal("celebrations.wishThreadLogin", "Sign in to post a wish.");
            }
            if (inputEl) {
                inputEl.disabled = !loggedIn || sending;
            }
            if (sendBtn) {
                sendBtn.disabled = !loggedIn || sending;
            }
        }

        function startListen() {
            stopListen();
            if (!messagesEl || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
                if (messagesEl) {
                    messagesEl.innerHTML = "<p class=\"page-note\">" + escapeHtml(tLocal("celebrations.wishThreadUnavailable", "Wishes are unavailable right now.")) + "</p>";
                }
                return;
            }
            var user = getUser();
            if (!user || !user.uid) {
                renderDocs([]);
                updateGuestUi();
                return;
            }
            try {
                var db = window.firebase.firestore();
                var q = db.collection(COLLECTION)
                    .where("threadId", "==", threadId)
                    .orderBy("createdAt", "desc")
                    .limit(PAGE_LIMIT);
                unsubscribe = q.onSnapshot(function (snap) {
                    var list = [];
                    snap.forEach(function (doc) {
                        list.push(doc);
                    });
                    renderDocs(list);
                    setStatus("");
                }, function () {
                    setStatus(tLocal("celebrations.wishThreadLoadError", "Could not load wishes."), true);
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
                })
                .catch(function (err) {
                    var code = err && err.code ? String(err.code) : "";
                    if (code === "permission-denied") {
                        setStatus(tLocal("celebrations.wishThreadSendDenied", "Could not send — check that Firestore rules are deployed for celebration wishes."), true);
                    } else if (code === "failed-precondition" || (err && String(err.message || "").indexOf("index") >= 0)) {
                        setStatus(tLocal("celebrations.wishThreadIndexError", "Could not send — Firestore index may still be building. Try again in a minute."), true);
                    } else {
                        setStatus(tLocal("celebrations.wishThreadSendError", "Could not send. Try again."), true);
                    }
                })
                .finally(function () {
                    sending = false;
                    updateGuestUi();
                });
        }

        if (formEl) {
            formEl.addEventListener("submit", function (event) {
                event.preventDefault();
                sendText();
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
                inputEl.setAttribute("placeholder", tLocal("celebrations.wishThreadPlaceholder", "Write a birthday wish…"));
            }
            if (sendBtn) {
                sendBtn.textContent = tLocal("celebrations.wishThreadSend", "Send");
            }
            if (loginEl && !getUser()) {
                loginEl.textContent = tLocal("celebrations.wishThreadLogin", "Sign in to post a wish.");
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
