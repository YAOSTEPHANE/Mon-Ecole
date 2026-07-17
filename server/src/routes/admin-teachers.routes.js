"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_user_initial_password_util_1 = require("../utils/admin-user-initial-password.util");
const password_util_1 = require("../utils/password.util");
const upload_persist_util_1 = require("../utils/upload-persist.util");
const attendance_punch_util_1 = require("../utils/attendance-punch.util");
const timetable_constraints_util_1 = require("../utils/timetable-constraints.util");
const teacher_engagement_kind_util_1 = require("../utils/teacher-engagement-kind.util");
const hours_summary_util_1 = require("../utils/hours-summary.util");
const router = express_1.default.Router();
// Rechercher un enseignant par NFC ID
router.get('/teachers/nfc/:nfcId', async (req, res) => {
    try {
        const { nfcId } = req.params;
        const teacher = await prisma_1.default.teacher.findFirst({
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
                classes: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                    },
                },
                courses: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Aucun enseignant trouvé avec cet ID NFC' });
        }
        res.json(teacher);
    }
    catch (error) {
        console.error('Error fetching teacher by NFC ID:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Enregistrer la présence d'un enseignant via NFC (arrivée + départ auto + heures)
router.post('/teachers/nfc-attendance', async (req, res) => {
    try {
        const { teacherId, date, courseId } = req.body;
        if (!teacherId || !date) {
            return res.status(400).json({ error: 'teacherId et date sont requis' });
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: teacherId },
            include: {
                user: { select: { firstName: true, lastName: true } },
            },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const punch = await (0, attendance_punch_util_1.punchTeacherCourseAttendance)({
            teacherId,
            at: new Date(date),
            source: 'ADMIN',
            courseId: courseId || undefined,
            recordedByUserId: req.user.id,
        });
        res.status(201).json({
            message: 'Pointage enseignant enregistré',
            punchPhase: punch.punchPhase,
            attendance: punch.attendance,
        });
    }
    catch (error) {
        const statusCode = error?.statusCode ?? 500;
        console.error('Error recording teacher NFC attendance:', error);
        res.status(statusCode).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
// Historique pointages enseignants (par session de cours)
router.get('/teachers/attendance', async (req, res) => {
    try {
        const { teacherId, from, to } = req.query;
        const where = {};
        if (teacherId && typeof teacherId === 'string')
            where.teacherId = teacherId;
        if (from && typeof from === 'string') {
            where.attendanceDate = { ...where.attendanceDate, gte: from.slice(0, 10) };
        }
        if (to && typeof to === 'string') {
            where.attendanceDate = { ...where.attendanceDate, lte: to.slice(0, 10) };
        }
        const rows = await prisma_1.default.teacherAttendance.findMany({
            where,
            orderBy: [{ attendanceDate: 'desc' }, { updatedAt: 'desc' }],
            include: {
                teacher: {
                    include: {
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
        const courseIds = [...new Set(rows.map((r) => r.courseId).filter(Boolean))];
        const courses = courseIds.length > 0
            ? await prisma_1.default.course.findMany({
                where: { id: { in: courseIds } },
                select: { id: true, name: true, code: true },
            })
            : [];
        const courseMap = new Map(courses.map((c) => [c.id, c]));
        res.json(rows.map((r) => ({
            ...r,
            course: r.courseId ? courseMap.get(r.courseId) ?? null : null,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Décompte des heures enseignées par jour / semaine / mois. */
router.get('/teachers/attendance/summary', async (req, res) => {
    try {
        const teacherId = typeof req.query.teacherId === 'string' ? req.query.teacherId.trim() : '';
        const from = typeof req.query.from === 'string' ? req.query.from.trim().slice(0, 10) : '';
        const to = typeof req.query.to === 'string' ? req.query.to.trim().slice(0, 10) : '';
        const groupBy = (0, hours_summary_util_1.parseHoursGroupBy)(req.query.groupBy);
        if (!from || !to) {
            return res.status(400).json({ error: 'Paramètres from et to requis (YYYY-MM-DD)' });
        }
        const where = {
            attendanceDate: { gte: from, lte: to },
            ...(teacherId ? { teacherId } : {}),
        };
        const rows = await prisma_1.default.teacherAttendance.findMany({
            where,
            orderBy: [{ attendanceDate: 'asc' }],
            include: {
                teacher: {
                    select: {
                        id: true,
                        employeeId: true,
                        maxWeeklyHours: true,
                        engagementKind: true,
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
        const byPeriod = new Map();
        const byTeacher = new Map();
        let teachingMinutesTotal = 0;
        let plannedMinutesTotal = 0;
        for (const row of rows) {
            const mins = row.teachingMinutes ?? 0;
            const planned = row.plannedMinutes ?? 0;
            teachingMinutesTotal += mins;
            plannedMinutesTotal += planned;
            (0, hours_summary_util_1.accumulatePeriod)(byPeriod, row.attendanceDate, groupBy, mins, planned);
            const tid = row.teacherId;
            const cur = byTeacher.get(tid) ?? {
                teacherId: tid,
                employeeId: row.teacher.employeeId,
                firstName: row.teacher.user.firstName,
                lastName: row.teacher.user.lastName,
                email: row.teacher.user.email,
                engagementKind: row.teacher.engagementKind,
                maxWeeklyHours: row.teacher.maxWeeklyHours,
                teachingMinutes: 0,
                plannedMinutes: 0,
                sessions: 0,
                hours: 0,
            };
            cur.teachingMinutes += mins;
            cur.plannedMinutes += planned;
            cur.sessions += 1;
            cur.hours = (0, hours_summary_util_1.minutesToHours)(cur.teachingMinutes);
            byTeacher.set(tid, cur);
        }
        res.json({
            filters: { from, to, groupBy, teacherId: teacherId || null },
            totals: {
                sessions: rows.length,
                teachingMinutes: teachingMinutesTotal,
                plannedMinutes: plannedMinutesTotal,
                hours: (0, hours_summary_util_1.minutesToHours)(teachingMinutesTotal),
                plannedHours: (0, hours_summary_util_1.minutesToHours)(plannedMinutesTotal),
                teachersCount: byTeacher.size,
            },
            byPeriod: (0, hours_summary_util_1.sortedPeriodBuckets)(byPeriod),
            byTeacher: [...byTeacher.values()].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr')),
        });
    }
    catch (error) {
        console.error('GET /admin/teachers/attendance/summary:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// Lister tous les enseignants
router.get('/teachers', async (req, res) => {
    try {
        const engagementKindRaw = req.query.engagementKind;
        const where = typeof engagementKindRaw === 'string' && (0, teacher_engagement_kind_util_1.isTeacherEngagementKind)(engagementKindRaw)
            ? { engagementKind: engagementKindRaw }
            : undefined;
        const teachers = await prisma_1.default.teacher.findMany({
            where,
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
                classes: true,
                courses: true,
            },
        });
        res.json(teachers);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer un enseignant
router.post('/teachers', [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('employeeId').notEmpty(),
    (0, express_validator_1.body)('specialization').notEmpty(),
    (0, express_validator_1.body)('hireDate').isISO8601(),
    (0, express_validator_1.body)('engagementKind').optional().isIn(['PERMANENT', 'VACATAIRE']),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName, phone, employeeId, specialization, hireDate, contractType, engagementKind, salary, bio, maxWeeklyHours, } = req.body;
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const existingEmployee = await prisma_1.default.teacher.findUnique({
            where: { employeeId },
        });
        if (existingEmployee) {
            return res.status(400).json({ error: 'Ce numéro d\'employé existe déjà' });
        }
        const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(password);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'TEACHER',
                teacherProfile: {
                    create: {
                        employeeId,
                        specialization,
                        hireDate: new Date(hireDate),
                        contractType: contractType || 'CDI',
                        engagementKind: (0, teacher_engagement_kind_util_1.normalizeTeacherEngagementKind)(engagementKind),
                        salary,
                        ...(bio !== undefined && typeof bio === 'string' && bio.trim()
                            ? { bio: bio.trim().slice(0, 4000) }
                            : {}),
                        ...(maxWeeklyHours !== undefined &&
                            maxWeeklyHours !== '' &&
                            !Number.isNaN(parseFloat(String(maxWeeklyHours)))
                            ? { maxWeeklyHours: parseFloat(String(maxWeeklyHours)) }
                            : {}),
                    },
                },
            },
            include: {
                teacherProfile: true,
            },
        });
        if (shouldSendSetupEmail) {
            try {
                await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, user.firstName);
            }
            catch (inviteErr) {
                console.error('Invitation mot de passe (enseignant):', inviteErr);
            }
        }
        const { password: _pw, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir un enseignant par ID
router.get('/teachers/:id', async (req, res) => {
    try {
        const teacherId = req.params.id;
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: teacherId },
            select: {
                id: true,
                userId: true,
                employeeId: true,
                nfcId: true,
                biometricId: true,
                specialization: true,
                hireDate: true,
                contractType: true,
                engagementKind: true,
                salary: true,
                bio: true,
                maxWeeklyHours: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const [user, classes, courseRows] = await Promise.all([
            prisma_1.default.user
                .findUnique({
                where: { id: teacher.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                    avatar: true,
                    isActive: true,
                },
            })
                .catch((error) => {
                console.warn('Utilisateur enseignant indisponible:', error);
                return null;
            }),
            prisma_1.default.class
                .findMany({
                where: { teacherId },
                select: {
                    id: true,
                    name: true,
                    level: true,
                    academicYear: true,
                },
            })
                .catch((error) => {
                console.warn('Classes enseignant indisponibles:', error);
                return [];
            }),
            prisma_1.default.course
                .findMany({
                where: { teacherId },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    description: true,
                    weeklyHours: true,
                    classId: true,
                    teacherId: true,
                    createdAt: true,
                    updatedAt: true,
                },
            })
                .catch((error) => {
                console.warn('Cours enseignant indisponibles:', error);
                return [];
            }),
        ]);
        const courseClassIds = [...new Set(courseRows.map((c) => c.classId).filter(Boolean))];
        const courseClasses = courseClassIds.length > 0
            ? await prisma_1.default.class
                .findMany({
                where: { id: { in: courseClassIds } },
                select: { id: true, name: true, level: true },
            })
                .catch((error) => {
                console.warn('Classes des cours enseignant indisponibles:', error);
                return [];
            })
            : [];
        const courseClassMap = new Map(courseClasses.map((c) => [c.id, c]));
        const courses = courseRows.map((course) => ({
            ...course,
            class: courseClassMap.get(course.classId) ?? null,
        }));
        const safeUser = user ??
            {
                id: teacher.userId,
                email: `deleted-teacher-${teacher.id}@deleted.local`,
                firstName: 'Professeur',
                lastName: 'supprimé',
                phone: null,
                avatar: null,
                isActive: false,
            };
        const programmedWeeklyHours = courses.reduce((sum, c) => sum + (c.weeklyHours ?? 0), 0);
        const optionalTeacherBlocks = await Promise.all([
            prisma_1.default.teacherQualification
                .findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } })
                .catch((error) => {
                console.warn('Qualifications enseignant indisponibles:', error);
                return [];
            }),
            prisma_1.default.teacherCareerHistory
                .findMany({ where: { teacherId }, orderBy: { startDate: 'desc' } })
                .catch((error) => {
                console.warn('Historique carrière enseignant indisponible:', error);
                return [];
            }),
            prisma_1.default.teacherProfessionalTraining
                .findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' } })
                .catch((error) => {
                console.warn('Formations enseignant indisponibles:', error);
                return [];
            }),
            prisma_1.default.teacherAdministrativeDocument
                .findMany({
                where: { teacherId },
                orderBy: { createdAt: 'desc' },
                include: {
                    uploadedBy: { select: { firstName: true, lastName: true, role: true } },
                },
            })
                .catch((error) => {
                console.warn('Documents enseignant indisponibles:', error);
                return [];
            }),
            prisma_1.default.teacherPerformanceReview
                .findMany({ where: { teacherId }, orderBy: { createdAt: 'desc' }, take: 50 })
                .catch((error) => {
                console.warn('Évaluations enseignant indisponibles:', error);
                return [];
            }),
            prisma_1.default.teacherScheduleAvailabilitySlot
                .findMany({ where: { teacherId }, orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] })
                .catch((error) => {
                console.warn('Disponibilités enseignant indisponibles:', error);
                return [];
            }),
        ]);
        const [qualifications, careerHistory, professionalTrainings, administrativeDocuments, performanceReviews, scheduleAvailabilitySlots,] = optionalTeacherBlocks;
        res.json({
            ...teacher,
            user: safeUser,
            classes,
            courses,
            qualifications,
            careerHistory,
            professionalTrainings,
            administrativeDocuments,
            performanceReviews,
            scheduleAvailabilitySlots,
            workloadSummary: {
                programmedWeeklyHours,
                courseCount: courses.length,
                maxWeeklyHours: teacher.maxWeeklyHours ?? null,
            },
        });
    }
    catch (error) {
        console.error('Erreur dans /admin/teachers/:id:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Mettre à jour un enseignant
router.put('/teachers/:id', async (req, res) => {
    try {
        const { firstName, lastName, phone, specialization, contractType, engagementKind, salary, isActive, nfcId, biometricId, bio, maxWeeklyHours, } = req.body;
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        if (firstName ||
            lastName ||
            phone !== undefined ||
            isActive !== undefined) {
            await prisma_1.default.user.update({
                where: { id: teacher.userId },
                data: {
                    ...(typeof firstName === 'string' && firstName.trim() && { firstName: firstName.trim() }),
                    ...(typeof lastName === 'string' && lastName.trim() && { lastName: lastName.trim() }),
                    ...(phone !== undefined && {
                        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
                    }),
                    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
                },
            });
        }
        const data = {};
        if (specialization !== undefined && typeof specialization === 'string' && specialization.trim()) {
            data.specialization = specialization.trim();
        }
        if (contractType !== undefined && typeof contractType === 'string' && contractType.trim()) {
            data.contractType = contractType.trim();
        }
        if (engagementKind !== undefined && (0, teacher_engagement_kind_util_1.isTeacherEngagementKind)(engagementKind)) {
            data.engagementKind = engagementKind;
        }
        if (salary !== undefined) {
            data.salary =
                salary === null || salary === ''
                    ? null
                    : !Number.isNaN(parseFloat(String(salary)))
                        ? parseFloat(String(salary))
                        : null;
        }
        if (nfcId !== undefined) {
            data.nfcId = typeof nfcId === 'string' && nfcId.trim() ? nfcId.trim() : null;
        }
        if (biometricId !== undefined) {
            data.biometricId =
                typeof biometricId === 'string' && biometricId.trim() ? biometricId.trim() : null;
        }
        if (bio !== undefined) {
            data.bio =
                typeof bio === 'string' && bio.trim().length > 0 ? bio.trim().slice(0, 4000) : null;
        }
        if (maxWeeklyHours !== undefined) {
            if (maxWeeklyHours === null || maxWeeklyHours === '') {
                data.maxWeeklyHours = null;
            }
            else {
                const n = parseFloat(String(maxWeeklyHours));
                data.maxWeeklyHours = Number.isNaN(n) ? null : n;
            }
        }
        const updatedTeacher = await prisma_1.default.teacher.update({
            where: { id: req.params.id },
            data,
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
                classes: true,
                courses: true,
                qualifications: { orderBy: { createdAt: 'desc' } },
                careerHistory: { orderBy: { startDate: 'desc' } },
                professionalTrainings: { orderBy: { createdAt: 'desc' } },
                administrativeDocuments: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        uploadedBy: { select: { firstName: true, lastName: true, role: true } },
                    },
                },
                performanceReviews: { orderBy: { createdAt: 'desc' }, take: 50 },
                scheduleAvailabilitySlots: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
            },
        });
        const programmedWeeklyHours = updatedTeacher.courses.reduce((sum, c) => sum + (c.weeklyHours ?? 0), 0);
        res.json({
            ...updatedTeacher,
            workloadSummary: {
                programmedWeeklyHours,
                courseCount: updatedTeacher.courses.length,
                maxWeeklyHours: updatedTeacher.maxWeeklyHours ?? null,
            },
        });
    }
    catch (error) {
        console.error('Erreur dans /admin/teachers/:id PUT:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Liste des évaluations RH d'un enseignant
router.get('/teachers/:id/performance-reviews', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const reviews = await prisma_1.default.teacherPerformanceReview.findMany({
            where: { teacherId: teacher.id },
            orderBy: { createdAt: 'desc' },
        });
        res.json(reviews);
    }
    catch (error) {
        console.error('GET admin teacher reviews:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Liste des demandes de congé d'un enseignant
router.get('/teachers/:id/leaves', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const leaves = await prisma_1.default.teacherLeave.findMany({
            where: { teacherId: teacher.id },
            orderBy: { startDate: 'desc' },
        });
        res.json(leaves);
    }
    catch (error) {
        console.error('GET admin teacher leaves:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Disponibilités hebdomadaires d'un enseignant (emplois du temps)
router.get('/teachers/:id/schedule-availability', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({ where: { id: req.params.id }, select: { id: true } });
        if (!teacher)
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        const slots = await prisma_1.default.teacherScheduleAvailabilitySlot.findMany({
            where: { teacherId: teacher.id },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        res.json(slots);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/teachers/:id/schedule-availability', async (req, res) => {
    try {
        const { dayOfWeek, startTime, endTime, label } = req.body;
        if (dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'dayOfWeek, startTime et endTime sont requis' });
        }
        const teacher = await prisma_1.default.teacher.findUnique({ where: { id: req.params.id }, select: { id: true } });
        if (!teacher)
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        const created = await prisma_1.default.teacherScheduleAvailabilitySlot.create({
            data: {
                teacherId: teacher.id,
                dayOfWeek: parseInt(String(dayOfWeek), 10),
                startTime: String(startTime).trim(),
                endTime: String(endTime).trim(),
                label: label ? String(label).trim() : null,
            },
        });
        res.status(201).json(created);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/teachers/:id/schedule-availability/:slotId', async (req, res) => {
    try {
        const found = await prisma_1.default.teacherScheduleAvailabilitySlot.findFirst({
            where: { id: req.params.slotId, teacherId: req.params.id },
            select: { id: true },
        });
        if (!found)
            return res.status(404).json({ error: 'Créneau non trouvé' });
        await prisma_1.default.teacherScheduleAvailabilitySlot.delete({ where: { id: found.id } });
        res.json({ message: 'Créneau supprimé' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// --- Dossier enseignant : documents administratifs ---
router.get('/teachers/:id/administrative-documents', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const docs = await prisma_1.default.teacherAdministrativeDocument.findMany({
            where: { teacherId: teacher.id },
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: { select: { firstName: true, lastName: true, role: true, email: true } },
            },
        });
        res.json(docs);
    }
    catch (error) {
        console.error('GET teacher administrative-documents:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/teachers/:teacherId/administrative-documents/:docId', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.teacherId },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const doc = await prisma_1.default.teacherAdministrativeDocument.findFirst({
            where: { id: req.params.docId, teacherId: teacher.id },
        });
        if (!doc) {
            return res.status(404).json({ error: 'Document introuvable' });
        }
        await prisma_1.default.teacherAdministrativeDocument.delete({ where: { id: doc.id } });
        await (0, upload_persist_util_1.deleteStoredUploadUrl)(doc.fileUrl);
        res.json({ message: 'Document supprimé' });
    }
    catch (error) {
        console.error('DELETE teacher administrative-document:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Qualifications / diplômes
router.post('/teachers/:id/qualifications', async (req, res) => {
    try {
        const { title, institution, field, obtainedAt, notes } = req.body;
        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Intitulé du diplôme requis' });
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        let obt = null;
        if (obtainedAt) {
            const d = new Date(String(obtainedAt));
            obt = Number.isNaN(d.getTime()) ? null : d;
        }
        const row = await prisma_1.default.teacherQualification.create({
            data: {
                teacherId: teacher.id,
                title: title.trim().slice(0, 200),
                institution: institution ? String(institution).trim().slice(0, 200) : null,
                field: field ? String(field).trim().slice(0, 200) : null,
                obtainedAt: obt,
                notes: notes ? String(notes).trim().slice(0, 2000) : null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        console.error('POST teacher qualification:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/teachers/:teacherId/qualifications/:qualId', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.teacherId },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const row = await prisma_1.default.teacherQualification.findFirst({
            where: { id: req.params.qualId, teacherId: teacher.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Entrée introuvable' });
        }
        await prisma_1.default.teacherQualification.delete({ where: { id: row.id } });
        res.json({ message: 'Qualification supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Historique professionnel
router.post('/teachers/:id/career-history', async (req, res) => {
    try {
        const { institution, role, startDate, endDate, country, notes } = req.body;
        if (!institution || typeof institution !== 'string' || !institution.trim()) {
            return res.status(400).json({ error: 'Établissement requis' });
        }
        if (!role || typeof role !== 'string' || !role.trim()) {
            return res.status(400).json({ error: 'Fonction / poste requis' });
        }
        if (!startDate) {
            return res.status(400).json({ error: 'Date de début requise' });
        }
        const sd = new Date(String(startDate));
        if (Number.isNaN(sd.getTime())) {
            return res.status(400).json({ error: 'Date de début invalide' });
        }
        let ed = null;
        if (endDate) {
            const e = new Date(String(endDate));
            ed = Number.isNaN(e.getTime()) ? null : e;
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const row = await prisma_1.default.teacherCareerHistory.create({
            data: {
                teacherId: teacher.id,
                institution: institution.trim().slice(0, 200),
                role: role.trim().slice(0, 200),
                startDate: sd,
                endDate: ed,
                country: country ? String(country).trim().slice(0, 120) : null,
                notes: notes ? String(notes).trim().slice(0, 2000) : null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        console.error('POST teacher career-history:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/teachers/:teacherId/career-history/:entryId', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.teacherId },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const row = await prisma_1.default.teacherCareerHistory.findFirst({
            where: { id: req.params.entryId, teacherId: teacher.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Entrée introuvable' });
        }
        await prisma_1.default.teacherCareerHistory.delete({ where: { id: row.id } });
        res.json({ message: 'Entrée supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Formation continue
router.post('/teachers/:id/professional-trainings', async (req, res) => {
    try {
        const { title, organization, hours, completedAt, notes } = req.body;
        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Intitulé de la formation requis' });
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        let comp = null;
        if (completedAt) {
            const c = new Date(String(completedAt));
            comp = Number.isNaN(c.getTime()) ? null : c;
        }
        let hrs = null;
        if (hours !== undefined && hours !== null && hours !== '') {
            const h = parseFloat(String(hours));
            hrs = Number.isNaN(h) ? null : h;
        }
        const row = await prisma_1.default.teacherProfessionalTraining.create({
            data: {
                teacherId: teacher.id,
                title: title.trim().slice(0, 200),
                organization: organization ? String(organization).trim().slice(0, 200) : null,
                hours: hrs,
                completedAt: comp,
                notes: notes ? String(notes).trim().slice(0, 2000) : null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        console.error('POST teacher professional-training:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/teachers/:teacherId/professional-trainings/:trainingId', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.teacherId },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const row = await prisma_1.default.teacherProfessionalTraining.findFirst({
            where: { id: req.params.trainingId, teacherId: teacher.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Entrée introuvable' });
        }
        await prisma_1.default.teacherProfessionalTraining.delete({ where: { id: row.id } });
        res.json({ message: 'Formation supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Indisponibilités de salles (emplois du temps)
router.get('/schedule-room-blocks', async (_req, res) => {
    try {
        const blocks = await prisma_1.default.roomScheduleUnavailableSlot.findMany({
            orderBy: [{ roomKey: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        res.json(blocks);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/schedule-room-blocks', async (req, res) => {
    try {
        const { room, dayOfWeek, startTime, endTime, reason } = req.body;
        const roomKey = (0, timetable_constraints_util_1.normalizeRoomKey)(room);
        if (!roomKey || dayOfWeek === undefined || !startTime || !endTime) {
            return res.status(400).json({ error: 'room, dayOfWeek, startTime et endTime sont requis' });
        }
        const created = await prisma_1.default.roomScheduleUnavailableSlot.create({
            data: {
                roomKey,
                dayOfWeek: parseInt(String(dayOfWeek), 10),
                startTime: String(startTime).trim(),
                endTime: String(endTime).trim(),
                reason: reason ? String(reason).trim() : null,
            },
        });
        res.status(201).json(created);
    }
    catch (error) {
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/schedule-room-blocks/:blockId', async (req, res) => {
    try {
        await prisma_1.default.roomScheduleUnavailableSlot.delete({ where: { id: req.params.blockId } });
        res.json({ message: 'Bloc salle supprimé' });
    }
    catch (error) {
        if (error.code === 'P2025')
            return res.status(404).json({ error: 'Bloc non trouvé' });
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Évaluation du personnel — enregistrer une fiche pour un enseignant
router.post('/teachers/:id/performance-reviews', [
    (0, express_validator_1.body)('periodLabel').notEmpty().withMessage('Période requise'),
    (0, express_validator_1.body)('academicYear').notEmpty().withMessage('Année scolaire requise'),
    (0, express_validator_1.body)('overallScore').optional().isFloat({ min: 0, max: 20 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        const { periodLabel, academicYear, overallScore, objectives, achievements, improvements, reviewerName, } = req.body;
        const review = await prisma_1.default.teacherPerformanceReview.create({
            data: {
                teacherId: teacher.id,
                periodLabel: String(periodLabel).trim(),
                academicYear: String(academicYear).trim(),
                overallScore: overallScore !== undefined && overallScore !== null && overallScore !== ''
                    ? parseFloat(String(overallScore))
                    : null,
                objectives: objectives?.trim() || null,
                achievements: achievements?.trim() || null,
                improvements: improvements?.trim() || null,
                reviewerName: reviewerName?.trim() || null,
            },
        });
        res.status(201).json(review);
    }
    catch (error) {
        console.error('POST /admin/teachers/:id/performance-reviews:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Congés enseignant — statut (validation direction)
router.patch('/teachers/:teacherId/leaves/:leaveId', async (req, res) => {
    try {
        const { status, adminComment } = req.body;
        if (!['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ error: 'Statut invalide' });
        }
        const leave = await prisma_1.default.teacherLeave.findFirst({
            where: { id: req.params.leaveId, teacherId: req.params.teacherId },
        });
        if (!leave) {
            return res.status(404).json({ error: 'Demande introuvable' });
        }
        const updated = await prisma_1.default.teacherLeave.update({
            where: { id: leave.id },
            data: {
                status,
                ...(adminComment !== undefined && {
                    adminComment: adminComment === null || adminComment === '' ? null : String(adminComment).trim(),
                }),
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('PATCH admin teacher leave:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// ——— Ressources humaines (vues agrégées direction) ———
/** Tous les congés enseignants (filtre optionnel ?status=PENDING|…) */
router.get('/hr/teacher-leaves', async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (typeof status === 'string' &&
            ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            where.status = status;
        }
        const leaves = await prisma_1.default.teacherLeave.findMany({
            where,
            orderBy: { startDate: 'desc' },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(leaves);
    }
    catch (error) {
        console.error('GET /admin/hr/teacher-leaves:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
/** Toutes les fiches d’évaluation du personnel enseignant */
router.get('/hr/teacher-performance-reviews', async (req, res) => {
    try {
        const reviews = await prisma_1.default.teacherPerformanceReview.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                teacher: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        res.json(reviews);
    }
    catch (error) {
        console.error('GET /admin/hr/teacher-performance-reviews:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Supprimer un enseignant
router.delete('/teachers/:id', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!teacher) {
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        }
        // Utiliser une transaction pour supprimer toutes les relations dans le bon ordre
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Supprimer les StudentAssignments liés aux assignments de l'enseignant
            const assignments = await tx.assignment.findMany({
                where: { teacherId: req.params.id },
                select: { id: true },
            });
            if (assignments.length > 0) {
                await tx.studentAssignment.deleteMany({
                    where: { assignmentId: { in: assignments.map((a) => a.id) } },
                });
            }
            // 2. Supprimer les assignments de l'enseignant
            await tx.assignment.deleteMany({
                where: { teacherId: req.params.id },
            });
            // 3. Supprimer les grades de l'enseignant
            await tx.grade.deleteMany({
                where: { teacherId: req.params.id },
            });
            // 4. Supprimer les absences de l'enseignant
            await tx.absence.deleteMany({
                where: { teacherId: req.params.id },
            });
            // 5. Supprimer les schedules liés aux courses de l'enseignant
            const courses = await tx.course.findMany({
                where: { teacherId: req.params.id },
                select: { id: true },
            });
            if (courses.length > 0) {
                const courseIds = courses.map((c) => c.id);
                const elearningCourses = await tx.elearningCourse.findMany({
                    where: {
                        OR: [
                            { teacherId: req.params.id },
                            { courseId: { in: courseIds } },
                        ],
                    },
                    select: { id: true },
                });
                const elearningCourseIds = elearningCourses.map((c) => c.id);
                if (elearningCourseIds.length > 0) {
                    const lessons = await tx.elearningLesson.findMany({
                        where: { elearningCourseId: { in: elearningCourseIds } },
                        select: { id: true },
                    });
                    const lessonIds = lessons.map((l) => l.id);
                    if (lessonIds.length > 0) {
                        const quizzes = await tx.elearningQuiz.findMany({
                            where: { lessonId: { in: lessonIds } },
                            select: { id: true },
                        });
                        const quizIds = quizzes.map((q) => q.id);
                        if (quizIds.length > 0) {
                            await tx.elearningQuizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
                            await tx.elearningQuizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
                            await tx.elearningQuiz.deleteMany({ where: { id: { in: quizIds } } });
                        }
                        await tx.elearningLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
                        await tx.elearningLesson.deleteMany({ where: { id: { in: lessonIds } } });
                    }
                    await tx.virtualClassSession.deleteMany({
                        where: { elearningCourseId: { in: elearningCourseIds } },
                    });
                    await tx.elearningCourse.deleteMany({ where: { id: { in: elearningCourseIds } } });
                }
                await tx.virtualClassSession.deleteMany({
                    where: {
                        OR: [
                            { teacherId: req.params.id },
                            { courseId: { in: courseIds } },
                        ],
                    },
                });
                await tx.schedule.deleteMany({
                    where: { courseId: { in: courseIds } },
                });
                // Notes / absences liées au cours (autre enseignant que celui supprimé)
                await tx.grade.deleteMany({ where: { courseId: { in: courseIds } } });
                await tx.absence.deleteMany({ where: { courseId: { in: courseIds } } });
            }
            // 6. Supprimer les courses de l'enseignant
            await tx.course.deleteMany({
                where: { teacherId: req.params.id },
            });
            // 7. Retirer l'enseignant des classes (mettre teacherId à null)
            await tx.class.updateMany({
                where: { teacherId: req.params.id },
                data: { teacherId: null },
            });
            await tx.schedule.updateMany({
                where: { substituteTeacherId: req.params.id },
                data: { substituteTeacherId: null, replacementNote: null },
            });
            await tx.virtualClassSession.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.pedagogicalResourceBank.deleteMany({
                where: { createdByTeacherId: req.params.id },
            });
            const remainingElearningCourses = await tx.elearningCourse.findMany({
                where: { teacherId: req.params.id },
                select: { id: true },
            });
            const remainingElearningCourseIds = remainingElearningCourses.map((c) => c.id);
            if (remainingElearningCourseIds.length > 0) {
                const lessons = await tx.elearningLesson.findMany({
                    where: { elearningCourseId: { in: remainingElearningCourseIds } },
                    select: { id: true },
                });
                const lessonIds = lessons.map((l) => l.id);
                if (lessonIds.length > 0) {
                    const quizzes = await tx.elearningQuiz.findMany({
                        where: { lessonId: { in: lessonIds } },
                        select: { id: true },
                    });
                    const quizIds = quizzes.map((q) => q.id);
                    if (quizIds.length > 0) {
                        await tx.elearningQuizAttempt.deleteMany({ where: { quizId: { in: quizIds } } });
                        await tx.elearningQuizQuestion.deleteMany({ where: { quizId: { in: quizIds } } });
                        await tx.elearningQuiz.deleteMany({ where: { id: { in: quizIds } } });
                    }
                    await tx.elearningLessonProgress.deleteMany({ where: { lessonId: { in: lessonIds } } });
                    await tx.elearningLesson.deleteMany({ where: { id: { in: lessonIds } } });
                }
                await tx.virtualClassSession.deleteMany({
                    where: { elearningCourseId: { in: remainingElearningCourseIds } },
                });
                await tx.elearningCourse.deleteMany({ where: { id: { in: remainingElearningCourseIds } } });
            }
            await tx.teacherLeave.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherPerformanceReview.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.parentTeacherAppointment.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherAttendance.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherScheduleAvailabilitySlot.deleteMany({
                where: { teacherId: req.params.id },
            });
            const adminDocs = await tx.teacherAdministrativeDocument.findMany({
                where: { teacherId: req.params.id },
            });
            for (const d of adminDocs) {
                await (0, upload_persist_util_1.deleteStoredUploadUrl)(d.fileUrl);
            }
            await tx.teacherAdministrativeDocument.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherQualification.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherCareerHistory.deleteMany({
                where: { teacherId: req.params.id },
            });
            await tx.teacherProfessionalTraining.deleteMany({
                where: { teacherId: req.params.id },
            });
            // 8. Supprimer le profil enseignant
            await tx.teacher.delete({
                where: { id: req.params.id },
            });
            // 9. Désactiver/anonymiser l'utilisateur associé au lieu de le supprimer :
            // il peut être référencé par des messages, logs, notifications ou historiques.
            await tx.passwordResetToken.deleteMany({ where: { userId: teacher.userId } });
            await tx.pushSubscription.deleteMany({ where: { userId: teacher.userId } });
            await tx.schoolMember.deleteMany({ where: { userId: teacher.userId } });
            await tx.user.update({
                where: { id: teacher.userId },
                data: {
                    email: `deleted-teacher-${teacher.id}-${Date.now()}@deleted.local`,
                    firstName: 'Professeur',
                    lastName: 'supprimé',
                    phone: null,
                    avatar: null,
                    isActive: false,
                },
            });
        });
        res.json({ message: 'Enseignant supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'enseignant:', error);
        res.status(500).json({
            error: error.message || 'Erreur lors de la suppression',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin-teachers.routes.js.map