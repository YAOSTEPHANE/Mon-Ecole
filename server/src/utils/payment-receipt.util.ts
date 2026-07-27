import crypto from 'crypto';
import type { Prisma, PrismaClient } from '@prisma/client';

type DbClient = PrismaClient | Prisma.TransactionClient;

const RECEIPT_PREFIX = 'REC';

function parseReceiptSeq(num: string | null | undefined, year: number): number {
  const prefix = `${RECEIPT_PREFIX}-${year}-`;
  if (!num || !num.startsWith(prefix)) return 0;
  const tail = num.slice(prefix.length);
  const n = parseInt(tail, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Code alphanumérique unique (12 caractères, majuscules). */
export function generatePaymentVerificationCode(): string {
  return crypto.randomBytes(8).toString('hex').slice(0, 12).toUpperCase();
}

/**
 * Attribue un numéro REC-AAAA-0001 et un code de vérification à un paiement complété.
 * Idempotent si déjà renseignés.
 */
export async function assignPaymentReceiptFields(
  db: DbClient,
  paymentId: string,
  paidAt: Date = new Date(),
): Promise<{ receiptNumber: string; verificationCode: string }> {
  const existing = await db.payment.findUnique({
    where: { id: paymentId },
    select: { receiptNumber: true, verificationCode: true, status: true },
  });
  if (!existing) {
    throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
  }
  if (existing.status !== 'COMPLETED') {
    throw Object.assign(new Error('Seuls les paiements confirmés reçoivent un reçu officiel'), {
      status: 400,
    });
  }
  if (existing.receiptNumber && existing.verificationCode) {
    return {
      receiptNumber: existing.receiptNumber,
      verificationCode: existing.verificationCode,
    };
  }

  const year = paidAt.getFullYear();
  const prefix = `${RECEIPT_PREFIX}-${year}-`;

  const prior = await db.payment.findMany({
    where: { receiptNumber: { startsWith: prefix } },
    select: { receiptNumber: true },
  });
  let seq = prior.reduce((m, r) => Math.max(m, parseReceiptSeq(r.receiptNumber, year)), 0);

  let receiptNumber = existing.receiptNumber ?? '';
  let verificationCode = existing.verificationCode ?? '';

  if (!receiptNumber) {
    seq += 1;
    receiptNumber = `${prefix}${String(seq).padStart(4, '0')}`;
  }
  if (!verificationCode) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generatePaymentVerificationCode();
      const clash = await db.payment.findFirst({
        where: { verificationCode: candidate },
        select: { id: true },
      });
      if (!clash) {
        verificationCode = candidate;
        break;
      }
    }
    if (!verificationCode) {
      throw new Error('Impossible de générer un code de vérification unique');
    }
  }

  await db.payment.update({
    where: { id: paymentId },
    data: { receiptNumber, verificationCode },
  });

  return { receiptNumber, verificationCode };
}

export type VerifiedReceiptPayload = {
  valid: boolean;
  payment?: {
    id: string;
    receiptNumber: string | null;
    verificationCode: string | null;
    amount: number;
    paidAt: Date | null;
    paymentMethod: string;
    paymentReference: string | null;
    student: {
      firstName: string;
      lastName: string;
      studentId: string | null;
      className: string | null;
    };
    tuitionFee: {
      period: string;
      academicYear: string;
      billingStatus: string;
    };
  };
  message?: string;
};

export async function verifyPaymentReceipt(
  db: DbClient,
  code: string,
): Promise<VerifiedReceiptPayload> {
  const normalized = String(code ?? '').trim().toUpperCase();
  if (!normalized) {
    return { valid: false, message: 'Code de vérification requis' };
  }

  const payment = await db.payment.findFirst({
    where: {
      status: 'COMPLETED',
      OR: [{ verificationCode: normalized }, { receiptNumber: normalized }],
    },
    include: {
      student: {
        select: {
          studentId: true,
          user: { select: { firstName: true, lastName: true } },
          class: { select: { name: true } },
        },
      },
      tuitionFee: {
        select: { period: true, academicYear: true, billingStatus: true },
      },
    },
  });

  if (!payment) {
    return { valid: false, message: 'Reçu introuvable ou code invalide' };
  }

  return {
    valid: true,
    payment: {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      verificationCode: payment.verificationCode,
      amount: payment.amount,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.paymentReference,
      student: {
        firstName: payment.student.user.firstName,
        lastName: payment.student.user.lastName,
        studentId: payment.student.studentId,
        className: payment.student.class?.name ?? null,
      },
      tuitionFee: {
        period: payment.tuitionFee.period,
        academicYear: payment.tuitionFee.academicYear,
        billingStatus: payment.tuitionFee.billingStatus,
      },
    },
  };
}
