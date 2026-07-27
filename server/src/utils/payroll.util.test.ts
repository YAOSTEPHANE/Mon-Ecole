import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recomputeLineNet, summarizePayrollLines } from './payroll.util';

describe('payroll.util', () => {
  it('recomputeLineNet ignore les négatifs nets', () => {
    assert.equal(recomputeLineNet(100_000, 0, 150_000), 0);
    assert.equal(recomputeLineNet(100_000, 10_000, 5_000), 105_000);
  });

  it('summarizePayrollLines ignore les lignes exclues', () => {
    const totals = summarizePayrollLines([
      { included: true, baseSalary: 100, bonuses: 10, deductions: 5, netAmount: 105 },
      { included: false, baseSalary: 200, bonuses: 0, deductions: 0, netAmount: 200 },
    ]);
    assert.equal(totals.lineCount, 1);
    assert.equal(totals.totalBase, 100);
    assert.equal(totals.totalBonuses, 10);
    assert.equal(totals.totalDeductions, 5);
    assert.equal(totals.totalNet, 105);
  });
});
