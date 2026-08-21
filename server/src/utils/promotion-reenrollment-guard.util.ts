import prisma from './prisma';
import {
  expectedLevelAfterPromotion,
  getNextAcademicYear,
  getPreviousAcademicYear,
  normalizeSchoolLevel,
  suggestParallelClassName,
} from './school-level-progression.util';

export type DestinationClassSuggestion = {
  id: string;
  name: string;
  level: string;
  academicYear: string;
  matchQuality: 'exact_name' | 'level_only' | 'none';
};

export async function findLatestPromotionDecision(
  studentId: string,
  forSourceAcademicYear?: string,
) {
  return prisma.studentPromotionDecision.findFirst({
    where: {
      studentId,
      ...(forSourceAcademicYear ? { academicYear: forSourceAcademicYear } : {}),
    },
    orderBy: [{ declaredAt: 'desc' }, { updatedAt: 'desc' }],
  });
}

export async function suggestDestinationClassForPromotion(params: {
  sourceClassId: string | null | undefined;
  sourceClassName?: string | null;
  sourceLevel?: string | null;
  decision: 'ADMIS' | 'DOUBLANT';
  targetAcademicYear: string;
  schoolId?: string | null;
}): Promise<{
  expectedLevel: string | null;
  endOfCycle: boolean;
  suggestion: DestinationClassSuggestion | null;
  candidates: DestinationClassSuggestion[];
}> {
  const expectedLevel = expectedLevelAfterPromotion(params.sourceLevel, params.decision);
  const endOfCycle = params.decision === 'ADMIS' && expectedLevel === null;

  if (endOfCycle || !expectedLevel) {
    return { expectedLevel, endOfCycle, suggestion: null, candidates: [] };
  }

  const classes = await prisma.class.findMany({
    where: {
      academicYear: params.targetAcademicYear,
      ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    },
    select: { id: true, name: true, level: true, academicYear: true },
    orderBy: { name: 'asc' },
  });

  const levelMatches = classes.filter(
    (c) => normalizeSchoolLevel(c.level) === normalizeSchoolLevel(expectedLevel),
  );

  const parallelName =
    params.sourceClassName && params.sourceLevel
      ? suggestParallelClassName(params.sourceClassName, params.sourceLevel, expectedLevel)
      : null;

  const exact =
    parallelName
      ? levelMatches.find((c) => c.name === parallelName)
      : undefined;

  const candidates: DestinationClassSuggestion[] = levelMatches.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    academicYear: c.academicYear,
    matchQuality: exact && c.id === exact.id ? 'exact_name' : 'level_only',
  }));

  const suggestion = exact
    ? {
        id: exact.id,
        name: exact.name,
        level: exact.level,
        academicYear: exact.academicYear,
        matchQuality: 'exact_name' as const,
      }
    : levelMatches.length === 1 && levelMatches[0]
      ? {
          id: levelMatches[0].id,
          name: levelMatches[0].name,
          level: levelMatches[0].level,
          academicYear: levelMatches[0].academicYear,
          matchQuality: 'level_only' as const,
        }
      : null;

  return { expectedLevel, endOfCycle, suggestion, candidates };
}

/**
 * Vérifie que la classe de réinscription respecte la décision Admis/Doublant.
 * Pas de décision enregistrée → pas de blocage (compatibilité).
 */
