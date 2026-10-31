(function () {
    "use strict";

    var PRAYER_COLLECTION = "prayerWall";
    var PRIVATE_COLLECTION = "prayerWallPrivate";
    var LEGACY_URL = "https://mantledb.sh/v2/njc-belgium-prayer-wall/entries";
    var ADMIN_EMAIL = "simsonpeter@gmail.com";
    var MAX_ENTRIES = 250;
    var ALLOWED_CATEGORIES = ["healing", "travel", "thanksgiving", "family", "guidance"];

    function db() {
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length || !window.firebase.firestore) {
            throw new Error("Firestore is unavailable");
        }
        return window.firebase.firestore();
    }

    function currentUser() {
        if (window.NjcAuth && typeof window.NjcAuth.getUser === "function") {
            return window.NjcAuth.getUser();
        }
        return window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
    }

    function isAdmin() {
        return String(currentUser() && currentUser().email || "").trim().toLowerCase() === ADMIN_EMAIL;
    }

    function nowIso() {
        return new Date().toISOString();
    }

    function normalizeIso(value, allowEmpty) {
        var raw = String(value || "").trim();
        if (!raw && allowEmpty) {
            return "";
        }
        var date = new Date(raw);
        return Number.isNaN(date.getTime()) ? nowIso() : date.toISOString();
    }

    function normalizeCategories(raw) {
        var out = [];
        (Array.isArray(raw) ? raw : []).forEach(function (value) {
            var category = String(value || "").trim().toLowerCase();
            if (ALLOWED_CATEGORIES.indexOf(category) >= 0 && out.indexOf(category) < 0 && out.length < 3) {
                out.push(category);
            }
        });
        return out;
    }

    function normalizeReplies(raw) {
        var out = [];
        (Array.isArray(raw) ? raw : []).forEach(function (item) {
            var text = String(item && item.text || "").trim();
            if (text && out.length < 40) {
                out.push({
                    text: text.slice(0, 2000),
                    at: normalizeIso(item.at, false),
                    from: String(item.from || "").trim().slice(0, 160)
                });
            }
        });
        return out;
    }

    function safeCount(value) {
        var count = Math.floor(Number(value) || 0);
        return Math.max(0, Math.min(count, 1000000000));
    }

    function makeId(value) {
        var id = String(value || "").trim();
        if (!id) {
            id = String(Date.now()) + "-" + String(Math.floor(Math.random() * 1000000));
        }
        if (id.indexOf("/") >= 0 || id === "." || id === ".." || id.length > 500) {
            throw new Error("Invalid prayer id");
        }
        return id;
    }

    function normalizePrayer(raw, options) {
        var source = raw && typeof raw === "object" ? raw : {};
        var opts = options || {};
        var createdAt = normalizeIso(source.createdAt, false);
        var createdMs = Math.floor(Number(source.createdAtMs) || new Date(createdAt).getTime() || Date.now());
        var ownerUid = String(source.createdByUid || "").trim().slice(0, 128);
        return {
            id: makeId(source.id),
            name: String(source.name || "").trim().slice(0, 160),
            message: String(source.message || "").trim().slice(0, 8000),
            anonymous: Boolean(source.anonymous),
            urgent: Boolean(source.urgent),
            pastorOnly: Boolean(source.pastorOnly),
            approved: opts.forcePending
                ? false
                : (Object.prototype.hasOwnProperty.call(source, "approved") ? Boolean(source.approved) : true),
            categories: normalizeCategories(source.categories),
            prayed: safeCount(source.prayed),
            answered: safeCount(source.answered),
            thanked: safeCount(source.thanked),
            createdAt: createdAt,
            createdAtMs: Math.max(0, createdMs),
            updatedAt: normalizeIso(source.updatedAt, true),
            createdByUid: ownerUid
        };
    }

    function snapshotsToRows(snapshot) {
        var rows = [];
        snapshot.forEach(function (doc) {
            rows.push(normalizePrayer(Object.assign({}, doc.data(), { id: doc.id })));
        });
        return rows;
    }

    function mergeRows(groups) {
        var byId = {};
        groups.forEach(function (rows) {
            (rows || []).forEach(function (row) {
                byId[row.id] = row;
            });
        });
        return Object.keys(byId).map(function (id) {
            return byId[id];
        }).sort(function (a, b) {
            return Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0);
        }).slice(0, MAX_ENTRIES);
    }

    function loadPrivate(rows, admin, uid) {
        if (!admin && !uid) {
            return Promise.resolve(rows);
        }
        var query = db().collection(PRIVATE_COLLECTION);
        if (!admin) {
            query = query.where("ownerUid", "==", uid);
        }
        return query.get().then(function (snapshot) {
            var repliesById = {};
            snapshot.forEach(function (doc) {
                var value = doc.data() || {};
                repliesById[doc.id] = normalizeReplies(value.replies);
            });
            return rows.map(function (row) {
                return Object.assign({}, row, { pastorReplies: repliesById[row.id] || [] });
            });
        });
    }

    function list() {
        var user = currentUser();
        var uid = String(user && user.uid || "").trim();
        var admin = isAdmin();
        var collection = db().collection(PRAYER_COLLECTION);
        var reads = [];
        if (admin) {
            reads.push(collection.get().then(snapshotsToRows));
        } else {
            reads.push(collection.where("approved", "==", true).where("pastorOnly", "==", false).get().then(snapshotsToRows));
            if (uid) {
                reads.push(collection.where("createdByUid", "==", uid).get().then(snapshotsToRows));
            }
        }
        return Promise.all(reads).then(mergeRows).then(function (rows) {
            return loadPrivate(rows, admin, uid);
        });
    }

    function listAdmin() {
        if (!isAdmin()) {
            return Promise.reject(new Error("Admin required"));
        }
        return list();
    }

    function isPermissionDenied(err) {
        var code = String(err && err.code || "").toLowerCase();
        var message = String(err && err.message || "").toLowerCase();
        return code.indexOf("permission-denied") >= 0 || message.indexOf("insufficient permissions") >= 0;
    }

    function writeCreatedPrayer(row) {
        return db().collection(PRAYER_COLLECTION).doc(row.id).set(row).then(function () {
            return Object.assign({}, row, { pastorReplies: [] });
        });
    }

    function create(raw) {
        var user = currentUser();
        var source = Object.assign({}, raw || {});
        var uid = String(user && user.uid || "");
        var approvalCheck = Promise.resolve(false);
        if (Boolean(source.approved) && isAdmin()) {
            approvalCheck = Promise.resolve(true);
        } else if (Boolean(source.approved) && uid) {
            approvalCheck = db().collection("users").doc(uid).collection("app").doc("access").get()
                .then(function (snapshot) {
                    return Boolean(snapshot.exists && (snapshot.data() || {}).accessTier === "member");
                })
                .catch(function () {
                    return false;
                });
        }
        return approvalCheck.then(function (approved) {
            source.id = makeId(source.id);
            source.createdAt = nowIso();
            source.createdAtMs = Date.now();
            source.updatedAt = "";
            source.createdByUid = uid;
            source.approved = approved;
            source.prayed = 0;
            source.answered = 0;
            source.thanked = 0;
            var row = normalizePrayer(source);
            if (!row.message) {
                throw new Error("Prayer message is required");
            }
            var guestPublic = !uid && !row.pastorOnly;
            if (guestPublic) {
                row.approved = true;
                return writeCreatedPrayer(row).catch(function (err) {
                    if (!isPermissionDenied(err)) {
                        throw err;
                    }
                    row.approved = false;
                    return writeCreatedPrayer(row);
                });
            }
            return writeCreatedPrayer(row);
        });
    }

    function updateFields(id, fields) {
        return db().collection(PRAYER_COLLECTION).doc(makeId(id)).update(fields);
    }

    function editMessage(id, message) {
        var text = String(message || "").trim().slice(0, 8000);
        if (!text) {
            return Promise.reject(new Error("Prayer message is required"));
        }
        return updateFields(id, { message: text, updatedAt: nowIso() });
    }

    function setAnswered(id, answered) {
        return updateFields(id, { answered: answered ? 1 : 0, updatedAt: nowIso() });
    }

    function remove(id) {
        var prayerId = makeId(id);
        return db().collection(PRAYER_COLLECTION).doc(prayerId).delete().then(function () {
            return db().collection(PRIVATE_COLLECTION).doc(prayerId).delete().catch(function () {
                return null;
            });
        });
    }

    function transactCounter(id, field, delta) {
        var prayerId = makeId(id);
        if (field !== "prayed" && field !== "thanked") {
            return Promise.reject(new Error("Invalid prayer counter"));
        }
        if ((field === "prayed" && delta !== 1) || (field === "thanked" && delta !== 1 && delta !== -1)) {
            return Promise.reject(new Error("Invalid prayer counter change"));
        }
        var ref = db().collection(PRAYER_COLLECTION).doc(prayerId);
        return db().runTransaction(function (transaction) {
            return transaction.get(ref).then(function (snapshot) {
                if (!snapshot.exists) {
                    throw new Error("Prayer not found");
                }
                var current = safeCount((snapshot.data() || {})[field]);
                var next = current + delta;
                if (next < 0) {
                    throw new Error("Prayer counter cannot be negative");
                }
                var patch = {};
                patch[field] = next;
                transaction.update(ref, patch);
                return next;
            });
        });
    }

    function incrementPrayed(id) {
        return transactCounter(id, "prayed", 1);
    }

    function changeThanked(id, delta) {
        return transactCounter(id, "thanked", delta);
    }

    function adminUpdate(id, fields) {
        if (!isAdmin()) {
            return Promise.reject(new Error("Admin required"));
        }
        var allowed = {};
        ["approved", "urgent", "message", "answered"].forEach(function (key) {
            if (Object.prototype.hasOwnProperty.call(fields || {}, key)) {
                allowed[key] = key === "message"
                    ? String(fields[key] || "").trim().slice(0, 8000)
                    : (key === "answered" ? safeCount(fields[key]) : Boolean(fields[key]));
            }
        });
        allowed.updatedAt = nowIso();
        return updateFields(id, allowed);
    }

    function addPrivateReply(id, text) {
        if (!isAdmin()) {
            return Promise.reject(new Error("Admin required"));
        }
        var prayerId = makeId(id);
        var cleanText = String(text || "").trim().slice(0, 2000);
        if (!cleanText) {
            return Promise.reject(new Error("Reply text is required"));
        }
        var prayerRef = db().collection(PRAYER_COLLECTION).doc(prayerId);
        var privateRef = db().collection(PRIVATE_COLLECTION).doc(prayerId);
        return db().runTransaction(function (transaction) {
            return transaction.get(prayerRef).then(function (prayerSnapshot) {
                if (!prayerSnapshot.exists) {
                    throw new Error("Prayer not found");
                }
                return transaction.get(privateRef).then(function (privateSnapshot) {
                    var prayer = prayerSnapshot.data() || {};
                    var privateData = privateSnapshot.exists ? privateSnapshot.data() : {};
                    var replies = normalizeReplies(privateData.replies);
                    replies.push({
                        text: cleanText,
                        at: nowIso(),
                        from: String(currentUser() && currentUser().email || "admin").slice(0, 160)
                    });
                    replies = replies.slice(-40);
                    transaction.set(privateRef, {
                        prayerId: prayerId,
                        ownerUid: String(prayer.createdByUid || ""),
                        replies: replies,
                        updatedAt: nowIso()
                    });
                    return replies;
                });
            });
        });
    }

    function upsertMany(rows) {
        if (!isAdmin()) {
            return Promise.reject(new Error("Admin required"));
        }
        var normalized = (Array.isArray(rows) ? rows : []).map(function (row) {
            return normalizePrayer(row);
        }).filter(function (row) {
            return row.message;
        }).slice(0, MAX_ENTRIES);
        if (!normalized.length) {
            return Promise.reject(new Error("No nonempty prayers to restore"));
        }
        var index = 0;
        function writeNextBatch() {
            if (index >= normalized.length) {
                return Promise.resolve(normalized.length);
            }
            var batch = db().batch();
            normalized.slice(index, index + 200).forEach(function (row) {
                var publicRow = Object.assign({}, row);
                var replies = normalizeReplies((rows.find(function (source) {
                    return String(source && source.id || "") === row.id;
                }) || {}).pastorReplies);
                batch.set(db().collection(PRAYER_COLLECTION).doc(row.id), publicRow, { merge: true });
                if (replies.length) {
                    batch.set(db().collection(PRIVATE_COLLECTION).doc(row.id), {
                        prayerId: row.id,
                        ownerUid: row.createdByUid,
                        replies: replies,
                        updatedAt: nowIso()
                    }, { merge: true });
                }
            });
            index += 200;
            return batch.commit().then(writeNextBatch);
        }
        return writeNextBatch();
    }

    function migrateLegacyFromMantle() {
        if (!isAdmin()) {
            return Promise.reject(new Error("Admin required"));
        }
        return fetch(LEGACY_URL + "?ts=" + Date.now(), { cache: "no-store" }).then(function (response) {
            if (!response.ok) {
                throw new Error("Legacy Prayer Wall could not be read");
            }
            return response.json();
        }).then(function (payload) {
            var rows = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.entries) ? payload.entries : []);
            if (!rows.length) {
                throw new Error("Legacy Prayer Wall is empty; nothing was imported");
            }
            return upsertMany(rows);
        });
    }

    window.NjcPrayerFirestoreStore = {
        list: list,
        listAdmin: listAdmin,
        create: create,
        editMessage: editMessage,
        setAnswered: setAnswered,
        delete: remove,
        incrementPrayed: incrementPrayed,
        changeThanked: changeThanked,
        adminUpdate: adminUpdate,
        addPrivateReply: addPrivateReply,
        upsertBackup: upsertMany,
        migrateLegacyFromMantle: migrateLegacyFromMantle,
        normalize: normalizePrayer
    };
})();
