import type { AbsenceStatus } from '@prisma/client';
export type NotifyParentsAttendanceParams = {
    studentId: string;
    status: AbsenceStatus;
    date: Date;
    courseName: string;
    courseCode?: string | null;
    minutesLate?: number | null;
    /** Entrée ou sortie de cours (pointage élève) */
    punchPhase?: 'CHECK_IN' | 'CHECK_OUT';
};
/** Absence non justifiée ou retard : alerte famille pertinente (saisie manuelle / absence seule). */
export declare function shouldNotifyParentsOnAttendanceChange(status: AbsenceStatus, excused: boolean): boolean;
/**
 * Notification e-mail + SMS aux parents à chaque pointage élève (entrée ou sortie).
 */
export declare function notifyParentsOfStudentPunch(params: {
    studentId: string;
    courseId: string;
    absenceId: string;
    punchPhase: 'CHECK_IN' | 'CHECK_OUT';
    at: Date;
    status: AbsenceStatus;
    minutesLate?: number | null;
}): Promise<void>;
/**
 * Envoie un e-mail et un SMS à chaque parent lié à l’élève (non bloquant pour l’API).
 * Désactiver avec NOTIFY_PARENTS_ON_ATTENDANCE=false.
 */
export declare function notifyParentsOfAttendanceChange(params: NotifyParentsAttendanceParams): Promise<void>;
/**
 * Charge l’absence, envoie e-mail/SMS aux parents et met à jour `parentNotifiedAt`.
 */
export declare function notifyParentsForAbsenceById(absenceId: string): Promise<{
    notified: boolean;
}>;
//# sourceMappingURL=attendance-parent-notify.util.d.ts.map