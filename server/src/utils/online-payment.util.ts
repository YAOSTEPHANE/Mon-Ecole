import type { Payment, Prisma, PrismaClient, Role } from '@prisma/client';
import prisma from './prisma';
import { autoReceiptUrl } from './tuition-financial-automation.util';
import { finalizeCompletedTuitionPayment } from './tuition-fee-paid-sync.util';
import { notifyParentsForStudent } from './parent-notify.util';
import { assertPaymentInSchool } from './school-access-guard.util';
import {
  initiateOnlineCheckout,
  type PaymentProviderId,
} from './payment-providers.util';
import { getPaymentWebhookSecret } from './integration-settings.util';

type Db = PrismaClient | Prisma.TransactionClient;

const PAYMENT_INCLUDE = {
  tuitionFee: { select: { period: true, academicYear: true, amount: true } },
  student: {
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      class: { select: { name: true, level: true } },
    },
  },
  payer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
} satisfies Prisma.PaymentInclude;

export async function listPendingMobileMoneyPayments(client: Db = prisma, schoolId?: string) {
  return client.payment.findMany({
    where: {
      status: 'PENDING',
      paymentMethod: { in: ['MOBILE_MONEY', 'CARD'] },
      payerRole: { in: ['STUDENT', 'PARENT'] },
      ...(schoolId ? { student: { OR: [{ schoolId }, { class: { schoolId } }] } } : {}),
    },
    orderBy: { createdAt: 'asc' },
    include: PAYMENT_INCLUDE,
  });
}

/**
 * Finalise un paiement en ligne (Mobile Money / carte) après webhook ou validation admin.
 * Transition atomique PENDING → COMPLETED pour éviter les doubles traitements concurrents.
 */
export async function completeOnlinePayment(
  client: Db,
  paymentId: string,
  opts: {
    transactionId?: string;
    providerNote?: string;
    schoolId?: string;
  } = {}
) {
  if (opts.schoolId) {
    await assertPaymentInSchool(paymentId, opts.schoolId);
  }
  const payment = await client.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
  }
  if (payment.status === 'COMPLETED') {
    return client.payment.findUnique({
      where: { id: paymentId },
      include: PAYMENT_INCLUDE,
    });
  }
  if (payment.status !== 'PENDING') {
    throw Object.assign(new Error('Ce paiement ne peut plus être confirmé'), { status: 400 });
  }
  if (payment.paymentMethod !== 'MOBILE_MONEY' && payment.paymentMethod !== 'CARD') {
    throw Object.assign(new Error('Méthode non éligible à la confirmation en ligne'), { status: 400 });
  }

  const note = opts.providerNote
    ? payment.notes
      ? `${payment.notes} — ${opts.providerNote}`
      : opts.providerNote
    : payment.notes;

  const claimed = await client.payment.updateMany({
    where: { id: paymentId, status: 'PENDING' },
    data: {
      status: 'COMPLETED',
      transactionId: opts.transactionId || `MM-${Date.now()}`,
      paidAt: new Date(),
      receiptUrl: autoReceiptUrl(payment.paymentReference || paymentId),
      notes: note,
    },
  });

  if (claimed.count === 0) {
    const current = await client.payment.findUnique({
      where: { id: paymentId },
      include: PAYMENT_INCLUDE,
    });
    if (current?.status === 'COMPLETED') return current;
    throw Object.assign(new Error('Ce paiement ne peut plus être confirmé'), { status: 400 });
  }

  const updated = await client.payment.findUnique({
    where: { id: paymentId },
    include: PAYMENT_INCLUDE,
  });

  if (updated) {
    await finalizeCompletedTuitionPayment(client, paymentId, updated.paidAt ?? new Date());
  }

  try {
    const methodLabel =
      payment.paymentMethod === 'CARD' ? 'carte bancaire' : 'Mobile Money';
    await notifyParentsForStudent(payment.studentId, {
      type: 'PAYMENT',
      title: `Paiement ${methodLabel} confirmé`,
      content: `Un paiement de ${payment.amount.toLocaleString('fr-FR')} FCFA a été confirmé.`,
      link: '/parent?tab=payments',
    });
  } catch (e) {
    console.error('notify payment completed:', e);
  }

  return updated;
}

export async function failOnlinePayment(
  client: Db,
  paymentId: string,
  reason: string,
  schoolId?: string
) {
  if (schoolId) await assertPaymentInSchool(paymentId, schoolId);
  const payment = await client.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
  if (payment.status !== 'PENDING') {
    throw Object.assign(new Error('Paiement non modifiable'), { status: 400 });
  }
  const claimed = await client.payment.updateMany({
    where: { id: paymentId, status: 'PENDING' },
    data: {
      status: 'FAILED',
      notes: payment.notes ? `${payment.notes} — Échec: ${reason}` : `Échec: ${reason}`,
    },
  });
  if (claimed.count === 0) {
    throw Object.assign(new Error('Paiement non modifiable'), { status: 400 });
  }
  return client.payment.findUnique({
    where: { id: paymentId },
    include: PAYMENT_INCLUDE,
  });
}

export function assertWebhookSecret(headerSecret: string | undefined, bodySecret: string | undefined) {
  const expected = getPaymentWebhookSecret();
  if (!expected) {
    throw Object.assign(
      new Error('Secret webhook paiements non configuré (admin → Intégrations ou PAYMENT_WEBHOOK_SECRET)'),
      { status: 503 }
    );
  }
  const provided = headerSecret || bodySecret;
  if (!provided || provided !== expected) {
    throw Object.assign(new Error('Secret webhook invalide'), { status: 401 });
  }
}

/** Après création d’un paiement PENDING en ligne : initie le checkout fournisseur. */
export async function attachOnlineCheckout(
  client: Db,
  paymentId: string,
  opts: {
    method: 'MOBILE_MONEY' | 'CARD';
    phoneNumber?: string;
    operator?: string;
    customerEmail?: string;
    customerName?: string;
    returnUrl?: string;
    cancelUrl?: string;
  }
) {
  const payment = await client.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw Object.assign(new Error('Paiement introuvable'), { status: 404 });

  const checkout = await initiateOnlineCheckout({
    paymentId: payment.id,
    paymentReference: payment.paymentReference || payment.id,
    amount: payment.amount,
    method: opts.method,
    operator: opts.operator,
    phoneNumber: opts.phoneNumber,
    customerEmail: opts.customerEmail,
    customerName: opts.customerName,
    returnUrl: opts.returnUrl,
    cancelUrl: opts.cancelUrl,
    description: `Paiement scolarité ${payment.paymentReference || payment.id}`,
  });

  const noteExtra = `[${checkout.provider}/${checkout.mode}] ${checkout.message}${
    checkout.ussdHint ? ` — ${checkout.ussdHint}` : ''
  }`;

  const updated = await client.payment.update({
    where: { id: paymentId },
    data: {
      paymentProvider: checkout.provider as PaymentProviderId,
      checkoutUrl: checkout.checkoutUrl || null,
      transactionId: checkout.providerPaymentId || payment.transactionId,
      notes: payment.notes ? `${payment.notes} | ${noteExtra}` : noteExtra,
    },
    include: PAYMENT_INCLUDE,
  });
  return { payment: updated, checkout };
}

export type { Payment, Role };
