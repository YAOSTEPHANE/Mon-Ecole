export type CashRegisterType = 'PETTY' | 'COUNTER' | 'AUXILIARY';

export const REGISTER_TYPE_LABEL: Record<CashRegisterType, string> = {
  PETTY: 'Petite caisse',
  COUNTER: 'Guichet',
  AUXILIARY: 'Caisse annexe',
};

export const MOVEMENT_KIND_LABEL = {
  IN: 'Entrée',
  OUT: 'Sortie',
  COLLECTION: 'Encaissement',
} as const;

export type CashMovementKind = keyof typeof MOVEMENT_KIND_LABEL;

export type CashRegisterRow = {
  id: string;
  code: string;
  name: string;
  type: CashRegisterType;
  isActive: boolean;
  description?: string | null;
  openingFloat: number;
};

export type CashRegisterSummary = CashRegisterRow & {
  balance: number;
  periodIn: number;
  periodOut: number;
  periodNet: number;
  movementCount: number;
  isVirtual?: boolean;
};

export type CashMovementRow = {
  id: string;
  date: string;
  registerId: string;
  registerName: string;
  registerCode: string;
  kind: CashMovementKind;
  amount: number;
  label: string;
  reference: string | null;
  paymentMethod?: string | null;
  recordedBy?: string | null;
  source: 'PETTY' | 'PAYMENT';
};

export type CashOverview = {
  period: { from: string | null; to: string | null };
  registers: CashRegisterSummary[];
  consolidated: {
    registerCount: number;
    totalPhysicalBalance: number;
    periodIn: number;
    periodOut: number;
    counterCollections: number;
    movementCount: number;
    netFlow: number;
  };
  movements: CashMovementRow[];
};

export function downloadCashMovementsCsv(rows: CashMovementRow[], filename: string): void {
  const header = ['Date', 'Caisse', 'Type', 'Libellé', 'Référence', 'Méthode', 'Montant FCFA'];
  const lines = rows.map((r) =>
    [
      r.date.slice(0, 19).replace('T', ' '),
      `"${r.registerName.replace(/"/g, '""')}"`,
      MOVEMENT_KIND_LABEL[r.kind],
      `"${r.label.replace(/"/g, '""')}"`,
      r.reference ?? '',
      r.paymentMethod ?? '',
      String(r.amount),
    ].join(';'),
  );
  const blob = new Blob([`\uFEFF${header.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
