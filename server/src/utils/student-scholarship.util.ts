import type { SchoolFeeType } from '@prisma/client';

/** Calcule la remise applicable à partir des bourses actives d'un élève. */
export function computeScholarshipDiscount(
  baseAmount: number,
  scholarships: Array<{
    fixedAmount: number | null;
    percentOff: number | null;
    feeType: SchoolFeeType | null;
    label: string;
  }>,
  feeType?: SchoolFeeType,
): { discount: number; label: string | null } {
  const gross = Math.round(baseAmount);
  if (gross <= 0 || scholarships.length === 0) {
    return { discount: 0, label: null };
  }

  const applicable = scholarships.filter(
    (s) => !s.feeType || !feeType || s.feeType === feeType,
  );
  if (applicable.length === 0) {
    return { discount: 0, label: null };
  }

  let totalDiscount = 0;
  const labels: string[] = [];

  for (const s of applicable) {
    if (s.fixedAmount != null && s.fixedAmount > 0) {
      totalDiscount += Math.round(s.fixedAmount);
      labels.push(s.label);
    } else if (s.percentOff != null && s.percentOff > 0) {
      totalDiscount += Math.floor((gross * Math.min(100, s.percentOff)) / 100);
      labels.push(s.label);
    }
  }

  return {
    discount: Math.min(gross, totalDiscount),
    label: labels.length ? labels.join(', ') : null,
  };
}
