import type { AbsenceStatus, Prisma } from '@prisma/client';
import prisma from './prisma';

export type MenaPresenceSource = 'MENA_CSV' | 'MENA_API' | 'MENA_FILE' | 'MENA_DB';

export type MenaPresenceImportRow = {
  /** Matricule national, n° élève, ou id biométrique/NFC. */
  externalId: string;
  date?: string | Date;
  status?: string;
  checkInAt?: string | Date | null;
  externalRef?: string | null;
  rawPayload?: Prisma.InputJsonValue;
};

export type MenaPresenceImportReport = {
  imported: number;
  updated: number;
  unmatched: Array<{ externalId: string; reason: string }>;
  errors: Array<{ externalId: string; error: string }>;
  total: number;
};

const STATUS_MAP: Record<string, AbsenceStatus> = {
  PRESENT: 'PRESENT',
  PRESENTIEL: 'PRESENT',
  PRESENTÉ: 'PRESENT',
  PRESENTE: 'PRESENT',
  P: 'PRESENT',
  ABSENT: 'ABSENT',
  A: 'ABSENT',
  LATE: 'LATE',
  RETARD: 'LATE',
  R: 'LATE',
  EXCUSED: 'EXCUSED',
  EXCUSE: 'EXCUSED',
  EXCUSÉ: 'EXCUSED',
};

export function normalizePresenceDay(input?: string | Date | null): Date {
  const d = input ? new Date(input) : new Date();
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }
  const day = new Date(d);
  day.setHours(0, 0, 0, 0);
  return day;
}

export function parsePresenceStatus(raw?: string | null): AbsenceStatus {
  if (!raw || !String(raw).trim()) return 'PRESENT';
  const key = String(raw)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return STATUS_MAP[key] ?? 'PRESENT';
}

function parseOptionalDate(raw?: string | Date | null): Date | null {
  if (raw == null || raw === '') return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function resolveStudentId(externalId: string): Promise<string | null> {
  const id = externalId.trim();
  if (!id) return null;

  const byMatricule = await prisma.student.findFirst({
    where: { nationalMatricule: id },
    select: { id: true },
  });
  if (byMatricule) return byMatricule.id;

  const byStudentId = await prisma.student.findFirst({
    where: { studentId: id },
    select: { id: true },
  });
  if (byStudentId) return byStudentId.id;

  const byScan = await prisma.student.findFirst({
    where: {
      OR: [{ biometricId: id }, { nfcId: id }],
    },
    select: { id: true },
  });
  return byScan?.id ?? null;
}

/**
 * Importe / met à jour la présence journalière établissement (logiciel MENA).
 * Idempotent via @@unique([studentId, date]).
 */
export async function importMenaDailyPresenceRows(
  rows: MenaPresenceImportRow[],
  source: MenaPresenceSource,
  options?: { defaultDate?: string | Date },
): Promise<MenaPresenceImportReport> {
  const report: MenaPresenceImportReport = {
    imported: 0,
    updated: 0,
    unmatched: [],
    errors: [],
    total: rows.length,
  };

  const defaultDay = normalizePresenceDay(options?.defaultDate ?? null);

  for (const row of rows) {
    const externalId = String(row.externalId ?? '').trim();
    if (!externalId) {
      report.errors.push({ externalId: '', error: 'Identifiant externe manquant' });
      continue;
    }

    try {
      const studentId = await resolveStudentId(externalId);
      if (!studentId) {
        report.unmatched.push({
          externalId,
          reason: 'Aucun élève (matricule / n° élève / bio / NFC)',
        });
        continue;
      }

      const day = normalizePresenceDay(row.date ?? defaultDay);
      const status = parsePresenceStatus(row.status);
      const checkInAt = parseOptionalDate(row.checkInAt) ?? (status === 'PRESENT' || status === 'LATE' ? day : null);

      const existing = await prisma.studentDailyPresence.findUnique({
        where: {
          studentId_date: { studentId, date: day },
        },
        select: { id: true },
      });

      await prisma.studentDailyPresence.upsert({
        where: {
          studentId_date: { studentId, date: day },
        },
        create: {
          studentId,
          date: day,
          status,
          checkInAt,
          source,
          externalRef: row.externalRef?.trim() || externalId,
          rawPayload: row.rawPayload ?? undefined,
          importedAt: new Date(),
        },
        update: {
          status,
          checkInAt,
          source,
          externalRef: row.externalRef?.trim() || externalId,
          rawPayload: row.rawPayload ?? undefined,
          importedAt: new Date(),
        },
      });

      if (existing) report.updated += 1;
      else report.imported += 1;
    } catch (e: unknown) {
      report.errors.push({
        externalId,
        error: e instanceof Error ? e.message : 'Erreur import',
      });
    }
  }

  return report;
}

export const MENA_PRESENCE_CSV_TEMPLATE =
  'matricule,date,statut,heure_arrivee\n' +
  'FNE123456,2026-07-28,PRESENT,08:05\n' +
  'STU001,2026-07-28,ABSENT,\n';

/** Parse CSV simple (virgule ou point-virgule), première ligne = en-têtes. */
export function parseMenaPresenceCsv(csv: string): MenaPresenceImportRow[] {
  const text = csv.replace(/^\uFEFF/, '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map((h) =>
    h
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
  );

  const idx = (names: string[]) => headers.findIndex((h) => names.includes(h));
  const iId = idx([
    'matricule',
    'nationalmatricule',
    'matricule_national',
    'studentid',
    'numero_eleve',
    'id',
    'externalid',
    'nfcid',
    'biometricid',
  ]);
  const iDate = idx(['date', 'jour', 'day']);
  const iStatus = idx(['statut', 'status', 'etat', 'presence']);
  const iTime = idx(['heure_arrivee', 'heure', 'checkinat', 'arrivee', 'time']);

  if (iId < 0) {
    throw new Error(
      'Colonne identifiant manquante (matricule / studentId / biometricId / nfcId)',
    );
  }

  const rows: MenaPresenceImportRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));
    const externalId = cols[iId] || '';
    if (!externalId) continue;

    let date: string | undefined;
    if (iDate >= 0 && cols[iDate]) date = cols[iDate];

    let checkInAt: string | null = null;
    if (iTime >= 0 && cols[iTime]) {
      const t = cols[iTime];
      if (date && /^\d{1,2}:\d{2}/.test(t)) {
        checkInAt = `${date}T${t.length === 5 ? `${t}:00` : t}`;
      } else {
        checkInAt = t;
      }
    }

    rows.push({
      externalId,
      date,
      status: iStatus >= 0 ? cols[iStatus] : 'PRESENT',
      checkInAt,
      rawPayload: { line: li + 1, cols },
    });
  }
  return rows;
}
