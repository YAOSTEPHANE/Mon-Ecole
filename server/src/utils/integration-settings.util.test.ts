import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveIntegrationValue } from './integration-settings.util';

describe('resolveIntegrationValue', () => {
  it('préfère la valeur DB non vide', () => {
    process.env.TEST_INTEGRATION_KEY = 'from-env';
    assert.equal(resolveIntegrationValue('from-db', 'TEST_INTEGRATION_KEY'), 'from-db');
  });

  it('retombe sur l’env si DB vide', () => {
    process.env.TEST_INTEGRATION_KEY = 'from-env';
    assert.equal(resolveIntegrationValue('', 'TEST_INTEGRATION_KEY'), 'from-env');
    assert.equal(resolveIntegrationValue(null, 'TEST_INTEGRATION_KEY'), 'from-env');
  });

  it('retourne vide si ni DB ni env', () => {
    delete process.env.TEST_INTEGRATION_KEY;
    assert.equal(resolveIntegrationValue('', 'TEST_INTEGRATION_KEY'), '');
  });
});
