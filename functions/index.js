const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const ADMIN_EMAIL = "simsonpeter@gmail.com";

function isAdminEmail(email) {
    return String(email || "").trim().toLowerCase() === ADMIN_EMAIL;
}

exports.sendBroadcastPush = onCall({ region: "europe-west1", maxInstances: 5 }, async (request) => {
    if (!request.auth || !request.auth.token || !request.auth.token.email) {
        throw new HttpsError("permission-denied", "Sign in required.");
    }
    if (!isAdminEmail(request.auth.token.email)) {
        throw new HttpsError("permission-denied", "Admin only.");
    }

    const data = request.data || {};
    const title = String(data.title || "").trim();
    const body = String(data.body || "").trim();
    let url = String(data.url || "#home").trim() || "#home";
    const tag = String(data.tag || "broadcast").trim().slice(0, 120) || "broadcast";

    if (!title || !body) {
        throw new HttpsError("invalid-argument", "title and body are required.");
    }
    if (url.length > 2048) {
        throw new HttpsError("invalid-argument", "url too long.");
    }

    const db = getFirestore();
    const snap = await db.collection("fcmTokens").get();
    const tokens = [];
    snap.forEach((doc) => {
        const t = doc.get("token");
        if (typeof t === "string" && t.length > 20) {
            tokens.push(t);
        }
    });

    if (!tokens.length) {
        return { success: true, sent: 0, failed: 0, message: "No registered devices." };
    }

    const messaging = getMessaging();
    const chunkSize = 500;
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize);
        const message = {
            tokens: chunk,
            notification: { title, body },
            data: {
                title,
                body,
                url,
                tag
            },
            webpush: {
                fcmOptions: {
                    link: url.startsWith("http") ? url : undefined
                }
            }
        };
        if (!message.webpush.fcmOptions.link) {
            delete message.webpush;
        }
        const resp = await messaging.sendEachForMulticast(message);
        sent += resp.successCount;
        failed += resp.failureCount;
    }

    return { success: true, sent, failed, total: tokens.length };
});
