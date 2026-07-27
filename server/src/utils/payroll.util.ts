import type { PayrollPersonKind, Prisma } from '@prisma/client';
import prisma from './prisma';
import { resolveWorkedMinutes } from './hours-summary.util';

const WEEKS_PER_MONTH = 4.33;

export type PayrollLineDraft = {
  personKind: PayrollPersonKind;
  personId: string;
  userId: string;
  employeeId: string;
  displayName: string;
  contractType: string | null;
  engagementKind: string | null;
  baseSalary: number;
  hoursWorked: number | null;
  hourlyRate: number | null;
  bonuses: number;
  deductions: number;
  netAmount: number;
  included: boolean;
  notes: string | null;
};

function roundMoney(n: number): number {
  return Math.round(n);
}

function monthDateRange(year: number, month: number): { fromYmd: string; toYmd: string } {
  const fromYmd = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const toYmd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { fromYmd, toYmd };
}

function computeNet(base: number, bonuses: number, deductions: number): number {
  return roundMoney(Math.max(0, base + bonuses - deductions));
}

/**
 * Vacataire : si plafond horaire + salaire mensuel de référence,
 * dérive un taux horaire et calcule la base à partir des heures pointées.
 * Sinon : salaire mensuel de référence tel quel.
 */
function resolveTeacherBase(input: {
  salary: number | null | undefined;
  engagementKind: string | null | undefined;
  maxWeeklyHours: number | null | undefined;
  hoursWorked: number | null;
}): { baseSalary: number; hourlyRate: number | null; notes: string | null } {
  const salary = Number(input.salary);
  if (!Number.isFinite(salary) || salary <= 0) {
    return { baseSalary: 0, hourlyRate: null, notes: null };
  }

  const isVacataire = input.engagementKind === 'VACATAIRE';
  const maxH = Number(input.maxWeeklyHours);
  if (isVacataire && Number.isFinite(maxH) && maxH > 0 && input.hoursWorked != null) {
    const hourlyRate = roundMoney(salary / (maxH * WEEKS_PER_MONTH));
    const baseSalary = roundMoney(hourlyRate * input.hoursWorked);
    return {
      baseSalary,
      hourlyRate,
      notes: `Vacataire : ${input.hoursWorked} h × ${hourlyRate} FCFA/h (réf. mensuelle ${salary})`,
    };
  }

  return {
    baseSalary: roundMoney(salary),
    hourlyRate: null,
    notes: isVacataire ? 'Vacataire : salaire de référence mensuel (heures non disponibles)' : null,
  };
}

