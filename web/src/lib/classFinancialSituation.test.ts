import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectionRate,
  enrichClassFinancialRow,
  enrichClassFinancialRows,
  summarizeClassFinancialRows,
} from './classFinancialSituation';

describe('classFinancialSituation', () => {
  it('calcule le taux de recouvrement', () => {
    assert.equal(collectionRate({ paidAmount: 80_000, unpaidAmount: 20_000 } as never), 80);
    assert.equal(collectionRate({ paidAmount: 0, unpaidAmount: 0 } as never), 100);
  });

  it('enrichit et trie par recouvrement croissant', () => {
    const rows = enrichClassFinancialRows([
      {
        key: 'a',
        label: '6ème A',
        level: '6ème',
        paidAmount: 100_000,
        paidCount: 10,
        unpaidAmount: 0,
        unpaidCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        studentsPaid: 8,
        studentsUnpaid: 0,
      },
      {
        key: 'b',
        label: '5ème B',
        level: '5ème',
        paidAmount: 30_000,
        paidCount: 3,
        unpaidAmount: 70_000,
        unpaidCount: 7,
        overdueAmount: 40_000,
        overdueCount: 4,
        studentsPaid: 3,
        studentsUnpaid: 5,
      },
    ]);

    assert.equal(rows[0]?.key, 'b');
    assert.equal(rows[0]?.collectionRate, 30);
    assert.equal(rows[0]?.overdueShareOfUnpaid, 57.1);
    assert.equal(rows[1]?.collectionRate, 100);
  });

  it('agrège la synthèse globale', () => {
    const rows = enrichClassFinancialRows([
      {
        key: 'a',
        label: 'A',
        paidAmount: 50_000,
        paidCount: 1,
        unpaidAmount: 50_000,
        unpaidCount: 1,
        overdueAmount: 10_000,
        overdueCount: 1,
        studentsPaid: 1,
        studentsUnpaid: 1,
      },
    ]);
    const s = summarizeClassFinancialRows(rows);
    assert.equal(s.paidAmount, 50_000);
    assert.equal(s.unpaidAmount, 50_000);
    assert.equal(s.collectionRate, 50);
    assert.equal(s.classCount, 1);
  });

  it('calcule les parts impayées', () => {
    const row = enrichClassFinancialRow({
      key: 'x',
      label: 'Test',
      paidAmount: 25_000,
      paidCount: 2,
      unpaidAmount: 75_000,
      unpaidCount: 5,
      overdueAmount: 30_000,
      overdueCount: 2,
      studentsPaid: 2,
      studentsUnpaid: 4,
    });
    assert.equal(row.unpaidRate, 75);
    assert.equal(row.totalBilled, 100_000);
  });
});
