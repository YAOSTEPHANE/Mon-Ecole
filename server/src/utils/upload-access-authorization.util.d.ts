import type { AuthRequest } from '../middleware/auth.middleware';
/** Vérifie si l’utilisateur authentifié peut lire ce fichier sensible. */
export declare function userCanAccessSensitiveUpload(user: NonNullable<AuthRequest['user']>, requestPath: string): Promise<boolean>;
//# sourceMappingURL=upload-access-authorization.util.d.ts.map