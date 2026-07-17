"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMPAIGN_KIND_LABELS = exports.VISIT_OUTCOME_LABELS = void 0;
exports.assertHealthModuleAccess = assertHealthModuleAccess;
const staff_visible_modules_util_1 = require("./staff-visible-modules.util");
async function assertHealthModuleAccess(userId, role) {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN')
        return;
    if (role === 'STAFF') {
        await (0, staff_visible_modules_util_1.assertStaffHasModule)(userId, 'health_log');
        return;
    }
    const err = new Error('HEALTH_FORBIDDEN');
    err.statusCode = 403;
    throw err;
}
exports.VISIT_OUTCOME_LABELS = {
    RETURN_TO_CLASS: 'Retour en classe',
    SENT_HOME: 'Retour à domicile',
    PARENT_PICKUP: 'Récupération par un parent',
    REFERRED_HOSPITAL: 'Orientation hôpital / SAMU',
    REST_INFIRMARY: 'Repos à l’infirmierie',
    OTHER: 'Autre',
};
exports.CAMPAIGN_KIND_LABELS = {
    VACCINATION: 'Campagne de vaccination',
    HEALTH_CHECKUP: 'Bilan de santé',
    AWARENESS: 'Sensibilisation santé',
    EMERGENCY_PREP: 'Gestion des urgences / exercice',
};
//# sourceMappingURL=health-access.util.js.map