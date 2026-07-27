import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  permissionCoversCalendarDay,
  permissionPeriodUtcBounds,
  startOfUtcDay,
  assertAbsencePermissionDeletable,
  ABSENCE_PERMISSION_DELETE_FORBIDDEN_MESSAGE,
} from './student-absence-permission.util';

describe('permissionCoversCalendarDay', () => {
  it('couvre un jour inclus dans la période', () => {
    const start = new Date('2026-07-10T00:00:00.000Z');
    const end = new Date('2026-07-15T00:00:00.000Z');
    const day = new Date('2026-07-12T14:30:00.000Z');
    assert.equal(permissionCoversCalendarDay(start, end, day), true);
  });

  it('exclut un jour avant la période', () => {
    const start = new Date('2026-07-10T00:00:00.000Z');
    const end = new Date('2026-07-15T00:00:00.000Z');
    const day = new Date('2026-07-09T23:59:59.000Z');
    assert.equal(permissionCoversCalendarDay(start, end, day), false);
  });

  it('exclut un jour après la période', () => {
    const start = new Date('2026-07-10T00:00:00.000Z');
    const end = new Date('2026-07-15T00:00:00.000Z');
    const day = new Date('2026-07-16T00:00:00.000Z');
    assert.equal(permissionCoversCalendarDay(start, end, day), false);
  });
});

describe('permissionPeriodUtcBounds', () => {
  it('produit un intervalle demi-ouvert sur plusieurs jours UTC', () => {
    const start = new Date('2026-07-10T08:00:00.000Z');
    const end = new Date('2026-07-12T18:00:00.000Z');
    const bounds = permissionPeriodUtcBounds(start, end);
    assert.equal(bounds.gte.toISOString(), '2026-07-10T00:00:00.000Z');
    assert.equal(bounds.lt.toISOString(), '2026-07-13T00:00:00.000Z');
    assert.equal(startOfUtcDay(start).toISOString(), '2026-07-10T00:00:00.000Z');
  });
});

describe('assertAbsencePermissionDeletable', () => {
  it('autorise la suppression hors statut approuvé', () => {
    assert.doesNotThrow(() => assertAbsencePermissionDeletable('PENDING'));
    assert.doesNotThrow(() => assertAbsencePermissionDeletable('REJECTED'));
    assert.doesNotThrow(() => assertAbsencePermissionDeletable('CANCELLED'));
  });

  it('refuse la suppression d’une permission approuvée', () => {
    assert.throws(
      () => assertAbsencePermissionDeletable('APPROVED'),
      (error: unknown) =>
        error instanceof Error && error.message === ABSENCE_PERMISSION_DELETE_FORBIDDEN_MESSAGE
    );
  });
});
