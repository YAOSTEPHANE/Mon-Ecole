import crypto from 'node:crypto';
import express from 'express';
import prisma from '../utils/prisma';
import {
  assertWebhookSecret,
  completeOnlinePayment,
  failOnlinePayment,
} from '../utils/online-payment.util';

const router = express.Router();

type ResolvedStatus = 'SUCCESS' | 'FAILED' | 'IGNORE';

async function resolvePayment(opts: {
  paymentId?: string;
  paymentReference?: string;
  transactionId?: string;
}) {
  if (opts.paymentId) {
    const byId = await prisma.payment.findUnique({ where: { id: opts.paymentId } });
    if (byId) return byId;
  }
  if (opts.paymentReference) {
    const byRef = await prisma.payment.findFirst({
      where: { paymentReference: opts.paymentReference },
    });
    if (byRef) return byRef;
  }
  if (opts.transactionId) {
    return prisma.payment.findFirst({
      where: { transactionId: opts.transactionId },
    });
  }
  return null;
}

async function applyWebhookStatus(
  paymentId: string,
  status: ResolvedStatus,
  opts: { transactionId?: string; reason?: string; providerNote?: string }
) {
  if (status === 'IGNORE') return { ok: true, ignored: true as const };
  if (status === 'SUCCESS') {
    const updated = await completeOnlinePayment(prisma, paymentId, {
      transactionId: opts.transactionId,
      providerNote: opts.providerNote || `Webhook confirmé (${new Date().toISOString()})`,
    });
    return { ok: true, payment: updated };
  }
  const updated = await failOnlinePayment(
    prisma,
    paymentId,
    opts.reason || 'rejeté par opérateur'
  );
  return { ok: true, payment: updated };
}

/**
 * Webhook générique Mobile Money / agrégateurs.
 * Headers: x-payment-webhook-secret
 * Body: { paymentId | paymentReference, status: 'SUCCESS'|'FAILED', transactionId?, reason? }
 */
router.post('/webhooks/mobile-money', async (req, res) => {
  try {
    const headerSecret = req.header('x-payment-webhook-secret') || undefined;
    const bodySecret = typeof req.body?.secret === 'string' ? req.body.secret : undefined;
    assertWebhookSecret(headerSecret, bodySecret);

    const paymentId =
      typeof req.body?.paymentId === 'string' ? req.body.paymentId.trim() : '';
    const paymentReference =
      typeof req.body?.paymentReference === 'string' ? req.body.paymentReference.trim() : '';
    const statusRaw = String(req.body?.status || '').toUpperCase();
    const transactionId =
      typeof req.body?.transactionId === 'string' ? req.body.transactionId.trim() : undefined;
    const reason =
      typeof req.body?.reason === 'string' ? req.body.reason.trim() : 'rejeté par opérateur';

    const payment = await resolvePayment({ paymentId, paymentReference, transactionId });
    if (!payment) {
      return res.status(404).json({ error: 'Paiement introuvable' });
    }

    let status: ResolvedStatus = 'IGNORE';
    if (statusRaw === 'SUCCESS' || statusRaw === 'COMPLETED' || statusRaw === 'OK') {
      status = 'SUCCESS';
    } else if (statusRaw === 'FAILED' || statusRaw === 'CANCELLED' || statusRaw === 'ERROR') {
      status = 'FAILED';
    } else {
      return res.status(400).json({ error: 'status invalide (SUCCESS|FAILED)' });
    }

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId,
      reason,
      providerNote: `Webhook Mobile Money confirmé (${new Date().toISOString()})`,
    });
    return res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/mobile-money:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Paystack — événement charge.success / charge.failed */
router.post('/webhooks/paystack', async (req, res) => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    const signature = req.header('x-paystack-signature') || '';
    if (secret) {
      const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
      if (!signature || !/^[a-f\d]{128}$/i.test(signature) || !rawBody) {
        return res.status(401).json({ error: 'Signature Paystack requise' });
      }
      const expected = crypto.createHmac('sha512', secret).update(rawBody).digest();
      const received = Buffer.from(signature, 'hex');
      if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        return res.status(401).json({ error: 'Signature Paystack invalide' });
      }
    } else {
      return res.status(503).json({ error: 'Webhook Paystack non configuré' });
    }

    const event = String(req.body?.event || '').toLowerCase();
    const data = req.body?.data || {};
    const reference = typeof data.reference === 'string' ? data.reference : '';
    const paymentId =
      typeof data.metadata?.paymentId === 'string' ? data.metadata.paymentId : '';

    const payment = await resolvePayment({
      paymentId,
      paymentReference: reference,
      transactionId: typeof data.id === 'string' ? data.id : String(data.id || ''),
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    let status: ResolvedStatus = 'IGNORE';
    if (event.includes('success') || data.status === 'success') status = 'SUCCESS';
    else if (event.includes('fail') || data.status === 'failed') status = 'FAILED';
    else return res.json({ ok: true, ignored: true, event });

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: reference || String(data.id || ''),
      reason: 'Paystack failed',
      providerNote: `Webhook Paystack ${event}`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/paystack:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** CinetPay notify_url */
router.post('/webhooks/cinetpay', async (req, res) => {
  try {
    assertWebhookSecret(
      req.header('x-payment-webhook-secret') || undefined,
      typeof req.body?.secret === 'string' ? req.body.secret : undefined
    );

    const cpmTransId =
      typeof req.body?.cpm_trans_id === 'string'
        ? req.body.cpm_trans_id
        : typeof req.body?.transaction_id === 'string'
          ? req.body.transaction_id
          : '';
    const code = String(req.body?.cpm_result || req.body?.code || req.body?.status || '');

    const payment = await resolvePayment({ paymentReference: cpmTransId });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    let status: ResolvedStatus = 'IGNORE';
    if (code === '00' || code === '201' || code.toUpperCase() === 'SUCCESS') status = 'SUCCESS';
    else if (code && code !== '00') status = 'FAILED';
    else return res.json({ ok: true, ignored: true });

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: cpmTransId,
      reason: `CinetPay code ${code}`,
      providerNote: `Webhook CinetPay (${code})`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/cinetpay:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Wave checkout.session.completed / payment.succeeded */
router.post('/webhooks/wave', async (req, res) => {
  try {
    assertWebhookSecret(
      req.header('x-payment-webhook-secret') ||
        req.header('x-wave-signature') ||
        undefined,
      typeof req.body?.secret === 'string' ? req.body.secret : undefined
    );

    const type = String(req.body?.type || req.body?.event || '').toLowerCase();
    const data = req.body?.data || req.body || {};
    const reference =
      typeof data.client_reference === 'string'
        ? data.client_reference
        : typeof data.paymentReference === 'string'
          ? data.paymentReference
          : '';
    const sessionId = typeof data.id === 'string' ? data.id : undefined;

    const payment = await resolvePayment({
      paymentReference: reference,
      transactionId: sessionId,
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    let status: ResolvedStatus = 'IGNORE';
    if (type.includes('complete') || type.includes('success') || data.payment_status === 'succeeded') {
      status = 'SUCCESS';
    } else if (type.includes('fail') || type.includes('cancel') || data.payment_status === 'failed') {
      status = 'FAILED';
    } else {
      return res.json({ ok: true, ignored: true, type });
    }

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: sessionId || reference,
      reason: 'Wave failed',
      providerNote: `Webhook Wave ${type}`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/wave:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