export async function assertReenrollmentMatchesPromotion(params: {
  studentId: string;
  toClassId: string;
  targetAcademicYear: string;
  allowOverride?: boolean;
}): Promise<{
  ok: true;
  promotionDecision: 'ADMIS' | 'DOUBLANT' | null;
  expectedLevel: string | null;
  warning?: string;
}> {
  if (params.allowOverride) {
    return { ok: true, promotionDecision: null, expectedLevel: null, warning: 'override' };
  }

  const sourceYear = getPreviousAcademicYear(params.targetAcademicYear);
  const decision = await findLatestPromotionDecision(params.studentId, sourceYear);

  if (!decision) {
    // Fallback: any decision on current/previous cycle
    const anyDecision = await findLatestPromotionDecision(params.studentId);
    if (!anyDecision) {
      return { ok: true, promotionDecision: null, expectedLevel: null };
    }
  }

  const promo = decision ?? (await findLatestPromotionDecision(params.studentId));
  if (!promo || (promo.decision !== 'ADMIS' && promo.decision !== 'DOUBLANT')) {
    return { ok: true, promotionDecision: null, expectedLevel: null };
  }

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: {
      class: { select: { id: true, name: true, level: true, academicYear: true, schoolId: true } },
    },
  });

  const sourceLevel =
    (promo.classId
      ? (
          await prisma.class.findUnique({
            where: { id: promo.classId },
            select: { level: true },
          })
        )?.level
      : null) || student?.class?.level;

  const expectedLevel = expectedLevelAfterPromotion(sourceLevel, promo.decision);
  const targetClass = await prisma.class.findUnique({
    where: { id: params.toClassId },
    select: { id: true, name: true, level: true, academicYear: true },
  });

  if (!targetClass) {
    throw Object.assign(new Error('Classe de destination introuvable'), { statusCode: 400 });
  }

  if (targetClass.academicYear !== params.targetAcademicYear) {
    throw Object.assign(
      new Error(
        `La classe « ${targetClass.name} » est en ${targetClass.academicYear}, pas en ${params.targetAcademicYear}.`,
      ),
      { statusCode: 400 },
    );
  }

  if (promo.decision === 'ADMIS' && expectedLevel === null) {
    throw Object.assign(
      new Error(
        'Élève admis en fin de cycle (Terminale) : réinscription en classe supérieure non applicable. Archivez ou diplômez l’élève.',
      ),
      { statusCode: 400 },
    );
  }

  if (
    expectedLevel &&
    normalizeSchoolLevel(targetClass.level) !== normalizeSchoolLevel(expectedLevel)
  ) {
    const label = promo.decision === 'ADMIS' ? 'admis(e)' : 'doublant(e)';
    throw Object.assign(
      new Error(
        `Décision ${label} : niveau attendu « ${expectedLevel} », mais la classe choisie est « ${targetClass.level} » (${targetClass.name}).`,
      ),
      { statusCode: 400 },
    );
  }

  return {
    ok: true,
    promotionDecision: promo.decision,
    expectedLevel,
  };
}

export async function resolveTargetYearClassesHint(params: {
  studentId: string;
  targetAcademicYear: string;
}) {
  const sourceYear = getPreviousAcademicYear(params.targetAcademicYear);
  const promo =
    (await findLatestPromotionDecision(params.studentId, sourceYear)) ??
    (await findLatestPromotionDecision(params.studentId));

  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: {
      class: { select: { id: true, name: true, level: true, schoolId: true } },
    },
  });

  if (!promo || (promo.decision !== 'ADMIS' && promo.decision !== 'DOUBLANT')) {
    return {
      promotionDecision: null as 'ADMIS' | 'DOUBLANT' | null,
      sourceAcademicYear: null as string | null,
      average: null as number | null,
      expectedLevel: student?.class?.level
        ? normalizeSchoolLevel(student.class.level)
        : null,
      endOfCycle: false,
      suggestion: null as DestinationClassSuggestion | null,
      candidates: [] as DestinationClassSuggestion[],
    };
  }

  const sourceClass = promo.classId
    ? await prisma.class.findUnique({
        where: { id: promo.classId },
        select: { id: true, name: true, level: true, schoolId: true },
      })
    : student?.class;

  const hint = await suggestDestinationClassForPromotion({
    sourceClassId: sourceClass?.id,
    sourceClassName: sourceClass?.name,
    sourceLevel: sourceClass?.level ?? student?.class?.level,
    decision: promo.decision,
    targetAcademicYear: params.targetAcademicYear,
    schoolId: sourceClass?.schoolId ?? student?.class?.schoolId,
  });

  return {
    promotionDecision: promo.decision,
    sourceAcademicYear: promo.academicYear,
    average: promo.average,
    ...hint,
  };
}

export { getNextAcademicYear, getPreviousAcademicYear };
