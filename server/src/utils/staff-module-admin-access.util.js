"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAFF_TUITION_RATES_READ_MODULE_IDS = void 0;
exports.staffTuitionRatesReadAllowed = staffTuitionRatesReadAllowed;
exports.staffSecretaryBlocksDestructiveDelete = staffSecretaryBlocksDestructiveDelete;
exports.isStaffAdminForbidden = isStaffAdminForbidden;
exports.isStaffModuleAdminPath = isStaffModuleAdminPath;
exports.staffModuleAdminPathAllowed = staffModuleAdminPathAllowed;
exports.staffModuleGrantsWriteUi = staffModuleGrantsWriteUi;
exports.getStaffDirectAdminPrefixes = getStaffDirectAdminPrefixes;
const staff_module_capabilities_util_1 = require("./staff-module-capabilities.util");
/** Préfixes /admin couverts par au moins un module STAFF. */
const MODULE_ROUTE_RULES = [
    // ——— Pédagogie & scolarité ———
    { moduleId: 'students_mgmt', prefixes: ['/students', '/school-tracks', '/subject-options'], access: 'write' },
    { moduleId: 'student_registry', prefixes: ['/students'], access: 'read' },
    { moduleId: 'classes_mgmt', prefixes: ['/classes', '/class-groups', '/school-tracks', '/subject-options'], access: 'write' },
    { moduleId: 'teachers_mgmt', prefixes: ['/teachers'], access: 'write' },
    { moduleId: 'educators_mgmt', prefixes: ['/educators', '/staff/personnel-registry'], access: 'write' },
    { moduleId: 'staff_mgmt', prefixes: ['/staff-personnel', '/staff'], access: 'write' },
    { moduleId: 'parents_mgmt', prefixes: ['/parents'], access: 'write' },
    { moduleId: 'admissions', prefixes: ['/admissions'], access: 'write' },
    {
        moduleId: 'academic_mgmt',
        prefixes: [
            '/courses',
            '/school-calendar-events',
            '/school-gallery-items',
            '/school-curricula',
            '/school-tracks',
            '/subject-options',
        ],
        access: 'write',
    },
    {
        moduleId: 'grading_mgmt',
        prefixes: ['/grades', '/assignments', '/report-cards', '/academic-change-requests'],
        access: 'write',
    },
    { moduleId: 'schedule_mgmt', prefixes: ['/schedules', '/schedule-room-blocks'], access: 'write' },
    { moduleId: 'attendance_mgmt', prefixes: ['/absences', '/teachers/attendance'], access: 'write' },
    { moduleId: 'pointage_mgmt', prefixes: ['/students/nfc', '/nfc'], access: 'write' },
    { moduleId: 'discipline_mgmt', prefixes: ['/discipline'], access: 'write' },
    { moduleId: 'extracurricular_mgmt', prefixes: ['/extracurricular'], access: 'write' },
    { moduleId: 'orientation_mgmt', prefixes: ['/orientation'], access: 'write' },
    { moduleId: 'communication_mgmt', prefixes: ['/messages', '/announcements'], access: 'write' },
    { moduleId: 'library_mgmt', prefixes: ['/library'], access: 'write' },
    { moduleId: 'library', prefixes: ['/library'], access: 'write' },
    { moduleId: 'digital_library', prefixes: ['/library'], access: 'write' },
    { moduleId: 'material_mgmt', prefixes: ['/material'], access: 'write' },
    { moduleId: 'reports_mgmt', prefixes: ['/reports'], access: 'read' },
    { moduleId: 'analytics_mgmt', prefixes: ['/pedagogical', '/metrics'], access: 'read' },
    { moduleId: 'pedagogical_tracking', prefixes: ['/pedagogical'], access: 'read' },
    { moduleId: 'hr_mgmt', prefixes: ['/hr'], access: 'write' },
    { moduleId: 'class_councils', prefixes: ['/class-councils'], access: 'write' },
    { moduleId: 'validations', prefixes: ['/academic-change-requests', '/grades'], access: 'write' },
    // ——— Finances ———
    {
        moduleId: 'fees_mgmt',
        prefixes: [
            '/tuition-fees',
            '/tuition-fee-catalog',
            '/tuition-level-rates',
            '/tuition-class-rates',
            '/tuition-payment-schedule-templates',
        ],
        access: 'write',
    },
    {
        moduleId: 'tuition_fees_mgmt',
        prefixes: [
            '/tuition-fees',
            '/tuition-fee-catalog',
            '/tuition-level-rates',
            '/tuition-class-rates',
            '/tuition-payment-schedule-templates',
        ],
        access: 'write',
    },
    { moduleId: 'payments_mgmt', prefixes: ['/payments'], access: 'write' },
    {
        moduleId: 'accounting_mgmt',
        prefixes: [
            '/accounting',
            '/suppliers',
            '/school-expenses',
            '/petty-cash',
            '/petty-cash-movements',
            '/petty-cash-balance',
            '/budget-lines',
        ],
        access: 'write',
    },
    { moduleId: 'treasury', prefixes: ['/payments', '/tuition-fees', '/students', '/classes'], access: 'read' },
    { moduleId: 'counter', prefixes: ['/payments', '/students', '/tuition-fees'], access: 'write' },
    { moduleId: 'administrative_mgmt', prefixes: ['/dashboard'], access: 'read' },
    { moduleId: 'notifications_mgmt', prefixes: ['/notifications'], access: 'write' },
];
const ALL_PREFIXES = [...new Set(MODULE_ROUTE_RULES.flatMap((r) => r.prefixes))];
/**
 * Métiers / modules qui consultent le barème scolarité (inscription, admissions, frais)
 * sans avoir obligatoirement fees_mgmt.
 */
