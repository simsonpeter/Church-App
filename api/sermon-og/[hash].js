/**
 * Dynamic Open Graph image (1200×630) for sermon share links.
 * Node.js runtime + @vercel/og (Edge runtime does not support @vercel/og/edge here).
 */
const REMOTE_SERMONS = "https://raw.githubusercontent.com/simsonpeter/njcbelgium/refs/heads/main/sermons.json";
const ADMIN_SERMONS = "https://mantledb.sh/v2/njc-belgium-admin-sermons/entries";

async function sha256HexUtf8(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(str)));
    return Array.from(new Uint8Array(buf))
        .map(function (b) {
            return b.toString(16).padStart(2, "0");
        })
        .join("");
}

async function fetchJsonList(url) {
    try {
        const r = await fetch(url);
        if (!r.ok) {
            return [];
        }
        const j = await r.json();
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

async function mergeSermonSources() {
    const a = await fetchJsonList(REMOTE_SERMONS);
    const b = await fetchJsonList(ADMIN_SERMONS + "?ts=" + String(Date.now()));
    const merged = a.concat(b);
    const seen = {};
    const out = [];
    for (let i = 0; i < merged.length; i += 1) {
        const item = merged[i];
        if (!item || !item.title) {
            continue;
        }
        const key = item.audioUrl
            ? "audio:" + item.audioUrl
            : "title:" + item.title + "|" + String(item.date || "");
        if (seen[key]) {
            continue;
        }
        seen[key] = true;
        out.push(item);
    }
    return out;
}

async function findSermonByShareHash(hash) {
    const list = await mergeSermonSources();
    const entries = await Promise.all(
        list.map(async function (item) {
            const au = String(item.audioUrl || "").trim();
            if (!au) {
                return null;
            }
            const h = await sha256HexUtf8(au);
            return h === hash ? item : null;
        })
    );
    for (let i = 0; i < entries.length; i += 1) {
        if (entries[i]) {
            return entries[i];
        }
    }
    return null;
}

function trunc(s, max) {
    const t = String(s || "").trim();
    if (t.length <= max) {
        return t;
    }
    return t.slice(0, max - 1) + "…";
}

async function loadGoogleFontWoff2(family, weight, textSubset) {
    const ua =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const g =
        "https://fonts.googleapis.com/css2?family=" +
        encodeURIComponent(family) +
        ":wght@" +
        weight +
        "&text=" +
        encodeURIComponent(textSubset);
    const cssRes = await fetch(g, { headers: { "User-Agent": ua } });
    if (!cssRes.ok) {
        return null;
    }
    const css = await cssRes.text();
    const m = css.match(/src:\s*url\(([^)]+)\)\s+format\(['"]woff2['"]\)/);
    if (!m) {
        return null;
    }
    const fontUrl = m[1].replace(/&amp;/g, "&");
    const fontRes = await fetch(fontUrl);
    if (!fontRes.ok) {
        return null;
    }
    return fontRes.arrayBuffer();
}

function buildCardElement(React, title, subtitle, metaLine) {
    return React.createElement(
        "div",
        {
            style: {
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "linear-gradient(145deg, #12141c 0%, #251a1f 48%, #151018 100%)",
                color: "#f4f6fb",
                padding: 52,
                fontFamily: '"Noto Sans Tamil","DM Sans",system-ui,sans-serif',
            },
        },
        React.createElement(
            "div",
            {
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                },
            },
            React.createElement(
                "div",
                {
                    style: {
                        fontSize: 38,
                        fontWeight: 800,
                        letterSpacing: 3,
                        color: "#e53935",
                    },
                },
                "NJC"
            ),
            React.createElement(
                "div",
                {
                    style: {
                        fontSize: 30,
                        fontWeight: 600,
                        color: "#ffb4b4",
                        opacity: 0.95,
                    },
                },
                "▶"
            )
        ),
        React.createElement(
            "div",
            {
                style: {
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: 22,
                    paddingTop: 8,
                },
            },
            React.createElement(
                "div",
                {
                    style: {
                        fontSize: 54,
                        fontWeight: 700,
                        lineHeight: 1.12,
                        maxHeight: 230,
                        overflow: "hidden",
                    },
                },
                title
            ),
            subtitle
                ? React.createElement(
                      "div",
                      {
                          style: {
                              fontSize: 34,
                              color: "#c5cad8",
                              lineHeight: 1.22,
                              maxHeight: 130,
                              overflow: "hidden",
                              fontWeight: 500,
                          },
                      },
                      subtitle
                  )
                : null
        ),
        React.createElement(
            "div",
            {
                style: {
                    fontSize: 28,
                    color: "#8f98ab",
                    borderTop: "1px solid rgba(255,255,255,0.14)",
                    paddingTop: 24,
                    fontWeight: 500,
                },
            },
            metaLine
        )
    );
}

module.exports = async function handler(req, res) {
    const hash = String((req.query && req.query.hash) || "").trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
    }

    const [{ ImageResponse }, { default: React }] = await Promise.all([
        import("@vercel/og"),
        import("react"),
    ]);

    const match = await findSermonByShareHash(hash);
    const title = trunc(match ? String(match.title || "").trim() : "Sermon", 140) || "Sermon";
    const subtitle = trunc(match ? String(match.subtitle || "").trim() : "", 200);
    const speaker = match ? String(match.speaker || "").trim() : "";
    const dateStr = match && match.date ? String(match.date).trim() : "";
    const metaParts = [];
    if (dateStr) {
        metaParts.push(dateStr);
    }
    if (speaker) {
        metaParts.push("Speaker: " + speaker);
    }
    const metaLine = metaParts.length ? metaParts.join(" · ") : "NJC Belgium · Open in the app to listen";

    const fontSubset = (title + subtitle + metaLine + "SpeakerNJC▶").slice(0, 240);

    const fonts = [];
    try {
        const ta = await loadGoogleFontWoff2("Noto Sans Tamil", 600, fontSubset);
        if (ta) {
            fonts.push({ name: "Noto Sans Tamil", data: ta, weight: 600, style: "normal" });
        }
    } catch (e1) {
        /* optional font */
    }
    try {
        const dm = await loadGoogleFontWoff2("DM Sans", 600, fontSubset);
        if (dm) {
            fonts.push({ name: "DM Sans", data: dm, weight: 600, style: "normal" });
        }
    } catch (e2) {
        /* optional font */
    }

    const opts = {
        width: 1200,
        height: 630,
        emoji: "noto",
        headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
    };
    if (fonts.length) {
        opts.fonts = fonts;
    }

    try {
        const imageResponse = new ImageResponse(buildCardElement(React, title, subtitle, metaLine), opts);
        const buf = Buffer.from(await imageResponse.arrayBuffer());
        res.statusCode = 200;
        res.setHeader("Content-Type", "image/png");
        res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
        res.end(buf);
    } catch (eRender) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Image render error");
    }
};
