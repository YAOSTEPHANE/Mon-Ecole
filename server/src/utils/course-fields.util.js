"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDurationMinutes = scheduleDurationMinutes;
exports.weeklyHoursToTargetMinutes = weeklyHoursToTargetMinutes;
exports.weeklyHoursToTargetSlots = weeklyHoursToTargetSlots;
exports.formatScheduleMinutesLabel = formatScheduleMinutesLabel;
exports.parseWeeklyHours = parseWeeklyHours;
exports.parseGradingCoefficient = parseGradingCoefficient;
/** Durée d’un créneau HH:MM → HH:MM en minutes. */
function scheduleDurationMinutes(startTime, endTime) {
    const toMin = (t) => {
        const parts = t.trim().split(':');
        if (parts.length < 2)
            return NaN;
        const h = Number(parts[0]);
        const m = Number(parts[1]);
        if (!Number.isFinite(h) || !Number.isFinite(m))
            return NaN;
        return h * 60 + m;
    };
    const start = toMin(startTime);
    const end = toMin(endTime);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        return 0;
    return end - start;
}
/** Volume horaire hebdomadaire → minutes à couvrir dans l’EDT. */
function weeklyHoursToTargetMinutes(weeklyHours) {
    if (weeklyHours == null || !Number.isFinite(weeklyHours) || weeklyHours <= 0) {
        return 60;
    }
    return Math.max(1, Math.round(weeklyHours * 60));
}
/** @deprecated Utiliser weeklyHoursToTargetMinutes — conservé pour compatibilité tests. */
function weeklyHoursToTargetSlots(weeklyHours) {
    return Math.max(1, Math.ceil(weeklyHoursToTargetMinutes(weeklyHours) / 60));
}
function formatScheduleMinutesLabel(totalMinutes) {
    const mins = Math.max(0, Math.round(totalMinutes));
    if (mins < 60)
        return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}
function parseWeeklyHours(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function parseGradingCoefficient(value) {
    if (value === undefined)
        return undefined;
    if (value === null || value === '')
        return null;
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 100)
        return null;
    return n;
}
//# sourceMappingURL=course-fields.util.js.map