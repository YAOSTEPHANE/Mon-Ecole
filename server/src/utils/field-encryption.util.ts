import crypto from 'crypto';

const PREFIX = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function deriveKey(): Buffer | null {
  const raw = process.env.SENSITIVE_FIELD_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  return crypto.createHash('sha256').update(raw, 'utf8').digest();
}

/**
 * Chaîne chiffrée stockée en base (préfixe + IV + tag + ciphertext en base64).
 */
export function isEncryptedSensitivePayload(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function requireSensitiveFieldEncryptionKey(): void {
  if (process.env.NODE_ENV === 'production' && !deriveKey()) {
    throw new Error(
      'SENSITIVE_FIELD_ENCRYPTION_KEY est obligatoire en production pour chiffrer les données sensibles.',
    );
  }
}

export function encryptSensitiveString(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined) return plain ?? null;
  if (plain === '') return '';
  const key = deriveKey();
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SENSITIVE_FIELD_ENCRYPTION_KEY manquant — refus d’écrire des données sensibles en clair.',
      );
    }
    return plain;
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, ciphertext, tag]);
  return PREFIX + payload.toString('base64');
}

export function decryptSensitiveString(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined) return stored ?? null;
  if (!isEncryptedSensitivePayload(stored)) return stored;

  const key = deriveKey();
  if (!key) {
    console.warn(
      '[field-encryption] Valeur chiffrée en base mais SENSITIVE_FIELD_ENCRYPTION_KEY est absent — impossible de déchiffrer.'
    );
    return stored;
  }

  try {
    const raw = Buffer.from(stored.slice(PREFIX.length), 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(raw.length - TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH, raw.length - TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
  } catch {
    console.warn('[field-encryption] Échec du déchiffrement (données corrompues ou clé incorrecte).');
    return stored;
  }
}
