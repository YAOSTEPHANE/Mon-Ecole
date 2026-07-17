"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeAdminOrStaffFinance = authorizeAdminOrStaffFinance;
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const staff_module_admin_access_util_1 = require("../utils/staff-module-admin-access.util");
/**
 * Autorise ADMIN / SUPER_ADMIN, ou STAFF dont un module visible couvre la route /admin demandée.
 */
async function authorizeAdminOrStaffFinance(req, res, next) {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Non authentifié' });
        return;
    }
    const role = user.role;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        next();
        return;
    }
    if (role !== 'STAFF') {
        res.status(403).json({ error: 'Accès réservé à l’administration ou au personnel autorisé.' });
        return;
    }
    const path = req.path || '/';
    const method = req.method.toUpperCase();
    if (!(0, staff_module_admin_access_util_1.isStaffModuleAdminPath)(path, method)) {
        res.status(403).json({ error: 'Cette action est réservée aux administrateurs.' });
        return;
    }
    try {
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(user.id);
        if (!ctx) {
            res.status(403).json({ error: 'Profil personnel introuvable.' });
            return;
        }
        if ((0, staff_module_admin_access_util_1.staffSecretaryBlocksDestructiveDelete)(path, method, ctx.staff.supportKind)) {
            res.status(403).json({
                error: 'La suppression d’élèves ou de classes est réservée aux administrateurs. Contactez un administrateur si nécessaire.',
            });
            return;
        }
        if ((0, staff_module_admin_access_util_1.staffModuleAdminPathAllowed)(ctx.visibleModules, path, method, ctx.staff.supportKind)) {
            next();
            return;
        }
        res.status(403).json({
            error: 'Ce module n’est pas activé pour votre compte. Contactez l’administration.',
        });
    }
    catch {
        res.status(500).json({ error: 'Erreur de vérification des droits.' });
    }
}
//# sourceMappingURL=authorize-admin-or-staff-finance.middleware.js.map