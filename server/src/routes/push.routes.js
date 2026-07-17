"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
/** Clé publique VAPID pour `PushManager.subscribe` côté navigateur */
router.get('/vapid-public', (_req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY?.trim();
    if (!key) {
        return res.json({
            configured: false,
            publicKey: null,
            hint: 'Notifications push désactivées (VAPID non configuré sur le serveur).',
        });
    }
    res.json({ configured: true, publicKey: key });
});
router.post('/subscribe', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const body = req.body;
        const sub = body?.subscription;
        if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
            return res.status(400).json({ error: 'subscription.endpoint et subscription.keys requis' });
        }
        const ua = typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 400) : null;
        await prisma_1.default.pushSubscription.upsert({
            where: { endpoint: sub.endpoint },
            create: {
                userId: req.user.id,
                endpoint: sub.endpoint,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
                userAgent: ua,
            },
            update: {
                userId: req.user.id,
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth,
                userAgent: ua,
            },
        });
        res.status(201).json({ ok: true });
    }
    catch (error) {
        console.error('POST /push/subscribe:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.delete('/subscribe', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const endpoint = req.body?.endpoint;
        if (!endpoint || typeof endpoint !== 'string') {
            return res.status(400).json({ error: 'endpoint requis' });
        }
        await prisma_1.default.pushSubscription.deleteMany({
            where: { userId: req.user.id, endpoint },
        });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('DELETE /push/subscribe:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=push.routes.js.map