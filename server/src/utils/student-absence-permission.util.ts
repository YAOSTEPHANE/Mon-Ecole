import type { AbsenceStatus, Prisma } from '@prisma/client';
import prisma from './prisma';

export const STUDENT_ABSENCE_PERMISSION_MOTIFS = ['MEDICAL', 'FAMILIAL', 'OTHER'] as const;
export type StudentAbsencePermissionMotif = (typeof STUDENT_ABSENCE_PERMISSION_MOTIFS)[number];

export const STUDENT_ABSENCE_PERMISSION_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export const permissionRequestInclude = {
  student: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      class: { select: { name: true } },
    },
  },
} satisfies Prisma.StudentAbsencePermissionRequestInclude;

type PermissionRequestRow = Prisma.StudentAbsencePermissionRequestGetPayload<{
  include: typeof permissionRequestInclude;
}>;

type ApprovedPermissionRow = {
  motif: StudentAbsencePermissionMotif;
  reasonDetail: string;
  justificationDocuments: string[];
  startDate: Date;
  endDate: Date;
};

export type AbsenceExcuseCandidate = {
  id: string;
  studentId: string;
  date: Date;
  status: AbsenceStatus;
  excused: boolean;
};

export async function enrichPermissionRequestsWithReviewers<T extends PermissionRequestRow>(
  requests: T[],
): Promise<
  Array<
    T & {
      reviewedBy: {
        id: string;
        firstName: string;
        lastName: string;
        role: string;
      } | null;
    }
  >
