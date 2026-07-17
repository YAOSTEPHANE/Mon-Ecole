/** Parse "HH:MM" sur la date civile locale du serveur. */
export declare function parseTimeOnDate(hhmm: string, base: Date): Date;
export declare function toAttendanceDateKey(input: Date): string;
export declare function durationMinutesFromHHMM(start: string, end: string): number;
export type ScheduleSlotRow = {
    id: string;
    classId: string;
    courseId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string | null;
    course: {
        id: string;
        name: string;
        code: string;
        teacherId: string;
    };
};
export declare function findActiveScheduleSlotForCourse(courseId: string, at: Date, earlyCheckInMinutes?: number): Promise<ScheduleSlotRow | null>;
export declare function findActiveScheduleSlotForTeacher(teacherId: string, at: Date, courseId?: string, earlyCheckInMinutes?: number): Promise<ScheduleSlotRow | null>;
export declare function scheduledCheckOutAt(at: Date, endTime: string): Date;
/** Minutes effectivement décomptées : du 1er pointage jusqu'à la fin du créneau (emploi du temps). */
export declare function computeTeacherTeachingMinutes(checkInAt: Date, checkOutAt: Date): number;
export declare function resolveLateStatus(at: Date, startTime: string, graceMinutes: number): 'PRESENT' | 'LATE';
//# sourceMappingURL=schedule-slot.util.d.ts.map