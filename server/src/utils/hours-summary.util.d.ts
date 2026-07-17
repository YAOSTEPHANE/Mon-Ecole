/** Agrégation d’heures / minutes par jour, semaine ISO ou mois. */
export type HoursGroupBy = 'day' | 'week' | 'month';
export declare function parseHoursGroupBy(raw: unknown): HoursGroupBy;
/** Clé de période à partir d’une date YYYY-MM-DD. */
export declare function periodKeyFromYmd(ymd: string, groupBy: HoursGroupBy): string;
export declare function periodLabelFromKey(key: string, groupBy: HoursGroupBy): string;
export declare function minutesToHours(minutes: number): number;
/** Minutes travaillées à partir d’entrée/sortie ou d’un champ explicite. */
export declare function resolveWorkedMinutes(input: {
    workedMinutes?: number | null;
    checkInAt?: Date | string | null;
    checkOutAt?: Date | string | null;
}): number | null;
export type PeriodBucket = {
    key: string;
    label: string;
    minutes: number;
    plannedMinutes: number;
    sessions: number;
    hours: number;
};
export declare function accumulatePeriod(map: Map<string, PeriodBucket>, ymd: string, groupBy: HoursGroupBy, minutes: number, plannedMinutes?: number): void;
export declare function sortedPeriodBuckets(map: Map<string, PeriodBucket>): PeriodBucket[];
//# sourceMappingURL=hours-summary.util.d.ts.map