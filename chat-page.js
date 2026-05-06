(function () {
    var CHAT_COLLECTION = "chatMessages";
    var PROFILE_KEY = "njc_user_profiles_v1";
    var QUEUE_KEY = "njc_chat_outbox_v1";
    var MAX_TEXT = 4000;
    var MAX_QUEUE = 30;
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var DELETE_BATCH_SIZE = 400;

    var messagesEl = document.getElementById("chat-messages");
    var formEl = document.getElementById("chat-form");
    var inputEl = document.getElementById("chat-input");
    var sendBtn = document.getElementById("chat-send");
    var statusEl = document.getElementById("chat-status");
    var chatAdminToolsEl = document.getElementById("chat-admin-tools");
    var chatAdminDeleteAllBtn = document.getElementById("chat-admin-delete-all");
    var chatCard = document.querySelector(".chat-page-card");

    var unsubscribe = null;
    var sending = false;
    var lastServerDocs = [];
    var deletingAll = false;

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

    function normalizeEmail(em) {
        return String(em || "").trim().toLowerCase();
    }

    function isAdminUser() {
        var u = getUser();
        return Boolean(u && normalizeEmail(u.email) === normalizeEmail(ADMIN_EMAIL));
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

    function loadQueue(uid) {
        if (!uid) {
            return [];
        }
        try {
            var raw = window.localStorage.getItem(QUEUE_KEY);
            var o = raw ? JSON.parse(raw) : {};
            var list = o && o[uid] && Array.isArray(o[uid]) ? o[uid] : [];
            return list.filter(function (item) {
                return item && typeof item.text === "string" && item.text.trim();
            }).slice(0, MAX_QUEUE);
        } catch (e) {
            return [];
        }
    }

    function saveQueue(uid, list) {
        if (!uid) {
            return;
        }
        try {
            var raw = window.localStorage.getItem(QUEUE_KEY);
            var o = raw ? JSON.parse(raw) : {};
            if (!o || typeof o !== "object") {
                o = {};
            }
            o[uid] = Array.isArray(list) ? list.slice(0, MAX_QUEUE) : [];
            window.localStorage.setItem(QUEUE_KEY, JSON.stringify(o));
        } catch (e2) {}
    }

    function enqueueMessage(uid, text) {
        var q = loadQueue(uid);
        q.push({ text: String(text).trim(), queuedAt: Date.now() });
        saveQueue(uid, q);
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

    function formatQueuedTime(ms) {
        try {
            return new Date(ms).toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e) {
            return "";
        }
    }

    function renderCombined(docs) {
        if (!messagesEl) {
            return;
        }
        var user = getUser();
        var uid = user && user.uid ? String(user.uid) : "";
        var pending = uid ? loadQueue(uid) : [];
        var rows = Array.isArray(docs) ? docs.slice().reverse() : [];
        var admin = isAdminUser();
        if (!rows.length && !pending.length) {
            messagesEl.innerHTML = "<p class=\"page-note chat-empty\">" + escapeHtml(T("chat.empty", "No messages yet. Say hello!")) + "</p>";
            scrollToBottom();
            return;
        }
        var html = rows.map(function (snap) {
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
            var docId = String(snap.id || "");
            var delBtn = "";
            if (admin && docId) {
                var ariaDel = escapeHtml(T("chat.adminDeleteOneAria", "Delete this message"));
                delBtn =
                    "<button type=\"button\" class=\"chat-msg-delete\" data-chat-doc-id=\"" + escapeHtml(docId) + "\" aria-label=\"" + ariaDel + "\" title=\"" + ariaDel + "\">" +
                    "<i class=\"fa-solid fa-trash\" aria-hidden=\"true\"></i></button>";
            }
            return "" +
                "<div class=\"chat-row" + (mine ? " chat-row--mine" : "") + "\">" +
                "  <div class=\"" + bubbleClass + (delBtn ? " chat-bubble--admin" : "") + "\">" +
                delBtn +
                "    <div class=\"chat-meta\"><span class=\"chat-name\">" + name + "</span>" +
                (time ? "<span class=\"chat-time\">" + escapeHtml(time) + "</span>" : "") + "</div>" +
                body +
                "  </div>" +
                "</div>";
        }).join("");
        var myName = escapeHtml(displayNameForUser(user) || "Member");
        pending.forEach(function (item) {
            var qt = formatQueuedTime(item.queuedAt || Date.now());
            html += "" +
                "<div class=\"chat-row chat-row--mine\">" +
                "  <div class=\"chat-bubble chat-bubble--mine chat-bubble--pending\">" +
                "    <div class=\"chat-meta\"><span class=\"chat-name\">" + myName + "</span>" +
                (qt ? "<span class=\"chat-time\">" + escapeHtml(qt) + "</span>" : "") + "</div>" +
                "    <p class=\"chat-pending-hint\">" + escapeHtml(T("chat.pendingHint", "Will send when you’re back online")) + "</p>" +
                "    <p class=\"chat-text\">" + escapeHtml(String(item.text || "")).replace(/\n/g, "<br>") + "</p>" +
                "  </div>" +
                "</div>";
        });
        messagesEl.innerHTML = html;
        scrollToBottom();
    }

    function updateAdminTools() {
        if (!chatAdminToolsEl) {
            return;
        }
        var show = Boolean(getUser() && getUser().uid && isAdminUser());
        chatAdminToolsEl.hidden = !show;
        if (chatAdminDeleteAllBtn) {
            chatAdminDeleteAllBtn.disabled = deletingAll;
        }
    }

    function deleteChatDocument(docId) {
        if (!docId || !isAdminUser() || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.resolve();
        }
        var db = window.firebase.firestore();
        return db.collection(CHAT_COLLECTION).doc(String(docId)).delete();
    }

    function deleteAllChatBatches() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return Promise.reject(new Error("no firebase"));
        }
        var db = window.firebase.firestore();
        return new Promise(function (resolve, reject) {
            function step() {
                db.collection(CHAT_COLLECTION).limit(DELETE_BATCH_SIZE).get()
                    .then(function (snap) {
                        if (snap.empty) {
                            resolve();
                            return;
                        }
                        var batch = db.batch();
                        snap.docs.forEach(function (d) {
                            batch.delete(d.ref);
                        });
                        return batch.commit().then(step);
                    })
                    .catch(reject);
            }
            step();
        });
    }

    function onAdminDeleteAllClick() {
        if (!isAdminUser() || deletingAll) {
            return;
        }
        var ok = window.confirm(T(
            "chat.adminConfirmDeleteAll",
            "Delete ALL chat messages for everyone? This cannot be undone."
        ));
        if (!ok) {
            return;
        }
        deletingAll = true;
        updateAdminTools();
        setStatus(T("chat.adminDeleting", "Deleting messages…"));
        deleteAllChatBatches()
            .then(function () {
                setStatus(T("chat.adminDeleteDone", "All messages were deleted."));
                window.setTimeout(function () {
                    if (statusEl && statusEl.textContent.indexOf(T("chat.adminDeleteDone", "All messages were deleted.")) >= 0) {
                        setStatus("");
                    }
                }, 4000);
            })
            .catch(function () {
                setStatus(T("chat.adminDeleteFailed", "Could not delete some messages. Check rules and try again."));
            })
            .finally(function () {
                deletingAll = false;
                updateAdminTools();
            });
    }

    function onMessagesClick(ev) {
        var btn = ev.target && ev.target.closest ? ev.target.closest(".chat-msg-delete") : null;
        if (!btn || !messagesEl || !messagesEl.contains(btn)) {
            return;
        }
        if (!isAdminUser()) {
            return;
        }
        ev.preventDefault();
        var docId = btn.getAttribute("data-chat-doc-id");
        if (!docId) {
            return;
        }
        if (!window.confirm(T("chat.adminConfirmDeleteOne", "Delete this message?"))) {
            return;
        }
        setStatus(T("chat.adminDeletingOne", "Deleting…"));
        deleteChatDocument(docId)
            .then(function () {
                setStatus("");
            })
            .catch(function () {
                setStatus(T("chat.adminDeleteFailed", "Could not delete some messages. Check rules and try again."));
            });
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
                lastServerDocs = list;
                renderCombined(list);
                setStatus("");
                if (navigator.onLine !== false) {
                    flushOutbox();
                }
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
        updateAdminTools();
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

    function flushOutbox() {
        var user = getUser();
        if (!user || !user.uid || sending) {
            return;
        }
        if (navigator.onLine === false) {
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        var uid = String(user.uid);
        var q = loadQueue(uid);
        if (!q.length) {
            return;
        }
        sending = true;
        updateGuestUi();
        if (isChatRoute()) {
            setStatus(T("chat.sendingQueued", "Sending queued messages…"));
        }
        var db = window.firebase.firestore();

        function sendNext() {
            var queue = loadQueue(uid);
            if (!queue.length) {
                sending = false;
                updateGuestUi();
                setStatus("");
                renderCombined(lastServerDocs);
                return;
            }
            var item = queue[0];
            var payload = {
                type: "text",
                text: String(item.text || "").trim(),
                senderUid: uid,
                senderName: displayNameForUser(user),
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection(CHAT_COLLECTION).add(payload)
                .then(function () {
                    queue.shift();
                    saveQueue(uid, queue);
                    sendNext();
                })
                .catch(function () {
                    sending = false;
                    updateGuestUi();
                    setStatus("");
                    renderCombined(lastServerDocs);
                });
        }
        sendNext();
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
        if (navigator.onLine === false) {
            enqueueMessage(user.uid, text);
            if (inputEl) {
                inputEl.value = "";
            }
            renderCombined(lastServerDocs);
            setStatus(T("chat.queuedOffline", "You’re offline — message queued. It will send when you’re back online."));
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
                enqueueMessage(user.uid, text);
                if (inputEl) {
                    inputEl.value = "";
                }
                renderCombined(lastServerDocs);
                setStatus(T("chat.queuedOffline", "Could not send — message saved. It will send when you’re back online."));
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
    if (messagesEl) {
        messagesEl.addEventListener("click", onMessagesClick);
    }
    if (chatAdminDeleteAllBtn) {
        chatAdminDeleteAllBtn.addEventListener("click", function () {
            onAdminDeleteAllClick();
        });
    }

    window.addEventListener("online", function () {
        flushOutbox();
        if (isChatRoute()) {
            setStatus("");
        }
    });

    document.addEventListener("DOMContentLoaded", refreshChat);
    document.addEventListener("njc:routechange", function () {
        refreshChat();
        if (isChatRoute() && navigator.onLine !== false) {
            flushOutbox();
        }
    });
    document.addEventListener("njc:authchange", function () {
        refreshChat();
        if (navigator.onLine !== false) {
            flushOutbox();
        }
    });
    document.addEventListener("njc:profile-updated", function () {
        if (isChatRoute()) {
            refreshChat();
        }
    });
})();
