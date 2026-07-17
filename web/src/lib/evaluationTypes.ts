export const EVALUATION_TYPE_OPTIONS = [
  { value: 'EXAM', label: 'Examen' },
  { value: 'EVALUATION', label: 'Évaluation' },
  { value: 'HOME_EXERCISE', label: 'Exercice de maison' },
  { value: 'LEVEL_HOMEWORK', label: 'Devoir de niveau' },
  { value: 'CLASS_HOMEWORK', label: 'Devoir de classe' },
  { value: 'ORAL', label: 'Oral' },
  { value: 'MOCK_EXAM', label: 'Examen blanc' },
] as const;

export type EvaluationTypeValue = (typeof EVALUATION_TYPE_OPTIONS)[number]['value'];

const LEGACY_EVALUATION_LABELS: Record<string, string> = {
  QUIZ: 'Évaluation',
  PROJECT: 'Exercice de maison',
  HOMEWORK: 'Devoir maison',
};

const LABEL_BY_VALUE = Object.fromEntries(
  EVALUATION_TYPE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<EvaluationTypeValue, string>;

export function getEvaluationTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Évaluation';
  if (type in LABEL_BY_VALUE) return LABEL_BY_VALUE[type as EvaluationTypeValue];
  return LEGACY_EVALUATION_LABELS[type] ?? type;
}

/** Mappe les anciennes valeurs vers les nouveaux types pour édition de notes existantes. */
export function normalizeEvaluationType(type: string | null | undefined): EvaluationTypeValue {
  if (!type) return 'EXAM';
  const legacyMap: Record<string, EvaluationTypeValue> = {
    QUIZ: 'EVALUATION',
    PROJECT: 'HOME_EXERCISE',
    HOMEWORK: 'CLASS_HOMEWORK',
  };
  if (legacyMap[type]) return legacyMap[type];
  if ((EVALUATION_TYPE_OPTIONS as readonly { value: string }[]).some((o) => o.value === type)) {
    return type as EvaluationTypeValue;
  }
  return 'EXAM';
}

export function getEvaluationBadgeVariant(
  type: string,
): 'danger' | 'warning' | 'info' | 'success' | 'default' {
  switch (type) {
    case 'EXAM':
    case 'MOCK_EXAM':
      return 'danger';
    case 'EVALUATION':
    case 'QUIZ':
      return 'warning';
    case 'LEVEL_HOMEWORK':
    case 'CLASS_HOMEWORK':
    case 'HOMEWORK':
      return 'info';
    case 'HOME_EXERCISE':
    case 'PROJECT':
      return 'success';
    default:
      return 'default';
  }
}
