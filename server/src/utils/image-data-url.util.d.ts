/**
 * Charge une image stockée (Blob, URL HTTP, `/uploads/...`) en data URL pour le PDF côté client.
 */
export declare function fetchStoredImageAsDataUrl(stored: string | null | undefined): Promise<string | null>;
/** Logo navigation / connexion en data URL (fetch serveur, sans CORS navigateur). */
export declare function fetchBrandingLogoDataUrl(schoolId?: string | null): Promise<string | null>;
//# sourceMappingURL=image-data-url.util.d.ts.map