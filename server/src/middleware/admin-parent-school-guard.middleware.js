"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardAdminParentRoute = guardAdminParentRoute;
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
/** Vérifie que le parent ciblé appartient à l’établissement actif (:id ou :parentId). */
async function guardAdminParentRoute(req, res, next) {
    const parentId = req.params.id ?? req.params.parentId;
    if (!parentId || !(0, school_access_guard_util_1.isObjectId)(parentId)) {
        res.status(400).json({ error: 'Identifiant parent invalide' });
        return;
    }
    try {
        await (0, school_access_guard_util_1.assertParentInSchool)(parentId, req.schoolId);
        next();
    }
    catch (e) {
        if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
            res.status(e.status).json({ error: e.message });
            return;
        }
        next(e);
    }
}
//# sourceMappingURL=admin-parent-school-guard.middleware.js.map