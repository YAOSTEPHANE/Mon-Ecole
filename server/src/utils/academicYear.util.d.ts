/**
 * Année scolaire au format "YYYY-YYYY" (sept. → août) à partir d'une date (UTC).
 */
export declare function academicYearFromDate(d: Date): string;
/**
 * Dernier jour de l'année scolaire identifiée par l'étiquette `AAAA-BBBB` (BBBB = année de fin civile).
 * Par défaut : dernier jour de juin de l'année BBBB (usage courant en France).
 *
 * `ACADEMIC_YEAR_END_MONTH` (1–12) : mois calendaire dont on prend le dernier jour dans l'année BBBB.
 */
export declare function schoolYearEndDateFromLabel(academicYear: string): Date | null;
//# sourceMappingURL=academicYear.util.d.ts.map