"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTimeOnDate = parseTimeOnDate;
exports.toAttendanceDateKey = toAttendanceDateKey;
exports.durationMinutesFromHHMM = durationMinutesFromHHMM;
exports.findActiveScheduleSlotForCourse = findActiveScheduleSlotForCourse;
exports.findActiveScheduleSlotForTeacher = findActiveScheduleSlotForTeacher;
exports.scheduledCheckOutAt = scheduledCheckOutAt;
exports.computeTeacherTeachingMinutes = computeTeacherTeachingMinutes;
exports.resolveLateStatus = resolveLateStatus;
const prisma_1 = __importDefault(require("./prisma"));
/** Parse "HH:MM" sur la date civile locale du serveur. */
function parseTimeOnDate(hhmm, base) {
    const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
    const d = new Date(base);
    d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
    return d;
}
function toAttendanceDateKey(input) {
    const d = new Date(input);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function durationMinutesFromHHMM(start, end) {
    const [sh, sm] = start.split(':').map((x) => parseInt(x, 10));
    const [eh, em] = end.split(':').map((x) => parseInt(x, 10));
    if (![sh, sm, eh, em].every(Number.isFinite))
        return 0;
    return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}
function isWithinSlotWindow(at, startTime, endTime, earlyCheckInMinutes) {
    const start = parseTimeOnDate(startTime, at);
    const end = parseTimeOnDate(endTime, at);
    const windowStart = new Date(start.getTime() - earlyCheckInMinutes * 60000);
    return at.getTime() >= windowStart.getTime() && at.getTime() <= end.getTime();
}
async function findActiveScheduleSlotForCourse(courseId, at, earlyCheckInMinutes = 20) {
    const dayOfWeek = at.getDay();
    const slots = await prisma_1.default.schedule.findMany({
        where: { courseId, dayOfWeek },
        include: {
            course: { select: { id: true, name: true, code: true, teacherId: true } },
        },
    });
    const active = slots.filter((s) => isWithinSlotWindow(at, s.startTime, s.endTime, earlyCheckInMinutes));
    if (active.length === 0)
        return null;
    active.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return active[0];
}
async function findActiveScheduleSlotForTeacher(teacherId, at, courseId, earlyCheckInMinutes = 20) {
    const dayOfWeek = at.getDay();
    const slots = await prisma_1.default.schedule.findMany({
        where: {
            dayOfWeek,
            OR: [{ course: { teacherId } }, { substituteTeacherId: teacherId }],
            ...(courseId ? { courseId } : {}),
        },
        include: {
            course: { select: { id: true, name: true, code: true, teacherId: true } },
        },
    });
    const active = slots.filter((s) => isWithinSlotWindow(at, s.startTime, s.endTime, earlyCheckInMinutes));
    if (active.length === 0)
        return null;
    active.sort((a, b) => a.startTime.localeCompare(b.startTime));
    return active[0];
}
function scheduledCheckOutAt(at, endTime) {
    return parseTimeOnDate(endTime, at);
}
/** Minutes effectivement décomptées : du 1er pointage jusqu'à la fin du créneau (emploi du temps). */
function computeTeacherTeachingMinutes(checkInAt, checkOutAt) {
    return Math.max(0, Math.round((checkOutAt.getTime() - checkInAt.getTime()) / 60000));
}
function resolveLateStatus(at, startTime, graceMinutes) {
    const start = parseTimeOnDate(startTime, at);
    const graceEnd = new Date(start.getTime() + graceMinutes * 60000);
    return at.getTime() > graceEnd.getTime() ? 'LATE' : 'PRESENT';
}
//# sourceMappingURL=schedule-slot.util.js.map