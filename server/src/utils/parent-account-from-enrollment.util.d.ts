/** Dérive prénom / nom à partir du libellé « parent / tuteur » du dossier. */
export declare function parseParentDisplayName(raw: string | null | undefined): {
    firstName: string;
    lastName: string;
};
export type ParentEnrollmentInput = {
    parentEmail?: string | null;
    parentName?: string | null;
    parentPhone?: string | null;
    studentId: string;
    studentUserEmail?: string;
    relation?: 'father' | 'mother' | 'guardian' | 'other';
};
export type ParentEnrollmentResult = {
    attempted: boolean;
    created: boolean;
    linked: boolean;
    parentSetupEmailSent: boolean;
    skippedReason?: string;
    parentUserId?: string;
};
/**
 * Crée ou rattache un compte PARENT à partir des coordonnées du dossier d’inscription,
 * puis lie l’élève nouvellement inscrit.
 */
export declare function ensureParentAccountForEnrolledStudent(input: ParentEnrollmentInput): Promise<ParentEnrollmentResult>;
//# sourceMappingURL=parent-account-from-enrollment.util.d.ts.map