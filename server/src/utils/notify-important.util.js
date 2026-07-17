"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyBulletinsPublished = notifyBulletinsPublished;
exports.notifyUsersImportant = notifyUsersImportant;
const prisma_1 = __importDefault(require("./prisma"));
const email_util_1 = require("./email.util");
const push_send_util_1 = require("./push-send.util");
async function resolveDashboardLinkForUser(userId) {
    const u = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    switch (u?.role) {
        case 'STUDENT':
            return '/student';
        case 'PARENT':
            return '/parent';
        case 'TEACHER':
            return '/teacher';
        case 'EDUCATOR':
            return '/educator';
        case 'STAFF':
            return '/staff';
        case 'ADMIN':
            return '/admin';
        default:
            return '/';
    }
}
function escapeHtml(s) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function buildGenericEmail(firstName, title, content, linkPath) {
    const base = (0, email_util_1.getPublicFrontendBase)().replace(/\/+$/, '');
    const url = `${base}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`;
    const subject = `${title} — Gestion Scolaire`;
    const text = `Bonjour ${firstName},\n\n${title}\n\n${content}\n\nConsulter : ${url}\n`;
    const html = `<p>Bonjour ${escapeHtml(firstName)},</p><p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(content).replace(/\n/g, '<br/>')}</p><p><a href="${url}">Ouvrir l’application</a></p>`;
    return { subject, text, html };
}
/**
 * Notifications in-app + e-mail + Web Push pour les destinataires indiqués.
 * Les erreurs réseau sont journalisées sans faire échouer l’appelant.
 */
/** Après publication des bulletins d’une classe : élèves + parents (sans doublon). */
async function notifyBulletinsPublished(rows, periodLabel, academicYear) {
    const allUserIds = new Set();
    for (const row of rows) {
        const student = await prisma_1.default.student.findUnique({
            where: { id: row.studentId },
            select: { userId: true },
        });
        if (!student)
            continue;
        allUserIds.add(student.userId);
        const parents = await prisma_1.default.studentParent.findMany({
            where: { studentId: row.studentId },
            include: { parent: { select: { userId: true } } },
        });
        parents.forEach((p) => allUserIds.add(p.parent.userId));
    }
    await notifyUsersImportant([...allUserIds], {
        type: 'bulletin',
        title: 'Bulletin publié',
        content: `Le bulletin ${periodLabel} (${academicYear}) est disponible dans votre espace.`,
        email: undefined,
    });
}
async function notifyUsersImportant(userIds, options) {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0)
        return;
    const baseUrl = (0, email_util_1.getPublicFrontendBase)().replace(/\/+$/, '');
    for (const uid of unique) {
        const linkPath = options.link !== undefined && options.link !== null
            ? options.link
            : await resolveDashboardLinkForUser(uid);
        await prisma_1.default.notification.create({
            data: {
                userId: uid,
                type: options.type,
                title: options.title,
                content: options.content,
                link: linkPath || null,
            },
        });
        const fullUrl = `${baseUrl}${linkPath.startsWith('/') ? linkPath : `/${linkPath}`}`;
        if (options.email !== null) {
            const user = await prisma_1.default.user.findUnique({
                where: { id: uid },
                select: { email: true, firstName: true },
            });
            if (user?.email) {
                const tpl = options.email === undefined
                    ? buildGenericEmail(user.firstName, options.title, options.content, linkPath)
                    : options.email;
                await (0, email_util_1.sendTransactionalHtmlEmail)(user.email, tpl.subject, tpl.text, tpl.html);
            }
        }
        await (0, push_send_util_1.sendWebPushToUsers)([uid], {
            title: options.title,
            body: options.content,
            url: fullUrl,
        });
    }
}
//# sourceMappingURL=notify-important.util.js.map