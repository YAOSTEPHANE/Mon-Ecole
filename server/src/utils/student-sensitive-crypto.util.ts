import {
  decryptSensitiveString,
  encryptSensitiveString,
} from './field-encryption.util';

export const STUDENT_SENSITIVE_FIELD_KEYS = [
  'address',
  'emergencyContact',
  'emergencyPhone',
  'emergencyContact2',
  'emergencyPhone2',
  'medicalInfo',
  'allergies',
  'specialNeeds',
] as const;

export type StudentSensitiveFieldKey = (typeof STUDENT_SENSITIVE_FIELD_KEYS)[number];

/** Déchiffre les champs sensibles d’un enregistrement élève (réponse API). */
export function decryptStudentRecord<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  for (const key of STUDENT_SENSITIVE_FIELD_KEYS) {
    if (!(key in next)) continue;
    const v = next[key];
    if (typeof v === 'string') {
      (next as Record<string, unknown>)[key] = decryptSensitiveString(v);
    }
  }
  return next as T;
}

/** Déchiffre studentProfile et les élèves imbriqués sous parentProfile (session / utilisateur). */
export function decryptSessionUserPayload<
  U extends { studentProfile?: unknown; parentProfile?: unknown },
>(user: U): U {
  const out = { ...user };
  if (out.studentProfile && typeof out.studentProfile === 'object') {
    out.studentProfile = decryptStudentRecord(out.studentProfile as Record<string, unknown>) as U['studentProfile'];
  }
  if (
    out.parentProfile &&
    typeof out.parentProfile === 'object' &&
    'students' in out.parentProfile &&
    Array.isArray((out.parentProfile as { students?: unknown }).students)
  ) {
    const pp = out.parentProfile as { students: Array<{ student?: unknown }> };
    out.parentProfile = {
      ...out.parentProfile,
      students: pp.students.map((sp) =>
        sp.student && typeof sp.student === 'object'
          ? { ...sp, student: decryptStudentRecord(sp.student as Record<string, unknown>) }
          : sp
      ),
    } as U['parentProfile'];
  }
  return out;
}

/**
 * Prépare les chaînes pour écriture Prisma (null / chaîne chiffrée).
 * Ignore les clés absentes ou à undefined ; conserve explicitement null.
 */
export function encryptStudentScalarsForPrismaCreate(
  fields: Partial<Record<StudentSensitiveFieldKey, unknown>>
): Partial<Record<StudentSensitiveFieldKey, string | null>> {
  const out: Partial<Record<StudentSensitiveFieldKey, string | null>> = {};
  for (const key of STUDENT_SENSITIVE_FIELD_KEYS) {
    if (!(key in fields)) continue;
    const raw = fields[key];
    if (raw === undefined) continue;
    if (raw === null) {
      out[key] = null;
    } else {
      const t = String(raw).trim();
      out[key] = t === '' ? null : encryptSensitiveString(t);
    }
  }
  return out;
}

/** Met à jour uniquement les champs présents dans le payload (après normalisation route). */
/** Rendez-vous : l’include `student` expose les champs scalaires élève. */
export function decryptParentTeacherAppointmentRow<
  T extends { student?: unknown },
>(row: T): T {
  if (!row.student || typeof row.student !== 'object') return row;
  return {
    ...row,
    student: decryptStudentRecord(row.student as Record<string, unknown>),
  };
}

export function encryptStudentSensitiveWritePayload<
  T extends Partial<Record<StudentSensitiveFieldKey, string | null | undefined>>,
>(payload: T): T {
  const next = { ...payload };
  for (const key of STUDENT_SENSITIVE_FIELD_KEYS) {
    if (!(key in next)) continue;
    const v = next[key];
    if (v === undefined) continue;
    if (v === null) {
      (next as Record<string, unknown>)[key] = null;
    } else {
      const t = String(v).trim();
      (next as Record<string, unknown>)[key] = t === '' ? null : encryptSensitiveString(t);
    }
  }
  return next;
}
