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
const notify_important_util_1 = require("../utils/notify-important.util");
const parent_notify_util_1 = require("../utils/parent-notify.util");
const parent_teacher_appointment_util_1 = require("../utils/parent-teacher-appointment.util");
const attendance_punch_util_1 = require("../utils/attendance-punch.util");
const teacher_attendance_util_1 = require("../utils/teacher-attendance.util");
const evaluation_type_util_1 = require("../utils/evaluation-type.util");
const academic_change_request_util_1 = require("../utils/academic-change-request.util");
const report_card_util_1 = require("../utils/report-card.util");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('TEACHER'));
// Helper pour obtenir le teacherId depuis userId
const getTeacherId = async (userId) => {
    const teacher = await prisma_1.default.teacher.findUnique({
        where: { userId },
        select: { id: true },
    });
    return teacher?.id;
};
function parseTeacherAttendanceDate(raw) {
    if (typeof raw === 'string' && raw.trim()) {
        const value = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return new Date(`${value}T00:00:00`);
        }
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime()))
            return parsed;
    }
    return new Date();
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
        console.error('GET /teacher/notifications:', error);
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
        console.error('PUT /teacher/notifications/read-all:', error);
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
        console.error('PUT /teacher/notifications/:id/read:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/my-attendance', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const date = parseTeacherAttendanceDate(req.query.date);
        const attendanceDate = (0, teacher_attendance_util_1.toAttendanceDateKey)(date);
        const attendance = await prisma_1.default.teacherAttendance.findFirst({
            where: { teacherId, attendanceDate },
            orderBy: [{ checkInAt: 'desc' }, { updatedAt: 'desc' }],
        });
        res.json({ attendance, attendanceDate });
    }
    catch (error) {
        console.error('GET /teacher/my-attendance:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/my-attendance/mark-present', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const attendance = await (0, teacher_attendance_util_1.upsertTeacherAttendance)({
            teacherId,
            date: parseTeacherAttendanceDate(req.body?.date),
            source: 'SELF',
            recordedByUserId: req.user.id,
        });
        res.status(201).json({ attendance, attendanceDate: attendance.attendanceDate });
    }
    catch (error) {
        const statusCode = error?.statusCode ?? 500;
        console.error('POST /teacher/my-attendance/mark-present:', error);
        res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/dashboard/kpis', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const ninetyAgo = new Date();
        ninetyAgo.setDate(ninetyAgo.getDate() - 89);
        ninetyAgo.setHours(0, 0, 0, 0);
        const [gradesRecent, absencesCount, appointmentsPending, assignmentsCount, courses] = await Promise.all([
            prisma_1.default.grade.findMany({
                where: { teacherId, date: { gte: ninetyAgo } },
                select: { date: true, score: true, maxScore: true },
            }),
            prisma_1.default.absence.count({
                where: { teacherId, date: { gte: ninetyAgo } },
            }),
            prisma_1.default.parentTeacherAppointment.count({
                where: { teacherId, status: 'PENDING' },
            }),
            prisma_1.default.assignment.count({
                where: { teacherId, createdAt: { gte: ninetyAgo } },
            }),
            prisma_1.default.course.count({ where: { teacherId } }),
        ]);
        const byMonth = new Map();
        for (const g of gradesRecent) {
            const d = new Date(g.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const m20 = g.maxScore > 0 ? (g.score / g.maxScore) * 20 : 0;
            if (!byMonth.has(key))
                byMonth.set(key, { sum: 0, n: 0 });
            const b = byMonth.get(key);
            b.sum += m20;
            b.n += 1;
        }
        const gradesByMonth = [...byMonth.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, v]) => {
            const [y, mo] = month.split('-');
            return {
                month,
                label: `${mo}/${y}`,
                average20: v.n > 0 ? Math.round((v.sum / v.n) * 100) / 100 : null,
                gradesCount: v.n,
            };
        });
        let sum20 = 0;
        let n20 = 0;
        for (const g of gradesRecent) {
            if (g.maxScore <= 0)
                continue;
            sum20 += (g.score / g.maxScore) * 20;
            n20 += 1;
        }
        const avgGrade20Last90d = n20 > 0 ? Math.round((sum20 / n20) * 100) / 100 : null;
        res.json({
            generatedAt: new Date().toISOString(),
            cards: {
                coursesCount: courses,
                gradesRecorded90d: gradesRecent.length,
                averageGradeOn20Last90d: avgGrade20Last90d,
                attendanceRows90d: absencesCount,
                pendingParentAppointments: appointmentsPending,
                assignmentsCreated90d: assignmentsCount,
            },
            charts: { gradesByMonth },
        });
    }
    catch (e) {
        console.error('GET /teacher/dashboard/kpis:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ========== GESTION DES NOTES ==========
// Lister les notes d'un cours
router.get('/courses/:courseId/grades', async (req, res) => {
    try {
        const { courseId } = req.params;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const grades = await prisma_1.default.grade.findMany({
            where: {
                courseId,
                teacherId, // Vérifier que c'est bien le professeur du cours
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
                course: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
        res.json(grades);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer une note
router.post('/grades', [
    (0, express_validator_1.body)('studentId').notEmpty(),
    (0, express_validator_1.body)('courseId').notEmpty(),
    (0, express_validator_1.body)('evaluationType').isIn([...evaluation_type_util_1.EVALUATION_TYPE_VALUES]),
    (0, express_validator_1.body)('title').notEmpty(),
    (0, express_validator_1.body)('score').isFloat({ min: 0 }),
    (0, express_validator_1.body)('maxScore').isFloat({ min: 0 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { studentId, courseId, evaluationType, title, score, maxScore, coefficient, date, reportingPeriod, comments, } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que le professeur enseigne ce cours
        const course = await prisma_1.default.course.findFirst({
            where: {
                id: courseId,
                teacherId,
            },
        });
        if (!course) {
            return res.status(403).json({ error: 'Vous n\'enseignez pas ce cours' });
        }
        const gradeDate = date ? new Date(date) : new Date();
        const resolvedReportingPeriod = typeof reportingPeriod === 'string' && reportingPeriod.trim()
            ? reportingPeriod.trim()
            : (0, report_card_util_1.inferReportingPeriod)(gradeDate, (0, report_card_util_1.getCurrentAcademicYear)(gradeDate));
        const grade = await prisma_1.default.grade.create({
            data: {
                studentId,
                courseId,
                teacherId,
                evaluationType,
                title,
                score: parseFloat(score),
                maxScore: parseFloat(maxScore) || 20,
                coefficient: parseFloat(coefficient) || 1,
                date: gradeDate,
                reportingPeriod: resolvedReportingPeriod,
                comments: comments ?? null,
            },
            include: {
                student: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
                course: { select: { name: true, code: true } },
            },
        });
        res.status(201).json(grade);
    }
    catch (error) {
        const statusCode = error.statusCode ?? 500;
        res.status(statusCode).json({ error: error.message });
    }
});
// Mettre à jour une note
router.put('/grades/:id', async (req, res) => {
    try {
        const { title, score, maxScore, coefficient, comments } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const grade = await prisma_1.default.grade.findUnique({
            where: { id: req.params.id },
        });
        if (!grade || grade.teacherId !== teacherId) {
            return res.status(404).json({ error: 'Note non trouvée' });
        }
        const request = await (0, academic_change_request_util_1.createGradeChangeRequest)({
            kind: 'UPDATE',
            requestedByUserId: req.user.id,
            gradeId: grade.id,
            studentId: grade.studentId,
            previousPayload: (0, academic_change_request_util_1.gradeToPayload)(grade),
            payload: {
                studentId: grade.studentId,
                courseId: grade.courseId,
                teacherId: grade.teacherId,
                evaluationType: grade.evaluationType,
                title: title ?? grade.title,
                score: score !== undefined ? parseFloat(score) : grade.score,
                maxScore: maxScore !== undefined ? parseFloat(maxScore) : grade.maxScore,
                coefficient: coefficient !== undefined ? parseFloat(coefficient) : grade.coefficient,
                date: grade.date,
                comments: comments !== undefined ? comments : grade.comments,
            },
        });
        res.status(202).json({
            message: 'Demande de modification enregistrée. Validation en 3 étapes requise avant prise en compte.',
            request: {
                ...request,
                statusLabel: (0, academic_change_request_util_1.workflowStatusLabel)(request.status),
            },
        });
    }
    catch (error) {
        const statusCode = error.statusCode ?? 500;
        res.status(statusCode).json({ error: error.message });
    }
});
// Supprimer une note
router.delete('/grades/:id', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const grade = await prisma_1.default.grade.findUnique({
            where: { id: req.params.id },
        });
        if (!grade || grade.teacherId !== teacherId) {
            return res.status(404).json({ error: 'Note non trouvée' });
        }
        const request = await (0, academic_change_request_util_1.createGradeChangeRequest)({
            kind: 'DELETE',
            requestedByUserId: req.user.id,
            gradeId: grade.id,
            studentId: grade.studentId,
            previousPayload: (0, academic_change_request_util_1.gradeToPayload)(grade),
            payload: (0, academic_change_request_util_1.gradeToPayload)(grade),
        });
        res.status(202).json({
            message: 'Demande de suppression enregistrée. Validation en 3 étapes requise avant prise en compte.',
            request: {
                ...request,
                statusLabel: (0, academic_change_request_util_1.workflowStatusLabel)(request.status),
            },
        });
    }
    catch (error) {
        const statusCode = error.statusCode ?? 500;
        res.status(statusCode).json({ error: error.message });
    }
});
// ========== GESTION DES ABSENCES ==========
// Rechercher un élève par NFC ID (pour la prise de présence)
router.get('/students/nfc/:nfcId', async (req, res) => {
    try {
        const { nfcId } = req.params;
        const student = await prisma_1.default.student.findFirst({
            where: { nfcId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
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
        });
        if (!student) {
            return res.status(404).json({ error: 'Aucun élève trouvé avec cet ID NFC' });
        }
        res.json(student);
    }
    catch (error) {
        console.error('Error fetching student by NFC ID:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Enregistrer automatiquement la présence d'un étudiant via NFC
router.post('/absences/nfc-attendance', [
    (0, express_validator_1.body)('courseId').notEmpty(),
    (0, express_validator_1.body)('studentId').notEmpty(),
    (0, express_validator_1.body)('date').isISO8601(),
    (0, express_validator_1.body)('status').isIn(['PRESENT', 'ABSENT', 'LATE']),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { courseId, studentId, date, status } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que le professeur enseigne ce cours
        const course = await prisma_1.default.course.findFirst({
            where: {
                id: courseId,
                teacherId,
            },
        });
        if (!course) {
            return res.status(403).json({ error: 'Vous n\'enseignez pas ce cours' });
        }
        const punch = await (0, attendance_punch_util_1.punchStudentCourseAttendance)({
            studentId,
            courseId,
            teacherId,
            at: new Date(date),
            source: 'NFC',
            forceStatus: status,
        });
        const absence = await prisma_1.default.absence.findUnique({
            where: { id: punch.absence.id },
            include: {
                student: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
                    },
                },
            },
        });
        res.status(201).json({ ...absence, punchPhase: punch.punchPhase });
    }
    catch (error) {
        console.error('Error recording NFC attendance:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Initialiser la prise d'appel (marquer tous les élèves comme ABSENT)
router.post('/absences/init-attendance', [
    (0, express_validator_1.body)('courseId').notEmpty(),
    (0, express_validator_1.body)('date').isISO8601(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { courseId, date } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que le professeur enseigne ce cours
        const course = await prisma_1.default.course.findFirst({
            where: {
                id: courseId,
                teacherId,
            },
            include: {
                class: {
                    include: {
                        students: {
                            where: {
                                isActive: true,
                            },
                        },
                    },
                },
            },
        });
        if (!course) {
            return res.status(403).json({ error: 'Vous n\'enseignez pas ce cours' });
        }
        const students = course.class?.students || [];
        const attendanceDate = new Date(date);
        const startOfDay = new Date(attendanceDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        // Supprimer les pointages existants pour ce cours et cette date
        await prisma_1.default.absence.deleteMany({
            where: {
                courseId,
                date: { gte: startOfDay, lt: endOfDay },
            },
        });
        // Créer une absence ABSENT pour tous les élèves
        const absences = await Promise.all(students.map((student) => prisma_1.default.absence.create({
            data: {
                studentId: student.id,
                courseId,
                teacherId,
                date: attendanceDate,
                status: 'ABSENT',
                excused: false,
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
        })));
        res.status(201).json({
            message: `Prise d'appel initialisée: ${absences.length} élèves marqués comme absents`,
            absences,
            total: absences.length,
        });
    }
    catch (error) {
        console.error('Error initializing attendance:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Prendre l'appel (créer plusieurs absences)
router.post('/absences/take-attendance', [
    (0, express_validator_1.body)('courseId').notEmpty(),
    (0, express_validator_1.body)('date').isISO8601(),
    (0, express_validator_1.body)('attendance').isArray(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { courseId, date, attendance } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que le professeur enseigne ce cours
        const course = await prisma_1.default.course.findFirst({
            where: {
                id: courseId,
                teacherId,
            },
        });
        if (!course) {
            return res.status(403).json({ error: 'Vous n\'enseignez pas ce cours' });
        }
        const attendanceDate = new Date(date);
        const startOfDay = new Date(attendanceDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        // Supprimer les pointages existants pour ce cours et cette date (réécriture complète)
        await prisma_1.default.absence.deleteMany({
            where: {
                courseId,
                date: { gte: startOfDay, lt: endOfDay },
            },
        });
        // Créer les pointages (présent / absent / retard)
        const absences = await Promise.all(attendance.map((att) => prisma_1.default.absence.create({
            data: {
                studentId: att.studentId,
                courseId,
                teacherId,
                date: attendanceDate,
                status: att.status || 'ABSENT',
                reason: att.reason ?? undefined,
                excused: att.excused || false,
            },
        })));
        res.status(201).json(absences);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== GESTION DE LA CONDUITE (PROFESSEUR PRINCIPAL) ==========
// Obtenir les évaluations de conduite pour les élèves de mes classes
router.get('/conduct', async (req, res) => {
    try {
        const { period, academicYear } = req.query;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Récupérer les classes où je suis professeur principal
        const classes = await prisma_1.default.class.findMany({
            where: {
                teacherId,
            },
            include: {
                students: {
                    include: {
                        conducts: {
                            where: {
                                ...(period && { period: period }),
                                ...(academicYear && { academicYear: academicYear }),
                            },
                            include: {
                                evaluatedBy: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        role: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        // Extraire toutes les évaluations de conduite
        const conducts = classes.flatMap((cls) => cls.students.flatMap((student) => student.conducts));
        res.json(conducts);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des évaluations de conduite:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Créer ou mettre à jour une évaluation de conduite (Professeur principal)
router.post('/conduct', async (req, res) => {
    try {
        const { studentId, period, academicYear, punctuality, respect, participation, behavior, comments, } = req.body;
        if (!studentId || !period || !academicYear) {
            return res.status(400).json({ error: 'studentId, period et academicYear sont requis' });
        }
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que l'étudiant existe et que je suis son professeur principal
        const student = await prisma_1.default.student.findFirst({
            where: {
                id: studentId,
                class: {
                    teacherId,
                },
            },
            include: {
                class: true,
            },
        });
        if (!student) {
            return res.status(403).json({ error: 'Vous n\'êtes pas le professeur principal de cet élève' });
        }
        // Calculer la moyenne
        const avg = (parseFloat(punctuality || 0) + parseFloat(respect || 0) +
            parseFloat(participation || 0) + parseFloat(behavior || 0)) / 4;
        // Créer ou mettre à jour l'évaluation de conduite
        const conduct = await prisma_1.default.conduct.upsert({
            where: {
                studentId_period_academicYear: {
                    studentId,
                    period,
                    academicYear,
                },
            },
            update: {
                punctuality: parseFloat(punctuality || 0),
                respect: parseFloat(respect || 0),
                participation: parseFloat(participation || 0),
                behavior: parseFloat(behavior || 0),
                average: avg,
                comments: comments || null,
                evaluatedById: req.user.id,
                evaluatedByRole: 'TEACHER',
            },
            create: {
                studentId,
                period,
                academicYear,
                punctuality: parseFloat(punctuality || 0),
                respect: parseFloat(respect || 0),
                participation: parseFloat(participation || 0),
                behavior: parseFloat(behavior || 0),
                average: avg,
                comments: comments || null,
                evaluatedById: req.user.id,
                evaluatedByRole: 'TEACHER',
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
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
        res.status(201).json(conduct);
    }
    catch (error) {
        console.error('Erreur lors de la création/mise à jour de l\'évaluation de conduite:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Mettre à jour une évaluation de conduite (Professeur principal)
router.put('/conduct/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { punctuality, respect, participation, behavior, comments, } = req.body;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const conduct = await prisma_1.default.conduct.findFirst({
            where: {
                id,
                student: {
                    class: {
                        teacherId,
                    },
                },
            },
        });
        if (!conduct) {
            return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à modifier cette évaluation' });
        }
        // Calculer la nouvelle moyenne
        const avg = (parseFloat(punctuality || conduct.punctuality) +
            parseFloat(respect || conduct.respect) +
            parseFloat(participation || conduct.participation) +
            parseFloat(behavior || conduct.behavior)) / 4;
        const updatedConduct = await prisma_1.default.conduct.update({
            where: { id },
            data: {
                ...(punctuality !== undefined && { punctuality: parseFloat(punctuality) }),
                ...(respect !== undefined && { respect: parseFloat(respect) }),
                ...(participation !== undefined && { participation: parseFloat(participation) }),
                ...(behavior !== undefined && { behavior: parseFloat(behavior) }),
                average: avg,
                ...(comments !== undefined && { comments }),
                evaluatedById: req.user.id,
                evaluatedByRole: 'TEACHER',
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
                        id: true,
                        firstName: true,
                        lastName: true,
                        role: true,
                    },
                },
            },
        });
        res.json(updatedConduct);
    }
    catch (error) {
        console.error('Erreur lors de la mise à jour de l\'évaluation de conduite:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Lister les absences d'un cours
router.get('/courses/:courseId/absences', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { date } = req.query;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const absences = await prisma_1.default.absence.findMany({
            where: {
                courseId,
                teacherId,
                ...(date && {
                    date: {
                        gte: new Date(date),
                        lt: new Date(new Date(date).getTime() + 24 * 60 * 60 * 1000),
                    },
                }),
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
                course: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
        res.json(absences);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== CAHIER DE TEXTE (DEVOIRS) ==========
// Créer un devoir
router.post('/assignments', [
    (0, express_validator_1.body)('courseId').notEmpty(),
    (0, express_validator_1.body)('title').notEmpty(),
    (0, express_validator_1.body)('dueDate').isISO8601(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { courseId, title, description, dueDate, attachments } = req.body;
        const attachmentUrls = Array.isArray(attachments)
            ? attachments
                .filter((u) => typeof u === 'string' && u.trim().length > 0)
                .map((u) => u.trim())
                .slice(0, 10)
            : [];
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        // Vérifier que le professeur enseigne ce cours
        const course = await prisma_1.default.course.findFirst({
            where: {
                id: courseId,
                teacherId,
            },
            include: {
                class: {
                    include: {
                        students: true,
                    },
                },
            },
        });
        if (!course) {
            return res.status(403).json({ error: 'Vous n\'enseignez pas ce cours' });
        }
        const assignment = await prisma_1.default.assignment.create({
            data: {
                courseId,
                teacherId,
                title,
                description,
                dueDate: new Date(dueDate),
                attachments: attachmentUrls,
            },
            include: {
                course: true,
            },
        });
        // Créer les entrées pour chaque élève de la classe
        const classStudentIds = [];
        if (course.class?.students) {
            classStudentIds.push(...course.class.students.map((s) => s.id));
            await Promise.all(course.class.students.map((student) => prisma_1.default.studentAssignment.create({
                data: {
                    studentId: student.id,
                    assignmentId: assignment.id,
                },
            })));
        }
        if (classStudentIds.length > 0) {
            void (0, parent_notify_util_1.notifyParentsNewAssignment)({
                studentIds: classStudentIds,
                title,
                courseName: course.name,
                dueDate: new Date(dueDate),
            }).catch((err) => console.error('notifyParentsNewAssignment:', err));
        }
        res.status(201).json(assignment);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Lister les devoirs d'un cours
router.get('/courses/:courseId/assignments', async (req, res) => {
    try {
        const { courseId } = req.params;
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const assignments = await prisma_1.default.assignment.findMany({
            where: {
                courseId,
                teacherId,
            },
            include: {
                students: {
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
                },
            },
            orderBy: {
                dueDate: 'desc',
            },
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== MES COURS ==========
// Lister les cours de l'enseignant
router.get('/courses', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const courses = await prisma_1.default.course.findMany({
            where: {
                teacherId,
            },
            include: {
                class: {
                    include: {
                        students: {
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
                _count: {
                    select: {
                        grades: true,
                        absences: true,
                    },
                },
            },
        });
        res.json(courses);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== ESPACE PERSONNEL ENSEIGNANT ==========
const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
router.get('/profile', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: teacherId },
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
                classes: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                        academicYear: true,
                        room: true,
                    },
                },
                courses: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        description: true,
                        class: { select: { id: true, name: true, level: true } },
                    },
                },
            },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        res.json(teacher);
    }
    catch (error) {
        console.error('GET /teacher/profile:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/schedule', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const courses = await prisma_1.default.course.findMany({
            where: { teacherId },
            include: {
                class: { select: { id: true, name: true, level: true } },
                schedule: {
                    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                    include: {
                        substituteTeacher: {
                            include: {
                                user: {
                                    select: { firstName: true, lastName: true },
                                },
                            },
                        },
                    },
                },
            },
        });
        const replacementSlots = await prisma_1.default.schedule.findMany({
            where: { substituteTeacherId: teacherId },
            include: {
                course: {
                    include: {
                        class: { select: { id: true, name: true, level: true } },
                        teacher: {
                            include: {
                                user: { select: { firstName: true, lastName: true } },
                            },
                        },
                    },
                },
            },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        const courseSlots = courses.flatMap((c) => c.schedule.map((s) => ({
            id: s.id,
            courseId: c.id,
            courseName: c.name,
            courseCode: c.code,
            classId: c.class.id,
            className: c.class.name,
            classLevel: c.class.level,
            dayOfWeek: s.dayOfWeek,
            dayLabel: DAY_LABELS[s.dayOfWeek] ?? `J${s.dayOfWeek}`,
            dayShort: DAY_SHORT[s.dayOfWeek] ?? String(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            substituteTeacher: s.substituteTeacher
                ? {
                    id: s.substituteTeacher.id,
                    firstName: s.substituteTeacher.user?.firstName,
                    lastName: s.substituteTeacher.user?.lastName,
                }
                : null,
            isSubstitution: Boolean(s.substituteTeacherId),
        })));
        const replacementMapped = replacementSlots.map((s) => ({
            id: s.id,
            courseId: s.course.id,
            courseName: s.course.name,
            courseCode: s.course.code,
            classId: s.course.class.id,
            className: s.course.class.name,
            classLevel: s.course.class.level,
            dayOfWeek: s.dayOfWeek,
            dayLabel: DAY_LABELS[s.dayOfWeek] ?? `J${s.dayOfWeek}`,
            dayShort: DAY_SHORT[s.dayOfWeek] ?? String(s.dayOfWeek),
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            isSubstitution: true,
            titularTeacher: {
                id: s.course.teacher.id,
                firstName: s.course.teacher.user?.firstName,
                lastName: s.course.teacher.user?.lastName,
            },
        }));
        const slotsById = new Map();
        for (const slot of [...courseSlots, ...replacementMapped]) {
            if (!slotsById.has(slot.id)) {
                slotsById.set(slot.id, slot);
            }
        }
        const slots = [...slotsById.values()];
        slots.sort((a, b) => {
            if (a.dayOfWeek !== b.dayOfWeek)
                return a.dayOfWeek - b.dayOfWeek;
            return a.startTime.localeCompare(b.startTime);
        });
        res.json({ courses, slots });
    }
    catch (error) {
        console.error('GET /teacher/schedule:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/performance-reviews', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const reviews = await prisma_1.default.teacherPerformanceReview.findMany({
            where: { teacherId },
            orderBy: { createdAt: 'desc' },
        });
        res.json(reviews);
    }
    catch (error) {
        console.error('GET /teacher/performance-reviews:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/leaves', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const leaves = await prisma_1.default.teacherLeave.findMany({
            where: { teacherId },
            orderBy: { startDate: 'desc' },
        });
        res.json(leaves);
    }
    catch (error) {
        console.error('GET /teacher/leaves:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/leaves', [
    (0, express_validator_1.body)('type').isIn(['ANNUAL', 'SICK', 'PERSONAL', 'TRAINING', 'OTHER']),
    (0, express_validator_1.body)('startDate').isISO8601(),
    (0, express_validator_1.body)('endDate').isISO8601(),
    (0, express_validator_1.body)('reason').optional().isString().isLength({ max: 2000 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const { type, startDate, endDate, reason } = req.body;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end < start) {
            return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
        }
        const leave = await prisma_1.default.teacherLeave.create({
            data: {
                teacherId,
                type,
                startDate: start,
                endDate: end,
                reason: reason?.trim() || null,
            },
        });
        res.status(201).json(leave);
    }
    catch (error) {
        console.error('POST /teacher/leaves:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
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
        console.error('GET /teacher/messaging/messages:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
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
        console.error('GET /teacher/messaging/threads:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
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
        console.error('GET /teacher/messaging/thread:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/messaging/contacts', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const [admins, teachers, staffUsers, educators, courses] = await Promise.all([
            prisma_1.default.user.findMany({
                where: { role: 'ADMIN', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 80,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'TEACHER', isActive: true, id: { not: req.user.id } },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 200,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'STAFF', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 200,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'EDUCATOR', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 100,
            }),
            prisma_1.default.course.findMany({
                where: { teacherId },
                select: {
                    class: {
                        select: {
                            id: true,
                            name: true,
                            level: true,
                            students: {
                                where: { isActive: true },
                                select: {
                                    parents: {
                                        select: {
                                            parent: {
                                                select: {
                                                    user: {
                                                        select: { id: true, firstName: true, lastName: true, email: true, role: true },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        const parentMap = new Map();
        for (const c of courses) {
            const cl = c.class;
            if (!cl)
                continue;
            for (const st of cl.students) {
                for (const sp of st.parents) {
                    const u = sp.parent.user;
                    if (!parentMap.has(u.id)) {
                        parentMap.set(u.id, { ...u, _label: `Parent — ${cl.name}` });
                    }
                }
            }
        }
        res.json({
            admins,
            teachers,
            staff: staffUsers,
            educators,
            parents: [...parentMap.values()],
        });
    }
    catch (error) {
        console.error('GET /teacher/messaging/contacts:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/messaging/send', async (req, res) => {
    try {
        const { receiverId, subject, content, category, threadKey, attachmentUrls, broadcastClassId, } = req.body;
        const { createInternalPlatformMessage, teacherTeachesClass, makeDmThreadKey, isPlatformMessagingRole, } = await import('../utils/internal-messaging.util');
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
            const okClass = await teacherTeachesClass(req.user.id, classId);
            if (!okClass) {
                return res.status(403).json({ error: 'Vous n’enseignez pas dans cette classe.' });
            }
            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ error: 'Contenu requis' });
            }
            const students = await prisma_1.default.student.findMany({
                where: { classId, isActive: true },
                select: {
                    parents: { select: { parent: { select: { userId: true } } } },
                },
            });
            const parentUserIds = [
                ...new Set(students.flatMap((s) => s.parents.map((p) => p.parent.userId))),
            ];
            if (parentUserIds.length === 0) {
                return res.status(400).json({ error: 'Aucun parent à notifier dans cette classe.' });
            }
            const batchKey = `class_${classId}_${Date.now()}`;
            const created = [];
            for (const pid of parentUserIds) {
                const msg = await createInternalPlatformMessage({
                    senderId: req.user.id,
                    receiverId: pid,
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
            return res.status(400).json({ error: 'Destinataire non autorisé pour la messagerie enseignant.' });
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
        console.error('POST /teacher/messaging/send:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
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
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// --- Rendez-vous parents-enseignants ---
router.get('/appointments', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const rows = await prisma_1.default.parentTeacherAppointment.findMany({
            where: { teacherId },
            orderBy: { scheduledStart: 'asc' },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        res.json(rows.map(student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow));
    }
    catch (error) {
        console.error('GET /teacher/appointments:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/appointments/:id/confirm', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const { id } = req.params;
        const { notesTeacher } = req.body;
        const existing = await prisma_1.default.parentTeacherAppointment.findFirst({
            where: { id, teacherId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rendez-vous introuvable.' });
        }
        if (existing.status !== 'PENDING') {
            return res.status(400).json({ error: 'Seules les demandes en attente peuvent être confirmées.' });
        }
        const updated = await prisma_1.default.parentTeacherAppointment.update({
            where: { id },
            data: {
                status: 'CONFIRMED',
                notesTeacher: notesTeacher?.trim() || null,
                declineReason: null,
                reminder24hSentAt: null,
                reminder1hSentAt: null,
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const parentUser = await prisma_1.default.parent.findUnique({
            where: { id: updated.parentId },
            select: { userId: true },
        });
        if (parentUser?.userId) {
            const when = updated.scheduledStart.toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            await (0, notify_important_util_1.notifyUsersImportant)([parentUser.userId], {
                type: 'appointment',
                title: 'Rendez-vous confirmé',
                content: `Votre entretien avec l’enseignant est confirmé pour le ${when}.`,
                link: '/parent?tab=appointments',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(updated));
    }
    catch (error) {
        console.error('PUT /teacher/appointments/:id/confirm:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/appointments/:id/decline', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const { id } = req.params;
        const { reason } = req.body;
        const existing = await prisma_1.default.parentTeacherAppointment.findFirst({
            where: { id, teacherId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rendez-vous introuvable.' });
        }
        if (existing.status !== 'PENDING') {
            return res.status(400).json({ error: 'Seules les demandes en attente peuvent être refusées.' });
        }
        const updated = await prisma_1.default.parentTeacherAppointment.update({
            where: { id },
            data: {
                status: 'DECLINED',
                declineReason: reason?.trim() || null,
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const parentUser = await prisma_1.default.parent.findUnique({
            where: { id: updated.parentId },
            select: { userId: true },
        });
        if (parentUser?.userId) {
            await (0, notify_important_util_1.notifyUsersImportant)([parentUser.userId], {
                type: 'appointment',
                title: 'Rendez-vous non retenu',
                content: reason?.trim()
                    ? `L’enseignant a décliné la proposition. Motif : ${reason.trim()}`
                    : 'L’enseignant a décliné la proposition de rendez-vous.',
                link: '/parent?tab=appointments',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(updated));
    }
    catch (error) {
        console.error('PUT /teacher/appointments/:id/decline:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/appointments/:id/cancel', async (req, res) => {
    try {
        const teacherId = await getTeacherId(req.user.id);
        if (!teacherId) {
            return res.status(404).json({ error: 'Profil enseignant non trouvé' });
        }
        const { id } = req.params;
        const existing = await prisma_1.default.parentTeacherAppointment.findFirst({
            where: { id, teacherId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rendez-vous introuvable.' });
        }
        if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'Ce rendez-vous ne peut plus être annulé.' });
        }
        const updated = await prisma_1.default.parentTeacherAppointment.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledBy: 'TEACHER',
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const parentUser = await prisma_1.default.parent.findUnique({
            where: { id: updated.parentId },
            select: { userId: true },
        });
        if (parentUser?.userId) {
            await (0, notify_important_util_1.notifyUsersImportant)([parentUser.userId], {
                type: 'appointment',
                title: 'Rendez-vous annulé',
                content: 'L’enseignant a annulé le rendez-vous.',
                link: '/parent?tab=appointments',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(updated));
    }
    catch (error) {
        console.error('PUT /teacher/appointments/:id/cancel:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=teacher.routes.js.map