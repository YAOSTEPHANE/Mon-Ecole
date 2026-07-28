import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizePresenceDay,
  parseMenaPresenceCsv,
  parsePresenceStatus,
} from './mena-daily-presence-import.util';

describe('mena-daily-presence-import', () => {
  it('normalise le statut', () => {
    assert.equal(parsePresenceStatus('present'), 'PRESENT');
    assert.equal(parsePresenceStatus('RETARD'), 'LATE');
    assert.equal(parsePresenceStatus('A'), 'ABSENT');
  });

  it('normalise la date au début de journée', () => {
    const d = normalizePresenceDay('2026-07-28T15:22:00');
    assert.equal(d.getHours(), 0);
    assert.equal(d.getDate(), 28);
  });

  it('parse un CSV MENA', () => {
    const csv =
      'matricule,date,statut,heure_arrivee\nFNE1,2026-07-28,PRESENT,08:05\nSTU2,2026-07-28,ABSENT,\n';
    const rows = parseMenaPresenceCsv(csv);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].externalId, 'FNE1');
    assert.equal(rows[0].status, 'PRESENT');
    assert.equal(rows[1].externalId, 'STU2');
    assert.equal(rows[1].status, 'ABSENT');
  });
});
