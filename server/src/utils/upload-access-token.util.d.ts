/**
 * Jeton court pour liens `<a href>` / `<img src>` sur fichiers sensibles (15 min).
 */
export declare function signUploadAccessToken(relativePath: string): string;
export declare function verifyUploadAccessToken(relativePath: string, token: string): boolean;
/** Ajoute `?access=` sur les URLs de fichiers sensibles (réponses API). */
export declare function withUploadAccessQuery(storedUrl: string): string;
/**
 * URL utilisable par le client (img, lien). Blob Vercel : URL CDN directe.
 * Fichiers locaux sensibles : jeton `?access=` court.
 */
export declare function resolveStoredFileAccessUrl(storedUrl: string): string;
//# sourceMappingURL=upload-access-token.util.d.ts.map