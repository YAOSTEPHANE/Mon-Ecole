import prisma from './prisma';
import { notifyUsersImportant } from './notify-important.util';
import {
  resolveActiveAdminUserIds,
  resolveStaffUserIdsWithAnyModule,
} from './staff-notify.util';
import type { StaffModuleId } from './staff-visible-modules.util';

const CASH_NOTIFY_STAFF_MODULES: StaffModuleId[] = [
  'treasury',
  'payments_mgmt',
  'fees_mgmt',
  'counter',
  'notifications_mgmt',
];

export type PendingCashPaymentNotifyPayload = {
  paymentId: string;
  amount: number;
  paymentReference?: string | null;
  studentFirstName: string;
  studentLastName: string;
  period?: string;
  academicYear?: string;
  payerRole: string;
  /** CASH (défaut) ou BANK_TRANSFER */
  paymentMethod?: 'CASH' | 'BANK_TRANSFER';
};

async function resolveCashPaymentRecipientIds(): Promise<string[]> {
  const adminIds = await resolveActiveAdminUserIds();
  const staffIds = await resolveStaffUserIdsWithAnyModule(CASH_NOTIFY_STAFF_MODULES);
  return [...new Set([...adminIds, ...staffIds])];
}

/** Alertes admin + économe lors d’une déclaration espèces en attente de validation. */
export async function notifyStaffOfPendingCashPayment(
  payload: PendingCashPaymentNotifyPayload,
): Promise<void> {
  const recipients = await resolveCashPaymentRecipientIds();
  if (recipients.length === 0) return;

  const studentName = `${payload.studentFirstName} ${payload.studentLastName}`.trim();
  const ref = payload.paymentReference?.trim() || payload.paymentId.slice(-8);
  const periodLabel =
    payload.period && payload.academicYear
      ? ` (${payload.period}, ${payload.academicYear})`
      : '';

  const amountStr = `${Math.round(payload.amount)} FCFA`;
  const isTransfer = payload.paymentMethod === 'BANK_TRANSFER';
  const title = isTransfer ? 'Virement à valider' : 'Paiement espèces à valider';
  const content = isTransfer
    ? `${studentName} — ${amountStr}${periodLabel} — déclaration virement ${payload.payerRole === 'PARENT' ? 'parent' : 'élève'} ` +
      `(réf. ${ref}). Validez après réception du virement.`
    : `${studentName} — ${amountStr}${periodLabel} — déclaration ${payload.payerRole === 'PARENT' ? 'parent' : 'élève'} ` +
      `(réf. ${ref}). Validez après encaissement au guichet.`;

  await notifyUsersImportant(recipients, {
    type: isTransfer ? 'payment_pending_bank_transfer' : 'payment_pending_cash',
    title,
    content,
    link: '/staff?tab=treasury',
    email: undefined,
  });
}
