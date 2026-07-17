"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardAdminStudentRoute = guardAdminStudentRoute;
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
function respondSchoolAccessDenied(res, error, next) {
    if (error instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
        res.status(error.status).json({ error: error.message });
        return;
    }
    next(error);
}
/** Vérifie que :id ou :studentId désigne un élève de l’établissement actif (routes admin). */
async function guardAdminStudentRoute(req, res, next) {
    const studentId = req.params.id ?? req.params.studentId;
    if (!studentId || !(0, school_access_guard_util_1.isObjectId)(studentId)) {
        next();
        return;
    }
    try {
        await (0, school_access_guard_util_1.assertStudentInSchool)(studentId, req.schoolId, req.school?.isDefault ?? false);
        next();
    }
    catch (error) {
        respondSchoolAccessDenied(res, error, next);
    }
}
//# sourceMappingURL=school-resource-guard.middleware.js.map