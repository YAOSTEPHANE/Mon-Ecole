/** Durée d’un créneau HH:MM → HH:MM en minutes. */
export declare function scheduleDurationMinutes(startTime: string, endTime: string): number;
/** Volume horaire hebdomadaire → minutes à couvrir dans l’EDT. */
export declare function weeklyHoursToTargetMinutes(weeklyHours: number | null | undefined): number;
/** @deprecated Utiliser weeklyHoursToTargetMinutes — conservé pour compatibilité tests. */
export declare function weeklyHoursToTargetSlots(weeklyHours: number | null | undefined): number;
export declare function formatScheduleMinutesLabel(totalMinutes: number): string;
export declare function parseWeeklyHours(value: unknown): number | null | undefined;
export declare function parseGradingCoefficient(value: unknown): number | null | undefined;
//# sourceMappingURL=course-fields.util.d.ts.map