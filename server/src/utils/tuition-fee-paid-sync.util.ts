import type { Prisma, PrismaClient } from '@prisma/client';
import { computeTuitionBillingStatus } from './tuition-fee-billing.util';
import { assignPaymentReceiptFields } from './payment-receipt.util';

type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Recalcule le total des paiements COMPLETED pour une ligne de frais et met à jour
 * `isPaid`, `paidAt` et `billingStatus`.
 */
export async function syncTuitionFeePaidStatusForFeeId(
  db: DbClient,
  tuitionFeeId: string,
): Promise<void> {
  const tuitionFee = await db.tuitionFee.findUnique({ where: { id: tuitionFeeId } });
  if (!tuitionFee) return;

  const completedPayments = await db.payment.findMany({
    where: { tuitionFeeId, status: 'COMPLETED' },
  });
  const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const isFullyPaid = totalPaid >= tuitionFee.amount;
  const billingStatus = computeTuitionBillingStatus(totalPaid, tuitionFee.amount);

  await db.tuitionFee.update({
    where: { id: tuitionFeeId },
    data: {
      isPaid: isFullyPaid,
      paidAt: isFullyPaid ? tuitionFee.paidAt ?? new Date() : null,
      billingStatus,
    },
  });
}

/** Finalise un paiement confirmé : reçu officiel + statut de facturation. */
export async function finalizeCompletedTuitionPayment(
  db: DbClient,
  paymentId: string,
  paidAt: Date = new Date(),
): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { tuitionFeeId: true, status: true },
  });
  if (!payment || payment.status !== 'COMPLETED') return;
  await assignPaymentReceiptFields(db, paymentId, paidAt);
  await syncTuitionFeePaidStatusForFeeId(db, payment.tuitionFeeId);
}
