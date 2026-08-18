import prisma from './prisma';
import { fetchBrandingLogoDataUrl } from './image-data-url.util';
import { reportCardClientPhotoUrl } from './report-card-photo-url.util';
import {
  mentionsFromDisciplinaryCategory,
  mentionsFromOpinion,
  yearEndLabelFromPromotion,
  type CouncilOpinionRow,
} from './report-card-mentions.util';

export type CourseAverageEntry = { total: number; count: number; average: number };

export type TermHistoryEntry = {
  average: number;
  rank: number;
  byCourse: Record<string, { average: number; rank: number }>;
  bilanLettres?: { average: number; rank: number };
  bilanSciences?: { average: number; rank: number };
};

export type ReportCardTermHistory = {
  trim1?: TermHistoryEntry;
  trim2?: TermHistoryEntry;
  trim3?: TermHistoryEntry;
};

export type ReportCardClassStats = {
  periodAverage: number;
  periodMin: number;
  periodMax: number;
  annualAverage?: number;
  annualMin?: number;
  annualMax?: number;
};

const TRIMESTER_KEYS = ['trim1', 'trim2', 'trim3'] as const;

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Année scolaire courante (ex. 2025-2026 à partir de septembre 2025). */
export function getCurrentAcademicYear(reference = new Date()): string {
  const month = reference.getMonth();
  const year = reference.getFullYear();
  const startYear = month >= 8 ? year : year - 1;
  return `${startYear}-${startYear + 1}`;
}

/** Trimestre déduit d'une date dans une année scolaire donnée. */
export function inferReportingPeriod(date: Date, academicYear: string): string | null {
  for (const period of TRIMESTER_KEYS) {
    const { start, end } = getPeriodDates(period, academicYear);
    if (date >= start && date <= end) return period;
  }
  return null;
}

export function getPeriodDates(period: string, academicYear: string): { start: Date; end: Date } {
  const parts = academicYear.split('-').map(Number);
  const yearStart = parts[0];
  const yearEnd = parts[1] ?? yearStart + 1;
  let start: Date;
  let end: Date;

  switch (period) {
    case 'trim1':
      start = new Date(yearStart, 8, 1);
      end = endOfDay(new Date(yearStart, 10, 30));
      break;
    case 'trim2':
      start = new Date(yearStart, 11, 1);
      end = endOfDay(new Date(yearEnd, 1, 28));
      break;
    case 'trim3':
      start = new Date(yearEnd, 2, 1);
      end = endOfDay(new Date(yearEnd, 5, 30));
      break;
    case 'sem1':
      start = new Date(yearStart, 8, 1);
      end = endOfDay(new Date(yearEnd, 1, 28));
      break;
    case 'sem2':
      start = new Date(yearEnd, 2, 1);
      end = endOfDay(new Date(yearEnd, 5, 30));
      break;
    default:
      start = new Date(yearStart, 8, 1);
      end = endOfDay(new Date(yearEnd, 5, 30));
  }

  return { start, end };
}

/** Filtre Prisma : notes par dates de période OU rattachement explicite au trimestre. */
export function gradePeriodWhere(period: string, academicYear: string) {
  const { start, end } = getPeriodDates(period, academicYear);
  if (TRIMESTER_KEYS.includes(period as (typeof TRIMESTER_KEYS)[number])) {
    return {
      OR: [{ date: { gte: start, lte: end } }, { reportingPeriod: period }],
    };
  }
  return { date: { gte: start, lte: end } };
}

export function getPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    trim1: 'Trimestre 1',
    trim2: 'Trimestre 2',
    trim3: 'Trimestre 3',
    sem1: 'Semestre 1',
    sem2: 'Semestre 2',
  };
  return labels[period] || period;
}

/** Convertit un libellé stocké (« Trimestre 1 ») vers la clé PDF (`trim1`). */
export function toPeriodKey(period: string): string {
  const normalized = period.trim();
  const lower = normalized.toLowerCase();
  const fromLabel: Record<string, string> = {
    'trimestre 1': 'trim1',
    'trimestre 2': 'trim2',
    'trimestre 3': 'trim3',
    'semestre 1': 'sem1',
    'semestre 2': 'sem2',
    t1: 'trim1',
    t2: 'trim2',
    t3: 'trim3',
  };
  if (fromLabel[lower]) return fromLabel[lower];
  if (['trim1', 'trim2', 'trim3', 'sem1', 'sem2'].includes(lower)) return lower;
  return normalized;
}

