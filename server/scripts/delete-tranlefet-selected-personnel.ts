/**
 * Supprime uniquement :
 * - personnel support : D.E, secrétaire, économe (pas le bibliothécaire ni les autres)
 * - tous les éducateurs
 * - tous les enseignants
 * - l'élève Soan Kouame
 *
 * Usage: npx tsx scripts/delete-tranlefet-selected-personnel.ts [--confirm]
 */
import dotenv from 'dotenv';
import type { Prisma } from '@prisma/client';
import { SupportStaffKind } from '@prisma/client';
import prisma from '../src/utils/prisma';
import { deleteStoredUploadUrl } from '../src/utils/upload-persist.util';

dotenv.config();

const STAFF_SUPPORT_KINDS_TO_DELETE: SupportStaffKind[] = [
  'STUDIES_DIRECTOR',
  'SECRETARY',
  'BURSAR',
];

async function reassignDirectReportsBeforeDelete(
  tx: Prisma.TransactionClient,
  staffId: string,
  newManagerId: string | null,
) {
  await tx.staffMember.updateMany({
    where: { managerId: staffId },
    data: { managerId: newManagerId },
  });
}

async function deleteStaffMember(staffId: string): Promise<void> {
  const staff = await prisma.staffMember.findUnique({ where: { id: staffId } });
  if (!staff) return;

  await prisma.$transaction(
    async (tx) => {
    await reassignDirectReportsBeforeDelete(tx, staff.id, staff.managerId);
    await tx.staffAttendance.deleteMany({ where: { staffId: staff.id } });
    await tx.staffMember.delete({ where: { id: staff.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: staff.userId } });
    await tx.pushSubscription.deleteMany({ where: { userId: staff.userId } });
    await tx.schoolMember.deleteMany({ where: { userId: staff.userId } });
    await tx.user.update({
      where: { id: staff.userId },
      data: {
        email: `deleted-staff-${staff.id}-${Date.now()}@deleted.local`,
        firstName: 'Personnel',
        lastName: 'supprimé',
        phone: null,
        avatar: null,
        isActive: false,
      },
    });
  });
}

async function deleteEducator(educatorId: string): Promise<void> {
  const educator = await prisma.educator.findUnique({ where: { id: educatorId } });
  if (!educator) return;

  await prisma.$transaction(
    async (tx) => {
    await tx.educatorClassAssignment.deleteMany({ where: { educatorId: educator.id } });
    await tx.educator.delete({ where: { id: educator.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: educator.userId } });
    await tx.pushSubscription.deleteMany({ where: { userId: educator.userId } });
    await tx.schoolMember.deleteMany({ where: { userId: educator.userId } });
    await tx.user.update({
      where: { id: educator.userId },
      data: {
        email: `deleted-educator-${educator.id}-${Date.now()}@deleted.local`,
        firstName: 'Éducateur',
        lastName: 'supprimé',
        phone: null,
        avatar: null,
        isActive: false,
      },
    });
  });
}

