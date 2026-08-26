import type { Prisma, PrismaClient } from '@prisma/client';
import { academicYearFromDate } from './academicYear.util';
import { createMockExamWithQuestions, type MockQuestionInput } from './mock-exam.util';

type Db = PrismaClient | Prisma.TransactionClient;

export const MOCK_EXAM_DEMO_TITLE_PREFIX = '[DEMO]';

type SeedMockExamsOptions = {
  /** Si true, supprime d’abord les examens dont le titre commence par [DEMO]. */
  replaceExisting?: boolean;
  academicYear?: string;
  schoolId?: string | null;
  teacherId?: string | null;
};

function demoTitle(suffix: string): string {
  return `${MOCK_EXAM_DEMO_TITLE_PREFIX} ${suffix}`;
}

function bepcMathQuestions(): MockQuestionInput[] {
  return [
    {
      kind: 'MCQ',
      prompt: 'Quelle est la valeur de 3² + 4² ?',
      options: ['7', '12', '25', '49'],
      correctAnswer: '25',
      points: 2,
    },
    {
      kind: 'TRUE_FALSE',
      prompt: 'Un triangle rectangle vérifie toujours le théorème de Pythagore.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      points: 1,
    },
    {
      kind: 'MCQ',
      prompt: 'La médiane d’un triangle joint…',
      options: [
        'un sommet au milieu du côté opposé',
        'deux milieux de côtés',
        'un sommet à un côté adjacent',
        'le centre du cercle circonscrit à un sommet',
      ],
      correctAnswer: 'un sommet au milieu du côté opposé',
      points: 2,
    },
    {
      kind: 'SHORT_TEXT',
      prompt: 'Calculez 15 % de 200 (répondre par un nombre).',
      correctAnswer: '30',
      points: 2,
    },
    {
      kind: 'MCQ',
      prompt: 'Si x + 5 = 12, alors x vaut :',
      options: ['5', '7', '12', '17'],
      correctAnswer: '7',
      points: 1,
    },
  ];
}

function bepcFrenchQuestions(): MockQuestionInput[] {
  return [
    {
      kind: 'MCQ',
      prompt: 'Dans « Les élèves lisent attentivement », « attentivement » est :',
      options: ['un adjectif', 'un adverbe', 'un nom', 'un pronom'],
      correctAnswer: 'un adverbe',
      points: 2,
    },
    {
      kind: 'TRUE_FALSE',
      prompt: 'Une proposition subordonnée relative commence souvent par qui, que, dont, où.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      points: 1,
    },
    {
      kind: 'MCQ',
      prompt: 'Le synonyme de « rapide » est :',
      options: ['lent', 'vif', 'lourd', 'faible'],
      correctAnswer: 'vif',
      points: 1,
    },
    {
      kind: 'SHORT_TEXT',
      prompt: 'Donnez le féminin de « acteur » (un mot).',
      correctAnswer: 'actrice',
      points: 2,
    },
  ];
}

function bacPhilosophyQuestions(): MockQuestionInput[] {
  return [
    {
      kind: 'MCQ',
      prompt: 'Selon Descartes, le doute méthodique vise principalement à :',
      options: [
        'nier toute connaissance',
        'fonder une certitude',
        'prouver l’existence de Dieu dès le départ',
        'condamner la science',
      ],
      correctAnswer: 'fonder une certitude',
      points: 2,
    },
    {
      kind: 'TRUE_FALSE',
      prompt: 'Pour Kant, la liberté morale suppose l’autonomie de la volonté.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      points: 2,
    },
    {
      kind: 'MCQ',
      prompt: 'Le « cogito » cartésien s’exprime par :',
      options: [
        'Je sens donc je suis',
        'Je pense donc je suis',
        'Je crois donc je suis',
        'Je doute donc je m’égare',
      ],
      correctAnswer: 'Je pense donc je suis',
      points: 2,
    },
    {
      kind: 'SHORT_TEXT',
      prompt: 'Qui a écrit « L’existentialisme est un humanisme » ? (nom de famille)',
      correctAnswer: 'Sartre',
      points: 2,
    },
  ];
}

