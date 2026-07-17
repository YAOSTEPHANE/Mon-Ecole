"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEncryptedSensitivePayload = isEncryptedSensitivePayload;
exports.encryptSensitiveString = encryptSensitiveString;
exports.decryptSensitiveString = decryptSensitiveString;
const crypto_1 = __importDefault(require("crypto"));
const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
function deriveKey() {
    const raw = process.env.SENSITIVE_FIELD_ENCRYPTION_KEY?.trim();
    if (!raw)
        return null;
    return crypto_1.default.createHash('sha256').update(raw, 'utf8').digest();
}
/**
 * Chaîne chiffrée stockée en base (préfixe + IV + tag + ciphertext en base64).
 */
function isEncryptedSensitivePayload(value) {
    return typeof value === 'string' && value.startsWith(PREFIX);
}
function encryptSensitiveString(plain) {
    if (plain === null || plain === undefined)
        return plain ?? null;
    if (plain === '')
        return '';
    const key = deriveKey();
    if (!key)
        return plain;
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGO, key, iv);
    const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    const payload = Buffer.concat([iv, ciphertext, tag]);
    return PREFIX + payload.toString('base64');
}
function decryptSensitiveString(stored) {
    if (stored === null || stored === undefined)
        return stored ?? null;
    if (!isEncryptedSensitivePayload(stored))
        return stored;
    const key = deriveKey();
    if (!key) {
        console.warn('[field-encryption] Valeur chiffrée en base mais SENSITIVE_FIELD_ENCRYPTION_KEY est absent — impossible de déchiffrer.');
        return stored;
    }
    try {
        const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
        const iv = raw.subarray(0, IV_LENGTH);
        const tag = raw.subarray(raw.length - TAG_LENGTH);
        const ciphertext = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);
        const decipher = crypto_1.default.createDecipheriv(ALGO, key, iv);
        decipher.setAuthTag(tag);
        return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
    }
    catch {
        console.warn('[field-encryption] Échec du déchiffrement (données corrompues ou clé incorrecte).');
        return stored;
    }
}
//# sourceMappingURL=field-encryption.util.js.map