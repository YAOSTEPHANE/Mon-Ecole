import type { Prisma } from '@prisma/client';
export declare function buildPortalOfferingWhere(studentId: string, academicYear?: string): Promise<Prisma.ExtracurricularOfferingWhereInput | null>;
export declare function registerStudentForExtracurricular(studentId: string, offeringId: string): Promise<{
    registration: unknown;
    status: string;
}>;
//# sourceMappingURL=extracurricular.util.d.ts.map