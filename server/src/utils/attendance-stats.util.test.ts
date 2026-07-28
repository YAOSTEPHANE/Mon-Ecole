import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { absenceRate, computeAttendanceStats, type AttendanceStatRow } from './attendance-stats.util';

function row(partial: Partial<AttendanceStatRow> & Pick<AttendanceStatRow, 'status' | 'studentId'>): AttendanceStatRow {
  return {
    courseId: 'course-1',
    excused: false,
    minutesLate: null,
    hasMedicalCertificate: false,
    sanctionNote: null,
    attendanceSource: 'MANUAL',
    date: new Date('2026-07-10T08:00:00.000Z'),
    course: { name: 'Mathématiques', class: { id: 'class-1', name: '6ème A', level: '6ème' } },
    student: {
      classId: 'class-1',
      gender: 'MALE',
      dateOfBirth: new Date('2013-03-15T00:00:00.000Z'),
      class: { name: '6ème A', level: '6ème' },
      user: { firstName: 'Jean', lastName: 'Dupont' },
    },
    ...partial,
  };
}

describe('computeAttendanceStats', () => {
  it('agrège les statuts principaux', () => {
    const stats = computeAttendanceStats([
      row({ status: 'PRESENT', studentId: 's1' }),
      row({ status: 'LATE', studentId: 's1', minutesLate: 10 }),
      row({ status: 'ABSENT', studentId: 's2', excused: false }),
      row({ status: 'ABSENT', studentId: 's3', excused: true }),
      row({ status: 'EXCUSED', studentId: 's4' }),
    ]);

    assert.equal(stats.total, 5);
    assert.equal(stats.present, 1);
    assert.equal(stats.late, 1);
    assert.equal(stats.absentUnexcused, 1);
    assert.equal(stats.excusedAbsent, 2);
    assert.equal(stats.punctualityRate, 40);
    assert.equal(stats.avgLateMinutes, 10);
  });

  it('produit les répartitions par classe et par jour', () => {
    const stats = computeAttendanceStats([
      row({ status: 'PRESENT', studentId: 's1', date: new Date('2026-07-10T08:00:00.000Z') }),
      row({
        status: 'LATE',
        studentId: 's2',
        date: new Date('2026-07-11T08:00:00.000Z'),
        student: {
          classId: 'class-2',
          gender: 'FEMALE',
          dateOfBirth: new Date('2012-01-01T00:00:00.000Z'),
          class: { name: '5ème B', level: '5ème' },
          user: { firstName: 'Marie', lastName: 'Martin' },
        },
      }),
    ]);

    assert.equal(stats.byClass.length, 2);
    assert.equal(stats.byDay.length, 2);
    assert.equal(stats.byDay[0]?.date, '2026-07-10');
    assert.equal(stats.topLateStudents[0]?.studentName, 'Marie Martin');
  });

  it('liste les absences par niveau, sexe et tranche d’âge', () => {
    const stats = computeAttendanceStats([
      row({
        status: 'ABSENT',
        studentId: 's1',
        excused: false,
        student: {
          classId: 'class-1',
          gender: 'MALE',
          dateOfBirth: new Date('2014-06-01T00:00:00.000Z'),
          class: { name: '6ème A', level: '6ème' },
          user: { firstName: 'Jean', lastName: 'Dupont' },
        },
      }),
      row({
        status: 'ABSENT',
        studentId: 's2',
        excused: true,
        student: {
          classId: 'class-2',
          gender: 'FEMALE',
          dateOfBirth: new Date('2011-06-01T00:00:00.000Z'),
          class: { name: '5ème B', level: '5ème' },
          user: { firstName: 'Marie', lastName: 'Martin' },
        },
      }),
      row({
        status: 'PRESENT',
        studentId: 's3',
        student: {
          classId: 'class-1',
          gender: 'MALE',
          dateOfBirth: new Date('2014-01-01T00:00:00.000Z'),
          class: { name: '6ème A', level: '6ème' },
          user: { firstName: 'Paul', lastName: 'Bernard' },
        },
      }),
    ]);

    assert.equal(stats.byLevel.length, 2);
    const sixth = stats.byLevel.find((l) => l.key === '6ème');
    assert.equal(sixth?.absencesTotal, 1);
    assert.equal(sixth?.total, 2);

    const girls = stats.byGender.find((g) => g.key === 'FEMALE');
    assert.equal(girls?.absencesTotal, 1);
    assert.equal(girls?.excusedAbsent, 1);

    assert.ok(stats.byAgeGroup.length >= 1);
    assert.equal(
      stats.byAgeGroup.reduce((sum, g) => sum + g.absencesTotal, 0),
      2
    );
  });

  it('compte les sources de pointage', () => {
    const stats = computeAttendanceStats([
      row({ status: 'PRESENT', studentId: 's1', attendanceSource: 'NFC' }),
      row({ status: 'PRESENT', studentId: 's2', attendanceSource: 'BIOMETRIC' }),
      row({ status: 'PRESENT', studentId: 's3', attendanceSource: null }),
    ]);

    assert.equal(stats.bySource.nfc, 1);
    assert.equal(stats.bySource.biometric, 1);
    assert.equal(stats.bySource.other, 1);
  });

  it('agrège les statistiques par élève', () => {
    const stats = computeAttendanceStats([
      row({ status: 'PRESENT', studentId: 's1' }),
      row({ status: 'LATE', studentId: 's1', minutesLate: 5 }),
      row({ status: 'ABSENT', studentId: 's2', excused: false }),
      row({
        status: 'ABSENT',
        studentId: 's2',
        excused: false,
        student: {
          classId: 'class-2',
          gender: 'FEMALE',
          dateOfBirth: new Date('2012-01-01T00:00:00.000Z'),
          class: { name: '5ème B', level: '5ème' },
          user: { firstName: 'Marie', lastName: 'Martin' },
        },
      }),
    ]);

    assert.equal(stats.byStudent.length, 2);
    assert.equal(stats.byStudent[0]?.studentId, 's2');
    assert.equal(stats.byStudent[0]?.absentUnexcused, 2);
    assert.equal(stats.byStudent[0]?.absenceRate, 100);
    assert.equal(stats.byStudent[1]?.studentId, 's1');
    assert.equal(stats.byStudent[1]?.lateMinutesTotal, 5);
    assert.equal(stats.byStudent[1]?.absenceRate, 0);
  });

  it('produit un résumé par séance et sépare absents et excusés par jour', () => {
    const stats = computeAttendanceStats([
      row({ status: 'PRESENT', studentId: 's1', courseId: 'c1' }),
      row({ status: 'LATE', studentId: 's2', courseId: 'c1' }),
      row({ status: 'ABSENT', studentId: 's3', courseId: 'c1', excused: false }),
      row({ status: 'EXCUSED', studentId: 's4', courseId: 'c2', course: { name: 'Français', class: { id: 'class-1', name: '6ème A' } } }),
    ]);

    assert.equal(stats.bySession.length, 2);
    assert.equal(stats.byDay[0]?.absentUnexcused, 1);
    assert.equal(stats.byDay[0]?.excusedAbsent, 1);
    const mathSession = stats.bySession.find((s) => s.courseId === 'c1');
    assert.equal(mathSession?.present, 1);
    assert.equal(mathSession?.late, 1);
    assert.equal(mathSession?.absentUnexcused, 1);
  });
});

describe('absenceRate', () => {
  it('calcule le pourcentage d’absences sur le total', () => {
    assert.equal(absenceRate(1, 10), 10);
    assert.equal(absenceRate(2, 10), 20);
    assert.equal(absenceRate(0, 0), 0);
  });
});
