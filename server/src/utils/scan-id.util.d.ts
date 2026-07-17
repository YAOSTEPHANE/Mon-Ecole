import type { Prisma } from '@prisma/client';
/** Correspondance lecture carte NFC ou empreinte digitale (identifiants distincts en base). */
export declare function matchStudentScanId(scanId: string): Prisma.StudentWhereInput;
export declare function matchTeacherScanId(scanId: string): Prisma.TeacherWhereInput;
export declare function matchStaffScanId(scanId: string): Prisma.StaffMemberWhereInput;
//# sourceMappingURL=scan-id.util.d.ts.map