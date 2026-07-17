"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignTuitionFeeInvoiceNumbers = assignTuitionFeeInvoiceNumbers;
exports.runAutomaticTuitionReminders = runAutomaticTuitionReminders;
exports.notifyTuitionFeeChanged = notifyTuitionFeeChanged;
exports.autoReceiptUrl = autoReceiptUrl;
const date_fns_1 = require("date-fns");
const prisma_1 = __importDefault(require("./prisma"));
const notify_important_util_1 = require("./notify-important.util");
const sms_util_1 = require("./sms.util");
function sanitizeYearSlug(academicYear) {
    return String(academicYear).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'AN';
}
function parseInvoiceSeq(num, prefix, slug) {
    if (!num || !num.startsWith(`${prefix}-${slug}-`))
        return 0;
    const tail = num.slice(`${prefix}-${slug}-`.length);
    const n = parseInt(tail, 10);
    return Number.isFinite(n) ? n : 0;
}
/**
 * Attribue des numéros de facture aux lignes de frais sans numéro (ordre chronologique).
 * Format : {prefix}-{annéeSanitisée}-{000001}
 */
async function assignTuitionFeeInvoiceNumbers(options) {
    const prefix = (options.prefix ?? 'FAC').trim().toUpperCase() || 'FAC';
    const limit = Math.min(Math.max(options.limit ?? 5000, 1), 20000);
    const where = {
        OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
    };
    if (options.academicYear && String(options.academicYear).trim()) {
        where.academicYear = String(options.academicYear).trim();
    }
    const fees = await prisma_1.default.tuitionFee.findMany({
        where,
        orderBy: [{ academicYear: 'asc' }, { createdAt: 'asc' }],
        take: limit,
        select: { id: true, academicYear: true, invoiceNumber: true },
    });
    if (fees.length === 0)
        return { updated: 0, numbers: [] };
    const byYear = new Map();
    for (const f of fees) {
        const y = f.academicYear || 'default';
        if (!byYear.has(y))
            byYear.set(y, []);
        byYear.get(y).push(f);
    }
    const numbers = [];
    let updated = 0;
    for (const [academicYear, group] of byYear) {
        const slug = sanitizeYearSlug(academicYear);
        const existingMax = await prisma_1.default.tuitionFee.findMany({
            where: {
                academicYear,
                invoiceNumber: { startsWith: `${prefix}-${slug}-` },
            },
            select: { invoiceNumber: true },
        });
        let seq = existingMax.reduce((m, r) => Math.max(m, parseInvoiceSeq(r.invoiceNumber, prefix, slug)), 0);
        for (const row of group) {
            seq += 1;
            const invoiceNumber = `${prefix}-${slug}-${String(seq).padStart(6, '0')}`;
            await prisma_1.default.tuitionFee.update({
                where: { id: row.id },
                data: { invoiceNumber, invoiceIssuedAt: new Date() },
            });
            numbers.push(invoiceNumber);
            updated += 1;
        }
    }
    return { updated, numbers };
}
/**
 * Notifications in-app (+ e-mail si configuré) pour échéances dépassées ou sous 7 jours.
 * Respecte un intervalle minimum entre deux envois par ligne de frais.
 */
