"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const notify_important_util_1 = require("../utils/notify-important.util");
const router = express_1.default.Router();
router.use((req, _res, next) => {
    if (!req.path.startsWith('/notifications')) {
        return next('router');
    }
    next();
});
async function requireStaffNotificationsAccess(req, res, next) {
    try {
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(req.user.id);
        if (!ctx) {
            return res.status(403).json({ error: 'Profil personnel introuvable.' });
        }
        const allowed = ['notifications_mgmt', 'communication_mgmt'];
        if (!allowed.some((m) => ctx.visibleModules.includes(m))) {
            return res.status(403).json({
                error: 'Le module Notifications n’est pas activé pour votre compte. Contactez l’administration.',
            });
        }
        next();
    }
    catch {
        res.status(500).json({ error: 'Erreur de vérification des droits.' });
    }
}
router.use(requireStaffNotificationsAccess);
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(notifications);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/notifications/read-all', async (req, res) => {
    try {
        await prisma_1.default.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true, readAt: new Date() },
        });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        const notification = await prisma_1.default.notification.update({
            where: { id },
            data: { read: true, readAt: new Date() },
        });
        res.json(notification);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        await prisma_1.default.notification.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/notifications/test', async (req, res) => {
    try {
        await (0, notify_important_util_1.notifyUsersImportant)([req.user.id], {
            type: 'test',
            title: 'Test des notifications',
            content: 'Si vous voyez ceci dans la cloche et le module Notifications, les alertes fonctionnent pour votre compte personnel.',
            link: '/staff?tab=notifications_mgmt',
            email: undefined,
        });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=staff-notifications.routes.js.map