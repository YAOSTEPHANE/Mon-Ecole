import type { Prisma } from '@prisma/client';
type TeacherBrief = {
    id: string;
    user: {
        firstName: string;
        lastName: string;
        email: string;
    };
};
export type ScheduleWithRelations = {
    id: string;
    classId: string;
    courseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    substituteTeacherId: string | null;
    replacementNote: string | null;
    createdAt: Date;
    updatedAt: Date;
    class: {
        id: string;
        name: string;
        level: string;
    };
    course: {
        id: string;
        name: string;
        code: string;
        teacher: TeacherBrief | null;
    };
    substituteTeacher: TeacherBrief | null;
};
/** Charge les créneaux EDT sans échouer si une relation MongoDB est orpheline. */
export declare function findSchedulesWithRelations(where?: Prisma.ScheduleWhereInput, orderBy?: Prisma.ScheduleOrderByWithRelationInput[]): Promise<ScheduleWithRelations[]>;
export declare function findScheduleByIdWithRelations(id: string): Promise<ScheduleWithRelations | null>;
export {};
//# sourceMappingURL=safe-schedule-query.util.d.ts.map