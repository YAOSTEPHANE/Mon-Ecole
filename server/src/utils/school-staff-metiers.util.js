"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAFF_MODULE_LABELS = exports.DEFAULT_SUPPORT_KIND_LABELS = exports.SUPPORT_STAFF_KINDS = void 0;
exports.labelForSupportKind = labelForSupportKind;
exports.seedSchoolStaffMetiers = seedSchoolStaffMetiers;
exports.seedAllSchoolsStaffMetiers = seedAllSchoolsStaffMetiers;
exports.listSchoolStaffMetiers = listSchoolStaffMetiers;
exports.getSchoolMetierDefaults = getSchoolMetierDefaults;
exports.assertSupportKindActiveForSchool = assertSupportKindActiveForSchool;
exports.getEligibleModulesForStaffMemberAtSchool = getEligibleModulesForStaffMemberAtSchool;
exports.resolveVisibleStaffModulesAtSchool = resolveVisibleStaffModulesAtSchool;
exports.sanitizeVisibleStaffModulesForSchool = sanitizeVisibleStaffModulesForSchool;
const prisma_1 = __importDefault(require("./prisma"));
const staff_visible_modules_util_1 = require("./staff-visible-modules.util");
Object.defineProperty(exports, "STAFF_MODULE_LABELS", { enumerable: true, get: function () { return staff_visible_modules_util_1.STAFF_MODULE_LABELS; } });
exports.SUPPORT_STAFF_KINDS = [
    'SECRETARY',
    'BURSAR',
    'ACCOUNTANT',
    'STUDIES_DIRECTOR',
    'NURSE',
    'LIBRARIAN',
    'IT',
    'MAINTENANCE',
    'OTHER',
];
exports.DEFAULT_SUPPORT_KIND_LABELS = {
    SECRETARY: 'Secrétaire',
    BURSAR: 'Économe',
    ACCOUNTANT: 'Comptabilité',
    STUDIES_DIRECTOR: 'Directeur(trice) des études',
    NURSE: 'Infirmier(e)',
    LIBRARIAN: 'Bibliothécaire',
    IT: 'Informatique',
    MAINTENANCE: 'Maintenance',
    OTHER: 'Personnel',
};
const KIND_SORT = {
    STUDIES_DIRECTOR: 10,
    SECRETARY: 20,
    BURSAR: 30,
    ACCOUNTANT: 40,
    NURSE: 50,
    LIBRARIAN: 60,
    IT: 70,
    MAINTENANCE: 80,
    OTHER: 90,
};
function modulesFromStored(staffCategory, supportKind, modules) {
    if (staffCategory !== 'SUPPORT')
        return ['overview'];
    const set = new Set(['overview']);
    for (const raw of modules) {
        const id = (0, staff_visible_modules_util_1.normalizeStaffModuleId)(raw);
        if (id && id !== 'overview')
            set.add(id);
    }
    if (set.size === 1 && modules.length === 0) {
        return (0, staff_visible_modules_util_1.getEligibleModulesForSupportKind)(supportKind);
    }
    return [...set];
}
function labelForSupportKind(supportKind, customLabel) {
    const trimmed = customLabel?.trim();
    if (trimmed)
        return trimmed;
    return exports.DEFAULT_SUPPORT_KIND_LABELS[supportKind] ?? supportKind;
}
/** Crée ou met à jour les métiers standard pour un établissement (à la création d’un collège). */
async function seedSchoolStaffMetiers(schoolId) {
    let count = 0;
    for (const supportKind of exports.SUPPORT_STAFF_KINDS) {
        const defaultModules = (0, staff_visible_modules_util_1.getEligibleModulesForSupportKind)(supportKind);
        await prisma_1.default.schoolStaffMetier.upsert({
            where: { schoolId_supportKind: { schoolId, supportKind } },
            create: {
                schoolId,
                supportKind,
                label: exports.DEFAULT_SUPPORT_KIND_LABELS[supportKind],
                defaultModules,
                isActive: true,
                sortOrder: KIND_SORT[supportKind],
            },
            update: {},
        });
        count += 1;
    }
    return count;
}
async function seedAllSchoolsStaffMetiers() {
    const schools = await prisma_1.default.school.findMany({
        where: { isActive: true },
        select: { id: true },
    });
    for (const s of schools) {
        await seedSchoolStaffMetiers(s.id);
    }
}
async function listSchoolStaffMetiers(schoolId) {
    const rows = await prisma_1.default.schoolStaffMetier.findMany({
        where: { schoolId },
        orderBy: [{ sortOrder: 'asc' }, { supportKind: 'asc' }],
    });
    if (rows.length === 0) {
        await seedSchoolStaffMetiers(schoolId);
        return listSchoolStaffMetiers(schoolId);
    }
    return rows.map((row) => ({
        id: row.id,
        schoolId: row.schoolId,
        supportKind: row.supportKind,
        label: labelForSupportKind(row.supportKind, row.label),
        description: row.description,
        defaultModules: modulesFromStored('SUPPORT', row.supportKind, row.defaultModules),
        isActive: row.isActive,
        sortOrder: row.sortOrder,
    }));
}
async function getSchoolMetierDefaults(schoolId, supportKind) {
    const row = await prisma_1.default.schoolStaffMetier.findUnique({
        where: { schoolId_supportKind: { schoolId, supportKind } },
    });
    if (!row || !row.isActive)
        return null;
    return modulesFromStored('SUPPORT', supportKind, row.defaultModules);
}
async function assertSupportKindActiveForSchool(schoolId, supportKind) {
    const row = await prisma_1.default.schoolStaffMetier.findUnique({
        where: { schoolId_supportKind: { schoolId, supportKind } },
        select: { isActive: true },
    });
    if (!row?.isActive) {
        throw new Error('METIER_INACTIVE_FOR_SCHOOL');
    }
}
async function getEligibleModulesForStaffMemberAtSchool(staffCategory, supportKind, schoolId) {
    if (staffCategory !== 'SUPPORT')
        return ['overview'];
    const kind = supportKind ?? 'SECRETARY';
    if (schoolId) {
        const fromSchool = await getSchoolMetierDefaults(schoolId, kind);
        if (fromSchool)
            return fromSchool;
    }
    return (0, staff_visible_modules_util_1.getEligibleModulesForSupportKind)(kind);
}
async function resolveVisibleStaffModulesAtSchool(staffCategory, supportKind, stored, schoolId) {
    if (staffCategory !== 'SUPPORT')
        return ['overview'];
    const eligible = await getEligibleModulesForStaffMemberAtSchool(staffCategory, supportKind, schoolId);
    if (!stored || stored.length === 0) {
        return eligible;
    }
    let picked = stored
        .map((id) => (0, staff_visible_modules_util_1.normalizeStaffModuleId)(id))
        .filter((id) => id !== null);
    if (!picked.includes('overview')) {
        picked.unshift('overview');
    }
    return [...new Set(picked)];
}
async function sanitizeVisibleStaffModulesForSchool(staffCategory, supportKind, requested, schoolId) {
    if (staffCategory !== 'SUPPORT')
        return ['overview'];
    if (!supportKind) {
        throw new Error('SUPPORT_KIND_REQUIRED');
    }
    await assertSupportKindActiveForSchool(schoolId, supportKind);
    if (!Array.isArray(requested) || requested.length === 0) {
        return ['overview'];
    }
    // Plafond = modules possibles pour ce métier (plateforme), pas seulement le sous-ensemble
    // « recommandé » configuré pour l’établissement — aligné avec l’UI « vous pouvez en ajouter d’autres ».
    const allowed = new Set((0, staff_visible_modules_util_1.getEligibleModulesForSupportKind)(supportKind ?? 'OTHER'));
    const withOverview = new Set(['overview']);
    for (const raw of requested) {
        const id = (0, staff_visible_modules_util_1.normalizeStaffModuleId)(raw);
        if (id && id !== 'overview' && allowed.has(id))
            withOverview.add(id);
    }
    return [...withOverview];
}
//# sourceMappingURL=school-staff-metiers.util.js.map