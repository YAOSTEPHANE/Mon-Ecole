"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeFacePunch = executeFacePunch;
const prisma_1 = __importDefault(require("./prisma"));
const attendance_punch_util_1 = require("./attendance-punch.util");
async function executeFacePunch(params) {
    const at = params.at ?? new Date();
    const { match } = params;
    if (match.personType === 'STUDENT') {
        if (!params.courseId) {
            throw Object.assign(new Error('courseId est requis pour le pointage élève.'), { status: 400 });
        }
        const course = await prisma_1.default.course.findUnique({
            where: { id: params.courseId },
            select: { id: true, teacherId: true, name: true, code: true },
        });
        if (!course) {
            throw Object.assign(new Error('Cours non trouvé'), { status: 404 });
        }
        const punch = await (0, attendance_punch_util_1.punchStudentCourseAttendance)({
            studentId: match.personId,
            courseId: course.id,
            teacherId: course.teacherId,
            at,
            source: 'FACE',
            notifyParents: params.notifyParents !== false,
        });
        const phaseLabel = punch.punchPhase === 'CHECK_IN'
            ? 'Entrée enregistrée'
            : punch.punchPhase === 'CHECK_OUT'
                ? 'Sortie enregistrée'
                : 'Pointage déjà complet';
        return {
            success: true,
            message: `${phaseLabel} — ${match.displayName}`,
            personType: 'STUDENT',
            punchPhase: punch.punchPhase,
            match,
            data: {
                course: { id: course.id, name: course.name, code: course.code },
                absence: punch.absence,
            },
        };
    }
    if (match.personType === 'STAFF') {
        const punch = await (0, attendance_punch_util_1.punchStaffAttendance)({
            staffId: match.personId,
            at,
            source: 'FACE',
        });
        const phaseLabel = punch.punchPhase === 'CHECK_IN'
            ? 'Entrée enregistrée'
            : punch.punchPhase === 'CHECK_OUT'
                ? 'Sortie enregistrée'
                : 'Pointage déjà complet';
        return {
            success: true,
            message: `${phaseLabel} — ${match.displayName}`,
            personType: 'STAFF',
            punchPhase: punch.punchPhase,
            match,
            data: { attendance: punch.attendance },
        };
    }
    const punch = await (0, attendance_punch_util_1.punchTeacherCourseAttendance)({
        teacherId: match.personId,
        at,
        source: 'FACE',
        courseId: params.courseId,
        recordedByUserId: params.recordedByUserId,
    });
    const checkout = punch.attendance.checkOutAt;
    const checkoutLabel = checkout
        ? `${String(checkout.getHours()).padStart(2, '0')}:${String(checkout.getMinutes()).padStart(2, '0')}`
        : '—';
    return {
        success: true,
        message: `Pointage enregistré — fin de séance prévue à ${checkoutLabel}`,
        personType: 'TEACHER',
        punchPhase: punch.punchPhase,
        match,
        data: {
            attendance: punch.attendance,
            courseId: punch.courseId,
            schedule: punch.slot,
        },
    };
}
//# sourceMappingURL=face-punch.util.js.map