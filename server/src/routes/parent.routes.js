"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const safe_schedule_query_util_1 = require("../utils/safe-schedule-query.util");
const student_sensitive_crypto_util_1 = require("../utils/student-sensitive-crypto.util");
const notify_important_util_1 = require("../utils/notify-important.util");
const payment_cash_notify_util_1 = require("../utils/payment-cash-notify.util");
const parent_notify_util_1 = require("../utils/parent-notify.util");
const parent_teacher_appointment_util_1 = require("../utils/parent-teacher-appointment.util");
const extracurricular_util_1 = require("../utils/extracurricular.util");
const parent_academic_result_access_util_1 = require("../utils/parent-academic-result-access.util");
const prisma_relation_exists_util_1 = require("../utils/prisma-relation-exists.util");
const auth_middleware_1 = require("../middleware/auth.middleware");
const parent_student_guard_middleware_1 = require("../middleware/parent-student-guard.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('PARENT'));
router.use('/children/:studentId', parent_student_guard_middleware_1.guardParentOwnsStudentParam);
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
        console.error('GET /parent/notifications:', error);
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
        console.error('PUT /parent/notifications/read-all:', error);
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
        console.error('PUT /parent/notifications/:id/read:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.notification.findFirst({
            where: { id, userId: req.user.id },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Notification non trouvée' });
        }
        await prisma_1.default.notification.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('DELETE /parent/notifications/:id:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// --- Annonces, calendrier et fil portail (circulaires, actualités, événements, galerie) ---
router.get('/announcements', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const links = await prisma_1.default.studentParent.findMany({
            where: { parentId },
            include: { student: { select: { classId: true } } },
        });
        const classIds = links.map((l) => l.student.classId).filter(Boolean);
        const { fetchAnnouncementsForPortal } = await import('../utils/portal-feed.util');
        const rows = await fetchAnnouncementsForPortal('PARENT', classIds);
        res.json(rows);
    }
    catch (error) {
        console.error('GET /parent/announcements:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/school-calendar-events', async (req, res) => {
    try {
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
        const { fetchSchoolCalendarForPortal } = await import('../utils/portal-feed.util');
        const events = await fetchSchoolCalendarForPortal(academicYear);
        res.json(events);
    }
    catch (error) {
        console.error('GET /parent/school-calendar-events:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/portal-feed', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const links = await prisma_1.default.studentParent.findMany({
            where: { parentId },
            include: { student: { select: { classId: true } } },
        });
        const classIds = links.map((l) => l.student.classId).filter(Boolean);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
        const { buildPortalFeed } = await import('../utils/portal-feed.util');
        const feed = await buildPortalFeed({ role: 'PARENT', classIds, academicYear });
        res.json(feed);
    }
    catch (error) {
        console.error('GET /parent/portal-feed:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// --- Rendez-vous parents-enseignants ---
router.get('/appointments', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const rows = await prisma_1.default.parentTeacherAppointment.findMany({
            where: { parentId },
            orderBy: { scheduledStart: 'desc' },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        res.json(rows.map(student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow));
    }
    catch (error) {
        console.error('GET /parent/appointments:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/appointment-teachers/:studentId', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { studentId } = req.params;
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: {
                class: {
                    include: {
                        teacher: {
                            include: {
                                user: {
                                    select: { firstName: true, lastName: true, email: true },
                                },
                            },
                        },
                        courses: {
                            include: {
                                teacher: {
                                    include: {
                                        user: {
                                            select: { firstName: true, lastName: true, email: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!student?.class) {
            return res.json([]);
        }
        const out = [];
        const seen = new Set();
        if (student.class.teacher) {
            const t = student.class.teacher;
            seen.add(t.id);
            out.push({
                teacherId: t.id,
                label: 'Professeur principal',
                firstName: t.user.firstName,
                lastName: t.user.lastName,
                email: t.user.email,
            });
        }
        for (const c of student.class.courses) {
            if (seen.has(c.teacherId))
                continue;
            seen.add(c.teacherId);
            out.push({
                teacherId: c.teacherId,
                label: `Enseignant · ${c.name}`,
                firstName: c.teacher.user.firstName,
                lastName: c.teacher.user.lastName,
                email: c.teacher.user.email,
            });
        }
        const ids = [...new Set(out.map((o) => o.teacherId))];
        const allSlots = ids.length > 0
            ? await prisma_1.default.teacherScheduleAvailabilitySlot.findMany({
                where: { teacherId: { in: ids } },
                orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
            })
            : [];
        const byTeacher = new Map();
        for (const s of allSlots) {
            if (!byTeacher.has(s.teacherId))
                byTeacher.set(s.teacherId, []);
            byTeacher.get(s.teacherId).push(s);
        }
        const withSlots = out.map((o) => ({
            ...o,
            availabilitySlots: byTeacher.get(o.teacherId) ?? [],
        }));
        res.json(withSlots);
    }
    catch (error) {
        console.error('GET /parent/appointment-teachers/:studentId:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        res.status(status).json({ error: msg });
    }
});
router.post('/appointments', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { studentId, teacherId, scheduledStart: scheduledRaw, durationMinutes: durRaw, topic, notesParent, } = req.body;
        if (!studentId || !teacherId || !scheduledRaw) {
            return res.status(400).json({
                error: 'studentId, teacherId et scheduledStart sont requis.',
            });
        }
        const durationMinutes = Math.min(120, Math.max(15, Number(durRaw) || 30));
        const scheduledStart = new Date(scheduledRaw);
        if (Number.isNaN(scheduledStart.getTime())) {
            return res.status(400).json({ error: 'Date ou heure invalide.' });
        }
        const minLead = 30 * 60 * 1000;
        if (scheduledStart.getTime() < Date.now() + minLead) {
            return res.status(400).json({
                error: 'Le rendez-vous doit être fixé au moins 30 minutes à l’avance.',
            });
        }
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const allowed = await (0, parent_teacher_appointment_util_1.isTeacherAllowedForStudent)(teacherId, studentId);
        if (!allowed) {
            return res.status(403).json({
                error: 'Ce professeur ne peut pas recevoir de rendez-vous pour cet élève.',
            });
        }
        try {
            await (0, parent_teacher_appointment_util_1.assertAppointmentFitsTeacherAvailability)(teacherId, scheduledStart, durationMinutes);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Créneau non autorisé.';
            return res.status(400).json({ error: msg });
        }
        const end = (0, parent_teacher_appointment_util_1.addMinutes)(scheduledStart, durationMinutes);
        const conflict = await (0, parent_teacher_appointment_util_1.hasTeacherSlotConflict)(teacherId, scheduledStart, end);
        if (conflict) {
            return res.status(409).json({
                error: 'Ce créneau chevauche un autre rendez-vous confirmé ou en attente.',
            });
        }
        const autoConfirm = process.env.APPOINTMENTS_AUTO_CONFIRM?.trim() === '1' ||
            process.env.APPOINTMENTS_AUTO_CONFIRM?.trim()?.toLowerCase() === 'true';
        const created = await prisma_1.default.parentTeacherAppointment.create({
            data: {
                parentId,
                teacherId,
                studentId,
                scheduledStart,
                durationMinutes,
                topic: topic?.trim() || null,
                notesParent: notesParent?.trim() || null,
                status: autoConfirm ? 'CONFIRMED' : 'PENDING',
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const teacherUser = await prisma_1.default.teacher.findUnique({
            where: { id: teacherId },
            select: { userId: true },
        });
        const parentUser = await prisma_1.default.parent.findUnique({
            where: { id: parentId },
            select: { userId: true },
        });
        if (teacherUser?.userId && created.student?.user) {
            const stName = [created.student.user.firstName, created.student.user.lastName]
                .filter(Boolean)
                .join(' ')
                .trim();
            const when = scheduledStart.toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            if (autoConfirm && parentUser?.userId) {
                await (0, notify_important_util_1.notifyUsersImportant)([parentUser.userId], {
                    type: 'appointment',
                    title: 'Rendez-vous confirmé',
                    content: `Entretien parents-enseignants (${stName || 'élève'}) le ${when} — confirmation automatique.`,
                    link: '/parent?tab=appointments',
                    email: undefined,
                });
                await (0, notify_important_util_1.notifyUsersImportant)([teacherUser.userId], {
                    type: 'appointment',
                    title: 'Rendez-vous confirmé',
                    content: `Entretien avec un parent (${stName || 'élève'}) le ${when} — confirmation automatique.`,
                    link: '/teacher?tab=appointments',
                    email: undefined,
                });
            }
            else {
                await (0, notify_important_util_1.notifyUsersImportant)([teacherUser.userId], {
                    type: 'appointment',
                    title: 'Demande de rendez-vous parent',
                    content: `Un parent souhaite un entretien concernant ${stName || 'un élève'}, le ${when}.`,
                    link: '/teacher?tab=appointments',
                });
            }
        }
        res.status(201).json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(created));
    }
    catch (error) {
        console.error('POST /parent/appointments:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        res.status(status).json({ error: msg });
    }
});
router.put('/appointments/:id/cancel', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { id } = req.params;
        const existing = await prisma_1.default.parentTeacherAppointment.findFirst({
            where: { id, parentId },
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
                cancelledBy: 'PARENT',
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const teacherUser = await prisma_1.default.teacher.findUnique({
            where: { id: updated.teacherId },
            select: { userId: true },
        });
        if (teacherUser?.userId) {
            await (0, notify_important_util_1.notifyUsersImportant)([teacherUser.userId], {
                type: 'appointment',
                title: 'Rendez-vous annulé',
                content: 'Le parent a annulé un rendez-vous.',
                link: '/teacher?tab=appointments',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(updated));
    }
    catch (error) {
        console.error('PUT /parent/appointments/:id/cancel:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/appointments/:id/reschedule', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { id } = req.params;
        const { scheduledStart: scheduledRaw, durationMinutes: durRaw } = req.body;
        if (!scheduledRaw) {
            return res.status(400).json({ error: 'scheduledStart est requis.' });
        }
        const existing = await prisma_1.default.parentTeacherAppointment.findFirst({
            where: { id, parentId },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Rendez-vous introuvable.' });
        }
        if (existing.status !== 'PENDING' && existing.status !== 'CONFIRMED') {
            return res.status(400).json({ error: 'Ce rendez-vous ne peut plus être reprogrammé.' });
        }
        const durationMinutes = Math.min(120, Math.max(15, Number(durRaw) || existing.durationMinutes));
        const scheduledStart = new Date(scheduledRaw);
        if (Number.isNaN(scheduledStart.getTime())) {
            return res.status(400).json({ error: 'Date ou heure invalide.' });
        }
        const minLead = 30 * 60 * 1000;
        if (scheduledStart.getTime() < Date.now() + minLead) {
            return res.status(400).json({
                error: 'Le rendez-vous doit être fixé au moins 30 minutes à l’avance.',
            });
        }
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, existing.studentId);
        try {
            await (0, parent_teacher_appointment_util_1.assertAppointmentFitsTeacherAvailability)(existing.teacherId, scheduledStart, durationMinutes);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : 'Créneau non autorisé.';
            return res.status(400).json({ error: msg });
        }
        const end = (0, parent_teacher_appointment_util_1.addMinutes)(scheduledStart, durationMinutes);
        const conflict = await (0, parent_teacher_appointment_util_1.hasTeacherSlotConflict)(existing.teacherId, scheduledStart, end, existing.id);
        if (conflict) {
            return res.status(409).json({
                error: 'Ce créneau chevauche un autre rendez-vous confirmé ou en attente.',
            });
        }
        const updated = await prisma_1.default.parentTeacherAppointment.update({
            where: { id },
            data: {
                scheduledStart,
                durationMinutes,
                status: 'PENDING',
                declineReason: null,
                reminder24hSentAt: null,
                reminder1hSentAt: null,
            },
            include: parent_teacher_appointment_util_1.appointmentInclude,
        });
        const teacherUser = await prisma_1.default.teacher.findUnique({
            where: { id: updated.teacherId },
            select: { userId: true },
        });
        if (teacherUser?.userId) {
            const when = scheduledStart.toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            await (0, notify_important_util_1.notifyUsersImportant)([teacherUser.userId], {
                type: 'appointment',
                title: 'Rendez-vous reprogrammé',
                content: `Un parent a proposé un nouveau créneau : ${when}. Merci de confirmer ou décliner.`,
                link: '/teacher?tab=appointments',
            });
        }
        res.json((0, student_sensitive_crypto_util_1.decryptParentTeacherAppointmentRow)(updated));
    }
    catch (error) {
        console.error('PUT /parent/appointments/:id/reschedule:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        res.status(status).json({ error: msg });
    }
});
async function findOrCreateParentProfile(userId) {
    let parent = await prisma_1.default.parent.findFirst({ where: { userId } });
    if (parent)
        return parent;
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
        select: { role: true },
    });
    if (!user || user.role !== 'PARENT') {
        return null;
    }
    return prisma_1.default.parent.create({ data: { userId } });
}
const parentChildrenInclude = {
    students: {
        include: {
            student: {
                include: {
                    user: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatar: true,
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
                },
            },
        },
    },
};
// Obtenir les enfants du parent
router.get('/children', async (req, res) => {
    try {
        const profile = await findOrCreateParentProfile(req.user.id);
        if (!profile) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const parent = await prisma_1.default.parent.findUnique({
            where: { id: profile.id },
            include: parentChildrenInclude,
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const children = parent.students.map((sp) => ({
            ...(0, student_sensitive_crypto_util_1.decryptStudentRecord)(sp.student),
            relation: sp.relation,
        }));
        res.json(children);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.get('/dashboard/kpis', async (req, res) => {
    try {
        const parent = await prisma_1.default.parent.findFirst({
            where: { userId: req.user.id },
            select: {
                id: true,
                students: { select: { studentId: true, student: { select: { id: true, user: { select: { firstName: true, lastName: true } } } } } },
            },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const studentIds = parent.students.map((s) => s.student.id);
        if (studentIds.length === 0) {
            return res.json({
                generatedAt: new Date().toISOString(),
                cards: {
                    childrenCount: 0,
                    tuitionUnpaidAmount: 0,
                    tuitionUnpaidCount: 0,
                    pendingAppointments: 0,
                    unreadNotifications: 0,
                },
                charts: { averageByChild: [] },
            });
        }
        const since = new Date();
        since.setDate(since.getDate() - 120);
        const blockedByStudent = new Map();
        await Promise.all(studentIds.map(async (id) => {
            blockedByStudent.set(id, await (0, parent_academic_result_access_util_1.getAcademicYearsWithTuitionBlockForParent)(prisma_1.default, id));
        }));
        const [tuitionUnpaid, pendingAppointments, unreadNotifications, grades] = await Promise.all([
            prisma_1.default.tuitionFee.aggregate({
                where: { studentId: { in: studentIds }, isPaid: false },
                _sum: { amount: true },
                _count: true,
            }),
            prisma_1.default.parentTeacherAppointment.count({
                where: { parentId: parent.id, status: 'PENDING' },
            }),
            prisma_1.default.notification.count({
                where: { userId: req.user.id, read: false },
            }),
            prisma_1.default.grade.findMany({
                where: {
                    studentId: { in: studentIds },
                    date: { gte: since },
                    ...prisma_relation_exists_util_1.gradeWhereRelationsExist,
                },
                select: {
                    studentId: true,
                    score: true,
                    maxScore: true,
                    coefficient: true,
                    course: { select: { class: { select: { academicYear: true } } } },
                },
            }),
        ]);
        const aggC = tuitionUnpaid._count;
        const unpaidCount = typeof aggC === 'number' ? aggC : aggC?._all ?? 0;
        const perChild = new Map();
        for (const sp of parent.students) {
            const id = sp.student.id;
            const name = `${sp.student.user.firstName} ${sp.student.user.lastName}`.trim();
            perChild.set(id, { name, sum: 0, coef: 0 });
        }
        for (const g of grades) {
            const row = perChild.get(g.studentId);
            if (!row)
                continue;
            const ay = (g.course?.class?.academicYear ?? '').trim();
            if (ay && blockedByStudent.get(g.studentId)?.has(ay))
                continue;
            const max = g.maxScore > 0 ? g.maxScore : 20;
            const n20 = (g.score / max) * 20;
            row.sum += n20 * g.coefficient;
            row.coef += g.coefficient;
        }
        const averageByChild = [...perChild.entries()].map(([studentId, v]) => ({
            studentId,
            name: v.name,
            average20: v.coef > 0 ? Math.round((v.sum / v.coef) * 100) / 100 : null,
        }));
        res.json({
            generatedAt: new Date().toISOString(),
            cards: {
                childrenCount: studentIds.length,
                tuitionUnpaidAmount: Math.round((tuitionUnpaid._sum.amount ?? 0) * 100) / 100,
                tuitionUnpaidCount: unpaidCount,
                pendingAppointments: pendingAppointments,
                unreadNotifications: unreadNotifications,
            },
            charts: { averageByChild },
        });
    }
    catch (e) {
        console.error('GET /parent/dashboard/kpis:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// Obtenir les notes d'un enfant
router.get('/children/:studentId/grades', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const blockedAcademicYears = await (0, parent_academic_result_access_util_1.getAcademicYearsWithTuitionBlockForParent)(prisma_1.default, studentId);
        const tuitionBlock = (0, parent_academic_result_access_util_1.parentTuitionBlockFromYears)(blockedAcademicYears);
        const gradesRaw = await prisma_1.default.grade.findMany({
            where: {
                studentId,
                ...prisma_relation_exists_util_1.gradeWhereRelationsExist,
            },
            include: {
                course: {
                    include: {
                        class: true,
                    },
                },
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
        });
        const grades = gradesRaw.filter((grade) => {
            const ay = (grade.course?.class?.academicYear ?? '').trim();
            if (!ay)
                return true;
            return !blockedAcademicYears.has(ay);
        });
        // Calculer les moyennes par cours
        const courseAverages = {};
        grades.forEach((grade) => {
            const courseId = grade.courseId;
            if (!courseAverages[courseId]) {
                courseAverages[courseId] = { total: 0, count: 0, average: 0 };
            }
            courseAverages[courseId].total += (grade.score / grade.maxScore) * 20 * grade.coefficient;
            courseAverages[courseId].count += grade.coefficient;
        });
        Object.keys(courseAverages).forEach((courseId) => {
            const course = courseAverages[courseId];
            course.average = course.count > 0 ? course.total / course.count : 0;
        });
        res.json({
            grades,
            courseAverages,
            tuitionBlock,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir les absences d'un enfant
router.get('/children/:studentId/absences', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const absences = await prisma_1.default.absence.findMany({
            where: {
                studentId,
                ...prisma_relation_exists_util_1.absenceWhereRelationsExist,
            },
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
        });
        res.json(absences);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir l'emploi du temps d'un enfant
router.get('/children/:studentId/schedule', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: {
                class: true,
            },
        });
        if (!student || !student.classId) {
            return res.status(404).json({ error: 'Classe non trouvée' });
        }
        const schedule = await (0, safe_schedule_query_util_1.findSchedulesWithRelations)({ classId: student.classId });
        res.json(schedule);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir les devoirs d'un enfant
router.get('/children/:studentId/assignments', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const assignments = await prisma_1.default.studentAssignment.findMany({
            where: {
                studentId,
            },
            include: {
                assignment: {
                    include: {
                        course: {
                            include: {
                                class: true,
                            },
                        },
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
            },
            orderBy: {
                assignment: {
                    dueDate: 'desc',
                },
            },
        });
        res.json(assignments);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ========== GESTION DES PAIEMENTS ==========
// Obtenir les frais de scolarité d'un enfant
router.get('/children/:studentId/tuition-fees', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const tuitionFees = await prisma_1.default.tuitionFee.findMany({
            where: {
                studentId,
            },
            include: {
                payments: {
                    orderBy: {
                        createdAt: 'desc',
                    },
                },
            },
            orderBy: {
                dueDate: 'asc',
            },
        });
        // Calculer le montant payé et restant pour chaque frais
        const feesWithPaymentInfo = tuitionFees.map((fee) => {
            const completedPayments = fee.payments.filter((p) => p.status === 'COMPLETED');
            const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
            const remainingAmount = fee.amount - totalPaid;
            return {
                ...fee,
                totalPaid,
                remainingAmount: Math.max(0, remainingAmount),
                paymentProgress: fee.amount > 0 ? (totalPaid / fee.amount) * 100 : 0,
            };
        });
        res.json(feesWithPaymentInfo);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des frais de scolarité:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Créer un paiement pour un enfant
router.post('/children/:studentId/payments', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { tuitionFeeId, paymentMethod, amount, phoneNumber, operator, transactionCode } = req.body;
        if (!tuitionFeeId || !paymentMethod || !amount) {
            return res.status(400).json({ error: 'tuitionFeeId, paymentMethod et amount sont requis' });
        }
        // Validation spécifique pour Mobile Money
        if (paymentMethod === 'MOBILE_MONEY') {
            if (!phoneNumber) {
                return res.status(400).json({ error: 'Le numéro de téléphone est requis pour Mobile Money' });
            }
            // Valider le format du numéro (ex: +237 6XX XXX XXX ou 6XX XXX XXX)
            const phoneRegex = /^(\+237\s?)?[67]\d{8}$/;
            const cleanPhone = phoneNumber.replace(/\s/g, '');
            if (!phoneRegex.test(cleanPhone)) {
                return res.status(400).json({ error: 'Format de numéro de téléphone invalide. Utilisez le format: +237 6XX XXX XXX ou 6XX XXX XXX' });
            }
        }
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        // Vérifier que le frais appartient à l'élève
        const tuitionFee = await prisma_1.default.tuitionFee.findFirst({
            where: {
                id: tuitionFeeId,
                studentId,
            },
        });
        if (!tuitionFee) {
            return res.status(404).json({ error: 'Frais de scolarité non trouvé' });
        }
        // Calculer le montant total payé pour ce frais
        const completedPayments = await prisma_1.default.payment.findMany({
            where: {
                tuitionFeeId,
                status: 'COMPLETED',
            },
        });
        const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = tuitionFee.amount - totalPaid;
        if (remainingAmount <= 0) {
            return res.status(400).json({ error: 'Ce frais a déjà été entièrement payé' });
        }
        // Valider que le montant du paiement ne dépasse pas le montant restant
        const paymentAmount = parseFloat(amount);
        if (paymentAmount <= 0) {
            return res.status(400).json({ error: 'Le montant doit être supérieur à 0' });
        }
        if (paymentAmount > remainingAmount) {
            return res.status(400).json({
                error: `Le montant ne peut pas dépasser le montant restant (${remainingAmount.toFixed(0)} FCFA)`
            });
        }
        // Générer une référence de paiement unique
        const paymentReference = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        // Préparer les notes pour Mobile Money
        let paymentNotes = '';
        if (paymentMethod === 'MOBILE_MONEY') {
            paymentNotes = `Mobile Money - Téléphone: ${phoneNumber}${operator ? `, Opérateur: ${operator}` : ''}${transactionCode ? `, Code: ${transactionCode}` : ''}`;
        }
        else if (paymentMethod === 'CASH') {
            paymentNotes =
                "Espèces — déclaration en ligne en attente de validation par l'économe après dépôt à l'administration";
        }
        // Créer le paiement
        const payment = await prisma_1.default.payment.create({
            data: {
                tuitionFeeId,
                studentId,
                payerId: req.user.id,
                payerRole: 'PARENT',
                amount: paymentAmount,
                paymentMethod,
                status: 'PENDING',
                paymentReference,
                notes: paymentNotes || undefined,
            },
            include: {
                tuitionFee: true,
                student: {
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
        if (paymentMethod === 'CASH') {
            await (0, payment_cash_notify_util_1.notifyStaffOfPendingCashPayment)({
                paymentId: payment.id,
                amount: payment.amount,
                paymentReference: payment.paymentReference,
                studentFirstName: payment.student.user.firstName,
                studentLastName: payment.student.user.lastName,
                period: payment.tuitionFee.period,
                academicYear: payment.tuitionFee.academicYear,
                payerRole: 'PARENT',
            }).catch((err) => console.error('notifyStaffOfPendingCashPayment:', err));
            void (0, parent_notify_util_1.notifyParentCashPaymentSubmitted)(payment.id).catch((err) => console.error('notifyParentCashPaymentSubmitted:', err));
        }
        res.status(201).json({
            payment,
            paymentUrl: `/payment/process/${payment.id}`,
            message: 'Paiement initié avec succès',
        });
    }
    catch (error) {
        console.error('Erreur lors de la création du paiement:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// La confirmation des paiements en ligne doit venir d'un webhook prestataire signé, jamais du portail parent.
router.post('/children/:studentId/payments/:id/confirm', async (req, res) => {
    return res.status(409).json({
        error: 'Confirmation désactivée : le paiement sera validé par l’administration ou par un webhook de paiement sécurisé.',
    });
});
// Obtenir l'historique des paiements pour un enfant
router.get('/children/:studentId/payments', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const payments = await prisma_1.default.payment.findMany({
            where: {
                studentId,
                payerId: req.user.id,
            },
            include: {
                tuitionFee: {
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                        email: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        res.json(payments);
    }
    catch (error) {
        console.error('Erreur lors de la récupération des paiements:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// ========== BULLETINS ==========
// Obtenir les bulletins d'un enfant
router.get('/children/:studentId/report-cards', async (req, res) => {
    try {
        const { studentId } = req.params;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const blockedAcademicYears = await (0, parent_academic_result_access_util_1.getAcademicYearsWithTuitionBlockForParent)(prisma_1.default, studentId);
        const tuitionBlock = (0, parent_academic_result_access_util_1.parentTuitionBlockFromYears)(blockedAcademicYears);
        const reportCardsRaw = await prisma_1.default.reportCard.findMany({
            where: {
                studentId,
                published: true,
            },
            orderBy: [
                { academicYear: 'desc' },
                { period: 'asc' },
            ],
        });
        const reportCards = reportCardsRaw.filter((rc) => {
            const ay = (rc.academicYear ?? '').trim();
            if (!ay)
                return true;
            return !blockedAcademicYears.has(ay);
        });
        res.json({ reportCards, tuitionBlock });
    }
    catch (error) {
        console.error('Erreur lors de la récupération des bulletins:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// ========== CONDUITE ==========
// Obtenir les évaluations de conduite d'un enfant
router.get('/children/:studentId/conduct', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { period, academicYear } = req.query;
        // Vérifier que l'élève est bien un enfant du parent
        const parent = await prisma_1.default.parent.findFirst({
            where: {
                userId: req.user.id,
            },
            include: {
                students: {
                    where: {
                        studentId,
                    },
                },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const conducts = await prisma_1.default.conduct.findMany({
            where: {
                studentId,
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
            orderBy: [
                { academicYear: 'desc' },
                { period: 'asc' },
            ],
        });
        res.json(conducts);
    }
    catch (error) {
        console.error('Erreur lors de la récupération de la conduite:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
router.get('/discipline/rulebook', async (req, res) => {
    try {
        const row = await prisma_1.default.schoolDisciplinaryRulebook.findFirst({
            where: { isPublished: true },
            orderBy: [{ effectiveFrom: 'desc' }, { sortOrder: 'asc' }],
            select: {
                id: true,
                title: true,
                content: true,
                academicYear: true,
                effectiveFrom: true,
                updatedAt: true,
            },
        });
        res.json(row);
    }
    catch (error) {
        console.error('GET /parent/discipline/rulebook:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/children/:studentId/discipline-records', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { academicYear } = req.query;
        const parent = await prisma_1.default.parent.findFirst({
            where: { userId: req.user.id },
            include: {
                students: { where: { studentId } },
            },
        });
        if (!parent || parent.students.length === 0) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        const records = await prisma_1.default.studentDisciplinaryRecord.findMany({
            where: {
                studentId,
                ...(typeof academicYear === 'string' && academicYear ? { academicYear } : {}),
            },
            orderBy: { incidentDate: 'desc' },
            select: {
                id: true,
                category: true,
                title: true,
                description: true,
                incidentDate: true,
                academicYear: true,
                exclusionStartDate: true,
                exclusionEndDate: true,
                councilSessionDate: true,
                councilDecisionSummary: true,
                behaviorContractGoals: true,
                behaviorContractReviewAt: true,
                behaviorContractStatus: true,
                recordedBy: { select: { firstName: true, lastName: true, role: true } },
            },
        });
        res.json(records);
    }
    catch (error) {
        console.error('GET /parent/children/:studentId/discipline-records:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/children/:studentId/extracurricular-offerings', async (req, res) => {
    try {
        const { studentId } = req.params;
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
        const where = await (0, extracurricular_util_1.buildPortalOfferingWhere)(studentId, academicYear);
        if (!where)
            return res.json([]);
        const rows = await prisma_1.default.extracurricularOffering.findMany({
            where,
            orderBy: [{ kind: 'asc' }, { startAt: 'asc' }, { title: 'asc' }],
            select: {
                id: true,
                kind: true,
                category: true,
                title: true,
                description: true,
                academicYear: true,
                supervisorName: true,
                meetSchedule: true,
                startAt: true,
                endAt: true,
                location: true,
                registrationDeadline: true,
                maxParticipants: true,
                class: { select: { name: true, level: true } },
                _count: { select: { registrations: true } },
            },
        });
        res.json(rows);
    }
    catch (error) {
        console.error('GET /parent/children/:studentId/extracurricular-offerings:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(msg.includes('associé') ? 403 : 500).json({ error: msg });
    }
});
router.get('/children/:studentId/extracurricular-registrations', async (req, res) => {
    try {
        const { studentId } = req.params;
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear : undefined;
        const rows = await prisma_1.default.extracurricularRegistration.findMany({
            where: {
                studentId,
                ...(academicYear?.trim() ? { offering: { academicYear: academicYear.trim() } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            include: {
                offering: {
                    select: {
                        id: true,
                        title: true,
                        kind: true,
                        category: true,
                        startAt: true,
                        endAt: true,
                        location: true,
                        academicYear: true,
                    },
                },
            },
        });
        res.json(rows);
    }
    catch (error) {
        console.error('GET /parent/children/:studentId/extracurricular-registrations:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(msg.includes('associé') ? 403 : 500).json({ error: msg });
    }
});
router.post('/children/:studentId/extracurricular-registrations', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { offeringId } = req.body;
        if (!offeringId)
            return res.status(400).json({ error: 'offeringId est requis.' });
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const { registration, status } = await (0, extracurricular_util_1.registerStudentForExtracurricular)(studentId, offeringId);
        res.status(201).json({ ...registration, _placement: status });
    }
    catch (error) {
        if (error &&
            typeof error === 'object' &&
            'code' in error &&
            error.code === 'P2002') {
            return res.status(409).json({ error: 'Inscription déjà enregistrée.' });
        }
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('POST /parent/children/:studentId/extracurricular-registrations:', error);
        const st = msg.includes('associé') ? 403 : 400;
        res.status(st).json({ error: msg });
    }
});
router.delete('/children/:studentId/extracurricular-registrations/:regId', async (req, res) => {
    try {
        const { studentId, regId } = req.params;
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const reg = await prisma_1.default.extracurricularRegistration.findFirst({
            where: { id: regId, studentId },
        });
        if (!reg)
            return res.status(404).json({ error: 'Inscription introuvable.' });
        await prisma_1.default.extracurricularRegistration.delete({ where: { id: regId } });
        res.json({ ok: true });
    }
    catch (error) {
        console.error('DELETE /parent/children/.../extracurricular-registrations:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(msg.includes('associé') ? 403 : 500).json({ error: msg });
    }
});
// ---------- Orientation (portail parent) ----------
router.get('/orientation/catalog', async (req, res) => {
    try {
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
        const testWhere = {
            isPublished: true,
            ...(academicYear
                ? { OR: [{ academicYear: null }, { academicYear: academicYear }] }
                : {}),
        };
        const adviceWhere = {
            isPublished: true,
            OR: [{ audience: 'ALL' }, { audience: 'PARENT' }],
        };
        const [filieres, partnerships, aptitudeTests, advice] = await Promise.all([
            prisma_1.default.orientationFiliere.findMany({
                where: { isPublished: true },
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            }),
            prisma_1.default.orientationPartnership.findMany({
                where: { isPublished: true },
                orderBy: [{ sortOrder: 'asc' }, { organizationName: 'asc' }],
            }),
            prisma_1.default.orientationAptitudeTest.findMany({
                where: testWhere,
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            }),
            prisma_1.default.orientationAdvice.findMany({
                where: adviceWhere,
                orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
            }),
        ]);
        res.json({ filieres, partnerships, aptitudeTests, advice });
    }
    catch (error) {
        console.error('GET /parent/orientation/catalog:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/children/:studentId/orientation/follow-ups', async (req, res) => {
    try {
        const { studentId } = req.params;
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : undefined;
        const rows = await prisma_1.default.studentOrientationFollowUp.findMany({
            where: {
                studentId,
                ...(academicYear ? { academicYear } : {}),
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                counselor: { select: { id: true, firstName: true, lastName: true, email: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        res.json(rows);
    }
    catch (error) {
        console.error('GET /parent/children/.../orientation/follow-ups:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(msg.includes('associé') ? 403 : 500).json({ error: msg });
    }
});
router.get('/children/:studentId/orientation/placements', async (req, res) => {
    try {
        const { studentId } = req.params;
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId)
            return res.status(404).json({ error: 'Parent non trouvé' });
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const rows = await prisma_1.default.studentOrientationPlacement.findMany({
            where: { studentId },
            orderBy: { startDate: 'desc' },
            include: { createdBy: { select: { id: true, firstName: true, lastName: true } } },
        });
        res.json(rows);
    }
    catch (error) {
        console.error('GET /parent/children/.../orientation/placements:', error);
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(msg.includes('associé') ? 403 : 500).json({ error: msg });
    }
});
// ========== COMMUNICATION (messages avec l’école) ==========
router.get('/messages', async (req, res) => {
    try {
        const { unread } = req.query;
        const receivedWhere = {
            receiverId: req.user.id,
        };
        if (unread === 'true') {
            receivedWhere.read = false;
        }
        const [received, sent] = await Promise.all([
            prisma_1.default.message.findMany({
                where: receivedWhere,
                include: {
                    sender: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            avatar: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.default.message.findMany({
                where: { senderId: req.user.id },
                include: {
                    receiver: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            role: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 100,
            }),
        ]);
        res.json({ received, sent });
    }
    catch (error) {
        console.error('GET /parent/messages:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/messages/contacts', async (req, res) => {
    try {
        const [admins, staffUsers, educators, courses] = await Promise.all([
            prisma_1.default.user.findMany({
                where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 40,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'STAFF', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 120,
            }),
            prisma_1.default.user.findMany({
                where: { role: 'EDUCATOR', isActive: true },
                select: { id: true, firstName: true, lastName: true, email: true, role: true },
                orderBy: { lastName: 'asc' },
                take: 80,
            }),
            prisma_1.default.course.findMany({
                where: {
                    class: {
                        students: {
                            some: {
                                parents: { some: { parent: { userId: req.user.id } } },
                            },
                        },
                    },
                },
                select: {
                    class: { select: { name: true, level: true } },
                    teacher: {
                        select: {
                            user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
                        },
                    },
                },
            }),
        ]);
        const teacherMap = new Map();
        for (const c of courses) {
            const u = c.teacher.user;
            if (!teacherMap.has(u.id)) {
                teacherMap.set(u.id, {
                    ...u,
                    label: `${c.class.name} (${c.class.level})`,
                });
            }
        }
        res.json({ admins, staff: staffUsers, educators, teachers: [...teacherMap.values()] });
    }
    catch (error) {
        console.error('GET /parent/messages/contacts:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/messages', async (req, res) => {
    try {
        const { subject, content, category, studentId, receiverId, threadKey: bodyThreadKey, attachmentUrls, } = req.body;
        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Le contenu du message est requis' });
        }
        let body = content.trim();
        if (studentId && typeof studentId === 'string') {
            const parent = await prisma_1.default.parent.findFirst({
                where: {
                    userId: req.user.id,
                    students: { some: { studentId } },
                },
            });
            if (!parent) {
                return res.status(403).json({ error: 'Cet élève n’est pas associé à votre compte' });
            }
            const st = await prisma_1.default.student.findUnique({
                where: { id: studentId },
                include: { user: { select: { firstName: true, lastName: true } } },
            });
            if (st?.user) {
                body += `\n\n---\nConcernant l’élève : ${st.user.firstName} ${st.user.lastName}`;
            }
        }
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
        let targetReceiverId = receiverId && typeof receiverId === 'string' && receiverId.trim() ? receiverId.trim() : '';
        if (!targetReceiverId) {
            const admin = await prisma_1.default.user.findFirst({
                where: { role: 'ADMIN', isActive: true },
                orderBy: { createdAt: 'asc' },
                select: { id: true },
            });
            if (!admin) {
                return res.status(503).json({
                    error: 'Aucun administrateur n’est disponible pour recevoir le message pour le moment.',
                });
            }
            targetReceiverId = admin.id;
        }
        else {
            const recv = await prisma_1.default.user.findUnique({
                where: { id: targetReceiverId },
                select: { id: true, role: true, isActive: true },
            });
            if (!recv || !recv.isActive) {
                return res.status(404).json({ error: 'Destinataire introuvable' });
            }
            if (recv.role === 'ADMIN' || recv.role === 'SUPER_ADMIN') {
                /* ok */
            }
            else if (recv.role === 'TEACHER') {
                const { parentLinkedToTeacherUser } = await import('../utils/internal-messaging.util');
                const ok = await parentLinkedToTeacherUser(req.user.id, recv.id);
                if (!ok) {
                    return res.status(403).json({
                        error: 'Vous ne pouvez écrire qu’aux enseignants de vos enfants ou à l’administration.',
                    });
                }
            }
            else {
                const { isPlatformMessagingRole } = await import('../utils/internal-messaging.util');
                if (!isPlatformMessagingRole(recv.role)) {
                    return res.status(400).json({
                        error: 'Destinataire non autorisé. Choisissez un contact de l’établissement ou laissez vide pour l’administration.',
                    });
                }
            }
        }
        const { createInternalPlatformMessage, makeDmThreadKey } = await import('../utils/internal-messaging.util');
        const tk = bodyThreadKey && String(bodyThreadKey).trim().length > 0
            ? String(bodyThreadKey).trim()
            : makeDmThreadKey(req.user.id, targetReceiverId);
        const message = await createInternalPlatformMessage({
            senderId: req.user.id,
            receiverId: targetReceiverId,
            subject: subject && String(subject).trim() ? String(subject).trim() : null,
            content: body,
            category: cat,
            threadKey: tk,
            attachmentUrls,
        });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('POST /parent/messages:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/messages/threads', async (req, res) => {
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
        console.error('GET /parent/messages/threads:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/messages/thread', async (req, res) => {
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
        console.error('GET /parent/messages/thread:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.put('/messages/:id/read', async (req, res) => {
    try {
        const existing = await prisma_1.default.message.findFirst({
            where: {
                id: req.params.id,
                receiverId: req.user.id,
            },
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
        res.status(500).json({ error: error.message });
    }
});
// --- Profil familial : coordonnées, portail, consentements, récupérations, historique ---
router.get('/my-profile', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const parent = await prisma_1.default.parent.findUnique({
            where: { id: parentId },
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
                contacts: { orderBy: { sortOrder: 'asc' } },
                consents: { orderBy: { updatedAt: 'desc' }, take: 80 },
                interactionLogs: { orderBy: { createdAt: 'desc' }, take: 80 },
                students: {
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, firstName: true, lastName: true } },
                                class: { select: { id: true, name: true, level: true } },
                                pickupAuthorizations: {
                                    orderBy: { createdAt: 'desc' },
                                    take: 30,
                                },
                            },
                        },
                    },
                },
            },
        });
        res.json(parent);
    }
    catch (error) {
        console.error('GET /parent/my-profile:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/my-profile', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { profession, preferredLocale, notifyEmail, notifySms, portalShowFees, portalShowGrades, portalShowAttendance, } = req.body;
        const updated = await prisma_1.default.parent.update({
            where: { id: parentId },
            data: {
                ...(profession !== undefined && { profession: profession ? String(profession) : null }),
                ...(preferredLocale !== undefined && {
                    preferredLocale: preferredLocale ? String(preferredLocale).slice(0, 16) : null,
                }),
                ...(notifyEmail !== undefined && { notifyEmail: Boolean(notifyEmail) }),
                ...(notifySms !== undefined && { notifySms: Boolean(notifySms) }),
                ...(portalShowFees !== undefined && { portalShowFees: Boolean(portalShowFees) }),
                ...(portalShowGrades !== undefined && { portalShowGrades: Boolean(portalShowGrades) }),
                ...(portalShowAttendance !== undefined && {
                    portalShowAttendance: Boolean(portalShowAttendance),
                }),
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
                    },
                },
                contacts: { orderBy: { sortOrder: 'asc' } },
                consents: { take: 80 },
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('PUT /parent/my-profile:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/my-contacts', [(0, express_validator_1.body)('label').trim().notEmpty(), (0, express_validator_1.body)('phone').optional().trim(), (0, express_validator_1.body)('email').optional().trim()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { label, phone, email, sortOrder } = req.body;
        const row = await prisma_1.default.parentContact.create({
            data: {
                parentId,
                label: String(label).trim(),
                phone: phone ? String(phone).trim() : null,
                email: email ? String(email).trim() : null,
                sortOrder: sortOrder != null ? Number(sortOrder) : 0,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        console.error('POST /parent/my-contacts:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/my-contacts/:contactId', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const row = await prisma_1.default.parentContact.findFirst({
            where: { id: req.params.contactId, parentId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Contact introuvable' });
        }
        await prisma_1.default.parentContact.delete({ where: { id: row.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (error) {
        console.error('DELETE /parent/my-contacts/:id:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/my-consents/upsert', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { studentId, consentType, granted, policyVersion, notes } = req.body;
        const allowed = [
            'IMAGE_PUBLICATION',
            'SCHOOL_TRIP',
            'MEDICAL_EMERGENCY',
            'DATA_PROCESSING',
            'COMMUNICATION_CHANNELS',
            'AUTHORIZED_PICKUP_POLICY',
        ];
        if (!consentType || !allowed.includes(String(consentType))) {
            return res.status(400).json({ error: 'consentType invalide' });
        }
        if (studentId) {
            await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, String(studentId));
        }
        const existing = await prisma_1.default.parentConsent.findFirst({
            where: {
                parentId,
                consentType: String(consentType),
                ...(studentId ? { studentId: String(studentId) } : { studentId: null }),
            },
        });
        if (existing) {
            const u = await prisma_1.default.parentConsent.update({
                where: { id: existing.id },
                data: {
                    granted: Boolean(granted),
                    policyVersion: policyVersion != null ? String(policyVersion).slice(0, 64) : null,
                    notes: notes != null ? String(notes).slice(0, 2000) : null,
                },
            });
            return res.json(u);
        }
        const c = await prisma_1.default.parentConsent.create({
            data: {
                parentId,
                studentId: studentId ? String(studentId) : null,
                consentType: String(consentType),
                granted: Boolean(granted),
                policyVersion: policyVersion != null ? String(policyVersion).slice(0, 64) : null,
                notes: notes != null ? String(notes).slice(0, 2000) : null,
            },
        });
        res.status(201).json(c);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        console.error('POST /parent/my-consents/upsert:', error);
        res.status(status).json({ error: msg });
    }
});
router.post('/children/:studentId/pickup-authorizations', [(0, express_validator_1.body)('authorizedName').trim().notEmpty()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { studentId } = req.params;
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const { authorizedName, relationship, phone, identityNote, validFrom, validUntil } = req.body;
        const row = await prisma_1.default.studentPickupAuthorization.create({
            data: {
                studentId,
                declaredByParentId: parentId,
                authorizedName: String(authorizedName).trim(),
                relationship: relationship ? String(relationship).slice(0, 120) : null,
                phone: phone ? String(phone).trim() : null,
                identityNote: identityNote ? String(identityNote).slice(0, 500) : null,
                validFrom: validFrom ? new Date(String(validFrom)) : new Date(),
                validUntil: validUntil ? new Date(String(validUntil)) : null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        console.error('POST /parent/children/.../pickup-authorizations:', error);
        res.status(status).json({ error: msg });
    }
});
router.delete('/children/:studentId/pickup-authorizations/:pickupId', async (req, res) => {
    try {
        const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
        if (!parentId) {
            return res.status(404).json({ error: 'Parent non trouvé' });
        }
        const { studentId, pickupId } = req.params;
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        const row = await prisma_1.default.studentPickupAuthorization.findFirst({
            where: { id: pickupId, studentId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Autorisation introuvable' });
        }
        await prisma_1.default.studentPickupAuthorization.delete({ where: { id: row.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('associé') ? 403 : 500;
        res.status(status).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=parent.routes.js.map