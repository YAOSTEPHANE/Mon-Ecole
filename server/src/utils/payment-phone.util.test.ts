import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DEFAULT_PAYMENT_COUNTRY_CODE, toMsisdn } from './payment-phone.util';

describe('toMsisdn', () => {
  it('utilise l’indicatif Côte d’Ivoire par défaut', () => {
    assert.equal(DEFAULT_PAYMENT_COUNTRY_CODE, '225');
    assert.equal(toMsisdn('0700000000', '225'), '225700000000');
    assert.equal(toMsisdn('+225 07 00 00 00 00', '225'), '2250700000000');
  });

  it('conserve un MSISDN déjà international', () => {
    assert.equal(toMsisdn('2250700000000', '225'), '2250700000000');
    assert.equal(toMsisdn('002250700000000', '225'), '2250700000000');
  });
});