/**
 * Moyenne générale période (même logique que la génération PDF / preview).
 */
export async function computeStudentBulletinAverage(
  studentId: string,
  classId: string,
  period: string,
  academicYear: string,
): Promise<number> {
  const [grades, classCourses] = await Promise.all([
    prisma.grade.findMany({
      where: {
        studentId,
        ...gradePeriodWhere(period, academicYear),
      },
    }),
    prisma.course.findMany({
      where: { classId },
      select: { id: true },
    }),
  ]);

  const courseAverages: Record<string, { total: number; count: number; average: number }> = {};

  grades.forEach((grade) => {
    const courseId = grade.courseId;
    if (!courseAverages[courseId]) {
      courseAverages[courseId] = { total: 0, count: 0, average: 0 };
    }
    const gradeOn20 = (grade.score / grade.maxScore) * 20;
    courseAverages[courseId].total += gradeOn20 * grade.coefficient;
    courseAverages[courseId].count += grade.coefficient;
  });

  Object.keys(courseAverages).forEach((courseId) => {
    const c = courseAverages[courseId];
    c.average = c.count > 0 ? c.total / c.count : 0;
  });

  classCourses.forEach((course) => {
    if (!courseAverages[course.id]) {
      courseAverages[course.id] = { total: 0, count: 0, average: 0 };
    }
  });

  let totalWeightedAverage = 0;
  let totalCoefficient = 0;
  Object.entries(courseAverages).forEach(([courseId, course]) => {
    const hasGrades = grades.some((g) => g.courseId === courseId);
    if (hasGrades && course.count > 0) {
      totalWeightedAverage += course.average * course.count;
      totalCoefficient += course.count;
    }
  });

  return totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;
}

export type ClassRankRow = { studentId: string; average: number; rank: number };

export async function computeClassBulletinRanks(
  classId: string,
  periodKey: string,
  academicYear: string
): Promise<{ periodLabel: string; periodDates: { start: Date; end: Date }; rows: ClassRankRow[] }> {
  const periodDates = getPeriodDates(periodKey, academicYear);
  const periodLabel = getPeriodLabel(periodKey);

  const students = await prisma.student.findMany({
    where: { classId },
    select: { id: true },
  });

  const withAvg = await Promise.all(
    students.map(async (s) => ({
      studentId: s.id,
      average: await computeStudentBulletinAverage(s.id, classId, periodKey, academicYear),
    }))
  );

  withAvg.sort((a, b) => b.average - a.average);
  const rows: ClassRankRow[] = withAvg.map((r, i) => ({
    studentId: r.studentId,
    average: r.average,
    rank: i + 1,
  }));

  return { periodLabel, periodDates, rows };
}

function computeCourseAveragesFromGrades(
  grades: Array<{ courseId: string; score: number; maxScore: number; coefficient: number }>,
  classCourseIds: string[],
): Record<string, CourseAverageEntry> {
  const courseAverages: Record<string, CourseAverageEntry> = {};

  grades.forEach((grade) => {
    const courseId = grade.courseId;
    if (!courseAverages[courseId]) {
      courseAverages[courseId] = { total: 0, count: 0, average: 0 };
    }
    const gradeOn20 = (grade.score / grade.maxScore) * 20;
    courseAverages[courseId].total += gradeOn20 * grade.coefficient;
    courseAverages[courseId].count += grade.coefficient;
  });

  Object.keys(courseAverages).forEach((courseId) => {
    const course = courseAverages[courseId];
    course.average = course.count > 0 ? course.total / course.count : 0;
  });

  classCourseIds.forEach((courseId) => {
    if (!courseAverages[courseId]) {
      courseAverages[courseId] = { total: 0, count: 0, average: 0 };
    }
  });

  return courseAverages;
}

function computeOverallFromCourseAverages(
  courseAverages: Record<string, CourseAverageEntry>,
  grades: Array<{ courseId: string }>,
): number {
  let totalWeightedAverage = 0;
  let totalCoefficient = 0;
  Object.entries(courseAverages).forEach(([courseId, course]) => {
    const hasGrades = grades.some((g) => g.courseId === courseId);
    if (hasGrades && course.count > 0) {
      totalWeightedAverage += course.average * course.count;
      totalCoefficient += course.count;
    }
  });
  return totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;
}

