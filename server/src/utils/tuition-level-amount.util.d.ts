import type { TuitionFeeCatalog } from '@prisma/client';
/** Niveaux scolaires pour lesquels un montant de scolarité fixe peut être défini. */
export declare const TUITION_LEVELS: readonly ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'];
export type TuitionLevelRateRow = {
    level: string;
    amount: number | null;
    catalogId: string | null;
};
export declare function normalizeClassLevel(level: string): string;
/** Barème scolarité actif pour un niveau et une année (priorité à l’année exacte). */
export declare function findLevelTuitionCatalog(academicYear: string, classLevel: string): Promise<TuitionFeeCatalog | null>;
export declare function getLevelTuitionRates(academicYear: string): Promise<TuitionLevelRateRow[]>;
export declare function upsertLevelTuitionRates(academicYear: string, rates: {
    level: string;
    amount: number;
}[]): Promise<TuitionFeeCatalog[]>;
export type ResolvedTuitionForStudent = {
    amount: number;
    classLevel: string;
    catalogId: string;
};
export type ResolvedTuitionForClass = {
    amount: number;
    classId: string;
    className: string;
    classLevel: string;
    catalogId: string;
    source: 'BY_CLASS' | 'BY_LEVEL';
};
/** Barème scolarité actif pour une classe et une année (priorité à l’année exacte). */
export declare function findClassTuitionCatalog(academicYear: string, classId: string): Promise<TuitionFeeCatalog | null>;
export type ClassTuitionRateRow = {
    classId: string;
    className: string;
    classLevel: string;
    academicYear: string | null;
    amount: number | null;
    catalogId: string | null;
};
export declare function getClassTuitionRates(academicYear: string): Promise<ClassTuitionRateRow[]>;
export declare function upsertClassTuitionRates(academicYear: string, rates: {
    classId: string;
    amount: number;
}[]): Promise<TuitionFeeCatalog[]>;
/** Montant de scolarité pour une classe : barème classe, sinon barème du niveau. */
export declare function resolveTuitionForClass(classId: string, academicYear: string): Promise<ResolvedTuitionForClass | null>;
export declare function resolveTuitionAmountForStudent(studentId: string, academicYear: string): Promise<ResolvedTuitionForStudent | null>;
export declare class TuitionLevelAmountError extends Error {
    status: number;
    constructor(message: string, status?: number);
}
/**
 * Pour les frais de type TUITION : impose le montant du barème niveau (remise via discountAmount uniquement).
 */
export declare function enforceTuitionFeeAmounts(params: {
    studentId: string;
    academicYear: string;
    feeType?: string | null;
    amount?: number | string | null;
    baseAmount?: number | string | null;
    discountAmount?: number | string | null;
    catalogId?: string | null;
}): Promise<{
    amount: number;
    baseAmount: number;
    discountAmount: number;
    catalogId: string | null;
}>;
//# sourceMappingURL=tuition-level-amount.util.d.ts.map