import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  computeBillingStatusFromPayments,
  resolveBillingStatus,
  TUITION_BILLING_STATUS_LABELS,
} from './tuitionBilling';

describe('tuitionBilling', () => {
  it('calcule le statut à partir des paiements', () => {
    assert.equal(computeBillingStatusFromPayments(0, 100_000), 'ISSUED');
    assert.equal(computeBillingStatusFromPayments(40_000, 100_000), 'PARTIALLY_PAID');
    assert.equal(computeBillingStatusFromPayments(100_000, 100_000), 'PAID');
  });

  it('résout le statut legacy isPaid', () => {
    assert.equal(resolveBillingStatus({ isPaid: true }), 'PAID');
    assert.equal(resolveBillingStatus({ isPaid: false }), 'ISSUED');
    assert.equal(resolveBillingStatus({ billingStatus: 'PARTIALLY_PAID', isPaid: false }), 'PARTIALLY_PAID');
  });

  it('expose les libellés français', () => {
    assert.equal(TUITION_BILLING_STATUS_LABELS.PARTIALLY_PAID, 'Partiellement payée');
  });
});
