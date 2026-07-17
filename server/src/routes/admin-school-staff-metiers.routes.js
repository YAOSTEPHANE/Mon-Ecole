"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = __importDefault(require("../utils/prisma"));
const school_staff_metiers_util_1 = require("../utils/school-staff-metiers.util");
const staff_visible_modules_util_1 = require("../utils/staff-visible-modules.util");
const router = (0, express_1.Router)();
const KIND_SET = new Set(school_staff_metiers_util_1.SUPPORT_STAFF_KINDS);
router.get('/school-staff-metiers', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        const metiers = await (0, school_staff_metiers_util_1.listSchoolStaffMetiers)(schoolId);
        res.json({
            metiers,
            moduleLabels: staff_visible_modules_util_1.STAFF_MODULE_LABELS,
            defaultKindLabels: school_staff_metiers_util_1.DEFAULT_SUPPORT_KIND_LABELS,
        });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
router.put('/school-staff-metiers/:supportKind', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        const supportKind = String(req.params.supportKind ?? '').trim();
        if (!KIND_SET.has(supportKind)) {
            return res.status(400).json({ error: 'Type de métier invalide' });
        }
        const { label, description, defaultModules, isActive, sortOrder } = req.body ?? {};
        const existing = await prisma_1.default.schoolStaffMetier.findUnique({
            where: { schoolId_supportKind: { schoolId, supportKind } },
        });
        if (!existing) {
            await (0, school_staff_metiers_util_1.seedSchoolStaffMetiers)(schoolId);
        }
        const modules = [];
        if (Array.isArray(defaultModules)) {
            const allowed = new Set((0, staff_visible_modules_util_1.getEligibleModulesForSupportKind)(supportKind));
            const set = new Set(['overview']);
            for (const raw of defaultModules) {
                const id = (0, staff_visible_modules_util_1.normalizeStaffModuleId)(raw);
                if (id && allowed.has(id))
                    set.add(id);
            }
            modules.push(...set);
        }
        const data = {};
        if (label !== undefined) {
            data.label = typeof label === 'string' && label.trim() ? label.trim() : null;
        }
        if (description !== undefined) {
            data.description =
                typeof description === 'string' && description.trim() ? description.trim() : null;
        }
        if (modules.length > 0)
            data.defaultModules = modules;
        if (typeof isActive === 'boolean')
            data.isActive = isActive;
        if (sortOrder !== undefined && sortOrder !== null && !Number.isNaN(Number(sortOrder))) {
            data.sortOrder = Number(sortOrder);
        }
        const updated = await prisma_1.default.schoolStaffMetier.update({
            where: { schoolId_supportKind: { schoolId, supportKind } },
            data,
        });
        const metiers = await (0, school_staff_metiers_util_1.listSchoolStaffMetiers)(schoolId);
        const row = metiers.find((m) => m.supportKind === supportKind);
        res.json(row ?? updated);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
/** Réinitialise les métiers de l’établissement actif aux défauts plateforme. */
router.post('/school-staff-metiers/seed-defaults', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        await prisma_1.default.schoolStaffMetier.deleteMany({ where: { schoolId } });
        const count = await (0, school_staff_metiers_util_1.seedSchoolStaffMetiers)(schoolId);
        const metiers = await (0, school_staff_metiers_util_1.listSchoolStaffMetiers)(schoolId);
        res.json({ ok: true, count, metiers });
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=admin-school-staff-metiers.routes.js.map