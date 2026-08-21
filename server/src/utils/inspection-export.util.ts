import prisma from './prisma';

export type InspectionExportFile = {
  name: string;
  contentType: string;
  content: string;
};

/**
 * Pack d’export type inspection / ministère : effectifs, enseignants, frais, absences.
 */
export async function buildInspectionExportPackage(options?: {
  schoolId?: string | null;
  academicYear?: string | null;
}): Promise<{ generatedAt: string; files: InspectionExportFile[] }> {
  const schoolFilter = options?.schoolId
    ? { OR: [{ schoolId: options.schoolId }, { schoolId: null }] }
    : {};

  const classes = await prisma.class.findMany({
    where: schoolFilter,
    include: {
      _count: { select: { students: true } },
      students: {
        where: { isActive: true, enrollmentStatus: { notIn: ['ARCHIVED', 'GRADUATED'] } },
        select: { id: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const effectifsLines = [
    'classe;niveau;effectif',
    ...classes.map(
      (c) =>
        `${csv(c.name)};${csv(c.level ?? '')};${c.students?.length ?? c._count.students}`,
    ),
  ];

  const teachers = await prisma.teacher.findMany({
    where: options?.schoolId
      ? {
          courses: {
            some: {
              class: {
                OR: [{ schoolId: options.schoolId }, { schoolId: null }],
              },
            },
          },
        }
      : {},
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
    take: 2000,
  });
  const teacherLines = [
    'nom;prenom;email;telephone',
    ...teachers.map(
      (t) =>
        `${csv(t.user.lastName)};${csv(t.user.firstName)};${csv(t.user.email)};${csv(t.user.phone ?? '')}`,
    ),
  ];

  const feeWhere: Record<string, unknown> = options?.schoolId
    ? { OR: [{ schoolId: options.schoolId }, { schoolId: null }] }
    : {};
  if (options?.academicYear) feeWhere.academicYear = options.academicYear;
  const fees = await prisma.tuitionFee.findMany({
    where: feeWhere,
    take: 5000,
    select: {
      period: true,
      academicYear: true,
      amount: true,
      isPaid: true,
      dueDate: true,
    },
  });
  const feeLines = [
    'periode;annee;montant;paye;echeance',
    ...fees.map(
      (f) =>
        `${csv(f.period)};${csv(f.academicYear)};${f.amount};${f.isPaid ? '1' : '0'};${f.dueDate.toISOString().slice(0, 10)}`,
    ),
  ];

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const absences = await prisma.absence.groupBy({
    by: ['status'],
    where: { date: { gte: since } },
    _count: { _all: true },
  });
  const absenceLines = [
    'statut;count_30j',
    ...absences.map((a) => `${csv(a.status)};${a._count._all}`),
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    schoolId: options?.schoolId ?? null,
    academicYear: options?.academicYear ?? null,
    classCount: classes.length,
    teacherCount: teachers.length,
    feeRows: fees.length,
    unpaidFees: fees.filter((f) => !f.isPaid).length,
  };

  return {
    generatedAt: summary.generatedAt,
    files: [
      {
        name: 'resume.json',
        contentType: 'application/json',
        content: JSON.stringify(summary, null, 2),
      },
      {
        name: 'effectifs.csv',
        contentType: 'text/csv',
        content: effectifsLines.join('\n'),
      },
      {
        name: 'enseignants.csv',
        contentType: 'text/csv',
        content: teacherLines.join('\n'),
      },
      {
        name: 'frais_scolarite.csv',
        contentType: 'text/csv',
        content: feeLines.join('\n'),
      },
      {
        name: 'absences_30j.csv',
        contentType: 'text/csv',
        content: absenceLines.join('\n'),
      },
    ],
  };
}

function csv(v: string): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return s.includes(';') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}
