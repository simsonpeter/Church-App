(function () {
    var COLLECTION = "testimonies";
    var PROFILE_KEY = "njc_user_profiles_v1";
    var MAX_BODY = 6000;
    var MAX_TITLE = 200;
    var PAGE_LIMIT = 60;

    var listEl = document.getElementById("testimony-list");
    var statusEl = document.getElementById("testimony-status");
    var formEl = document.getElementById("testimony-form");
    var loginHintEl = document.getElementById("testimony-login-hint");
    var titleInput = document.getElementById("testimony-title-input");
    var bodyInput = document.getElementById("testimony-body");
    var submitBtn = document.getElementById("testimony-submit");
    var testimonyCard = document.querySelector(".testimony-page-card");

    var unsubscribe = null;
    var submitting = false;
    var lastDocs = [];
    var docDataById = {};

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.tForElement === "function" && testimonyCard) {
            return window.NjcI18n.tForElement(testimonyCard, key, fallback);
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
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
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

    function isTestimonyRoute() {
        var v = document.querySelector('.page-view[data-route="testimony"]');
        return Boolean(v && v.classList.contains("active"));
    }

    function setStatus(message, isError) {
        if (!statusEl) {
            return;
        }
        statusEl.textContent = message || "";
        statusEl.hidden = !message;
        statusEl.classList.toggle("testimony-status--error", Boolean(isError));
    }

    function shareBaseUrl() {
        try {
            return String(window.location.origin || "") + String(window.location.pathname || "") + "#testimony";
        } catch (e) {
            return "#testimony";
        }
    }

    function buildShareText(d) {
        var title = String(d.title || "").trim();
        var body = String(d.text || "").trim();
        var name = String(d.authorName || "").trim();
        var head = title ? title : T("testimony.shareUntitled", "Testimony");
        var block = head + "\n\n" + body;
        if (name) {
            block += "\n\n— " + name;
        }
        block += "\n\n" + shareBaseUrl();
        return block;
    }

    function shareTestimony(d) {
        var text = buildShareText(d);
        if (navigator.share) {
            navigator.share({
                title: T("testimony.shareTitle", "Testimony — NJC Belgium"),
                text: text
            }).catch(function () {});
            return;
        }
        try {
            navigator.clipboard.writeText(text);
            setStatus(T("testimony.copied", "Copied to clipboard."), false);
            window.setTimeout(function () {
                setStatus("");
            }, 2500);
        } catch (e2) {
            window.prompt(T("testimony.copyFallback", "Copy this text:"), text);
        }
    }

    function deleteTestimony(docId, authorUid) {
        var user = getUser();
        if (!user || user.uid !== authorUid) {
            return;
        }
        if (!window.confirm(T("testimony.deleteConfirm", "Delete this testimony?"))) {
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        var db = window.firebase.firestore();
        db.collection(COLLECTION).doc(String(docId)).delete().catch(function () {
            setStatus(T("testimony.deleteFailed", "Could not delete. Try again."), true);
        });
    }

    function formatTime(ts) {
        if (!ts || typeof ts.toDate !== "function") {
            return "";
        }
        try {
            return ts.toDate().toLocaleString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e) {
            return "";
        }
    }

    function renderList(docs) {
        if (!listEl) {
            return;
        }
        var user = getUser();
        var myUid = user && user.uid ? String(user.uid) : "";
        lastDocs = Array.isArray(docs) ? docs : [];
        docDataById = {};
        lastDocs.forEach(function (docSnap) {
            var d = docSnap.data() || {};
            docDataById[docSnap.id] = {
                title: String(d.title || ""),
                text: String(d.text || ""),
                authorName: String(d.authorName || "")
            };
        });
        if (!lastDocs.length) {
            listEl.innerHTML = "<li><p class=\"page-note testimony-empty\">" + escapeHtml(T("testimony.empty", "No testimonies yet. Be the first to share!")) + "</p></li>";
            return;
        }
        var shareLabel = escapeHtml(T("testimony.share", "Share"));
        var copyLabel = escapeHtml(T("testimony.copy", "Copy text"));
        var delLabel = escapeHtml(T("testimony.delete", "Delete"));
        var html = lastDocs.map(function (docSnap) {
            var id = docSnap.id;
            var d = docSnap.data() || {};
            var title = String(d.title || "").trim();
            var body = String(d.text || "").trim();
            var name = escapeHtml(d.authorName || "");
            var time = escapeHtml(formatTime(d.createdAt));
            var head = title ? escapeHtml(title) : escapeHtml(T("testimony.cardNoTitle", "Testimony"));
            var mine = myUid && String(d.authorUid || "") === myUid;
            var actions = "" +
                "<div class=\"testimony-actions\">" +
                "  <button type=\"button\" class=\"button-link button-secondary testimony-share-btn\" data-testimony-share=\"" + escapeHtml(id) + "\">" + shareLabel + "</button>" +
                "  <button type=\"button\" class=\"button-link button-secondary testimony-copy-btn\" data-testimony-copy=\"" + escapeHtml(id) + "\">" + copyLabel + "</button>";
            if (mine) {
                actions += "  <button type=\"button\" class=\"button-link button-secondary testimony-delete-btn\" data-testimony-delete=\"" + escapeHtml(id) + "\" data-testimony-author=\"" + escapeHtml(String(d.authorUid || "")) + "\">" + delLabel + "</button>";
            }
            actions += "</div>";
            return "" +
                "<li class=\"testimony-item\" data-testimony-id=\"" + escapeHtml(id) + "\">" +
                "  <article class=\"testimony-card\">" +
                "    <header class=\"testimony-card-head\">" +
                "      <h3 class=\"testimony-card-title\">" + head + "</h3>" +
                "      <p class=\"testimony-card-meta\"><span class=\"testimony-card-name\">" + name + "</span>" +
                (time ? "<span class=\"testimony-card-time\">" + time + "</span>" : "") + "</p>" +
                "    </header>" +
                "    <div class=\"testimony-card-body\"><p>" + escapeHtml(body).replace(/\n/g, "<br>") + "</p></div>" +
                actions +
                "  </article>" +
                "</li>";
        }).join("");
        listEl.innerHTML = html;
    }

    function handleListClick(ev) {
        var t = ev.target;
        if (!t || typeof t.closest !== "function") {
            return;
        }
        var shareBtn = t.closest("[data-testimony-share]");
        if (shareBtn) {
            var sid = shareBtn.getAttribute("data-testimony-share");
            var parsed = sid ? docDataById[sid] : null;
            if (parsed) {
                shareTestimony(parsed);
            }
            return;
        }
        var copyBtn = t.closest("[data-testimony-copy]");
        if (copyBtn) {
            var cid = copyBtn.getAttribute("data-testimony-copy");
            var cp = cid ? docDataById[cid] : null;
            if (cp) {
                var txt = buildShareText(cp);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(txt).then(function () {
                        setStatus(T("testimony.copied", "Copied to clipboard."), false);
                        window.setTimeout(function () {
                            setStatus("");
                        }, 2200);
                    }).catch(function () {
                        window.prompt(T("testimony.copyFallback", "Copy this text:"), txt);
                    });
                } else {
                    window.prompt(T("testimony.copyFallback", "Copy this text:"), txt);
                }
            }
            return;
        }
        var delBtn = t.closest("[data-testimony-delete]");
        if (delBtn) {
            var did = delBtn.getAttribute("data-testimony-delete");
            var aid = delBtn.getAttribute("data-testimony-author");
            if (did) {
                deleteTestimony(did, aid || "");
            }
        }
    }

    function stopListen() {
        if (typeof unsubscribe === "function") {
            unsubscribe();
            unsubscribe = null;
        }
    }

    function startListen() {
        stopListen();
        if (!listEl || !window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        try {
            var db = window.firebase.firestore();
            var q = db.collection(COLLECTION).orderBy("createdAt", "desc").limit(PAGE_LIMIT);
            unsubscribe = q.onSnapshot(function (snap) {
                var list = [];
                snap.forEach(function (doc) {
                    list.push(doc);
                });
                renderList(list);
                setStatus("");
            }, function () {
                setStatus(T("testimony.loadError", "Could not load testimonies. Check Firestore rules."), true);
            });
        } catch (e) {
            setStatus(T("testimony.loadError", "Could not load testimonies. Check Firestore rules."), true);
        }
    }

    function updateAuthUi() {
        var user = getUser();
        var loggedIn = Boolean(user && user.uid);
        if (formEl) {
            formEl.hidden = !loggedIn;
        }
        if (loginHintEl) {
            loginHintEl.hidden = loggedIn;
        }
        if (submitBtn) {
            submitBtn.disabled = !loggedIn || submitting;
        }
        if (titleInput) {
            titleInput.disabled = !loggedIn;
        }
        if (bodyInput) {
            bodyInput.disabled = !loggedIn;
        }
    }

    function refreshTestimonyPage() {
        updateAuthUi();
        if (!isTestimonyRoute()) {
            stopListen();
            return;
        }
        startListen();
        renderList(lastDocs);
    }

    function submitTestimony(ev) {
        if (ev && typeof ev.preventDefault === "function") {
            ev.preventDefault();
        }
        var user = getUser();
        if (!user || !user.uid || submitting) {
            return;
        }
        var title = String(titleInput && titleInput.value || "").trim().slice(0, MAX_TITLE);
        var body = String(bodyInput && bodyInput.value || "").trim();
        if (!body) {
            setStatus(T("testimony.bodyRequired", "Please write your testimony."), true);
            return;
        }
        if (body.length > MAX_BODY) {
            setStatus(T("testimony.bodyTooLong", "Testimony is too long."), true);
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        submitting = true;
        if (submitBtn) {
            submitBtn.disabled = true;
        }
        setStatus(T("testimony.sending", "Publishing…"), false);
        var db = window.firebase.firestore();
        var payload = {
            authorUid: String(user.uid),
            authorName: displayNameForUser(user),
            text: body,
            createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
        };
        if (title) {
            payload.title = title;
        }
        db.collection(COLLECTION).add(payload)
            .then(function () {
                if (bodyInput) {
                    bodyInput.value = "";
                }
                if (titleInput) {
                    titleInput.value = "";
                }
                setStatus(T("testimony.sent", "Thank you! Your testimony is published."), false);
                window.setTimeout(function () {
                    setStatus("");
                }, 4000);
            })
            .catch(function () {
                setStatus(T("testimony.sendFailed", "Could not publish. Check your connection and Firestore rules."), true);
            })
            .finally(function () {
                submitting = false;
                updateAuthUi();
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (listEl) {
            listEl.addEventListener("click", handleListClick);
        }
        if (formEl) {
            formEl.addEventListener("submit", submitTestimony);
        }
        refreshTestimonyPage();
    });

    document.addEventListener("njc:routechange", refreshTestimonyPage);
    document.addEventListener("njc:authchange", refreshTestimonyPage);
})();
