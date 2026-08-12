import type { SchoolFeeType } from '@prisma/client';
import prisma from './prisma';

export type CampusBillingResult = {
  created: number;
  skipped: number;
  fees: Array<{ id: string; studentId: string; amount: number; description: string }>;
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

async function createCampusTuitionFee(params: {
  studentId: string;
  academicYear: string;
  amount: number;
  feeType: SchoolFeeType;
  label: string;
  dueDate: Date;
}): Promise<'created' | 'skipped'> {
  const existing = await prisma.tuitionFee.findFirst({
    where: {
      studentId: params.studentId,
      academicYear: params.academicYear,
      feeType: params.feeType,
      description: params.label,
    },
  });
  if (existing) return 'skipped';

  await prisma.tuitionFee.create({
    data: {
      studentId: params.studentId,
      academicYear: params.academicYear,
      period: 'Campus',
      amount: params.amount,
      baseAmount: params.amount,
      dueDate: params.dueDate,
      description: params.label,
      feeType: params.feeType,
      billingPeriod: 'MONTHLY',
      billingStatus: 'ISSUED',
    },
  });
  return 'created';
}

/** Génère les lignes de scolarité pour les abonnements cantine actifs. */
export async function billActiveCanteenSubscriptions(options?: {
  academicYear?: string;
  dueDate?: Date;
}): Promise<CampusBillingResult> {
  const dueDate = options?.dueDate ?? addMonths(new Date(), 1);
  const subs = await prisma.canteenSubscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true, student: { select: { id: true } } },
  });

  const result: CampusBillingResult = { created: 0, skipped: 0, fees: [] };
  for (const sub of subs) {
    if (options?.academicYear && sub.plan.academicYear !== options.academicYear) continue;
    if (sub.plan.priceAmount <= 0) continue;

    const label = `Cantine — ${sub.plan.name} (${sub.plan.academicYear})`;
    const status = await createCampusTuitionFee({
      studentId: sub.studentId,
      academicYear: sub.plan.academicYear,
      amount: sub.plan.priceAmount,
      feeType: 'CANTEEN',
      label,
      dueDate,
    });
    if (status === 'created') {
      result.created++;
      result.fees.push({
        id: sub.id,
        studentId: sub.studentId,
        amount: sub.plan.priceAmount,
        description: label,
      });
    } else {
      result.skipped++;
    }
  }
  return result;
}

/** Génère les lignes de scolarité pour les abonnements transport actifs. */
export async function billActiveTransportSubscriptions(options?: {
  academicYear?: string;
  dueDate?: Date;
}): Promise<CampusBillingResult> {
  const dueDate = options?.dueDate ?? addMonths(new Date(), 1);
  const subs = await prisma.transportSubscription.findMany({
    where: { status: 'ACTIVE' },
    include: { route: true },
  });

  const result: CampusBillingResult = { created: 0, skipped: 0, fees: [] };
  for (const sub of subs) {
    if (options?.academicYear && sub.route.academicYear !== options.academicYear) continue;
    if (sub.route.priceAmount <= 0) continue;

    const label = `Transport — ${sub.route.name} (${sub.route.academicYear})`;
    const status = await createCampusTuitionFee({
      studentId: sub.studentId,
      academicYear: sub.route.academicYear,
      amount: sub.route.priceAmount,
      feeType: 'TRANSPORT',
      label,
      dueDate,
    });
    if (status === 'created') {
      result.created++;
      result.fees.push({
        id: sub.id,
        studentId: sub.studentId,
        amount: sub.route.priceAmount,
        description: label,
      });
    } else {
      result.skipped++;
    }
  }
  return result;
}

/** Facturation campus complète (cantine + transport). */
export async function billAllCampusServices(options?: {
  academicYear?: string;
  dueDate?: Date;
}): Promise<{ canteen: CampusBillingResult; transport: CampusBillingResult }> {
  const canteen = await billActiveCanteenSubscriptions(options);
  const transport = await billActiveTransportSubscriptions(options);
  return { canteen, transport };
}
