import type { PrismaClient } from '@prisma/client';
export type ParentTuitionBlockInfo = {
    active: boolean;
    /** Années scolaires concernées (frais inscription/scolarité encore impayés après la fin d'année). */
    hiddenAcademicYears: string[];
};
export declare function emptyParentTuitionBlock(): ParentTuitionBlockInfo;
/**
 * Années scolaires pour lesquelles l'impayé inscription/scolarité dépasse la fin d'année (+ délai de grâce éventuel).
 */
export declare function getAcademicYearsWithTuitionBlockForParent(db: PrismaClient, studentId: string, now?: Date): Promise<Set<string>>;
export declare function parentTuitionBlockFromYears(years: Set<string>): ParentTuitionBlockInfo;
//# sourceMappingURL=parent-academic-result-access.util.d.ts.map