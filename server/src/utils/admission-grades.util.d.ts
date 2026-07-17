/** Niveaux collège (formulaire public 6ème → 3ème). */
export declare const COLLEGE_ADMISSION_LEVELS: readonly ['6ème', '5ème', '4ème', '3ème'];
export declare const LYCEE_ADMISSION_LEVELS: readonly ['2nde', '1ère', 'Terminale'];
export declare const ADMISSION_SECONDARY_LEVELS: readonly ["6ème", "5ème", "4ème", "3ème", "2nde", "1ère", "Terminale"];
export declare function isCollegeAdmissionLevel(desiredLevel: string): boolean;
export declare function isLyceeAdmissionLevel(desiredLevel: string): boolean;
export declare function isAdmissionSecondaryLevel(desiredLevel: string): boolean;
export declare function admissionLevelRequiresGrades(desiredLevel: string): boolean;
export declare function parseAdmissionGrade(value: unknown): number | null;
export type AdmissionGradeFields = {
    gradeTerm1: number | null;
    gradeTerm2: number | null;
    gradeAnnualGeneral: number | null;
    gradeAnnualSpecific: number | null;
    gradeAnnualLiterary: number | null;
};
export declare function parseAdmissionGradeFields(body: Record<string, unknown>): AdmissionGradeFields;
export declare function validateAdmissionTerm3ReportCard(desiredLevel: string, hasFile: boolean): string | null;
export declare function validateAdmissionGrades(desiredLevel: string, grades: AdmissionGradeFields): string | null;
export declare function admissionGradeDataForCreate(desiredLevel: string, body: Record<string, unknown>): Partial<AdmissionGradeFields>;
//# sourceMappingURL=admission-grades.util.d.ts.map