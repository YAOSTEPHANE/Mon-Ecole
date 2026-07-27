import type { TuitionBillingStatus } from '@prisma/client';

/** Déduit le statut de facturation à partir des montants encaissés. */
export function computeTuitionBillingStatus(
  totalPaid: number,
  amountDue: number,
): TuitionBillingStatus {
  const paid = Math.round(totalPaid);
  const due = Math.round(amountDue);
  if (paid <= 0) return 'ISSUED';
  if (paid >= due) return 'PAID';
  return 'PARTIALLY_PAID';
}

export const TUITION_BILLING_STATUS_LABELS: Record<TuitionBillingStatus, string> = {
  ISSUED: 'Émise',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée',
};
