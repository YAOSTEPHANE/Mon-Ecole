import express from 'express';
import prisma from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  createMockExamWithQuestions,
  type MockQuestionInput,
} from '../utils/mock-exam.util';
import { defaultExamKindForLevel, isExamClassLevel } from '../utils/exam-class.util';
import { getCurrentAcademicYear } from '../utils/report-card.util';
import type { SchoolContextRequest } from '../utils/school-context.util';

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN', 'STAFF'));

function parseDate(raw: unknown): Date | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseQuestions(raw: unknown): MockQuestionInput[] {
  if (!Array.isArray(raw)) return [];
  const questions: MockQuestionInput[] = [];
  raw.forEach((q, i) => {
    if (!q || typeof q !== 'object') return;
    const row = q as Record<string, unknown>;
    const prompt = typeof row.prompt === 'string' ? row.prompt.trim() : '';
    const correctAnswer =
      row.correctAnswer != null ? String(row.correctAnswer).trim() : '';
    if (!prompt || !correctAnswer) return;
    const kind =
      row.kind === 'TRUE_FALSE' || row.kind === 'SHORT_TEXT' || row.kind === 'MCQ'
        ? row.kind
        : 'MCQ';
    questions.push({
      kind,
      prompt,
      options: Array.isArray(row.options)
        ? row.options.map((o) => String(o))
        : null,
      correctAnswer,
      points: Number.isFinite(Number(row.points)) ? Math.max(1, Number(row.points)) : 1,
      sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : i,
    });
  });
  return questions;
}

