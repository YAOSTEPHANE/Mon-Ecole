import { getNfcApiKeyFromIntegrations } from './integration-settings.util';

const DEFAULT_DEV_KEY = 'nfc-device-key-2024';

/** Clé API pour terminaux NFC / reconnaissance faciale (matériel de pointage). */
export function getDeviceApiKey(): string {
  const raw = getNfcApiKeyFromIntegrations();
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    if (!raw || raw === DEFAULT_DEV_KEY || raw.length < 32) {
      throw new Error(
        'NFC_API_KEY doit être défini (admin → Intégrations ou .env, ≥ 32 caractères, valeur unique).'
      );
    }
    return raw;
  }

  return raw.length > 0 ? raw : DEFAULT_DEV_KEY;
}

/** Échoue au démarrage si la clé matériel est absente ou faible en production. */
export function ensureDeviceApiKeyConfiguration(): void {
  getDeviceApiKey();
}
