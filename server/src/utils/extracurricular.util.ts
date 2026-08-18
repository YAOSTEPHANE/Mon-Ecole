import type { Prisma } from '@prisma/client';
import prisma from './prisma';

export async function buildPortalOfferingWhere(
  studentId: string,
  academicYear?: string
): Promise<Prisma.ExtracurricularOfferingWhereInput | null> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true, isActive: true, enrollmentStatus: true },
  });
  if (!student?.isActive || student.enrollmentStatus !== 'ACTIVE') {
    return null;
  }
  const classOr: Prisma.ExtracurricularOfferingWhereInput[] = [{ classId: null }];
  if (student.classId) {
    classOr.push({ classId: student.classId });
  }
  return {
    isPublished: true,
    isActive: true,
    ...(academicYear?.trim() ? { academicYear: academicYear.trim() } : {}),
    OR: classOr,
  };
}

const extraRegOfferingSelect = {
  id: true,
  title: true,
  kind: true,
  category: true,
  startAt: true,
  endAt: true,
  location: true,
  academicYear: true,
} as const;

/** Inscriptions d’un élève, sans filtre relationnel MongoDB (évite un 500 Prisma). */
export async function listStudentExtracurricularRegistrations(
  studentId: string,
  academicYear?: string
) {
  const year = academicYear?.trim() ?? '';
  const rows = await prisma.extracurricularRegistration.findMany({
    where: {
      studentId,
      offering: { is: {} },
    },
    orderBy: { createdAt: 'desc' },
    include: { offering: { select: extraRegOfferingSelect } },
  });
  if (!year) return rows;
  return rows.filter((row) => row.offering.academicYear === year);
}

export async function registerStudentForExtracurricular(
  studentId: string,
  offeringId: string
): Promise<{ registration: unknown; status: string }> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true, isActive: true, enrollmentStatus: true },
  });
  if (!student?.isActive || student.enrollmentStatus !== 'ACTIVE') {
    throw new Error('Élève inactif ou non inscrit.');
  }

  const offering = await prisma.extracurricularOffering.findFirst({
    where: { id: offeringId, isPublished: true, isActive: true },
  });
  if (!offering) {
    throw new Error('Activité introuvable ou fermée aux inscriptions.');
  }
  if (offering.classId && offering.classId !== student.classId) {
    throw new Error("Cette activité n'est pas proposée pour la classe de l'élève.");
  }
  if (offering.registrationDeadline && new Date() > offering.registrationDeadline) {
    throw new Error('La date limite d’inscription est dépassée.');
  }

  const confirmed = await prisma.extracurricularRegistration.count({
    where: { offeringId, status: 'CONFIRMED' },
  });
  const max = offering.maxParticipants;
  const status =
    max != null && max > 0 && confirmed >= max ? ('WAITLIST' as const) : ('CONFIRMED' as const);

  const registration = await prisma.extracurricularRegistration.create({
    data: {
      offeringId,
      studentId,
      status,
    },
    include: {
      offering: {
        select: {
          id: true,
          title: true,
          kind: true,
          category: true,
          startAt: true,
          endAt: true,
        },
      },
      student: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
  });

  return { registration, status };
}
