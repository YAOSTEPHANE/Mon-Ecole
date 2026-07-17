/** Types d'évaluation — valeurs persistées en base. */
export declare const EVALUATION_TYPE_VALUES: readonly ['EXAM', 'EVALUATION', 'HOME_EXERCISE', 'LEVEL_HOMEWORK', 'CLASS_HOMEWORK', 'ORAL'];
export type EvaluationTypeValue = (typeof EVALUATION_TYPE_VALUES)[number];
export declare function getEvaluationTypeLabel(type: string | null | undefined): string;
export declare function isValidEvaluationType(type: string): type is EvaluationTypeValue;
//# sourceMappingURL=evaluation-type.util.d.ts.map