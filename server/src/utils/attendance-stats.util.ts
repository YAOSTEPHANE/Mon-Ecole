import type { AbsenceStatus } from '@prisma/client';

export type AttendanceStatRow = {
  status: AbsenceStatus;
  excused: boolean;
  minutesLate: number | null;
  hasMedicalCertificate: boolean;
  sanctionNote: string | null;
  studentId: string;
  courseId: string;
  attendanceSource: string | null;
  date: Date;
  course?: {
    name: string;
    class?: { id: string; name: string; level?: string | null } | null;
  } | null;
  student?: {
    classId: string | null;
    dateOfBirth?: Date | string | null;
    gender?: string | null;
    class?: { name: string; level?: string | null } | null;
    user?: { firstName: string | null; lastName: string | null } | null;
  } | null;
};

export type AttendanceClassStats = {
  classId: string;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
  punctualityRate: number;
};

/** Agrégat générique pour listes d’absences (classe / niveau / sexe / âge). */
export type AttendanceDimensionStats = {
  key: string;
  label: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  /** Absences = non justifiées + justifiées (hors présents / retards). */
  absencesTotal: number;
  total: number;
  punctualityRate: number;
  absenceRate: number;
};

export type AttendanceDayStats = {
  date: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
};

export type AttendanceSessionStats = {
  sessionKey: string;
  date: string;
  courseId: string;
  courseName: string;
  classId: string | null;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
};

export type AttendanceSourceStats = {
  manual: number;
  nfc: number;
  biometric: number;
  other: number;
};

export type AttendanceLateStudent = {
  studentId: string;
  studentName: string;
  className: string;
  lateSessions: number;
};

export type AttendanceStudentStats = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
  punctualityRate: number;
  absenceRate: number;
  lateMinutesTotal: number;
};

export type AttendanceStats = {
  total: number;
  present: number;
  absentUnexcused: number;
  late: number;
  excusedAbsent: number;
  medicalCertificates: number;
  sanctionsRecorded: number;
  avgLateMinutes: number | null;
  punctualityRate: number;
  bySource: AttendanceSourceStats;
  byDay: AttendanceDayStats[];
  bySession: AttendanceSessionStats[];
  byClass: AttendanceClassStats[];
  byLevel: AttendanceDimensionStats[];
  byGender: AttendanceDimensionStats[];
  byAgeGroup: AttendanceDimensionStats[];
  byStudent: AttendanceStudentStats[];
  topLateStudents: AttendanceLateStudent[];
};

type MutableClassBucket = {
  classId: string;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
};

type MutableDayBucket = {
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
};

type MutableSessionBucket = {
  sessionKey: string;
  date: string;
  courseId: string;
  courseName: string;
  classId: string | null;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
};

type AttendanceCountBucket = Pick<
  MutableDayBucket,
  'present' | 'late' | 'absentUnexcused' | 'excusedAbsent' | 'total'
>;

function applyAttendanceRow(bucket: AttendanceCountBucket, row: AttendanceStatRow): void {
  bucket.total++;
  if (row.status === 'PRESENT') bucket.present++;
  else if (row.status === 'LATE') bucket.late++;
  else if (row.status === 'ABSENT') {
    if (row.excused) bucket.excusedAbsent++;
    else bucket.absentUnexcused++;
  } else if (row.status === 'EXCUSED') {
    bucket.excusedAbsent++;
  }
}

type MutableStudentBucket = {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
  lateMinutesTotal: number;
};

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function studentDisplayName(row: AttendanceStatRow): string {
  const first = row.student?.user?.firstName ?? '';
  const last = row.student?.user?.lastName ?? '';
  return `${first} ${last}`.trim() || 'Élève';
}

function punctualityRate(present: number, late: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round(((present + late) / total) * 1000) / 10;
}

export function absenceRate(absences: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((absences / total) * 1000) / 10;
}

export function ageFromDateOfBirth(
  dateOfBirth: Date | string | null | undefined,
  asOf: Date = new Date()
): number | null {
  if (!dateOfBirth) return null;
  const birth = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }
  if (age < 0 || age > 120) return null;
  return age;
}

