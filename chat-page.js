(function () {
    var CHAT_COLLECTION = "chatMessages";
    var PROFILE_KEY = "njc_user_profiles_v1";
    var MAX_TEXT = 4000;

    var messagesEl = document.getElementById("chat-messages");
    var formEl = document.getElementById("chat-form");
    var inputEl = document.getElementById("chat-input");
    var sendBtn = document.getElementById("chat-send");
    var statusEl = document.getElementById("chat-status");
    var chatCard = document.querySelector(".chat-page-card");

    var unsubscribe = null;
    var sending = false;

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function" && chatCard && typeof window.NjcI18n.tForElement === "function") {
            return window.NjcI18n.tForElement(chatCard, key, fallback);
        }
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
        } catch (e) {}
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

    function setStatus(msg) {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = msg || "";
        statusEl.hidden = !msg;
    }

    function scrollToBottom() {
        if (!messagesEl) {
            return;
        }
        window.requestAnimationFrame(function () {
            messagesEl.scrollTop = messagesEl.scrollHeight;
        });
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
        } catch (e) {
            return "";
        }
    }

    function renderMessages(docs) {
        if (!messagesEl) {
            return;
        }
        var uid = getUser() && getUser().uid ? String(getUser().uid) : "";
        var rows = docs.slice().reverse();
        if (!rows.length) {
            messagesEl.innerHTML = "<p class=\"page-note chat-empty\">" + escapeHtml(T("chat.empty", "No messages yet. Say hello!")) + "</p>";
            return;
        }
        messagesEl.innerHTML = rows.map(function (snap) {
            var d = snap.data() || {};
            var sid = String(d.senderUid || "");
            var mine = uid && sid === uid;
            var bubbleClass = mine ? "chat-bubble chat-bubble--mine" : "chat-bubble";
            var name = escapeHtml(d.senderName || "");
            var time = formatTime(d.createdAt);
            var body;
            if (d.type === "image") {
                body = "<p class=\"chat-text chat-legacy-note\">" + escapeHtml(T("chat.legacyImage", "[Photo — sharing images is turned off.]")) + "</p>";
            } else {
                body = "<p class=\"chat-text\">" + escapeHtml(String(d.text || "")).replace(/\n/g, "<br>") + "</p>";
            }
            return "" +
                "<div class=\"chat-row" + (mine ? " chat-row--mine" : "") + "\">" +
                "  <div class=\"" + bubbleClass + "\">" +
                "    <div class=\"chat-meta\"><span class=\"chat-name\">" + name + "</span>" +
                (time ? "<span class=\"chat-time\">" + escapeHtml(time) + "</span>" : "") + "</div>" +
                body +
                "  </div>" +
                "</div>";
        }).join("");
        scrollToBottom();
    }

    function stopListen() {
        if (typeof unsubscribe === "function") {
            unsubscribe();
            unsubscribe = null;
        }
    }

    function startListen() {
        stopListen();
        if (!messagesEl || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        var user = getUser();
        if (!user || !user.uid) {
            return;
        }
        try {
            var db = window.firebase.firestore();
            var q = db.collection(CHAT_COLLECTION).orderBy("createdAt", "desc").limit(80);
            unsubscribe = q.onSnapshot(function (snap) {
                var list = [];
                snap.forEach(function (doc) {
                    list.push(doc);
                });
                renderMessages(list);
                setStatus("");
            }, function () {
                setStatus(T("chat.loadError", "Could not load messages. Check Firestore rules."));
            });
        } catch (e) {
            setStatus(T("chat.loadError", "Could not load messages. Check Firestore rules."));
        }
    }

    function isChatRoute() {
        var v = document.querySelector('.page-view[data-route="chat"]');
        return Boolean(v && v.classList.contains("active"));
    }

    function updateGuestUi() {
        var user = getUser();
        var loggedIn = Boolean(user && user.uid);
        if (formEl) {
            formEl.hidden = !loggedIn;
        }
        if (inputEl) {
            inputEl.disabled = !loggedIn;
        }
        if (sendBtn) {
            sendBtn.disabled = !loggedIn || sending;
        }
    }

    function refreshChat() {
        updateGuestUi();
        if (!isChatRoute()) {
            stopListen();
            return;
        }
        if (!getUser() || !getUser().uid) {
            stopListen();
            if (messagesEl) {
                messagesEl.innerHTML = "<p class=\"page-note\">" + escapeHtml(T("chat.loginRequired", "Sign in to read and send messages.")) + "</p>";
            }
            return;
        }
        startListen();
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
            setStatus(T("chat.textTooLong", "Message is too long."));
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        sending = true;
        if (sendBtn) {
            sendBtn.disabled = true;
        }
        setStatus("");
        var db = window.firebase.firestore();
        var payload = {
            type: "text",
            text: text,
            senderUid: user.uid,
            senderName: displayNameForUser(user),
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        db.collection(CHAT_COLLECTION).add(payload)
            .then(function () {
                if (inputEl) {
                    inputEl.value = "";
                }
            })
            .catch(function () {
                setStatus(T("chat.sendFailed", "Could not send. Check connection and rules."));
            })
            .finally(function () {
                sending = false;
                updateGuestUi();
            });
    }

    if (formEl) {
        formEl.addEventListener("submit", function (ev) {
            ev.preventDefault();
            sendText();
        });
    }

    document.addEventListener("DOMContentLoaded", refreshChat);
    document.addEventListener("njc:routechange", refreshChat);
    document.addEventListener("njc:authchange", refreshChat);
    document.addEventListener("njc:profile-updated", function () {
        if (isChatRoute()) {
            refreshChat();
        }
    });
})();
