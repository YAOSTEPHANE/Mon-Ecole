import { getEvaluationTypeLabel } from './evaluationTypes';

export type GradeLike = {
  id: string;
  title?: string | null;
  evaluationType?: string | null;
  type?: string | null;
  date?: string | Date | null;
  courseId?: string | null;
  course?: { id?: string; name?: string } | null;
  score?: number;
  maxScore?: number;
  coefficient?: number | null;
  studentId?: string | null;
  student?: {
    id?: string;
    user?: { firstName?: string; lastName?: string } | null;
    class?: { id?: string; name?: string; level?: string } | null;
  } | null;
};

export type GradeEvaluationGroup<T extends GradeLike = GradeLike> = {
  key: string;
  title: string;
  evaluationType: string;
  evaluationLabel: string;
  courseId: string;
  courseName: string;
  date: string | null;
  grades: T[];
  averageOn20: number | null;
};

export type GradeStudentGroup<T extends GradeLike = GradeLike> = {
  key: string;
  studentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  classId: string | null;
  className: string | null;
  grades: T[];
  averageOn20: number | null;
  byCourse: { courseId: string; courseName: string; grades: T[]; averageOn20: number | null }[];
};

function toIsoDay(date: string | Date | null | undefined): string | null {
  if (!date) return null;
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** Clé de regroupement : même évaluation (titre + type + matière + jour). */
export function gradeEvaluationGroupKey(grade: GradeLike): string {
  const courseId = grade.courseId ?? grade.course?.id ?? 'unknown';
  const evalType = grade.evaluationType || grade.type || 'EVALUATION';
  const title = (grade.title || 'Sans titre').trim().toLowerCase();
  const day = toIsoDay(grade.date) ?? '';
  return `${courseId}|${evalType}|${title}|${day}`;
}

export function averageOn20(grades: GradeLike[]): number | null {
  const usable = grades.filter(
    (g) => typeof g.score === 'number' && typeof g.maxScore === 'number' && g.maxScore > 0,
  );
  if (usable.length === 0) return null;
  const sum = usable.reduce((acc, g) => acc + ((g.score as number) / (g.maxScore as number)) * 20, 0);
  return Math.round((sum / usable.length) * 100) / 100;
}

function sortGradesByDateDesc<T extends GradeLike>(grades: T[]): T[] {
  return [...grades].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
}

/** Regroupe les notes par élément d'évaluation (devoir, interrogation, etc.). */
export function groupGradesByEvaluation<T extends GradeLike>(grades: T[]): GradeEvaluationGroup<T>[] {
  const map = new Map<string, GradeEvaluationGroup<T>>();

  for (const grade of grades) {
    const key = gradeEvaluationGroupKey(grade);
    const existing = map.get(key);
    if (existing) {
      existing.grades.push(grade);
      continue;
    }
    const evaluationType = grade.evaluationType || grade.type || 'EVALUATION';
    map.set(key, {
      key,
      title: (grade.title || 'Sans titre').trim() || 'Sans titre',
      evaluationType,
      evaluationLabel: getEvaluationTypeLabel(evaluationType),
      courseId: grade.courseId ?? grade.course?.id ?? 'unknown',
      courseName: grade.course?.name ?? '',
      date: toIsoDay(grade.date),
      grades: [grade],
      averageOn20: null,
    });
  }

  const groups = [...map.values()].map((g) => ({
    ...g,
    averageOn20: averageOn20(g.grades),
    grades: [...g.grades].sort((a, b) => {
      const na = `${a.student?.user?.lastName ?? ''} ${a.student?.user?.firstName ?? ''}`;
      const nb = `${b.student?.user?.lastName ?? ''} ${b.student?.user?.firstName ?? ''}`;
      return na.localeCompare(nb, 'fr', { sensitivity: 'base' });
    }),
  }));

  return groups.sort((a, b) => {
    const da = a.date ?? '';
    const db = b.date ?? '';
    if (da !== db) return db.localeCompare(da);
    return a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' });
  });
}

/** Regroupe toutes les évaluations d'un même élève. */
export function groupGradesByStudent<T extends GradeLike>(grades: T[]): GradeStudentGroup<T>[] {
  const map = new Map<string, GradeStudentGroup<T>>();

  for (const grade of grades) {
    const studentId = grade.studentId ?? grade.student?.id ?? 'unknown';
    const firstName = grade.student?.user?.firstName ?? '';
    const lastName = grade.student?.user?.lastName ?? '';
    const existing = map.get(studentId);
    if (existing) {
      existing.grades.push(grade);
      continue;
    }
    map.set(studentId, {
      key: studentId,
      studentId,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim() || 'Élève',
      classId: grade.student?.class?.id ?? null,
      className: grade.student?.class?.name ?? null,
      grades: [grade],
      averageOn20: null,
      byCourse: [],
    });
  }

  return [...map.values()]
    .map((student) => {
      const gradesSorted = sortGradesByDateDesc(student.grades);
      const byCourseMap = new Map<string, { courseId: string; courseName: string; grades: T[] }>();
      for (const grade of gradesSorted) {
        const courseId = grade.courseId ?? grade.course?.id ?? 'unknown';
        const courseName = grade.course?.name ?? 'Matière';
        const bucket = byCourseMap.get(courseId);
        if (bucket) {
          bucket.grades.push(grade);
        } else {
          byCourseMap.set(courseId, { courseId, courseName, grades: [grade] });
        }
      }
      const byCourse = [...byCourseMap.values()]
        .map((c) => ({
          ...c,
          averageOn20: averageOn20(c.grades),
        }))
        .sort((a, b) => a.courseName.localeCompare(b.courseName, 'fr', { sensitivity: 'base' }));

      return {
        ...student,
        grades: gradesSorted,
        averageOn20: averageOn20(gradesSorted),
        byCourse,
      };
    })
    .sort((a, b) => {
      const byLast = a.lastName.localeCompare(b.lastName, 'fr', { sensitivity: 'base' });
      if (byLast !== 0) return byLast;
      return a.firstName.localeCompare(b.firstName, 'fr', { sensitivity: 'base' });
    });
}