exports.STAFF_TUITION_RATES_READ_MODULE_IDS = [
    'admissions',
    'appointments',
    'students_mgmt',
    'student_registry',
    'classes_mgmt',
    'class_councils',
    'fees_mgmt',
    'tuition_fees_mgmt',
    'payments_mgmt',
    'treasury',
    'counter',
    'administrative_mgmt',
    'validations',
    'academic_overview',
    'pedagogical_tracking',
];
function isTuitionRatesAdminPath(path) {
    return (path === '/tuition-level-rates' ||
        path.startsWith('/tuition-level-rates/') ||
        path === '/tuition-class-rates' ||
        path.startsWith('/tuition-class-rates/'));
}
function staffTuitionRatesReadAllowed(visibleModules) {
    return hasAnyModule(visibleModules, exports.STAFF_TUITION_RATES_READ_MODULE_IDS);
}
function normalizePath(path) {
    const raw = path.split('?')[0] || '/';
    return raw.startsWith('/') ? raw : `/${raw}`;
}
function normalizeMethod(method) {
    return method.toUpperCase();
}
/**
 * Suppression définitive d’un élève ou d’une classe : réservée aux administrateurs,
 * pas aux comptes secrétaire (STAFF / supportKind SECRETARY).
 */
function staffSecretaryBlocksDestructiveDelete(path, method, supportKind) {
    if (supportKind !== 'SECRETARY')
        return false;
    const m = normalizeMethod(method);
    if (m !== 'DELETE')
        return false;
    const parts = normalizePath(path).split('/').filter(Boolean);
    if (parts[0] === 'students' && parts.length === 2)
        return true;
    if (parts[0] === 'classes' && parts.length === 2)
        return true;
    return false;
}
function pathMatchesPrefix(path, prefix) {
    return path === prefix || path.startsWith(`${prefix}/`);
}
function pathMatchesAny(path, prefixes) {
    return prefixes.some((p) => pathMatchesPrefix(path, p));
}
function hasAnyModule(modules, ids) {
    return ids.some((id) => modules.includes(id));
}
function methodAllowedForAccess(method, access, allowDelete) {
    if (method === 'GET' || method === 'HEAD')
        return true;
    if (access === 'read')
        return false;
    if (method === 'DELETE')
        return allowDelete;
    return method === 'POST' || method === 'PUT' || method === 'PATCH';
}
/** Actions /admin toujours réservées aux administrateurs. */
function isStaffAdminForbidden(path, method, visibleModules = []) {
    const p = normalizePath(path);
    const m = normalizeMethod(method);
    if (p.startsWith('/schools'))
        return true;
    if (p.startsWith('/workspaces')) {
        if (p === '/workspaces/my-context' || p === '/workspaces/module-catalog')
            return false;
        return true;
    }
    if (p.startsWith('/app-branding'))
        return true;
    if (p.startsWith('/users')) {
        if (m === 'GET' || m === 'HEAD')
            return false;
        return true;
    }
    return false;
}
/** Sous-chemin disponibilités enseignant pour l’emploi du temps. */
function isTeacherScheduleAvailabilityPath(path) {
    return /\/teachers\/[^/]+\/schedule-availability/.test(path);
}
/** Au moins une règle de module pourrait couvrir ce chemin (hors interdictions). */
function isStaffModuleAdminPath(path, method) {
    const p = normalizePath(path);
    const m = normalizeMethod(method);
    if (isStaffAdminForbidden(p, m))
        return false;
    if (!pathMatchesAny(p, ALL_PREFIXES))
        return false;
    return MODULE_ROUTE_RULES.some((rule) => {
        const allowDelete = rule.access === 'write' && !(0, staff_module_capabilities_util_1.staffModuleIsReadOnlyByDesign)(rule.moduleId);
        return pathMatchesAny(p, rule.prefixes) && methodAllowedForAccess(m, rule.access, allowDelete);
    });
}
function ruleMatchesPath(rule, path) {
    return pathMatchesAny(path, rule.prefixes);
}
/** GET /users pour sélection destinataires (communication). */
function staffUsersListAllowed(visibleModules, path, method) {
    if (path !== '/users' && !path.startsWith('/users/'))
        return false;
    if (method !== 'GET' && method !== 'HEAD')
        return false;
    return hasAnyModule(visibleModules, ['communication_mgmt', 'hr_mgmt', 'staff_mgmt']);
}
function admissionsSpecialCase(visibleModules, path, method) {
    if (!path.startsWith('/admissions'))
        return false;
    const canAdmit = visibleModules.includes('admissions') || visibleModules.includes('students_mgmt');
    if (method === 'GET' || method === 'HEAD')
        return canAdmit;
    if (path.endsWith('/enroll') && method === 'POST')
        return canAdmit;
    return (0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)('admissions', visibleModules);
}
function teacherScheduleAvailabilityCase(visibleModules, path, method) {
    if (!isTeacherScheduleAvailabilityPath(path))
        return false;
    if (method === 'GET' || method === 'HEAD') {
        return hasAnyModule(visibleModules, [
            'schedule_mgmt',
            'teachers_mgmt',
            'attendance_mgmt',
            'hr_mgmt',
            'administrative_mgmt',
        ]);
    }
    return ((0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)('schedule_mgmt', visibleModules) ||
        (0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)('teachers_mgmt', visibleModules));
}
function counterPaymentCase(visibleModules, path, method) {
    if (!visibleModules.includes('counter'))
        return false;
    if (path === '/payments/pending-cash' || path.startsWith('/payments/pending-cash')) {
        return method === 'GET' || method === 'HEAD' || method === 'POST' || method === 'PUT' || method === 'PATCH';
    }
    if (path.startsWith('/payments/') && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        return true;
    }
    if ((path === '/students' || path.startsWith('/students/')) && (method === 'GET' || method === 'HEAD')) {
        return true;
    }
    return false;
}
/**
 * Autorise un appel /admin pour un STAFF si un module visible de son espace couvre le chemin et la méthode.
 */
