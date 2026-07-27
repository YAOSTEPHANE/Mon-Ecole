import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function getTuitionFeePaymentTotals(
  db: DbClient,
  tuitionFeeId: string,
): Promise<{ totalPaid: number; remaining: number; amountDue: number }> {
  const fee = await db.tuitionFee.findUnique({
    where: { id: tuitionFeeId },
    select: { amount: true },
  });
  if (!fee) {
    throw Object.assign(new Error('Ligne de frais introuvable'), { status: 404 });
  }
  const completed = await db.payment.findMany({
    where: { tuitionFeeId, status: 'COMPLETED' },
    select: { amount: true },
  });
  const totalPaid = completed.reduce((s, p) => s + p.amount, 0);
  const amountDue = Math.round(fee.amount);
  const remaining = Math.max(0, amountDue - Math.round(totalPaid));
  return { totalPaid, remaining, amountDue };
}

/**
 * Bloque tout encaissement qui dépasserait le solde dû (anti trop-perçu).
 */
export async function assertPaymentWithinRemaining(
  db: DbClient,
  tuitionFeeId: string,
  payAmount: number,
): Promise<{ remaining: number }> {
  const amount = Math.round(Number(payAmount));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw Object.assign(new Error('Montant invalide'), { status: 400 });
  }
  const { remaining } = await getTuitionFeePaymentTotals(db, tuitionFeeId);
  if (remaining <= 0) {
    throw Object.assign(new Error('Cette ligne est déjà soldée'), { status: 400 });
  }
  if (amount > remaining) {
    throw Object.assign(new Error(`Montant max : ${remaining} FCFA`), { status: 400 });
  }
  return { remaining };
}
