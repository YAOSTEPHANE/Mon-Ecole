import type { SchoolFeeType, TuitionBillingPeriod } from '@prisma/client';
import prisma from './prisma';
import { getCurrentAcademicYear } from './report-card.util';
import { normalizeSchoolLevel } from './school-level-progression.util';
import { resolveTuitionForClass } from './tuition-level-amount.util';

export type FeeEnsureResult = {
  created: boolean;
  feeId?: string;
  skippedReason?: string;
};

async function pickCatalog(params: {
  feeType: SchoolFeeType;
  academicYear: string;
  classId?: string | null;
  classLevel?: string | null;
}) {
  const catalogs = await prisma.tuitionFeeCatalog.findMany({
    where: {
      feeType: params.feeType,
      isActive: true,
      OR: [{ academicYear: params.academicYear }, { academicYear: null }],
    },
    orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
  });

  const level = normalizeSchoolLevel(params.classLevel);
  const byClass = params.classId
    ? catalogs.find(
        (c) =>
          c.scope === 'BY_CLASS' &&
          c.classId === params.classId &&
          c.academicYear === params.academicYear,
      ) ||
      catalogs.find((c) => c.scope === 'BY_CLASS' && c.classId === params.classId && !c.academicYear)
    : null;
  const byLevel = level
    ? catalogs.find(
        (c) =>
          c.scope === 'BY_LEVEL' &&
          normalizeSchoolLevel(c.classLevel) === level &&
          c.academicYear === params.academicYear,
      ) ||
      catalogs.find(
        (c) =>
          c.scope === 'BY_LEVEL' && normalizeSchoolLevel(c.classLevel) === level && !c.academicYear,
      )
    : null;
  const allStudents =
    catalogs.find((c) => c.scope === 'ALL_STUDENTS' && c.academicYear === params.academicYear) ||
    catalogs.find((c) => c.scope === 'ALL_STUDENTS' && !c.academicYear);

  return byClass || byLevel || allStudents || null;
}

/**
 * Crée une ligne de frais d’inscription (ENROLLMENT) à partir du catalogue,
 * si un poste actif existe et qu’aucune ligne équivalente n’existe déjà.
 */
export async function ensureEnrollmentFeeForStudent(params: {
  studentId: string;
  academicYear?: string;
  classId?: string | null;
  classLevel?: string | null;
}): Promise<FeeEnsureResult> {
  const academicYear = params.academicYear || getCurrentAcademicYear();

  const existing = await prisma.tuitionFee.findFirst({
    where: {
      studentId: params.studentId,
      academicYear,
      feeType: 'ENROLLMENT',
    },
    select: { id: true },
  });
  if (existing) {
    return { created: false, feeId: existing.id, skippedReason: 'already_exists' };
  }

  const catalog = await pickCatalog({
    feeType: 'ENROLLMENT',
    academicYear,
    classId: params.classId,
    classLevel: params.classLevel,
  });
  if (!catalog || !(catalog.defaultAmount > 0)) {
    return { created: false, skippedReason: 'no_catalog' };
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const fee = await prisma.tuitionFee.create({
    data: {
      studentId: params.studentId,
      academicYear,
      period: 'Inscription',
      amount: catalog.defaultAmount,
      baseAmount: catalog.defaultAmount,
      dueDate,
      description: catalog.label || `Frais d'inscription ${academicYear}`,
      feeType: 'ENROLLMENT',
      billingPeriod: catalog.billingPeriod ?? 'ONE_TIME',
      billingStatus: 'ISSUED',
      catalogId: catalog.id,
      scheduleTemplateId: catalog.scheduleTemplateId ?? undefined,
    },
    select: { id: true },
  });

  return { created: true, feeId: fee.id };
}

/**
 * Crée une ligne de scolarité annuelle (TUITION) depuis le barème classe/niveau.
 */
export async function ensureTuitionFeeForStudent(params: {
  studentId: string;
  academicYear?: string;
  classId?: string | null;
}): Promise<FeeEnsureResult> {
  const academicYear = params.academicYear || getCurrentAcademicYear();

  const existing = await prisma.tuitionFee.findFirst({
    where: {
      studentId: params.studentId,
      academicYear,
      feeType: 'TUITION',
    },
    select: { id: true },
  });
  if (existing) {
    return { created: false, feeId: existing.id, skippedReason: 'already_exists' };
  }

  if (!params.classId) {
    return { created: false, skippedReason: 'no_class' };
  }

  const resolved = await resolveTuitionForClass(params.classId, academicYear);
  if (!resolved || !(resolved.amount > 0)) {
    // Fallback catalogue ALL_STUDENTS / BY_LEVEL via pickCatalog
    const catalog = await pickCatalog({
      feeType: 'TUITION',
      academicYear,
      classId: params.classId,
      classLevel: resolved?.classLevel,
    });
    if (!catalog || !(catalog.defaultAmount > 0)) {
      return { created: false, skippedReason: 'no_catalog' };
    }
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);
    const fee = await prisma.tuitionFee.create({
      data: {
        studentId: params.studentId,
        academicYear,
        period: 'Année complète',
        amount: catalog.defaultAmount,
        baseAmount: catalog.defaultAmount,
        dueDate,
        description: catalog.label || `Scolarité ${academicYear}`,
        feeType: 'TUITION',
        billingPeriod: (catalog.billingPeriod as TuitionBillingPeriod) ?? 'ANNUAL',
        billingStatus: 'ISSUED',
        catalogId: catalog.id,
        scheduleTemplateId: catalog.scheduleTemplateId ?? undefined,
      },
      select: { id: true },
    });
    return { created: true, feeId: fee.id };
  }

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 1);

  const fee = await prisma.tuitionFee.create({
    data: {
      studentId: params.studentId,
      academicYear,
      period: 'Année complète',
      amount: resolved.amount,
      baseAmount: resolved.amount,
      dueDate,
      description: `Scolarité ${resolved.className} (${academicYear})`,
      feeType: 'TUITION',
      billingPeriod: 'ANNUAL',
      billingStatus: 'ISSUED',
      catalogId: resolved.catalogId,
    },
    select: { id: true },
  });

  return { created: true, feeId: fee.id };
}

/** Crée ENROLLMENT + TUITION à l’inscription. */
export async function ensureScolarityFeesOnEnroll(params: {
  studentId: string;
  academicYear?: string;
  classId?: string | null;
  classLevel?: string | null;
}): Promise<{ enrollment: FeeEnsureResult; tuition: FeeEnsureResult }> {
  const academicYear = params.academicYear || getCurrentAcademicYear();
  const enrollment = await ensureEnrollmentFeeForStudent({
    ...params,
    academicYear,
  });
  const tuition = await ensureTuitionFeeForStudent({
    studentId: params.studentId,
    academicYear,
    classId: params.classId,
  });
  return { enrollment, tuition };
}
