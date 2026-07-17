"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignmentWhereRelationsExist = exports.absenceWhereRelationsExist = exports.gradeWhereRelationsExist = void 0;
/**
 * Filtres pour exclure les enregistrements orphelins (cours / enseignant / élève supprimé
 * sans cascade). Sans cela, Prisma lève « Field course is required … got null ».
 */
exports.gradeWhereRelationsExist = {
    course: { is: {} },
    teacher: { is: {} },
    student: { is: {} },
};
exports.absenceWhereRelationsExist = {
    course: { is: {} },
    teacher: { is: {} },
    student: { is: {} },
};
exports.assignmentWhereRelationsExist = {
    course: { is: {} },
    teacher: { is: {} },
};
//# sourceMappingURL=prisma-relation-exists.util.js.map