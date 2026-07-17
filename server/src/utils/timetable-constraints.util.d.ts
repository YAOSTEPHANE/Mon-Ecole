import type { PrismaClient } from '@prisma/client';
export declare const normalizeRoomKey: (room?: string | null) => string | null;
export declare const overlaps: (aStart: string, aEnd: string, bStart: string, bEnd: string) => boolean;
export declare function assertScheduleConstraints(prisma: PrismaClient, input: {
    classId: string;
    courseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room?: string | null;
    substituteTeacherId?: string | null;
}, excludeScheduleId?: string): Promise<void>;
export type ClassScheduleVolumeRow = {
    courseId: string;
    courseName: string;
    weeklyHours: number | null;
    targetMinutes: number;
    scheduledMinutes: number;
    missingMinutes: number;
    excessMinutes: number;
    /** Compatibilité affichage (≈ heures pleines) */
    targetSlots: number;
    scheduledSlots: number;
    missingSlots: number;
    excessSlots: number;
};
export declare function getClassScheduleVolumeSummary(prisma: PrismaClient, classId: string): Promise<{
    classId: string;
    courses: ClassScheduleVolumeRow[];
}>;
export declare function autoGenerateTimetableForClass(prisma: PrismaClient, opts: {
    classId: string;
    clearExisting?: boolean;
    days?: number[];
    slotDurationMinutes?: number;
    /** Pas entre deux débuts de créneau candidats (défaut 1 minute). */
    slotStepMinutes?: number;
    morningStart?: string;
    morningEnd?: string;
    afternoonStart?: string;
    afternoonEnd?: string;
}): Promise<{
    created: number;
    errors: string[];
    skippedCourses: string[];
    mode: 'replace' | 'reconcile';
    slotDurationMinutes: number;
    slotStepMinutes: number;
}>;
//# sourceMappingURL=timetable-constraints.util.d.ts.map