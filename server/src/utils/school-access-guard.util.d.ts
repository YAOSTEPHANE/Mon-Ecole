import type { Prisma } from '@prisma/client';
export declare class SchoolAccessDeniedError extends Error {
    status: number;
    constructor(message?: string);
}
export declare function isObjectId(value: string): boolean;
/**
 * Vérifie l’appartenance à l’établissement (logique explicite, fiable MongoDB legacy).
 * Alignée sur studentScopeWhere : schoolId direct, classe rattachée, orphelins → établissement par défaut.
 */
export declare function studentBelongsToSchool(studentId: string, schoolId: string, isDefaultSchool?: boolean): Promise<boolean>;
export declare function assertStudentInSchool(studentId: string, schoolId: string | undefined, isDefaultSchool?: boolean): Promise<void>;
export declare function assertClassInSchool(classId: string, schoolId: string | undefined, isDefaultSchool?: boolean): Promise<void>;
export declare function assertTuitionFeeInSchool(feeId: string, schoolId: string | undefined, isDefaultSchool?: boolean): Promise<void>;
export declare function assertPaymentInSchool(paymentId: string, schoolId: string | undefined, isDefaultSchool?: boolean): Promise<void>;
/** Filtre Prisma : élève rattaché à l’établissement actif. */
export declare function scopedStudentWhere(schoolId: string): Prisma.StudentWhereInput;
/** Filtre Prisma : frais de scolarité des élèves de l’établissement. */
export declare function scopedTuitionFeeWhere(schoolId: string): Prisma.TuitionFeeWhereInput;
/** Filtre Prisma : paiements des élèves de l’établissement. */
export declare function scopedPaymentWhere(schoolId: string): Prisma.PaymentWhereInput;
/** Filtre Prisma : parents ayant au moins un enfant dans l’établissement. */
export declare function scopedParentWhere(schoolId: string): Prisma.ParentWhereInput;
export declare function assertParentInSchool(parentId: string, schoolId: string | undefined): Promise<void>;
export declare function mergeWhereWithSchoolScope<T extends Record<string, unknown>>(base: T, schoolScope: Record<string, unknown>): T & Record<string, unknown>;
//# sourceMappingURL=school-access-guard.util.d.ts.map