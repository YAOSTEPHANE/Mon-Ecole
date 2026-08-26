import { getNfcApiKeyFromIntegrations } from './integration-settings.util';

const WEAK_KEYS = new Set(['', 'nfc-device-key-2024', 'changez-moi', 'secret']);

/** Clé API pour terminaux NFC / reconnaissance faciale (matériel de pointage). */
export function getDeviceApiKey(): string {
  const raw = (getNfcApiKeyFromIntegrations() || '').trim();

  if (!raw || WEAK_KEYS.has(raw) || raw.length < 32) {
    throw new Error(
      'NFC_API_KEY doit être défini (admin → Intégrations ou .env), ≥ 32 caractères, valeur unique.',
    );
  }
  return raw;
}

/** Échoue au démarrage si la clé matériel est absente ou faible. */
export function ensureDeviceApiKeyConfiguration(): void {
  getDeviceApiKey();
}
