import prisma from './prisma';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function dayKey(d: Date): string {
  const x = startOfDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export type PresenceReconcileDay = {
  date: string;
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  className: string | null;
  menaStatus: string | null;
  menaSource: string | null;
  courseAbsentCount: number;
  courseLateCount: number;
  coursePresentCount: number;
  courseExcusedCount: number;
  mismatch: boolean;
  mismatchReason: string | null;
};

/**
 * Compare présence journalière MENA et absences par cours sur une période.
 * Un écart est signalé si MENA=PRESENT alors qu’il y a des absences cours non excusées,
 * ou MENA=ABSENT alors qu’aucun pointage cours n’est ABSENT.
 */
export async function reconcileAttendanceSources(opts: {
  from: Date;
  to: Date;
  classId?: string;
  schoolId?: string;
  onlyMismatches?: boolean;
}): Promise<{
  from: string;
  to: string;
  totalDays: number;
  mismatchCount: number;
  rows: PresenceReconcileDay[];
}> {
  const from = startOfDay(opts.from);
  const to = endOfDay(opts.to);

  const students = await prisma.student.findMany({
    where: {
      isActive: true,
      ...(opts.classId ? { classId: opts.classId } : {}),
      ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: {
      id: true,
      studentId: true,
      user: { select: { firstName: true, lastName: true } },
      class: { select: { name: true } },
    },
  });
  if (students.length === 0) {
    return {
      from: dayKey(from),
      to: dayKey(to),
      totalDays: 0,
      mismatchCount: 0,
      rows: [],
    };
  }

  const studentIds = students.map((s) => s.id);
  const [menaRows, absences] = await Promise.all([
    prisma.studentDailyPresence.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: from, lte: to },
      },
      select: {
        studentId: true,
        date: true,
        status: true,
        source: true,
      },
    }),
    prisma.absence.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: from, lte: to },
      },
      select: {
        studentId: true,
        date: true,
        status: true,
        excused: true,
      },
    }),
  ]);

  const menaByKey = new Map<string, { status: string; source: string }>();
  for (const m of menaRows) {
    menaByKey.set(`${m.studentId}|${dayKey(m.date)}`, {
      status: m.status,
      source: m.source,
    });
  }

  type CourseAgg = {
    absent: number;
    late: number;
    present: number;
    excused: number;
  };
  const courseByKey = new Map<string, CourseAgg>();
  for (const a of absences) {
    const key = `${a.studentId}|${dayKey(a.date)}`;
    const agg = courseByKey.get(key) ?? { absent: 0, late: 0, present: 0, excused: 0 };
    if (a.status === 'ABSENT') agg.absent += 1;
    else if (a.status === 'LATE') agg.late += 1;
    else if (a.status === 'PRESENT' || a.status === 'EXCUSED') agg.present += 1;
    if (a.excused || a.status === 'EXCUSED') agg.excused += 1;
    courseByKey.set(key, agg);
  }

  const studentById = new Map(students.map((s) => [s.id, s]));
  const allKeys = new Set<string>([...menaByKey.keys(), ...courseByKey.keys()]);
  const rows: PresenceReconcileDay[] = [];

  for (const key of allKeys) {
    const [studentId, date] = key.split('|');
    if (!studentId || !date) continue;
    const student = studentById.get(studentId);
    if (!student) continue;
    const mena = menaByKey.get(key);
    const course = courseByKey.get(key) ?? { absent: 0, late: 0, present: 0, excused: 0 };

    let mismatch = false;
    let mismatchReason: string | null = null;
    if (mena?.status === 'PRESENT' && course.absent > 0 && course.excused < course.absent) {
      mismatch = true;
      mismatchReason = 'MENA présent mais absence(s) cours non excusée(s)';
    } else if (
      mena?.status === 'ABSENT' &&
      course.absent === 0 &&
      (course.present > 0 || course.late > 0)
    ) {
      mismatch = true;
      mismatchReason = 'MENA absent mais pointage(s) cours présent/retard';
    } else if (mena?.status === 'ABSENT' && course.absent === 0 && course.present === 0 && course.late === 0) {
      // MENA absent, aucun pointage cours — informatif, pas forcément un mismatch
      mismatch = false;
    } else if (!mena && course.absent > 0) {
      mismatch = true;
      mismatchReason = 'Absence(s) cours sans présence MENA du jour';
    }

    if (opts.onlyMismatches && !mismatch) continue;

    rows.push({
      date,
      studentId,
      studentCode: student.studentId,
      firstName: student.user.firstName,
      lastName: student.user.lastName,
      className: student.class?.name ?? null,
      menaStatus: mena?.status ?? null,
      menaSource: mena?.source ?? null,
      courseAbsentCount: course.absent,
      courseLateCount: course.late,
      coursePresentCount: course.present,
      courseExcusedCount: course.excused,
      mismatch,
      mismatchReason,
    });
  }

  rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`, 'fr');
  });

  return {
    from: dayKey(from),
    to: dayKey(to),
    totalDays: rows.length,
    mismatchCount: rows.filter((r) => r.mismatch).length,
    rows,
  };
}
