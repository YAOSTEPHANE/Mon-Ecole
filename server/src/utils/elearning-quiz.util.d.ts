import type { ElearningQuestionKind, ElearningQuizQuestion } from '@prisma/client';
export type QuizAnswerMap = Record<string, string>;
export declare function gradeQuizAttempt(questions: Pick<ElearningQuizQuestion, 'id' | 'kind' | 'correctAnswer' | 'points'>[], answers: QuizAnswerMap, passingScorePercent: number): {
    score: number;
    maxScore: number;
    passed: boolean;
};
export declare function isAutoGradableKind(kind: ElearningQuestionKind): boolean;
//# sourceMappingURL=elearning-quiz.util.d.ts.map