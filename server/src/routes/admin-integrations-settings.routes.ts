import express from 'express';
import { authorize, type AuthRequest } from '../middleware/auth.middleware';
import {
  buildPublicApiBase,
  CLEAR_INTEGRATION_VALUE,
  ensureIntegrationSettingsCache,
  getIntegrationPublicStatus,
  updatePlatformIntegrations,
  type IntegrationSettingsUpdateInput,
} from '../utils/integration-settings.util';

const router = express.Router();

/** Ne pas appliquer ADMIN à tout `/admin` : ce router est monté sans préfixe. */
router.use((req, res, next) => {
  if (!req.path.startsWith('/integrations/settings')) return next();
  return authorize('ADMIN', 'SUPER_ADMIN')(req as AuthRequest, res, next);
});

function parseOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  return value;
}

function parseOptionalBool(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return undefined;
}

function parseOptionalPort(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '' || value === CLEAR_INTEGRATION_VALUE) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n < 1 || n > 65535) return null;
  return Math.round(n);
}

/** GET /admin/integrations/settings — statut sans secrets en clair. */
router.get('/integrations/settings', async (req, res) => {
  try {
    await ensureIntegrationSettingsCache();
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    const reqBase = host ? `${proto}://${host}` : undefined;
    const apiBase = buildPublicApiBase(reqBase);
    res.json(getIntegrationPublicStatus(apiBase));
  } catch (error) {
    console.error('GET /admin/integrations/settings:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
});

/** PUT /admin/integrations/settings — partial update ; "__CLEAR__" efface le override DB. */
router.put('/integrations/settings', async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const input: IntegrationSettingsUpdateInput = {
      menaPresenceWebhookSecret: parseOptionalString(body.menaPresenceWebhookSecret),
      menaPresenceWatchDir: parseOptionalString(body.menaPresenceWatchDir),
      menaPresenceImportEnabled: parseOptionalBool(body.menaPresenceImportEnabled),
      menaPresenceCron: parseOptionalString(body.menaPresenceCron),
      menaPresenceDbUrl: parseOptionalString(body.menaPresenceDbUrl),
      menaPresenceDbQuery: parseOptionalString(body.menaPresenceDbQuery),
      nfcApiKey: parseOptionalString(body.nfcApiKey),
      paymentWebhookSecret: parseOptionalString(body.paymentWebhookSecret),
      waveApiKey: parseOptionalString(body.waveApiKey),
      orangeMoneyApiKey: parseOptionalString(body.orangeMoneyApiKey),
      mtnMomoApiKey: parseOptionalString(body.mtnMomoApiKey),
      mtnMomoSubscriptionKey: parseOptionalString(body.mtnMomoSubscriptionKey),
      cinetpayApiKey: parseOptionalString(body.cinetpayApiKey),
      cinetpaySiteId: parseOptionalString(body.cinetpaySiteId),
      paystackSecretKey: parseOptionalString(body.paystackSecretKey),
      whatsappToken: parseOptionalString(body.whatsappToken),
      whatsappPhoneNumberId: parseOptionalString(body.whatsappPhoneNumberId),
      whatsappDefaultCountryCode: parseOptionalString(body.whatsappDefaultCountryCode),
      smtpHost: parseOptionalString(body.smtpHost),
      smtpPort: parseOptionalPort(body.smtpPort),
      smtpSecure: parseOptionalBool(body.smtpSecure),
      smtpUser: parseOptionalString(body.smtpUser),
      smtpPass: parseOptionalString(body.smtpPass),
      emailFrom: parseOptionalString(body.emailFrom),
    };

    await updatePlatformIntegrations(input);
    const proto = req.get('x-forwarded-proto') || req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host');
    const reqBase = host ? `${proto}://${host}` : undefined;
    const apiBase = buildPublicApiBase(reqBase);
    res.json({
      ok: true,
      settings: getIntegrationPublicStatus(apiBase),
    });
  } catch (error) {
    console.error('PUT /admin/integrations/settings:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Erreur serveur',
    });
  }
});

export default router;
