"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gradeQuizAttempt = gradeQuizAttempt;
exports.isAutoGradableKind = isAutoGradableKind;
function normalizeAnswer(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase();
}
function gradeQuizAttempt(questions, answers, passingScorePercent) {
    let score = 0;
    let maxScore = 0;
    for (const q of questions) {
        maxScore += q.points;
        const raw = answers[q.id];
        if (raw == null || raw === '')
            continue;
        if (q.kind === 'MCQ' || q.kind === 'TRUE_FALSE') {
            if (normalizeAnswer(raw) === normalizeAnswer(q.correctAnswer)) {
                score += q.points;
            }
        }
        else if (q.kind === 'SHORT_TEXT') {
            if (normalizeAnswer(raw) === normalizeAnswer(q.correctAnswer)) {
                score += q.points;
            }
        }
    }
    const ratio = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const passed = ratio >= passingScorePercent;
    return { score, maxScore, passed };
}
function isAutoGradableKind(kind) {
    return kind === 'MCQ' || kind === 'TRUE_FALSE' || kind === 'SHORT_TEXT';
}
//# sourceMappingURL=elearning-quiz.util.js.map