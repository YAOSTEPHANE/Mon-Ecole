import jwt from 'jsonwebtoken';
/** À appeler au démarrage du serveur pour échouer tôt si la config JWT est invalide. */
export declare function ensureJwtConfiguration(): void;
export type JwtAccessPayload = {
    userId: string;
    email: string;
    role: string;
};
export declare const generateToken: (userId: string, email: string, role: string) => string;
export declare const verifyToken: (token: string) => string | jwt.JwtPayload;
/** Matériel de signature pour jetons d’accès fichiers (dérivé du secret JWT). */
export declare function uploadAccessSigningMaterial(): string;
/** Vérifie un JWT d’accès et retourne un payload typé (sinon lève). */
export declare function verifyAccessToken(token: string): JwtAccessPayload;
//# sourceMappingURL=jwt.util.d.ts.map