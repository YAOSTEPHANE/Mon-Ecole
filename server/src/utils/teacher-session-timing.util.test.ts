import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeStartTiming, computeEndTiming } from './teacher-session-timing.util';

describe('teacher-session-timing', () => {
  it('calcule avance à l arrivée', () => {
    const at = new Date('2026-03-10T07:45:00');
    const r = computeStartTiming(at, '08:00', 10);
    assert.equal(r.minutesEarlyStart, 15);
    assert.equal(r.minutesLateStart, 0);
  });

  it('calcule retard à l arrivée', () => {
    const at = new Date('2026-03-10T08:25:00');
    const r = computeStartTiming(at, '08:00', 10);
    assert.equal(r.minutesLateStart, 25);
    assert.equal(r.minutesEarlyStart, 0);
  });

  it('calcule départ anticipé', () => {
    const at = new Date('2026-03-10T09:45:00');
    const r = computeEndTiming(at, '10:00');
    assert.equal(r.minutesEarlyEnd, 15);
    assert.equal(r.minutesOvertimeEnd, 0);
  });

  it('calcule dépassement après fin EDT', () => {
    const at = new Date('2026-03-10T10:12:00');
    const r = computeEndTiming(at, '10:00');
    assert.equal(r.minutesOvertimeEnd, 12);
    assert.equal(r.minutesEarlyEnd, 0);
  });
});
