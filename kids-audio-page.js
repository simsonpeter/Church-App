(function () {
    var MANTLE_URL = "https://mantledb.sh/v2/njc-belgium-kids-audio/entries";

    var panel = document.getElementById("kids-panel-audios");
    var listEl = document.getElementById("kids-audio-list");
    var statusEl = document.getElementById("kids-audio-status");
    var playerWrap = document.getElementById("kids-audio-player-wrap");
    var playerTitleEl = document.getElementById("kids-audio-now-title");
    var audioEl = document.getElementById("kids-audio-element");
    var playerCloseBtn = document.getElementById("kids-audio-player-close");
    var pageCard = document.querySelector(".kids-page-card");

    if (!panel || !listEl) {
        return;
    }

    var rowsCache = [];
    var inflight = null;

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function T(key, fallback) {
        if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
            if (pageCard && typeof window.NjcI18n.tForElement === "function") {
                return window.NjcI18n.tForElement(pageCard, key, fallback);
            }
            return window.NjcI18n.t(key, fallback);
        }
        return fallback || key;
    }

    function isHttpsAudio(url) {
        var u = String(url || "").trim();
        return /^https:\/\//i.test(u);
    }

    function guessAudioKind(url) {
        var path = String(url || "").split("?")[0].split("#")[0].toLowerCase();
        if (/\.(mp3|mpeg)(\b|$)/.test(path)) {
            return "audio/mpeg";
        }
        if (/\.m4a(\b|$)/.test(path)) {
            return "audio/mp4";
        }
        if (/\.ogg(\b|$)/.test(path)) {
            return "audio/ogg";
        }
        if (/\.wav(\b|$)/.test(path)) {
            return "audio/wav";
        }
        return "";
    }

    function normalizeRow(raw, index) {
        var r = raw && typeof raw === "object" ? raw : {};
        var audioUrl = String(r.audioUrl || r.url || r.href || "").trim();
        return {
            id: String(r.id || "").trim() || ("kids-audio-" + index),
            title: String(r.title || "").trim(),
            titleTa: String(r.titleTa || "").trim(),
            description: String(r.description || "").trim(),
            descriptionTa: String(r.descriptionTa || "").trim(),
            audioUrl: audioUrl,
            coverImageUrl: String(r.coverImageUrl || r.coverUrl || r.imageUrl || "").trim(),
            durationLabel: String(r.durationLabel || r.duration || "").trim(),
            sortOrder: Number(r.sortOrder) || 0
        };
    }

    function pickLang(entry) {
        var lang = "en";
        try {
            if (window.NjcI18n && typeof window.NjcI18n.getLanguage === "function") {
                lang = window.NjcI18n.getLanguage() || "en";
            }
        } catch (e) {}
        if (lang === "ta") {
            return {
                title: entry.titleTa || entry.title || T("kids.audioUntitled", "Untitled"),
                description: entry.descriptionTa || entry.description || ""
            };
        }
        return {
            title: entry.title || entry.titleTa || T("kids.audioUntitled", "Untitled"),
            description: entry.description || entry.descriptionTa || ""
        };
    }

    function fetchEntries() {
        return fetch(MANTLE_URL + "?ts=" + String(Date.now()), { cache: "no-store" })
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("load");
                }
                return response.json().then(function (payload) {
                    if (Array.isArray(payload)) {
                        return payload;
                    }
                    return payload && Array.isArray(payload.entries) ? payload.entries : [];
                });
            });
    }

    function renderList(rows) {
        var valid = rows.filter(function (e) {
            return e && isHttpsAudio(e.audioUrl);
        });
        valid.sort(function (a, b) {
            var ao = Number(a.sortOrder) || 0;
            var bo = Number(b.sortOrder) || 0;
            if (ao !== bo) {
                return ao - bo;
            }
            return String(a.title || "").localeCompare(String(b.title || ""));
        });
        if (!valid.length) {
            listEl.innerHTML = "";
            listEl.hidden = true;
            return;
        }
        listEl.hidden = false;
        listEl.innerHTML = valid.map(function (entry) {
            var picked = pickLang(entry);
            var desc = picked.description ? "<p class=\"kids-audio-desc\">" + escapeHtml(picked.description) + "</p>" : "";
            var dur = entry.durationLabel
                ? "<span class=\"kids-audio-duration\">" + escapeHtml(entry.durationLabel) + "</span>"
                : "";
            var cover = /^https:\/\//i.test(entry.coverImageUrl)
                ? "<div class=\"kids-audio-cover\"><img src=\"" + escapeHtml(entry.coverImageUrl) + "\" alt=\"\" width=\"72\" height=\"72\" loading=\"lazy\" decoding=\"async\"></div>"
                : "<div class=\"kids-audio-cover kids-audio-cover-fallback\" aria-hidden=\"true\"><i class=\"fa-solid fa-headphones\"></i></div>";
            return (
                "<li class=\"kids-audio-item\">" +
                cover +
                "<div class=\"kids-audio-item-main\">" +
                "  <div class=\"kids-audio-item-head\">" +
                "    <h3 class=\"kids-audio-item-title\">" + escapeHtml(picked.title) + "</h3>" +
                dur +
                "  </div>" +
                desc +
                "  <div class=\"kids-audio-item-actions\">" +
                "    <button type=\"button\" class=\"button-link kids-audio-play-btn\" data-kids-audio-id=\"" + escapeHtml(entry.id) + "\">" +
                "      <i class=\"fa-solid fa-circle-play\" aria-hidden=\"true\"></i> " +
                escapeHtml(T("kids.audioPlay", "Play")) +
                "    </button>" +
                "  </div>" +
                "</div>" +
                "</li>"
            );
        }).join("");
    }

    function findEntry(id) {
        var sid = String(id || "");
        for (var i = 0; i < rowsCache.length; i++) {
            if (rowsCache[i] && String(rowsCache[i].id) === sid) {
                return rowsCache[i];
            }
        }
        return null;
    }

    function showPlayer(entry) {
        if (!audioEl || !playerWrap) {
            return;
        }
        var picked = pickLang(entry);
        if (playerTitleEl) {
            playerTitleEl.textContent = picked.title;
        }
        audioEl.pause();
        audioEl.removeAttribute("src");
        audioEl.innerHTML = "";
        var kind = guessAudioKind(entry.audioUrl);
        var src = document.createElement("source");
        src.src = entry.audioUrl;
        if (kind) {
            src.type = kind;
        }
        audioEl.appendChild(src);
        audioEl.load();
        playerWrap.hidden = false;
        try {
            var p = audioEl.play();
            if (p && typeof p.catch === "function") {
                p.catch(function () {});
            }
        } catch (ePlay) {}
    }

    function hidePlayer() {
        if (audioEl) {
            try {
                audioEl.pause();
            } catch (e) {}
            audioEl.removeAttribute("src");
            audioEl.innerHTML = "";
        }
        if (playerWrap) {
            playerWrap.hidden = true;
        }
        if (playerTitleEl) {
            playerTitleEl.textContent = "";
        }
    }

    function applyRows(rows) {
        rowsCache = rows.map(function (r, i) {
            return normalizeRow(r, i);
        }).filter(function (e) {
            return e && isHttpsAudio(e.audioUrl);
        });
        renderList(rowsCache);
    }

    function setStatus(key, fallback, isError) {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = false;
        statusEl.textContent = T(key, fallback);
        statusEl.dataset.state = isError ? "error" : "";
    }

    function clearStatus() {
        if (!statusEl) {
            return;
        }
        statusEl.hidden = true;
        statusEl.textContent = "";
        statusEl.dataset.state = "";
    }

    function loadKidsAudios() {
        if (inflight) {
            return inflight;
        }
        clearStatus();
        listEl.innerHTML = "";
        listEl.hidden = true;
        setStatus("kids.audioLoading", "Loading audio list…", false);
        inflight = fetchEntries()
            .then(function (raw) {
                applyRows(Array.isArray(raw) ? raw : []);
                clearStatus();
                if (!rowsCache.length) {
                    setStatus("kids.audioEmpty", "No audio yet. Your church can add links in the admin dashboard.", false);
                }
            })
            .catch(function () {
                rowsCache = [];
                renderList([]);
                setStatus("kids.audioError", "Could not load audio. Try again later.", true);
            })
            .finally(function () {
                inflight = null;
            });
        return inflight;
    }

    listEl.addEventListener("click", function (event) {
        var btn = event.target && event.target.closest ? event.target.closest("button[data-kids-audio-id]") : null;
        if (!btn) {
            return;
        }
        var id = btn.getAttribute("data-kids-audio-id");
        var entry = findEntry(id);
        if (!entry) {
            return;
        }
        showPlayer(entry);
    });

    if (playerCloseBtn) {
        playerCloseBtn.addEventListener("click", function () {
            hidePlayer();
        });
    }

    document.addEventListener("njc:langchange", function () {
        if (rowsCache.length) {
            renderList(rowsCache);
        }
    });

    document.addEventListener("njc:admin-kids-audio-updated", function () {
        loadKidsAudios();
    });

    window.NjcKidsAudio = {
        load: loadKidsAudios,
        mantleUrl: MANTLE_URL
    };
})();
