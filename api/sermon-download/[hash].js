/**
 * Force/assist sermon audio download for share landing "Download now".
 * GET /api/sermon-download/:hash → redirect to audio (attachment-friendly).
 */
const crypto = require("crypto");
const https = require("https");

function httpsGet(url) {
    return new Promise(function (resolve, reject) {
        https.get(url, function (res) {
            var body = "";
            res.on("data", function (chunk) {
                body += chunk;
            });
            res.on("end", function () {
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(body);
                } else {
                    reject(new Error("HTTP " + res.statusCode));
                }
            });
        }).on("error", reject);
    });
}

function sha256HexUtf8(str) {
    return crypto.createHash("sha256").update(String(str), "utf8").digest("hex");
}

function parseJsonArray(raw) {
    try {
        var j = JSON.parse(raw);
        if (Array.isArray(j)) {
            return j;
        }
        if (j && Array.isArray(j.entries)) {
            return j.entries;
        }
    } catch (e) {
        return [];
    }
    return [];
}

function findSermonByShareHash(merged, hash) {
    var seen = {};
    for (var i = 0; i < merged.length; i += 1) {
        var item = merged[i];
        if (!item || !item.title) {
            continue;
        }
        var key = item.audioUrl
            ? ("audio:" + item.audioUrl)
            : ("title:" + item.title + "|" + String(item.date || ""));
        if (seen[key]) {
            continue;
        }
        seen[key] = true;
        var au = String(item.audioUrl || "").trim();
        if (au && sha256HexUtf8(au) === hash) {
            return item;
        }
    }
    return null;
}

module.exports = async function handler(req, res) {
    var hash = String((req.query && req.query.hash) || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
    }

    var remoteUrl = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/sermons.json";
    var adminUrl = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries?ts=" + String(Date.now());
    var remoteBody = "[]";
    var adminBody = "[]";
    try {
        remoteBody = await httpsGet(remoteUrl);
    } catch (e1) {
        remoteBody = "[]";
    }
    try {
        adminBody = await httpsGet(adminUrl);
    } catch (e2) {
        adminBody = "[]";
    }

    var match = findSermonByShareHash(
        parseJsonArray(remoteBody).concat(parseJsonArray(adminBody)),
        hash
    );
    var audioUrl = match ? String(match.audioUrl || "").trim() : "";
    if (!/^https:\/\//i.test(audioUrl)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Audio not found");
        return;
    }

    // Redirect to the sermon audio file. Phones typically offer Save / Download.
    res.statusCode = 302;
    res.setHeader("Location", audioUrl);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.end();
};