/** Tranches d’âge scolaires (clé stable + libellé FR). */
export function ageGroupFromAge(age: number | null): { key: string; label: string } {
  if (age == null) return { key: 'unknown', label: 'Âge inconnu' };
  if (age <= 10) return { key: '0-10', label: '10 ans et moins' };
  if (age <= 13) return { key: '11-13', label: '11–13 ans' };
  if (age <= 16) return { key: '14-16', label: '14–16 ans' };
  if (age <= 18) return { key: '17-18', label: '17–18 ans' };
  return { key: '19+', label: '19 ans et plus' };
}

export function genderLabel(gender: string | null | undefined): { key: string; label: string } {
  const raw = (gender || '').toUpperCase();
  if (raw === 'MALE' || raw === 'M' || raw === 'HOMME' || raw === 'GARCON' || raw === 'GARÇON') {
    return { key: 'MALE', label: 'Garçons' };
  }
  if (raw === 'FEMALE' || raw === 'F' || raw === 'FEMME' || raw === 'FILLE') {
    return { key: 'FEMALE', label: 'Filles' };
  }
  if (raw === 'OTHER' || raw === 'AUTRE') {
    return { key: 'OTHER', label: 'Autre' };
  }
  return { key: 'unknown', label: 'Non renseigné' };
}

function emptyDimensionBucket(key: string, label: string): {
  key: string;
  label: string;
  present: number;
  late: number;
  absentUnexcused: number;
  excusedAbsent: number;
  total: number;
} {
  return {
    key,
    label,
    present: 0,
    late: 0,
    absentUnexcused: 0,
    excusedAbsent: 0,
    total: 0,
  };
}

function bumpDimensionBucket(
  map: Map<string, ReturnType<typeof emptyDimensionBucket>>,
  key: string,
  label: string,
  status: AbsenceStatus,
  excused: boolean
): void {
  let bucket = map.get(key);
  if (!bucket) {
    bucket = emptyDimensionBucket(key, label);
    map.set(key, bucket);
  }
  bucket.total++;
  if (status === 'PRESENT') bucket.present++;
  else if (status === 'LATE') bucket.late++;
  else if (status === 'ABSENT') {
    if (excused) bucket.excusedAbsent++;
    else bucket.absentUnexcused++;
  } else if (status === 'EXCUSED') {
    bucket.excusedAbsent++;
  }
}

function finalizeDimensionBuckets(
  map: Map<string, ReturnType<typeof emptyDimensionBucket>>
): AttendanceDimensionStats[] {
  return [...map.values()]
    .map((bucket) => {
      const absencesTotal = bucket.absentUnexcused + bucket.excusedAbsent;
      return {
        ...bucket,
        absencesTotal,
        punctualityRate: punctualityRate(bucket.present, bucket.late, bucket.total),
        absenceRate: absenceRate(absencesTotal, bucket.total),
      };
    })
    .sort((a, b) => {
      if (b.absencesTotal !== a.absencesTotal) return b.absencesTotal - a.absencesTotal;
      return a.label.localeCompare(b.label, 'fr');
    });
}

