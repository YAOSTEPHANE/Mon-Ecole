/** Agrégations financières paiements / impayés par classe, niveau, genre. */

export type GenderKey = 'MALE' | 'FEMALE' | 'OTHER' | 'UNKNOWN';

export const GENDER_LABELS: Record<GenderKey, string> = {
  MALE: 'Garçons',
  FEMALE: 'Filles',
  OTHER: 'Autre',
  UNKNOWN: 'Non renseigné',
};

export function normalizeGender(raw: string | null | undefined): GenderKey {
  if (raw === 'MALE' || raw === 'FEMALE' || raw === 'OTHER') return raw;
  return 'UNKNOWN';
}

export type MoneyBucket = {
  key: string;
  label: string;
  level?: string;
  paidAmount: number;
  paidCount: number;
  unpaidAmount: number;
  unpaidCount: number;
  overdueAmount: number;
  overdueCount: number;
  studentsPaid: number;
  studentsUnpaid: number;
};

export function emptyMoneyBucket(key: string, label: string, level?: string): MoneyBucket {
  return {
    key,
    label,
    level,
    paidAmount: 0,
    paidCount: 0,
    unpaidAmount: 0,
    unpaidCount: 0,
    overdueAmount: 0,
    overdueCount: 0,
    studentsPaid: 0,
    studentsUnpaid: 0,
  };
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function finalizeMoneyBuckets(map: Map<string, MoneyBucket>): MoneyBucket[] {
  return [...map.values()]
    .map((b) => ({
      ...b,
      paidAmount: roundMoney(b.paidAmount),
      unpaidAmount: roundMoney(b.unpaidAmount),
      overdueAmount: roundMoney(b.overdueAmount),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}

export type StudentDim = {
  gender: GenderKey;
  classId: string | null;
  className: string;
  level: string;
};

export function studentDimFrom(student: {
  gender?: string | null;
  classId?: string | null;
  class?: { id: string; name: string; level: string } | null;
}): StudentDim {
  return {
    gender: normalizeGender(student.gender),
    classId: student.classId ?? student.class?.id ?? null,
    className: student.class?.name ?? 'Sans classe',
    level: student.class?.level ?? 'Non assigné',
  };
}
