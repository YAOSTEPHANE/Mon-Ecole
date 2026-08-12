import prisma from './prisma';
import { notifyParentsOfAttendanceChange } from './attendance-parent-notify.util';
import { notifyParentWhatsApp } from './whatsapp.util';
import { formatPhoneNumber, isValidPhoneNumber } from './sms.util';

export type AbsenceReminderRunResult = {
  studentsChecked: number;
  remindersSent: number;
  skippedAlreadyNotified: number;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Relance automatique des parents pour absences non justifiées du jour (e-mail, SMS, WhatsApp, notification app).
 */
export async function runAutomaticAbsenceReminders(options?: {
  minHoursSinceRecord?: number;
}): Promise<AbsenceReminderRunResult> {
  const minHours = options?.minHoursSinceRecord ?? 2;
  const since = new Date(Date.now() - minHours * 60 * 60 * 1000);
  const today = startOfToday();

  const absences = await prisma.absence.findMany({
    where: {
      date: { gte: today },
      status: 'ABSENT',
      excused: false,
      OR: [{ parentNotifiedAt: null }, { parentNotifiedAt: { lt: since } }],
    },
    include: {
      course: { select: { name: true, code: true } },
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
          parents: {
            include: {
              parent: {
                include: {
                  user: { select: { phone: true } },
                },
              },
            },
          },
        },
      },
    },
    take: 200,
  });

  const result: AbsenceReminderRunResult = {
    studentsChecked: absences.length,
    remindersSent: 0,
    skippedAlreadyNotified: 0,
  };

  for (const abs of absences) {
    if (abs.parentNotifiedAt && abs.parentNotifiedAt >= since) {
      result.skippedAlreadyNotified++;
      continue;
    }
    if (!abs.course) continue;

    await notifyParentsOfAttendanceChange({
      studentId: abs.studentId,
      status: abs.status,
      date: abs.date,
      courseName: abs.course.name,
      courseCode: abs.course.code,
      minutesLate: abs.minutesLate,
    });

    const studentName = `${abs.student.user.firstName} ${abs.student.user.lastName}`.trim();
    const title = 'Rappel — absence non justifiée';
    const content = `${studentName} est absent(e) aujourd'hui (${abs.course.name}). Merci de nous contacter ou de transmettre un justificatif.`;

    for (const link of abs.student.parents) {
      const phone = link.parent.user.phone?.trim();
      if (phone && isValidPhoneNumber(phone.replace(/\s/g, ''))) {
        try {
          await notifyParentWhatsApp(formatPhoneNumber(phone.replace(/\s/g, '')), title, content);
        } catch (e) {
          console.error('[Relances absence] whatsapp:', e);
        }
      }
    }

    await prisma.absence.update({
      where: { id: abs.id },
      data: { parentNotifiedAt: new Date() },
    });
    result.remindersSent++;
  }

  return result;
}
