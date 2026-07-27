import type { Prisma } from '@prisma/client';
import prisma from './prisma';

export const STUDENT_REENROLLMENT_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;

export type StudentReenrollmentStatus = (typeof STUDENT_REENROLLMENT_STATUSES)[number];

export const REENROLLMENT_PENDING_EXISTS_MESSAGE =
  'Une demande de réinscription est déjà en attente pour cet élève.';

export const reenrollmentRequestInclude = {
  student: {
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      class: { select: { id: true, name: true, level: true, academicYear: true } },
    },
  },
} satisfies Prisma.StudentReenrollmentRequestInclude;

type ReenrollmentRequestRow = Prisma.StudentReenrollmentRequestGetPayload<{
  include: typeof reenrollmentRequestInclude;
}>;

export async function enrichReenrollmentRequestsWithReviewers<T extends ReenrollmentRequestRow>(
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
      preferredClass: { id: string; name: string; level: string; academicYear: string } | null;
      approvedClass: { id: string; name: string; level: string; academicYear: string } | null;
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
  const classIds = [
    ...new Set(
      requests
        .flatMap((r) => [r.preferredClassId, r.approvedClassId])
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
    ),
  ];

  const [reviewers, classes] = await Promise.all([
    reviewerIds.length > 0
      ? prisma.user.findMany({
          where: { id: { in: reviewerIds } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : Promise.resolve([]),
    classIds.length > 0
      ? prisma.class.findMany({
          where: { id: { in: classIds } },
          select: { id: true, name: true, level: true, academicYear: true },
        })
      : Promise.resolve([]),
  ]);

  const reviewerById = new Map(reviewers.map((u) => [u.id, u] as const));
  const classById = new Map(classes.map((c) => [c.id, c] as const));

  return requests.map((r) => ({
    ...r,
    reviewedBy: r.reviewedByUserId ? reviewerById.get(r.reviewedByUserId) ?? null : null,
    preferredClass: r.preferredClassId ? classById.get(r.preferredClassId) ?? null : null,
    approvedClass: r.approvedClassId ? classById.get(r.approvedClassId) ?? null : null,
  }));
}

export async function enrichReenrollmentRequestWithReviewer<T extends ReenrollmentRequestRow>(
  request: T,
) {
  const [enriched] = await enrichReenrollmentRequestsWithReviewers([request]);
  return enriched;
}

export async function assertNoPendingReenrollment(studentId: string): Promise<string | null> {
  const pending = await prisma.studentReenrollmentRequest.findFirst({
    where: { studentId, status: 'PENDING' },
    select: { id: true },
  });
  return pending ? REENROLLMENT_PENDING_EXISTS_MESSAGE : null;
}

export async function listClassesForReenrollment(schoolId?: string | null) {
  return prisma.class.findMany({
    where: {
      ...(schoolId ? { schoolId } : {}),
    },
    select: { id: true, name: true, level: true, academicYear: true },
    orderBy: [{ academicYear: 'desc' }, { name: 'asc' }],
  });
}

/** Applique une réinscription validée (mouvement REENROLLMENT + statut ACTIVE). */
export async function applyReenrollmentApproval(params: {
  studentId: string;
  toClassId: string;
  effectiveDate?: Date;
  reason?: string | null;
  notes?: string | null;
  createdById?: string | null;
}) {
  const student = await prisma.student.findUnique({
    where: { id: params.studentId },
    select: { id: true, classId: true },
  });
  if (!student) {
    throw Object.assign(new Error('Élève non trouvé'), { statusCode: 404 });
  }

  const targetClass = await prisma.class.findUnique({
    where: { id: params.toClassId },
    select: { id: true },
  });
  if (!targetClass) {
    throw Object.assign(new Error('Classe de destination introuvable'), { statusCode: 400 });
  }

  const effectiveDate = params.effectiveDate ?? new Date();

  await prisma.studentTransfer.create({
    data: {
      studentId: student.id,
      fromClassId: student.classId,
      toClassId: params.toClassId,
      effectiveDate,
      transferType: 'REENROLLMENT',
      reason: params.reason ?? undefined,
      notes: params.notes ?? undefined,
      createdById: params.createdById ?? undefined,
    },
  });

  return prisma.student.update({
    where: { id: student.id },
    data: {
      classId: params.toClassId,
      enrollmentStatus: 'ACTIVE',
      lastReenrollmentAt: new Date(),
      isActive: true,
    },
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
      class: true,
    },
  });
}