export function computeAttendanceStats(rows: AttendanceStatRow[]): AttendanceStats {
  let present = 0;
  let absentUnexcused = 0;
  let late = 0;
  let excusedAbsent = 0;
  let medicalCerts = 0;
  let withSanction = 0;
  let lateMinutesSum = 0;
  let lateMinutesCount = 0;

  const bySource: AttendanceSourceStats = { manual: 0, nfc: 0, biometric: 0, other: 0 };
  const byDay = new Map<string, MutableDayBucket>();
  const bySession = new Map<string, MutableSessionBucket>();
  const byClass = new Map<string, MutableClassBucket>();
  const byLevel = new Map<string, ReturnType<typeof emptyDimensionBucket>>();
  const byGender = new Map<string, ReturnType<typeof emptyDimensionBucket>>();
  const byAgeGroup = new Map<string, ReturnType<typeof emptyDimensionBucket>>();
  const byStudent = new Map<string, MutableStudentBucket>();
  const lateByStudent = new Map<
    string,
    { count: number; studentName: string; className: string }
  >();
  const asOf = new Date();

  for (const row of rows) {
    const dayKey = utcDateKey(row.date);
    const dayBucket = byDay.get(dayKey) ?? {
      present: 0,
      late: 0,
      absentUnexcused: 0,
      excusedAbsent: 0,
      total: 0,
    };
    applyAttendanceRow(dayBucket, row);

    const courseId = row.courseId;
    const courseName = row.course?.name ?? 'Matière';
    const sessionClassId = row.course?.class?.id ?? row.student?.classId ?? null;
    const sessionClassName =
      row.course?.class?.name ?? row.student?.class?.name ?? 'Sans classe';
    const sessionKey = `${dayKey}|${courseId}`;
    const sessionBucket = bySession.get(sessionKey) ?? {
      sessionKey,
      date: dayKey,
      courseId,
      courseName,
      classId: sessionClassId,
      className: sessionClassName,
      present: 0,
      late: 0,
      absentUnexcused: 0,
      excusedAbsent: 0,
      total: 0,
    };
    applyAttendanceRow(sessionBucket, row);

    if (row.status === 'PRESENT') {
      present++;
    } else if (row.status === 'LATE') {
      late++;
      if (row.minutesLate != null && row.minutesLate > 0) {
        lateMinutesSum += row.minutesLate;
        lateMinutesCount++;
      }
      const existing = lateByStudent.get(row.studentId);
      const studentName = studentDisplayName(row);
      const className = row.student?.class?.name ?? '—';
      if (existing) {
        existing.count++;
      } else {
        lateByStudent.set(row.studentId, { count: 1, studentName, className });
      }
    } else if (row.status === 'ABSENT') {
      if (row.excused) excusedAbsent++;
      else absentUnexcused++;
    } else if (row.status === 'EXCUSED') {
      excusedAbsent++;
    }

    if (row.hasMedicalCertificate) medicalCerts++;
    if (row.sanctionNote && String(row.sanctionNote).trim()) withSanction++;

    const source = (row.attendanceSource ?? '').toUpperCase();
    if (source === 'MANUAL') bySource.manual++;
    else if (source === 'NFC') bySource.nfc++;
    else if (source === 'BIOMETRIC') bySource.biometric++;
    else bySource.other++;

    const classId = row.student?.classId ?? 'unassigned';
    const className = row.student?.class?.name ?? 'Sans classe';
    const classBucket = byClass.get(classId) ?? {
      classId,
      className,
      present: 0,
      late: 0,
      absentUnexcused: 0,
      excusedAbsent: 0,
      total: 0,
    };
    classBucket.total++;
    if (row.status === 'PRESENT') classBucket.present++;
    else if (row.status === 'LATE') classBucket.late++;
    else if (row.status === 'ABSENT') {
      if (row.excused) classBucket.excusedAbsent++;
      else classBucket.absentUnexcused++;
    } else if (row.status === 'EXCUSED') {
      classBucket.excusedAbsent++;
    }
    byClass.set(classId, classBucket);
    byDay.set(dayKey, dayBucket);
    bySession.set(sessionKey, sessionBucket);

    const levelRaw =
      row.student?.class?.level?.trim() ||
      row.course?.class?.level?.trim() ||
      '';
    const levelKey = levelRaw || 'unknown';
    const levelLabel = levelRaw || 'Niveau non renseigné';
    bumpDimensionBucket(byLevel, levelKey, levelLabel, row.status, row.excused);

    const genderInfo = genderLabel(row.student?.gender);
    bumpDimensionBucket(byGender, genderInfo.key, genderInfo.label, row.status, row.excused);

    const age = ageFromDateOfBirth(row.student?.dateOfBirth, asOf);
    const ageInfo = ageGroupFromAge(age);
    bumpDimensionBucket(byAgeGroup, ageInfo.key, ageInfo.label, row.status, row.excused);

    const studentName = studentDisplayName(row);
    const studentClassId = row.student?.classId ?? 'unassigned';
    const studentClassName = row.student?.class?.name ?? 'Sans classe';
    const studentBucket = byStudent.get(row.studentId) ?? {
      studentId: row.studentId,
      studentName,
      classId: studentClassId,
      className: studentClassName,
      present: 0,
      late: 0,
      absentUnexcused: 0,
      excusedAbsent: 0,
      total: 0,
      lateMinutesTotal: 0,
    };
    studentBucket.total++;
    if (row.status === 'PRESENT') studentBucket.present++;
    else if (row.status === 'LATE') {
      studentBucket.late++;
      if (row.minutesLate != null && row.minutesLate > 0) {
        studentBucket.lateMinutesTotal += row.minutesLate;
      }
    } else if (row.status === 'ABSENT') {
      if (row.excused) studentBucket.excusedAbsent++;
      else studentBucket.absentUnexcused++;
    } else if (row.status === 'EXCUSED') {
      studentBucket.excusedAbsent++;
    }
    byStudent.set(row.studentId, studentBucket);
  }

  const total = rows.length;
  const topLateStudents: AttendanceLateStudent[] = [...lateByStudent.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([studentId, info]) => ({
      studentId,
      studentName: info.studentName,
      className: info.className,
      lateSessions: info.count,
    }));

  const byClassList: AttendanceClassStats[] = [...byClass.values()]
    .map((bucket) => ({
      ...bucket,
      punctualityRate: punctualityRate(bucket.present, bucket.late, bucket.total),
    }))
    .sort((a, b) => b.total - a.total);

  const byDayList: AttendanceDayStats[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      present: bucket.present,
      late: bucket.late,
      absentUnexcused: bucket.absentUnexcused,
      excusedAbsent: bucket.excusedAbsent,
      total: bucket.total,
    }));

  const bySessionList: AttendanceSessionStats[] = [...bySession.values()].sort((a, b) => {
    const dateCmp = b.date.localeCompare(a.date);
    if (dateCmp !== 0) return dateCmp;
    return a.courseName.localeCompare(b.courseName, 'fr');
  });

  const byStudentList: AttendanceStudentStats[] = [...byStudent.values()]
    .map((bucket) => {
      const absences = bucket.absentUnexcused + bucket.excusedAbsent;
      return {
        studentId: bucket.studentId,
        studentName: bucket.studentName,
        classId: bucket.classId,
        className: bucket.className,
        present: bucket.present,
        late: bucket.late,
        absentUnexcused: bucket.absentUnexcused,
        excusedAbsent: bucket.excusedAbsent,
        total: bucket.total,
        lateMinutesTotal: bucket.lateMinutesTotal,
        punctualityRate: punctualityRate(bucket.present, bucket.late, bucket.total),
        absenceRate: absenceRate(absences, bucket.total),
      };
    })
    .sort((a, b) => {
      if (b.absenceRate !== a.absenceRate) return b.absenceRate - a.absenceRate;
      if (b.absentUnexcused !== a.absentUnexcused) return b.absentUnexcused - a.absentUnexcused;
      return b.late - a.late;
    });

  return {
    total,
    present,
    absentUnexcused,
    late,
    excusedAbsent,
    medicalCertificates: medicalCerts,
    sanctionsRecorded: withSanction,
    avgLateMinutes:
      lateMinutesCount > 0 ? Math.round((lateMinutesSum / lateMinutesCount) * 10) / 10 : null,
    punctualityRate: punctualityRate(present, late, total),
    bySource,
    byDay: byDayList,
    bySession: bySessionList,
    byClass: byClassList,
    byLevel: finalizeDimensionBuckets(byLevel),
    byGender: finalizeDimensionBuckets(byGender),
    byAgeGroup: finalizeDimensionBuckets(byAgeGroup),
    byStudent: byStudentList,
    topLateStudents,
  };
}

export function defaultAttendanceStatsPeriod(): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}
