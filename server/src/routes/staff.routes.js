"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const tuition_financial_automation_util_1 = require("../utils/tuition-financial-automation.util");
const tuition_fee_paid_sync_util_1 = require("../utils/tuition-fee-paid-sync.util");
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const staff_roles_routes_1 = __importDefault(require("./staff-roles.routes"));
const staff_pedagogy_routes_1 = __importDefault(require("./staff-pedagogy.routes"));
const staff_health_messaging_routes_1 = __importDefault(require("./staff-health-messaging.routes"));
const staff_library_routes_1 = __importDefault(require("./staff-library.routes"));
const staff_notifications_routes_1 = __importDefault(require("./staff-notifications.routes"));
const school_context_util_1 = require("../utils/school-context.util");
const school_context_middleware_1 = require("../middleware/school-context.middleware");
const school_context_util_2 = require("../utils/school-context.util");
const router = express_1.default.Router();
const COUNTER_METHODS = new Set(['CASH', 'BANK_TRANSFER']);
function requireStaffModule(moduleId) {
    return async (req, res, next) => {
        try {
            await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, moduleId);
            next();
        }
        catch (e) {
            if (e instanceof Error) {
                if (e.message === 'MODULE_NOT_ALLOWED' || e.message === 'STAFF_PROFILE_NOT_FOUND') {
                    return res.status(403).json({
                        error: 'Ce module n’est pas activé pour votre compte personnel. Contactez l’administration.',
                    });
                }
            }
            next(e);
        }
    };
}
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('STAFF'));
router.get('/schools', async (req, res) => {
    try {
        const schools = await (0, school_context_util_1.listSchoolsForUser)(req.user.id, 'STAFF');
        res.json(schools);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Mémorise l’établissement actif pour le personnel (en-tête X-School-Id côté client). */
router.put('/schools/active', async (req, res) => {
    try {
        const { schoolId } = req.body ?? {};
        if (!schoolId || typeof schoolId !== 'string') {
            return res.status(400).json({ error: 'schoolId requis' });
        }
        const userId = req.user.id;
        const schools = await (0, school_context_util_1.listSchoolsForUser)(userId, 'STAFF');
        if (!schools.some((s) => s.id === schoolId)) {
            return res.status(403).json({ error: 'Accès refusé à cet établissement' });
        }
        await prisma_1.default.schoolMember.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
        await prisma_1.default.schoolMember.upsert({
            where: { schoolId_userId: { schoolId, userId } },
            create: { schoolId, userId, isDefault: true },
            update: { isDefault: true },
        });
        const school = await prisma_1.default.school.findUnique({
            where: { id: schoolId },
            select: { id: true, name: true, slug: true, isDefault: true },
        });
        res.json({ schoolId, school });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/workspace', async (req, res) => {
    try {
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(req.user.id);
        if (!ctx) {
            return res.status(404).json({ error: 'Profil personnel introuvable' });
        }
        res.json({
            visibleModules: ctx.visibleModules,
            supportKind: ctx.staff.supportKind,
            staffCategory: ctx.staff.staffCategory,
            schoolId: ctx.staff.schoolId,
            metierLabel: ctx.metierLabel ?? null,
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.use('/counter-tuition', requireStaffModule('counter'));
router.use('/counter-tuition', (req, res, next) => (0, school_context_middleware_1.attachSchoolContext)(req, res, next));
function counterStudentScope(req) {
    return {
        isActive: true,
        ...(0, school_context_util_2.studentScopeWhere)(req.schoolId, req.school?.isDefault ?? false),
    };
}
/** Recherche d'élèves (nom, prénom ou numéro élève). */
router.get('/counter-tuition/students', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2) {
            return res.json([]);
        }
        const students = await prisma_1.default.student.findMany({
            where: {
                AND: [
                    counterStudentScope(req),
                    {
                        OR: [
                            { studentId: { contains: q } },
                            { user: { firstName: { contains: q } } },
                            { user: { lastName: { contains: q } } },
                        ],
                    },
                ],
            },
            take: 30,
            orderBy: { user: { lastName: 'asc' } },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                class: { select: { name: true, level: true, academicYear: true } },
            },
        });
        res.json(students);
    }
    catch (error) {
        console.error('GET /staff/counter-tuition/students:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Frais de scolarité d'un élève (toutes lignes) avec soldes — pour encaissement guichet. */
router.get('/counter-tuition/students/:studentId/tuition-fees', async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, ...counterStudentScope(req) },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève introuvable ou inactif' });
        }
        const tuitionFees = await prisma_1.default.tuitionFee.findMany({
            where: { studentId },
            include: {
                payments: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { dueDate: 'asc' },
        });
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
        console.error('GET /staff/counter-tuition/students/:studentId/tuition-fees:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/**
 * Enregistre un paiement présentiel (espèces ou virement encaissé au guichet), marqué COMPLETED immédiatement.
 */
router.post('/counter-tuition/students/:studentId/payments', async (req, res) => {
    try {
        const { studentId } = req.params;
        const { tuitionFeeId, amount, paymentMethod, notes } = req.body ?? {};
        if (!tuitionFeeId || amount == null || !paymentMethod) {
            return res.status(400).json({ error: 'tuitionFeeId, amount et paymentMethod sont requis' });
        }
        const method = String(paymentMethod).toUpperCase();
        if (!COUNTER_METHODS.has(method)) {
            return res.status(400).json({ error: 'Modes autorisés au guichet : CASH, BANK_TRANSFER' });
        }
        const student = await prisma_1.default.student.findFirst({
            where: { id: studentId, ...counterStudentScope(req) },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève introuvable ou inactif' });
        }
        const tuitionFee = await prisma_1.default.tuitionFee.findFirst({
            where: { id: tuitionFeeId, studentId },
        });
        if (!tuitionFee) {
            return res.status(404).json({ error: 'Ligne de frais introuvable pour cet élève' });
        }
        const completedPayments = await prisma_1.default.payment.findMany({
            where: { tuitionFeeId, status: 'COMPLETED' },
        });
        const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = tuitionFee.amount - totalPaid;
        if (remainingAmount <= 0) {
            return res.status(400).json({ error: 'Cette ligne est déjà entièrement réglée' });
        }
        const paymentAmount = Number(amount);
        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({ error: 'Montant invalide' });
        }
        if (paymentAmount > remainingAmount + 0.0001) {
            return res.status(400).json({
                error: `Le montant ne peut pas dépasser le reste dû (${Math.round(remainingAmount)} FCFA)`,
            });
        }
        const staffUser = await prisma_1.default.user.findUnique({
            where: { id: req.user.id },
            select: { firstName: true, lastName: true },
        });
        const staffName = [staffUser?.firstName, staffUser?.lastName].filter(Boolean).join(' ').trim() || 'Personnel';
        const extraNote = typeof notes === 'string' && notes.trim() ? ` — ${notes.trim()}` : '';
        const paymentNotes = `Encaissement présentiel (guichet) par ${staffName}${extraNote}`;
        const paymentReference = `GUI-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
        const payment = await prisma_1.default.payment.create({
            data: {
                tuitionFeeId,
                studentId,
                payerId: req.user.id,
                payerRole: 'STAFF',
                amount: paymentAmount,
                paymentMethod: method,
                status: 'COMPLETED',
                paymentReference,
                transactionId: `GUICHET-${Date.now()}`,
                paidAt: new Date(),
                receiptUrl: (0, tuition_financial_automation_util_1.autoReceiptUrl)(paymentReference),
                notes: paymentNotes,
            },
            include: {
                tuitionFee: true,
                student: {
                    include: {
                        user: { select: { firstName: true, lastName: true, email: true } },
                    },
                },
            },
        });
        await (0, tuition_fee_paid_sync_util_1.syncTuitionFeePaidStatusForFeeId)(prisma_1.default, tuitionFeeId);
        res.status(201).json({
            payment,
            message: 'Paiement enregistré',
        });
    }
    catch (error) {
        console.error('POST /staff/counter-tuition/students/:studentId/payments:', error);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Recherche élèves (modules infirmerie, etc.). */
router.get('/students/search', requireStaffModule('health_log'), (req, res, next) => (0, school_context_middleware_1.attachSchoolContext)(req, res, next), async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        if (q.length < 2)
            return res.json([]);
        const students = await prisma_1.default.student.findMany({
            where: {
                AND: [
                    {
                        isActive: true,
                        ...(0, school_context_util_2.studentScopeWhere)(req.schoolId, req.school?.isDefault ?? false),
                    },
                    {
                        OR: [
                            { studentId: { contains: q } },
                            { user: { firstName: { contains: q } } },
                            { user: { lastName: { contains: q } } },
                        ],
                    },
                ],
            },
            take: 30,
            orderBy: { user: { lastName: 'asc' } },
            include: {
                user: { select: { firstName: true, lastName: true } },
                class: { select: { name: true } },
            },
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Journal infirmerie */
router.get('/module-records', async (req, res) => {
    try {
        const moduleKey = String(req.query.moduleKey || '').trim();
        const allowedKeys = new Set(['health_log', 'it_requests', 'maintenance_requests']);
        if (!allowedKeys.has(moduleKey)) {
            return res.status(400).json({ error: 'moduleKey invalide' });
        }
        await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, moduleKey);
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(req.user.id);
        if (!ctx)
            return res.status(403).json({ error: 'Profil introuvable' });
        const rows = await prisma_1.default.staffModuleRecord.findMany({
            where: { staffMemberId: ctx.staff.id, moduleKey },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                student: {
                    include: { user: { select: { firstName: true, lastName: true } }, class: { select: { name: true } } },
                },
            },
        });
        res.json(rows);
    }
    catch (error) {
        if (error instanceof Error && (error.message === 'MODULE_NOT_ALLOWED' || error.message === 'STAFF_PROFILE_NOT_FOUND')) {
            return res.status(403).json({ error: 'Module non autorisé' });
        }
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/module-records', async (req, res) => {
    try {
        const { moduleKey, title, payload, studentId, status } = req.body ?? {};
        const allowedKeys = new Set(['health_log', 'it_requests', 'maintenance_requests']);
        const key = String(moduleKey || '').trim();
        if (!allowedKeys.has(key) || !title || !String(title).trim()) {
            return res.status(400).json({ error: 'moduleKey et title sont requis' });
        }
        await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, key);
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(req.user.id);
        if (!ctx)
            return res.status(403).json({ error: 'Profil introuvable' });
        const created = await prisma_1.default.staffModuleRecord.create({
            data: {
                staffMemberId: ctx.staff.id,
                moduleKey: key,
                title: String(title).trim().slice(0, 200),
                status: typeof status === 'string' && status.trim() ? status.trim().slice(0, 32) : 'OPEN',
                payload: payload ?? undefined,
                studentId: studentId || null,
            },
            include: {
                student: {
                    include: { user: { select: { firstName: true, lastName: true } } },
                },
            },
        });
        res.status(201).json(created);
    }
    catch (error) {
        if (error instanceof Error && (error.message === 'MODULE_NOT_ALLOWED' || error.message === 'STAFF_PROFILE_NOT_FOUND')) {
            return res.status(403).json({ error: 'Module non autorisé' });
        }
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.patch('/module-records/:id', async (req, res) => {
    try {
        const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(req.user.id);
        if (!ctx)
            return res.status(403).json({ error: 'Profil introuvable' });
        const existing = await prisma_1.default.staffModuleRecord.findFirst({
            where: { id: req.params.id, staffMemberId: ctx.staff.id },
        });
        if (!existing)
            return res.status(404).json({ error: 'Enregistrement introuvable' });
        await (0, staff_visible_modules_util_1.assertStaffHasModule)(req.user.id, existing.moduleKey);
        const { status, title, payload } = req.body ?? {};
        const updated = await prisma_1.default.staffModuleRecord.update({
            where: { id: existing.id },
            data: {
                ...(status !== undefined && { status: String(status).trim().slice(0, 32) }),
                ...(title !== undefined && { title: String(title).trim().slice(0, 200) }),
                ...(payload !== undefined && { payload }),
            },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.use('/', staff_notifications_routes_1.default);
router.use('/', staff_roles_routes_1.default);
router.use('/health-messaging', staff_health_messaging_routes_1.default);
router.use('/pedagogy', staff_pedagogy_routes_1.default);
router.use(staff_library_routes_1.default);
exports.default = router;
//# sourceMappingURL=staff.routes.js.map