"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STAFF_MODULES_READ_ONLY = void 0;
exports.staffModuleIsReadOnlyByDesign = staffModuleIsReadOnlyByDesign;
exports.staffModuleGrantsWriteAccess = staffModuleGrantsWriteAccess;
/**
 * Modules affichés en consultation seule (registre, rapports, pilotage…).
 * Tous les autres modules visibles accordent création / modification / suppression
 * sur les routes /admin couvertes par le module.
 */
exports.STAFF_MODULES_READ_ONLY = new Set([
    'overview',
    'student_registry',
    'reports_mgmt',
    'analytics_mgmt',
    'pedagogical_tracking',
    'academic_overview',
]);
function staffModuleIsReadOnlyByDesign(moduleId) {
    return exports.STAFF_MODULES_READ_ONLY.has(moduleId);
}
/** Le métier peut agir (pas seulement consulter) dans ce module. */
function staffModuleGrantsWriteAccess(moduleId, visibleModules) {
    return visibleModules.includes(moduleId) && !staffModuleIsReadOnlyByDesign(moduleId);
}
//# sourceMappingURL=staff-module-capabilities.util.js.map