> {
  const reviewerIds = [
    ...new Set(
      requests
        .map((r) => r.reviewedByUserId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];
  if (reviewerIds.length === 0) {
    return requests.map((r) => ({ ...r, reviewedBy: null }));
  }
  const reviewers = await prisma.user.findMany({
    where: { id: { in: reviewerIds } },
    select: { id: true, firstName: true, lastName: true, role: true },
  });
  const byId = new Map(reviewers.map((u) => [u.id, u]));
  return requests.map((r) => ({
    ...r,
    reviewedBy: r.reviewedByUserId ? byId.get(r.reviewedByUserId) ?? null : null,
  }));
}

export async function enrichPermissionRequestWithReviewer<T extends PermissionRequestRow>(
  request: T,
): Promise<
  T & {
    reviewedBy: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
  }
> {
  const [enriched] = await enrichPermissionRequestsWithReviewers([request]);
  return enriched;
}

/** Aligné sur l'appel enseignant/admin (bornes UTC journalières). */
export function startOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export function endOfUtcDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

/** Intervalle [début jour UTC ; lendemain 00:00 UTC) pour requêtes Prisma. */
export function utcDayRangeExclusiveEnd(d: Date): { gte: Date; lt: Date } {
  const gte = startOfUtcDay(d);
  const lt = new Date(gte);
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

export function permissionPeriodUtcBounds(startDate: Date, endDate: Date): { gte: Date; lt: Date } {
  const gte = startOfUtcDay(startDate);
  const lt = new Date(startOfUtcDay(endDate));
  lt.setUTCDate(lt.getUTCDate() + 1);
  return { gte, lt };
}

export function permissionCoversCalendarDay(
  permissionStart: Date,
  permissionEnd: Date,
  onDate: Date,
): boolean {
  const dayStart = startOfUtcDay(onDate);
  const dayEnd = endOfUtcDay(onDate);
  return startOfUtcDay(permissionStart) <= dayEnd && endOfUtcDay(permissionEnd) >= dayStart;
}

export function startOfDay(d: Date): Date {
  return startOfUtcDay(d);
}

export function endOfDay(d: Date): Date {
  return endOfUtcDay(d);
}

export function validatePermissionPeriod(startDate: Date, endDate: Date): string | null {
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 'Dates invalides';
  }
  if (endDate < startDate) {
    return 'La date de fin doit être le même jour ou après la date de début';
  }
  return null;
}

export const ABSENCE_PERMISSION_DELETE_FORBIDDEN_MESSAGE =
  'La suppression est interdite pour une permission approuvée (historique et absences excusées).';

export function assertAbsencePermissionDeletable(
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED',
): void {
  if (status === 'APPROVED') {
    throw new Error(ABSENCE_PERMISSION_DELETE_FORBIDDEN_MESSAGE);
  }
}

function motifLabel(motif: StudentAbsencePermissionMotif): string {
  if (motif === 'MEDICAL') return 'Médical';
  if (motif === 'FAMILIAL') return 'Familial';
  return 'Autre';
}

function buildExcuseReason(permission: ApprovedPermissionRow): string {
  return `Permission approuvée (${motifLabel(permission.motif)}) : ${permission.reasonDetail}`;
}

export async function findApprovedPermissionForStudentOnDate(
  studentId: string,
  onDate: Date,
): Promise<ApprovedPermissionRow | null> {
  const dayStart = startOfUtcDay(onDate);
  const dayEnd = endOfUtcDay(onDate);

  const row = await prisma.studentAbsencePermissionRequest.findFirst({
    where: {
      studentId,
      status: 'APPROVED',
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
    orderBy: { reviewedAt: 'desc' },
    select: {
      motif: true,
      reasonDetail: true,
      justificationDocuments: true,
      startDate: true,
      endDate: true,
    },
  });

  return row;
}

async function excuseAbsenceWithPermission(
  absenceId: string,
  permission: ApprovedPermissionRow,
): Promise<void> {
  const absence = await prisma.absence.findUnique({ where: { id: absenceId } });
  if (!absence || absence.status !== 'ABSENT' || absence.excused) {
    return;
  }

  const docs = [
    ...(absence.justificationDocuments ?? []),
    ...(permission.justificationDocuments ?? []),
  ].filter((url, i, arr) => arr.indexOf(url) === i);

  await prisma.absence.update({
    where: { id: absenceId },
    data: {
      excused: true,
      status: 'EXCUSED',
      reason: buildExcuseReason(permission),
      hasMedicalCertificate: permission.motif === 'MEDICAL' || absence.hasMedicalCertificate,
      justificationDocuments: docs,
      justificationSubmittedAt: absence.justificationSubmittedAt ?? new Date(),
    },
  });
}

/**
 * Marque comme excusées toutes les absences (statut ABSENT) déjà enregistrées sur la période.
 */
export async function applyApprovedPermissionToAbsences(
  studentId: string,
  startDate: Date,
  endDate: Date,
  motif: StudentAbsencePermissionMotif,
  reasonDetail: string,
  justificationDocuments: string[],
): Promise<number> {
  const period = permissionPeriodUtcBounds(startDate, endDate);

  const absences = await prisma.absence.findMany({
    where: {
      studentId,
      status: 'ABSENT',
      excused: false,
      date: {
        gte: period.gte,
        lt: period.lt,
      },
    },
  });

  if (absences.length === 0) {
    return 0;
  }

  const permission: ApprovedPermissionRow = {
    motif,
    reasonDetail,
    justificationDocuments,
    startDate,
    endDate,
  };

  for (const absence of absences) {
    await excuseAbsenceWithPermission(absence.id, permission);
  }

  return absences.length;
}

/**
 * Auto-excuse les absences nouvellement enregistrées si une permission approuvée couvre la date.
 */
export async function autoExcuseAbsenceRecords(records: AbsenceExcuseCandidate[]): Promise<number> {
  let count = 0;

  for (const record of records) {
    if (record.status !== 'ABSENT' || record.excused) {
      continue;
    }
    const permission = await findApprovedPermissionForStudentOnDate(record.studentId, record.date);
    if (!permission) {
      continue;
    }
    await excuseAbsenceWithPermission(record.id, permission);
    count += 1;
  }

  return count;
}

export async function refreshAbsenceRecordsByIds<T extends { id: string }>(records: T[]): Promise<T[]> {
  if (records.length === 0) {
    return records;
  }
  const rows = await prisma.absence.findMany({
    where: { id: { in: records.map((r) => r.id) } },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  return records.map((r) => (byId.get(r.id) as T | undefined) ?? r);
}