async function runAutomaticTuitionReminders(options) {
    const minDays = Math.max(1, options?.minIntervalDays ?? 7);
    const upcomingDays = Math.max(0, options?.upcomingDays ?? 7);
    const today = (0, date_fns_1.startOfDay)(new Date());
    const horizon = (0, date_fns_1.addDays)(today, upcomingDays);
    const intervalMs = minDays * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - intervalMs);
    const fees = await prisma_1.default.tuitionFee.findMany({
        where: {
            isPaid: false,
            OR: [{ dueDate: { lt: today } }, { dueDate: { lte: horizon, gte: today } }],
        },
        include: {
            student: {
                select: {
                    userId: true,
                    user: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });
    let notifiedFees = 0;
    let parentNotifications = 0;
    for (const fee of fees) {
        if (fee.lastAutoReminderAt && fee.lastAutoReminderAt > cutoff) {
            continue;
        }
        const links = await prisma_1.default.studentParent.findMany({
            where: { studentId: fee.studentId },
            select: {
                parent: {
                    select: {
                        userId: true,
                        notifySms: true,
                        user: { select: { phone: true } },
                    },
                },
            },
        });
        const userIds = new Set();
        userIds.add(fee.student.userId);
        for (const l of links) {
            userIds.add(l.parent.userId);
        }
        const name = `${fee.student.user.firstName} ${fee.student.user.lastName}`;
        const dueStr = fee.dueDate.toISOString().slice(0, 10);
        const title = 'Échéance de paiement scolaire';
        const content = `Rappel : frais « ${fee.period} » (${fee.academicYear}) pour ${name} — ` +
            `montant ${Math.round(fee.amount)} FCFA, échéance ${dueStr}. ` +
            `Merci de régulariser depuis votre espace parent ou élève.`;
        await (0, notify_important_util_1.notifyUsersImportant)([...userIds], {
            type: 'payment_reminder',
            title,
            content,
            link: undefined,
            email: undefined,
        });
        const smsOverdueEnabled = process.env.TUITION_REMINDER_SMS_OVERDUE?.trim() === 'true';
        if (smsOverdueEnabled && fee.dueDate < today) {
            const smsLine = `${title}: ${content}`.slice(0, 300);
            await Promise.allSettled(links
                .filter((l) => l.parent.notifySms && l.parent.user.phone?.trim())
                .map((l) => {
                const raw = l.parent.user.phone.replace(/\s/g, '');
                if (!(0, sms_util_1.isValidPhoneNumber)(raw))
                    return Promise.resolve();
                return (0, sms_util_1.sendSMS)((0, sms_util_1.formatPhoneNumber)(raw), smsLine);
            }));
        }
        await prisma_1.default.tuitionFee.update({
            where: { id: fee.id },
            data: { lastAutoReminderAt: new Date() },
        });
        notifiedFees += 1;
        parentNotifications += links.length;
    }
    return { notifiedFees, parentNotifications };
}
/** Notifie l'élève et les parents liés lors de la création ou mise à jour d'une ligne de frais. */
async function notifyTuitionFeeChanged(params) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: params.studentId },
        select: {
            userId: true,
            user: { select: { firstName: true, lastName: true } },
        },
    });
    if (!student)
        return;
    const links = await prisma_1.default.studentParent.findMany({
        where: { studentId: params.studentId },
        select: { parent: { select: { userId: true } } },
    });
    const userIds = new Set([student.userId]);
    for (const link of links) {
        userIds.add(link.parent.userId);
    }
    const name = `${student.user.firstName} ${student.user.lastName}`.trim();
    const dueStr = params.dueDate.toISOString().slice(0, 10);
    const amountStr = `${Math.round(params.amount)} FCFA`;
    let title;
    let content;
    if (params.kind === 'created') {
        title = 'Nouveaux frais de scolarité';
        content =
            `Des frais « ${params.period} » (${params.academicYear}) ont été enregistrés pour ${name} : ` +
                `${amountStr}, échéance ${dueStr}. Consultez votre espace pour le détail et le paiement.`;
    }
    else {
        title = 'Frais de scolarité mis à jour';
        const prev = params.previousAmount;
        if (prev != null && Math.round(prev) !== Math.round(params.amount)) {
            content =
                `Les frais « ${params.period} » (${params.academicYear}) pour ${name} ont été modifiés : ` +
                    `${Math.round(prev)} FCFA → ${amountStr}, échéance ${dueStr}.`;
        }
        else {
            content =
                `Les frais « ${params.period} » (${params.academicYear}) pour ${name} ont été mis à jour ` +
                    `(${amountStr}, échéance ${dueStr}).`;
        }
    }
    await (0, notify_important_util_1.notifyUsersImportant)([...userIds], {
        type: 'tuition_fee',
        title,
        content,
        email: undefined,
    });
}
/** Marque un reçu « disponible » côté client PDF (référence stable). */
function autoReceiptUrl(paymentReference) {
    return `auto:pdf:${paymentReference}`;
}
//# sourceMappingURL=tuition-financial-automation.util.js.map