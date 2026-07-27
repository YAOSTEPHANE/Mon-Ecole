import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeTuitionBillingStatus } from './tuition-fee-billing.util';
import { assertInstallmentSumWithinStructure } from './tuition-catalog.util';
import { computeScholarshipDiscount } from './student-scholarship.util';

describe('tuition-fee-billing.util', () => {
  it('calcule ISSUED / PARTIALLY_PAID / PAID', () => {
    assert.equal(computeTuitionBillingStatus(0, 50_000), 'ISSUED');
    assert.equal(computeTuitionBillingStatus(10_000, 50_000), 'PARTIALLY_PAID');
    assert.equal(computeTuitionBillingStatus(50_000, 50_000), 'PAID');
  });
});

describe('tuition-catalog installment guard', () => {
  it('refuse une somme de tranches supérieure à la structure', () => {
    assert.throws(
      () => assertInstallmentSumWithinStructure(100_000, [60_000, 50_000]),
      /dépasse/,
    );
    assert.doesNotThrow(() => assertInstallmentSumWithinStructure(100_000, [40_000, 60_000]));
  });
});

describe('student-scholarship.util', () => {
  it('applique remise fixe et pourcentage', () => {
    const r1 = computeScholarshipDiscount(100_000, [{ fixedAmount: 20_000, percentOff: null, feeType: null, label: 'Bourse' }]);
    assert.equal(r1.discount, 20_000);
    const r2 = computeScholarshipDiscount(100_000, [{ fixedAmount: null, percentOff: 10, feeType: null, label: 'Aide' }]);
    assert.equal(r2.discount, 10_000);
  });
});
