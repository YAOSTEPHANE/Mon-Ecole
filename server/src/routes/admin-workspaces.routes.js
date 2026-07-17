"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_visible_modules_util_1 = require("../utils/admin-visible-modules.util");
const router = (0, express_1.Router)();
router.get('/workspaces/module-catalog', async (_req, res) => {
    try {
        res.json({
            categories: admin_visible_modules_util_1.ADMIN_MODULE_CATEGORIES,
            labels: admin_visible_modules_util_1.ADMIN_MODULE_LABELS,
            configurableIds: (0, admin_visible_modules_util_1.getAllConfigurableAdminModules)(),
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.get('/workspaces/my-context', async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const ctx = await (0, admin_visible_modules_util_1.resolveAdminVisibleModules)(userId, role);
        res.json(ctx);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.get('/workspaces', async (_req, res) => {
    try {
        const list = await prisma_1.default.adminWorkspace.findMany({
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            include: {
                _count: { select: { members: true } },
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
                        },
                    },
                },
            },
        });
        res.json(list);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.post('/workspaces', async (req, res) => {
    try {
        const { name, description, enabledModules, isDefault, memberUserIds } = req.body ?? {};
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Le nom de l’espace est requis' });
        }
        let slug = (0, admin_visible_modules_util_1.slugifyWorkspaceName)(name.trim());
        const existingSlug = await prisma_1.default.adminWorkspace.findUnique({ where: { slug } });
        if (existingSlug) {
            slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        }
        const modules = (0, admin_visible_modules_util_1.sanitizeEnabledAdminModules)(enabledModules);
        if (isDefault === true) {
            await prisma_1.default.adminWorkspace.updateMany({ data: { isDefault: false } });
        }
        const workspace = await prisma_1.default.adminWorkspace.create({
            data: {
                name: name.trim(),
                slug,
                description: typeof description === 'string' ? description.trim() || null : null,
                enabledModules: modules,
                isDefault: isDefault === true,
                members: Array.isArray(memberUserIds)
                    ? {
                        create: memberUserIds
                            .map((id) => String(id).trim())
                            .filter(Boolean)
                            .map((userId) => ({ userId })),
                    }
                    : undefined,
            },
            include: {
                _count: { select: { members: true } },
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
                        },
                    },
                },
            },
        });
        res.status(201).json(workspace);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.put('/workspaces/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, enabledModules, isActive, isDefault, memberUserIds } = req.body ?? {};
        const existing = await prisma_1.default.adminWorkspace.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Espace introuvable' });
        if (isDefault === true) {
            await prisma_1.default.adminWorkspace.updateMany({ data: { isDefault: false }, where: { id: { not: id } } });
        }
        const data = {};
        if (typeof name === 'string' && name.trim())
            data.name = name.trim();
        if (description !== undefined) {
            data.description = typeof description === 'string' ? description.trim() || null : null;
        }
        if (enabledModules !== undefined) {
            data.enabledModules = (0, admin_visible_modules_util_1.sanitizeEnabledAdminModules)(enabledModules);
        }
        if (typeof isActive === 'boolean')
            data.isActive = isActive;
        if (typeof isDefault === 'boolean')
            data.isDefault = isDefault;
        await prisma_1.default.adminWorkspace.update({ where: { id }, data });
        if (Array.isArray(memberUserIds)) {
            const ids = memberUserIds.map((uid) => String(uid).trim()).filter(Boolean);
            await prisma_1.default.adminWorkspaceMember.deleteMany({ where: { workspaceId: id } });
            if (ids.length > 0) {
                await prisma_1.default.adminWorkspaceMember.createMany({
                    data: ids.map((userId) => ({ workspaceId: id, userId })),
                });
            }
        }
        const workspace = await prisma_1.default.adminWorkspace.findUnique({
            where: { id },
            include: {
                _count: { select: { members: true } },
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
                        },
                    },
                },
            },
        });
        res.json(workspace);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.delete('/workspaces/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await prisma_1.default.adminWorkspace.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Espace introuvable' });
        await prisma_1.default.adminWorkspace.update({
            where: { id },
            data: { isActive: false, isDefault: false },
        });
        res.json({ ok: true, deactivated: true });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=admin-workspaces.routes.js.map