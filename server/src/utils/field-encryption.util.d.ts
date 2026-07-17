/**
 * Chaîne chiffrée stockée en base (préfixe + IV + tag + ciphertext en base64).
 */
export declare function isEncryptedSensitivePayload(value: string | null | undefined): boolean;
export declare function encryptSensitiveString(plain: string | null | undefined): string | null;
export declare function decryptSensitiveString(stored: string | null | undefined): string | null;
//# sourceMappingURL=field-encryption.util.d.ts.map