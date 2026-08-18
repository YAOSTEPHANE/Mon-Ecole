import prisma from '../utils/prisma';

const REASONS = [
  'Maladie',
  'Rendez-vous médical',
  'Transport',
  'Raisons familiales',
  'Sans motif',
  'Convocation administrative',
];

function atTen(daysAgo: number): Date {
  const d = new Date();
  d.setHours(10, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function dayBounds(daysAgo: number): { gte: Date; lt: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { gte: start, lt: end };
}

async function createTestAbsences() {
  console.log('Création des absences élèves de test...\n');

  const students = await prisma.student.findMany({
    where: { isActive: true, classId: { not: null } },
    select: {
      id: true,
      classId: true,
      user: { select: { firstName: true, lastName: true } },
    },
    take: 80,
  });

  if (students.length === 0) {
    console.log('Aucun élève actif avec une classe. Créez des élèves d’abord.');
    return;
  }

  const courses = await prisma.course.findMany({
    select: { id: true, classId: true, teacherId: true },
  });

  if (courses.length === 0) {
    console.log('Aucun cours trouvé. Créez des cours (avec enseignant) d’abord.');
    return;
  }

  const courseByClass = new Map<string, { id: string; teacherId: string }>();
  for (const c of courses) {
    if (c.classId && !courseByClass.has(c.classId)) {
      courseByClass.set(c.classId, { id: c.id, teacherId: c.teacherId });
    }
  }
  const fallbackCourse = courses[0]!;

  let created = 0;
  let skipped = 0;

  for (let daysAgo = 0; daysAgo <= 6; daysAgo += 1) {
    const date = atTen(daysAgo);
    const bounds = dayBounds(daysAgo);

    for (let i = 0; i < students.length; i += 1) {
      const student = students[i]!;
      const course =
        (student.classId && courseByClass.get(student.classId)) || fallbackCourse;

      const existing = await prisma.absence.findFirst({
        where: {
          studentId: student.id,
          courseId: course.id,
          date: bounds,
        },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      // Aujourd’hui : ~1 élève sur 4 absent / justifié (liste du tableau de bord).
      // Jours précédents : mixte pour les KPI de présence.
      let status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      if (daysAgo === 0) {
        const slot = i % 5;
        if (slot === 0) status = 'ABSENT';
        else if (slot === 1) status = 'EXCUSED';
        else if (slot === 2) status = 'LATE';
        else status = 'PRESENT';
      } else {
        const slot = (i + daysAgo) % 6;
        if (slot === 0) status = 'ABSENT';
        else if (slot === 1) status = 'EXCUSED';
        else if (slot === 2) status = 'LATE';
        else status = 'PRESENT';
      }

      const absentLike = status === 'ABSENT' || status === 'EXCUSED';
      await prisma.absence.create({
        data: {
          studentId: student.id,
          courseId: course.id,
          teacherId: course.teacherId,
          date,
          status,
          reason: absentLike ? REASONS[(i + daysAgo) % REASONS.length] : null,
          excused: status === 'EXCUSED' || (status === 'ABSENT' && i % 3 === 0),
          hasMedicalCertificate: status === 'EXCUSED',
          minutesLate: status === 'LATE' ? 8 + (i % 20) : null,
          attendanceSource: 'MANUAL',
        },
      });
      created += 1;
      const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
      if (daysAgo === 0 && absentLike) {
        console.log(`  Aujourd’hui · ${status} · ${name || student.id}`);
      }
    }
  }

  console.log(`\n${created} absence(s) créée(s), ${skipped} déjà existante(s).`);
}

createTestAbsences()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
