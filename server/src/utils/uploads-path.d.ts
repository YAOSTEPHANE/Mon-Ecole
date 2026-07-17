/**
 * Répertoire racine des uploads (disque local uniquement).
 * Sur Vercel, les fichiers vont dans Vercel Blob si `BLOB_READ_WRITE_TOKEN` est défini (voir blob-storage.util).
 * Sans token Blob sur Vercel, `/tmp` reste un repli éphémère (non persistant).
 */
export declare function getUploadsRootDir(): string;
/**
 * Préfixe d’URL public pour les fichiers servis par Express.
 * Sur Vercel (experimentalServices), seul le préfixe `/api` atteint le runtime Express :
 * les assets doivent être demandés en `/api/uploads/...`, pas `/uploads/...` (sinon 404 côté Next).
 */
export declare function getPublicUploadsUrlPrefix(): string;
//# sourceMappingURL=uploads-path.d.ts.map