import prisma from '../src/utils/prisma';

async function main() {
  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      OR: [
        { class: { level: { in: ['3ème', '3eme', 'Terminale', 'Tle', 'TLE'] } } },
        { user: { email: { in: ['student8@school.com', 'student9@school.com'] } } },
      ],
    },
    select: {
      id: true,
      studentId: true,
      class: { select: { name: true, level: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  });

  for (const s of students) {
    const grades = await prisma.grade.findMany({
      where: { studentId: s.id },
      select: {
        score: true,
        maxScore: true,
        evaluationType: true,
        title: true,
        date: true,
        course: { select: { name: true } },
      },
      orderBy: { date: 'desc' },
      take: 40,
    });
    const mockAttempts = await prisma.mockExamAttempt.findMany({
      where: { studentId: s.id },
      select: {
        scoreOn20: true,
        passed: true,
        submittedAt: true,
        mockExam: { select: { title: true, examKind: true, subject: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    const examGrades = grades.filter((g) => {
      const t = String(g.evaluationType || '').toUpperCase();
      return t.includes('EXAM') || t.includes('MOCK');
    });

    console.log('---');
    console.log(
      `${s.user.lastName} ${s.user.firstName} <${s.user.email}> | ${s.class?.name ?? '—'} (${s.class?.level ?? '—'}) | ${s.studentId}`
    );
    console.log(`Notes totales: ${grades.length} | dont type examen/mock: ${examGrades.length}`);
    console.log(`Tentatives examens blancs: ${mockAttempts.length}`);
    if (examGrades.length) {
      console.log('Notes examen:');
      for (const g of examGrades.slice(0, 10)) {
        console.log(
          `  - ${g.course?.name ?? '?'} | ${g.evaluationType} | ${g.title ?? ''} | ${g.score}/${g.maxScore ?? 20}`
        );
      }
    }
    if (mockAttempts.length) {
      console.log('Attempts mock:');
      for (const a of mockAttempts) {
        console.log(
          `  - ${a.mockExam.title} (${a.mockExam.examKind}) | ${a.scoreOn20 ?? '—'} /20 | soumis=${Boolean(a.submittedAt)}`
        );
      }
    }
    if (!examGrades.length && !mockAttempts.length && grades.length) {
      console.log('Autres notes (échantillon):');
      for (const g of grades.slice(0, 5)) {
        console.log(
          `  - ${g.course?.name ?? '?'} | ${g.evaluationType} | ${g.score}/${g.maxScore ?? 20}`
        );
      }
    }
    if (!grades.length && !mockAttempts.length) {
      console.log('Aucune note ni tentative d’examen blanc.');
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
