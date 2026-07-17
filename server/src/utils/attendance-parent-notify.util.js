"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldNotifyParentsOnAttendanceChange = shouldNotifyParentsOnAttendanceChange;
exports.notifyParentsOfStudentPunch = notifyParentsOfStudentPunch;
exports.notifyParentsOfAttendanceChange = notifyParentsOfAttendanceChange;
exports.notifyParentsForAbsenceById = notifyParentsForAbsenceById;
const prisma_1 = __importDefault(require("./prisma"));
const email_util_1 = require("./email.util");
const sms_util_1 = require("./sms.util");
const notify_important_util_1 = require("./notify-important.util");
function formatAttendanceStatusLabel(status) {
    switch (status) {
        case 'PRESENT':
            return 'présent(e)';
        case 'ABSENT':
            return 'absent(e)';
        case 'LATE':
            return 'en retard';
        case 'EXCUSED':
            return 'absent(e) justifié(e)';
        default:
            return String(status);
    }
}
/** Absence non justifiée ou retard : alerte famille pertinente (saisie manuelle / absence seule). */
function shouldNotifyParentsOnAttendanceChange(status, excused) {
    if (status === 'LATE')
        return true;
    if (status === 'ABSENT')
        return !excused;
    return false;
}
function punchEventLabel(punchPhase, status) {
    if (punchPhase === 'CHECK_OUT') {
        return 'sortie de cours enregistrée';
    }
    if (status === 'LATE')
        return 'entrée en cours (retard)';
    return 'entrée en cours enregistrée';
}
/**
 * Notification e-mail + SMS aux parents à chaque pointage élève (entrée ou sortie).
 */
async function notifyParentsOfStudentPunch(params) {
    const course = await prisma_1.default.course.findUnique({
        where: { id: params.courseId },
        select: { name: true, code: true },
    });
    if (!course)
        return;
    await notifyParentsOfAttendanceChange({
        studentId: params.studentId,
        status: params.status,
        date: params.at,
        courseName: course.name,
        courseCode: course.code,
        minutesLate: params.minutesLate,
        punchPhase: params.punchPhase,
    });
    await prisma_1.default.absence.update({
        where: { id: params.absenceId },
        data: { parentNotifiedAt: new Date() },
    });
}
/**
 * Envoie un e-mail et un SMS à chaque parent lié à l’élève (non bloquant pour l’API).
 * Désactiver avec NOTIFY_PARENTS_ON_ATTENDANCE=false.
 */
async function notifyParentsOfAttendanceChange(params) {
    if (process.env.NOTIFY_PARENTS_ON_ATTENDANCE?.trim() === 'false') {
        return;
    }
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: params.studentId },
            include: {
                user: { select: { firstName: true, lastName: true } },
                parents: {
                    include: {
                        parent: {
                            select: {
                                userId: true,
                                notifyEmail: true,
                                notifySms: true,
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!student?.parents?.length) {
            return;
        }
        const studentName = `${student.user.firstName} ${student.user.lastName}`;
        const dateStr = params.date.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const timeStr = params.date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
        const statusLabel = formatAttendanceStatusLabel(params.status);
        const courseLine = params.courseCode
            ? `${params.courseName} (${params.courseCode})`
            : params.courseName;
        const isPunch = params.punchPhase === 'CHECK_IN' || params.punchPhase === 'CHECK_OUT';
        const punchLabel = isPunch
            ? punchEventLabel(params.punchPhase, params.status)
            : null;
        const senderName = process.env.SCHOOL_NAME?.trim() || 'School Manager';
        const latePart = params.status === 'LATE' && params.minutesLate != null && params.minutesLate > 0
            ? ` (retard ~${params.minutesLate} min)`
            : '';
        const detailLine = params.status === 'LATE' && params.minutesLate != null && params.minutesLate > 0
            ? `Durée du retard estimée : ${params.minutesLate} minute(s).`
            : isPunch
                ? `Type de pointage : ${params.punchPhase === 'CHECK_IN' ? 'entrée' : 'sortie'}.`
                : undefined;
        const smsBody = isPunch
            ? `${senderName}: ${studentName} — ${punchLabel} pour « ${courseLine} » le ${dateStr} à ${timeStr}.`
            : `${senderName}: ${studentName} est enregistré(e) comme « ${statusLabel} »${latePart} pour « ${courseLine} » le ${dateStr}.`;
        const inAppTitle = isPunch
            ? `Pointage — ${studentName}`
            : `Présence — ${studentName}`;
        const inAppContent = isPunch
            ? `${punchLabel}. Cours : ${courseLine}. ${dateStr} à ${timeStr}.`
            : `Statut : ${statusLabel}${latePart}. Cours : ${courseLine}. ${dateStr} à ${timeStr}.`;
        const parentUserIds = student.parents.map((sp) => sp.parent.userId).filter(Boolean);
        if (parentUserIds.length > 0) {
            await (0, notify_important_util_1.notifyUsersImportant)(parentUserIds, {
                type: 'attendance_alert',
                title: inAppTitle,
                content: inAppContent,
                email: null,
                link: '/parent?tab=absences',
            });
        }
        const smsOnPunchAlways = process.env.NOTIFY_PARENTS_ON_PUNCH_SMS?.trim() !== 'opt_in_only';
        await Promise.allSettled(student.parents.map(async (sp) => {
            const u = sp.parent.user;
            const tasks = [];
            if (u.email?.trim() && sp.parent.notifyEmail !== false) {
                tasks.push((0, email_util_1.sendAttendanceNotificationEmail)({
                    to: u.email.trim(),
                    parentFirstName: u.firstName,
                    studentFullName: studentName,
                    statusLabel: isPunch ? (punchLabel ?? statusLabel) : statusLabel,
                    courseLine,
                    dateStr,
                    timeStr,
                    senderName,
                    detailLine,
                    punchPhase: params.punchPhase,
                }));
            }
            const rawPhone = u.phone?.trim();
            const allowSms = isPunch
                ? smsOnPunchAlways || sp.parent.notifySms
                : sp.parent.notifySms;
            if (rawPhone && allowSms) {
                const normalized = (0, sms_util_1.formatPhoneNumber)(rawPhone.replace(/\s/g, ''));
                if ((0, sms_util_1.isValidPhoneNumber)(rawPhone.replace(/\s/g, ''))) {
                    tasks.push((0, sms_util_1.sendSMS)(normalized, smsBody));
                }
            }
            await Promise.all(tasks);
        }));
    }
    catch (error) {
        console.error('notifyParentsOfAttendanceChange:', error);
    }
}
/**
 * Charge l’absence, envoie e-mail/SMS aux parents et met à jour `parentNotifiedAt`.
 */
async function notifyParentsForAbsenceById(absenceId) {
    const row = await prisma_1.default.absence.findUnique({
        where: { id: absenceId },
        include: { course: { select: { name: true, code: true } } },
    });
    if (!row?.course) {
        return { notified: false };
    }
    await notifyParentsOfAttendanceChange({
        studentId: row.studentId,
        status: row.status,
        date: row.date,
        courseName: row.course.name,
        courseCode: row.course.code,
        minutesLate: row.minutesLate,
    });
    await prisma_1.default.absence.update({
        where: { id: absenceId },
        data: { parentNotifiedAt: new Date() },
    });
    return { notified: true };
}
//# sourceMappingURL=attendance-parent-notify.util.js.map