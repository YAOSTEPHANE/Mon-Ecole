export type TuitionBillingStatus = 'ISSUED' | 'PARTIALLY_PAID' | 'PAID';

export const TUITION_BILLING_STATUS_LABELS: Record<TuitionBillingStatus, string> = {
  ISSUED: 'Émise',
  PARTIALLY_PAID: 'Partiellement payée',
  PAID: 'Payée',
};

export const TUITION_BILLING_STATUS_VARIANT: Record<
  TuitionBillingStatus,
  'secondary' | 'warning' | 'success'
> = {
  ISSUED: 'secondary',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
};

export function resolveBillingStatus(fee: {
  billingStatus?: TuitionBillingStatus | null;
  isPaid?: boolean;
}): TuitionBillingStatus {
  if (fee.billingStatus) return fee.billingStatus;
  return fee.isPaid ? 'PAID' : 'ISSUED';
}

export function computeBillingStatusFromPayments(
  totalPaid: number,
  amountDue: number,
): TuitionBillingStatus {
  const paid = Math.round(totalPaid);
  const due = Math.round(amountDue);
  if (paid <= 0) return 'ISSUED';
  if (paid >= due) return 'PAID';
  return 'PARTIALLY_PAID';
}
