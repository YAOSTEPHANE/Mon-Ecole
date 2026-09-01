import crypto from 'crypto';

/**
 * Utilitaire de validation de signatures de webhooks (HMAC-SHA256/SHA512).
 * Prévient les injections de webhooks malveillants via vérification cryptographique.
 */

export interface WebhookSignatureConfig {
  secret: string;
  algorithm: 'sha256' | 'sha512';
}

/**
 * Vérifie une signature webhook avec comparaison sécurisée (timing-safe).
 * @param payload - Corps du webhook (JSON stringifié)
 * @param signature - Signature fournie dans l'en-tête
 * @param secret - Clé secrète du webhook
 * @param algorithm - Algorithme de hachage (par défaut: sha256)
 * @returns true si la signature est valide
 * @throws si secret manquant ou algorithme invalide
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  if (!secret || secret.length < 16) {
    throw new Error(
      `Secret webhook invalide. Doit être configuré et faire ≥16 caractères. Reçu: ${secret?.length || 0} chars.`
    );
  }

  if (!payload) {
    throw new Error('Payload webhook manquant');
  }

  if (!signature) {
    throw new Error('Signature webhook manquante');
  }

  const buffer = typeof payload === 'string' ? Buffer.from(payload, 'utf8') : payload;
  const expectedSignature = crypto
    .createHmac(algorithm, secret)
    .update(buffer)
    .digest('hex');

  // Comparaison timing-safe (prévient les timing attacks)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  } catch {
    // timingSafeEqual lève si les buffers n'ont pas la même longueur
    return false;
  }
}

/**
 * Valide une signature Paystack (X-Paystack-Signature: HMAC-SHA512).
 */
export function verifyPaystackSignature(
  payload: string | Buffer,
  signature: string,
  paystackSecretKey: string
): boolean {
  if (!paystackSecretKey) {
    throw new Error('PAYSTACK_SECRET_KEY non configurée');
  }
  return verifyWebhookSignature(payload, signature, paystackSecretKey, 'sha512');
}

/**
 * Valide une signature Wave (Wave-Signature: HMAC-SHA256).
 */
export function verifyWaveSignature(
  payload: string | Buffer,
  signature: string,
  waveWebhookSecret: string
): boolean {
  if (!waveWebhookSecret) {
    throw new Error('WAVE_WEBHOOK_SECRET non configurée');
  }
  return verifyWebhookSignature(payload, signature, waveWebhookSecret, 'sha256');
}

/**
 * Valide une signature Orange Money (HMAC-SHA256).
 */
export function verifyOrangeMoneySignature(
  payload: string | Buffer,
  signature: string,
  orangeMoneySecret: string
): boolean {
  if (!orangeMoneySecret) {
    throw new Error('ORANGE_MONEY_WEBHOOK_SECRET non configurée');
  }
  return verifyWebhookSignature(payload, signature, orangeMoneySecret, 'sha256');
}

/**
 * Valide une signature générique (PAYMENT_WEBHOOK_SECRET ou x-payment-webhook-secret header).
 */
export function verifyGenericPaymentWebhookSignature(
  payload: string | Buffer,
  signature: string,
  paymentWebhookSecret: string
): boolean {
  if (!paymentWebhookSecret) {
    throw new Error('PAYMENT_WEBHOOK_SECRET non configurée');
  }
  return verifyWebhookSignature(payload, signature, paymentWebhookSecret, 'sha256');
}
