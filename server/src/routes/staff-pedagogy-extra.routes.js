"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const school_context_util_1 = require("../utils/school-context.util");
const school_messaging_recipients_util_1 = require("../utils/school-messaging-recipients.util");
const router = express_1.default.Router();
const userPublic = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatar: true,
    isActive: true,
    role: true,
};
function activeStudentScope(req) {
    return (0, school_context_util_1.studentScopeWhere)(req.schoolId, req.school?.isDefault ?? false);
}
function activeClassScope(req) {
    return (0, school_context_util_1.classScopeWhere)(req.schoolId, req.school?.isDefault ?? false);
}
function activeCourseScope(req) {
    return { class: activeClassScope(req) };
}
function activeTeacherScope(req) {
    const classScope = activeClassScope(req);
    return {
        OR: [{ classes: { some: classScope } }, { courses: { some: { class: classScope } } }],
    };
}
router.get('/messages', async (req, res) => {
    try {
        const { unread } = req.query;
        const userId = req.user.id;
        const rows = await prisma_1.default.message.findMany({
            where: {
                OR: [{ receiverId: userId }, { senderId: userId }],
                ...(unread === 'true' ? { read: false } : {}),
            },
            include: {
                sender: { select: userPublic },
                receiver: { select: userPublic },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/announcements', async (req, res) => {
    try {
        const { published, targetRole, targetClass } = req.query;
        if (targetClass && typeof targetClass === 'string') {
            const cls = await prisma_1.default.class.findFirst({
                where: { id: targetClass, ...activeClassScope(req) },
                select: { id: true },
            });
            if (!cls)
                return res.json([]);
        }
        const rows = await prisma_1.default.announcement.findMany({
            where: {
                ...(published !== undefined ? { published: published === 'true' } : {}),
                ...(targetRole && typeof targetRole === 'string' ? { targetRole: targetRole } : {}),
                ...(targetClass && typeof targetClass === 'string' ? { targetClassId: targetClass } : {}),
            },
            include: {
                author: { select: userPublic },
                targetClass: { select: { id: true, name: true, level: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/notifications', async (req, res) => {
    try {
        const { unread } = req.query;
        const rows = await prisma_1.default.notification.findMany({
            where: {
                userId: req.user.id,
                ...(unread === 'true' ? { read: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/users', async (req, res) => {
    try {
        const { role, isActive } = req.query;
        const schoolId = req.schoolId;
        const isDefaultSchool = req.school?.isDefault ?? false;
        const rows = await prisma_1.default.user.findMany({
            where: {
                ...(0, school_messaging_recipients_util_1.schoolMessagingRecipientUsersWhere)(schoolId, isDefaultSchool),
                ...(role && typeof role === 'string' ? { role: role } : {}),
                ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                role: true,
                isActive: true,
                createdAt: true,
                teacherProfile: {
                    select: {
                        id: true,
                        employeeId: true,
                        specialization: true,
                    },
                },
                studentProfile: {
                    select: {
                        id: true,
                        studentId: true,
                        class: {
                            select: {
                                id: true,
                                name: true,
                                level: true,
                            },
                        },
                    },
                },
                parentProfile: {
                    select: {
                        id: true,
                        profession: true,
                    },
                },
                educatorProfile: {
                    select: { id: true, employeeId: true, specialization: true },
                },
                staffProfile: {
                    select: {
                        id: true,
                        employeeId: true,
                        staffCategory: true,
                        supportKind: true,
                        jobTitle: true,
                    },
                },
            },
            orderBy: { lastName: 'asc' },
            take: 2000,
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/library/books', async (req, res) => {
    try {
        const { search, category, isActive } = req.query;
        const where = {};
        if (isActive === 'false')
            where.isActive = false;
        else if (isActive !== 'all')
            where.isActive = true;
        if (category && typeof category === 'string' && category.length > 0) {
            where.category = category;
        }
        if (search && typeof search === 'string' && search.trim()) {
            const s = search.trim();
            where.OR = [
                { title: { contains: s } },
                { author: { contains: s } },
                { isbn: { contains: s } },
            ];
        }
        const rows = await prisma_1.default.libraryBook.findMany({ where, orderBy: { title: 'asc' } });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/library/loans', async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status === 'ACTIVE' || status === 'RETURNED')
            where.status = status;
        const loans = await prisma_1.default.libraryLoan.findMany({
            where,
            include: {
                book: true,
                borrower: { select: userPublic },
            },
            orderBy: { loanedAt: 'desc' },
        });
        const now = new Date();
        res.json(loans.map((l) => ({
            ...l,
            isOverdue: l.status === 'ACTIVE' && l.returnedAt == null && new Date(l.dueDate) < now,
        })));
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/library/reservations', async (req, res) => {
    try {
        const rows = await prisma_1.default.libraryReservation.findMany({
            include: { book: true, user: { select: userPublic } },
            orderBy: { reservedAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/library/penalties', async (req, res) => {
    try {
        const { paid } = req.query;
        const where = {};
        if (paid === 'true')
            where.paid = true;
        if (paid === 'false')
            where.paid = false;
        const rows = await prisma_1.default.libraryPenalty.findMany({
            where,
            include: { user: { select: userPublic } },
            orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/rooms', async (req, res) => {
    try {
        const { search, isActive } = req.query;
        const rows = await prisma_1.default.materialRoom.findMany({
            where: {
                ...(search &&
                    typeof search === 'string' &&
                    search.trim() && {
                    OR: [
                        { name: { contains: search.trim() } },
                        { code: { contains: search.trim() } },
                        { building: { contains: search.trim() } },
                    ],
                }),
                ...(isActive !== undefined ? { isActive: isActive === 'true' } : {}),
            },
            orderBy: { name: 'asc' },
            include: { _count: { select: { equipmentStored: true, reservations: true } } },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/equipment', async (req, res) => {
    try {
        const { isActive } = req.query;
        const rows = await prisma_1.default.materialEquipment.findMany({
            where: isActive !== undefined ? { isActive: isActive === 'true' } : undefined,
            orderBy: { name: 'asc' },
            include: { room: { select: { id: true, name: true, code: true } } },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/maintenance', async (req, res) => {
    try {
        const { status } = req.query;
        const rows = await prisma_1.default.materialMaintenance.findMany({
            where: status && typeof status === 'string' ? { status: status } : undefined,
            orderBy: { openedAt: 'desc' },
            include: {
                equipment: { select: { id: true, name: true, category: true } },
                room: { select: { id: true, name: true, code: true } },
                reportedBy: { select: userPublic },
                assignee: { select: userPublic },
            },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/allocations', async (req, res) => {
    try {
        const { status } = req.query;
        const rows = await prisma_1.default.materialAllocation.findMany({
            where: status && typeof status === 'string' ? { status: status } : undefined,
            orderBy: { createdAt: 'desc' },
            include: { equipment: true },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/stock-items', async (req, res) => {
    try {
        const { lowStockOnly, isActive } = req.query;
        const rows = await prisma_1.default.materialStockItem.findMany({
            where: isActive !== undefined ? { isActive: isActive === 'true' } : { isActive: true },
            orderBy: { name: 'asc' },
        });
        const filtered = lowStockOnly === 'true'
            ? rows.filter((r) => r.currentQty <= (r.safetyQty ?? 0))
            : rows;
        res.json(filtered);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/material/room-reservations', async (req, res) => {
    try {
        const { status, from, to } = req.query;
        const rows = await prisma_1.default.materialRoomReservation.findMany({
            where: {
                ...(status && typeof status === 'string' ? { status: status } : {}),
                ...(from && typeof from === 'string' ? { startAt: { gte: new Date(from) } } : {}),
                ...(to && typeof to === 'string' ? { endAt: { lte: new Date(to) } } : {}),
            },
            include: { room: true, requesterUser: { select: userPublic } },
            orderBy: { startAt: 'asc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/pedagogical/class-stats', async (req, res) => {
    try {
        const { classId } = req.query;
        if (!classId || typeof classId !== 'string') {
            return res.status(400).json({ error: 'classId requis' });
        }
        const cls = await prisma_1.default.class.findFirst({
            where: { id: classId, ...activeClassScope(req) },
            select: { id: true },
        });
        if (!cls)
            return res.status(404).json({ error: 'Classe introuvable dans cet établissement' });
        const students = await prisma_1.default.student.findMany({
            where: { classId, ...activeStudentScope(req) },
            include: {
                user: { select: { firstName: true, lastName: true } },
                grades: { include: { course: true } },
                absences: true,
            },
        });
        const classStats = students.map((student) => {
            const grades = student.grades || [];
            const totalScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient, 0);
            const totalCoefficient = grades.reduce((sum, g) => sum + g.coefficient, 0);
            const average = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;
            const absences = student.absences?.filter((a) => !a.excused).length || 0;
            return {
                studentId: student.studentId,
                firstName: student.user?.firstName || '',
                lastName: student.user?.lastName || '',
                average,
                absences,
                totalGrades: grades.length,
            };
        });
        res.json(classStats);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/pedagogical/course-stats', async (req, res) => {
    try {
        const { courseId, classId } = req.query;
        const where = {
            student: {
                ...activeStudentScope(req),
                ...(classId && typeof classId === 'string' ? { classId } : {}),
            },
            course: activeCourseScope(req),
        };
        if (courseId && typeof courseId === 'string')
            where.courseId = courseId;
        const grades = await prisma_1.default.grade.findMany({
            where,
            include: {
                student: { include: { user: { select: { firstName: true, lastName: true } } } },
                course: true,
            },
        });
        res.json({
            totalGrades: grades.length,
            average: grades.length > 0
                ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
                : 0,
            distribution: {
                excellent: grades.filter((g) => (g.score / g.maxScore) * 20 >= 16).length,
                good: grades.filter((g) => {
                    const n = (g.score / g.maxScore) * 20;
                    return n >= 12 && n < 16;
                }).length,
                average: grades.filter((g) => {
                    const n = (g.score / g.maxScore) * 20;
                    return n >= 10 && n < 12;
                }).length,
                weak: grades.filter((g) => (g.score / g.maxScore) * 20 < 10).length,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/pedagogical/students-at-risk', async (req, res) => {
    try {
        const { classId } = req.query;
        const students = await prisma_1.default.student.findMany({
            where: {
                ...activeStudentScope(req),
                ...(classId && typeof classId === 'string' ? { classId } : {}),
            },
            include: {
                user: { select: { firstName: true, lastName: true, email: true } },
                class: { select: { name: true, level: true } },
                grades: { include: { course: true } },
                absences: true,
            },
        });
        const atRiskStudents = students
            .map((student) => {
            const grades = student.grades || [];
            const totalScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient, 0);
            const totalCoefficient = grades.reduce((sum, g) => sum + g.coefficient, 0);
            const average = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;
            const unexcusedAbsences = student.absences?.filter((a) => !a.excused).length || 0;
            const riskLevel = average < 10 || unexcusedAbsences > 5 ? 'high' : average < 12 ? 'medium' : 'low';
            return {
                studentId: student.studentId,
                firstName: student.user?.firstName,
                lastName: student.user?.lastName,
                email: student.user?.email,
                class: student.class?.name || 'Non assigné',
                average,
                unexcusedAbsences,
                totalGrades: grades.length,
                riskLevel,
            };
        })
            .filter((s) => s.riskLevel !== 'low')
            .sort((a, b) => {
            if (a.riskLevel === 'high' && b.riskLevel !== 'high')
                return -1;
            if (a.riskLevel !== 'high' && b.riskLevel === 'high')
                return 1;
            return a.average - b.average;
        });
        res.json(atRiskStudents);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/reports/summary', async (req, res) => {
    try {
        const now = new Date();
        const studentScope = activeStudentScope(req);
        const classScope = activeClassScope(req);
        const teacherScope = activeTeacherScope(req);
        const courseScope = activeCourseScope(req);
        const [studentsTotal, studentsActive, teachersTotal, educatorsTotal, classesTotal, coursesTotal, assignmentsPublished, usersTotal, studentAssignmentStats, absenceTotals, allStudents,] = await Promise.all([
            prisma_1.default.student.count({ where: studentScope }),
            prisma_1.default.student.count({ where: { isActive: true, enrollmentStatus: 'ACTIVE', ...studentScope } }),
            prisma_1.default.teacher.count({ where: teacherScope }),
            prisma_1.default.educator.count({ where: { classAssignments: { some: { class: classScope } } } }),
            prisma_1.default.class.count({ where: classScope }),
            prisma_1.default.course.count({ where: courseScope }),
            prisma_1.default.assignment.count({ where: { course: courseScope } }),
            prisma_1.default.user.count({ where: { schoolMemberships: { some: { schoolId: req.schoolId } } } }),
            prisma_1.default.studentAssignment
                .findMany({ where: { student: studentScope }, select: { submitted: true } })
                .then((rows) => ({
                total: rows.length,
                submitted: rows.filter((r) => r.submitted).length,
            })),
            prisma_1.default.absence
                .findMany({ where: { student: studentScope }, select: { excused: true } })
                .then((rows) => ({
                total: rows.length,
                excused: rows.filter((a) => a.excused).length,
            })),
            prisma_1.default.student.findMany({
                where: studentScope,
                include: { grades: true, absences: true },
                take: 2000,
            }),
        ]);
        let atRiskHigh = 0;
        let atRiskMedium = 0;
        for (const student of allStudents) {
            const grades = student.grades || [];
            const totalScore = grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient, 0);
            const totalCoefficient = grades.reduce((sum, g) => sum + g.coefficient, 0);
            const average = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;
            const unexcusedAbsences = student.absences?.filter((a) => !a.excused).length || 0;
            const riskLevel = average < 10 || unexcusedAbsences > 5 ? 'high' : average < 12 ? 'medium' : 'low';
            if (riskLevel === 'high')
                atRiskHigh += 1;
            else if (riskLevel === 'medium')
                atRiskMedium += 1;
        }
        res.json({
            generatedAt: now.toISOString(),
            dashboard: {
                studentsTotal,
                studentsActive,
                teachersTotal,
                educatorsTotal,
                classesTotal,
                coursesTotal,
                assignmentsPublished,
                usersTotal,
            },
            performance: {
                atRiskHigh,
                atRiskMedium,
                atRiskTotal: atRiskHigh + atRiskMedium,
                submissionRate: studentAssignmentStats.total > 0
                    ? Math.round((studentAssignmentStats.submitted / studentAssignmentStats.total) * 1000) / 10
                    : null,
                absenceExcusedRate: absenceTotals.total > 0
                    ? Math.round((absenceTotals.excused / absenceTotals.total) * 1000) / 10
                    : null,
            },
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/courses/:courseId', async (req, res) => {
    try {
        const course = await prisma_1.default.course.findFirst({
            where: { id: req.params.courseId, ...activeCourseScope(req) },
            include: {
                class: {
                    include: {
                        students: {
                            where: { isActive: true },
                            include: { user: { select: { firstName: true, lastName: true } } },
                        },
                    },
                },
                teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
        });
        if (!course)
            return res.status(404).json({ error: 'Cours non trouvé' });
        res.json(course);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/students/nfc/:nfcId', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findFirst({
            where: { nfcId: req.params.nfcId, ...activeStudentScope(req) },
            include: {
                user: { select: userPublic },
                class: { select: { id: true, name: true, level: true } },
            },
        });
        if (!student)
            return res.status(404).json({ error: 'Élève non trouvé' });
        res.json(student);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/teachers/:id/schedule-availability', async (req, res) => {
    try {
        const teacher = await prisma_1.default.teacher.findFirst({
            where: { id: req.params.id, ...activeTeacherScope(req) },
            select: { id: true },
        });
        if (!teacher)
            return res.status(404).json({ error: 'Enseignant non trouvé' });
        const slots = await prisma_1.default.teacherScheduleAvailabilitySlot.findMany({
            where: { teacherId: teacher.id },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        res.json(slots);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/schedule-room-blocks', async (_req, res) => {
    try {
        const blocks = await prisma_1.default.roomScheduleUnavailableSlot.findMany({
            orderBy: [{ roomKey: 'asc' }, { dayOfWeek: 'asc' }, { startTime: 'asc' }],
        });
        res.json(blocks);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/hr/teacher-leaves', async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (typeof status === 'string' &&
            ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
            where.status = status;
        }
        const rows = await prisma_1.default.teacherLeave.findMany({
            where: { ...where, teacher: activeTeacherScope(req) },
            orderBy: { startDate: 'desc' },
            include: {
                teacher: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/hr/teacher-performance-reviews', async (req, res) => {
    try {
        const rows = await prisma_1.default.teacherPerformanceReview.findMany({
            where: { teacher: activeTeacherScope(req) },
            orderBy: { createdAt: 'desc' },
            include: {
                teacher: {
                    include: {
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=staff-pedagogy-extra.routes.js.map