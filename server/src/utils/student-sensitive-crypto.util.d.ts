export declare const STUDENT_SENSITIVE_FIELD_KEYS: readonly ['address', 'emergencyContact', 'emergencyPhone', 'medicalInfo'];
export type StudentSensitiveFieldKey = (typeof STUDENT_SENSITIVE_FIELD_KEYS)[number];
/** Déchiffre les champs sensibles d’un enregistrement élève (réponse API). */
export declare function decryptStudentRecord<T extends Record<string, unknown>>(row: T): T;
/** Déchiffre studentProfile et les élèves imbriqués sous parentProfile (session / utilisateur). */
export declare function decryptSessionUserPayload<U extends {
    studentProfile?: unknown;
    parentProfile?: unknown;
}>(user: U): U;
/**
 * Prépare les chaînes pour écriture Prisma (null / chaîne chiffrée).
 * Ignore les clés absentes ou à undefined ; conserve explicitement null.
 */
export declare function encryptStudentScalarsForPrismaCreate(fields: Partial<Record<StudentSensitiveFieldKey, unknown>>): Partial<Record<StudentSensitiveFieldKey, string | null>>;
/** Met à jour uniquement les champs présents dans le payload (après normalisation route). */
/** Rendez-vous : l’include `student` expose les champs scalaires élève. */
export declare function decryptParentTeacherAppointmentRow<T extends {
    student?: unknown;
}>(row: T): T;
export declare function encryptStudentSensitiveWritePayload<T extends Partial<Record<StudentSensitiveFieldKey, string | null | undefined>>>(payload: T): T;
//# sourceMappingURL=student-sensitive-crypto.util.d.ts.map