export const REPORT_CARD_DISTINCTION_OPTIONS = [
  "Tableau d'honneur + Félicitation",
  "Tableau d'honneur + Encouragements",
  "Tableau d'honneur",
] as const;

export const REPORT_CARD_SANCTION_OPTIONS = [
  'Avertissement travail',
  'Avertissement conduite',
  'Blâme travail',
  'Blâme conduite',
] as const;

export type ReportCardDistinction = (typeof REPORT_CARD_DISTINCTION_OPTIONS)[number];
export type ReportCardSanction = (typeof REPORT_CARD_SANCTION_OPTIONS)[number];

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function normalizeMentionText(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/['’`]/g, ' ')
    .replace(/[^a-z0-9+ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function knownDistinction(value: string): ReportCardDistinction | null {
  const n = normalizeMentionText(value);
  const found = REPORT_CARD_DISTINCTION_OPTIONS.find((opt) => normalizeMentionText(opt) === n);
  return found ?? null;
}

function knownSanction(value: string): ReportCardSanction | null {
  const n = normalizeMentionText(value);
  const found = REPORT_CARD_SANCTION_OPTIONS.find((opt) => normalizeMentionText(opt) === n);
  return found ?? null;
}

/** Interprète une décision libre du conseil de classe vers les cases du bulletin. */
export function mentionsFromCouncilText(raw: string | null | undefined): {
  distinctions: string[];
  sanctions: string[];
} {
  const n = normalizeMentionText(raw ?? '');
  if (!n) return { distinctions: [], sanctions: [] };

  const exactDistinction = knownDistinction(raw ?? '');
  const exactSanction = knownSanction(raw ?? '');
  if (exactDistinction) return { distinctions: [exactDistinction], sanctions: [] };
  if (exactSanction) return { distinctions: [], sanctions: [exactSanction] };

  const distinctions: string[] = [];
  const sanctions: string[] = [];

  if (n.includes('felicitation')) {
    distinctions.push(REPORT_CARD_DISTINCTION_OPTIONS[0]);
  } else if (n.includes('encouragement')) {
    distinctions.push(REPORT_CARD_DISTINCTION_OPTIONS[1]);
  } else if (n.includes('tableau d honneur') || n.includes('tableau dhonneur') || n === 'th') {
    distinctions.push(REPORT_CARD_DISTINCTION_OPTIONS[2]);
  }

  const hasAvertissement = n.includes('avertissement');
  const hasBlame = n.includes('blame');
  const hasConduite = n.includes('conduite');
  const hasTravail = n.includes('travail');

  if (hasAvertissement && hasConduite) sanctions.push(REPORT_CARD_SANCTION_OPTIONS[1]);
  if (hasAvertissement && hasTravail) sanctions.push(REPORT_CARD_SANCTION_OPTIONS[0]);
  if (hasAvertissement && !hasConduite && !hasTravail) {
    sanctions.push(REPORT_CARD_SANCTION_OPTIONS[0]);
  }
  if (hasBlame && hasConduite) sanctions.push(REPORT_CARD_SANCTION_OPTIONS[3]);
  if (hasBlame && hasTravail) sanctions.push(REPORT_CARD_SANCTION_OPTIONS[2]);
  if (hasBlame && !hasConduite && !hasTravail) {
    sanctions.push(REPORT_CARD_SANCTION_OPTIONS[2]);
  }

  return { distinctions, sanctions };
}

export type CouncilOpinionRow = {
  studentId?: unknown;
  councilDecision?: unknown;
  distinctions?: unknown;
  sanctions?: unknown;
  yearEndDecision?: unknown;
};

export function mentionsFromOpinion(opinion: CouncilOpinionRow | null | undefined): {
  distinctions: string[];
  sanctions: string[];
  yearEndDecision?: string;
} {
  if (!opinion) return { distinctions: [], sanctions: [] };

  const fromArrays = {
    distinctions: Array.isArray(opinion.distinctions)
      ? opinion.distinctions
          .map((item) => (typeof item === 'string' ? knownDistinction(item) : null))
          .filter((item): item is ReportCardDistinction => Boolean(item))
      : [],
    sanctions: Array.isArray(opinion.sanctions)
      ? opinion.sanctions
          .map((item) => (typeof item === 'string' ? knownSanction(item) : null))
          .filter((item): item is ReportCardSanction => Boolean(item))
      : [],
  };

  const fromText =
    typeof opinion.councilDecision === 'string'
      ? mentionsFromCouncilText(opinion.councilDecision)
      : { distinctions: [], sanctions: [] };

  const yearEndDecision =
    typeof opinion.yearEndDecision === 'string' && opinion.yearEndDecision.trim()
      ? opinion.yearEndDecision.trim()
      : undefined;

  return {
    distinctions: fromArrays.distinctions.length ? fromArrays.distinctions : fromText.distinctions,
    sanctions: fromArrays.sanctions.length ? fromArrays.sanctions : fromText.sanctions,
    yearEndDecision,
  };
}

export function mentionsFromDisciplinaryCategory(
  category: string,
  title: string,
  description: string,
): string[] {
  const haystack = normalizeMentionText(`${title} ${description}`);
  const conduite = haystack.includes('conduite') || haystack.includes('discipline') || haystack.includes('comportement');
  if (category === 'VERBAL_WARNING' || category === 'WRITTEN_WARNING') {
    return [conduite ? REPORT_CARD_SANCTION_OPTIONS[1] : REPORT_CARD_SANCTION_OPTIONS[0]];
  }
  if (category === 'REPRIMAND') {
    return [conduite ? REPORT_CARD_SANCTION_OPTIONS[3] : REPORT_CARD_SANCTION_OPTIONS[2]];
  }
  return [];
}

export function yearEndLabelFromPromotion(decision: string | null | undefined): string | undefined {
  if (decision === 'ADMIS') return 'Admis';
  if (decision === 'DOUBLANT') return 'Redouble';
  return undefined;
}
