"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentInclude = void 0;
exports.addMinutes = addMinutes;
exports.getParentIdForUser = getParentIdForUser;
exports.assertParentOwnsStudent = assertParentOwnsStudent;
exports.isTeacherAllowedForStudent = isTeacherAllowedForStudent;
exports.hasTeacherSlotConflict = hasTeacherSlotConflict;
exports.assertAppointmentFitsTeacherAvailability = assertAppointmentFitsTeacherAvailability;
const prisma_1 = __importDefault(require("./prisma"));
function addMinutes(d, minutes) {
    return new Date(d.getTime() + minutes * 60 * 1000);
}
async function getParentIdForUser(userId) {
    const p = await prisma_1.default.parent.findUnique({
        where: { userId },
        select: { id: true },
    });
    return p?.id ?? null;
}
async function assertParentOwnsStudent(parentId, studentId) {
    const link = await prisma_1.default.studentParent.findFirst({
        where: { parentId, studentId },
    });
    if (!link) {
        throw new Error('Cet élève n’est pas associé à votre compte parent.');
    }
}
/** Professeur principal de la classe ou enseignant d’au moins un cours de la classe de l’élève. */
async function isTeacherAllowedForStudent(teacherId, studentId) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        select: {
            classId: true,
            class: {
                select: {
                    teacherId: true,
                    courses: { select: { teacherId: true } },
                },
            },
        },
    });
    if (!student?.classId || !student.class) {
        return false;
    }
    if (student.class.teacherId === teacherId) {
        return true;
    }
    return student.class.courses.some((c) => c.teacherId === teacherId);
}
async function hasTeacherSlotConflict(teacherId, start, end, excludeAppointmentId) {
    const busy = await prisma_1.default.parentTeacherAppointment.findMany({
        where: {
            teacherId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
        },
        select: { scheduledStart: true, durationMinutes: true },
    });
    for (const b of busy) {
        const bs = new Date(b.scheduledStart);
        const be = addMinutes(bs, b.durationMinutes);
        if (start.getTime() < be.getTime() && end.getTime() > bs.getTime()) {
            return true;
        }
    }
    return false;
}
function timeHHMM(d) {
    const h = d.getHours();
    const m = d.getMinutes();
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
const toMinutes = (time) => {
    const [hh, mm] = String(time).split(':').map(Number);
    if (!Number.isFinite(hh) || !Number.isFinite(mm))
        return NaN;
    return hh * 60 + mm;
};
/**
 * Si l’enseignant a des créneaux `TeacherScheduleAvailabilitySlot`, le RDV doit y tenir (même jour, heure locale serveur).
 * Si aucun créneau : pas de contrainte (prise de RDV libre).
 */
async function assertAppointmentFitsTeacherAvailability(teacherId, scheduledStart, durationMinutes) {
    const windows = await prisma_1.default.teacherScheduleAvailabilitySlot.findMany({
        where: { teacherId },
        select: { dayOfWeek: true, startTime: true, endTime: true },
    });
    if (windows.length === 0)
        return;
    const endAt = addMinutes(scheduledStart, durationMinutes);
    if (endAt.getFullYear() !== scheduledStart.getFullYear() ||
        endAt.getMonth() !== scheduledStart.getMonth() ||
        endAt.getDate() !== scheduledStart.getDate()) {
        throw new Error('Le rendez-vous doit tenir dans une même journée (pas au-delà de minuit).');
    }
    const dow = scheduledStart.getDay();
    const startStr = timeHHMM(scheduledStart);
    const endStr = timeHHMM(endAt);
    const tStart = toMinutes(startStr);
    const tEnd = toMinutes(endStr);
    if (Number.isNaN(tStart) || Number.isNaN(tEnd) || tEnd <= tStart) {
        throw new Error('Plage horaire invalide.');
    }
    const ok = windows
        .filter((w) => w.dayOfWeek === dow)
        .some((w) => {
        const ws = toMinutes(w.startTime);
        const we = toMinutes(w.endTime);
        return !Number.isNaN(ws) && !Number.isNaN(we) && ws <= tStart && we >= tEnd;
    });
    if (!ok) {
        throw new Error("Ce créneau ne correspond pas aux disponibilités affichées par l'enseignant. Choisissez une autre date ou heure.");
    }
}
const appointmentInclude = {
    parent: {
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
        },
    },
    teacher: {
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true, email: true, phone: true },
            },
        },
    },
    student: {
        include: {
            user: {
                select: { id: true, firstName: true, lastName: true },
            },
            class: { select: { id: true, name: true, level: true } },
        },
    },
};
exports.appointmentInclude = appointmentInclude;
//# sourceMappingURL=parent-teacher-appointment.util.js.map