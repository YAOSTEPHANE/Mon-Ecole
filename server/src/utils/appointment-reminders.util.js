"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAppointmentReminders = runAppointmentReminders;
const prisma_1 = __importDefault(require("./prisma"));
const parent_teacher_appointment_util_1 = require("./parent-teacher-appointment.util");
const notify_important_util_1 = require("./notify-important.util");
/**
 * Notifications ~24 h et ~1 h avant le début des rendez-vous confirmés.
 * Fenêtres larges pour tolérer un cron toutes les 15–60 minutes.
 */
async function runAppointmentReminders() {
    const now = Date.now();
    const half24 = 25 * 60 * 1000;
    const target24 = now + 24 * 60 * 60 * 1000;
    const soon24Start = new Date(target24 - half24);
    const soon24End = new Date(target24 + half24);
    const half1 = 20 * 60 * 1000;
    const target1 = now + 60 * 60 * 1000;
    const soon1Start = new Date(target1 - half1);
    const soon1End = new Date(target1 + half1);
    const rows24 = await prisma_1.default.parentTeacherAppointment.findMany({
        where: {
            status: 'CONFIRMED',
            reminder24hSentAt: null,
            scheduledStart: { gte: soon24Start, lte: soon24End },
        },
        include: parent_teacher_appointment_util_1.appointmentInclude,
    });
    let reminded24h = 0;
    for (const apt of rows24) {
        if (!apt.teacher?.user || !apt.student?.user)
            continue;
        const parentUid = apt.parent.user.id;
        const teacherUid = apt.teacher.user.id;
        const st = [apt.student.user.firstName, apt.student.user.lastName].filter(Boolean).join(' ').trim();
        const when = apt.scheduledStart.toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        await (0, notify_important_util_1.notifyUsersImportant)([parentUid, teacherUid], {
            type: 'appointment',
            title: 'Rappel : rendez-vous bientôt',
            content: `Entretien parents-enseignants (${st || 'élève'}) dans environ 24 heures — le ${when}.`,
            email: undefined,
        });
        await prisma_1.default.parentTeacherAppointment.update({
            where: { id: apt.id },
            data: { reminder24hSentAt: new Date() },
        });
        reminded24h += 1;
    }
    const rows1 = await prisma_1.default.parentTeacherAppointment.findMany({
        where: {
            status: 'CONFIRMED',
            reminder1hSentAt: null,
            scheduledStart: { gte: soon1Start, lte: soon1End },
        },
        include: parent_teacher_appointment_util_1.appointmentInclude,
    });
    let reminded1h = 0;
    for (const apt of rows1) {
        if (!apt.teacher?.user || !apt.student?.user)
            continue;
        const parentUid = apt.parent.user.id;
        const teacherUid = apt.teacher.user.id;
        const st = [apt.student.user.firstName, apt.student.user.lastName].filter(Boolean).join(' ').trim();
        const when = apt.scheduledStart.toLocaleString('fr-FR', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
        await (0, notify_important_util_1.notifyUsersImportant)([parentUid, teacherUid], {
            type: 'appointment',
            title: 'Rappel : rendez-vous dans une heure',
            content: `Entretien parents-enseignants (${st || 'élève'}) vers ${when}.`,
            email: undefined,
        });
        await prisma_1.default.parentTeacherAppointment.update({
            where: { id: apt.id },
            data: { reminder1hSentAt: new Date() },
        });
        reminded1h += 1;
    }
    return { reminded24h, reminded1h };
}
//# sourceMappingURL=appointment-reminders.util.js.map