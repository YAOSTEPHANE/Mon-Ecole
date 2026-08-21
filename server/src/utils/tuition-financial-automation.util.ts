import { startOfDay, addDays } from 'date-fns';
import prisma from './prisma';
import { notifyUsersImportant } from './notify-important.util';
import { sendSMS, formatPhoneNumber, isValidPhoneNumber } from './sms.util';
import { notifyParentWhatsApp } from './whatsapp.util';

function sanitizeYearSlug(academicYear: string): string {
  return String(academicYear).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'AN';
}

function parseInvoiceSeq(num: string | null | undefined, prefix: string, slug: string): number {
  if (!num || !num.startsWith(`${prefix}-${slug}-`)) return 0;
  const tail = num.slice(`${prefix}-${slug}-`.length);
  const n = parseInt(tail, 10);
  return Number.isFinite(n) ? n : 0;
}

export type AssignInvoicesResult = { updated: number; numbers: string[] };

/**
 * Attribue des numéros de facture aux lignes de frais sans numéro (ordre chronologique).
 * Format : {prefix}-{annéeSanitisée}-{000001}
 */
export async function assignTuitionFeeInvoiceNumbers(options: {
  prefix?: string;
  academicYear?: string | null;
  limit?: number;
}): Promise<AssignInvoicesResult> {
  const prefix = (options.prefix ?? 'FAC').trim().toUpperCase() || 'FAC';
  const limit = Math.min(Math.max(options.limit ?? 5000, 1), 20000);

  const where: Record<string, unknown> = {
    OR: [{ invoiceNumber: null }, { invoiceNumber: '' }],
  };
  if (options.academicYear && String(options.academicYear).trim()) {
    where.academicYear = String(options.academicYear).trim();
  }

  const fees = await prisma.tuitionFee.findMany({
    where,
    orderBy: [{ academicYear: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    select: { id: true, academicYear: true, invoiceNumber: true },
  });

  if (fees.length === 0) return { updated: 0, numbers: [] };

  const byYear = new Map<string, typeof fees>();
  for (const f of fees) {
    const y = f.academicYear || 'default';
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y)!.push(f);
  }

  const numbers: string[] = [];
  let updated = 0;

  for (const [academicYear, group] of byYear) {
    const slug = sanitizeYearSlug(academicYear);
    const existingMax = await prisma.tuitionFee.findMany({
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
      await prisma.tuitionFee.update({
        where: { id: row.id },
        data: { invoiceNumber, invoiceIssuedAt: new Date() },
      });
      numbers.push(invoiceNumber);
      updated += 1;
    }
  }

  return { updated, numbers };
}

export type AutoReminderResult = {
  notifiedFees: number;
  parentNotifications: number;
  smsSent: number;
  whatsappSent: number;
};

/**
 * Notifications in-app (+ e-mail si configuré) + SMS/WhatsApp pour échéances
 * dépassées ou sous 7 jours. Respecte un intervalle minimum entre deux envois.
 *
 * Canaux :
 * - SMS : si TUITION_REMINDER_SMS !== 'false' et parent.notifySms
 * - WhatsApp : si TUITION_REMINDER_WHATSAPP !== 'false' et parent.notifyWhatsApp
 */
export async function runAutomaticTuitionReminders(options?: {
  minIntervalDays?: number;
  upcomingDays?: number;
  channels?: { sms?: boolean; whatsapp?: boolean };
}): Promise<AutoReminderResult> {
  const minDays = Math.max(1, options?.minIntervalDays ?? 7);
  const upcomingDays = Math.max(0, options?.upcomingDays ?? 7);
  const today = startOfDay(new Date());
  const horizon = addDays(today, upcomingDays);
  const intervalMs = minDays * 24 * 60 * 60 * 1000;
  const cutoff = new Date(Date.now() - intervalMs);

  const smsEnabled =
    options?.channels?.sms ??
    (process.env.TUITION_REMINDER_SMS?.trim() !== 'false' &&
      (process.env.TUITION_REMINDER_SMS_OVERDUE?.trim() === 'true' ||
        process.env.TUITION_REMINDER_SMS?.trim() === 'true'));
  const whatsappEnabled =
    options?.channels?.whatsapp ?? process.env.TUITION_REMINDER_WHATSAPP?.trim() !== 'false';

  const fees = await prisma.tuitionFee.findMany({
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
  let smsSent = 0;
  let whatsappSent = 0;

  for (const fee of fees) {
    if (fee.lastAutoReminderAt && fee.lastAutoReminderAt > cutoff) {
      continue;
    }

    const links = await prisma.studentParent.findMany({
      where: { studentId: fee.studentId },
      select: {
        parent: {
          select: {
            userId: true,
            notifySms: true,
            notifyWhatsApp: true,
            user: { select: { phone: true } },
          },
        },
      },
    });
    const userIds = new Set<string>();
    userIds.add(fee.student.userId);
    for (const l of links) {
      userIds.add(l.parent.userId);
    }

    const name = `${fee.student.user.firstName} ${fee.student.user.lastName}`;
    const dueStr = fee.dueDate.toISOString().slice(0, 10);
    const overdue = fee.dueDate < today;
    const title = overdue ? 'Frais scolaires en retard' : 'Échéance de paiement scolaire';
    const content =
      `Rappel : frais « ${fee.period} » (${fee.academicYear}) pour ${name} — ` +
      `montant ${Math.round(fee.amount)} FCFA, échéance ${dueStr}. ` +
      `Merci de régulariser depuis votre espace parent ou élève.`;

    await notifyUsersImportant([...userIds], {
      type: 'payment_reminder',
      title,
      content,
      link: undefined,
      email: undefined,
    });

    if (smsEnabled && (overdue || process.env.TUITION_REMINDER_SMS?.trim() === 'true')) {
      const smsLine = `${title}: ${content}`.slice(0, 300);
      const smsTargets = links.filter((l) => l.parent.notifySms && l.parent.user.phone?.trim());
      const smsResults = await Promise.allSettled(
        smsTargets.map(async (l) => {
          const raw = l.parent.user.phone!.replace(/\s/g, '');
          if (!isValidPhoneNumber(raw)) throw new Error('invalid phone');
          await sendSMS(formatPhoneNumber(raw), smsLine);
        }),
      );
      smsSent += smsResults.filter((r) => r.status === 'fulfilled').length;
    }

    if (whatsappEnabled) {
      const waTargets = links.filter(
        (l) => l.parent.notifyWhatsApp !== false && l.parent.user.phone?.trim(),
      );
      const waResults = await Promise.allSettled(
        waTargets.map((l) => notifyParentWhatsApp(l.parent.user.phone, title, content)),
      );
      whatsappSent += waResults.filter((r) => r.status === 'fulfilled').length;
    }

    await prisma.tuitionFee.update({
      where: { id: fee.id },
      data: { lastAutoReminderAt: new Date() },
    });
    notifiedFees += 1;
    parentNotifications += links.length;
  }

  return { notifiedFees, parentNotifications, smsSent, whatsappSent };
}

/** Notifie l'élève et les parents liés lors de la création ou mise à jour d'une ligne de frais. */
export async function notifyTuitionFeeChanged(params: {
  studentId: string;
  period: string;
  academicYear: string;
  amount: number;
  dueDate: Date;
  kind: 'created' | 'updated';
  previousAmount?: number;
}): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: {
      userId: true,
      user: { select: { firstName: true, lastName: true } },
    },
  });
  if (!student) return;

  const links = await prisma.studentParent.findMany({
    where: { studentId: params.studentId },
    select: { parent: { select: { userId: true } } },
  });

  const userIds = new Set<string>([student.userId]);
  for (const link of links) {
    userIds.add(link.parent.userId);
  }

  const name = `${student.user.firstName} ${student.user.lastName}`.trim();
  const dueStr = params.dueDate.toISOString().slice(0, 10);
  const amountStr = `${Math.round(params.amount)} FCFA`;

  let title: string;
  let content: string;

  if (params.kind === 'created') {
    title = 'Nouveaux frais de scolarité';
    content =
      `Des frais « ${params.period} » (${params.academicYear}) ont été enregistrés pour ${name} : ` +
      `${amountStr}, échéance ${dueStr}. Consultez votre espace pour le détail et le paiement.`;
  } else {
    title = 'Frais de scolarité mis à jour';
    const prev = params.previousAmount;
    if (prev != null && Math.round(prev) !== Math.round(params.amount)) {
      content =
        `Les frais « ${params.period} » (${params.academicYear}) pour ${name} ont été modifiés : ` +
        `${Math.round(prev)} FCFA → ${amountStr}, échéance ${dueStr}.`;
    } else {
      content =
        `Les frais « ${params.period} » (${params.academicYear}) pour ${name} ont été mis à jour ` +
        `(${amountStr}, échéance ${dueStr}).`;
    }
  }

  await notifyUsersImportant([...userIds], {
    type: 'tuition_fee',
    title,
    content,
    email: undefined,
  });
}

/** Marque un reçu « disponible » côté client PDF (référence stable). */
export function autoReceiptUrl(paymentReference: string): string {
  return `auto:pdf:${paymentReference}`;
}
