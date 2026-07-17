"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.academicYearFromDate = academicYearFromDate;
exports.schoolYearEndDateFromLabel = schoolYearEndDateFromLabel;
/**
 * Année scolaire au format "YYYY-YYYY" (sept. → août) à partir d'une date (UTC).
 */
function academicYearFromDate(d) {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    if (m >= 9) {
        return `${y}-${y + 1}`;
    }
    return `${y - 1}-${y}`;
}
/**
 * Dernier jour de l'année scolaire identifiée par l'étiquette `AAAA-BBBB` (BBBB = année de fin civile).
 * Par défaut : dernier jour de juin de l'année BBBB (usage courant en France).
 *
 * `ACADEMIC_YEAR_END_MONTH` (1–12) : mois calendaire dont on prend le dernier jour dans l'année BBBB.
 */
function schoolYearEndDateFromLabel(academicYear) {
    const trimmed = academicYear.trim();
    const m = trimmed.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/);
    if (!m)
        return null;
    const y2 = parseInt(m[2], 10);
    if (!Number.isFinite(y2))
        return null;
    let month = parseInt(process.env.ACADEMIC_YEAR_END_MONTH || '6', 10);
    if (!Number.isFinite(month) || month < 1 || month > 12) {
        month = 6;
    }
    return new Date(y2, month, 0, 23, 59, 59, 999);
}
//# sourceMappingURL=academicYear.util.js.map