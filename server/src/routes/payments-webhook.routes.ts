import crypto from 'node:crypto';
import express from 'express';
import prisma from '../utils/prisma';
import {
  assertWebhookSecret,
  completeOnlinePayment,
  failOnlinePayment,
} from '../utils/online-payment.util';
import { getPaymentEnv } from '../utils/integration-settings.util';
import { checkCinetPayTransaction } from '../utils/payment-providers.util';

const router = express.Router();

type ResolvedStatus = 'SUCCESS' | 'FAILED' | 'IGNORE';

function rawBodyOf(req: express.Request): Buffer | undefined {
  return (req as express.Request & { rawBody?: Buffer }).rawBody;
}

function verifyWaveSignature(header: string, rawBody: Buffer, secret: string): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((p) => {
      const [k, ...rest] = p.trim().split('=');
      return [k, rest.join('=')];
    }),
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody.toString('utf8')}`).digest('hex');
  try {
    const a = Buffer.from(v1, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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
    const secret = getPaymentEnv('PAYSTACK_SECRET_KEY');
    const signature = req.header('x-paystack-signature') || '';
    if (secret) {
      const rawBody = rawBodyOf(req);
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

/** CinetPay notify_url — vérifie la transaction via l’API check (pas de secret générique). */
router.post('/webhooks/cinetpay', async (req, res) => {
  try {
    if (!getPaymentEnv('CINETPAY_API_KEY') || !getPaymentEnv('CINETPAY_SITE_ID')) {
      return res.status(503).json({ error: 'Webhook CinetPay non configuré' });
    }

    const cpmTransId =
      typeof req.body?.cpm_trans_id === 'string'
        ? req.body.cpm_trans_id
        : typeof req.body?.transaction_id === 'string'
          ? req.body.transaction_id
          : '';
    if (!cpmTransId) {
      return res.status(400).json({ error: 'transaction_id manquant' });
    }

    const checked = await checkCinetPayTransaction(cpmTransId);
    const payment = await resolvePayment({ paymentReference: cpmTransId });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    const statusText = String(checked.status || checked.code || '').toUpperCase();
    let status: ResolvedStatus = 'IGNORE';
    if (
      statusText === 'ACCEPTED' ||
      checked.code === '00' ||
      statusText === 'SUCCESS'
    ) {
      status = 'SUCCESS';
    } else if (
      statusText === 'REFUSED' ||
      statusText === 'CANCELED' ||
      statusText === 'CANCELLED' ||
      (checked.code && checked.code !== '00' && checked.code !== '201')
    ) {
      status = 'FAILED';
    } else {
      return res.json({ ok: true, ignored: true, checked });
    }

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: cpmTransId,
      reason: `CinetPay ${checked.code || checked.status}`,
      providerNote: `Webhook CinetPay check (${checked.code}/${checked.status})`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/cinetpay:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Wave checkout.session.completed — HMAC Wave-Signature t=,v1= */
router.post('/webhooks/wave', async (req, res) => {
  try {
    const secret = getPaymentEnv('WAVE_WEBHOOK_SECRET') || getPaymentEnv('WAVE_API_KEY');
    if (!secret) {
      return res.status(503).json({ error: 'Webhook Wave non configuré' });
    }
    const header = req.header('wave-signature') || req.header('Wave-Signature') || '';
    const rawBody = rawBodyOf(req);
    if (!header || !rawBody || !verifyWaveSignature(header, rawBody, secret)) {
      return res.status(401).json({ error: 'Signature Wave invalide' });
    }

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

/** MTN MoMo Collection callback */
router.post('/webhooks/mtn-momo', async (req, res) => {
  try {
    if (!getPaymentEnv('MTN_MOMO_SUBSCRIPTION_KEY')) {
      return res.status(503).json({ error: 'Webhook MTN non configuré' });
    }
    const externalId =
      typeof req.body?.externalId === 'string'
        ? req.body.externalId
        : typeof req.body?.external_id === 'string'
          ? req.body.external_id
          : '';
    const referenceId =
      typeof req.body?.referenceId === 'string'
        ? req.body.referenceId
        : req.header('x-reference-id') || '';
    const rawStatus = String(req.body?.status || '').toUpperCase();

    const payment = await resolvePayment({
      paymentReference: externalId,
      transactionId: referenceId,
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    let status: ResolvedStatus = 'IGNORE';
    if (rawStatus === 'SUCCESSFUL' || rawStatus === 'SUCCESS') status = 'SUCCESS';
    else if (rawStatus === 'FAILED' || rawStatus === 'REJECTED') status = 'FAILED';
    else return res.json({ ok: true, ignored: true, status: rawStatus });

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: referenceId || externalId,
      reason: `MTN ${rawStatus}`,
      providerNote: `Webhook MTN MoMo (${rawStatus})`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/mtn-momo:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Orange Money WebPay notif_url */
router.post('/webhooks/orange-money', async (req, res) => {
  try {
    if (!getPaymentEnv('ORANGE_MONEY_API_KEY') && !getPaymentEnv('ORANGE_MONEY_MERCHANT_KEY')) {
      return res.status(503).json({ error: 'Webhook Orange Money non configuré' });
    }
    const orderId =
      typeof req.body?.order_id === 'string'
        ? req.body.order_id
        : typeof req.body?.orderId === 'string'
          ? req.body.orderId
          : '';
    const statusRaw = String(req.body?.status || req.body?.notif_type || '').toUpperCase();
    const payment = await resolvePayment({
      paymentReference: orderId,
      paymentId: typeof req.body?.reference === 'string' ? req.body.reference : '',
    });
    if (!payment) return res.status(404).json({ error: 'Paiement introuvable' });

    let status: ResolvedStatus = 'IGNORE';
    if (statusRaw === 'SUCCESS' || statusRaw === 'SUCCESSFUL' || req.body?.status === 200) {
      status = 'SUCCESS';
    } else if (statusRaw === 'FAILED' || statusRaw === 'EXPIRED' || statusRaw === 'CANCELLED') {
      status = 'FAILED';
    } else {
      return res.json({ ok: true, ignored: true, status: statusRaw });
    }

    const result = await applyWebhookStatus(payment.id, status, {
      transactionId: typeof req.body?.txnid === 'string' ? req.body.txnid : orderId,
      reason: `Orange ${statusRaw}`,
      providerNote: `Webhook Orange Money (${statusRaw})`,
    });
    res.json(result);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    console.error('POST /payments/webhooks/orange-money:', e);
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
