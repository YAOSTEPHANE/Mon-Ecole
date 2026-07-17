"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const password_util_1 = require("../utils/password.util");
const app_branding_prisma_util_1 = require("../utils/app-branding-prisma.util");
const mongodb_backup_util_1 = require("../utils/mongodb-backup.util");
const performance_metrics_util_1 = require("../utils/performance-metrics.util");
const router = express_1.default.Router();
const PLATFORM_ROLES = [
    'SUPER_ADMIN',
    'ADMIN',
    'TEACHER',
    'STUDENT',
    'PARENT',
    'EDUCATOR',
    'STAFF',
];
router.use(auth_middleware_1.authenticate);
router.use((0, auth_middleware_1.authorize)('SUPER_ADMIN'));
router.get('/overview', async (_req, res) => {
    try {
        const [usersTotal, usersActive, students, teachers, parents, admins, superAdmins, classes, courses, tuitionOpen, recentUsers,] = await Promise.all([
            prisma_1.default.user.count(),
            prisma_1.default.user.count({ where: { isActive: true } }),
            prisma_1.default.student.count(),
            prisma_1.default.teacher.count(),
            prisma_1.default.parent.count(),
            prisma_1.default.user.count({ where: { role: 'ADMIN' } }),
            prisma_1.default.user.count({ where: { role: 'SUPER_ADMIN' } }),
            prisma_1.default.class.count(),
            prisma_1.default.course.count(),
            prisma_1.default.tuitionFee.count({ where: { isPaid: false } }),
            prisma_1.default.user.findMany({
                orderBy: { createdAt: 'desc' },
                take: 8,
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    isActive: true,
                    createdAt: true,
                },
            }),
        ]);
        const usersByRole = await prisma_1.default.user.groupBy({
            by: ['role'],
            _count: { _all: true },
        });
        let branding = null;
        const appBranding = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
        if (appBranding) {
            branding = await appBranding.findUnique({ where: { id: app_branding_prisma_util_1.APP_BRANDING_ID } });
        }
        let metrics = null;
        try {
            metrics = (0, performance_metrics_util_1.getMetricsSummary)();
        }
        catch {
            metrics = null;
        }
        res.json({
            counts: {
                usersTotal,
                usersActive,
                students,
                teachers,
                parents,
                admins,
                superAdmins,
                classes,
                courses,
                tuitionOpen,
            },
            usersByRole: usersByRole.map((r) => ({ role: r.role, count: r._count._all })),
            recentUsers,
            branding,
            metrics,
        });
    }
    catch (error) {
        console.error('GET /super-admin/overview:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.get('/users', async (req, res) => {
    try {
        const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
        const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '50'), 10) || 50, 1), 200);
        const users = await prisma_1.default.user.findMany({
            where: {
                ...(role && PLATFORM_ROLES.includes(role)
                    ? { role: role }
                    : {}),
                ...(q
                    ? {
                        OR: [
                            { email: { contains: q, mode: 'insensitive' } },
                            { firstName: { contains: q, mode: 'insensitive' } },
                            { lastName: { contains: q, mode: 'insensitive' } },
                        ],
                    }
                    : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                phone: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        res.json({ users });
    }
    catch (error) {
        console.error('GET /super-admin/users:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.post('/users', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').custom(password_util_1.assertPasswordPolicy).withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('firstName').trim().notEmpty(),
    (0, express_validator_1.body)('lastName').trim().notEmpty(),
    (0, express_validator_1.body)('role').isIn([...PLATFORM_ROLES]),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName, role, phone } = req.body;
        const existing = await prisma_1.default.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: 'Un compte existe déjà avec cet e-mail.' });
        }
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: await (0, password_util_1.hashPassword)(password),
                firstName,
                lastName,
                role: role,
                phone: phone?.trim() || null,
                isActive: true,
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                createdAt: true,
            },
        });
        res.status(201).json({ user });
    }
    catch (error) {
        console.error('POST /super-admin/users:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.patch('/users/:id', [
    (0, express_validator_1.body)('role').optional().isIn(PLATFORM_ROLES),
    (0, express_validator_1.body)('isActive').optional().isBoolean(),
    (0, express_validator_1.body)('firstName').optional().trim().notEmpty(),
    (0, express_validator_1.body)('lastName').optional().trim().notEmpty(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { id } = req.params;
        const { role, isActive, firstName, lastName } = req.body;
        if (id === req.user.id && role && role !== 'SUPER_ADMIN') {
            return res.status(400).json({ error: 'Vous ne pouvez pas retirer votre propre rôle super admin.' });
        }
        if (id === req.user.id && isActive === false) {
            return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
        }
        const user = await prisma_1.default.user.update({
            where: { id },
            data: {
                ...(role !== undefined ? { role } : {}),
                ...(isActive !== undefined ? { isActive } : {}),
                ...(firstName !== undefined ? { firstName } : {}),
                ...(lastName !== undefined ? { lastName } : {}),
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                isActive: true,
                updatedAt: true,
            },
        });
        res.json({ user });
    }
    catch (error) {
        console.error('PATCH /super-admin/users/:id:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.post('/backup', async (_req, res) => {
    try {
        if (!(0, mongodb_backup_util_1.isMongoBackupFilesystemWritable)()) {
            return res.status(503).json({ ok: false, error: mongodb_backup_util_1.SERVERLESS_MONGODB_BACKUP_MESSAGE });
        }
        const result = await (0, mongodb_backup_util_1.runMongoBackup)();
        res.json(result);
    }
    catch (error) {
        console.error('POST /super-admin/backup:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Échec de la sauvegarde',
        });
    }
});
exports.default = router;
//# sourceMappingURL=super-admin.routes.js.map