"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAFF_MODULE_LABELS = exports.STAFF_MODULE_IDS = void 0;
exports.getAllStaffVisibleModules = getAllStaffVisibleModules;
exports.normalizeStaffModuleId = normalizeStaffModuleId;
exports.getEligibleModulesForSupportKind = getEligibleModulesForSupportKind;
exports.getEligibleModulesForStaffMember = getEligibleModulesForStaffMember;
exports.sanitizeVisibleStaffModules = sanitizeVisibleStaffModules;
exports.resolveVisibleStaffModules = resolveVisibleStaffModules;
exports.syncStaffVisibleModulesIfStale = syncStaffVisibleModulesIfStale;
exports.getStaffMemberModuleContext = getStaffMemberModuleContext;
exports.assertStaffHasModule = assertStaffHasModule;
const prisma_1 = __importDefault(require("./prisma"));
/** Identifiants des modules de l’espace personnel STAFF. */
exports.STAFF_MODULE_IDS = [
    'overview',
    'counter',
    'admissions',
    'appointments',
    'student_registry',
    'treasury',
    'validations',
    'academic_overview',
    'class_councils',
    'health_log',
    'library',
    'digital_library',
    'it_requests',
    'maintenance_requests',
    'students_mgmt',
    'academic_mgmt',
    'grading_mgmt',
    'classes_mgmt',
    'teachers_mgmt',
    'educators_mgmt',
    'staff_mgmt',
    'parents_mgmt',
    'pedagogical_tracking',
    'discipline_mgmt',
    'extracurricular_mgmt',
    'orientation_mgmt',
    'communication_mgmt',
    'library_mgmt',
    'material_mgmt',
    'reports_mgmt',
    'analytics_mgmt',
    'schedule_mgmt',
    'pointage_mgmt',
    'attendance_mgmt',
    'hr_mgmt',
    'notifications_mgmt',
    'fees_mgmt',
    'tuition_fees_mgmt',
    'payments_mgmt',
    'accounting_mgmt',
    'administrative_mgmt',
];
const MODULE_SET = new Set(exports.STAFF_MODULE_IDS);
function getAllStaffVisibleModules() {
    return [...exports.STAFF_MODULE_IDS];
}
/** Correspondance ids module ADMIN → ids module STAFF (évite perte à l’enregistrement). */
const STAFF_MODULE_ALIASES = {
    accounting: 'accounting_mgmt',
    fees: 'fees_mgmt',
    'tuition-fees': 'tuition_fees_mgmt',
    payments: 'payments_mgmt',
    administrative: 'administrative_mgmt',
    hr: 'hr_mgmt',
    library: 'library_mgmt',
    material: 'material_mgmt',
    reports: 'reports_mgmt',
    analytics: 'analytics_mgmt',
    schedule: 'schedule_mgmt',
    pointage: 'pointage_mgmt',
    attendance: 'attendance_mgmt',
    communication: 'communication_mgmt',
    students: 'students_mgmt',
    classes: 'classes_mgmt',
    teachers: 'teachers_mgmt',
    educators: 'educators_mgmt',
    'staff-personnel': 'staff_mgmt',
    'parent-guardians': 'parents_mgmt',
    pedagogical: 'pedagogical_tracking',
    discipline: 'discipline_mgmt',
    extracurricular: 'extracurricular_mgmt',
    orientation: 'orientation_mgmt',
    grading: 'grading_mgmt',
    academic: 'academic_mgmt',
    management: 'academic_mgmt',
    notifications: 'notifications_mgmt',
};
function normalizeStaffModuleId(raw) {
    const id = String(raw ?? '').trim();
    if (!id)
        return null;
    if (MODULE_SET.has(id))
        return id;
    return STAFF_MODULE_ALIASES[id] ?? null;
}
exports.STAFF_MODULE_LABELS = {
    overview: 'Vue d’ensemble',
    counter: 'Guichet scolarité',
    admissions: 'Inscriptions & admissions',
    appointments: 'Rendez-vous parents',
    student_registry: 'Registre élèves',
    treasury: 'Trésorerie & frais',
    validations: 'Validations notes & moyennes',
    academic_overview: 'Pilotage pédagogique',
    class_councils: 'Conseils de classe',
    health_log: 'Infirmerie — consultations',
    library: 'Bibliothèque — prêts',
    digital_library: 'Bibliothèque numérique',
    it_requests: 'Support informatique',
    maintenance_requests: 'Maintenance & travaux',
    students_mgmt: 'Élèves',
    academic_mgmt: 'Gestion académique',
    grading_mgmt: 'Notation & évaluation',
    classes_mgmt: 'Classes',
    teachers_mgmt: 'Enseignants',
    educators_mgmt: 'Personnel — éducateurs',
    staff_mgmt: 'Personnel',
    parents_mgmt: 'Parents & tuteurs',
    pedagogical_tracking: 'Suivi pédagogique',
    discipline_mgmt: 'Discipline & règlement',
    extracurricular_mgmt: 'Activités parascolaires',
    orientation_mgmt: 'Orientation',
    communication_mgmt: 'Communication',
    library_mgmt: 'Bibliothèque',
    material_mgmt: 'Gestion matérielle',
    reports_mgmt: 'Rapports & statistiques',
    analytics_mgmt: 'Analytique avancée',
    schedule_mgmt: 'Emploi du temps',
    pointage_mgmt: 'Pointage des élèves',
    attendance_mgmt: 'Gestion des présences',
    hr_mgmt: 'Ressources humaines',
    notifications_mgmt: 'Notifications',
    fees_mgmt: 'Gestion des frais',
    tuition_fees_mgmt: 'Frais de scolarité',
    payments_mgmt: 'Paiements',
    accounting_mgmt: 'Comptabilité',
    administrative_mgmt: 'Gestion administrative',
};
/** Tous les modules STAFF sont cochables pour chaque métier. */
function getEligibleModulesForSupportKind(_supportKind) {
    return getAllStaffVisibleModules();
}
function getEligibleModulesForStaffMember(staffCategory, supportKind) {
    if (staffCategory === 'SUPPORT') {
        return getEligibleModulesForSupportKind(supportKind ?? 'SECRETARY');
    }
    return ['overview'];
}
function sanitizeVisibleStaffModules(staffCategory, supportKind, requested) {
    if (staffCategory !== 'SUPPORT') {
        return ['overview'];
    }
    if (!Array.isArray(requested) || requested.length === 0) {
        return ['overview'];
    }
    const withOverview = new Set(['overview']);
    for (const raw of requested) {
        const id = normalizeStaffModuleId(raw);
        if (id && id !== 'overview')
            withOverview.add(id);
    }
    return [...withOverview];
}
function resolveVisibleStaffModules(staffCategory, supportKind, stored) {
    if (staffCategory !== 'SUPPORT') {
        return ['overview'];
    }
    if (!stored || stored.length === 0) {
        return getEligibleModulesForStaffMember(staffCategory, supportKind);
    }
    let picked = stored
        .map((id) => normalizeStaffModuleId(id))
        .filter((id) => id !== null);
    if (!picked.includes('overview')) {
        picked.unshift('overview');
    }
    return [...new Set(picked)];
}
/**
 * Première connexion uniquement : enregistre les modules par défaut du métier si la liste est vide.
 * Ne réécrit pas une personnalisation déjà enregistrée.
 */
