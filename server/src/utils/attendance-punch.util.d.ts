import type { AbsenceStatus } from '@prisma/client';
export type PunchPhase = 'CHECK_IN' | 'CHECK_OUT' | 'ALREADY_COMPLETE';
export type PunchSource = 'NFC' | 'BIOMETRIC' | 'FACE' | 'MANUAL' | 'ADMIN';
export declare function punchStudentCourseAttendance(params: {
    studentId: string;
    courseId: string;
    teacherId: string;
    at: Date;
    source: PunchSource;
    forceStatus?: AbsenceStatus;
    minutesLate?: number | null;
    /** false = ne pas alerter les parents (défaut true) */
    notifyParents?: boolean;
}): Promise<{
    absence: {
        id: string;
        studentId: string;
        courseId: string;
        teacherId: string;
        date: Date;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        reason: string | null;
        excused: boolean;
        justificationDocuments: string[];
        justificationSubmittedAt: Date | null;
        attendanceSource: string | null;
        minutesLate: number | null;
        hasMedicalCertificate: boolean;
        sanctionNote: string | null;
        parentNotifiedAt: Date | null;
        checkInAt: Date | null;
        checkOutAt: Date | null;
        scheduleId: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    punchPhase: PunchPhase;
}>;
export declare function punchStaffAttendance(params: {
    staffId: string;
    at: Date;
    source: PunchSource;
    recordedByUserId?: string | null;
}): Promise<{
    attendance: {
        id: string;
        staffId: string;
        attendanceDate: string;
        status: import(".prisma/client").$Enums.AbsenceStatus;
        source: string;
        recordedByUserId: string | null;
        notes: string | null;
        checkInAt: Date | null;
        checkOutAt: Date | null;
        workedMinutes: number | null;
        createdAt: Date;
        updatedAt: Date;
    };
    punchPhase: PunchPhase;
}>;
export declare function punchTeacherCourseAttendance(params: {
    teacherId: string;
    at: Date;
    source: 'NFC' | 'BIOMETRIC' | 'FACE' | 'ADMIN' | 'SELF';
    courseId?: string;
    recordedByUserId?: string | null;
}): Promise<{
    attendance: {
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
    };
    punchPhase: PunchPhase;
    slot: import("./schedule-slot.util").ScheduleSlotRow | null;
    courseId: string;
}>;
//# sourceMappingURL=attendance-punch.util.d.ts.map