"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardParentOwnsStudentParam = guardParentOwnsStudentParam;
const parent_teacher_appointment_util_1 = require("../utils/parent-teacher-appointment.util");
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
/** Vérifie que le parent connecté est bien lié à l’élève :studentId. */
async function guardParentOwnsStudentParam(req, res, next) {
    const { studentId } = req.params;
    if (!studentId || !(0, school_access_guard_util_1.isObjectId)(studentId)) {
        res.status(400).json({ error: 'Identifiant élève invalide' });
        return;
    }
    const parentId = await (0, parent_teacher_appointment_util_1.getParentIdForUser)(req.user.id);
    if (!parentId) {
        res.status(404).json({ error: 'Parent non trouvé' });
        return;
    }
    try {
        await (0, parent_teacher_appointment_util_1.assertParentOwnsStudent)(parentId, studentId);
        req.parentId = parentId;
        next();
    }
    catch {
        res.status(403).json({ error: 'Accès refusé — cet élève n’est pas associé à votre compte.' });
    }
}
//# sourceMappingURL=parent-student-guard.middleware.js.map