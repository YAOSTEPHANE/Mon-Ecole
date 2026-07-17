"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIGITAL_KIND_LABELS = void 0;
exports.canRoleAccessDigitalResource = canRoleAccessDigitalResource;
exports.getDigitalResourceForUser = getDigitalResourceForUser;
const prisma_1 = __importDefault(require("./prisma"));
const PORTAL_ROLES = new Set(['STUDENT', 'TEACHER', 'PARENT', 'EDUCATOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN']);
function canRoleAccessDigitalResource(role, allowedRoles) {
    if (!PORTAL_ROLES.has(role))
        return false;
    if (!allowedRoles || allowedRoles.length === 0)
        return true;
    return allowedRoles.includes(role);
}
async function getDigitalResourceForUser(resourceId, userId, role) {
    const resource = await prisma_1.default.digitalLibraryResource.findUnique({
        where: { id: resourceId },
    });
    if (!resource || !resource.isActive)
        return null;
    if (!canRoleAccessDigitalResource(role, resource.allowedRoles))
        return null;
    return resource;
}
exports.DIGITAL_KIND_LABELS = {
    EBOOK: 'E-book',
    PDF: 'Document PDF',
    PEDAGOGICAL: 'Ressource pédagogique',
};
//# sourceMappingURL=digital-library.util.js.map