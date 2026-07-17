/** Ligne de gabarit d’échéancier (parts en % et décalage en jours). */
export type TuitionScheduleLine = {
    label: string;
    percentOfTotal: number;
    dueOffsetDays: number;
};
export declare function parseScheduleLines(raw: unknown): TuitionScheduleLine[];
/** Répartit un total en FCFA entier sur les lignes (dernier versement = complément). */
export declare function splitTotalByPercents(total: number, lines: TuitionScheduleLine[]): number[];
export declare function addDays(d: Date, days: number): Date;
//# sourceMappingURL=tuition-catalog.util.d.ts.map