async function deleteTeacher(teacherId: string): Promise<void> {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return;

  const adminDocs = await prisma.$transaction(
    async (tx) => {
    const assignments = await tx.assignment.findMany({
      where: { teacherId },
      select: { id: true },
    });
    if (assignments.length > 0) {
      await tx.studentAssignment.deleteMany({
        where: { assignmentId: { in: assignments.map((a) => a.id) } },
      });
    }
    await tx.assignment.deleteMany({ where: { teacherId } });
    await tx.grade.deleteMany({ where: { teacherId } });
    await tx.absence.deleteMany({ where: { teacherId } });

    const courses = await tx.course.findMany({
      where: { teacherId },
      select: { id: true },
    });
    if (courses.length > 0) {
      const courseIds = courses.map((c) => c.id);
      const elearningCourses = await tx.elearningCourse.findMany({
        where: {
          OR: [{ teacherId }, { courseId: { in: courseIds } }],
        },
        select: { id: true },
      });
      const elearningCourseIds = elearningCourses.map((c) => c.id);
      if (elearningCourseIds.length > 0) {
        const lessons = await tx.elearningLesson.findMany({
          where: { elearningCourseId: { in: elearningCourseIds } },
          select: { id: true },
        });
        const lessonIds = lessons.map((l) => l.id);
        if (lessonIds.length > 0) {
          const quizzes = await tx.elearningQuiz.findMany({
            where: { lessonId: { in: lessonIds } },
            select: { id: true },
          });
          const quizIds = quizzes.map((q) => q.id);
          if (quizIds.length > 0) {
            await tx.elearningQuizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
            await tx.elearningQuizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
            await tx.elearningQuiz.deleteMany({ where: { id: { in: quizIds } } });
          }
          await tx.elearningLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
          await tx.elearningLesson.deleteMany({ where: { id: { in: lessonIds } } });
        }
        await tx.virtualClassSession.deleteMany({
          where: { elearningCourseId: { in: elearningCourseIds } },
        });
        await tx.elearningCourse.deleteMany({ where: { id: { in: elearningCourseIds } } });
      }

      await tx.virtualClassSession.deleteMany({
        where: {
          OR: [{ teacherId }, { courseId: { in: courseIds } }],
        },
      });
      await tx.schedule.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.grade.deleteMany({ where: { courseId: { in: courseIds } } });
      await tx.absence.deleteMany({ where: { courseId: { in: courseIds } } });
    }

    await tx.course.deleteMany({ where: { teacherId } });
    await tx.class.updateMany({ where: { teacherId }, data: { teacherId: null } });
    await tx.schedule.updateMany({
      where: { substituteTeacherId: teacherId },
      data: { substituteTeacherId: null, replacementNote: null },
    });
    await tx.virtualClassSession.deleteMany({ where: { teacherId } });
    await tx.pedagogicalResourceBank.deleteMany({ where: { createdByTeacherId: teacherId } });

    const remainingElearningCourses = await tx.elearningCourse.findMany({
      where: { teacherId },
      select: { id: true },
    });
    const remainingElearningCourseIds = remainingElearningCourses.map((c) => c.id);
    if (remainingElearningCourseIds.length > 0) {
      const lessons = await tx.elearningLesson.findMany({
        where: { elearningCourseId: { in: remainingElearningCourseIds } },
        select: { id: true },
      });
      const lessonIds = lessons.map((l) => l.id);
      if (lessonIds.length > 0) {
        const quizzes = await tx.elearningQuiz.findMany({
          where: { lessonId: { in: lessonIds } },
          select: { id: true },
        });
        const quizIds = quizzes.map((q) => q.id);
        if (quizIds.length > 0) {
          await tx.elearningQuizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
          await tx.elearningQuizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
          await tx.elearningQuiz.deleteMany({ where: { id: { in: quizIds } } });
        }
        await tx.elearningLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
        await tx.elearningLesson.deleteMany({ where: { id: { in: lessonIds } } });
      }
      await tx.virtualClassSession.deleteMany({
        where: { elearningCourseId: { in: remainingElearningCourseIds } },
      });
      await tx.elearningCourse.deleteMany({ where: { id: { in: remainingElearningCourseIds } } });
    }

    await tx.teacherLeave.deleteMany({ where: { teacherId } });
    await tx.teacherPerformanceReview.deleteMany({ where: { teacherId } });
    await tx.parentTeacherAppointment.deleteMany({ where: { teacherId } });
    await tx.teacherAttendance.deleteMany({ where: { teacherId } });
    await tx.teacherScheduleAvailabilitySlot.deleteMany({ where: { teacherId } });

    const adminDocs = await tx.teacherAdministrativeDocument.findMany({ where: { teacherId } });
    await tx.teacherAdministrativeDocument.deleteMany({ where: { teacherId } });
    await tx.teacherQualification.deleteMany({ where: { teacherId } });
    await tx.teacherCareerHistory.deleteMany({ where: { teacherId } });
    await tx.teacherProfessionalTraining.deleteMany({ where: { teacherId } });
    await tx.teacher.delete({ where: { id: teacherId } });

    await tx.passwordResetToken.deleteMany({ where: { userId: teacher.userId } });
    await tx.pushSubscription.deleteMany({ where: { userId: teacher.userId } });
    await tx.schoolMember.deleteMany({ where: { userId: teacher.userId } });
    await tx.user.update({
      where: { id: teacher.userId },
      data: {
        email: `deleted-teacher-${teacher.id}-${Date.now()}@deleted.local`,
        firstName: 'Professeur',
        lastName: 'supprimé',
        phone: null,
        avatar: null,
        isActive: false,
      },
    });
    return adminDocs;
  }, { maxWait: 10_000, timeout: 120_000 });

  for (const d of adminDocs) {
    await deleteStoredUploadUrl(d.fileUrl).catch(() => undefined);
  }
}

