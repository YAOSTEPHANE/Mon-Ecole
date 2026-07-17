"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeviceApiKey = getDeviceApiKey;
exports.ensureDeviceApiKeyConfiguration = ensureDeviceApiKeyConfiguration;
const DEFAULT_DEV_KEY = 'nfc-device-key-2024';
/** Clé API pour terminaux NFC / reconnaissance faciale (matériel de pointage). */
function getDeviceApiKey() {
    const raw = (process.env.NFC_API_KEY ?? '').trim();
    const isProd = process.env.NODE_ENV === 'production';
    if (isProd) {
        if (!raw || raw === DEFAULT_DEV_KEY || raw.length < 32) {
            throw new Error('NFC_API_KEY doit être défini en production (≥ 32 caractères, valeur unique, pas la clé par défaut).');
        }
        return raw;
    }
    return raw.length > 0 ? raw : DEFAULT_DEV_KEY;
}
/** Échoue au démarrage si la clé matériel est absente ou faible en production. */
function ensureDeviceApiKeyConfiguration() {
    getDeviceApiKey();
}
//# sourceMappingURL=device-api-key.util.js.map