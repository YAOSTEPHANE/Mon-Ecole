import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  computeJournalSummary,
  filterJournalRows,
  withRunningBalance,
  type AccountingJournalRow,
} from './accountingJournal';

function row(partial: Partial<AccountingJournalRow> & Pick<AccountingJournalRow, 'kind' | 'amount'>): AccountingJournalRow {
  const amount = partial.amount;
  const debit = partial.debit ?? (partial.kind === 'EXPENSE' || partial.kind === 'PETTY_OUT' ? amount : 0);
  const credit = partial.credit ?? (partial.kind === 'REVENUE' || partial.kind === 'PETTY_IN' ? amount : 0);
  return {
    id: partial.id ?? `row-${partial.kind}-${amount}`,
    date: partial.date ?? '2026-07-10T10:00:00.000Z',
    label: partial.label ?? 'Test',
    reference: partial.reference ?? null,
    ledgerCode: partial.ledgerCode ?? '706',
    ledgerLabel: partial.ledgerLabel ?? 'Produits',
    paymentMethod: partial.paymentMethod ?? null,
    amount,
    debit,
    credit,
    kind: partial.kind,
  };
}

describe('accountingJournal', () => {
  it('calcule la synthèse par type', () => {
    const summary = computeJournalSummary([
      row({ kind: 'REVENUE', amount: 100_000 }),
      row({ kind: 'EXPENSE', amount: 30_000 }),
      row({ kind: 'PETTY_IN', amount: 5_000 }),
      row({ kind: 'PETTY_OUT', amount: 2_000 }),
    ]);

    assert.equal(summary.totalRevenue, 100_000);
    assert.equal(summary.totalExpenses, 30_000);
    assert.equal(summary.pettyIn, 5_000);
    assert.equal(summary.pettyOut, 2_000);
    assert.equal(summary.totalDebit, 32_000);
    assert.equal(summary.totalCredit, 105_000);
    assert.equal(summary.netFlow, 73_000);
    assert.equal(summary.count, 4);
  });

  it('filtre par type et recherche', () => {
    const rows = [
      row({ id: 'a', kind: 'REVENUE', amount: 10, label: 'Scolarité Dupont' }),
      row({ id: 'b', kind: 'EXPENSE', amount: 5, label: 'Fournitures', reference: 'FAC-001' }),
    ];
    const byKind = filterJournalRows(rows, { kind: 'EXPENSE' });
    assert.equal(byKind.length, 1);
    assert.equal(byKind[0]?.id, 'b');

    const bySearch = filterJournalRows(rows, { search: 'dupont' });
    assert.equal(bySearch.length, 1);
    assert.equal(bySearch[0]?.id, 'a');
  });

  it('calcule le solde cumulé chronologique', () => {
    const withBal = withRunningBalance([
      row({ id: '1', kind: 'REVENUE', amount: 100, date: '2026-07-01T10:00:00.000Z' }),
      row({ id: '2', kind: 'EXPENSE', amount: 40, date: '2026-07-02T10:00:00.000Z' }),
      row({ id: '3', kind: 'PETTY_IN', amount: 10, date: '2026-07-03T10:00:00.000Z' }),
    ]);
    assert.equal(withBal[0]?.runningBalance, 100);
    assert.equal(withBal[1]?.runningBalance, 60);
    assert.equal(withBal[2]?.runningBalance, 70);
  });
});
