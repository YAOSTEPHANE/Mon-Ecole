import prisma from './prisma';
import {
  computeClassBulletinRanks,
  getPeriodLabel,
  gradePeriodWhere,
} from './report-card.util';
import { notifyParentsForStudent } from './parent-notify.util';
import {
  getNextAcademicYear,
  getNextSchoolLevel,
} from './school-level-progression.util';
import { suggestDestinationClassForPromotion } from './promotion-reenrollment-guard.util';

export type PromotionDecisionKind = 'ADMIS' | 'DOUBLANT';

export type PromotionPreviewRow = {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  classId: string | null;
  className: string;
  classLevel: string | null;
  average: number;
  rankInClass: number;
  gradeCount: number;
  decision: PromotionDecisionKind | 'SANS_NOTES';
  previousDecision?: PromotionDecisionKind | null;
  /** Niveau attendu l’année suivante (null = fin de cycle si Admis Terminale). */
  suggestedNextLevel?: string | null;
  suggestedTargetClassId?: string | null;
  suggestedTargetClassName?: string | null;
};

export type PromotionClassGroup = {
  classId: string;
  className: string;
  classLevel: string | null;
  nextLevel: string | null;
  admis: PromotionPreviewRow[];
  doublants: PromotionPreviewRow[];
  sansNotes: PromotionPreviewRow[];
  stats: { total: number; admis: number; doublants: number; sansNotes: number };
};

const DEFAULT_THRESHOLD = 10;
const DEFAULT_PERIOD = 'trim3';

function decide(
  average: number,
  gradeCount: number,
  threshold: number
): PromotionDecisionKind | 'SANS_NOTES' {
  if (gradeCount <= 0) return 'SANS_NOTES';
  return average >= threshold ? 'ADMIS' : 'DOUBLANT';
}

/**
 * Calcule les moyennes T3 (ou période fournie), trie par classe (moyenne décroissante)
 * et propose Admis (≥ seuil) / Doublant (< seuil).
 */
