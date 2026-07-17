"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readSchoolSlugFromRequest = void 0;
const express_1 = require("express");
const school_context_middleware_1 = require("../middleware/school-context.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const ensure_default_school_util_1 = require("../utils/ensure-default-school.util");
const school_prisma_util_1 = require("../utils/school-prisma.util");
const school_context_util_1 = require("../utils/school-context.util");
Object.defineProperty(exports, "readSchoolSlugFromRequest", { enumerable: true, get: function () { return school_context_util_1.readSchoolSlugFromRequest; } });
const app_branding_prisma_util_1 = require("../utils/app-branding-prisma.util");
const school_staff_metiers_util_1 = require("../utils/school-staff-metiers.util");
const router = (0, express_1.Router)();
function slugify(name) {
    return name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48) || 'college';
}
/** Liste des établissements accessibles par l’utilisateur connecté */
router.get('/schools', async (req, res) => {
    try {
        await (0, ensure_default_school_util_1.ensureDefaultSchool)();
        const userId = req.user.id;
        const role = req.user.role;
        const schools = await (0, school_context_util_1.listSchoolsForUser)(userId, role);
        res.json(schools);
    }
    catch (error) {
        if (error instanceof ensure_default_school_util_1.SchoolPrismaNotReadyError) {
            return res.status(503).json({ error: school_prisma_util_1.SCHOOL_PRISMA_HINT });
        }
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
/** Contexte établissement actif */
router.get('/schools/active', school_context_middleware_1.attachSchoolContext, async (req, res) => {
    res.json({
        schoolId: req.schoolId,
        school: req.school,
    });
});
/** Définir l’établissement par défaut pour l’utilisateur */
router.put('/schools/active', async (req, res) => {
    try {
        const { schoolId } = req.body ?? {};
        if (!schoolId || typeof schoolId !== 'string') {
            return res.status(400).json({ error: 'schoolId requis' });
        }
        const userId = req.user.id;
        const role = req.user.role;
        const schools = await (0, school_context_util_1.listSchoolsForUser)(userId, role);
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
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
/** CRUD établissements — SUPER_ADMIN */
router.get('/schools/manage', async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Réservé au super administrateur' });
        }
        const list = await prisma_1.default.school.findMany({
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
            include: {
                _count: {
                    select: {
                        classes: true,
                        students: true,
                        admissions: true,
                        members: true,
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
router.post('/schools', async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Réservé au super administrateur' });
        }
        const { name, shortName, address, phone, email, website, principalName, isDefault, adminUserIds } = req.body ?? {};
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ error: 'Nom de l’établissement requis' });
        }
        let slug = slugify(name);
        const taken = await prisma_1.default.school.findUnique({ where: { slug } });
        if (taken)
            slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
        if (isDefault === true) {
            await prisma_1.default.school.updateMany({ data: { isDefault: false } });
        }
        const school = await prisma_1.default.school.create({
            data: {
                name: name.trim(),
                slug,
                shortName: typeof shortName === 'string' ? shortName.trim() || null : null,
                address: typeof address === 'string' ? address.trim() || null : null,
                phone: typeof phone === 'string' ? phone.trim() || null : null,
                email: typeof email === 'string' ? email.trim() || null : null,
                website: typeof website === 'string' ? website.trim() || null : null,
                principalName: typeof principalName === 'string' ? principalName.trim() || null : null,
                isDefault: isDefault === true,
            },
        });
        const brandingDelegate = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
        if (brandingDelegate) {
            await brandingDelegate.create({
                data: {
                    id: school.id,
                    schoolId: school.id,
                    appTitle: school.shortName || school.name,
                    schoolDisplayName: school.name,
                    schoolAddress: school.address,
                    schoolPhone: school.phone,
                    schoolEmail: school.email,
                    schoolWebsite: school.website,
                    schoolPrincipal: school.principalName,
                },
            });
        }
        const userIds = Array.isArray(adminUserIds)
            ? adminUserIds.map((id) => String(id).trim()).filter(Boolean)
            : [];
        if (userIds.length > 0) {
            await Promise.all(userIds.map((userId, i) => prisma_1.default.schoolMember.upsert({
                where: { schoolId_userId: { schoolId: school.id, userId } },
                create: {
                    schoolId: school.id,
                    userId,
                    isDefault: i === 0,
                },
                update: i === 0 ? { isDefault: true } : {},
            })));
        }
        await (0, school_staff_metiers_util_1.seedSchoolStaffMetiers)(school.id);
        res.status(201).json(school);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.put('/schools/:id', async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ error: 'Réservé au super administrateur' });
        }
        const { id } = req.params;
        const existing = await prisma_1.default.school.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Établissement introuvable' });
        const { name, shortName, address, phone, email, website, principalName, isActive, isDefault } = req.body ?? {};
        if (isDefault === true) {
            await prisma_1.default.school.updateMany({
                data: { isDefault: false },
                where: { id: { not: id } },
            });
        }
        const data = {};
        if (typeof name === 'string' && name.trim())
            data.name = name.trim();
        if (shortName !== undefined)
            data.shortName = typeof shortName === 'string' ? shortName.trim() || null : null;
        if (address !== undefined)
            data.address = typeof address === 'string' ? address.trim() || null : null;
        if (phone !== undefined)
            data.phone = typeof phone === 'string' ? phone.trim() || null : null;
        if (email !== undefined)
            data.email = typeof email === 'string' ? email.trim() || null : null;
        if (website !== undefined)
            data.website = typeof website === 'string' ? website.trim() || null : null;
        if (principalName !== undefined) {
            data.principalName = typeof principalName === 'string' ? principalName.trim() || null : null;
        }
        if (typeof isActive === 'boolean')
            data.isActive = isActive;
        if (typeof isDefault === 'boolean')
            data.isDefault = isDefault;
        const school = await prisma_1.default.school.update({ where: { id }, data });
        res.json(school);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
/** Résolution publique par slug (page d’accueil / pré-inscription) */
router.get('/schools/by-slug/:slug', async (req, res) => {
    try {
        const slug = String(req.params.slug || '').trim().toLowerCase();
        if (!slug)
            return res.status(400).json({ error: 'Slug requis' });
        const school = await (0, school_context_util_1.resolveSchoolBySlug)(slug);
        if (!school)
            return res.status(404).json({ error: 'Établissement introuvable' });
        res.json(school);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=admin-schools.routes.js.map