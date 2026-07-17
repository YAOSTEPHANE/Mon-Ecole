"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAdmissionNotificationRecipients = resolveAdmissionNotificationRecipients;
exports.resolveAdminNotificationEmails = resolveAdminNotificationEmails;
exports.notifyAdminsOfNewAdmission = notifyAdminsOfNewAdmission;
const prisma_1 = __importDefault(require("./prisma"));
const app_branding_prisma_util_1 = require("./app-branding-prisma.util");
const email_util_1 = require("./email.util");
const notify_important_util_1 = require("./notify-important.util");
const staff_visible_modules_util_1 = require("./staff-visible-modules.util");
function escapeHtml(value) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function addEmail(emails, raw) {
    const v = raw?.trim().toLowerCase();
    if (v)
        emails.add(v);
}
function addEnvEmails(emails) {
    const raw = process.env.ADMISSION_ADMIN_EMAIL?.trim() || process.env.ADMIN_NOTIFY_EMAIL?.trim();
    if (!raw)
        return;
    for (const part of raw.split(/[,;]/)) {
        addEmail(emails, part);
    }
}
/** Destinataires e-mail + notifications pour une nouvelle pré-inscription. */
async function resolveAdmissionNotificationRecipients() {
    const emails = new Set();
    addEnvEmails(emails);
    const brandingDelegate = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    if (brandingDelegate) {
        const row = await brandingDelegate.findUnique({ where: { id: app_branding_prisma_util_1.APP_BRANDING_ID } });
        addEmail(emails, row?.schoolEmail);
    }
    const adminPanelUserIds = [];
    const panelAdmins = await prisma_1.default.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
        select: { id: true, email: true },
    });
    for (const user of panelAdmins) {
        adminPanelUserIds.push(user.id);
        addEmail(emails, user.email);
    }
    const staffPanelUserIds = [];
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
            user: { select: { email: true } },
        },
    });
    for (const staff of staffRows) {
        const modules = (0, staff_visible_modules_util_1.resolveVisibleStaffModules)(staff.staffCategory, staff.supportKind, staff.visibleStaffModules);
        if (!modules.includes('admissions') && !modules.includes('notifications_mgmt'))
            continue;
        staffPanelUserIds.push(staff.userId);
        addEmail(emails, staff.user.email);
    }
    return {
        emails: [...emails],
        adminPanelUserIds: [...new Set(adminPanelUserIds)],
        staffPanelUserIds: [...new Set(staffPanelUserIds)],
    };
}
/** @deprecated Utiliser resolveAdmissionNotificationRecipients */
async function resolveAdminNotificationEmails() {
    const { emails } = await resolveAdmissionNotificationRecipients();
    return emails;
}
async function notifyAdminsOfNewAdmission(admission) {
    const { emails, adminPanelUserIds, staffPanelUserIds } = await resolveAdmissionNotificationRecipients();
    const studentName = `${admission.firstName} ${admission.lastName}`.trim();
    const base = (0, email_util_1.getPublicFrontendBase)().replace(/\/+$/, '');
    const detailLines = [
        `Dossier : ${admission.reference}`,
        `Élève : ${studentName}`,
        admission.matricule ? `Matricule : ${admission.matricule}` : null,
        `E-mail : ${admission.email}`,
        admission.phone ? `Téléphone : ${admission.phone}` : null,
        `Niveau souhaité : ${admission.desiredLevel}`,
        `Année scolaire : ${admission.academicYear}`,
        admission.parentName ? `Parent / tuteur : ${admission.parentName}` : null,
        admission.parentPhone ? `Tél. parent : ${admission.parentPhone}` : null,
        admission.parentEmail ? `E-mail parent : ${admission.parentEmail}` : null,
    ].filter((line) => Boolean(line));
    const subject = `Nouvelle pré-inscription — ${admission.reference}`;
    const notifyContent = `${studentName} — dossier ${admission.reference} (${admission.desiredLevel}, ${admission.academicYear})`;
    const buildMailBodies = (consultUrl) => {
        const text = [
            'Une nouvelle demande de pré-inscription vient d’être déposée en ligne.',
            '',
            ...detailLines,
            '',
            `Consulter le dossier : ${consultUrl}`,
        ].join('\n');
        const html = [
            '<p>Une nouvelle <strong>demande de pré-inscription</strong> vient d’être déposée en ligne.</p>',
            '<ul>',
            ...detailLines.map((line) => `<li>${escapeHtml(line)}</li>`),
            '</ul>',
            `<p><a href="${consultUrl}">Ouvrir les dossiers de pré-inscription</a></p>`,
        ].join('');
        return { text, html };
    };
    const adminUrl = `${base}/admin?tab=admissions`;
    const staffUrl = `${base}/staff?tab=admissions`;
    const adminMail = buildMailBodies(adminUrl);
    const staffMail = buildMailBodies(staffUrl);
    const adminEmailSet = new Set((await prisma_1.default.user.findMany({
        where: { id: { in: adminPanelUserIds } },
        select: { email: true },
    }))
        .map((u) => u.email?.trim().toLowerCase())
        .filter((e) => Boolean(e)));
    const staffEmailSet = new Set((await prisma_1.default.user.findMany({
        where: { id: { in: staffPanelUserIds } },
        select: { email: true },
    }))
        .map((u) => u.email?.trim().toLowerCase())
        .filter((e) => Boolean(e)));
    for (const to of emails) {
        const normalized = to.toLowerCase();
        const mail = staffEmailSet.has(normalized) && !adminEmailSet.has(normalized) ? staffMail : adminMail;
        await (0, email_util_1.sendTransactionalHtmlEmail)(to, subject, mail.text, mail.html);
    }
    const notificationPayload = {
        type: 'admission',
        title: 'Nouvelle pré-inscription',
        content: notifyContent,
        email: null,
    };
    if (adminPanelUserIds.length > 0) {
        await (0, notify_important_util_1.notifyUsersImportant)(adminPanelUserIds, {
            ...notificationPayload,
            link: '/admin?tab=admissions',
        });
    }
    if (staffPanelUserIds.length > 0) {
        await (0, notify_important_util_1.notifyUsersImportant)(staffPanelUserIds, {
            ...notificationPayload,
            link: '/staff?tab=admissions',
        });
    }
}
//# sourceMappingURL=admission-notify.util.js.map