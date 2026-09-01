import type { Request, Response, NextFunction } from 'express';
import {
  verifyPaystackSignature,
  verifyWaveSignature,
  verifyOrangeMoneySignature,
  verifyGenericPaymentWebhookSignature,
} from '../utils/webhook-signature.util';

/**
 * Middleware de validation des signatures de webhooks de paiement.
 * À utiliser AVANT les routes de traitement des webhooks.
 */

export interface WebhookValidationOptions {
  secret: string;
  headerName: string; // Ex: 'x-paystack-signature', 'wave-signature'
  algorithm?: 'sha256' | 'sha512';
  processor: 'paystack' | 'wave' | 'orange-money' | 'generic';
}

/**
 * Middleware générique de validation webhook.
 * Vérifie la signature avant d'autoriser le traitement.
 */
export function validateWebhookSignature(options: WebhookValidationOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.get(options.headerName);
      if (!signature) {
        console.warn(
          `[Webhook] Signature manquante (header: ${options.headerName}) pour ${options.processor}`
        );
        return res.status(401).json({ error: 'Signature webhook manquante' });
      }

      const rawBody =
        (req as any).rawBody || (req.body ? JSON.stringify(req.body) : '');

      if (!rawBody) {
        console.warn(`[Webhook] Payload manquant pour ${options.processor}`);
        return res.status(400).json({ error: 'Payload webhook manquant' });
      }

      let isValid = false;

      try {
        switch (options.processor) {
          case 'paystack':
            isValid = verifyPaystackSignature(
              rawBody,
              signature,
              options.secret
            );
            break;
          case 'wave':
            isValid = verifyWaveSignature(rawBody, signature, options.secret);
            break;
          case 'orange-money':
            isValid = verifyOrangeMoneySignature(
              rawBody,
              signature,
              options.secret
            );
            break;
          case 'generic':
            isValid = verifyGenericPaymentWebhookSignature(
              rawBody,
              signature,
              options.secret
            );
            break;
        }
      } catch (err) {
        console.error(
          `[Webhook] Erreur validation ${options.processor}:`,
          err instanceof Error ? err.message : err
        );
        return res.status(401).json({ error: 'Signature webhook invalide' });
      }

      if (!isValid) {
        console.warn(
          `[Webhook] Signature invalide pour ${options.processor} (possible attaque)`
        );
        return res.status(401).json({ error: 'Signature webhook invalide' });
      }

      // Signature valide — continuer
      next();
    } catch (error) {
      console.error('[Webhook] Erreur validation:', error);
      res.status(500).json({ error: 'Erreur validation webhook' });
    }
  };
}

/**
 * Middleware spécifique Paystack.
 */
export function validatePaystackWebhook(paystackSecretKey: string) {
  return validateWebhookSignature({
    secret: paystackSecretKey,
    headerName: 'x-paystack-signature',
    algorithm: 'sha512',
    processor: 'paystack',
  });
}

/**
 * Middleware spécifique Wave.
 */
export function validateWaveWebhook(waveWebhookSecret: string) {
  return validateWebhookSignature({
    secret: waveWebhookSecret,
    headerName: 'wave-signature',
    algorithm: 'sha256',
    processor: 'wave',
  });
}

/**
 * Middleware spécifique Orange Money.
 */
export function validateOrangeMoneyWebhook(orangeMoneySecret: string) {
  return validateWebhookSignature({
    secret: orangeMoneySecret,
    headerName: 'x-orange-money-signature',
    algorithm: 'sha256',
    processor: 'orange-money',
  });
}
