/** Types d'évaluation — valeurs persistées en base. */
export const EVALUATION_TYPE_VALUES = [
  'EXAM',
  'EVALUATION',
  'HOME_EXERCISE',
  'LEVEL_HOMEWORK',
  'CLASS_HOMEWORK',
  'ORAL',
  'MOCK_EXAM',
] as const;

export type EvaluationTypeValue = (typeof EVALUATION_TYPE_VALUES)[number];

/** Anciennes valeurs (données existantes avant migration des libellés). */
const LEGACY_EVALUATION_LABELS: Record<string, string> = {
  QUIZ: 'Évaluation',
  PROJECT: 'Exercice de maison',
  HOMEWORK: 'Devoir maison',
};

const EVALUATION_TYPE_LABELS: Record<EvaluationTypeValue, string> = {
  EXAM: 'Examen',
  EVALUATION: 'Évaluation',
  HOME_EXERCISE: 'Exercice de maison',
  LEVEL_HOMEWORK: 'Devoir de niveau',
  CLASS_HOMEWORK: 'Devoir de classe',
  ORAL: 'Oral',
  MOCK_EXAM: 'Examen blanc',
};

export function getEvaluationTypeLabel(type: string | null | undefined): string {
  if (!type) return 'Évaluation';
  if (type in EVALUATION_TYPE_LABELS) {
    return EVALUATION_TYPE_LABELS[type as EvaluationTypeValue];
  }
  return LEGACY_EVALUATION_LABELS[type] ?? type;
}

export function isValidEvaluationType(type: string): type is EvaluationTypeValue {
  return (EVALUATION_TYPE_VALUES as readonly string[]).includes(type);
}
