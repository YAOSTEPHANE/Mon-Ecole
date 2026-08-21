/** Progression des niveaux collège / lycée (ordre croissant). */
export const SCHOOL_LEVEL_LADDER = [
  '6ème',
  '5ème',
  '4ème',
  '3ème',
  '2nde',
  '1ère',
  'Terminale',
] as const;

const LEVEL_ALIASES: Record<string, string> = {
  '6eme': '6ème',
  '6e': '6ème',
  '5eme': '5ème',
  '5e': '5ème',
  '4eme': '4ème',
  '4e': '4ème',
  '3eme': '3ème',
  '3e': '3ème',
  seconde: '2nde',
  '2nde': '2nde',
  '2de': '2nde',
  premiere: '1ère',
  '1ere': '1ère',
  '1re': '1ère',
  '1ère': '1ère',
  terminale: 'Terminale',
  tle: 'Terminale',
};

export function normalizeSchoolLevel(level: string | null | undefined): string {
  const raw = (level ?? '').trim();
  if (!raw) return '';
  const key = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');
  if (LEVEL_ALIASES[key]) return LEVEL_ALIASES[key];
  // Match canonical labels case-insensitively
  const found = SCHOOL_LEVEL_LADDER.find(
    (l) =>
      l.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ===
      raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
  );
  return found ?? raw;
}

/** Niveau suivant ; `null` si fin de cycle (ex. Terminale) ou niveau inconnu hors échelle. */
export function getNextSchoolLevel(level: string | null | undefined): string | null {
  const norm = normalizeSchoolLevel(level);
  if (!norm) return null;
  const idx = SCHOOL_LEVEL_LADDER.indexOf(norm as (typeof SCHOOL_LEVEL_LADDER)[number]);
  if (idx < 0) return null;
  if (idx >= SCHOOL_LEVEL_LADDER.length - 1) return null;
  return SCHOOL_LEVEL_LADDER[idx + 1] ?? null;
}

/** Année scolaire suivante : `2025-2026` → `2026-2027`. */
export function getNextAcademicYear(academicYear: string): string {
  const parts = academicYear.split('-').map((p) => Number(p.trim()));
  const start = parts[0];
  if (!Number.isFinite(start)) {
    throw new Error(`Année scolaire invalide : ${academicYear}`);
  }
  return `${start + 1}-${start + 2}`;
}

/** Année scolaire précédente : `2026-2027` → `2025-2026`. */
export function getPreviousAcademicYear(academicYear: string): string {
  const parts = academicYear.split('-').map((p) => Number(p.trim()));
  const start = parts[0];
  if (!Number.isFinite(start)) {
    throw new Error(`Année scolaire invalide : ${academicYear}`);
  }
  return `${start - 1}-${start}`;
}

/**
 * Niveau attendu après une décision de promo pour une réinscription N+1.
 * ADMIS → niveau suivant (null = fin de cycle) ; DOUBLANT → même niveau.
 */
export function expectedLevelAfterPromotion(
  currentLevel: string | null | undefined,
  decision: 'ADMIS' | 'DOUBLANT',
): string | null {
  const current = normalizeSchoolLevel(currentLevel);
  if (decision === 'DOUBLANT') return current || null;
  return getNextSchoolLevel(current);
}

/** Propose un nom de classe parallèle en remplaçant le niveau dans le libellé. */
export function suggestParallelClassName(
  sourceName: string,
  fromLevel: string,
  toLevel: string,
): string {
  const from = normalizeSchoolLevel(fromLevel);
  const to = normalizeSchoolLevel(toLevel);
  if (!from || !to || from === to) return sourceName;
  if (sourceName.includes(from)) return sourceName.split(from).join(to);
  const fromPlain = from.replace('ème', 'eme').replace('ère', 'ere');
  if (sourceName.toLowerCase().includes(fromPlain.toLowerCase())) {
    return sourceName.replace(new RegExp(fromPlain, 'i'), to);
  }
  return sourceName;
}
