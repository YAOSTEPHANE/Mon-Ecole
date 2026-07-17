"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toAttendanceDateKey = void 0;
exports.parseAttendanceStatus = parseAttendanceStatus;
exports.upsertTeacherAttendance = upsertTeacherAttendance;
const attendance_punch_util_1 = require("./attendance-punch.util");
const schedule_slot_util_1 = require("./schedule-slot.util");
Object.defineProperty(exports, "toAttendanceDateKey", { enumerable: true, get: function () { return schedule_slot_util_1.toAttendanceDateKey; } });
const STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];
function parseAttendanceStatus(raw, fallback = 'PRESENT') {
    if (typeof raw === 'string' && STATUSES.includes(raw)) {
        return raw;
    }
    return fallback;
}
/** Pointage enseignant : 1er pointage = arrivée ; fin = heure de fin du créneau EDT ; heures = intervalle entre les deux. */
async function upsertTeacherAttendance(params) {
    const result = await (0, attendance_punch_util_1.punchTeacherCourseAttendance)({
        teacherId: params.teacherId,
        at: params.date,
        source: params.source,
        courseId: params.courseId,
        recordedByUserId: params.recordedByUserId,
    });
    return result.attendance;
}
//# sourceMappingURL=teacher-attendance.util.js.map