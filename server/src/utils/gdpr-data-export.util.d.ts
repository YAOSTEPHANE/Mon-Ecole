/**
 * Assemble un export structuré des données personnelles liées au compte (RGPD — portabilité).
 * Les mots de passe et secrets techniques ne sont jamais inclus.
 */
export declare function buildGdprDataExport(userId: string): Promise<Record<string, unknown>>;
//# sourceMappingURL=gdpr-data-export.util.d.ts.map