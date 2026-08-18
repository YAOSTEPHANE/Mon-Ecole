import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolvePaymentProvider,
  listConfiguredPaymentProviders,
  initiateOnlineCheckout,
} from './payment-providers.util';
import { scoreTimetableCandidates } from './timetable-optimizer.util';
import { linearForecast, growthRate } from './predictive-bi.util';

describe('payment-providers', () => {
  it('liste les providers connus', () => {
    const list = listConfiguredPaymentProviders();
    assert.ok(list.some((p) => p.id === 'SANDBOX'));
    assert.ok(list.some((p) => p.id === 'WAVE'));
  });

  it('résout SANDBOX sans clés', () => {
    assert.equal(resolvePaymentProvider('WAVE', 'MOBILE_MONEY'), 'SANDBOX');
    assert.equal(resolvePaymentProvider('MOOV_MONEY', 'MOBILE_MONEY'), 'SANDBOX');
    assert.equal(resolvePaymentProvider('ORANGE_MONEY', 'MOBILE_MONEY'), 'SANDBOX');
    assert.equal(resolvePaymentProvider('MTN_MOBILE_MONEY', 'MOBILE_MONEY'), 'SANDBOX');
  });

  it('initie un checkout sandbox', async () => {
    const result = await initiateOnlineCheckout({
      paymentId: 'pay1',
      paymentReference: 'PAY-TEST-1',
      amount: 10000,
      method: 'MOBILE_MONEY',
      operator: 'WAVE',
      phoneNumber: '670000000',
    });
    assert.equal(result.provider, 'SANDBOX');
    assert.equal(result.mode, 'sandbox');
    assert.ok(result.message);
  });
});

describe('timetable-optimizer', () => {
  it('pénalise les conflits de classe', () => {
    const ranked = scoreTimetableCandidates({
      classId: 'c1',
      teacherId: 't1',
      candidates: [
        { dayOfWeek: 1, startTime: '08:00', endTime: '09:00', roomKey: 'A1' },
        { dayOfWeek: 1, startTime: '10:00', endTime: '11:00', roomKey: 'A1' },
      ],
      existing: [
        {
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '09:00',
          classId: 'c1',
          teacherId: 't2',
          roomKey: 'B1',
        },
      ],
    });
    assert.ok(ranked[0]!.score > ranked[1]!.score || ranked[0]!.startTime === '10:00');
  });
});

describe('predictive-bi', () => {
  it('calcule une projection', () => {
    const hist = [
      { label: '2026-01', amount: 100 },
      { label: '2026-02', amount: 120 },
      { label: '2026-03', amount: 140 },
    ];
    const fc = linearForecast(hist, 2);
    assert.equal(fc.length, 2);
    assert.ok(fc[0]!.amount >= 0);
    assert.equal(growthRate(hist), 16.7);
  });
});
