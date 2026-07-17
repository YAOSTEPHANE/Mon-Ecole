export declare function addMinutes(d: Date, minutes: number): Date;
export declare function getParentIdForUser(userId: string): Promise<string | null>;
export declare function assertParentOwnsStudent(parentId: string, studentId: string): Promise<void>;
/** Professeur principal de la classe ou enseignant d’au moins un cours de la classe de l’élève. */
export declare function isTeacherAllowedForStudent(teacherId: string, studentId: string): Promise<boolean>;
export declare function hasTeacherSlotConflict(teacherId: string, start: Date, end: Date, excludeAppointmentId?: string): Promise<boolean>;
/**
 * Si l’enseignant a des créneaux `TeacherScheduleAvailabilitySlot`, le RDV doit y tenir (même jour, heure locale serveur).
 * Si aucun créneau : pas de contrainte (prise de RDV libre).
 */
export declare function assertAppointmentFitsTeacherAvailability(teacherId: string, scheduledStart: Date, durationMinutes: number): Promise<void>;
declare const appointmentInclude: {
    readonly parent: {
        readonly include: {
            readonly user: {
                readonly select: {
                    readonly id: true;
                    readonly firstName: true;
                    readonly lastName: true;
                    readonly email: true;
                    readonly phone: true;
                };
            };
        };
    };
    readonly teacher: {
        readonly include: {
            readonly user: {
                readonly select: {
                    readonly id: true;
                    readonly firstName: true;
                    readonly lastName: true;
                    readonly email: true;
                    readonly phone: true;
                };
            };
        };
    };
    readonly student: {
        readonly include: {
            readonly user: {
                readonly select: {
                    readonly id: true;
                    readonly firstName: true;
                    readonly lastName: true;
                };
            };
            readonly class: {
                readonly select: {
                    readonly id: true;
                    readonly name: true;
                    readonly level: true;
                };
            };
        };
    };
};
export { appointmentInclude };
//# sourceMappingURL=parent-teacher-appointment.util.d.ts.map