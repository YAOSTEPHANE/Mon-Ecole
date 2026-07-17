/** Journalise les variables manquantes en production (sans exposer de secrets). */
export declare function logProductionEnvDiagnostics(): void;
/** Message d’erreur utilisateur pour échec Prisma (connexion, timeout). */
export declare function prismaConnectionErrorMessage(error: unknown): string | null;
/** Détecte une URI MongoDB dont le mot de passe contient un « @ » non encodé. */
export declare function databaseUrlMisconfigurationHint(url: string): string | null;
export declare function logDatabaseUrlDiagnostics(): void;
//# sourceMappingURL=production-env-diagnostics.util.d.ts.map