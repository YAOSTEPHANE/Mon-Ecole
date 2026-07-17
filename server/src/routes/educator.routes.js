"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const student_sensitive_crypto_util_1 = require("../utils/student-sensitive-crypto.util");
const safe_schedule_query_util_1 = require("../utils/safe-schedule-query.util");
const educator_class_assignment_util_1 = require("../utils/educator-class-assignment.util");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('EDUCATOR'));
// Helper pour obtenir le educatorId depuis userId
const getEducatorId = async (userId) => {
    const educator = await prisma_1.default.educator.findUnique({
        where: { userId },
        select: { id: true },
    });
    return educator?.id;
};
async function resolveEducatorClassScope(userId) {
    return (0, educator_class_assignment_util_1.getAssignedClassIdsForUserId)(userId);
}
router.get('/notifications', async (req, res) => {
    try {
        const notifications = await prisma_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(notifications);
    }
    catch (error) {
        console.error('GET /educator/notifications:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/notifications/read-all', async (req, res) => {
    try {
        await prisma_1.default.notification.updateMany({
            where: { userId: req.user.id, read: false },
            data: { read: true, readAt: new Date() },
        });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('PUT /educator/notifications/read-all:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/notifications/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        const notification = await prisma_1.default.notification.update({
            where: { id },
            data: { read: true, readAt: new Date() },
        });
        res.json(notification);
    }
    catch (error) {
        console.error('PUT /educator/notifications/:id/read:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// ========== PROFIL ÉDUCATEUR ==========
// Obtenir le profil de l'éducateur
router.get('/profile', async (req, res) => {
    try {
        const educator = await prisma_1.default.educator.findUnique({
            where: { userId: req.user.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
        });
        if (!educator) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const assignedClasses = educator.classAssignments.map((a) => a.class);
        res.json({ ...educator, assignedClasses });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Mettre à jour le profil de l'éducateur
router.put('/profile', [
    (0, express_validator_1.body)('phone').optional().isString(),
    (0, express_validator_1.body)('avatar').optional().isString(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { phone, avatar } = req.body;
        // Mettre à jour l'utilisateur
        const updatedUser = await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: {
                ...(phone !== undefined && { phone }),
                ...(avatar !== undefined && { avatar }),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
            },
        });
        res.json(updatedUser);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== GESTION DES ÉLÈVES ==========
// Lister tous les élèves (filtre optionnel par classe)
router.get('/students', async (req, res) => {
    try {
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const { classId } = req.query;
        const requestedClassId = classId && typeof classId === 'string' && classId.trim() ? classId.trim() : null;
        if (requestedClassId && !classIds.includes(requestedClassId)) {
            return res.json([]);
        }
        const students = await prisma_1.default.student.findMany({
            where: {
                ...(0, educator_class_assignment_util_1.studentClassFilter)(classIds),
                ...(requestedClassId ? { classId: requestedClassId } : {}),
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                    },
                },
            },
            orderBy: {
                user: {
                    lastName: 'asc',
                },
            },
        });
        res.json(students.map((s) => (0, student_sensitive_crypto_util_1.decryptStudentRecord)(s)));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir les détails d'un élève
router.get('/students/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        if (classIds.length === 0) {
            return res.status(403).json({
                error: 'Aucune classe ne vous est assignée. Demandez à l’administration de configurer votre périmètre.',
            });
        }
        const student = await prisma_1.default.student.findFirst({
            where: {
                id: studentId,
                ...(0, educator_class_assignment_util_1.studentClassFilter)(classIds),
            },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                class: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
                absences: {
                    include: {
                        course: true,
                        teacher: {
                            include: {
                                user: {
                                    select: {
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                    orderBy: {
                        date: 'desc',
                    },
                    take: 10,
                },
                conducts: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                    take: 5,
                },
                grades: {
                    include: {
                        course: true,
                    },
                    orderBy: {
                        date: 'desc',
                    },
                    take: 10,
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        grades: true,
                        absences: true,
                    },
                },
            },
        });
        if (!student) {
            return res.status(404).json({
                error: 'Élève introuvable ou hors de vos classes assignées.',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptStudentRecord)(student));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== GESTION DE LA CONDUITE ==========
// Lister les évaluations de conduite
router.get('/conducts', async (req, res) => {
    try {
        const educatorId = await getEducatorId(req.user.id);
        if (!educatorId) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const { studentId, period, academicYear } = req.query;
        const conducts = await prisma_1.default.conduct.findMany({
            where: {
                ...(studentId && { studentId: studentId }),
                ...(period && { period: period }),
                ...(academicYear && { academicYear: academicYear }),
                evaluatedByRole: 'EDUCATOR',
                evaluatedById: req.user.id,
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        class: {
                            select: {
                                name: true,
                                level: true,
                            },
                        },
                    },
                },
                evaluatedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(conducts);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer ou mettre à jour une évaluation de conduite
router.post('/conducts', [
    (0, express_validator_1.body)('studentId').notEmpty().withMessage('ID élève requis'),
    (0, express_validator_1.body)('period').notEmpty().withMessage('Période requise'),
    (0, express_validator_1.body)('academicYear').notEmpty().withMessage('Année scolaire requise'),
    (0, express_validator_1.body)('punctuality').isFloat({ min: 0, max: 20 }).withMessage('Assiduité entre 0 et 20'),
    (0, express_validator_1.body)('respect').isFloat({ min: 0, max: 20 }).withMessage('Tenue vestimentaire entre 0 et 20'),
    (0, express_validator_1.body)('behavior').isFloat({ min: 0, max: 20 }).withMessage('Comportement entre 0 et 20'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const educatorId = await getEducatorId(req.user.id);
        if (!educatorId) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const { studentId, period, academicYear, punctuality, respect, behavior, comments, } = req.body;
        const inScope = await (0, educator_class_assignment_util_1.isStudentInEducatorScope)(req.user.id, studentId);
        if (!inScope) {
            return res.status(403).json({ error: 'Élève hors de votre périmètre de classes' });
        }
        const average = (punctuality + respect + behavior) / 3;
        // Vérifier si une évaluation existe déjà
        const existingConduct = await prisma_1.default.conduct.findUnique({
            where: {
                studentId_period_academicYear: {
                    studentId,
                    period,
                    academicYear,
                },
            },
        });
        let conduct;
        if (existingConduct) {
            // Mettre à jour l'évaluation existante
            conduct = await prisma_1.default.conduct.update({
                where: { id: existingConduct.id },
                data: {
                    punctuality,
                    respect,
                    participation: 0,
                    behavior,
                    average,
                    comments,
                    evaluatedById: req.user.id,
                    evaluatedByRole: 'EDUCATOR',
                },
                include: {
                    student: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });
        }
        else {
            // Créer une nouvelle évaluation
            conduct = await prisma_1.default.conduct.create({
                data: {
                    studentId,
                    period,
                    academicYear,
                    punctuality,
                    respect,
                    participation: 0,
                    behavior,
                    average,
                    comments,
                    evaluatedById: req.user.id,
                    evaluatedByRole: 'EDUCATOR',
                },
                include: {
                    student: {
                        include: {
                            user: {
                                select: {
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    },
                },
            });
        }
        res.status(201).json(conduct);
    }
    catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'Une évaluation existe déjà pour cette période' });
        }
        res.status(500).json({ error: error.message });
    }
});
// Obtenir une évaluation de conduite spécifique
router.get('/conducts/:conductId', async (req, res) => {
    try {
        const { conductId } = req.params;
        const conduct = await prisma_1.default.conduct.findUnique({
            where: { id: conductId },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        class: {
                            select: {
                                name: true,
                                level: true,
                            },
                        },
                    },
                },
                evaluatedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!conduct) {
            return res.status(404).json({ error: 'Évaluation de conduite non trouvée' });
        }
        // Vérifier que l'éducateur a le droit de voir cette évaluation
        if (conduct.evaluatedByRole !== 'EDUCATOR' || conduct.evaluatedById !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        res.json(conduct);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Mettre à jour une évaluation de conduite
router.put('/conducts/:conductId', [
    (0, express_validator_1.body)('punctuality').optional().isFloat({ min: 0, max: 20 }),
    (0, express_validator_1.body)('respect').optional().isFloat({ min: 0, max: 20 }),
    (0, express_validator_1.body)('behavior').optional().isFloat({ min: 0, max: 20 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { conductId } = req.params;
        const { punctuality, respect, behavior, comments } = req.body;
        // Vérifier que l'évaluation existe et appartient à cet éducateur
        const existingConduct = await prisma_1.default.conduct.findUnique({
            where: { id: conductId },
        });
        if (!existingConduct) {
            return res.status(404).json({ error: 'Évaluation de conduite non trouvée' });
        }
        if (existingConduct.evaluatedByRole !== 'EDUCATOR' || existingConduct.evaluatedById !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        // Calculer la nouvelle moyenne si les notes changent
        const newPunctuality = punctuality !== undefined ? punctuality : existingConduct.punctuality;
        const newRespect = respect !== undefined ? respect : existingConduct.respect;
        const newBehavior = behavior !== undefined ? behavior : existingConduct.behavior;
        const average = (newPunctuality + newRespect + newBehavior) / 3;
        const updatedConduct = await prisma_1.default.conduct.update({
            where: { id: conductId },
            data: {
                ...(punctuality !== undefined && { punctuality }),
                ...(respect !== undefined && { respect }),
                participation: 0,
                ...(behavior !== undefined && { behavior }),
                average,
                ...(comments !== undefined && { comments }),
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(updatedConduct);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.delete('/conducts/:conductId', async (req, res) => {
    try {
        const { conductId } = req.params;
        const existingConduct = await prisma_1.default.conduct.findUnique({
            where: { id: conductId },
            select: {
                id: true,
                evaluatedByRole: true,
                evaluatedById: true,
            },
        });
        if (!existingConduct) {
            return res.status(404).json({ error: 'Évaluation de conduite non trouvée' });
        }
        if (existingConduct.evaluatedByRole !== 'EDUCATOR' ||
            existingConduct.evaluatedById !== req.user.id) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        await prisma_1.default.conduct.delete({
            where: { id: conductId },
        });
        res.json({ message: 'Évaluation supprimée avec succès' });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== STATISTIQUES ==========
// Obtenir les statistiques de l'éducateur
router.get('/stats', async (req, res) => {
    try {
        const educatorId = await getEducatorId(req.user.id);
        if (!educatorId) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const totalStudents = await prisma_1.default.student.count({
            where: (0, educator_class_assignment_util_1.studentClassFilter)(classIds),
        });
        const totalConducts = await prisma_1.default.conduct.count({
            where: {
                evaluatedByRole: 'EDUCATOR',
                evaluatedById: req.user.id,
            },
        });
        const recentConducts = await prisma_1.default.conduct.count({
            where: {
                evaluatedByRole: 'EDUCATOR',
                evaluatedById: req.user.id,
                createdAt: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 derniers jours
                },
            },
        });
        res.json({
            totalStudents,
            totalConducts,
            recentConducts,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
// ========== CLASSES, ENSEIGNANTS, PARENTS ==========
router.get('/classes', async (req, res) => {
    try {
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const classes = await prisma_1.default.class.findMany({
            where: (0, educator_class_assignment_util_1.classIdFilter)(classIds),
            include: {
                teacher: {
                    include: {
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
                _count: { select: { students: true, courses: true } },
            },
            orderBy: [{ level: 'asc' }, { name: 'asc' }],
        });
        res.json(classes);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/teachers', async (req, res) => {
    try {
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const teachers = await prisma_1.default.teacher.findMany({
            where: classIds.length === 0
                ? { id: { in: [] } }
                : {
                    OR: [
                        { classes: { some: { id: { in: classIds } } } },
                        { courses: { some: { classId: { in: classIds } } } },
                    ],
                },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                classes: { select: { id: true, name: true, level: true } },
                courses: { select: { id: true, name: true, code: true, classId: true } },
            },
            orderBy: { user: { lastName: 'asc' } },
        });
        res.json(teachers);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/parents', async (req, res) => {
    try {
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const { classId } = req.query;
        const classFilter = classId && typeof classId === 'string' && classId.trim() ? classId.trim() : null;
        if (classFilter && !classIds.includes(classFilter)) {
            return res.json([]);
        }
        const scopeClassIds = classFilter ? [classFilter] : classIds;
        const parents = await prisma_1.default.parent.findMany({
            where: scopeClassIds.length === 0
                ? { id: { in: [] } }
                : {
                    students: {
                        some: {
                            student: { classId: { in: scopeClassIds }, isActive: true },
                        },
                    },
                },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                students: {
                    include: {
                        student: {
                            include: {
                                user: { select: { firstName: true, lastName: true } },
                                class: { select: { id: true, name: true, level: true } },
                            },
                        },
                    },
                },
                _count: { select: { students: true } },
            },
            orderBy: { user: { lastName: 'asc' } },
        });
        res.json(parents);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// ========== EMPLOIS DU TEMPS (lecture seule) ==========
router.get('/schedules', async (req, res) => {
    try {
        const classIds = await resolveEducatorClassScope(req.user.id);
        if (classIds === null) {
            return res.status(404).json({ error: 'Profil éducateur non trouvé' });
        }
        const { classId, teacherId } = req.query;
        const requestedClassId = classId && typeof classId === 'string' && classId.trim() ? classId.trim() : null;
        if (requestedClassId && !classIds.includes(requestedClassId)) {
            return res.json({ slots: [] });
        }
        const where = {
            classId: requestedClassId
                ? requestedClassId
                : classIds.length > 0
                    ? { in: classIds }
                    : { in: [] },
            ...(teacherId && typeof teacherId === 'string' && teacherId.trim()
                ? {
                    OR: [
                        { course: { teacherId: teacherId.trim() } },
                        { substituteTeacherId: teacherId.trim() },
                    ],
                }
                : {}),
        };
        const schedules = await (0, safe_schedule_query_util_1.findSchedulesWithRelations)(where);
        const slots = schedules.map((s) => ({
            id: s.id,
            courseId: s.course.id,
            courseName: s.course.name,
            courseCode: s.course.code,
            classId: s.class.id,
            className: s.class.name,
            classLevel: s.class.level,
            teacherId: s.course.teacher?.id ?? null,
            teacherName: s.course.teacher
                ? `${s.course.teacher.user.firstName} ${s.course.teacher.user.lastName}`.trim()
                : 'Non assigné',
            dayOfWeek: s.dayOfWeek,
            dayLabel: DAY_LABELS[s.dayOfWeek] ?? `J${s.dayOfWeek}`,
            dayShort: DAY_SHORT[s.dayOfWeek] ?? String(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            substituteTeacher: s.substituteTeacher
                ? {
                    id: s.substituteTeacher.id,
                    firstName: s.substituteTeacher.user.firstName,
                    lastName: s.substituteTeacher.user.lastName,
                }
                : null,
        }));
        res.json({ slots });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// ========== MESSAGERIE INTERNE ==========
router.get('/messaging/messages', async (req, res) => {
    try {
        const { unread } = req.query;
        const receivedWhere = { receiverId: req.user.id };
        if (unread === 'true')
            receivedWhere.read = false;
        const [received, sent] = await Promise.all([
            prisma_1.default.message.findMany({
                where: receivedWhere,
                include: {
                    sender: {
                        select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
            prisma_1.default.message.findMany({
                where: { senderId: req.user.id },
                include: {
                    receiver: {
                        select: { id: true, firstName: true, lastName: true, email: true, avatar: true, role: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 200,
            }),
        ]);
        res.json({ received, sent });
    }
    catch (error) {
        console.error('GET /educator/messaging/messages:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/messaging/threads', async (req, res) => {
    try {
        const uid = req.user.id;
        const rows = await prisma_1.default.message.findMany({
            where: {
                OR: [{ senderId: uid }, { receiverId: uid }],
            },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, role: true } },
                receiver: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 500,
        });
        const { effectiveThreadKey } = await import('../utils/internal-messaging.util');
        const map = new Map();
        for (const m of rows) {
            const key = effectiveThreadKey(m);
            const peer = m.senderId === uid ? m.receiver : m.sender;
            const peerName = `${peer.firstName} ${peer.lastName}`.trim();
            const existing = map.get(key);
            const unreadInc = m.receiverId === uid && !m.read ? 1 : 0;
            if (!existing) {
                map.set(key, {
                    threadKey: key,
                    lastAt: m.createdAt,
                    lastPreview: m.content.slice(0, 160),
                    peerId: peer.id,
                    peerName,
                    peerRole: peer.role,
                    unread: unreadInc,
                });
            }
            else {
                existing.unread += unreadInc;
            }
        }
        res.json({ threads: [...map.values()].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()) });
    }
    catch (error) {
        console.error('GET /educator/messaging/threads:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/messaging/thread', async (req, res) => {
    try {
        const threadKey = typeof req.query.threadKey === 'string' ? req.query.threadKey.trim() : '';
        if (!threadKey) {
            return res.status(400).json({ error: 'threadKey requis' });
        }
        const uid = req.user.id;
        let list = await prisma_1.default.message.findMany({
            where: {
                threadKey,
                OR: [{ senderId: uid }, { receiverId: uid }],
            },
            include: {
                sender: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
                receiver: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
            },
            orderBy: { createdAt: 'asc' },
            take: 300,
        });
        if (list.length === 0 && threadKey.startsWith('dm_')) {
            const rest = threadKey.slice(3);
            const parts = rest.split('__');
            if (parts.length === 2 && parts[0] && parts[1]) {
                const [a, b] = parts[0] < parts[1] ? [parts[0], parts[1]] : [parts[1], parts[0]];
                if (a === uid || b === uid) {
                    list = await prisma_1.default.message.findMany({
                        where: {
                            threadKey: null,
                            OR: [
                                { senderId: a, receiverId: b },
                                { senderId: b, receiverId: a },
                            ],
                        },
                        include: {
                            sender: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
                            receiver: { select: { id: true, firstName: true, lastName: true, role: true, avatar: true } },
                        },
                        orderBy: { createdAt: 'asc' },
                        take: 300,
                    });
                }
            }
        }
        res.json({ threadKey, messages: list });
    }
    catch (error) {
        console.error('GET /educator/messaging/thread:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/messaging/contacts', async (req, res) => {
    try {
        const [admins, teachers, educators, parents, students] = await Promise.all([
            prisma_1.default.user.findMany({
                where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 80,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'TEACHER', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 300,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'EDUCATOR', isActive: true, id: { not: req.user.id } },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 80,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'PARENT', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 500,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'STUDENT', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 500,
            }),
        ]);
        res.json({ admins, teachers, educators, parents, students });
    }
    catch (error) {
        console.error('GET /educator/messaging/contacts:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/messaging/send', async (req, res) => {
    try {
        const { receiverId, subject, content, category, threadKey, attachmentUrls, broadcastClassId, broadcastAudience, } = req.body;
        const { createInternalPlatformMessage, makeDmThreadKey, isPlatformMessagingRole } = await import('../utils/internal-messaging.util');
        const validCategories = [
            'GENERAL',
            'ACADEMIC',
            'ABSENCE',
            'PAYMENT',
            'CONDUCT',
            'URGENT',
            'ANNOUNCEMENT',
        ];
        const cat = category && validCategories.includes(category)
            ? category
            : 'GENERAL';
        if (broadcastClassId && typeof broadcastClassId === 'string' && broadcastClassId.trim()) {
            const classId = broadcastClassId.trim();
            const allowed = await (0, educator_class_assignment_util_1.isClassInEducatorScope)(req.user.id, classId);
            if (!allowed) {
                return res.status(403).json({ error: 'Classe hors de votre périmètre' });
            }
            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ error: 'Contenu requis' });
            }
            const audience = broadcastAudience ?? 'all';
            const students = await prisma_1.default.student.findMany({
                where: { classId, isActive: true },
                select: {
                    userId: true,
                    parents: { select: { parent: { select: { userId: true } } } },
                },
            });
            const targetUserIds = new Set();
            if (audience === 'parents' || audience === 'all') {
                for (const st of students) {
                    for (const p of st.parents) {
                        targetUserIds.add(p.parent.userId);
                    }
                }
            }
            if (audience === 'students' || audience === 'all') {
                for (const st of students) {
                    targetUserIds.add(st.userId);
                }
            }
            if (targetUserIds.size === 0) {
                return res.status(400).json({ error: 'Aucun destinataire dans cette classe.' });
            }
            const batchKey = `class_${classId}_${Date.now()}`;
            const created = [];
            for (const uid of targetUserIds) {
                const msg = await createInternalPlatformMessage({
                    senderId: req.user.id,
                    receiverId: uid,
                    subject: subject?.trim() || null,
                    content: content.trim(),
                    category: cat,
                    threadKey: batchKey,
                    attachmentUrls,
                });
                created.push(msg.id);
            }
            return res.status(201).json({ ok: true, count: created.length, threadKey: batchKey, messageIds: created });
        }
        if (!receiverId || typeof receiverId !== 'string' || !receiverId.trim()) {
            return res.status(400).json({ error: 'receiverId requis (ou broadcastClassId).' });
        }
        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Contenu requis' });
        }
        const recv = await prisma_1.default.user.findUnique({
            where: { id: receiverId.trim() },
            select: { id: true, role: true, isActive: true },
        });
        if (!recv || !recv.isActive) {
            return res.status(404).json({ error: 'Destinataire introuvable' });
        }
        if (!isPlatformMessagingRole(recv.role)) {
            return res.status(400).json({ error: 'Destinataire non autorisé pour la messagerie éducateur.' });
        }
        const tk = threadKey && String(threadKey).trim().length > 0
            ? String(threadKey).trim()
            : makeDmThreadKey(req.user.id, recv.id);
        const msg = await createInternalPlatformMessage({
            senderId: req.user.id,
            receiverId: recv.id,
            subject: subject?.trim() || null,
            content: content.trim(),
            category: cat,
            threadKey: tk,
            attachmentUrls,
        });
        res.status(201).json(msg);
    }
    catch (error) {
        console.error('POST /educator/messaging/send:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/messaging/:id/read', async (req, res) => {
    try {
        const existing = await prisma_1.default.message.findFirst({
            where: { id: req.params.id, receiverId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Message introuvable' });
        }
        const message = await prisma_1.default.message.update({
            where: { id: existing.id },
            data: { read: true, readAt: new Date() },
        });
        res.json(message);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=educator.routes.js.map