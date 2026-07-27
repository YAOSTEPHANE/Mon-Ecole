import type { CashRegisterType, PettyCashMovementType } from '@prisma/client';

export type CashMovementRow = {
  id: string;
  date: string;
  registerId: string;
  registerName: string;
  registerCode: string;
  kind: 'IN' | 'OUT' | 'COLLECTION';
  amount: number;
  label: string;
  reference: string | null;
  paymentMethod?: string | null;
  recordedBy?: string | null;
  source: 'PETTY' | 'PAYMENT';
};

export type CashRegisterSummary = {
  id: string;
  code: string;
  name: string;
  type: CashRegisterType;
  isActive: boolean;
  openingFloat: number;
  balance: number;
  periodIn: number;
  periodOut: number;
  periodNet: number;
  movementCount: number;
  isVirtual?: boolean;
};

export function movementSignedAmount(type: PettyCashMovementType, amount: number): number {
  return type === 'IN' ? amount : -amount;
}

export function computeRegisterBalance(
  openingFloat: number,
  movements: Array<{ type: PettyCashMovementType; amount: number }>,
): number {
  let bal = openingFloat;
  for (const m of movements) {
    bal += movementSignedAmount(m.type, m.amount);
  }
  return Math.round(bal);
}

export function summarizeRegisterPeriod(
  movements: Array<{ type: PettyCashMovementType; amount: number; movementDate: Date }>,
  rangeStart?: Date | null,
  rangeEnd?: Date | null,
) {
  let periodIn = 0;
  let periodOut = 0;
  let movementCount = 0;
  for (const m of movements) {
    if (rangeStart && m.movementDate < rangeStart) continue;
    if (rangeEnd && m.movementDate > rangeEnd) continue;
    movementCount += 1;
    if (m.type === 'IN') periodIn += m.amount;
    else periodOut += m.amount;
  }
  return {
    periodIn: Math.round(periodIn),
    periodOut: Math.round(periodOut),
    periodNet: Math.round(periodIn - periodOut),
    movementCount,
  };
}

export const COUNTER_CASH_REGISTER_ID = '__counter_cash__';
export const COUNTER_MOBILE_REGISTER_ID = '__counter_mobile__';

export function counterRegisterVirtual(
  id: string,
  code: string,
  name: string,
  type: CashRegisterType,
  periodIn: number,
  movementCount: number,
): CashRegisterSummary {
  return {
    id,
    code,
    name,
    type,
    isActive: true,
    openingFloat: 0,
    balance: periodIn,
    periodIn: Math.round(periodIn),
    periodOut: 0,
    periodNet: Math.round(periodIn),
    movementCount,
    isVirtual: true,
  };
}

export function sortCashMovements(rows: CashMovementRow[]): CashMovementRow[] {
  return [...rows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function filterMovementsByRegister(rows: CashMovementRow[], registerId: string): CashMovementRow[] {
  if (registerId === 'all') return rows;
  return rows.filter((r) => r.registerId === registerId);
}

export function exportCashMovementsCsv(rows: CashMovementRow[]): string {
  const header = ['Date', 'Caisse', 'Type', 'Libellé', 'Référence', 'Méthode', 'Montant FCFA', 'Sens'];
  const lines = rows.map((r) =>
    [
      r.date.slice(0, 19).replace('T', ' '),
      `"${r.registerName.replace(/"/g, '""')}"`,
      r.kind === 'COLLECTION' ? 'Encaissement' : r.kind === 'IN' ? 'Entrée' : 'Sortie',
      `"${r.label.replace(/"/g, '""')}"`,
      r.reference ?? '',
      r.paymentMethod ?? '',
      String(r.amount),
      r.kind === 'OUT' ? 'Sortie' : 'Entrée',
    ].join(';'),
  );
  return `\uFEFF${header.join(';')}\n${lines.join('\n')}`;
}
