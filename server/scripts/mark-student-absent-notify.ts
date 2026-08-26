/**
 * Pointe un élève ABSENT et notifie les parents (e-mail Gmail si SMTP OK).
 * Usage: npx tsx scripts/mark-student-absent-notify.ts STU9OFNMP
 */
import 'dotenv/config';
import prisma from '../src/utils/prisma';
import {
  notifyParentsOfAttendanceChange,
  shouldNotifyParentsOnAttendanceChange,
} from '../src/utils/attendance-parent-notify.util';
import { isSmtpConfigured } from '../src/utils/email.util';

async function main() {
  const matricule = (process.argv[2] || 'STU9OFNMP').trim();
  console.log('SMTP configuré:', isSmtpConfigured());

  const student = await prisma.student.findFirst({
    where: { studentId: matricule },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      parents: {
        include: {
          parent: {
            include: {
              user: { select: { email: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });
  if (!student) throw new Error(`Élève introuvable: ${matricule}`);

  console.log(
    `Élève: ${student.user.firstName} ${student.user.lastName} (${student.studentId})`,
  );
  for (const link of student.parents) {
    console.log(
      `  Parent: ${link.parent.user.email} (notifyEmail=${link.parent.notifyEmail})`,
    );
  }

  let course =
    student.classId
      ? await prisma.course.findFirst({
          where: { classId: student.classId },
          include: { teacher: { select: { id: true } } },
        })
      : null;
  if (!course) {
    course = await prisma.course.findFirst({
      include: { teacher: { select: { id: true } } },
    });
  }
  if (!course?.teacherId) {
    throw new Error('Aucun cours avec enseignant trouvé pour créer l’absence');
  }

  const teacherId = course.teacherId;
  const now = new Date();

  const absence = await prisma.absence.create({
    data: {
      studentId: student.id,
      courseId: course.id,
      teacherId,
      date: now,
      status: 'ABSENT',
      excused: false,
      reason: 'Test notification parent Gmail',
      attendanceSource: 'MANUAL',
    },
    include: { course: { select: { name: true, code: true } } },
  });

  console.log(`Absence créée: ${absence.id}`);
  console.log(`Cours: ${absence.course.name} (${absence.course.code ?? '—'})`);
  console.log(
    `shouldNotify: ${shouldNotifyParentsOnAttendanceChange(absence.status, absence.excused)}`,
  );

  await notifyParentsOfAttendanceChange({
    studentId: student.id,
    status: absence.status,
    date: absence.date,
    courseName: absence.course.name,
    courseCode: absence.course.code,
  });

  await prisma.absence.update({
    where: { id: absence.id },
    data: { parentNotifiedAt: new Date() },
  });

  console.log('\nOK: notification parent déclenchée. Vérifie Gmail (et spam).');
}

main()
  .catch((e) => {
    console.error('ÉCHEC:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
