export type AttendanceSourceStats = {
  manual: number;
  nfc: number;
  biometric: number;
  other: number;
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
  byStudent: AttendanceStudentStats[];
  topLateStudents: AttendanceLateStudent[];
};

export type AttendancePeriodPreset = 'week' | 'month' | 'quarter' | 'custom';

export const ATTENDANCE_SOURCE_LABELS: Record<keyof AttendanceSourceStats, string> = {
  manual: 'Saisie manuelle',
  nfc: 'Carte NFC',
  biometric: 'Biométrie',
  other: 'Autre / non renseigné',
};

export function formatAttendanceRate(rate: number): string {
  return `${rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function resolveAttendancePeriod(
  preset: Exclude<AttendancePeriodPreset, 'custom'>
): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);

  if (preset === 'week') {
    from.setDate(from.getDate() - 6);
  } else if (preset === 'month') {
    from.setDate(1);
  } else if (preset === 'quarter') {
    from.setMonth(from.getMonth() - 2);
    from.setDate(1);
  }

  return {
    from: from.toISOString().split('T')[0] ?? '',
    to: to.toISOString().split('T')[0] ?? '',
  };
}

export function attendanceRateTone(rate: number): string {
  if (rate >= 90) return 'text-emerald-800';
  if (rate >= 75) return 'text-amber-800';
  return 'text-rose-800';
}

export function attendanceRateBarClass(rate: number): string {
  if (rate >= 90) return 'bg-emerald-500';
  if (rate >= 75) return 'bg-amber-500';
  return 'bg-rose-500';
}

/** Taux d'absence élève : vert < 10 %, orange < 20 %, rouge ≥ 20 %. */
export function studentAbsenceRateTone(rate: number): string {
  if (rate < 10) return 'text-emerald-800';
  if (rate < 20) return 'text-amber-800';
  return 'text-rose-800';
}

export function studentAbsenceRateBarClass(rate: number): string {
  if (rate < 10) return 'bg-emerald-500';
  if (rate < 20) return 'bg-amber-500';
  return 'bg-rose-500';
}
