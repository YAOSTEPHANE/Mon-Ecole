/**
 * Scoring « IA » règles métier (sans LLM) : risque scolaire multi-facteurs.
 * Score 0–100 (plus haut = plus à risque).
 */

export type RiskFactor = {
  code: string;
  label: string;
  points: number;
  detail: string;
};

export type StudentRiskScore = {
  studentId: string;
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  average20: number | null;
  unjustifiedAbsences: number;
  lateCount: number;
  unpaidAmount: number;
};

export function riskLevelFromScore(score: number): StudentRiskScore['level'] {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function computeStudentRiskScore(input: {
  studentId: string;
  average20: number | null;
  unjustifiedAbsences: number;
  lateCount: number;
  unpaidAmount: number;
  assignmentMissingRate?: number | null;
}): StudentRiskScore {
  const factors: RiskFactor[] = [];

  if (input.average20 != null) {
    if (input.average20 < 8) {
      factors.push({
        code: 'AVG_CRITICAL',
        label: 'Moyenne critique',
        points: 35,
        detail: `${input.average20.toFixed(1)}/20`,
      });
    } else if (input.average20 < 10) {
      factors.push({
        code: 'AVG_LOW',
        label: 'Moyenne insuffisante',
        points: 25,
        detail: `${input.average20.toFixed(1)}/20`,
      });
    } else if (input.average20 < 12) {
      factors.push({
        code: 'AVG_WATCH',
        label: 'Moyenne à surveiller',
        points: 12,
        detail: `${input.average20.toFixed(1)}/20`,
      });
    }
  }

  if (input.unjustifiedAbsences >= 8) {
    factors.push({
      code: 'ABS_HIGH',
      label: 'Absences non justifiées élevées',
      points: 30,
      detail: `${input.unjustifiedAbsences} absences`,
    });
  } else if (input.unjustifiedAbsences > 5) {
    factors.push({
      code: 'ABS_MED',
      label: 'Absences non justifiées',
      points: 20,
      detail: `${input.unjustifiedAbsences} absences`,
    });
  } else if (input.unjustifiedAbsences >= 3) {
    factors.push({
      code: 'ABS_LOW',
      label: 'Absences émergentes',
      points: 10,
      detail: `${input.unjustifiedAbsences} absences`,
    });
  }

  if (input.lateCount >= 6) {
    factors.push({
      code: 'LATE_HIGH',
      label: 'Retards fréquents',
      points: 15,
      detail: `${input.lateCount} retards`,
    });
  } else if (input.lateCount >= 3) {
    factors.push({
      code: 'LATE_MED',
      label: 'Retards',
      points: 8,
      detail: `${input.lateCount} retards`,
    });
  }

  if (input.unpaidAmount >= 100_000) {
    factors.push({
      code: 'FEE_HIGH',
      label: 'Impayés élevés',
      points: 15,
      detail: `${Math.round(input.unpaidAmount).toLocaleString('fr-FR')} FCFA`,
    });
  } else if (input.unpaidAmount >= 30_000) {
    factors.push({
      code: 'FEE_MED',
      label: 'Impayés',
      points: 8,
      detail: `${Math.round(input.unpaidAmount).toLocaleString('fr-FR')} FCFA`,
    });
  }

  if (input.assignmentMissingRate != null && input.assignmentMissingRate >= 0.4) {
    factors.push({
      code: 'HW_LOW',
      label: 'Devoirs non rendus',
      points: 12,
      detail: `${Math.round(input.assignmentMissingRate * 100)} % manquants`,
    });
  }

  const score = Math.min(
    100,
    factors.reduce((s, f) => s + f.points, 0)
  );

  return {
    studentId: input.studentId,
    score,
    level: riskLevelFromScore(score),
    factors,
    average20: input.average20,
    unjustifiedAbsences: input.unjustifiedAbsences,
    lateCount: input.lateCount,
    unpaidAmount: input.unpaidAmount,
  };
}

/** Room Jitsi déterministe pour une session virtuelle. */
export function buildJitsiMeetingUrl(sessionId: string, title?: string): string {
  const base = (process.env.JITSI_BASE_URL || 'https://meet.jit.si').replace(/\/$/, '');
  const slug = `ecole-${sessionId.slice(-8)}-${(title || 'cours')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24)}`;
  return `${base}/${slug}`;
}
