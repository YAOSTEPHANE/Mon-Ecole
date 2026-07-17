"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.punchStudentCourseAttendance = punchStudentCourseAttendance;
exports.punchStaffAttendance = punchStaffAttendance;
exports.punchTeacherCourseAttendance = punchTeacherCourseAttendance;
const prisma_1 = __importDefault(require("./prisma"));
const attendance_parent_notify_util_1 = require("./attendance-parent-notify.util");
const schedule_slot_util_1 = require("./schedule-slot.util");
function dayBounds(at) {
    const startOfDay = new Date(at);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    return { startOfDay, endOfDay };
}
function lateGraceMinutes() {
    const n = parseInt(process.env.ATTENDANCE_LATE_GRACE_MINUTES || '10', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 10;
}
function earlyCheckInMinutes() {
    const n = parseInt(process.env.ATTENDANCE_EARLY_CHECKIN_MINUTES || '20', 10);
    return Number.isFinite(n) ? Math.max(0, n) : 20;
}
async function punchStudentCourseAttendance(params) {
    const { studentId, courseId, teacherId, at, source } = params;
    const notifyParents = params.notifyParents !== false;
    const { startOfDay, endOfDay } = dayBounds(at);
    const slot = await (0, schedule_slot_util_1.findActiveScheduleSlotForCourse)(courseId, at, earlyCheckInMinutes());
    const grace = lateGraceMinutes();
    let existing = await prisma_1.default.absence.findFirst({
        where: { studentId, courseId, date: { gte: startOfDay, lt: endOfDay } },
    });
    if (!existing) {
        const status = params.forceStatus ??
            (slot ? (0, schedule_slot_util_1.resolveLateStatus)(at, slot.startTime, grace) : 'PRESENT');
        const lateMins = status === 'LATE' && slot
            ? (params.minutesLate ??
                Math.max(0, Math.round((at.getTime() - (0, schedule_slot_util_1.parseTimeOnDate)(slot.startTime, at).getTime()) / 60000)))
            : params.minutesLate ?? undefined;
        const created = await prisma_1.default.absence.create({
            data: {
                studentId,
                courseId,
                teacherId,
                date: at,
                status,
                excused: false,
                justificationDocuments: [],
                attendanceSource: source,
                minutesLate: lateMins ?? undefined,
                checkInAt: at,
                scheduleId: slot?.id,
            },
        });
        if (notifyParents) {
            void (0, attendance_parent_notify_util_1.notifyParentsOfStudentPunch)({
                studentId,
                courseId,
                absenceId: created.id,
                punchPhase: 'CHECK_IN',
                at,
                status: created.status,
                minutesLate: created.minutesLate,
            });
        }
        return { absence: created, punchPhase: 'CHECK_IN' };
    }
    if (!existing.checkInAt) {
        const status = params.forceStatus ??
            (slot ? (0, schedule_slot_util_1.resolveLateStatus)(at, slot.startTime, grace) : existing.status);
        const updated = await prisma_1.default.absence.update({
            where: { id: existing.id },
            data: {
                checkInAt: at,
                status,
                attendanceSource: source,
                scheduleId: slot?.id ?? existing.scheduleId,
                updatedAt: new Date(),
            },
        });
        if (notifyParents) {
            void (0, attendance_parent_notify_util_1.notifyParentsOfStudentPunch)({
                studentId,
                courseId,
                absenceId: updated.id,
                punchPhase: 'CHECK_IN',
                at,
                status: updated.status,
                minutesLate: updated.minutesLate,
            });
        }
        return { absence: updated, punchPhase: 'CHECK_IN' };
    }
    if (!existing.checkOutAt) {
        const updated = await prisma_1.default.absence.update({
            where: { id: existing.id },
            data: {
                checkOutAt: at,
                attendanceSource: source,
                updatedAt: new Date(),
            },
        });
        if (notifyParents) {
            void (0, attendance_parent_notify_util_1.notifyParentsOfStudentPunch)({
                studentId,
                courseId,
                absenceId: updated.id,
                punchPhase: 'CHECK_OUT',
                at,
                status: updated.status,
                minutesLate: updated.minutesLate,
            });
        }
        return { absence: updated, punchPhase: 'CHECK_OUT' };
    }
    return { absence: existing, punchPhase: 'ALREADY_COMPLETE' };
}
async function punchStaffAttendance(params) {
    const dateKey = (0, schedule_slot_util_1.toAttendanceDateKey)(params.at);
    let row = await prisma_1.default.staffAttendance.findUnique({
        where: {
            staffId_attendanceDate: { staffId: params.staffId, attendanceDate: dateKey },
        },
    });
    if (!row) {
        row = await prisma_1.default.staffAttendance.create({
            data: {
                staffId: params.staffId,
                attendanceDate: dateKey,
                status: 'PRESENT',
                source: params.source,
                checkInAt: params.at,
                recordedByUserId: params.recordedByUserId ?? undefined,
            },
        });
        return { attendance: row, punchPhase: 'CHECK_IN' };
    }
    if (!row.checkInAt) {
        row = await prisma_1.default.staffAttendance.update({
            where: { id: row.id },
            data: {
                checkInAt: params.at,
                status: 'PRESENT',
                source: params.source,
                recordedByUserId: params.recordedByUserId ?? undefined,
            },
        });
        return { attendance: row, punchPhase: 'CHECK_IN' };
    }
    if (!row.checkOutAt) {
        row = await prisma_1.default.staffAttendance.update({
            where: { id: row.id },
            data: {
                checkOutAt: params.at,
                source: params.source,
                recordedByUserId: params.recordedByUserId ?? undefined,
            },
        });
        return { attendance: row, punchPhase: 'CHECK_OUT' };
    }
    return { attendance: row, punchPhase: 'ALREADY_COMPLETE' };
}
async function punchTeacherCourseAttendance(params) {
    const slot = await (0, schedule_slot_util_1.findActiveScheduleSlotForTeacher)(params.teacherId, params.at, params.courseId, earlyCheckInMinutes());
    const courseId = params.courseId ?? slot?.courseId;
    if (!courseId) {
        const err = new Error('Aucun cours en cours : précisez courseId ou vérifiez l’emploi du temps de l’enseignant.');
        err.statusCode = 400;
        throw err;
    }
    const dateKey = (0, schedule_slot_util_1.toAttendanceDateKey)(params.at);
    const sessionKey = `${dateKey}:${courseId}`;
    const checkInAt = params.at;
    const plannedMinutes = slot
        ? (0, schedule_slot_util_1.durationMinutesFromHHMM)(slot.startTime, slot.endTime)
        : 55;
    const checkOutAt = slot
        ? (0, schedule_slot_util_1.scheduledCheckOutAt)(checkInAt, slot.endTime)
        : new Date(checkInAt.getTime() + plannedMinutes * 60000);
    const teachingMinutes = (0, schedule_slot_util_1.computeTeacherTeachingMinutes)(checkInAt, checkOutAt);
    const status = slot
        ? (0, schedule_slot_util_1.resolveLateStatus)(checkInAt, slot.startTime, lateGraceMinutes())
        : 'PRESENT';
    const existing = await prisma_1.default.teacherAttendance.findUnique({
        where: {
            teacherId_sessionKey: { teacherId: params.teacherId, sessionKey },
        },
    });
    if (existing?.checkInAt) {
        return {
            attendance: existing,
            punchPhase: 'ALREADY_COMPLETE',
            slot,
            courseId,
        };
    }
    const saved = await prisma_1.default.teacherAttendance.upsert({
        where: {
            teacherId_sessionKey: { teacherId: params.teacherId, sessionKey },
        },
        create: {
            teacherId: params.teacherId,
            sessionKey,
            attendanceDate: dateKey,
            courseId,
            scheduleId: slot?.id,
            status,
            source: params.source,
            recordedByUserId: params.recordedByUserId ?? undefined,
            checkInAt,
            checkOutAt,
            plannedMinutes,
            teachingMinutes,
        },
        update: {
            status,
            source: params.source,
            checkInAt,
            checkOutAt,
            plannedMinutes,
            teachingMinutes,
            scheduleId: slot?.id,
            recordedByUserId: params.recordedByUserId ?? undefined,
        },
        include: {
            teacher: {
                include: {
                    user: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });
    return {
        attendance: saved,
        punchPhase: 'CHECK_IN',
        slot,
        courseId,
    };
}
//# sourceMappingURL=attendance-punch.util.js.map