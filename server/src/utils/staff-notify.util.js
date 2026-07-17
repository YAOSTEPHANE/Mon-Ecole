"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStaffUserIdsWithAnyModule = resolveStaffUserIdsWithAnyModule;
exports.resolveActiveAdminUserIds = resolveActiveAdminUserIds;
const prisma_1 = __importDefault(require("./prisma"));
const staff_visible_modules_util_1 = require("./staff-visible-modules.util");
/** Utilisateurs STAFF actifs ayant au moins un des modules indiqués. */
async function resolveStaffUserIdsWithAnyModule(moduleIds) {
    if (moduleIds.length === 0)
        return [];
    const staffRows = await prisma_1.default.staffMember.findMany({
        where: {
            staffCategory: 'SUPPORT',
            user: { role: 'STAFF', isActive: true },
        },
        select: {
            userId: true,
            staffCategory: true,
            supportKind: true,
            visibleStaffModules: true,
        },
    });
    const ids = [];
    for (const staff of staffRows) {
        const modules = (0, staff_visible_modules_util_1.resolveVisibleStaffModules)(staff.staffCategory, staff.supportKind, staff.visibleStaffModules);
        if (moduleIds.some((m) => modules.includes(m))) {
            ids.push(staff.userId);
        }
    }
    return [...new Set(ids)];
}
/** Comptes admin actifs (alertes opérationnelles). */
async function resolveActiveAdminUserIds() {
    const users = await prisma_1.default.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
//# sourceMappingURL=staff-notify.util.js.map