function rankByAverage(values: Array<{ id: string; average: number }>): Map<string, number> {
  const sorted = [...values].sort((a, b) => b.average - a.average);
  const ranks = new Map<string, number>();
  sorted.forEach((row, index) => ranks.set(row.id, index + 1));
  return ranks;
}

function rankCourseAverages(
  snapshots: Array<{ studentId: string; courseAverages: Record<string, CourseAverageEntry> }>,
  courseIds: string[],
): Map<string, Record<string, number>> {
  const result = new Map<string, Record<string, number>>();
  snapshots.forEach((s) => result.set(s.studentId, {}));

  courseIds.forEach((courseId) => {
    const rows = snapshots
      .map((s) => ({
        id: s.studentId,
        average: s.courseAverages[courseId]?.average ?? 0,
      }))
      .filter((r) => r.average > 0);
    const ranks = rankByAverage(rows);
    snapshots.forEach((s) => {
      const rank = ranks.get(s.studentId);
      if (rank !== undefined) {
        result.get(s.studentId)![courseId] = rank;
      }
    });
  });

  return result;
}

const TRIMESTER_PERIODS = ['trim1', 'trim2', 'trim3'] as const;

const BILAN_LETTRES_COURSE_MATCH = /français|francais|anglais|english|histoire|géographie|geographie|\bhg\b|lettres/i;
const BILAN_SCIENCES_COURSE_MATCH = /math|physique|chimie|svt|science/i;

