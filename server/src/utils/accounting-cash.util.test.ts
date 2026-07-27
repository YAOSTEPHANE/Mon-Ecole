import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeRegisterBalance,
  exportCashMovementsCsv,
  movementSignedAmount,
  summarizeRegisterPeriod,
} from './accounting-cash.util';

describe('accounting-cash.util', () => {
  it('calcule le solde avec fonds initial', () => {
    const bal = computeRegisterBalance(10_000, [
      { type: 'IN', amount: 5_000 },
      { type: 'OUT', amount: 2_000 },
    ]);
    assert.equal(bal, 13_000);
  });

  it('agrège une période', () => {
    const summary = summarizeRegisterPeriod(
      [
        { type: 'IN', amount: 100, movementDate: new Date('2026-07-01') },
        { type: 'OUT', amount: 40, movementDate: new Date('2026-07-15') },
        { type: 'IN', amount: 50, movementDate: new Date('2026-06-01') },
      ],
      new Date('2026-07-01'),
      new Date('2026-07-31'),
    );
    assert.equal(summary.periodIn, 100);
    assert.equal(summary.periodOut, 40);
    assert.equal(summary.periodNet, 60);
    assert.equal(summary.movementCount, 2);
  });

  it('signe les montants selon le type', () => {
    assert.equal(movementSignedAmount('IN', 50), 50);
    assert.equal(movementSignedAmount('OUT', 50), -50);
  });

  it('exporte un CSV avec en-tête', () => {
    const csv = exportCashMovementsCsv([
      {
        id: '1',
        date: '2026-07-10T10:00:00.000Z',
        registerId: 'r1',
        registerName: 'Caisse 1',
        registerCode: 'C1',
        kind: 'IN',
        amount: 1000,
        label: 'Test',
        reference: null,
        source: 'PETTY',
      },
    ]);
    assert.ok(csv.includes('Date'));
    assert.ok(csv.includes('Caisse 1'));
    assert.ok(csv.startsWith('\uFEFF'));
  });
});