async function syncStaffVisibleModulesIfStale(staff) {
    const stored = staff.visibleStaffModules ?? [];
    if (stored.length > 0)
        return null;
    const { getEligibleModulesForStaffMemberAtSchool } = await import('./school-staff-metiers.util');
    const defaults = staff.schoolId
        ? await getEligibleModulesForStaffMemberAtSchool(staff.staffCategory, staff.supportKind, staff.schoolId)
        : getEligibleModulesForStaffMember(staff.staffCategory, staff.supportKind);
    await prisma_1.default.staffMember.update({
        where: { id: staff.id },
        data: { visibleStaffModules: defaults },
    });
    return defaults;
}
async function getStaffMemberModuleContext(userId) {
    const staff = await prisma_1.default.staffMember.findUnique({
        where: { userId },
        select: {
            id: true,
            staffCategory: true,
            supportKind: true,
            visibleStaffModules: true,
            schoolId: true,
        },
    });
    if (!staff)
        return null;
    const { resolveVisibleStaffModulesAtSchool, labelForSupportKind } = await import('./school-staff-metiers.util');
    const visibleModules = staff.schoolId
        ? await resolveVisibleStaffModulesAtSchool(staff.staffCategory, staff.supportKind, staff.visibleStaffModules, staff.schoolId)
        : resolveVisibleStaffModules(staff.staffCategory, staff.supportKind, staff.visibleStaffModules);
    let metierLabel = null;
    if (staff.schoolId && staff.supportKind) {
        const row = await prisma_1.default.schoolStaffMetier.findUnique({
            where: {
                schoolId_supportKind: { schoolId: staff.schoolId, supportKind: staff.supportKind },
            },
            select: { label: true },
        });
        metierLabel = labelForSupportKind(staff.supportKind, row?.label);
    }
    return { staff, visibleModules, metierLabel };
}
async function assertStaffHasModule(userId, moduleId) {
    const staff = await prisma_1.default.staffMember.findUnique({
        where: { userId },
        select: {
            id: true,
            staffCategory: true,
            supportKind: true,
            visibleStaffModules: true,
            schoolId: true,
        },
    });
    if (!staff) {
        const err = new Error('STAFF_PROFILE_NOT_FOUND');
        err.statusCode = 403;
        throw err;
    }
    await syncStaffVisibleModulesIfStale(staff);
    const ctx = await getStaffMemberModuleContext(userId);
    if (!ctx) {
        const err = new Error('STAFF_PROFILE_NOT_FOUND');
        err.statusCode = 403;
        throw err;
    }
    if (!ctx.visibleModules.includes(moduleId)) {
        const err = new Error('MODULE_NOT_ALLOWED');
        err.statusCode = 403;
        throw err;
    }
}
//# sourceMappingURL=staff-visible-modules.util.js.map