/** Classes d’examen (3ème / Terminale) pour le sélecteur admin. */
router.get('/mock-exams/exam-classes', async (req: SchoolContextRequest, res) => {
  try {
    const year =
      typeof req.query.academicYear === 'string' && req.query.academicYear.trim()
        ? req.query.academicYear.trim()
        : getCurrentAcademicYear();
    const classes = await prisma.class.findMany({
      where: {
        academicYear: year,
        ...(req.schoolId ? { schoolId: req.schoolId } : {}),
      },
      select: {
        id: true,
        name: true,
        level: true,
        academicYear: true,
        _count: { select: { students: true } },
      },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
    });
    const examClasses = classes
      .filter((c) => isExamClassLevel(c.level))
      .map((c) => ({
        ...c,
        suggestedExamKind: defaultExamKindForLevel(c.level),
      }));
    res.json({ academicYear: year, classes: examClasses });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/mock-exams', async (req: SchoolContextRequest, res) => {
  try {
    const year =
      typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : undefined;
    const rows = await prisma.mockExam.findMany({
      where: {
        ...(year ? { academicYear: year } : {}),
        ...(req.schoolId ? { schoolId: req.schoolId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      include: {
        _count: { select: { questions: true, attempts: true } },
        class: { select: { id: true, name: true, level: true } },
        course: { select: { id: true, name: true } },
        teacher: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Importe / synchronise la liste admin vers la page publique :
 * marque isPublicListed=true pour les examens de l’année (publiés élèves par défaut).
 */
router.post('/mock-exams/sync-public-list', async (req: SchoolContextRequest, res) => {
  try {
    const body = (req.body || {}) as { academicYear?: string; onlyPublished?: boolean };
    const year =
      typeof body.academicYear === 'string' && body.academicYear.trim()
        ? body.academicYear.trim()
        : getCurrentAcademicYear();
    const onlyPublished = body.onlyPublished !== false;

    const result = await prisma.mockExam.updateMany({
      where: {
        academicYear: year,
        ...(req.schoolId ? { schoolId: req.schoolId } : {}),
        ...(onlyPublished ? { isPublished: true } : {}),
      },
      data: { isPublicListed: true },
    });

    res.json({
      ok: true,
      academicYear: year,
      updatedCount: result.count,
      publicPath: '/examens-blancs',
    });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.get('/mock-exams/:id', async (req, res) => {
  try {
    const row = await prisma.mockExam.findUnique({
      where: { id: req.params.id },
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        class: { select: { id: true, name: true, level: true } },
        course: { select: { id: true, name: true } },
        attempts: {
          orderBy: { submittedAt: 'desc' },
          take: 100,
          include: {
            student: {
              select: {
                id: true,
                studentId: true,
                user: { select: { firstName: true, lastName: true } },
                class: { select: { name: true, level: true } },
              },
            },
          },
        },
      },
    });
    if (!row) return res.status(404).json({ error: 'Examen blanc introuvable' });
    res.json(row);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.post('/mock-exams', async (req: AuthRequest & SchoolContextRequest, res) => {
  try {
    const body = req.body || {};
    const questions = parseQuestions(body.questions);
    const targetLevels = Array.isArray(body.targetLevels)
      ? body.targetLevels.map((l: unknown) => String(l).trim()).filter(Boolean)
      : [];
    const examKind =
      body.examKind === 'BEPC' || body.examKind === 'BAC' || body.examKind === 'OTHER'
        ? body.examKind
        : 'OTHER';

    const created = await createMockExamWithQuestions(prisma, {
      title: typeof body.title === 'string' ? body.title : '',
      description: typeof body.description === 'string' ? body.description : null,
      subject: typeof body.subject === 'string' ? body.subject : null,
      examKind,
      academicYear:
        typeof body.academicYear === 'string' && body.academicYear.trim()
          ? body.academicYear.trim()
          : getCurrentAcademicYear(),
      targetLevels,
      classId: typeof body.classId === 'string' ? body.classId : null,
      courseId: typeof body.courseId === 'string' ? body.courseId : null,
      teacherId: typeof body.teacherId === 'string' ? body.teacherId : null,
      schoolId: req.schoolId || (typeof body.schoolId === 'string' ? body.schoolId : null),
      durationMinutes:
        body.durationMinutes != null && Number.isFinite(Number(body.durationMinutes))
          ? Number(body.durationMinutes)
          : null,
      startsAt: parseDate(body.startsAt),
      endsAt: parseDate(body.endsAt),
      isPublished: Boolean(body.isPublished),
      isPublicListed: Boolean(body.isPublicListed),
      countsAsGrade: Boolean(body.countsAsGrade),
      maxAttempts:
        body.maxAttempts != null && Number.isFinite(Number(body.maxAttempts))
          ? Math.max(1, Math.min(10, Number(body.maxAttempts)))
          : 2,
      passingScore:
        body.passingScore != null && Number.isFinite(Number(body.passingScore))
          ? Number(body.passingScore)
          : 10,
      questions,
    });
    res.status(201).json(created);
  } catch (e) {
    const status = (e as { status?: number })?.status ?? 500;
    res.status(status).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.patch('/mock-exams/:id', async (req, res) => {
  try {
    const body = req.body || {};
    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string') data.title = body.title.trim();
    if (typeof body.description === 'string') data.description = body.description.trim() || null;
    if (typeof body.subject === 'string') data.subject = body.subject.trim() || null;
    if (body.examKind === 'BEPC' || body.examKind === 'BAC' || body.examKind === 'OTHER') {
      data.examKind = body.examKind;
    }
    if (typeof body.academicYear === 'string') data.academicYear = body.academicYear.trim();
    if (Array.isArray(body.targetLevels)) {
      data.targetLevels = body.targetLevels.map((l: unknown) => String(l).trim()).filter(Boolean);
    }
    if (body.classId === null || typeof body.classId === 'string') data.classId = body.classId || null;
    if (body.courseId === null || typeof body.courseId === 'string') {
      data.courseId = body.courseId || null;
    }
    if (typeof body.isPublished === 'boolean') data.isPublished = body.isPublished;
    if (typeof body.isPublicListed === 'boolean') data.isPublicListed = body.isPublicListed;
    if (typeof body.countsAsGrade === 'boolean') data.countsAsGrade = body.countsAsGrade;
    if (body.durationMinutes != null) data.durationMinutes = Number(body.durationMinutes) || null;
    if (body.maxAttempts != null) {
      data.maxAttempts = Math.max(1, Math.min(10, Number(body.maxAttempts) || 2));
    }
    if (body.passingScore != null) data.passingScore = Number(body.passingScore) || 10;
    if (body.startsAt !== undefined) data.startsAt = parseDate(body.startsAt);
    if (body.endsAt !== undefined) data.endsAt = parseDate(body.endsAt);

    const updated = await prisma.mockExam.update({
      where: { id: req.params.id },
      data,
      include: {
        questions: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { attempts: true } },
      },
    });
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

router.delete('/mock-exams/:id', async (req, res) => {
  try {
    await prisma.mockExam.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
