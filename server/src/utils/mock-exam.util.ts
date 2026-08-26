import type { ElearningQuestionKind, Prisma, PrismaClient } from '@prisma/client';
import {
  isExamClassLevel,
  studentMatchesMockExamTarget,
} from './exam-class.util';

type Db = PrismaClient | Prisma.TransactionClient;

export type MockQuestionInput = {
  kind?: ElearningQuestionKind;
  prompt: string;
  options?: string[] | null;
  correctAnswer: string;
  points?: number;
  sortOrder?: number;
};

function normalizeAnswer(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function gradeMockExamAnswers(
  questions: Array<{
    id: string;
    kind: ElearningQuestionKind;
    correctAnswer: string;
    points: number;
  }>,
  answers: Record<string, unknown>
): { score: number; maxScore: number; scoreOn20: number; passed: boolean; passingScore: number } {
  let score = 0;
  let maxScore = 0;
  for (const q of questions) {
    maxScore += q.points;
    const given = normalizeAnswer(answers[q.id]);
    const expected = normalizeAnswer(q.correctAnswer);
    if (!given) continue;
    if (q.kind === 'MCQ' || q.kind === 'TRUE_FALSE') {
      if (given === expected) score += q.points;
    } else {
      // SHORT_TEXT : égalité stricte normalisée
      if (given === expected) score += q.points;
    }
  }
  const scoreOn20 = maxScore > 0 ? (score / maxScore) * 20 : 0;
  return {
    score,
    maxScore,
    scoreOn20: Math.round(scoreOn20 * 100) / 100,
    passed: false,
    passingScore: 10,
  };
}

export async function assertStudentCanAccessMockExam(
  client: Db,
  studentId: string,
  mockExamId: string
) {
  const student = await client.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      classId: true,
      class: { select: { id: true, level: true, name: true } },
    },
  });
  if (!student) {
    throw Object.assign(new Error('Élève introuvable'), { status: 404 });
  }

  const exam = await client.mockExam.findUnique({
    where: { id: mockExamId },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      course: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, level: true } },
      teacher: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });
  if (!exam) {
    throw Object.assign(new Error('Examen blanc introuvable'), { status: 404 });
  }
  if (!exam.isPublished) {
    throw Object.assign(new Error('Cet examen blanc n’est pas publié'), { status: 403 });
  }

  const level = student.class?.level;
  if (!isExamClassLevel(level)) {
    throw Object.assign(
      new Error('Les examens blancs sont réservés aux classes d’examen (3ème, Terminale)'),
      { status: 403 }
    );
  }

  const ok = studentMatchesMockExamTarget({
    studentClassId: student.classId,
    studentLevel: level,
    examClassId: exam.classId,
    examTargetLevels: exam.targetLevels,
  });
  if (!ok) {
    throw Object.assign(new Error('Cet examen blanc ne concerne pas votre classe'), {
      status: 403,
    });
  }

  const now = new Date();
  if (exam.startsAt && now < exam.startsAt) {
    throw Object.assign(new Error('Cet examen blanc n’a pas encore commencé'), { status: 403 });
  }
  if (exam.endsAt && now > exam.endsAt) {
    throw Object.assign(new Error('Cet examen blanc est clos'), { status: 403 });
  }

  return { student, exam };
}

export async function listPublishedMockExamsForStudent(client: Db, studentId: string) {
  const student = await client.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      classId: true,
      class: { select: { id: true, level: true, name: true } },
    },
  });
  if (!student) return { student: null, exams: [], isExamClass: false };

  const isExamClass = isExamClassLevel(student.class?.level);
  if (!isExamClass) {
    return { student, exams: [], isExamClass: false };
  }

  const exams = await client.mockExam.findMany({
    where: { isPublished: true },
    orderBy: [{ startsAt: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { questions: true, attempts: true } },
      course: { select: { id: true, name: true } },
      class: { select: { id: true, name: true, level: true } },
    },
  });

  const filtered = exams.filter((exam) =>
    studentMatchesMockExamTarget({
      studentClassId: student.classId,
      studentLevel: student.class?.level,
      examClassId: exam.classId,
      examTargetLevels: exam.targetLevels,
    })
  );

  const attempts = await client.mockExamAttempt.findMany({
    where: {
      studentId,
      mockExamId: { in: filtered.map((e) => e.id) },
    },
    orderBy: { startedAt: 'desc' },
  });

  const byExam = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const list = byExam.get(a.mockExamId) || [];
    list.push(a);
    byExam.set(a.mockExamId, list);
  }

  return {
    student,
    isExamClass: true,
    exams: filtered.map((exam) => {
      const mine = byExam.get(exam.id) || [];
      const submitted = mine.filter((a) => a.submittedAt);
      return {
        ...exam,
        myAttempts: mine.length,
        mySubmittedAttempts: submitted.length,
        bestScoreOn20:
          submitted.length > 0
            ? Math.max(...submitted.map((a) => a.scoreOn20 ?? 0))
            : null,
        canRetry: mine.filter((a) => a.submittedAt).length < exam.maxAttempts,
      };
    }),
  };
}

export async function createMockExamWithQuestions(
  client: Db,
  data: {
    title: string;
    description?: string | null;
    subject?: string | null;
    examKind: 'BEPC' | 'BAC' | 'OTHER';
    academicYear: string;
    targetLevels: string[];
    classId?: string | null;
    courseId?: string | null;
    teacherId?: string | null;
    schoolId?: string | null;
    durationMinutes?: number | null;
    startsAt?: Date | null;
    endsAt?: Date | null;
    isPublished?: boolean;
    isPublicListed?: boolean;
    countsAsGrade?: boolean;
    maxAttempts?: number;
    passingScore?: number;
    questions: MockQuestionInput[];
  }
) {
  if (!data.title.trim()) {
    throw Object.assign(new Error('Titre requis'), { status: 400 });
  }
  if (!data.questions.length) {
    throw Object.assign(new Error('Au moins une question est requise'), { status: 400 });
  }

  return client.mockExam.create({
    data: {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      subject: data.subject?.trim() || null,
      examKind: data.examKind,
      academicYear: data.academicYear,
      targetLevels: data.targetLevels,
      classId: data.classId || null,
      courseId: data.courseId || null,
      teacherId: data.teacherId || null,
      schoolId: data.schoolId || null,
      durationMinutes: data.durationMinutes ?? null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      isPublished: data.isPublished ?? false,
      isPublicListed: data.isPublicListed ?? false,
      countsAsGrade: data.countsAsGrade ?? false,
      maxAttempts: data.maxAttempts ?? 2,
      passingScore: data.passingScore ?? 10,
      questions: {
        create: data.questions.map((q, i) => ({
          kind: q.kind || 'MCQ',
          prompt: q.prompt.trim(),
          options: q.options ?? undefined,
          correctAnswer: String(q.correctAnswer).trim(),
          points: q.points ?? 1,
          sortOrder: q.sortOrder ?? i,
        })),
      },
    },
    include: {
      questions: { orderBy: { sortOrder: 'asc' } },
      class: { select: { id: true, name: true, level: true } },
      course: { select: { id: true, name: true } },
    },
  });
}
