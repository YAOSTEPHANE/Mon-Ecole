"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLATFORM_MESSAGING_ROLES = void 0;
exports.isPlatformMessagingRole = isPlatformMessagingRole;
exports.makeDmThreadKey = makeDmThreadKey;
exports.effectiveThreadKey = effectiveThreadKey;
exports.notifyUserNewMessage = notifyUserNewMessage;
exports.createInternalPlatformMessage = createInternalPlatformMessage;
exports.teacherTeachesClass = teacherTeachesClass;
exports.parentLinkedToTeacherUser = parentLinkedToTeacherUser;
exports.teacherLinkedToParentUser = teacherLinkedToParentUser;
const prisma_1 = __importDefault(require("./prisma"));
const push_send_util_1 = require("./push-send.util");
/** Rôles pouvant envoyer / recevoir des messages sur la plateforme. */
exports.PLATFORM_MESSAGING_ROLES = new Set([
    'SUPER_ADMIN',
    'ADMIN',
    'TEACHER',
    'STUDENT',
    'PARENT',
    'EDUCATOR',
    'STAFF',
]);
function isPlatformMessagingRole(role) {
    return exports.PLATFORM_MESSAGING_ROLES.has(role);
}
/** Clé stable pour une conversation 1:1 entre deux utilisateurs */
function makeDmThreadKey(userIdA, userIdB) {
    return `dm_${[userIdA, userIdB].sort().join('__')}`;
}
function effectiveThreadKey(m) {
    if (m.threadKey && m.threadKey.trim().length > 0) {
        return m.threadKey.trim();
    }
    return makeDmThreadKey(m.senderId, m.receiverId);
}
function portalPathForRole(role) {
    switch (role) {
        case 'PARENT':
            return '/parent?tab=communication';
        case 'STUDENT':
            return '/student';
        case 'TEACHER':
            return '/teacher?tab=messaging';
        case 'EDUCATOR':
            return '/educator?tab=messaging';
        case 'ADMIN':
        case 'SUPER_ADMIN':
            return '/admin?tab=communication';
        case 'STAFF':
            return '/staff?tab=communication_mgmt';
        default:
            return '/';
    }
}
async function notifyUserNewMessage(params) {
    const title = params.subject?.trim()
        ? params.subject.trim().slice(0, 120)
        : `Message de ${params.senderDisplayName}`.slice(0, 120);
    const body = params.contentSnippet.trim().slice(0, 280);
    const url = portalPathForRole(params.receiverRole);
    await prisma_1.default.notification.create({
        data: {
            userId: params.receiverUserId,
            type: 'message',
            title,
            content: body,
            link: url,
        },
    });
    await (0, push_send_util_1.sendWebPushToUsers)([params.receiverUserId], { title, body, url });
}
async function createInternalPlatformMessage(params) {
    const threadKey = params.threadKey && params.threadKey.trim().length > 0
        ? params.threadKey.trim()
        : makeDmThreadKey(params.senderId, params.receiverId);
    const attachments = Array.isArray(params.attachmentUrls)
        ? params.attachmentUrls.filter((u) => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim())
        : [];
    const [receiver, sender] = await Promise.all([
        prisma_1.default.user.findUnique({
            where: { id: params.receiverId },
            select: { id: true, role: true, isActive: true },
        }),
        prisma_1.default.user.findUnique({
            where: { id: params.senderId },
            select: { firstName: true, lastName: true },
        }),
    ]);
    if (!receiver || !receiver.isActive) {
        throw new Error('Destinataire introuvable ou inactif');
    }
    const message = await prisma_1.default.message.create({
        data: {
            senderId: params.senderId,
            receiverId: params.receiverId,
            subject: params.subject && String(params.subject).trim() ? String(params.subject).trim() : null,
            content: params.content.trim(),
            category: params.category ?? 'GENERAL',
            channels: ['PLATFORM'],
            threadKey,
            attachmentUrls: attachments,
        },
    });
    const senderName = `${sender?.firstName ?? ''} ${sender?.lastName ?? ''}`.trim() || 'Un utilisateur';
    await notifyUserNewMessage({
        receiverUserId: receiver.id,
        receiverRole: receiver.role,
        senderDisplayName: senderName,
        subject: message.subject,
        contentSnippet: message.content,
    });
    return message;
}
async function teacherTeachesClass(teacherUserId, classId) {
    const teacher = await prisma_1.default.teacher.findUnique({
        where: { userId: teacherUserId },
        select: { id: true },
    });
    if (!teacher)
        return false;
    const course = await prisma_1.default.course.findFirst({
        where: { teacherId: teacher.id, classId },
        select: { id: true },
    });
    return Boolean(course);
}
async function parentLinkedToTeacherUser(parentUserId, teacherUserId) {
    const row = await prisma_1.default.course.findFirst({
        where: {
            teacher: { userId: teacherUserId },
            class: {
                students: {
                    some: {
                        parents: { some: { parent: { userId: parentUserId } } },
                    },
                },
            },
        },
        select: { id: true },
    });
    return Boolean(row);
}
async function teacherLinkedToParentUser(teacherUserId, parentUserId) {
    return parentLinkedToTeacherUser(parentUserId, teacherUserId);
}
//# sourceMappingURL=internal-messaging.util.js.map