function bacMathQuestions(): MockQuestionInput[] {
  return [
    {
      kind: 'MCQ',
      prompt: 'La dérivée de f(x) = x² est :',
      options: ['x', '2x', 'x²', '2'],
      correctAnswer: '2x',
      points: 2,
    },
    {
      kind: 'TRUE_FALSE',
      prompt: 'La fonction exponentielle est strictement croissante sur ℝ.',
      options: ['Vrai', 'Faux'],
      correctAnswer: 'Vrai',
      points: 1,
    },
    {
      kind: 'MCQ',
      prompt: 'lim (x→+∞) 1/x vaut :',
      options: ['+∞', '−∞', '0', '1'],
      correctAnswer: '0',
      points: 2,
    },
    {
      kind: 'MCQ',
      prompt: 'Une suite géométrique de raison q = 2 et premier terme u₀ = 3 a pour u₂ :',
      options: ['5', '6', '12', '9'],
      correctAnswer: '12',
      points: 2,
    },
    {
      kind: 'SHORT_TEXT',
      prompt: 'Combien vaut cos(0) ? (nombre)',
      correctAnswer: '1',
      points: 1,
    },
  ];
}

async function findTeacherId(client: Db, preferredId?: string | null): Promise<string | null> {
  if (preferredId) {
    const t = await client.teacher.findUnique({ where: { id: preferredId }, select: { id: true } });
    if (t) return t.id;
  }
  const first = await client.teacher.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  return first?.id ?? null;
}

async function findSchoolId(client: Db, preferredId?: string | null): Promise<string | null> {
  if (preferredId) {
    const s = await client.school.findUnique({ where: { id: preferredId }, select: { id: true } });
    if (s) return s.id;
  }
  const def = await client.school.findFirst({
    where: { isDefault: true },
    select: { id: true },
  });
  if (def) return def.id;
  const any = await client.school.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } });
  return any?.id ?? null;
}

async function ensureExamClass(
  client: Db,
  params: {
    name: string;
    level: string;
    academicYear: string;
    schoolId: string | null;
    teacherId: string | null;
  }
): Promise<{ id: string; created: boolean }> {
  const existing = await client.class.findFirst({
    where: {
      name: params.name,
      level: params.level,
      academicYear: params.academicYear,
      ...(params.schoolId ? { schoolId: params.schoolId } : {}),
    },
    select: { id: true },
  });
  if (existing) return { id: existing.id, created: false };

  const created = await client.class.create({
    data: {
      name: params.name,
      level: params.level,
      room: params.level === '3ème' ? 'Salle BEPC' : 'Salle BAC',
      capacity: 35,
      academicYear: params.academicYear,
      teacherId: params.teacherId,
      schoolId: params.schoolId,
    },
    select: { id: true },
  });
  return { id: created.id, created: true };
}

/**
 * Crée des examens blancs de démonstration (BEPC + BAC), publiés, avec questions.
 * Idempotent si `replaceExisting` : remplace les titres `[DEMO] …`.
 */