export async function buildPayrollLineDrafts(year: number, month: number): Promise<PayrollLineDraft[]> {
  const { fromYmd, toYmd } = monthDateRange(year, month);

  const [teachers, educators, staffMembers, teacherAttendances, staffAttendances] = await Promise.all([
    prisma.teacher.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      },
    }),
    prisma.educator.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      },
    }),
    prisma.staffMember.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, isActive: true } },
      },
    }),
    prisma.teacherAttendance.findMany({
      where: {
        attendanceDate: { gte: fromYmd, lte: toYmd },
        teachingMinutes: { not: null },
      },
      select: { teacherId: true, teachingMinutes: true },
    }),
    prisma.staffAttendance.findMany({
      where: {
        attendanceDate: { gte: fromYmd, lte: toYmd },
      },
      select: {
        staffId: true,
        workedMinutes: true,
        checkInAt: true,
        checkOutAt: true,
      },
    }),
  ]);

  const teacherHours = new Map<string, number>();
  for (const a of teacherAttendances) {
    const mins = a.teachingMinutes ?? 0;
    if (mins <= 0) continue;
    teacherHours.set(a.teacherId, (teacherHours.get(a.teacherId) ?? 0) + mins);
  }

  const staffHours = new Map<string, number>();
  for (const a of staffAttendances) {
    const mins = resolveWorkedMinutes({
      workedMinutes: a.workedMinutes,
      checkInAt: a.checkInAt,
      checkOutAt: a.checkOutAt,
    });
    if (mins == null || mins <= 0) continue;
    staffHours.set(a.staffId, (staffHours.get(a.staffId) ?? 0) + mins);
  }

  const lines: PayrollLineDraft[] = [];

  for (const t of teachers) {
    if (t.user?.isActive === false) continue;
    const salary = t.salary != null ? Number(t.salary) : NaN;
    if (!Number.isFinite(salary) || salary <= 0) continue;
    const mins = teacherHours.get(t.id) ?? 0;
    const hoursWorked = mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
    const resolved = resolveTeacherBase({
      salary,
      engagementKind: t.engagementKind,
      maxWeeklyHours: t.maxWeeklyHours,
      hoursWorked,
    });
    if (resolved.baseSalary <= 0) continue;
    lines.push({
      personKind: 'TEACHER',
      personId: t.id,
      userId: t.userId,
      employeeId: t.employeeId,
      displayName: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim() || t.employeeId,
      contractType: t.contractType ?? null,
      engagementKind: t.engagementKind ?? null,
      baseSalary: resolved.baseSalary,
      hoursWorked,
      hourlyRate: resolved.hourlyRate,
      bonuses: 0,
      deductions: 0,
      netAmount: computeNet(resolved.baseSalary, 0, 0),
      included: true,
      notes: resolved.notes,
    });
  }

  for (const e of educators) {
    if (e.user?.isActive === false) continue;
    const salary = e.salary != null ? Number(e.salary) : NaN;
    if (!Number.isFinite(salary) || salary <= 0) continue;
    const base = roundMoney(salary);
    lines.push({
      personKind: 'EDUCATOR',
      personId: e.id,
      userId: e.userId,
      employeeId: e.employeeId,
      displayName: `${e.user?.firstName ?? ''} ${e.user?.lastName ?? ''}`.trim() || e.employeeId,
      contractType: e.contractType ?? null,
      engagementKind: null,
      baseSalary: base,
      hoursWorked: null,
      hourlyRate: null,
      bonuses: 0,
      deductions: 0,
      netAmount: computeNet(base, 0, 0),
      included: true,
      notes: null,
    });
  }

  for (const s of staffMembers) {
    if (s.user?.isActive === false) continue;
    const salary = s.salary != null ? Number(s.salary) : NaN;
    if (!Number.isFinite(salary) || salary <= 0) continue;
    const mins = staffHours.get(s.id) ?? 0;
    const hoursWorked = mins > 0 ? Math.round((mins / 60) * 100) / 100 : null;
    const base = roundMoney(salary);
    lines.push({
      personKind: 'STAFF',
      personId: s.id,
      userId: s.userId,
      employeeId: s.employeeId,
      displayName: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}`.trim() || s.employeeId,
      contractType: s.contractType ?? null,
      engagementKind: null,
      baseSalary: base,
      hoursWorked,
      hourlyRate: null,
      bonuses: 0,
      deductions: 0,
      netAmount: computeNet(base, 0, 0),
      included: true,
      notes: hoursWorked != null ? `Heures pointées : ${hoursWorked} h` : null,
    });
  }

  lines.sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr'));
  return lines;
}

export function summarizePayrollLines(lines: Array<{
  included: boolean;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
}>) {
  const included = lines.filter((l) => l.included);
  return {
    totalBase: roundMoney(included.reduce((s, l) => s + l.baseSalary, 0)),
    totalBonuses: roundMoney(included.reduce((s, l) => s + l.bonuses, 0)),
    totalDeductions: roundMoney(included.reduce((s, l) => s + l.deductions, 0)),
    totalNet: roundMoney(included.reduce((s, l) => s + l.netAmount, 0)),
    lineCount: included.length,
  };
}

export function recomputeLineNet(baseSalary: number, bonuses: number, deductions: number): number {
  return computeNet(baseSalary, bonuses, deductions);
}

export type PayrollRunWithLines = Prisma.PayrollRunGetPayload<{
  include: { lines: true };
}>;

export async function refreshPayrollRunTotals(runId: string): Promise<PayrollRunWithLines> {
  const lines = await prisma.payrollLine.findMany({ where: { payrollRunId: runId } });
  const totals = summarizePayrollLines(lines);
  return prisma.payrollRun.update({
    where: { id: runId },
    data: totals,
    include: { lines: { orderBy: { displayName: 'asc' } } },
  });
}

export function monthLabelFr(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
}
