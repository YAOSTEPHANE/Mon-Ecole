export type AccountingJournalKind = 'REVENUE' | 'EXPENSE' | 'PETTY_IN' | 'PETTY_OUT';

export type AccountingJournalRow = {
  id: string;
  date: string;
  kind: AccountingJournalKind;
  label: string;
  reference: string | null;
  amount: number;
  ledgerCode: string;
  ledgerLabel: string;
  paymentMethod?: string | null;
  debit: number;
  credit: number;
};

export type AccountingJournalKindFilter = 'all' | AccountingJournalKind;

export type AccountingJournalSummary = {
  count: number;
  totalRevenue: number;
  totalExpenses: number;
  pettyIn: number;
  pettyOut: number;
  totalDebit: number;
  totalCredit: number;
  netFlow: number;
};

export const JOURNAL_KIND_LABEL: Record<AccountingJournalKind, string> = {
  REVENUE: 'Encaissement scolarité',
  EXPENSE: 'Dépense',
  PETTY_IN: 'Entrée caisse',
  PETTY_OUT: 'Sortie caisse',
};

export const JOURNAL_KIND_TONE: Record<AccountingJournalKind, string> = {
  REVENUE: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  EXPENSE: 'bg-rose-50 text-rose-800 ring-rose-200',
  PETTY_IN: 'bg-sky-50 text-sky-800 ring-sky-200',
  PETTY_OUT: 'bg-amber-50 text-amber-900 ring-amber-200',
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement',
  CARD: 'Carte',
  MOBILE_MONEY: 'Mobile money',
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '—';
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

export function computeJournalSummary(rows: AccountingJournalRow[]): AccountingJournalSummary {
  let totalRevenue = 0;
  let totalExpenses = 0;
  let pettyIn = 0;
  let pettyOut = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const row of rows) {
    totalDebit += row.debit;
    totalCredit += row.credit;
    switch (row.kind) {
      case 'REVENUE':
        totalRevenue += row.amount;
        break;
      case 'EXPENSE':
        totalExpenses += row.amount;
        break;
      case 'PETTY_IN':
        pettyIn += row.amount;
        break;
      case 'PETTY_OUT':
        pettyOut += row.amount;
        break;
      default: {
        const _exhaustive: never = row.kind;
        throw new Error(`Type de journal inconnu: ${String(_exhaustive)}`);
      }
    }
  }

  return {
    count: rows.length,
    totalRevenue,
    totalExpenses,
    pettyIn,
    pettyOut,
    totalDebit,
    totalCredit,
    netFlow: totalCredit - totalDebit,
  };
}

export function filterJournalRows(
  rows: AccountingJournalRow[],
  opts: { kind?: AccountingJournalKindFilter; search?: string }
): AccountingJournalRow[] {
  const q = opts.search?.trim().toLowerCase() ?? '';
  return rows.filter((row) => {
    if (opts.kind && opts.kind !== 'all' && row.kind !== opts.kind) return false;
    if (!q) return true;
    const hay = `${row.label} ${row.reference ?? ''} ${row.ledgerCode} ${row.ledgerLabel}`.toLowerCase();
    return hay.includes(q);
  });
}

export type AccountingJournalRowWithBalance = AccountingJournalRow & { runningBalance: number };

/** Solde cumulé en ordre chronologique (plus ancien → plus récent). */
export function withRunningBalance(rows: AccountingJournalRow[]): AccountingJournalRowWithBalance[] {
  const sorted = [...rows].sort((a, b) => {
    const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });

  let balance = 0;
  return sorted.map((row) => {
    balance += row.credit - row.debit;
    return { ...row, runningBalance: balance };
  });
}

export function exportJournalCsv(rows: AccountingJournalRow[], academicYear: string): void {
  const header = [
    'Date',
    'Type',
    'Compte',
    'Libellé compte',
    'Libellé opération',
    'Référence',
    'Méthode',
    'Débit FCFA',
    'Crédit FCFA',
  ];
  const lines = rows.map((r) =>
    [
      r.date.slice(0, 10),
      JOURNAL_KIND_LABEL[r.kind],
      r.ledgerCode,
      `"${r.ledgerLabel.replace(/"/g, '""')}"`,
      `"${r.label.replace(/"/g, '""')}"`,
      r.reference ?? '',
      paymentMethodLabel(r.paymentMethod),
      r.debit ? String(r.debit) : '',
      r.credit ? String(r.credit) : '',
    ].join(';')
  );
  const blob = new Blob([`\uFEFF${header.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `journal-transactions-${academicYear}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
