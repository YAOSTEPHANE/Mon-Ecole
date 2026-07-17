"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_TYPE_VALUES = void 0;
exports.getEvaluationTypeLabel = getEvaluationTypeLabel;
exports.isValidEvaluationType = isValidEvaluationType;
/** Types d'évaluation — valeurs persistées en base. */
exports.EVALUATION_TYPE_VALUES = [
    'EXAM',
    'EVALUATION',
    'HOME_EXERCISE',
    'LEVEL_HOMEWORK',
    'CLASS_HOMEWORK',
    'ORAL',
];
/** Anciennes valeurs (données existantes avant migration des libellés). */
const LEGACY_EVALUATION_LABELS = {
    QUIZ: 'Évaluation',
    PROJECT: 'Exercice de maison',
    HOMEWORK: 'Devoir maison',
};
const EVALUATION_TYPE_LABELS = {
    EXAM: 'Examen',
    EVALUATION: 'Évaluation',
    HOME_EXERCISE: 'Exercice de maison',
    LEVEL_HOMEWORK: 'Devoir de niveau',
    CLASS_HOMEWORK: 'Devoir de classe',
    ORAL: 'Oral',
};
function getEvaluationTypeLabel(type) {
    if (!type)
        return 'Évaluation';
    if (type in EVALUATION_TYPE_LABELS) {
        return EVALUATION_TYPE_LABELS[type];
    }
    return LEGACY_EVALUATION_LABELS[type] ?? type;
}
function isValidEvaluationType(type) {
    return exports.EVALUATION_TYPE_VALUES.includes(type);
}
//# sourceMappingURL=evaluation-type.util.js.map