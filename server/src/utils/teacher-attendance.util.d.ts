import type { AbsenceStatus } from '@prisma/client';
import { toAttendanceDateKey } from './schedule-slot.util';
export { toAttendanceDateKey };
export declare function parseAttendanceStatus(raw: unknown, fallback?: AbsenceStatus): AbsenceStatus;
/** Pointage enseignant : 1er pointage = arrivée ; fin = heure de fin du créneau EDT ; heures = intervalle entre les deux. */
export declare function upsertTeacherAttendance(params: {
    teacherId: string;
    date: Date;
    status?: AbsenceStatus;
    source: 'NFC' | 'ADMIN' | 'SELF' | 'BIOMETRIC';
    recordedByUserId?: string | null;
    courseId?: string;
}): Promise<{
    id: string;
    teacherId: string;
    sessionKey: string;
    attendanceDate: string;
    courseId: string | null;
    scheduleId: string | null;
    status: import(".prisma/client").$Enums.AbsenceStatus;
    source: string;
    recordedByUserId: string | null;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    plannedMinutes: number | null;
    teachingMinutes: number | null;
    createdAt: Date;
    updatedAt: Date;
}>;
//# sourceMappingURL=teacher-attendance.util.d.ts.map