export type MenaExportPackage = {
    meta: {
        schemaVersion: string;
        generatedAt: string;
        purpose: string;
        academicYear: string | null;
        schoolId: string;
    };
    etablissement: Record<string, unknown>;
    eleves: Array<Record<string, unknown>>;
    effectifs: {
        total: number;
        actifs: number;
        affectesEtat: number;
        nonAffectes: number;
        avecMatriculeFne: number;
        sansMatriculeFne: number;
        parNiveau: Array<{
            niveau: string;
            total: number;
            garcons: number;
            filles: number;
            autre: number;
            affectesEtat: number;
        }>;
        parClasse: Array<{
            classeId: string;
            classe: string;
            niveau: string;
            anneeScolaire: string | null;
            total: number;
            garcons: number;
            filles: number;
            autre: number;
            affectesEtat: number;
        }>;
    };
};
export declare function buildMenaStudentExportPackage(schoolId: string, isDefaultSchool: boolean, academicYear?: string): Promise<MenaExportPackage>;
export declare function checksumMenaPackage(pkg: MenaExportPackage): string;
export declare function menaPackageToStudentsCsv(pkg: MenaExportPackage): string;
export declare function pushMenaPackageToWebhook(pkg: MenaExportPackage, webhookUrl: string): Promise<{
    ok: boolean;
    status: number;
    bodyPreview: string;
}>;
export declare function getConfiguredMenaWebhookUrl(): string | null;
export declare function maskConfiguredMenaWebhook(): string | null;
//# sourceMappingURL=mena-export.util.d.ts.map