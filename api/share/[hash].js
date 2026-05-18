/**
 * Sermon share landing page for crawlers (WhatsApp, etc.): Open Graph meta + redirect to PWA.
 * Vercel: GET /api/share/:hash  (also routed as /share/sermon/:hash via vercel.json)
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

function escapeHtml(s) {
    return String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeAttr(s) {
    return escapeHtml(s).replace(/`/g, "&#96;");
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

    var proto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim() || "https";
    var host = String(req.headers["x-forwarded-host"] || req.headers.host || "njcapp.vercel.app")
        .split(",")[0]
        .trim();
    var siteOrigin = proto + "://" + host;
    var deepLink = siteOrigin + "/#sermons?s=" + hash;
    var sharePath = siteOrigin + "/share/sermon/" + hash;
    var ogImage = siteOrigin + "/api/sermon-og/" + hash;

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

    var merged = parseJsonArray(remoteBody).concat(parseJsonArray(adminBody));
    var match = findSermonByShareHash(merged, hash);

    var title = match ? String(match.title || "").trim() : "";
    if (!title) {
        title = "Sermon";
    }
    var subtitle = match ? String(match.subtitle || "").trim() : "";
    var speaker = match ? String(match.speaker || "").trim() : "";
    var dateStr = match && match.date ? String(match.date).trim() : "";

    var descParts = [];
    if (dateStr) {
        descParts.push(dateStr);
    }
    if (speaker) {
        descParts.push("Speaker: " + speaker);
    }
    if (subtitle) {
        descParts.push(subtitle);
    }
    var description = descParts.length ? descParts.join(" · ") : "Listen in the NJC app.";
    var pageTitle = title + " | NJC";

    var html = "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
        "<title>" + escapeHtml(pageTitle) + "</title>" +
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
        "<meta property=\"og:type\" content=\"website\">" +
        "<meta property=\"og:site_name\" content=\"NJC Belgium\">" +
        "<meta property=\"og:title\" content=\"" + escapeAttr(title) + "\">" +
        "<meta property=\"og:description\" content=\"" + escapeAttr(description) + "\">" +
        "<meta property=\"og:url\" content=\"" + escapeAttr(sharePath) + "\">" +
        "<meta property=\"og:image\" content=\"" + escapeAttr(ogImage) + "\">" +
        "<meta property=\"og:image:alt\" content=\"" + escapeAttr(title) + "\">" +
        "<meta name=\"twitter:card\" content=\"summary_large_image\">" +
        "<meta name=\"twitter:title\" content=\"" + escapeAttr(title) + "\">" +
        "<meta name=\"twitter:description\" content=\"" + escapeAttr(description) + "\">" +
        "<meta name=\"twitter:image\" content=\"" + escapeAttr(ogImage) + "\">" +
        "<meta http-equiv=\"refresh\" content=\"0;url=" + escapeAttr(deepLink) + "\">" +
        "<link rel=\"canonical\" href=\"" + escapeAttr(sharePath) + "\">" +
        "<style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:flex;" +
        "flex-direction:column;align-items:center;justify-content:center;background:#12141a;color:#e8eaef;" +
        "text-align:center;padding:1.5rem;line-height:1.45}a{color:#7ecbff}</style></head><body>" +
        "<p style=\"font-size:1.1rem;margin:0 0 .75rem\">Opening in <strong>NJC App</strong>…</p>" +
        "<p style=\"margin:0;font-size:.95rem;opacity:.85\">" + escapeHtml(description) + "</p>" +
        "<p style=\"margin-top:1.25rem\"><a href=\"" + escapeAttr(deepLink) + "\">Tap here if you are not redirected</a></p>" +
        "</body></html>";

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.end(html);
};
