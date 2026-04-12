(function () {
    var CELEBRATION_PROFILES_COLLECTION = "celebrationProfiles";
    var PUBLIC_PROFILE_LIMIT = 2000;
    var BRUSSELS_TZ = "Europe/Brussels";

    var cache = [];
    var unsubscribe = null;
    var onChange = null;

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

    /**
     * Lines for one member's public celebration profile today (same shape as home buildPersonalWishAnnouncements).
     */
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

    function stopListen() {
        if (typeof unsubscribe === "function") {
            unsubscribe();
            unsubscribe = null;
        }
        cache = [];
    }

    function startListen(callback) {
        onChange = typeof callback === "function" ? callback : null;
        stopListen();
        if (!window.firebase || !window.firebase.apps || !window.firebase.apps.length) {
            if (onChange) {
                window.setTimeout(function () {
                    onChange();
                }, 0);
            }
            return;
        }
        try {
            var db = window.firebase.firestore();
            unsubscribe = db.collection(CELEBRATION_PROFILES_COLLECTION)
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
                    if (onChange) {
                        onChange();
                    }
                }, function () {
                    cache = [];
                    if (onChange) {
                        onChange();
                    }
                });
        } catch (e) {
            cache = [];
            if (onChange) {
                onChange();
            }
        }
    }

    window.NjcCommunityCelebrations = {
        getAnnouncementsForHome: getAnnouncementsForHome,
        startListen: startListen,
        stopListen: stopListen,
        getCacheSize: function () {
            return cache.length;
        }
    };
})();
