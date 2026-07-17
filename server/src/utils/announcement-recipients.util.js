"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnnouncementRecipientUserIds = getAnnouncementRecipientUserIds;
const prisma_1 = __importDefault(require("./prisma"));
/**
 * Utilisateurs actifs concernés par une annonce (classe ciblée et/ou rôle).
 */
async function getAnnouncementRecipientUserIds(a) {
    const ids = new Set();
    if (a.targetClassId) {
        const students = await prisma_1.default.student.findMany({
            where: { classId: a.targetClassId },
            select: { id: true, userId: true },
        });
        students.forEach((s) => ids.add(s.userId));
        const sidList = students.map((s) => s.id);
        if (sidList.length > 0) {
            const links = await prisma_1.default.studentParent.findMany({
                where: { studentId: { in: sidList } },
                include: { parent: { select: { userId: true } } },
            });
            links.forEach((l) => ids.add(l.parent.userId));
        }
        const cls = await prisma_1.default.class.findUnique({
            where: { id: a.targetClassId },
            select: { teacherId: true },
        });
        if (cls?.teacherId) {
            const teacher = await prisma_1.default.teacher.findUnique({
                where: { id: cls.teacherId },
                select: { userId: true },
            });
            if (teacher)
                ids.add(teacher.userId);
        }
        if (a.targetRole) {
            const filtered = await prisma_1.default.user.findMany({
                where: {
                    id: { in: [...ids] },
                    isActive: true,
                    role: a.targetRole,
                },
                select: { id: true },
            });
            return filtered.map((u) => u.id);
        }
        const active = await prisma_1.default.user.findMany({
            where: { id: { in: [...ids] }, isActive: true },
            select: { id: true },
        });
        return active.map((u) => u.id);
    }
    if (a.targetRole) {
        const users = await prisma_1.default.user.findMany({
            where: { isActive: true, role: a.targetRole },
            select: { id: true },
        });
        return users.map((u) => u.id);
    }
    const users = await prisma_1.default.user.findMany({
        where: { isActive: true },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
//# sourceMappingURL=announcement-recipients.util.js.map