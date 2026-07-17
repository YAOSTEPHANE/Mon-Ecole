"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWebPushConfigured = isWebPushConfigured;
exports.sendWebPushToUsers = sendWebPushToUsers;
const web_push_1 = __importDefault(require("web-push"));
const prisma_1 = __importDefault(require("./prisma"));
let configured = false;
function isWebPushConfigured() {
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    return Boolean(pub && priv);
}
function ensureWebPushConfigured() {
    if (configured)
        return isWebPushConfigured();
    const pub = process.env.VAPID_PUBLIC_KEY?.trim();
    const priv = process.env.VAPID_PRIVATE_KEY?.trim();
    const subject = process.env.VAPID_SUBJECT?.trim() || 'mailto:support@localhost';
    if (!pub || !priv) {
        return false;
    }
    web_push_1.default.setVapidDetails(subject, pub, priv);
    configured = true;
    return true;
}
async function sendWebPushToUsers(userIds, payload) {
    if (!ensureWebPushConfigured() || userIds.length === 0)
        return;
    const subs = await prisma_1.default.pushSubscription.findMany({
        where: { userId: { in: [...new Set(userIds)] } },
    });
    const body = JSON.stringify({
        title: payload.title,
        body: payload.body.slice(0, 240),
        url: payload.url ?? '/',
    });
    await Promise.allSettled(subs.map(async (sub) => {
        try {
            await web_push_1.default.sendNotification({
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth,
                },
            }, body, { TTL: 3600 });
        }
        catch (e) {
            const status = e?.statusCode;
            if (status === 404 || status === 410) {
                await prisma_1.default.pushSubscription.deleteMany({ where: { endpoint: sub.endpoint } }).catch(() => { });
            }
            else {
                console.warn('[push] envoi échoué:', sub.endpoint.slice(0, 48), e);
            }
        }
    }));
}
//# sourceMappingURL=push-send.util.js.map