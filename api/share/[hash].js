/**
 * Sermon share landing page for crawlers (WhatsApp, etc.): Open Graph meta + Listen action.
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
    var photoUrl = match
        ? String(match.photoUrl || match.coverImageUrl || match.imageUrl || "").trim()
        : "";
    if (!/^https:\/\//i.test(photoUrl)) {
        photoUrl = "";
    }
    var ogImage = photoUrl || (siteOrigin + "/api/sermon-og/" + hash);

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
    var listenHref = " href=\"" + escapeAttr(deepLink) + "\"";

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
        "<link rel=\"canonical\" href=\"" + escapeAttr(sharePath) + "\">" +
        "<style>" +
        "*{box-sizing:border-box}body{margin:0;min-height:100vh;font-family:system-ui,-apple-system,sans-serif;" +
        "background:linear-gradient(160deg,#1a0c0c 0%,#3a1212 45%,#12141a 100%);color:#f4ecec;" +
        "display:flex;align-items:center;justify-content:center;padding:1.5rem;line-height:1.45}" +
        ".card{width:min(420px,100%);background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.14);" +
        "border-radius:22px;padding:1.35rem 1.25rem 1.4rem;backdrop-filter:blur(10px);" +
        "box-shadow:0 18px 40px rgba(0,0,0,0.28)}" +
        ".eyebrow{margin:0 0 .45rem;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;" +
        "color:#ffd0d0;font-weight:700}" +
        "h1{margin:0;font-size:1.35rem;line-height:1.25}p{margin:.55rem 0 0;color:rgba(255,255,255,0.82);font-size:.95rem}" +
        ".actions{display:grid;gap:.7rem;margin-top:1.25rem}" +
        "a.btn{display:flex;align-items:center;justify-content:center;gap:.45rem;min-height:48px;padding:.75rem 1rem;" +
        "border-radius:14px;text-decoration:none;font-weight:700;font-size:1rem}" +
        "a.btn-primary{background:#e8f3ff;color:#10233a}" +
        ".note{margin-top:1rem;font-size:.82rem;color:rgba(255,255,255,0.62)}" +
        "</style></head><body>" +
        "<main class=\"card\">" +
        "<p class=\"eyebrow\">NJC Belgium · Sermon</p>" +
        "<h1>" + escapeHtml(title) + "</h1>" +
        "<p>" + escapeHtml(description) + "</p>" +
        "<div class=\"actions\">" +
        "<a class=\"btn btn-primary\"" + listenHref + ">▶ Listen now</a>" +
        "</div>" +
        "<p class=\"note\">Opens the NJC app player.</p>" +
        "</main>" +
        "</body></html>";

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    res.end(html);
};
