export type ClassMoneyRow = {
  key: string;
  label: string;
  level?: string;
  paidAmount: number;
  paidCount: number;
  unpaidAmount: number;
  unpaidCount: number;
  overdueAmount: number;
  overdueCount: number;
  studentsPaid: number;
  studentsUnpaid: number;
};

export type ClassFinancialRow = ClassMoneyRow & {
  totalBilled: number;
  collectionRate: number;
  unpaidRate: number;
  overdueShareOfUnpaid: number;
};

export function collectionRate(row: ClassMoneyRow): number {
  const total = row.paidAmount + row.unpaidAmount;
  if (total <= 0) return 100;
  return Math.round((row.paidAmount / total) * 1000) / 10;
}

export function enrichClassFinancialRow(row: ClassMoneyRow): ClassFinancialRow {
  const totalBilled = row.paidAmount + row.unpaidAmount;
  const rate = collectionRate(row);
  const unpaidRate = totalBilled > 0 ? Math.round((row.unpaidAmount / totalBilled) * 1000) / 10 : 0;
  const overdueShareOfUnpaid =
    row.unpaidAmount > 0 ? Math.round((row.overdueAmount / row.unpaidAmount) * 1000) / 10 : 0;
  return {
    ...row,
    totalBilled,
    collectionRate: rate,
    unpaidRate,
    overdueShareOfUnpaid,
  };
}

export function enrichClassFinancialRows(rows: ClassMoneyRow[]): ClassFinancialRow[] {
  return rows.map(enrichClassFinancialRow).sort((a, b) => a.collectionRate - b.collectionRate);
}

export function formatCollectionRate(rate: number): string {
  return `${rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;
}

export function collectionRateTone(rate: number): string {
  if (rate >= 85) return 'text-emerald-800';
  if (rate >= 60) return 'text-amber-800';
  return 'text-rose-800';
}

export function collectionRateBarClass(rate: number): string {
  if (rate >= 85) return 'bg-emerald-500';
  if (rate >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function unpaidRateBarClass(rate: number): string {
  if (rate < 15) return 'bg-emerald-500';
  if (rate < 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

export function summarizeClassFinancialRows(rows: ClassFinancialRow[]) {
  const paidAmount = rows.reduce((s, r) => s + r.paidAmount, 0);
  const unpaidAmount = rows.reduce((s, r) => s + r.unpaidAmount, 0);
  const overdueAmount = rows.reduce((s, r) => s + r.overdueAmount, 0);
  const totalBilled = paidAmount + unpaidAmount;
  const collectionRateGlobal = totalBilled > 0 ? Math.round((paidAmount / totalBilled) * 1000) / 10 : 100;
  const studentsPaid = rows.reduce((s, r) => s + r.studentsPaid, 0);
  const studentsUnpaid = rows.reduce((s, r) => s + r.studentsUnpaid, 0);
  return {
    classCount: rows.length,
    paidAmount,
    unpaidAmount,
    overdueAmount,
    totalBilled,
    collectionRate: collectionRateGlobal,
    studentsPaid,
    studentsUnpaid,
  };
}

export function exportClassFinancialCsv(rows: ClassFinancialRow[], academicYear: string): void {
  const header = [
    'Classe',
    'Niveau',
    'Encaissé FCFA',
    'Impayés FCFA',
    'En retard FCFA',
    'Total dû FCFA',
    'Taux recouvrement %',
    'Paiements',
    'Échéances impayées',
    'Élèves ayant payé',
    'Élèves avec impayés',
  ];
  const lines = rows.map((r) =>
    [
      `"${r.label.replace(/"/g, '""')}"`,
      r.level ?? '',
      String(r.paidAmount),
      String(r.unpaidAmount),
      String(r.overdueAmount),
      String(r.totalBilled),
      String(r.collectionRate),
      String(r.paidCount),
      String(r.unpaidCount),
      String(r.studentsPaid),
      String(r.studentsUnpaid),
    ].join(';')
  );
  const blob = new Blob([`\uFEFF${header.join(';')}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `situation-financiere-classes-${academicYear}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}