function bilanAverageFromSnapshot(
  snap: { courseAverages: Record<string, CourseAverageEntry> },
  courses: Array<{ id: string; name: string }>,
  match: RegExp,
): number {
  const matchedIds = courses.filter((c) => match.test(c.name)).map((c) => c.id);
  const values = matchedIds
    .map((id) => snap.courseAverages[id]?.average ?? 0)
    .filter((v) => v > 0);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function rankBilanAverages(
  snapshots: Array<{ studentId: string; courseAverages: Record<string, CourseAverageEntry> }>,
  courses: Array<{ id: string; name: string }>,
  match: RegExp,
): Map<string, number> {
  const rows = snapshots
    .map((s) => ({
      id: s.studentId,
      average: bilanAverageFromSnapshot(s, courses, match),
    }))
    .filter((r) => r.average > 0);
  return rankByAverage(rows);
}

function conductPeriodLabel(period: (typeof TRIMESTER_PERIODS)[number]): string {
  const map: Record<(typeof TRIMESTER_PERIODS)[number], string> = {
    trim1: 'Trimestre 1',
    trim2: 'Trimestre 2',
    trim3: 'Trimestre 3',
  };
  return map[period];
}

/**
 * Enrichit les données bulletin avec historique trimestriel (T1/T2/T3), stats de classe et conduite.
 */
export async function enrichReportCardsWithTermHistory(
  classId: string,
  academicYear: string,
  activePeriod: string,
  reportCards: Array<{
    studentId: string;
    average?: number;
    rank?: number;
    termHistory?: ReportCardTermHistory;
    annualSummary?: { average: number; rank: number };
    classStats?: ReportCardClassStats;
    conduct?: { average: number; byTerm?: Record<string, number> };
  }>,
): Promise<void> {
  if (!TRIMESTER_PERIODS.includes(activePeriod as (typeof TRIMESTER_PERIODS)[number])) {
    return;
  }

  const classCourses = await prisma.course.findMany({
    where: { classId },
    select: { id: true, name: true },
  });
  const courseIds = classCourses.map((c) => c.id);
  const studentIds = reportCards.map((r) => r.studentId);

  type Snapshot = {
    studentId: string;
    courseAverages: Record<string, CourseAverageEntry>;
    overallAverage: number;
  };

  const termSnapshots: Record<(typeof TRIMESTER_PERIODS)[number], Snapshot[]> = {
    trim1: [],
    trim2: [],
    trim3: [],
  };

  for (const term of TRIMESTER_PERIODS) {
    const periodDates = getPeriodDates(term, academicYear);
    const snapshots: Snapshot[] = [];

    for (const studentId of studentIds) {
      const grades = await prisma.grade.findMany({
        where: {
          studentId,
          ...gradePeriodWhere(term, academicYear),
        },
        select: {
          courseId: true,
          score: true,
          maxScore: true,
          coefficient: true,
        },
      });
      const courseAverages = computeCourseAveragesFromGrades(grades, courseIds);
      snapshots.push({
        studentId,
        courseAverages,
        overallAverage: computeOverallFromCourseAverages(courseAverages, grades),
      });
    }

    termSnapshots[term] = snapshots;
  }

  const annualAverages = reportCards.map((card) => {
    const t1 = termSnapshots.trim1.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
    const t2 = termSnapshots.trim2.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
    const t3 = termSnapshots.trim3.find((s) => s.studentId === card.studentId)?.overallAverage ?? 0;
    const parts = [t1, t2, t3].filter((v) => v > 0);
    const average = parts.length > 0 ? parts.reduce((a, b) => a + b, 0) / parts.length : 0;
    return { studentId: card.studentId, average };
  });
  const annualRanks = rankByAverage(annualAverages.map((a) => ({ id: a.studentId, average: a.average })));

  const activeSnapshots = termSnapshots[activePeriod as (typeof TRIMESTER_PERIODS)[number]];
  const activeAverages = activeSnapshots.map((s) => ({ id: s.studentId, average: s.overallAverage }));
  const periodAverage =
    activeAverages.length > 0
      ? activeAverages.reduce((sum, row) => sum + row.average, 0) / activeAverages.length
      : 0;
  const periodMin = activeAverages.length > 0 ? Math.min(...activeAverages.map((r) => r.average)) : 0;
  const periodMax = activeAverages.length > 0 ? Math.max(...activeAverages.map((r) => r.average)) : 0;

  const annualValues = annualAverages.map((a) => a.average).filter((v) => v > 0);
  const annualClassAverage =
    annualValues.length > 0 ? annualValues.reduce((a, b) => a + b, 0) / annualValues.length : 0;
  const annualMin = annualValues.length > 0 ? Math.min(...annualValues) : 0;
  const annualMax = annualValues.length > 0 ? Math.max(...annualValues) : 0;

  const conducts = await prisma.conduct.findMany({
    where: {
      studentId: { in: studentIds },
      academicYear,
      period: { in: TRIMESTER_PERIODS.map(conductPeriodLabel) },
    },
    select: { studentId: true, period: true, average: true },
  });

  for (const card of reportCards) {
    const termHistory: ReportCardTermHistory = {};

    for (const term of TRIMESTER_PERIODS) {
      const snapshots = termSnapshots[term];
      const courseRanks = rankCourseAverages(snapshots, courseIds);
      const lettresRanks = rankBilanAverages(snapshots, classCourses, BILAN_LETTRES_COURSE_MATCH);
      const sciencesRanks = rankBilanAverages(snapshots, classCourses, BILAN_SCIENCES_COURSE_MATCH);
      const overallRanks = rankByAverage(
        snapshots.map((s) => ({ id: s.studentId, average: s.overallAverage })),
      );
      const snap = snapshots.find((s) => s.studentId === card.studentId);
      if (!snap) continue;

      const byCourse: Record<string, { average: number; rank: number }> = {};
      courseIds.forEach((courseId) => {
        const avg = snap.courseAverages[courseId]?.average ?? 0;
        const rank = courseRanks.get(card.studentId)?.[courseId];
        if (avg > 0 && rank !== undefined) {
          byCourse[courseId] = { average: avg, rank };
        }
      });

      const lettresAvg = bilanAverageFromSnapshot(snap, classCourses, BILAN_LETTRES_COURSE_MATCH);
      const sciencesAvg = bilanAverageFromSnapshot(snap, classCourses, BILAN_SCIENCES_COURSE_MATCH);
      const lettresRank = lettresRanks.get(card.studentId);
      const sciencesRank = sciencesRanks.get(card.studentId);

      termHistory[term] = {
        average: snap.overallAverage,
        rank: overallRanks.get(card.studentId) ?? 0,
        byCourse,
        ...(lettresAvg > 0 && lettresRank !== undefined
          ? { bilanLettres: { average: lettresAvg, rank: lettresRank } }
          : {}),
        ...(sciencesAvg > 0 && sciencesRank !== undefined
          ? { bilanSciences: { average: sciencesAvg, rank: sciencesRank } }
          : {}),
      };
    }

    card.termHistory = termHistory;
    const annualAvg = annualAverages.find((a) => a.studentId === card.studentId)?.average ?? 0;
    card.annualSummary = {
      average: annualAvg,
      rank: annualRanks.get(card.studentId) ?? 0,
    };
    card.classStats = {
      periodAverage,
      periodMin,
      periodMax,
      annualAverage: annualClassAverage,
      annualMin,
      annualMax,
    };

    const studentConducts = conducts.filter((c) => c.studentId === card.studentId);
    if (studentConducts.length > 0) {
      const byTerm: Record<string, number> = {};
      studentConducts.forEach((c) => {
        if (c.period.includes('1')) byTerm['trim1'] = c.average;
        else if (c.period.includes('2')) byTerm['trim2'] = c.average;
        else if (c.period.includes('3')) byTerm['trim3'] = c.average;
      });
      const activeConduct = studentConducts.find(
        (c) => c.period === conductPeriodLabel(activePeriod as (typeof TRIMESTER_PERIODS)[number]),
      );
      card.conduct = {
        average: activeConduct?.average ?? studentConducts[studentConducts.length - 1]?.average ?? 0,
        byTerm,
      };
    }
  }
}

export type OfficialReportCardStudent = {
  studentId: string;
  userId: string;
  studentIdNumber: string;
  gender: string;
  dateOfBirth: Date;
  birthPlace: string | null;
  repeating: boolean;
  address: string | null;
  user: { firstName: string; lastName: string; email: string; avatar: string | null };
  photoUrl: string | null;
  class: { name: string; level: string } | null;
  grades: Array<{
    courseId: string;
    title: string;
    score: number;
    maxScore: number;
    coefficient: number;
    date: Date;
    course?: { id: string; name: string; code: string | null };
  }>;
  courseAverages: Record<string, CourseAverageEntry>;
  allCourses: Array<{
    id: string;
    name: string;
    code: string;
    gradingCoefficient: number | null;
    teacherName?: string;
  }>;
  average: number;
  totalStudents: number;
  absences: { total: number; unexcused: number; excused: number; late: number };
  rank?: number;
  termHistory?: ReportCardTermHistory;
  annualSummary?: { average: number; rank: number };
  classStats?: ReportCardClassStats;
  conduct?: { average: number; byTerm?: Record<string, number> };
  distinctions?: string[];
  sanctions?: string[];
  yearEndDecision?: string;
};

export type OfficialReportCardPayload = {
  students: OfficialReportCardStudent[];
  logoDataUrl: string | null;
};

/**
 * Données bulletin officiel (même logique que GET /admin/report-cards/generate-data).
 */
export async function buildClassOfficialReportCards(params: {
  classId: string;
  period: string;
  academicYear: string;
  schoolId?: string | null;
}): Promise<OfficialReportCardPayload> {
  const periodKey = toPeriodKey(params.period);
  const periodDates = getPeriodDates(periodKey, params.academicYear);

  const students = await prisma.student.findMany({
    where: { classId: params.classId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      class: {
        select: {
          name: true,
          level: true,
        },
      },
    },
  });

  const classCourses = await prisma.course.findMany({
    where: { classId: params.classId },
    select: {
      id: true,
      name: true,
      code: true,
      gradingCoefficient: true,
      teacher: {
        select: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  const studentIds = students.map((s) => s.id);
  const photoIdentityDocs = await prisma.identityDocument.findMany({
    where: { studentId: { in: studentIds }, type: 'PHOTO_ID' },
    orderBy: { createdAt: 'desc' },
    select: { studentId: true, fileUrl: true },
  });
  const photoUrlByStudentId = new Map<string, string>();
  for (const doc of photoIdentityDocs) {
    if (!photoUrlByStudentId.has(doc.studentId)) {
      photoUrlByStudentId.set(doc.studentId, doc.fileUrl);
    }
  }

  const reportCardData: OfficialReportCardStudent[] = await Promise.all(
    students.map(async (student) => {
      const grades = await prisma.grade.findMany({
        where: {
          studentId: student.id,
          ...gradePeriodWhere(periodKey, params.academicYear),
        },
        include: {
          course: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      const courseAverages: Record<string, CourseAverageEntry> = {};
      grades.forEach((grade) => {
        const courseId = grade.courseId;
        const entry = courseAverages[courseId] ?? { total: 0, count: 0, average: 0 };
        const gradeOn20 = (grade.score / grade.maxScore) * 20;
        entry.total += gradeOn20 * grade.coefficient;
        entry.count += grade.coefficient;
        courseAverages[courseId] = entry;
      });

      Object.keys(courseAverages).forEach((courseId) => {
        const course = courseAverages[courseId];
        if (course) {
          course.average = course.count > 0 ? course.total / course.count : 0;
        }
      });

      classCourses.forEach((course) => {
        if (!courseAverages[course.id]) {
          courseAverages[course.id] = { total: 0, count: 0, average: 0 };
        }
      });

      let totalWeightedAverage = 0;
      let totalCoefficient = 0;
      Object.entries(courseAverages).forEach(([courseId, course]) => {
        const hasGrades = grades.some((g) => g.courseId === courseId);
        if (hasGrades && course.count > 0) {
          totalWeightedAverage += course.average * course.count;
          totalCoefficient += course.count;
        }
      });
      const overallAverage = totalCoefficient > 0 ? totalWeightedAverage / totalCoefficient : 0;

      const periodAbsences = await prisma.absence.findMany({
        where: {
          studentId: student.id,
          date: { gte: periodDates.start, lte: periodDates.end },
        },
        select: { status: true, excused: true },
      });
      const absences = {
        total: periodAbsences.filter((a) => a.status === 'ABSENT').length,
        unexcused: periodAbsences.filter((a) => a.status === 'ABSENT' && !a.excused).length,
        excused: periodAbsences.filter((a) => a.status === 'ABSENT' && a.excused).length,
        late: periodAbsences.filter((a) => a.status === 'LATE').length,
      };

      return {
        studentId: student.id,
        userId: student.userId,
        studentIdNumber: student.studentId,
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        birthPlace: student.birthPlace,
        repeating: student.isRepeating ?? false,
        address: student.address,
        user: student.user,
        photoUrl: reportCardClientPhotoUrl(
          student.user.avatar || photoUrlByStudentId.get(student.id) || null,
        ),
        class: student.class,
        grades,
        courseAverages,
        allCourses: classCourses.map((c) => ({
          id: c.id,
          name: c.name,
          code: c.code,
          gradingCoefficient: c.gradingCoefficient,
          teacherName: c.teacher?.user
            ? `${c.teacher.user.lastName} ${c.teacher.user.firstName}`.trim()
            : undefined,
        })),
        average: overallAverage,
        totalStudents: students.length,
        absences,
      };
    }),
  );

  reportCardData.sort((a, b) => b.average - a.average);
  reportCardData.forEach((student, index) => {
    student.rank = index + 1;
  });

  await enrichReportCardsWithTermHistory(
    params.classId,
    params.academicYear,
    periodKey,
    reportCardData,
  );

  await attachBulletinMentions(params.classId, periodKey, params.academicYear, reportCardData);

  const logoDataUrl = await fetchBrandingLogoDataUrl(params.schoolId);
  return { students: reportCardData, logoDataUrl };
}

async function attachBulletinMentions(
  classId: string,
  periodKey: string,
  academicYear: string,
  reportCards: OfficialReportCardStudent[],
): Promise<void> {
  const periodLabel = getPeriodLabel(periodKey);
  const periodValues = [...new Set([periodKey, periodLabel])];
  const studentIds = reportCards.map((row) => row.studentId);

  const [councils, disciplineRows, promotions] = await Promise.all([
    prisma.classCouncilSession.findMany({
      where: {
        classId,
        academicYear,
        period: { in: periodValues },
      },
      orderBy: { meetingDate: 'desc' },
      take: 8,
    }),
    prisma.studentDisciplinaryRecord.findMany({
      where: { studentId: { in: studentIds }, academicYear },
      select: { studentId: true, category: true, title: true, description: true },
    }),
    prisma.studentPromotionDecision.findMany({
      where: {
        studentId: { in: studentIds },
        academicYear,
        period: { in: periodValues },
      },
      select: { studentId: true, decision: true },
    }),
  ]);

  const opinionByStudent = new Map<string, CouncilOpinionRow>();
  const sortedCouncils = [...councils].sort((a, b) => {
    if (a.status === 'FINALIZED' && b.status !== 'FINALIZED') return -1;
    if (b.status === 'FINALIZED' && a.status !== 'FINALIZED') return 1;
    return 0;
  });
  for (const council of sortedCouncils) {
    const raw = council.studentOpinions;
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const row = item as CouncilOpinionRow;
      const id = typeof row.studentId === 'string' ? row.studentId : '';
      if (!id || opinionByStudent.has(id)) continue;
      opinionByStudent.set(id, row);
    }
  }

  const sanctionsByStudent = new Map<string, string[]>();
  for (const rec of disciplineRows) {
    const mapped = mentionsFromDisciplinaryCategory(
      rec.category,
      rec.title,
      rec.description ?? '',
    );
    if (!mapped.length) continue;
    const current = sanctionsByStudent.get(rec.studentId) ?? [];
    for (const label of mapped) {
      if (!current.includes(label)) current.push(label);
    }
    sanctionsByStudent.set(rec.studentId, current);
  }

  const promotionByStudent = new Map(promotions.map((row) => [row.studentId, row.decision]));

  for (const card of reportCards) {
    const fromCouncil = mentionsFromOpinion(opinionByStudent.get(card.studentId));
    const fromDiscipline = sanctionsByStudent.get(card.studentId) ?? [];
    card.distinctions = fromCouncil.distinctions;
    card.sanctions = [...new Set([...fromCouncil.sanctions, ...fromDiscipline])];
    card.yearEndDecision =
      fromCouncil.yearEndDecision ??
      yearEndLabelFromPromotion(promotionByStudent.get(card.studentId));
  }
}

async function resolveReportCardClassId(
  studentId: string,
  fallbackClassId: string | null | undefined,
  periodKey: string,
  academicYear: string,
): Promise<string | null> {
  if (fallbackClassId) return fallbackClassId;
  const grade = await prisma.grade.findFirst({
    where: {
      studentId,
      ...gradePeriodWhere(periodKey, academicYear),
    },
    select: { course: { select: { classId: true } } },
  });
  return grade?.course?.classId ?? null;
}

export type OfficialPublishedReportCard = {
  student: OfficialReportCardStudent;
  periodKey: string;
  periodLabel: string;
  academicYear: string;
  comments: string | null;
  logoDataUrl: string | null;
  reportCardId: string;
};

/**
 * Reconstruit le bulletin officiel publié d’un élève (parents / élèves).
 */
export async function getOfficialPublishedReportCard(params: {
  studentId: string;
  reportCardId: string;
  schoolId?: string | null;
}): Promise<{ ok: true; payload: OfficialPublishedReportCard } | { ok: false; status: number; error: string }> {
  const reportCard = await prisma.reportCard.findFirst({
    where: {
      id: params.reportCardId,
      studentId: params.studentId,
      published: true,
    },
  });
  if (!reportCard) {
    return { ok: false, status: 404, error: 'Bulletin introuvable ou non publié' };
  }

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: { classId: true, schoolId: true },
  });
  if (!student) {
    return { ok: false, status: 404, error: 'Élève introuvable' };
  }

  const periodKey = toPeriodKey(reportCard.period);
  const classId = await resolveReportCardClassId(
    params.studentId,
    student.classId,
    periodKey,
    reportCard.academicYear,
  );
  if (!classId) {
    return { ok: false, status: 400, error: 'Impossible de reconstruire le bulletin : classe introuvable' };
  }

  const { students, logoDataUrl } = await buildClassOfficialReportCards({
    classId,
    period: periodKey,
    academicYear: reportCard.academicYear,
    schoolId: params.schoolId ?? student.schoolId,
  });
  const officialStudent = students.find((row) => row.studentId === params.studentId);
  if (!officialStudent) {
    return { ok: false, status: 404, error: 'Impossible de reconstruire le bulletin pour cet élève' };
  }

  officialStudent.average = reportCard.average;
  if (typeof reportCard.rank === 'number') {
    officialStudent.rank = reportCard.rank;
  }

  return {
    ok: true,
    payload: {
      student: officialStudent,
      periodKey,
      periodLabel: getPeriodLabel(periodKey),
      academicYear: reportCard.academicYear,
      comments: reportCard.comments ?? null,
      logoDataUrl,
      reportCardId: reportCard.id,
    },
  };
}
