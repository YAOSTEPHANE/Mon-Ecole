"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const elearning_quiz_util_1 = require("../utils/elearning-quiz.util");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
async function getTeacherId(userId) {
    const t = await prisma_1.default.teacher.findUnique({ where: { userId }, select: { id: true } });
    return t?.id ?? null;
}
async function getStudentId(userId) {
    const s = await prisma_1.default.student.findUnique({
        where: { userId },
        select: { id: true, classId: true },
    });
    return s;
}
function isStaffOrAdmin(role) {
    return role === 'ADMIN' || role === 'STAFF';
}
function canManageElearning(role) {
    return role === 'TEACHER' || role === 'ADMIN';
}
/** Parcours e-learning visibles selon le rôle */
router.get('/courses', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        if (role === 'STUDENT') {
            const student = await getStudentId(userId);
            if (!student)
                return res.status(404).json({ error: 'Profil élève introuvable' });
            const classFilter = [{ classId: null }];
            if (student.classId) {
                classFilter.unshift({ classId: student.classId });
            }
            const rows = await prisma_1.default.elearningCourse.findMany({
                where: {
                    isPublished: true,
                    OR: classFilter,
                },
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    class: { select: { id: true, name: true, level: true } },
                    _count: { select: { lessons: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });
            return res.json(rows);
        }
        if (role === 'TEACHER') {
            const teacherId = await getTeacherId(userId);
            if (!teacherId)
                return res.status(404).json({ error: 'Profil enseignant introuvable' });
            const rows = await prisma_1.default.elearningCourse.findMany({
                where: { teacherId },
                include: {
                    class: { select: { id: true, name: true, level: true } },
                    course: { select: { id: true, name: true, code: true } },
                    _count: { select: { lessons: true, virtualSessions: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });
            return res.json(rows);
        }
        if (isStaffOrAdmin(role)) {
            const rows = await prisma_1.default.elearningCourse.findMany({
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    class: { select: { id: true, name: true, level: true } },
                    _count: { select: { lessons: true } },
                },
                orderBy: { updatedAt: 'desc' },
            });
            return res.json(rows);
        }
        res.status(403).json({ error: 'Accès refusé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/courses/:id', async (req, res) => {
    try {
        const role = req.user.role;
        const course = await prisma_1.default.elearningCourse.findUnique({
            where: { id: req.params.id },
            include: {
                lessons: {
                    orderBy: { sortOrder: 'asc' },
                    include: {
                        quiz: {
                            include: { questions: { orderBy: { sortOrder: 'asc' } } },
                        },
                    },
                },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                class: { select: { id: true, name: true, level: true } },
            },
        });
        if (!course)
            return res.status(404).json({ error: 'Parcours introuvable' });
        if (role === 'STUDENT') {
            if (!course.isPublished)
                return res.status(403).json({ error: 'Parcours non publié' });
            const student = await getStudentId(req.user.id);
            if (course.classId && student?.classId !== course.classId) {
                return res.status(403).json({ error: 'Parcours non accessible pour votre classe' });
            }
            const attempts = student
                ? await prisma_1.default.elearningQuizAttempt.findMany({
                    where: { studentId: student.id, quiz: { lesson: { elearningCourseId: course.id } } },
                })
                : [];
            const progress = student
                ? await prisma_1.default.elearningLessonProgress.findMany({
                    where: { studentId: student.id, lesson: { elearningCourseId: course.id } },
                })
                : [];
            const safeLessons = course.lessons
                .filter((l) => l.isPublished)
                .map((l) => ({
                ...l,
                quiz: l.quiz
                    ? {
                        ...l.quiz,
                        questions: l.quiz.questions.map((q) => ({
                            id: q.id,
                            kind: q.kind,
                            prompt: q.prompt,
                            options: q.options,
                            points: q.points,
                            sortOrder: q.sortOrder,
                        })),
                    }
                    : null,
            }));
            return res.json({
                ...course,
                lessons: safeLessons,
                myQuizAttempts: attempts,
                myProgress: progress,
            });
        }
        if (role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== course.teacherId) {
                return res.status(403).json({ error: 'Accès refusé' });
            }
        }
        res.json(course);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/courses', (0, express_validator_1.body)('title').trim().notEmpty(), async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        let teacherId = null;
        if (req.user.role === 'TEACHER') {
            teacherId = await getTeacherId(req.user.id);
            if (!teacherId)
                return res.status(404).json({ error: 'Profil enseignant introuvable' });
        }
        else {
            teacherId = req.body.teacherId;
            if (!teacherId)
                return res.status(400).json({ error: 'teacherId requis' });
        }
        const row = await prisma_1.default.elearningCourse.create({
            data: {
                title: req.body.title,
                description: req.body.description ?? null,
                subject: req.body.subject ?? null,
                level: req.body.level ?? null,
                coverImageUrl: req.body.coverImageUrl ?? null,
                isPublished: Boolean(req.body.isPublished),
                teacherId,
                classId: req.body.classId ?? null,
                courseId: req.body.courseId ?? null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.patch('/courses/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.elearningCourse.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Parcours introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        const row = await prisma_1.default.elearningCourse.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.title != null ? { title: req.body.title } : {}),
                ...(req.body.description !== undefined ? { description: req.body.description } : {}),
                ...(req.body.subject !== undefined ? { subject: req.body.subject } : {}),
                ...(req.body.level !== undefined ? { level: req.body.level } : {}),
                ...(req.body.coverImageUrl !== undefined ? { coverImageUrl: req.body.coverImageUrl } : {}),
                ...(req.body.isPublished !== undefined ? { isPublished: Boolean(req.body.isPublished) } : {}),
                ...(req.body.classId !== undefined ? { classId: req.body.classId } : {}),
                ...(req.body.courseId !== undefined ? { courseId: req.body.courseId } : {}),
            },
        });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/courses/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.elearningCourse.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Parcours introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        await prisma_1.default.elearningCourse.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/courses/:courseId/lessons', (0, express_validator_1.body)('title').trim().notEmpty(), (0, express_validator_1.body)('kind').notEmpty(), async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const course = await prisma_1.default.elearningCourse.findUnique({ where: { id: req.params.courseId } });
        if (!course)
            return res.status(404).json({ error: 'Parcours introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== course.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        const lesson = await prisma_1.default.elearningLesson.create({
            data: {
                elearningCourseId: course.id,
                title: req.body.title,
                kind: req.body.kind,
                sortOrder: Number(req.body.sortOrder ?? 0),
                fileUrl: req.body.fileUrl ?? null,
                externalUrl: req.body.externalUrl ?? null,
                body: req.body.body ?? null,
                durationMinutes: req.body.durationMinutes != null ? Number(req.body.durationMinutes) : null,
                isPublished: req.body.isPublished !== false,
                assignmentId: req.body.assignmentId ?? null,
            },
        });
        if (req.body.kind === 'QUIZ' && Array.isArray(req.body.questions)) {
            const quiz = await prisma_1.default.elearningQuiz.create({
                data: {
                    lessonId: lesson.id,
                    title: req.body.quizTitle || req.body.title,
                    passingScore: Number(req.body.passingScore ?? 50),
                    autoGrade: req.body.autoGrade !== false,
                    questions: {
                        create: req.body.questions.map((q, i) => ({
                            kind: q.kind,
                            prompt: String(q.prompt),
                            options: q.options ?? null,
                            correctAnswer: String(q.correctAnswer),
                            points: Number(q.points ?? 1),
                            sortOrder: Number(q.sortOrder ?? i),
                        })),
                    },
                },
                include: { questions: true },
            });
            return res.status(201).json({ ...lesson, quiz });
        }
        res.status(201).json(lesson);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.patch('/lessons/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const lesson = await prisma_1.default.elearningLesson.findUnique({
            where: { id: req.params.id },
            include: { elearningCourse: true },
        });
        if (!lesson)
            return res.status(404).json({ error: 'Leçon introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== lesson.elearningCourse.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        const row = await prisma_1.default.elearningLesson.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.title != null ? { title: req.body.title } : {}),
                ...(req.body.kind != null ? { kind: req.body.kind } : {}),
                ...(req.body.sortOrder != null ? { sortOrder: Number(req.body.sortOrder) } : {}),
                ...(req.body.fileUrl !== undefined ? { fileUrl: req.body.fileUrl } : {}),
                ...(req.body.externalUrl !== undefined ? { externalUrl: req.body.externalUrl } : {}),
                ...(req.body.body !== undefined ? { body: req.body.body } : {}),
                ...(req.body.durationMinutes !== undefined
                    ? { durationMinutes: req.body.durationMinutes != null ? Number(req.body.durationMinutes) : null }
                    : {}),
                ...(req.body.isPublished !== undefined ? { isPublished: Boolean(req.body.isPublished) } : {}),
            },
        });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/lessons/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const lesson = await prisma_1.default.elearningLesson.findUnique({
            where: { id: req.params.id },
            include: { elearningCourse: true },
        });
        if (!lesson)
            return res.status(404).json({ error: 'Leçon introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== lesson.elearningCourse.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        await prisma_1.default.elearningLesson.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Soumission quiz — correction automatique QCM / Vrai-Faux / texte court */
router.post('/quizzes/:quizId/attempt', (0, express_validator_1.body)('answers').isObject(), async (req, res) => {
    try {
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ error: 'Réservé aux élèves' });
        }
        const student = await getStudentId(req.user.id);
        if (!student)
            return res.status(404).json({ error: 'Profil élève introuvable' });
        const quiz = await prisma_1.default.elearningQuiz.findUnique({
            where: { id: req.params.quizId },
            include: {
                questions: true,
                lesson: { include: { elearningCourse: true } },
            },
        });
        if (!quiz)
            return res.status(404).json({ error: 'Quiz introuvable' });
        if (!quiz.lesson.elearningCourse.isPublished) {
            return res.status(403).json({ error: 'Parcours non publié' });
        }
        const { score, maxScore, passed } = (0, elearning_quiz_util_1.gradeQuizAttempt)(quiz.questions, req.body.answers, quiz.passingScore);
        const attempt = await prisma_1.default.elearningQuizAttempt.create({
            data: {
                quizId: quiz.id,
                studentId: student.id,
                answers: req.body.answers,
                score: quiz.autoGrade ? score : null,
                maxScore: quiz.autoGrade ? maxScore : null,
                passed: quiz.autoGrade ? passed : null,
            },
        });
        if (passed) {
            await prisma_1.default.elearningLessonProgress.upsert({
                where: { lessonId_studentId: { lessonId: quiz.lessonId, studentId: student.id } },
                create: { lessonId: quiz.lessonId, studentId: student.id },
                update: { completedAt: new Date() },
            });
        }
        res.status(201).json(attempt);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/lessons/:id/complete', async (req, res) => {
    try {
        if (req.user.role !== 'STUDENT') {
            return res.status(403).json({ error: 'Réservé aux élèves' });
        }
        const student = await getStudentId(req.user.id);
        if (!student)
            return res.status(404).json({ error: 'Profil élève introuvable' });
        const progress = await prisma_1.default.elearningLessonProgress.upsert({
            where: { lessonId_studentId: { lessonId: req.params.id, studentId: student.id } },
            create: { lessonId: req.params.id, studentId: student.id },
            update: { completedAt: new Date() },
        });
        res.json(progress);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/quizzes/:quizId/attempts', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role) && !isStaffOrAdmin(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const rows = await prisma_1.default.elearningQuizAttempt.findMany({
            where: { quizId: req.params.quizId },
            include: {
                student: {
                    include: { user: { select: { firstName: true, lastName: true } } },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Banque de ressources pédagogiques */
router.get('/resource-bank', async (req, res) => {
    try {
        const role = req.user.role;
        if (!canManageElearning(role) && role !== 'STUDENT') {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const { subject, level, q } = req.query;
        const teacherId = role === 'TEACHER' ? await getTeacherId(req.user.id) : null;
        const rows = await prisma_1.default.pedagogicalResourceBank.findMany({
            where: {
                ...(subject && typeof subject === 'string' ? { subject } : {}),
                ...(level && typeof level === 'string' ? { level } : {}),
                ...(q && typeof q === 'string' && q.trim()
                    ? {
                        OR: [
                            { title: { contains: q.trim() } },
                            { description: { contains: q.trim() } },
                        ],
                    }
                    : {}),
                ...(role === 'TEACHER' && teacherId
                    ? { OR: [{ sharedWithTeachers: true }, { createdByTeacherId: teacherId }] }
                    : {}),
            },
            include: {
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
            orderBy: { updatedAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/resource-bank', (0, express_validator_1.body)('title').trim().notEmpty(), (0, express_validator_1.body)('kind').notEmpty(), async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId && req.user.role === 'TEACHER') {
            return res.status(404).json({ error: 'Profil enseignant introuvable' });
        }
        const ownerId = teacherId ?? req.body.createdByTeacherId;
        if (!ownerId)
            return res.status(400).json({ error: 'createdByTeacherId requis' });
        const row = await prisma_1.default.pedagogicalResourceBank.create({
            data: {
                title: req.body.title,
                description: req.body.description ?? null,
                kind: req.body.kind,
                subject: req.body.subject ?? null,
                level: req.body.level ?? null,
                fileUrl: req.body.fileUrl ?? null,
                externalUrl: req.body.externalUrl ?? null,
                tags: Array.isArray(req.body.tags) ? req.body.tags : [],
                sharedWithTeachers: req.body.sharedWithTeachers !== false,
                createdByTeacherId: ownerId,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.patch('/resource-bank/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.pedagogicalResourceBank.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Ressource introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.createdByTeacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        const row = await prisma_1.default.pedagogicalResourceBank.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.title != null ? { title: req.body.title } : {}),
                ...(req.body.description !== undefined ? { description: req.body.description } : {}),
                ...(req.body.kind != null ? { kind: req.body.kind } : {}),
                ...(req.body.subject !== undefined ? { subject: req.body.subject } : {}),
                ...(req.body.level !== undefined ? { level: req.body.level } : {}),
                ...(req.body.fileUrl !== undefined ? { fileUrl: req.body.fileUrl } : {}),
                ...(req.body.externalUrl !== undefined ? { externalUrl: req.body.externalUrl } : {}),
                ...(req.body.tags !== undefined ? { tags: req.body.tags } : {}),
                ...(req.body.sharedWithTeachers !== undefined
                    ? { sharedWithTeachers: Boolean(req.body.sharedWithTeachers) }
                    : {}),
            },
        });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/resource-bank/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.pedagogicalResourceBank.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Ressource introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.createdByTeacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        await prisma_1.default.pedagogicalResourceBank.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Classes virtuelles */
router.get('/virtual-sessions', async (req, res) => {
    try {
        const role = req.user.role;
        const userId = req.user.id;
        if (role === 'TEACHER') {
            const teacherId = await getTeacherId(userId);
            if (!teacherId)
                return res.status(404).json({ error: 'Profil enseignant introuvable' });
            const rows = await prisma_1.default.virtualClassSession.findMany({
                where: { teacherId },
                include: {
                    class: { select: { id: true, name: true } },
                    elearningCourse: { select: { id: true, title: true } },
                },
                orderBy: { scheduledStart: 'desc' },
            });
            return res.json(rows);
        }
        if (role === 'STUDENT') {
            const student = await getStudentId(userId);
            const rows = await prisma_1.default.virtualClassSession.findMany({
                where: {
                    status: { not: 'CANCELLED' },
                    OR: [{ classId: student?.classId ?? undefined }, { classId: null }],
                },
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                },
                orderBy: { scheduledStart: 'desc' },
            });
            return res.json(rows);
        }
        if (isStaffOrAdmin(role)) {
            const rows = await prisma_1.default.virtualClassSession.findMany({
                include: {
                    teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
                    class: { select: { id: true, name: true } },
                },
                orderBy: { scheduledStart: 'desc' },
            });
            return res.json(rows);
        }
        res.status(403).json({ error: 'Accès refusé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/virtual-sessions', (0, express_validator_1.body)('title').trim().notEmpty(), (0, express_validator_1.body)('scheduledStart').notEmpty(), async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        let teacherId = null;
        if (req.user.role === 'TEACHER') {
            teacherId = await getTeacherId(req.user.id);
            if (!teacherId)
                return res.status(404).json({ error: 'Profil enseignant introuvable' });
        }
        else {
            teacherId = req.body.teacherId;
            if (!teacherId)
                return res.status(400).json({ error: 'teacherId requis' });
        }
        const row = await prisma_1.default.virtualClassSession.create({
            data: {
                title: req.body.title,
                description: req.body.description ?? null,
                scheduledStart: new Date(req.body.scheduledStart),
                durationMinutes: Number(req.body.durationMinutes ?? 60),
                status: req.body.status ?? 'SCHEDULED',
                meetingUrl: req.body.meetingUrl ?? null,
                recordingUrl: req.body.recordingUrl ?? null,
                whiteboardUrl: req.body.whiteboardUrl ?? null,
                screenShareEnabled: req.body.screenShareEnabled !== false,
                chatEnabled: req.body.chatEnabled !== false,
                breakoutRoomsNotes: req.body.breakoutRoomsNotes ?? null,
                teacherId,
                elearningCourseId: req.body.elearningCourseId ?? null,
                courseId: req.body.courseId ?? null,
                classId: req.body.classId ?? null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.patch('/virtual-sessions/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.virtualClassSession.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Session introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        const row = await prisma_1.default.virtualClassSession.update({
            where: { id: req.params.id },
            data: {
                ...(req.body.title != null ? { title: req.body.title } : {}),
                ...(req.body.description !== undefined ? { description: req.body.description } : {}),
                ...(req.body.scheduledStart != null ? { scheduledStart: new Date(req.body.scheduledStart) } : {}),
                ...(req.body.durationMinutes != null ? { durationMinutes: Number(req.body.durationMinutes) } : {}),
                ...(req.body.status != null ? { status: req.body.status } : {}),
                ...(req.body.meetingUrl !== undefined ? { meetingUrl: req.body.meetingUrl } : {}),
                ...(req.body.recordingUrl !== undefined ? { recordingUrl: req.body.recordingUrl } : {}),
                ...(req.body.whiteboardUrl !== undefined ? { whiteboardUrl: req.body.whiteboardUrl } : {}),
                ...(req.body.screenShareEnabled !== undefined
                    ? { screenShareEnabled: Boolean(req.body.screenShareEnabled) }
                    : {}),
                ...(req.body.chatEnabled !== undefined ? { chatEnabled: Boolean(req.body.chatEnabled) } : {}),
                ...(req.body.breakoutRoomsNotes !== undefined
                    ? { breakoutRoomsNotes: req.body.breakoutRoomsNotes }
                    : {}),
            },
        });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/virtual-sessions/:id', async (req, res) => {
    try {
        if (!canManageElearning(req.user.role)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const existing = await prisma_1.default.virtualClassSession.findUnique({ where: { id: req.params.id } });
        if (!existing)
            return res.status(404).json({ error: 'Session introuvable' });
        if (req.user.role === 'TEACHER') {
            const teacherId = await getTeacherId(req.user.id);
            if (teacherId !== existing.teacherId)
                return res.status(403).json({ error: 'Accès refusé' });
        }
        await prisma_1.default.virtualClassSession.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=elearning.routes.js.map