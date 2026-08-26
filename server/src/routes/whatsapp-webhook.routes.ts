import crypto from 'node:crypto';
import express from 'express';

/**
 * Webhooks WhatsApp Cloud API (Meta).
 *
 * Callback URL (prod) : https://VOTRE_DOMAINE/api/webhooks/whatsapp
 * Verify token : WHATSAPP_VERIFY_TOKEN (identique dans Meta et Vercel/.env)
 * Signature POST : WHATSAPP_APP_SECRET → en-tête X-Hub-Signature-256
 */
const router = express.Router();

function expectedVerifyToken(): string {
  return (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
}

function appSecret(): string {
  return (process.env.WHATSAPP_APP_SECRET || '').trim();
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, 'hex');
    const right = Buffer.from(b, 'hex');
    if (left.length === 0 || left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

/** Vérifie X-Hub-Signature-256 (HMAC SHA-256 du corps brut). */
export function verifyWhatsAppSignature(
  rawBody: Buffer | undefined,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!rawBody || !signatureHeader || !secret) return false;
  const provided = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length).trim()
    : signatureHeader.trim();
  if (!/^[a-f0-9]{64}$/i.test(provided)) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return timingSafeEqualHex(provided.toLowerCase(), expected.toLowerCase());
}

function handleVerify(req: express.Request, res: express.Response): void {
  const mode = String(req.query['hub.mode'] ?? req.query.hub_mode ?? '');
  const token = String(req.query['hub.verify_token'] ?? req.query.hub_verify_token ?? '').trim();
  const challenge = String(req.query['hub.challenge'] ?? req.query.hub_challenge ?? '');
  const expected = expectedVerifyToken();

  console.log('[whatsapp-webhook] GET verify', {
    path: req.path,
    mode,
    tokenMatch: Boolean(expected) && token === expected,
    hasChallenge: Boolean(challenge),
    hasEnvToken: Boolean(expected),
  });

  if (!expected) {
    res.status(503).type('text/plain').send('Verify token not configured');
    return;
  }

  if (mode === 'subscribe' && token === expected && challenge) {
    res.status(200).type('text/plain').send(challenge);
    return;
  }

  res.status(403).type('text/plain').send('Forbidden');
}

function handleIncoming(req: express.Request, res: express.Response): void {
  const secret = appSecret();
  const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody;
  const signature = req.get('X-Hub-Signature-256') || undefined;

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'WHATSAPP_APP_SECRET non configuré' });
      return;
    }
    console.warn(
      '[whatsapp-webhook] WHATSAPP_APP_SECRET absent — signature non vérifiée (dev uniquement).',
    );
  } else if (!verifyWhatsAppSignature(rawBody, signature, secret)) {
    res.status(401).json({ error: 'Signature WhatsApp invalide' });
    return;
  }

  res.status(200).json({ ok: true });

  try {
    const body = req.body as {
      object?: string;
      entry?: Array<{
        changes?: Array<{
          value?: {
            statuses?: Array<{ id?: string; status?: string; recipient_id?: string }>;
            messages?: Array<{
              from?: string;
              id?: string;
              type?: string;
              text?: { body?: string };
            }>;
          };
        }>;
      }>;
    };

    if (body?.object !== 'whatsapp_business_account') return;

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;
        for (const st of value.statuses ?? []) {
          console.log(
            `[whatsapp-webhook] status=${st.status ?? '?'} id=${st.id ?? '?'} to=${st.recipient_id ?? '?'}`,
          );
        }
        for (const msg of value.messages ?? []) {
          const from = msg.from ?? '?';
          const preview =
            msg.type === 'text' ? (msg.text?.body ?? '').slice(0, 120) : `[${msg.type ?? 'msg'}]`;
          console.log(`[whatsapp-webhook] inbound from=${from} id=${msg.id ?? '?'} ${preview}`);
        }
      }
    }
  } catch (e) {
    console.error('[whatsapp-webhook] parse error:', e);
  }
}

router.get('/webhooks/whatsapp', handleVerify);
router.post('/webhooks/whatsapp', handleIncoming);
router.get('/api/webhooks/whatsapp', handleVerify);
router.post('/api/webhooks/whatsapp', handleIncoming);

export default router;
