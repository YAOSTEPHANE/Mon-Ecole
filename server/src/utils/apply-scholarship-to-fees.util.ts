import type { SchoolFeeType } from '@prisma/client';
import prisma from './prisma';
import { computeScholarshipDiscount } from './student-scholarship.util';

export type ApplyScholarshipResult = {
  updated: number;
  skipped: number;
  feeIds: string[];
};

/**
 * Recalcule amount / discountAmount / scholarshipLabel sur les frais non soldés
 * de l’élève pour l’année, à partir des bourses actives.
 */
export async function applyScholarshipsToExistingFees(params: {
  studentId: string;
  academicYear: string;
}): Promise<ApplyScholarshipResult> {
  const { studentId, academicYear } = params;
  const scholarships = await prisma.studentScholarship.findMany({
    where: { studentId, academicYear, isActive: true },
    select: {
      fixedAmount: true,
      percentOff: true,
      feeType: true,
      label: true,
    },
  });

  const fees = await prisma.tuitionFee.findMany({
    where: {
      studentId,
      academicYear,
      isPaid: false,
      billingStatus: { not: 'PAID' },
    },
  });

  const result: ApplyScholarshipResult = { updated: 0, skipped: 0, feeIds: [] };

  for (const fee of fees) {
    const base =
      fee.baseAmount != null && fee.baseAmount > 0
        ? Math.round(fee.baseAmount)
        : Math.round(Number(fee.amount) + Number(fee.discountAmount ?? 0));

    if (base <= 0) {
      result.skipped++;
      continue;
    }

    const { discount, label } = computeScholarshipDiscount(
      base,
      scholarships,
      fee.feeType as SchoolFeeType | undefined,
    );
    const nextAmount = Math.max(0, base - discount);

    const unchanged =
      Math.round(Number(fee.amount)) === nextAmount &&
      Math.round(Number(fee.discountAmount ?? 0)) === discount &&
      (fee.scholarshipLabel ?? null) === (label ?? null) &&
      Math.round(Number(fee.baseAmount ?? base)) === base;

    if (unchanged) {
      result.skipped++;
      continue;
    }

    await prisma.tuitionFee.update({
      where: { id: fee.id },
      data: {
        baseAmount: base,
        discountAmount: discount,
        amount: nextAmount,
        scholarshipLabel: label,
      },
    });
    result.updated++;
    result.feeIds.push(fee.id);
  }

  return result;
}
