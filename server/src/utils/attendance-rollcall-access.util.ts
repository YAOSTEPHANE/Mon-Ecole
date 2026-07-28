import prisma from './prisma';
import { getAssignedClassIdsForUserId } from './educator-class-assignment.util';

export type RollcallCourseAccess = {
  courseId: string;
  classId: string;
  /** Titulaire du cours (conservé sur les enregistrements Absence). */
  officialTeacherId: string;
  /** true si l’appelant n’est pas le titulaire. */
  isSubstitute: boolean;
  courseName: string;
};

type AccessDenied = { ok: false; status: number; error: string };
type AccessOk = { ok: true; access: RollcallCourseAccess };
export type RollcallAccessResult = AccessDenied | AccessOk;

const courseSelect = {
  id: true,
  name: true,
  code: true,
  classId: true,
  teacherId: true,
} as const;

/**
 * Enseignant : titulaire du cours, ou remplaçant (tout autre enseignant de l’établissement).
 */
export async function resolveTeacherRollcallAccess(
  userId: string,
  courseId: string,
): Promise<RollcallAccessResult> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, status: 404, error: 'Profil enseignant non trouvé' };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: courseSelect,
  });
  if (!course) {
    return { ok: false, status: 404, error: 'Cours non trouvé' };
  }

  const isSubstitute = course.teacherId !== teacher.id;
  return {
    ok: true,
    access: {
      courseId: course.id,
      classId: course.classId,
      officialTeacherId: course.teacherId,
      isSubstitute,
      courseName: course.name,
    },
  };
}

/**
 * Éducateur : appel autorisé pour les cours des classes qui lui sont assignées.
 */
export async function resolveEducatorRollcallAccess(
  userId: string,
  courseId: string,
): Promise<RollcallAccessResult> {
  const classIds = await getAssignedClassIdsForUserId(userId);
  if (classIds === null) {
    return { ok: false, status: 404, error: 'Profil éducateur non trouvé' };
  }
  if (classIds.length === 0) {
    return {
      ok: false,
      status: 403,
      error: 'Aucune classe assignée — contactez l’administration.',
    };
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: courseSelect,
  });
  if (!course) {
    return { ok: false, status: 404, error: 'Cours non trouvé' };
  }
  if (!classIds.includes(course.classId)) {
    return {
      ok: false,
      status: 403,
      error: 'Ce cours n’appartient pas à une de vos classes assignées.',
    };
  }

  return {
    ok: true,
    access: {
      courseId: course.id,
      classId: course.classId,
      officialTeacherId: course.teacherId,
      isSubstitute: true,
      courseName: course.name,
    },
  };
}

export const rollcallCourseListInclude = {
  class: {
    include: {
      students: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  },
  teacher: {
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} as const;
