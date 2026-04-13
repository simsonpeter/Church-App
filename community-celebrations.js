(function () {
    var CELEBRATION_PROFILES_COLLECTION = "celebrationProfiles";
    var PUBLIC_PROFILE_LIMIT = 2000;
    var BRUSSELS_TZ = "Europe/Brussels";

    var cache = [];
    var firestoreUnsubscribe = null;
    var listeners = [];
    /** Firebase is initialized in app-shell after this script; poll until apps exist. */
    var firebaseBootTimerId = null;
    var FIREBASE_BOOT_INTERVAL_MS = 350;
    var FIREBASE_BOOT_MAX_TICKS = 120;

    function getBrusselsYmdForDate(dateValue) {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: BRUSSELS_TZ,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(dateValue);

        function partValue(type) {
            var found = parts.find(function (part) {
                return part.type === type;
            });
            return found ? Number(found.value) : 0;
        }

        return {
            year: partValue("year"),
            month: partValue("month"),
            day: partValue("day")
        };
    }

    function monthDayMatchesStoredDate(ymdStr, brusselsYmd) {
        if (!brusselsYmd || !ymdStr || !/^\d{4}-\d{2}-\d{2}$/.test(ymdStr)) {
            return false;
        }
        var parts = ymdStr.split("-");
        return Number(parts[1]) === brusselsYmd.month && Number(parts[2]) === brusselsYmd.day;
    }

    function pickWishDisplayName(fullName) {
        var fromName = String(fullName || "").trim();
        if (fromName) {
            var first = fromName.split(/\s+/).filter(Boolean)[0] || "";
            if (first) {
                return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
            }
        }
        return "";
    }

    function partnerFirstName(raw) {
        return pickWishDisplayName(String(raw || "").trim()) || "";
    }

    function anniversaryCoupleDisplay(profile) {
        var me = pickWishDisplayName(String(profile && profile.fullName || "").trim()) || "friend";
        var partner = partnerFirstName(profile && profile.anniversaryPartnerName);
        return partner ? (me + " & " + partner) : me;
    }

    function celebrationDedupeNameKey(raw) {
        var s = String(raw || "").trim().toLowerCase().replace(/[^a-z0-9\u0b80-\u0bff\s]/gi, " ");
        var parts = s.split(/\s+/).filter(Boolean);
        return parts.slice(0, 4).join(" ");
    }

    function todayMonthDaySegment(todayYmd) {
        if (!todayYmd) {
            return "";
        }
        return String(todayYmd.month).padStart(2, "0") + "-" + String(todayYmd.day).padStart(2, "0");
    }

    function celebrationAnnouncementKeys(item, md) {
        var wish = String(item && item.personalWish || "");
        var keys = [];
        if (wish === "celebrationsCombo" && item.personalCelebrationLines && Array.isArray(item.personalCelebrationLines)) {
            item.personalCelebrationLines.forEach(function (line) {
                if (!line || typeof line !== "object") {
                    return;
                }
                if (line.kind === "anniversary") {
                    keys.push("ann|" + md);
                }
                if (line.kind === "birthday" || line.kind === "familyBirthday") {
                    keys.push("bday|" + md + "|" + celebrationDedupeNameKey(line.name));
                }
            });
            return keys;
        }
        if (wish === "anniversary") {
            keys.push("ann|" + md);
        } else if (wish === "birthday" || wish === "familyBirthday") {
            keys.push("bday|" + md + "|" + celebrationDedupeNameKey(item.personalDisplayName));
        }
        return keys;
    }

    function celebrationAnnouncementScore(item) {
        var s = 0;
        if (item.celebrationFromViewerProfile) {
            s -= 30;
        }
        if (item.communityCelebration) {
            s += 8;
        }
        var id = String(item && item.id || "");
        if (id.indexOf("njc-personal-celebrations") === 0 || id.indexOf("njc-personal-birthday") === 0 || id.indexOf("njc-personal-anniversary") === 0) {
            s -= 5;
        }
        if (id.indexOf("njc-family-bday") === 0) {
            s -= 2;
        }
        var disp = String(item && item.personalDisplayName || "");
        if (disp.indexOf(" & ") >= 0 && (item.personalWish === "anniversary" || item.personalWish === "celebrationsCombo")) {
            s -= 3;
        }
        return s;
    }

    /**
     * Merge duplicate celebration cards for the same calendar day (e.g. spouse on two profiles).
     */
    function dedupeCelebrationAnnouncements(items, todayYmd) {
        var list = Array.isArray(items) ? items.slice() : [];
        var md = todayMonthDaySegment(todayYmd);
        if (!md) {
            return list;
        }
        var bestByKey = {};
        list.forEach(function (item) {
            if (!item || !item.personalWish) {
                return;
            }
            var w = String(item.personalWish);
            if (w !== "birthday" && w !== "anniversary" && w !== "familyBirthday" && w !== "celebrationsCombo") {
                return;
            }
            var keys = celebrationAnnouncementKeys(item, md);
            if (!keys.length) {
                return;
            }
            keys.forEach(function (k) {
                var prev = bestByKey[k];
                if (!prev) {
                    bestByKey[k] = item;
                    return;
                }
                var sa = celebrationAnnouncementScore(item);
                var sb = celebrationAnnouncementScore(prev);
                if (sa < sb) {
                    bestByKey[k] = item;
                } else if (sa === sb && String(item.id || "").localeCompare(String(prev.id || "")) < 0) {
                    bestByKey[k] = item;
                }
            });
        });
        var keep = new Set();
        Object.keys(bestByKey).forEach(function (k) {
            keep.add(bestByKey[k]);
        });
        return list.filter(function (item) {
            if (!item || !item.personalWish) {
                return true;
            }
            var w = String(item.personalWish);
            if (w !== "birthday" && w !== "anniversary" && w !== "familyBirthday" && w !== "celebrationsCombo") {
                return true;
            }
            return keep.has(item);
        });
    }

    function normalizeFamilyMembers(raw) {
        if (!Array.isArray(raw)) {
            return [];
        }
        var out = [];
        raw.forEach(function (member, fmIndex) {
            if (!member || typeof member !== "object") {
                return;
            }
            var name = String(member.name || "").trim();
            var dob = String(member.dob || "").trim();
            if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                return;
            }
            var sid = String(member.id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
            if (!sid) {
                sid = "i" + String(fmIndex);
            }
            out.push({ id: sid, name: name, dob: dob });
        });
        return out;
    }

    function profileFromFirestoreData(data) {
        if (!data || typeof data !== "object") {
            return null;
        }
        return {
            fullName: String(data.fullName || "").trim(),
            dob: String(data.dob || "").trim(),
            anniversary: String(data.anniversary || "").trim(),
            anniversaryPartnerName: String(data.anniversaryPartnerName || "").trim(),
            familyMembers: normalizeFamilyMembers(data.familyMembers)
        };
    }

    function celebrationLinesForProfile(profile, todayYmd) {
        if (!profile) {
            return [];
        }
        var displayName = pickWishDisplayName(String(profile.fullName || "").trim());
        var nameToken = displayName || "friend";
        var lines = [];
        if (monthDayMatchesStoredDate(String(profile.dob || "").trim(), todayYmd)) {
            lines.push({ kind: "birthday", name: nameToken });
        }
        if (monthDayMatchesStoredDate(String(profile.anniversary || "").trim(), todayYmd)) {
            lines.push({
                kind: "anniversary",
                name: anniversaryCoupleDisplay(profile),
                partnerName: partnerFirstName(profile.anniversaryPartnerName)
            });
        }
        normalizeFamilyMembers(profile.familyMembers).forEach(function (member, fmIndex) {
            if (!monthDayMatchesStoredDate(member.dob, todayYmd)) {
                return;
            }
            var rawName = String(member.name || "").trim();
            var fmName = pickWishDisplayName(rawName) || "friend";
            var sid = String(member.id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
            if (!sid) {
                sid = "i" + String(fmIndex);
            }
            lines.push({ kind: "familyBirthday", name: fmName, index: fmIndex, memberId: sid });
        });
        return lines;
    }

    function announcementItemsForSubject(profile, subjectUid, todayYmd) {
        var lines = celebrationLinesForProfile(profile, todayYmd);
        if (!lines.length) {
            return [];
        }
        var sid = String(subjectUid || "").trim();
        var baseMeta = {
            title: "",
            titleTa: "",
            body: "",
            bodyTa: "",
            date: "",
            expires: "",
            urgent: false,
            important: false,
            imageUrl: "",
            imageOnly: false,
            link: ""
        };
        try {
            var y = todayYmd;
            baseMeta.date = String(y.year) + "-" + String(y.month).padStart(2, "0") + "-" + String(y.day).padStart(2, "0");
        } catch (e) {
            baseMeta.date = "";
        }

        if (lines.length >= 2) {
            return [Object.assign({}, baseMeta, {
                id: "njc-comm-celeb-" + sid + "-combo",
                personalWish: "celebrationsCombo",
                personalDisplayName: pickWishDisplayName(String(profile.fullName || "").trim()) || "friend",
                personalCelebrationLines: lines,
                communityCelebration: true
            })];
        }
        var only = lines[0];
        if (only.kind === "birthday") {
            return [Object.assign({}, baseMeta, {
                id: "njc-comm-celeb-" + sid + "-bday",
                personalWish: "birthday",
                personalDisplayName: pickWishDisplayName(String(profile.fullName || "").trim()) || "friend",
                communityCelebration: true
            })];
        }
        if (only.kind === "anniversary") {
            return [Object.assign({}, baseMeta, {
                id: "njc-comm-celeb-" + sid + "-ann",
                personalWish: "anniversary",
                personalDisplayName: only.name || pickWishDisplayName(String(profile.fullName || "").trim()) || "friend",
                communityCelebration: true
            })];
        }
        var fmSid = String(only.memberId || "").trim() || "i0";
        return [Object.assign({}, baseMeta, {
            id: "njc-comm-celeb-" + sid + "-fam-" + fmSid,
            personalWish: "familyBirthday",
            personalDisplayName: only.name,
            communityCelebration: true
        })];
    }

    function getAnnouncementsForHome(viewerUid, todayYmd) {
        if (!todayYmd || !cache.length) {
            return [];
        }
        var viewer = String(viewerUid || "").trim();
        var out = [];
        cache.forEach(function (entry) {
            var subjectUid = entry && entry.uid;
            var prof = entry && entry.profile;
            if (!subjectUid || !prof) {
                return;
            }
            if (viewer && String(subjectUid) === viewer) {
                return;
            }
            announcementItemsForSubject(prof, subjectUid, todayYmd).forEach(function (item) {
                out.push(item);
            });
        });
        return out;
    }

    function notifyListeners() {
        listeners.slice().forEach(function (fn) {
            try {
                fn();
            } catch (e) {}
        });
    }

    function stopFirebaseBootPoll() {
        if (firebaseBootTimerId !== null) {
            window.clearInterval(firebaseBootTimerId);
            firebaseBootTimerId = null;
        }
    }

    function ensureFirestoreListen() {
        if (firestoreUnsubscribe) {
            stopFirebaseBootPoll();
            return;
        }
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            return;
        }
        try {
            var db = window.firebase.firestore();
            firestoreUnsubscribe = db.collection(CELEBRATION_PROFILES_COLLECTION)
                .limit(PUBLIC_PROFILE_LIMIT)
                .onSnapshot(function (snap) {
                    var list = [];
                    snap.forEach(function (doc) {
                        var uid = doc.id;
                        var prof = profileFromFirestoreData(doc.data());
                        if (prof) {
                            list.push({ uid: uid, profile: prof });
                        }
                    });
                    cache = list;
                    notifyListeners();
                }, function () {
                    cache = [];
                    notifyListeners();
                });
            stopFirebaseBootPoll();
        } catch (e) {
            cache = [];
            notifyListeners();
        }
    }

    function startFirebaseBootPoll() {
        if (firestoreUnsubscribe || firebaseBootTimerId !== null) {
            return;
        }
        var ticks = 0;
        firebaseBootTimerId = window.setInterval(function () {
            ticks += 1;
            ensureFirestoreListen();
            if (firestoreUnsubscribe || ticks >= FIREBASE_BOOT_MAX_TICKS) {
                stopFirebaseBootPoll();
            }
        }, FIREBASE_BOOT_INTERVAL_MS);
    }

    /**
     * Subscribe to celebrationProfiles updates. Returns unsubscribe.
     * Fires immediately with current cache (may be empty until first snapshot).
     */
    function subscribe(callback) {
        if (typeof callback !== "function") {
            return function () {};
        }
        listeners.push(callback);
        ensureFirestoreListen();
        window.setTimeout(function () {
            try {
                callback();
            } catch (e1) {}
        }, 0);
        return function unsubscribe() {
            listeners = listeners.filter(function (fn) {
                return fn !== callback;
            });
        };
    }

    /** @deprecated use subscribe — kept for home-page.js */
    function startListen(callback) {
        return subscribe(callback);
    }

    function stopListen() {
        if (typeof firestoreUnsubscribe === "function") {
            firestoreUnsubscribe();
            firestoreUnsubscribe = null;
        }
        cache = [];
        listeners = [];
    }

    function getProfiles() {
        return cache.slice();
    }

    document.addEventListener("DOMContentLoaded", function () {
        ensureFirestoreListen();
        startFirebaseBootPoll();
    });
    document.addEventListener("njc:authchange", function () {
        ensureFirestoreListen();
        if (!firestoreUnsubscribe) {
            startFirebaseBootPoll();
        }
    });

    window.NjcCommunityCelebrations = {
        getAnnouncementsForHome: getAnnouncementsForHome,
        dedupeCelebrationAnnouncements: dedupeCelebrationAnnouncements,
        subscribe: subscribe,
        startListen: startListen,
        stopListen: stopListen,
        getProfiles: getProfiles,
        /** Call after Firebase init (e.g. right after NjcAuth.init). */
        ensureListen: ensureFirestoreListen,
        getCacheSize: function () {
            return cache.length;
        }
    };
})();
