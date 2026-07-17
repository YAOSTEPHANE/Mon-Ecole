"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAnnouncementRecipientUserIds = resolveAnnouncementRecipientUserIds;
exports.notifyUsersAboutPublishedAnnouncement = notifyUsersAboutPublishedAnnouncement;
const prisma_1 = __importDefault(require("./prisma"));
const notify_important_util_1 = require("./notify-important.util");
const sms_util_1 = require("./sms.util");
const PORTAL_ROLES = ['STUDENT', 'PARENT', 'TEACHER', 'EDUCATOR', 'STAFF'];
/**
 * Utilisateurs à notifier lors de la publication d’une annonce (cible rôle et/ou classe).
 */
async function resolveAnnouncementRecipientUserIds(ann) {
    const ids = new Set();
    if (ann.targetClassId) {
        const classId = ann.targetClassId;
        const roleFilter = ann.targetRole;
        const students = await prisma_1.default.student.findMany({
            where: { classId, isActive: true },
            select: {
                userId: true,
                parents: { select: { parent: { select: { userId: true } } } },
            },
        });
        const teacherRows = await prisma_1.default.course.findMany({
            where: { classId },
            select: { teacher: { select: { userId: true } } },
        });
        if (!roleFilter) {
            for (const s of students) {
                ids.add(s.userId);
                for (const p of s.parents)
                    ids.add(p.parent.userId);
            }
            for (const t of teacherRows)
                ids.add(t.teacher.userId);
            return [...ids];
        }
        if (roleFilter === 'STUDENT') {
            students.forEach((s) => ids.add(s.userId));
        }
        else if (roleFilter === 'PARENT') {
            for (const s of students) {
                for (const p of s.parents)
                    ids.add(p.parent.userId);
            }
        }
        else if (roleFilter === 'TEACHER') {
            for (const t of teacherRows)
                ids.add(t.teacher.userId);
        }
        else {
            const users = await prisma_1.default.user.findMany({
                where: { role: roleFilter, isActive: true },
                select: { id: true },
            });
            users.forEach((u) => ids.add(u.id));
        }
        return [...ids];
    }
    if (ann.targetRole) {
        const users = await prisma_1.default.user.findMany({
            where: { role: ann.targetRole, isActive: true },
            select: { id: true },
        });
        return users.map((u) => u.id);
    }
    const users = await prisma_1.default.user.findMany({
        where: { role: { in: PORTAL_ROLES }, isActive: true },
        select: { id: true },
    });
    return users.map((u) => u.id);
}
/**
 * Après publication : notification in-app + e-mail + push web ; SMS optionnels si priorité urgente
 * et `ANNOUNCEMENT_URGENT_SMS=true`.
 */
async function notifyUsersAboutPublishedAnnouncement(announcementId) {
    const a = await prisma_1.default.announcement.findUnique({
        where: { id: announcementId },
        select: {
            id: true,
            title: true,
            content: true,
            priority: true,
            targetRole: true,
            targetClassId: true,
        },
    });
    if (!a)
        return { count: 0 };
    const userIds = await resolveAnnouncementRecipientUserIds({
        targetRole: a.targetRole,
        targetClassId: a.targetClassId,
    });
    if (userIds.length === 0)
        return { count: 0 };
    const urgent = a.priority === 'urgent';
    const title = urgent ? `URGENT — ${a.title}` : a.title;
    const preview = a.content.length > 800 ? `${a.content.slice(0, 797)}…` : a.content;
    await (0, notify_important_util_1.notifyUsersImportant)(userIds, {
        type: urgent ? 'announcement_urgent' : 'announcement',
        title,
        content: preview,
        email: undefined,
    });
    if (urgent && process.env.ANNOUNCEMENT_URGENT_SMS?.trim() === 'true') {
        const parents = await prisma_1.default.user.findMany({
            where: { id: { in: userIds }, role: 'PARENT', isActive: true },
            select: { phone: true },
        });
        const line = `${title} — Ouvrez l’application pour le détail.`.slice(0, 300);
        await Promise.allSettled(parents
            .filter((u) => u.phone && (0, sms_util_1.isValidPhoneNumber)(u.phone.replace(/\s/g, '')))
            .map((u) => (0, sms_util_1.sendSMS)((0, sms_util_1.formatPhoneNumber)(u.phone.replace(/\s/g, '')), line)));
    }
    return { count: userIds.length };
}
//# sourceMappingURL=announcement-publish-notify.util.js.map