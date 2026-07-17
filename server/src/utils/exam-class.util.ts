/**
 * Classes d’examen : niveaux préparant un examen officiel (BEPC / BAC).
 */

export const EXAM_CLASS_LEVELS = ['3ème', '3eme', 'Terminale', 'Tle', 'TLE'] as const;

export type ExamClassLevel = (typeof EXAM_CLASS_LEVELS)[number];

/** Normalise un libellé de niveau pour comparaison (minuscules, sans accents). */
export function normalizeLevelLabel(level: string | null | undefined): string {
  return (level || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .trim();
}

const EXAM_LEVEL_ALIASES: Record<string, '3ème' | 'Terminale'> = {
  '3eme': '3ème',
  '3ème': '3ème',
  'troisieme': '3ème',
  '3e': '3ème',
  terminale: 'Terminale',
  tle: 'Terminale',
  tl: 'Terminale',
  'terminale-a': 'Terminale',
  'terminale-c': 'Terminale',
  'terminale-d': 'Terminale',
};

/** Indique si un niveau de classe est une classe d’examen. */
export function isExamClassLevel(level: string | null | undefined): boolean {
  const n = normalizeLevelLabel(level);
  return n in EXAM_LEVEL_ALIASES || n.startsWith('terminale') || n === '3eme' || n === '3e';
}

/** Canonicalise vers 3ème ou Terminale si reconnu. */
export function canonicalExamLevel(level: string | null | undefined): '3ème' | 'Terminale' | null {
  const n = normalizeLevelLabel(level);
  if (EXAM_LEVEL_ALIASES[n]) return EXAM_LEVEL_ALIASES[n];
  if (n.startsWith('terminale') || n.startsWith('tle')) return 'Terminale';
  if (n === '3eme' || n === '3e' || n.includes('troisieme')) return '3ème';
  return null;
}

export function defaultExamKindForLevel(level: string | null | undefined): 'BEPC' | 'BAC' | 'OTHER' {
  const c = canonicalExamLevel(level);
  if (c === '3ème') return 'BEPC';
  if (c === 'Terminale') return 'BAC';
  return 'OTHER';
}

/** L’élève peut passer un examen blanc ciblant ces niveaux / cette classe. */
export function studentMatchesMockExamTarget(opts: {
  studentClassId: string | null | undefined;
  studentLevel: string | null | undefined;
  examClassId: string | null | undefined;
  examTargetLevels: string[];
}): boolean {
  if (opts.examClassId) {
    return Boolean(opts.studentClassId && opts.studentClassId === opts.examClassId);
  }
  if (!opts.examTargetLevels.length) {
    return isExamClassLevel(opts.studentLevel);
  }
  const studentCanon = canonicalExamLevel(opts.studentLevel);
  const studentNorm = normalizeLevelLabel(opts.studentLevel);
  return opts.examTargetLevels.some((t) => {
    const tc = canonicalExamLevel(t);
    if (studentCanon && tc && studentCanon === tc) return true;
    return normalizeLevelLabel(t) === studentNorm;
  });
}