async function deleteStudent(studentId: string): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { user: true },
  });
  if (!student) return;

  const identityDocsToDelete = await prisma.identityDocument.findMany({
    where: { studentId },
    select: { fileUrl: true },
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.studentParent.deleteMany({ where: { studentId } });
      await tx.studentPickupAuthorization.deleteMany({ where: { studentId } });
      await tx.parentConsent.deleteMany({ where: { studentId } });
      await tx.absence.deleteMany({ where: { studentId } });
      await tx.grade.deleteMany({ where: { studentId } });
      await tx.studentAssignment.deleteMany({ where: { studentId } });
      await tx.elearningQuizAttempt.deleteMany({ where: { studentId } });
      await tx.elearningLessonProgress.deleteMany({ where: { studentId } });
      await tx.parentTeacherAppointment.deleteMany({ where: { studentId } });
      await tx.reportCard.deleteMany({ where: { studentId } });
      await tx.conduct.deleteMany({ where: { studentId } });
      await tx.studentDisciplinaryRecord.deleteMany({ where: { studentId } });
      await tx.extracurricularRegistration.deleteMany({ where: { studentId } });
      await tx.studentOrientationFollowUp.deleteMany({ where: { studentId } });
      await tx.studentOrientationPlacement.deleteMany({ where: { studentId } });
      await tx.studentSubjectOption.deleteMany({ where: { studentId } });
      await tx.staffModuleRecord.updateMany({ where: { studentId }, data: { studentId: null } });
      await tx.healthEmergencyLog.updateMany({ where: { studentId }, data: { studentId: null } });
      await tx.studentHealthDossier.deleteMany({ where: { studentId } });
      await tx.studentVaccination.deleteMany({ where: { studentId } });
      await tx.studentAllergyRecord.deleteMany({ where: { studentId } });
      await tx.studentTreatment.deleteMany({ where: { studentId } });
      await tx.infirmaryVisit.deleteMany({ where: { studentId } });
      await tx.healthCampaignParticipation.deleteMany({ where: { studentId } });
      await tx.payment.deleteMany({ where: { studentId } });
      await tx.tuitionFee.deleteMany({ where: { studentId } });
      await tx.identityDocument.deleteMany({ where: { studentId } });
      await tx.studentSchoolHistory.deleteMany({ where: { studentId } });
      await tx.studentTransfer.deleteMany({ where: { studentId } });
      await tx.conduct.deleteMany({ where: { studentId } });
      await tx.student.delete({ where: { id: studentId } });
      await tx.passwordResetToken.deleteMany({ where: { userId: student.userId } });
      await tx.pushSubscription.deleteMany({ where: { userId: student.userId } });
      await tx.schoolMember.deleteMany({ where: { userId: student.userId } });
      await tx.user.update({
        where: { id: student.userId },
        data: {
          email: `deleted-student-${student.id}-${Date.now()}@deleted.local`,
          firstName: 'Élève',
          lastName: 'supprimé',
          phone: null,
          avatar: null,
          isActive: false,
        },
      });
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  for (const d of identityDocsToDelete) {
    await deleteStoredUploadUrl(d.fileUrl).catch(() => undefined);
  }
}

async function findTargets() {
  const staff = await prisma.staffMember.findMany({
    where: {
      supportKind: { in: STAFF_SUPPORT_KINDS_TO_DELETE },
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const educators = await prisma.educator.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const teachers = await prisma.teacher.findMany({
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const students = await prisma.student.findMany({
    where: {
      OR: [
        { studentId: 'CPTB-SOAN-001' },
        {
          user: {
            AND: [
              { firstName: { equals: 'Soan', mode: 'insensitive' } },
              { lastName: { contains: 'KOUAME', mode: 'insensitive' } },
            ],
          },
        },
      ],
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return { staff, educators, teachers, students };
}

function labelPerson(firstName: string, lastName: string, email: string) {
  return `${lastName} ${firstName} <${email}>`;
}

async function main() {
  const confirmed = process.argv.includes('--confirm');
  const { staff, educators, teachers, students } = await findTargets();

  console.log('Cibles identifiées :\n');
  console.log(`Personnel support (${staff.length}) :`);
  for (const s of staff) {
    console.log(
      `  - [${s.supportKind}] ${labelPerson(s.user.firstName, s.user.lastName, s.user.email)} (${s.jobTitle ?? '—'})`,
    );
  }
  console.log(`\nÉducateurs (${educators.length}) :`);
  for (const e of educators) {
    console.log(`  - ${labelPerson(e.user.firstName, e.user.lastName, e.user.email)}`);
  }
  console.log(`\nEnseignants (${teachers.length}) :`);
  for (const t of teachers) {
    console.log(`  - ${labelPerson(t.user.firstName, t.user.lastName, t.user.email)}`);
  }
  console.log(`\nÉlève Soan Kouame (${students.length}) :`);
  for (const st of students) {
    console.log(
      `  - ${labelPerson(st.user.firstName, st.user.lastName, st.user.email)} (matricule ${st.studentId})`,
    );
  }

  if (!confirmed) {
    console.log('\nAperçu seulement — relancez avec --confirm pour supprimer.');
    return;
  }

  console.log('\nSuppression en cours…\n');

  for (const s of staff) {
    await deleteStaffMember(s.id);
    console.log(`  ✓ personnel ${s.user.lastName} ${s.user.firstName}`);
  }
  for (const e of educators) {
    await deleteEducator(e.id);
    console.log(`  ✓ éducateur ${e.user.lastName} ${e.user.firstName}`);
  }
  for (const t of teachers) {
    await deleteTeacher(t.id);
    console.log(`  ✓ enseignant ${t.user.lastName} ${t.user.firstName}`);
  }
  for (const st of students) {
    await deleteStudent(st.id);
    console.log(`  ✓ élève ${st.user.lastName} ${st.user.firstName}`);
  }

  console.log('\nTerminé.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
