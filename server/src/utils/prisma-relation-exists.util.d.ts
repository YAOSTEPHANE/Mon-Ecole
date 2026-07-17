import type { Prisma } from '@prisma/client';
/**
 * Filtres pour exclure les enregistrements orphelins (cours / enseignant / élève supprimé
 * sans cascade). Sans cela, Prisma lève « Field course is required … got null ».
 */
export declare const gradeWhereRelationsExist: Pick<Prisma.GradeWhereInput, 'course' | 'teacher' | 'student'>;
export declare const absenceWhereRelationsExist: Pick<Prisma.AbsenceWhereInput, 'course' | 'teacher' | 'student'>;
export declare const assignmentWhereRelationsExist: Pick<Prisma.AssignmentWhereInput, 'course' | 'teacher'>;
//# sourceMappingURL=prisma-relation-exists.util.d.ts.map