export async function seedMockExamDemoData(
  client: Db,
  options: SeedMockExamsOptions = {}
): Promise<{
  academicYear: string;
  schoolId: string | null;
  teacherId: string | null;
  classIds: { troisieme: string; terminale: string };
  createdExamIds: string[];
  removedCount: number;
}> {
  const academicYear = options.academicYear ?? academicYearFromDate(new Date());
  const schoolId = await findSchoolId(client, options.schoolId);
  const teacherId = await findTeacherId(client, options.teacherId);

  let removedCount = 0;
  if (options.replaceExisting !== false) {
    const old = await client.mockExam.findMany({
      where: { title: { startsWith: MOCK_EXAM_DEMO_TITLE_PREFIX } },
      select: { id: true },
    });
    if (old.length > 0) {
      const ids = old.map((e) => e.id);
      await client.mockExamAttempt.deleteMany({ where: { mockExamId: { in: ids } } });
      await client.mockExamQuestion.deleteMany({ where: { mockExamId: { in: ids } } });
      const del = await client.mockExam.deleteMany({ where: { id: { in: ids } } });
      removedCount = del.count;
    }
  }

  const troisieme = await ensureExamClass(client, {
    name: '3ème A (examens)',
    level: '3ème',
    academicYear,
    schoolId,
    teacherId,
  });
  const terminale = await ensureExamClass(client, {
    name: 'Terminale A (examens)',
    level: 'Terminale',
    academicYear,
    schoolId,
    teacherId,
  });

  const now = new Date();
  const startsAt = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endsAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const draftEnds = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const specs: Array<{
    title: string;
    description: string;
    subject: string;
    examKind: 'BEPC' | 'BAC' | 'OTHER';
    targetLevels: string[];
    classId: string;
    durationMinutes: number;
    isPublished: boolean;
    isPublicListed: boolean;
    questions: MockQuestionInput[];
    startsAt: Date | null;
    endsAt: Date | null;
  }> = [
    {
      title: demoTitle('BEPC Mathématiques — blanc 1'),
      description:
        'Examen blanc de mathématiques pour la préparation au BEPC. QCM, vrai/faux et réponses courtes.',
      subject: 'Mathématiques',
      examKind: 'BEPC',
      targetLevels: ['3ème'],
      classId: troisieme.id,
      durationMinutes: 90,
      isPublished: true,
      isPublicListed: true,
      questions: bepcMathQuestions(),
      startsAt,
      endsAt,
    },
    {
      title: demoTitle('BEPC Français — blanc 1'),
      description: 'Examen blanc de français (compréhension et langue) — préparation BEPC.',
      subject: 'Français',
      examKind: 'BEPC',
      targetLevels: ['3ème'],
      classId: troisieme.id,
      durationMinutes: 75,
      isPublished: true,
      isPublicListed: true,
      questions: bepcFrenchQuestions(),
      startsAt,
      endsAt,
    },
    {
      title: demoTitle('BAC Philosophie — blanc 1'),
      description: 'Examen blanc de philosophie pour la Terminale (notions du programme).',
      subject: 'Philosophie',
      examKind: 'BAC',
      targetLevels: ['Terminale'],
      classId: terminale.id,
      durationMinutes: 120,
      isPublished: true,
      isPublicListed: true,
      questions: bacPhilosophyQuestions(),
      startsAt,
      endsAt,
    },
    {
      title: demoTitle('BAC Mathématiques — blanc 1'),
      description: 'Examen blanc de mathématiques Terminale (analyse et suites).',
      subject: 'Mathématiques',
      examKind: 'BAC',
      targetLevels: ['Terminale'],
      classId: terminale.id,
      durationMinutes: 180,
      isPublished: true,
      isPublicListed: false,
      questions: bacMathQuestions(),
      startsAt,
      endsAt,
    },
    {
      title: demoTitle('BEPC Sciences — brouillon'),
      description: 'Brouillon non publié — utile pour tester le workflow enseignant / admin.',
      subject: 'Sciences Physiques',
      examKind: 'BEPC',
      targetLevels: ['3ème'],
      classId: troisieme.id,
      durationMinutes: 60,
      isPublished: false,
      isPublicListed: false,
      questions: [
        {
          kind: 'MCQ',
          prompt: 'L’unité SI de la force est :',
          options: ['Joule', 'Newton', 'Watt', 'Pascal'],
          correctAnswer: 'Newton',
          points: 1,
        },
        {
          kind: 'TRUE_FALSE',
          prompt: 'L’eau bout à 100 °C à pression atmosphérique normale.',
          options: ['Vrai', 'Faux'],
          correctAnswer: 'Vrai',
          points: 1,
        },
      ],
      startsAt: now,
      endsAt: draftEnds,
    },
  ];

  const createdExamIds: string[] = [];
  for (const spec of specs) {
    const exam = await createMockExamWithQuestions(client, {
      title: spec.title,
      description: spec.description,
      subject: spec.subject,
      examKind: spec.examKind,
      academicYear,
      targetLevels: spec.targetLevels,
      classId: spec.classId,
      teacherId,
      schoolId,
      durationMinutes: spec.durationMinutes,
      startsAt: spec.startsAt,
      endsAt: spec.endsAt,
      isPublished: spec.isPublished,
      isPublicListed: spec.isPublicListed,
      countsAsGrade: false,
      maxAttempts: 2,
      passingScore: 10,
      questions: spec.questions,
    });
    createdExamIds.push(exam.id);
  }

  return {
    academicYear,
    schoolId,
    teacherId,
    classIds: { troisieme: troisieme.id, terminale: terminale.id },
    createdExamIds,
    removedCount,
  };
}