function staffModuleAdminPathAllowed(visibleModules, path, method, supportKind) {
    const p = normalizePath(path);
    const m = normalizeMethod(method);
    if (isStaffAdminForbidden(p, m, visibleModules))
        return false;
    if (staffSecretaryBlocksDestructiveDelete(p, m, supportKind))
        return false;
    if (m === 'DELETE' && (p === '/students' || p.startsWith('/students/'))) {
        return (0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)('students_mgmt', visibleModules);
    }
    if (staffUsersListAllowed(visibleModules, p, m))
        return true;
    if (teacherScheduleAvailabilityCase(visibleModules, p, m))
        return true;
    if (admissionsSpecialCase(visibleModules, p, m))
        return true;
    if (counterPaymentCase(visibleModules, p, m))
        return true;
    for (const rule of MODULE_ROUTE_RULES) {
        if (!visibleModules.includes(rule.moduleId))
            continue;
        if (!ruleMatchesPath(rule, p))
            continue;
        const allowDelete = rule.access === 'write' && (0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)(rule.moduleId, visibleModules);
        if (methodAllowedForAccess(m, rule.access, allowDelete))
            return true;
    }
    // Lecture croisée pour modules financiers / admin
    if (m === 'GET' || m === 'HEAD') {
        if (p === '/students' || p.startsWith('/students/')) {
            return hasAnyModule(visibleModules, [
                'treasury',
                'counter',
                'fees_mgmt',
                'tuition_fees_mgmt',
                'payments_mgmt',
                'parents_mgmt',
                'administrative_mgmt',
                'attendance_mgmt',
                'students_mgmt',
                'student_registry',
                'admissions',
            ]);
        }
        if (p === '/classes' || p.startsWith('/classes/')) {
            return hasAnyModule(visibleModules, [
                'treasury',
                'counter',
                'administrative_mgmt',
                'attendance_mgmt',
                'classes_mgmt',
                'student_registry',
                'students_mgmt',
                'schedule_mgmt',
            ]);
        }
        if (p === '/teachers' || p.startsWith('/teachers/')) {
            return hasAnyModule(visibleModules, [
                'administrative_mgmt',
                'attendance_mgmt',
                'hr_mgmt',
                'teachers_mgmt',
                'schedule_mgmt',
            ]);
        }
        if (p === '/courses' || p.startsWith('/courses/')) {
            return hasAnyModule(visibleModules, ['academic_mgmt', 'schedule_mgmt', 'grading_mgmt']);
        }
        if (p.startsWith('/material')) {
            return hasAnyModule(visibleModules, ['material_mgmt', 'schedule_mgmt']);
        }
        if (p === '/schedules' || p.startsWith('/schedules/') || p.startsWith('/schedule-room-blocks')) {
            return visibleModules.includes('schedule_mgmt');
        }
        if (p.startsWith('/staff-personnel')) {
            return hasAnyModule(visibleModules, ['administrative_mgmt', 'hr_mgmt', 'staff_mgmt']);
        }
        if (isTuitionRatesAdminPath(p)) {
            return staffTuitionRatesReadAllowed(visibleModules);
        }
    }
    return false;
}
function staffModuleGrantsWriteUi(moduleId, visibleModules) {
    return (0, staff_module_capabilities_util_1.staffModuleGrantsWriteAccess)(moduleId, visibleModules);
}
/** Préfixes /admin utilisés directement depuis /staff (écriture, pas proxy pédagogie GET). */
function getStaffDirectAdminPrefixes() {
    return [
        ...new Set(MODULE_ROUTE_RULES.filter((r) => r.access === 'write').flatMap((r) => r.prefixes)),
    ].map((p) => `/admin${p}`);
}
//# sourceMappingURL=staff-module-admin-access.util.js.map