export async function previewPromotionDecisions(opts: {
  academicYear: string;
  period?: string;
  classId?: string;
  schoolId?: string;
  threshold?: number;
}): Promise<{
  academicYear: string;
  nextAcademicYear: string;
  period: string;
  periodLabel: string;
  threshold: number;
  groups: PromotionClassGroup[];
  totals: { total: number; admis: number; doublants: number; sansNotes: number };
}> {
  const period = opts.period || DEFAULT_PERIOD;
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD;
  const periodLabel = getPeriodLabel(period);
  const nextAcademicYear = getNextAcademicYear(opts.academicYear);

  const classes = await prisma.class.findMany({
    where: {
      academicYear: opts.academicYear,
      ...(opts.classId ? { id: opts.classId } : {}),
      ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: { id: true, name: true, level: true, schoolId: true },
    orderBy: [{ level: 'asc' }, { name: 'asc' }],
  });

  const existing = await prisma.studentPromotionDecision.findMany({
    where: {
      academicYear: opts.academicYear,
      period,
      ...(opts.classId ? { classId: opts.classId } : {}),
    },
    select: { studentId: true, decision: true },
  });
  const prevByStudent = new Map(existing.map((e) => [e.studentId, e.decision]));

  const groups: PromotionClassGroup[] = [];
  const totals = { total: 0, admis: 0, doublants: 0, sansNotes: 0 };

  for (const cls of classes) {
    const students = await prisma.student.findMany({
      where: { classId: cls.id, isActive: true },
      select: {
        id: true,
        studentId: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });
    if (students.length === 0) continue;

    const { rows } = await computeClassBulletinRanks(cls.id, period, opts.academicYear);
    const avgById = new Map(rows.map((r) => [r.studentId, r]));

    const gradeCounts = await Promise.all(
      students.map(async (s) => {
        const count = await prisma.grade.count({
          where: {
            studentId: s.id,
            ...gradePeriodWhere(period, opts.academicYear),
          },
        });
        return [s.id, count] as const;
      })
    );
    const countById = new Map(gradeCounts);

    const previewRows: PromotionPreviewRow[] = [];
    for (const s of students) {
      const rankRow = avgById.get(s.id);
      const average = rankRow?.average ?? 0;
      const gradeCount = countById.get(s.id) ?? 0;
      const decision = decide(average, gradeCount, threshold);
      let suggestedNextLevel: string | null = null;
      let suggestedTargetClassId: string | null = null;
      let suggestedTargetClassName: string | null = null;
      if (decision === 'ADMIS' || decision === 'DOUBLANT') {
        const hint = await suggestDestinationClassForPromotion({
          sourceClassId: cls.id,
          sourceClassName: cls.name,
          sourceLevel: cls.level,
          decision,
          targetAcademicYear: nextAcademicYear,
          schoolId: cls.schoolId ?? opts.schoolId,
        });
        suggestedNextLevel = hint.expectedLevel;
        suggestedTargetClassId = hint.suggestion?.id ?? null;
        suggestedTargetClassName = hint.suggestion?.name ?? null;
      }
      previewRows.push({
        studentId: s.id,
        studentCode: s.studentId,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        classId: cls.id,
        className: cls.name,
        classLevel: cls.level,
        average: Math.round(average * 100) / 100,
        rankInClass: rankRow?.rank ?? 0,
        gradeCount,
        decision,
        previousDecision: prevByStudent.get(s.id) ?? null,
        suggestedNextLevel,
        suggestedTargetClassId,
        suggestedTargetClassName,
      });
    }

    previewRows.sort((a, b) => {
      if (a.decision === 'SANS_NOTES' && b.decision !== 'SANS_NOTES') return 1;
      if (b.decision === 'SANS_NOTES' && a.decision !== 'SANS_NOTES') return -1;
      return b.average - a.average;
    });

    // Re-rank among evaluated students only
    let rank = 0;
    for (const row of previewRows) {
      if (row.decision !== 'SANS_NOTES') {
        rank += 1;
        row.rankInClass = rank;
      } else {
        row.rankInClass = 0;
      }
    }

    const admis = previewRows.filter((r) => r.decision === 'ADMIS');
    const doublants = previewRows.filter((r) => r.decision === 'DOUBLANT');
    const sansNotes = previewRows.filter((r) => r.decision === 'SANS_NOTES');

    totals.total += previewRows.length;
    totals.admis += admis.length;
    totals.doublants += doublants.length;
    totals.sansNotes += sansNotes.length;

    groups.push({
      classId: cls.id,
      className: cls.name,
      classLevel: cls.level,
      nextLevel: getNextSchoolLevel(cls.level),
      admis,
      doublants,
      sansNotes,
      stats: {
        total: previewRows.length,
        admis: admis.length,
        doublants: doublants.length,
        sansNotes: sansNotes.length,
      },
    });
  }

  return {
    academicYear: opts.academicYear,
    nextAcademicYear,
    period,
    periodLabel,
    threshold,
    groups,
    totals,
  };
}

/**
 * Enregistre les décisions Admis / Doublant et met à jour `Student.isRepeating`.
 * Les élèves sans notes sont ignorés sauf `includeSansNotesAsDoublant`.
 */
export async function declarePromotionDecisions(opts: {
  academicYear: string;
  period?: string;
  classId?: string;
  schoolId?: string;
  threshold?: number;
  declaredById?: string;
  notifyParents?: boolean;
  includeSansNotesAsDoublant?: boolean;
}): Promise<{
  declared: number;
  admis: number;
  doublants: number;
  skippedSansNotes: number;
}> {
  const preview = await previewPromotionDecisions(opts);
  const threshold = preview.threshold;
  const period = preview.period;
  let declared = 0;
  let admis = 0;
  let doublants = 0;
  let skippedSansNotes = 0;

  for (const group of preview.groups) {
    const rows = [
      ...group.admis,
      ...group.doublants,
      ...(opts.includeSansNotesAsDoublant ? group.sansNotes.map((r) => ({ ...r, decision: 'DOUBLANT' as const })) : []),
    ];
    if (!opts.includeSansNotesAsDoublant) {
      skippedSansNotes += group.sansNotes.length;
    }

    for (const row of rows) {
      if (row.decision !== 'ADMIS' && row.decision !== 'DOUBLANT') continue;
      const isDoublant = row.decision === 'DOUBLANT';

      await prisma.studentPromotionDecision.upsert({
        where: {
          studentId_academicYear_period: {
            studentId: row.studentId,
            academicYear: opts.academicYear,
            period,
          },
        },
        create: {
          studentId: row.studentId,
          classId: row.classId,
          academicYear: opts.academicYear,
          period,
          average: row.average,
          rankInClass: row.rankInClass || null,
          decision: row.decision,
          threshold,
          declaredById: opts.declaredById ?? null,
        },
        update: {
          classId: row.classId,
          average: row.average,
          rankInClass: row.rankInClass || null,
          decision: row.decision,
          threshold,
          declaredById: opts.declaredById ?? null,
          declaredAt: new Date(),
        },
      });

      await prisma.student.update({
        where: { id: row.studentId },
        data: { isRepeating: isDoublant },
      });

      declared += 1;
      if (isDoublant) doublants += 1;
      else admis += 1;

      if (opts.notifyParents) {
        try {
          await notifyParentsForStudent(row.studentId, {
            type: 'GENERAL',
            title: isDoublant ? 'Décision : redoublement' : 'Décision : admis(e)',
            content: isDoublant
              ? `Suite au ${preview.periodLabel} (${opts.academicYear}), moyenne ${row.average.toFixed(2)}/20 — décision : doublant.`
              : `Suite au ${preview.periodLabel} (${opts.academicYear}), moyenne ${row.average.toFixed(2)}/20 — décision : admis(e).`,
            link: '/parent?tab=grades',
          });
        } catch (e) {
          console.error('notify promotion:', e);
        }
      }
    }
  }

  return { declared, admis, doublants, skippedSansNotes };
}
