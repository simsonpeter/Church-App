(function () {
            var form = document.getElementById("prayer-request-form");
            var nameInput = document.getElementById("prayer-name");
            var messageInput = document.getElementById("prayer-message");
            var note = document.getElementById("prayer-form-note");
            var contactFormSubmit = form ? form.querySelector("button[type=\"submit\"]") : null;
            var prayerWallForm = document.getElementById("prayer-wall-form");
            var prayerWallName = document.getElementById("prayer-wall-name");
            var prayerWallMessage = document.getElementById("prayer-wall-message");
            var prayerWallAnonymous = document.getElementById("prayer-wall-anonymous");
            var prayerWallUrgent = document.getElementById("prayer-wall-urgent");
            var prayerWallOpenButton = document.getElementById("prayer-wall-open-btn");
            var prayerWallCancelButton = document.getElementById("prayer-wall-cancel-btn");
            var prayerWallNote = document.getElementById("prayer-wall-note");
            var prayerWallTabs = document.querySelectorAll("button[data-prayer-tab]");
            var prayerWallList = document.getElementById("prayer-wall-list");
            var prayerWallSubmit = prayerWallForm ? prayerWallForm.querySelector("button[type=\"submit\"]") : null;
            var prayerCard = prayerWallList ? prayerWallList.closest(".card") : null;
            var contactCard = form ? form.closest(".card") : null;
            var prayerDetailOverlay = document.getElementById("prayer-detail-overlay");
            var prayerDetailBackdrop = document.getElementById("prayer-detail-backdrop");
            var prayerDetailCloseButton = document.getElementById("prayer-detail-close");
            var prayerDetailName = document.getElementById("prayer-detail-name");
            var prayerDetailMessage = document.getElementById("prayer-detail-message");
            var prayerDetailDate = document.getElementById("prayer-detail-date");
            var prayerDetailUrgentBadge = document.getElementById("prayer-detail-urgent");
            var prayerDetailPrayButton = document.getElementById("prayer-detail-pray");
            var prayerDetailAnsweredButton = document.getElementById("prayer-detail-answered");
            var prayerDetailThankButton = document.getElementById("prayer-detail-thank");
            var prayerDetailResetAnsweredButton = document.getElementById("prayer-detail-reset-answered");
            var prayerDetailEditButton = document.getElementById("prayer-detail-edit");
            var prayerDetailDeleteButton = document.getElementById("prayer-detail-delete");

            var PRAYER_WALL_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
            var CONTACT_FORM_URL = "https://mantledb.sh/v2/njc-belgium-contact-messages/entries";
            var MAX_ENTRIES = 100;
            var CONTACT_MAX_ENTRIES = 200;
            var ADMIN_EMAIL = "simsonpeter@gmail.com";
            var PRAYER_TRANSLATION_CACHE_KEY = "njc_prayer_translation_cache_v1";
            var PRAYER_ACTION_STATE_KEY = "njc_prayer_action_state_v1";
            var PRAYER_CLIENT_ID_KEY = "njc_prayer_client_id_v1";
            var prayerWallEntries = [];
            var prayerWallLoading = true;
            var prayerWallError = false;
            var prayerWallBusy = false;
            var contactFormBusy = false;
            var activePrayerDetailId = "";
            var activePrayerTab = "urgent";
            var prayerTranslationCache = loadPrayerTranslationCache();
            var prayerActionState = loadPrayerActionState();
            var prayerClientId = getOrCreatePrayerClientId();
            var prayerTranslationPending = {};
            var prayerTranslationSaveTimerId = null;

            function T(key, fallback, sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.t === "function") {
                    if (sourceElement && typeof window.NjcI18n.tForElement === "function") {
                        return window.NjcI18n.tForElement(sourceElement, key, fallback);
                    }
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

            function getLocale(sourceElement) {
                if (window.NjcI18n && typeof window.NjcI18n.getLocale === "function") {
                    if (sourceElement && typeof window.NjcI18n.getLocaleForElement === "function") {
                        return window.NjcI18n.getLocaleForElement(sourceElement);
                    }
                    return window.NjcI18n.getLocale();
                }
                return "en-GB";
            }

            function getLanguage(sourceElement) {
                if (window.NjcI18n) {
                    if (sourceElement && typeof window.NjcI18n.getLanguageForElement === "function") {
                        return window.NjcI18n.getLanguageForElement(sourceElement) === "ta" ? "ta" : "en";
                    }
                    if (typeof window.NjcI18n.getLanguage === "function") {
                        return window.NjcI18n.getLanguage() === "ta" ? "ta" : "en";
                    }
                }
                return "en";
            }

            function normalizeEmail(email) {
                return String(email || "").trim().toLowerCase();
            }

            function getCurrentUser() {
                if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
                    return window.NjcAuth.getUser();
                }
                return null;
            }

            function loadPrayerActionState() {
                try {
                    var raw = window.localStorage.getItem(PRAYER_ACTION_STATE_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (err) {
                    return {};
                }
            }

            function savePrayerActionState() {
                try {
                    window.localStorage.setItem(PRAYER_ACTION_STATE_KEY, JSON.stringify(prayerActionState || {}));
                } catch (err) {
                    return null;
                }
                return null;
            }

            function getOrCreatePrayerClientId() {
                try {
                    var existing = String(window.localStorage.getItem(PRAYER_CLIENT_ID_KEY) || "").trim();
                    if (existing) {
                        return existing;
                    }
                    var generated = "client-" + String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
                    window.localStorage.setItem(PRAYER_CLIENT_ID_KEY, generated);
                    return generated;
                } catch (err) {
                    return "client-fallback";
                }
            }

            function getPrayerActionActorKey() {
                var activeUser = getCurrentUser();
                var uid = String(activeUser && activeUser.uid || "").trim();
                if (uid) {
                    return "uid:" + uid;
                }
                var email = normalizeEmail(activeUser && activeUser.email);
                if (email) {
                    return "email:" + email;
                }
                return "guest:" + prayerClientId;
            }

            function isPrayerActionActive(prayerId, action) {
                var actorKey = getPrayerActionActorKey();
                var actorState = prayerActionState[actorKey];
                if (!actorState || typeof actorState !== "object") {
                    return false;
                }
                var prayerState = actorState[String(prayerId || "")];
                if (!prayerState || typeof prayerState !== "object") {
                    return false;
                }
                return Boolean(prayerState[String(action || "")]);
            }

            function setPrayerActionActive(prayerId, action, enabled) {
                var actorKey = getPrayerActionActorKey();
                if (!prayerActionState[actorKey] || typeof prayerActionState[actorKey] !== "object") {
                    prayerActionState[actorKey] = {};
                }
                var actorState = prayerActionState[actorKey];
                var prayerKey = String(prayerId || "");
                if (!actorState[prayerKey] || typeof actorState[prayerKey] !== "object") {
                    actorState[prayerKey] = {};
                }
                if (enabled) {
                    actorState[prayerKey][String(action || "")] = true;
                } else {
                    delete actorState[prayerKey][String(action || "")];
                }
                if (!Object.keys(actorState[prayerKey]).length) {
                    delete actorState[prayerKey];
                }
                if (!Object.keys(actorState).length) {
                    delete prayerActionState[actorKey];
                }
                savePrayerActionState();
            }

            function deriveNameFromUser(user) {
                var email = normalizeEmail(user && user.email);
                if (!email || email.indexOf("@") === -1) {
                    return "";
                }
                return email.split("@")[0].replace(/[._-]+/g, " ").trim();
            }

            function getPrayerDisplayName(entry, sourceElement) {
                if (entry.anonymous) {
                    return T("contact.prayerWallNameAnonymous", "Anonymous", sourceElement);
                }
                var name = String(entry.name || "").trim();
                if (name) {
                    return name;
                }
                var email = normalizeEmail(entry.createdByEmail);
                if (email && email.indexOf("@") > 0) {
                    return email.split("@")[0].replace(/[._-]+/g, " ").trim();
                }
                return T("contact.prayerWallNameAnonymous", "Anonymous", sourceElement);
            }

            function canManagePrayerEntry(entry) {
                var activeUser = getCurrentUser();
                if (!activeUser) {
                    return false;
                }
                var currentEmail = normalizeEmail(activeUser.email);
                if (currentEmail && currentEmail === normalizeEmail(ADMIN_EMAIL)) {
                    return true;
                }
                var currentUid = String(activeUser.uid || "").trim();
                if (!currentUid) {
                    return false;
                }
                return currentUid === String(entry && entry.createdByUid || "").trim();
            }

            function isAdminUser() {
                var activeUser = getCurrentUser();
                var currentEmail = normalizeEmail(activeUser && activeUser.email);
                return Boolean(currentEmail) && currentEmail === normalizeEmail(ADMIN_EMAIL);
            }

            function loadPrayerTranslationCache() {
                try {
                    var raw = window.localStorage.getItem(PRAYER_TRANSLATION_CACHE_KEY);
                    var parsed = raw ? JSON.parse(raw) : {};
                    return parsed && typeof parsed === "object" ? parsed : {};
                } catch (err) {
                    return {};
                }
            }

            function savePrayerTranslationCacheSoon() {
                if (prayerTranslationSaveTimerId) {
                    window.clearTimeout(prayerTranslationSaveTimerId);
                }
                prayerTranslationSaveTimerId = window.setTimeout(function () {
                    prayerTranslationSaveTimerId = null;
                    try {
                        window.localStorage.setItem(PRAYER_TRANSLATION_CACHE_KEY, JSON.stringify(prayerTranslationCache));
                    } catch (err) {
                        return;
                    }
                }, 120);
            }

            function hasTamilCharacters(text) {
                return /[\u0B80-\u0BFF]/.test(String(text || ""));
            }

            function hasLatinCharacters(text) {
                return /[A-Za-z]/.test(String(text || ""));
            }

            function shouldTranslatePrayerMessage(text, targetLanguage) {
                if (!text) {
                    return false;
                }
                if (targetLanguage === "ta") {
                    return hasLatinCharacters(text);
                }
                return hasTamilCharacters(text);
            }

            function buildPrayerTranslationKey(text, targetLanguage) {
                return String(targetLanguage || "en") + "::" + String(text || "");
            }

            function extractGoogleTranslatedText(payload) {
                if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
                    return "";
                }
                var chunks = payload[0].map(function (part) {
                    return Array.isArray(part) ? String(part[0] || "") : "";
                }).filter(Boolean);
                return chunks.join("").trim();
            }

            async function fetchPrayerTranslationGoogle(text, targetLanguage) {
                var url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" +
                    encodeURIComponent(targetLanguage) +
                    "&dt=t&q=" + encodeURIComponent(text);
                var response = await fetch(url, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error("Translate request failed");
                }
                var payload = await response.json();
                var translated = extractGoogleTranslatedText(payload);
                if (!translated) {
                    throw new Error("Empty translate result");
                }
                return translated;
            }

            async function fetchPrayerTranslationMyMemory(text, targetLanguage) {
                var url = "https://api.mymemory.translated.net/get?q=" +
                    encodeURIComponent(text) +
                    "&langpair=auto|" + encodeURIComponent(targetLanguage);
                var response = await fetch(url, { cache: "no-store" });
                if (!response.ok) {
                    throw new Error("Fallback translate failed");
                }
                var payload = await response.json();
                var translated = payload && payload.responseData ? String(payload.responseData.translatedText || "").trim() : "";
                if (!translated) {
                    throw new Error("Empty fallback translate result");
                }
                return translated;
            }

            async function requestPrayerTranslation(text, targetLanguage) {
                try {
                    return await fetchPrayerTranslationGoogle(text, targetLanguage);
                } catch (firstError) {
                    try {
                        return await fetchPrayerTranslationMyMemory(text, targetLanguage);
                    } catch (secondError) {
                        return text;
                    }
                }
            }

            function getTranslatedPrayerMessage(text, sourceElement) {
                var original = String(text || "").trim();
                var targetLanguage = getLanguage(sourceElement);
                if (!original || original.length > 700 || !shouldTranslatePrayerMessage(original, targetLanguage)) {
                    return Promise.resolve(original);
                }
                var cacheKey = buildPrayerTranslationKey(original, targetLanguage);
                if (Object.prototype.hasOwnProperty.call(prayerTranslationCache, cacheKey)) {
                    return Promise.resolve(String(prayerTranslationCache[cacheKey] || original));
                }
                if (prayerTranslationPending[cacheKey]) {
                    return prayerTranslationPending[cacheKey];
                }

                prayerTranslationPending[cacheKey] = requestPrayerTranslation(original, targetLanguage)
                    .then(function (translated) {
                        var finalText = String(translated || "").trim() || original;
                        prayerTranslationCache[cacheKey] = finalText;
                        savePrayerTranslationCacheSoon();
                        delete prayerTranslationPending[cacheKey];
                        return finalText;
                    })
                    .catch(function () {
                        delete prayerTranslationPending[cacheKey];
                        return original;
                    });
                return prayerTranslationPending[cacheKey];
            }

            function toPreviewText(text) {
                var previewText = String(text || "");
                if (previewText.length > 120) {
                    previewText = previewText.slice(0, 117).trim() + "...";
                }
                return previewText;
            }

            function getPrayerPreviewNode(prayerId) {
                if (!prayerWallList) {
                    return null;
                }
                var targetId = String(prayerId || "");
                var buttons = prayerWallList.querySelectorAll("button[data-prayer-open-id]");
                for (var index = 0; index < buttons.length; index += 1) {
                    var candidate = buttons[index];
                    if ((candidate.getAttribute("data-prayer-open-id") || "") === targetId) {
                        return candidate.querySelector(".prayer-list-preview");
                    }
                }
                return null;
            }

            function getPrayerPreviewTranslatedNode(prayerId) {
                if (!prayerWallList) {
                    return null;
                }
                var targetId = String(prayerId || "");
                var buttons = prayerWallList.querySelectorAll("button[data-prayer-open-id]");
                for (var index = 0; index < buttons.length; index += 1) {
                    var candidate = buttons[index];
                    if ((candidate.getAttribute("data-prayer-open-id") || "") === targetId) {
                        return candidate.querySelector(".prayer-list-translated-note");
                    }
                }
                return null;
            }

            function ensurePrayerDetailTranslatedNode() {
                if (!prayerDetailMessage || !prayerDetailMessage.parentNode) {
                    return null;
                }
                var existing = document.getElementById("prayer-detail-translated-note");
                if (existing) {
                    return existing;
                }
                var note = document.createElement("p");
                note.id = "prayer-detail-translated-note";
                note.className = "prayer-detail-translated-note";
                note.hidden = true;
                prayerDetailMessage.insertAdjacentElement("afterend", note);
                return note;
            }

            function isTranslatedResult(original, translated, targetLanguage) {
                var source = String(original || "").trim();
                var result = String(translated || "").trim();
                if (!source || !result) {
                    return false;
                }
                if (!shouldTranslatePrayerMessage(source, targetLanguage)) {
                    return false;
                }
                return source.toLowerCase() !== result.toLowerCase();
            }

            function applyPrayerDetailTranslation(entry) {
                if (!entry || !prayerDetailMessage) {
                    return;
                }
                var prayerId = String(entry.id || "");
                var languageAtRequest = getLanguage(prayerCard);
                var translatedNote = ensurePrayerDetailTranslatedNode();
                if (translatedNote) {
                    translatedNote.hidden = true;
                    translatedNote.textContent = "";
                }
                getTranslatedPrayerMessage(entry.message || "", prayerCard).then(function (translated) {
                    if (!prayerDetailMessage || activePrayerDetailId !== prayerId || languageAtRequest !== getLanguage(prayerCard)) {
                        return;
                    }
                    prayerDetailMessage.textContent = translated || entry.message || "";
                    if (translatedNote) {
                        var isTranslated = isTranslatedResult(entry.message || "", translated, languageAtRequest);
                        translatedNote.hidden = !isTranslated;
                        translatedNote.textContent = isTranslated
                            ? T("contact.prayerWallTranslated", "Translated", prayerCard)
                            : "";
                    }
                });
            }

            function applyPrayerListTranslations(entries) {
                var languageAtRequest = getLanguage(prayerCard);
                entries.forEach(function (entry) {
                    var prayerId = String(entry.id || "");
                    getTranslatedPrayerMessage(entry.message || "", prayerCard).then(function (translated) {
                        if (languageAtRequest !== getLanguage(prayerCard)) {
                            return;
                        }
                        var previewNode = getPrayerPreviewNode(prayerId);
                        if (previewNode) {
                            previewNode.textContent = toPreviewText(translated);
                        }
                        var translatedNode = getPrayerPreviewTranslatedNode(prayerId);
                        if (translatedNode) {
                            var isTranslated = isTranslatedResult(entry.message || "", translated, languageAtRequest);
                            translatedNode.hidden = !isTranslated;
                            translatedNode.textContent = isTranslated
                                ? T("contact.prayerWallTranslated", "Translated", prayerCard)
                                : "";
                        }
                        if (activePrayerDetailId === prayerId && prayerDetailMessage && prayerDetailOverlay && !prayerDetailOverlay.hidden) {
                            prayerDetailMessage.textContent = translated || entry.message || "";
                        }
                    });
                });
            }

            function formatLocalDate(isoText, sourceElement) {
                var date = new Date(isoText);
                if (Number.isNaN(date.getTime())) {
                    return "";
                }
                return new Intl.DateTimeFormat(getLocale(sourceElement), {
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
                    answered: Math.max(0, Number(source.answered || 0) || 0),
                    thanked: Math.max(0, Number(source.thanked || 0) || 0),
                    createdAt: source.createdAt ? String(source.createdAt) : new Date().toISOString(),
                    updatedAt: source.updatedAt ? String(source.updatedAt) : "",
                    createdByUid: String(source.createdByUid || "").trim(),
                    createdByEmail: normalizeEmail(source.createdByEmail)
                };
            }

            function getPrayerEntriesForActiveTab(entries) {
                var source = Array.isArray(entries) ? entries : [];
                if (activePrayerTab === "other") {
                    return source.filter(function (entry) {
                        return !entry.urgent;
                    });
                }
                return source.filter(function (entry) {
                    return entry.urgent;
                });
            }

            function hasUrgentPrayerEntries(entries) {
                var source = Array.isArray(entries) ? entries : [];
                return source.some(function (entry) {
                    return Boolean(entry && entry.urgent);
                });
            }

            function getDefaultPrayerTab(entries) {
                return hasUrgentPrayerEntries(entries) ? "urgent" : "other";
            }

            function setActivePrayerTab(tab, options) {
                var config = options && typeof options === "object" ? options : {};
                activePrayerTab = tab === "other" ? "other" : "urgent";
                if (prayerWallTabs && prayerWallTabs.length) {
                    prayerWallTabs.forEach(function (tabButton) {
                        var tabValue = (tabButton.getAttribute("data-prayer-tab") || "").toLowerCase();
                        var selected = tabValue === activePrayerTab;
                        tabButton.classList.toggle("active", selected);
                        tabButton.setAttribute("aria-selected", selected ? "true" : "false");
                    });
                }
                if (!config.skipRender) {
                    renderPrayerWall();
                }
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
                if (prayerDetailAnsweredButton) {
                    prayerDetailAnsweredButton.setAttribute("data-prayer-id", prayerId || "");
                }
                if (prayerDetailThankButton) {
                    prayerDetailThankButton.setAttribute("data-prayer-id", prayerId || "");
                }
                if (prayerDetailResetAnsweredButton) {
                    prayerDetailResetAnsweredButton.setAttribute("data-prayer-id", prayerId || "");
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
                var safeName = getPrayerDisplayName(entry, prayerCard);
                var prayedLabel = formatCount(T("contact.prayerWallPrayed", "Prayed ({count})", prayerCard), Number(entry.prayed || 0));
                var answeredLabel = formatCount(T("contact.prayerWallAnswered", "Answered ({count})", prayerCard), Number(entry.answered || 0));
                var thankLabel = formatCount(T("contact.prayerWallThanked", "Thank You ({count})", prayerCard), Number(entry.thanked || 0));
                var prayActive = isPrayerActionActive(entry.id, "pray");
                var answerActive = isPrayerActionActive(entry.id, "answer");
                var thankActive = isPrayerActionActive(entry.id, "thank");
                if (prayerDetailName) {
                    prayerDetailName.textContent = safeName;
                }
                if (prayerDetailMessage) {
                    prayerDetailMessage.textContent = entry.message || "";
                }
                applyPrayerDetailTranslation(entry);
                if (prayerDetailDate) {
                    prayerDetailDate.textContent = formatLocalDate(entry.updatedAt || entry.createdAt || "", prayerCard);
                }
                if (prayerDetailUrgentBadge) {
                    prayerDetailUrgentBadge.hidden = !entry.urgent;
                    var urgentLabelText = T("contact.prayerWallUrgentBadge", "Urgent", prayerCard);
                    prayerDetailUrgentBadge.setAttribute("title", urgentLabelText);
                    var urgentLabelNode = prayerDetailUrgentBadge.querySelector("span");
                    if (urgentLabelNode) {
                        urgentLabelNode.textContent = urgentLabelText;
                    }
                }
                if (prayerDetailPrayButton) {
                    prayerDetailPrayButton.textContent = prayedLabel;
                    prayerDetailPrayButton.classList.toggle("active", prayActive);
                }
                if (prayerDetailAnsweredButton) {
                    prayerDetailAnsweredButton.textContent = answeredLabel;
                    prayerDetailAnsweredButton.classList.toggle("active", answerActive);
                }
                if (prayerDetailThankButton) {
                    prayerDetailThankButton.textContent = thankLabel;
                    prayerDetailThankButton.classList.toggle("active", thankActive);
                }
                var canManage = canManagePrayerEntry(entry);
                var canResetAnswered = isAdminUser();
                if (prayerDetailResetAnsweredButton) {
                    prayerDetailResetAnsweredButton.hidden = !canResetAnswered;
                    prayerDetailResetAnsweredButton.disabled = !canResetAnswered || prayerWallBusy;
                }
                if (prayerDetailEditButton) {
                    prayerDetailEditButton.hidden = !canManage;
                    prayerDetailEditButton.disabled = !canManage || prayerWallBusy;
                }
                if (prayerDetailDeleteButton) {
                    prayerDetailDeleteButton.hidden = !canManage;
                    prayerDetailDeleteButton.disabled = !canManage || prayerWallBusy;
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
                    prayerWallList.querySelectorAll("button[data-prayer-id][data-prayer-action]").forEach(function (button) {
                        button.disabled = prayerWallBusy;
                    });
                }
                if (prayerDetailOverlay) {
                    prayerDetailOverlay.querySelectorAll("button[data-prayer-id][data-prayer-action]").forEach(function (button) {
                        var action = button.getAttribute("data-prayer-action") || "";
                        if (action !== "pray" && button.hidden) {
                            return;
                        }
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
                prayerWallNote.textContent = T(key, fallback, prayerCard);
            }

            function showContactNote(state, key, fallback) {
                if (!note) {
                    return;
                }
                note.hidden = false;
                note.dataset.state = state || "";
                note.textContent = T(key, fallback, contactCard);
            }

            function setContactFormBusy(isBusy) {
                contactFormBusy = Boolean(isBusy);
                if (contactFormSubmit) {
                    contactFormSubmit.disabled = contactFormBusy;
                }
            }

            async function fetchContactMessages() {
                var response = await fetch(CONTACT_FORM_URL + "?ts=" + String(Date.now()), {
                    cache: "no-store"
                });
                if (response.status === 404) {
                    var createResponse = await fetch(CONTACT_FORM_URL, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ entries: [] })
                    });
                    if (!createResponse.ok) {
                        throw new Error("Could not initialize contact messages");
                    }
                    return [];
                }
                if (!response.ok) {
                    throw new Error("Could not load contact messages");
                }
                var payload = await response.json();
                return payload && Array.isArray(payload.entries) ? payload.entries : [];
            }

            async function saveContactMessages(entries) {
                var payload = {
                    entries: entries.slice(0, CONTACT_MAX_ENTRIES)
                };
                var response = await fetch(CONTACT_FORM_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) {
                    throw new Error("Could not save contact message");
                }
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
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadingTitle", "Loading prayer wall...", prayerCard)) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadingBody", "Please wait.", prayerCard)) + "</p>" +
                        "</li>";
                    return;
                }

                if (prayerWallError) {
                    closePrayerDetail();
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(T("contact.prayerWallLoadErrorTitle", "Could not load prayer wall", prayerCard)) + "</h3>" +
                        "  <p>" + escapeHtml(T("contact.prayerWallLoadErrorBody", "Please check your connection and try again.", prayerCard)) + "</p>" +
                        "</li>";
                    return;
                }

                var sortedEntries = getSortedPrayerEntries(prayerWallEntries).slice(0, 40);
                if (activePrayerTab === "urgent" && !hasUrgentPrayerEntries(sortedEntries)) {
                    setActivePrayerTab("other");
                    return;
                }
                var entries = getPrayerEntriesForActiveTab(sortedEntries).slice(0, 25);
                if (entries.length === 0) {
                    closePrayerDetail();
                    var noEntryTitle = activePrayerTab === "other"
                        ? T("contact.prayerWallNoOtherTitle", "No daily prayers yet", prayerCard)
                        : T("contact.prayerWallNoUrgentTitle", "No urgent prayers right now", prayerCard);
                    var noEntryBody = activePrayerTab === "other"
                        ? T("contact.prayerWallNoOtherBody", "Daily prayer requests will appear here.", prayerCard)
                        : T("contact.prayerWallNoUrgentBody", "Urgent requests will appear here first.", prayerCard);
                    prayerWallList.innerHTML = "" +
                        "<li>" +
                        "  <h3>" + escapeHtml(noEntryTitle) + "</h3>" +
                        "  <p>" + escapeHtml(noEntryBody) + "</p>" +
                        "</li>";
                    return;
                }

                prayerWallList.innerHTML = entries.map(function (entry) {
                    var safeName = getPrayerDisplayName(entry, prayerCard);
                    var prayedLabel = formatCount(T("contact.prayerWallPrayed", "Prayed ({count})", prayerCard), Number(entry.prayed || 0));
                    var dateText = formatLocalDate(entry.updatedAt || entry.createdAt || "", prayerCard);
                    var previewText = toPreviewText(entry.message || "");
                    var urgentText = T("contact.prayerWallUrgentBadge", "Urgent", prayerCard);
                    var urgentRibbonText = T("contact.prayerWallUrgentRibbon", "URGENT PRAYER", prayerCard);
                    var answeredLabel = formatCount(T("contact.prayerWallAnswered", "Answered ({count})", prayerCard), Number(entry.answered || 0));
                    var thankLabel = formatCount(T("contact.prayerWallThanked", "Thank You ({count})", prayerCard), Number(entry.thanked || 0));
                    var answerActive = isPrayerActionActive(entry.id, "answer");
                    var thankActive = isPrayerActionActive(entry.id, "thank");
                    var answerClass = answerActive ? "prayer-action-btn active" : "prayer-action-btn";
                    var thankClass = thankActive ? "prayer-action-btn active" : "prayer-action-btn";
                    var itemClass = entry.urgent ? "prayer-list-item prayer-list-item-urgent" : "prayer-list-item";
                    var urgentBadge = entry.urgent
                        ? ("<span class=\"prayer-list-urgent-badge\"><i class=\"fa-solid fa-bolt\" aria-hidden=\"true\"></i>" + escapeHtml(urgentText) + "</span>")
                        : "";
                    var urgentRibbon = entry.urgent
                        ? ("<span class=\"prayer-list-corner-ribbon\">" + escapeHtml(urgentRibbonText) + "</span>")
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
                        "    <p class=\"prayer-list-translated-note\" hidden></p>" +
                        "    <div class=\"prayer-list-meta\">" +
                        "      <span class=\"page-note\">" + escapeHtml(dateText) + "</span>" +
                        "      <span class=\"prayer-list-prayed\">" + escapeHtml(prayedLabel) + "</span>" +
                        "      <span class=\"prayer-list-chevron\" aria-hidden=\"true\"><i class=\"fa-solid fa-chevron-right\"></i></span>" +
                        "    </div>" +
                        "  </button>" +
                        "  <div class=\"prayer-list-actions\">" +
                        "    <button type=\"button\" class=\"" + answerClass + "\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\" data-prayer-action=\"answer\">" + escapeHtml(answeredLabel) + "</button>" +
                        "    <button type=\"button\" class=\"" + thankClass + "\" data-prayer-id=\"" + escapeHtml(entry.id || "") + "\" data-prayer-action=\"thank\">" + escapeHtml(thankLabel) + "</button>" +
                        "  </div>" +
                        "</li>";
                }).join("");

                applyPrayerListTranslations(entries);
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
                    if (action === "reset-answer" && !isAdminUser()) {
                        showPrayerWallNote(
                            "manageDenied",
                            "contact.prayerWallManageDenied",
                            "Only admin or the user who posted can edit/delete."
                        );
                        return;
                    }
                    if ((action === "edit" || action === "delete") && !canManagePrayerEntry(targetEntry)) {
                        showPrayerWallNote(
                            "manageDenied",
                            "contact.prayerWallManageDenied",
                            "Only admin or the user who posted can edit/delete."
                        );
                        return;
                    }

                    if (action === "pray") {
                        var nextPrayActive = !isPrayerActionActive(prayerId, "pray");
                        targetEntry.prayed = Math.max(0, Number(targetEntry.prayed || 0) + (nextPrayActive ? 1 : -1));
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                        setPrayerActionActive(prayerId, "pray", nextPrayActive);
                    } else if (action === "answer") {
                        var nextAnswerActive = !isPrayerActionActive(prayerId, "answer");
                        targetEntry.answered = Math.max(0, Number(targetEntry.answered || 0) + (nextAnswerActive ? 1 : -1));
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                        setPrayerActionActive(prayerId, "answer", nextAnswerActive);
                    } else if (action === "thank") {
                        var nextThankActive = !isPrayerActionActive(prayerId, "thank");
                        targetEntry.thanked = Math.max(0, Number(targetEntry.thanked || 0) + (nextThankActive ? 1 : -1));
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                        setPrayerActionActive(prayerId, "thank", nextThankActive);
                    } else if (action === "reset-answer") {
                        targetEntry.answered = 0;
                        targetEntry.updatedAt = new Date().toISOString();
                        await savePrayerWallEntries(latestEntries);
                        Object.keys(prayerActionState || {}).forEach(function (actorKey) {
                            var actorState = prayerActionState[actorKey];
                            if (!actorState || typeof actorState !== "object") {
                                return;
                            }
                            var prayerState = actorState[String(prayerId || "")];
                            if (!prayerState || typeof prayerState !== "object") {
                                return;
                            }
                            delete prayerState.answer;
                            if (!Object.keys(prayerState).length) {
                                delete actorState[String(prayerId || "")];
                            }
                            if (!Object.keys(actorState).length) {
                                delete prayerActionState[actorKey];
                            }
                        });
                        savePrayerActionState();
                        showPrayerWallNote("resetAnswered", "contact.prayerWallResetAnsweredDone", "Answered count reset.");
                    } else if (action === "edit") {
                        var nextMessage = window.prompt(
                            T("contact.prayerWallEditPrompt", "Edit prayer request", prayerCard),
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
                            T("contact.prayerWallDeleteConfirm", "Delete this prayer request?", prayerCard)
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
                    setActivePrayerTab(getDefaultPrayerTab(prayerWallEntries), { skipRender: true });
                } catch (err) {
                    prayerWallError = true;
                }
                prayerWallLoading = false;
                renderPrayerWall();
            }

            if (form) {
                form.addEventListener("submit", async function (event) {
                    event.preventDefault();
                    if (contactFormBusy) {
                        return;
                    }
                    var nameValue = (nameInput.value || "").trim();
                    var messageValue = (messageInput.value || "").trim();
                    var activeUser = getCurrentUser();
                    var ownerUid = String(activeUser && activeUser.uid || "").trim();
                    var ownerEmail = normalizeEmail(activeUser && activeUser.email);
                    if (!nameValue) {
                        nameValue = deriveNameFromUser(activeUser);
                    }

                    if (!messageValue) {
                        showContactNote("needMessage", "contact.prayerNeedMessage", "Please enter your message.");
                        return;
                    }

                    setContactFormBusy(true);
                    try {
                        var latestMessages = await fetchContactMessages();
                        latestMessages.unshift({
                            id: String(Date.now()) + "-" + String(Math.floor(Math.random() * 100000)),
                            name: nameValue,
                            message: messageValue,
                            createdAt: new Date().toISOString(),
                            createdByUid: ownerUid,
                            createdByEmail: ownerEmail
                        });
                        await saveContactMessages(latestMessages);
                        messageInput.value = "";
                        nameInput.value = "";
                        showContactNote("sent", "contact.messageSent", "Your message was sent in the app.");
                    } catch (err) {
                        showContactNote("sendError", "contact.messageSendError", "Could not send your message now. Please try again.");
                    } finally {
                        setContactFormBusy(false);
                    }
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
                    var activeUser = getCurrentUser();
                    var ownerUid = String(activeUser && activeUser.uid || "").trim();
                    var ownerEmail = normalizeEmail(activeUser && activeUser.email);
                    if (!anonymousValue && !nameValue) {
                        nameValue = deriveNameFromUser(activeUser);
                    }

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
                            answered: 0,
                            thanked: 0,
                            createdAt: new Date().toISOString(),
                            updatedAt: "",
                            createdByUid: ownerUid,
                            createdByEmail: ownerEmail
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
                    var actionButton = event.target.closest("button[data-prayer-id][data-prayer-action]");
                    if (actionButton && !prayerWallBusy) {
                        var targetPrayerId = actionButton.getAttribute("data-prayer-id");
                        var targetAction = actionButton.getAttribute("data-prayer-action");
                        runPrayerWallAction(targetPrayerId, targetAction);
                        return;
                    }
                    var openButton = event.target.closest("button[data-prayer-open-id]");
                    if (!openButton || prayerWallBusy) {
                        return;
                    }
                    var prayerId = openButton.getAttribute("data-prayer-open-id");
                    openPrayerDetail(prayerId);
                });
            }

            if (prayerWallTabs && prayerWallTabs.length) {
                prayerWallTabs.forEach(function (tabButton) {
                    tabButton.addEventListener("click", function () {
                        setActivePrayerTab((tabButton.getAttribute("data-prayer-tab") || "").toLowerCase());
                    });
                });
                setActivePrayerTab(getDefaultPrayerTab(prayerWallEntries));
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
                    var contactState = note.dataset.state || "";
                    if (contactState === "sent") {
                        note.textContent = T("contact.messageSent", "Your message was sent in the app.", contactCard);
                    } else if (contactState === "sendError") {
                        note.textContent = T("contact.messageSendError", "Could not send your message now. Please try again.", contactCard);
                    } else {
                        note.textContent = T("contact.prayerNeedMessage", "Please enter your message.", contactCard);
                    }
                }
                if (prayerWallNote && !prayerWallNote.hidden) {
                    var state = prayerWallNote.dataset.state || "";
                    if (state === "posted") {
                        prayerWallNote.textContent = T("contact.prayerWallPosted", "Prayer request added to wall.", prayerCard);
                    } else if (state === "updated") {
                        prayerWallNote.textContent = T("contact.prayerWallUpdated", "Prayer request updated.", prayerCard);
                    } else if (state === "resetAnswered") {
                        prayerWallNote.textContent = T("contact.prayerWallResetAnsweredDone", "Answered count reset.", prayerCard);
                    } else if (state === "deleted") {
                        prayerWallNote.textContent = T("contact.prayerWallDeleted", "Prayer request deleted.", prayerCard);
                    } else if (state === "manageDenied") {
                        prayerWallNote.textContent = T("contact.prayerWallManageDenied", "Only admin or the user who posted can edit/delete.", prayerCard);
                    } else if (state === "syncError") {
                        prayerWallNote.textContent = T("contact.prayerWallSyncError", "Could not sync prayer wall. Please try again.", prayerCard);
                    } else {
                        prayerWallNote.textContent = T("contact.prayerWallNeedMessage", "Please write your prayer request.", prayerCard);
                    }
                }
                renderPrayerWall();
            });
            document.addEventListener("njc:cardlangchange", function () {
                renderPrayerWall();
                renderPrayerDetail();
            });
            document.addEventListener("njc:authchange", function () {
                renderPrayerWall();
                renderPrayerDetail();
            });
        })();
