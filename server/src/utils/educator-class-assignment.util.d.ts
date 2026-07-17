import type { Prisma } from '@prisma/client';
export declare function parseEducatorClassIds(raw: unknown): string[];
export declare function getAssignedClassIds(educatorId: string): Promise<string[]>;
export declare function getAssignedClassIdsForUserId(userId: string): Promise<string[] | null>;
export declare function syncEducatorClassAssignments(educatorId: string, classIds: string[]): Promise<void>;
export declare function isStudentInEducatorScope(educatorUserId: string, studentId: string): Promise<boolean>;
export declare function isClassInEducatorScope(educatorUserId: string, classId: string): Promise<boolean>;
export declare function studentClassFilter(classIds: string[]): Prisma.StudentWhereInput;
export declare function classIdFilter(classIds: string[]): Prisma.ClassWhereInput;
export declare const educatorClassAssignmentInclude: {
    readonly classAssignments: {
        readonly include: {
            readonly class: {
                readonly select: {
                    readonly id: true;
                    readonly name: true;
                    readonly level: true;
                    readonly academicYear: true;
                };
            };
        };
        readonly orderBy: {
            readonly createdAt: 'asc';
        };
    };
};
//# sourceMappingURL=educator-class-assignment.util.d.ts.map