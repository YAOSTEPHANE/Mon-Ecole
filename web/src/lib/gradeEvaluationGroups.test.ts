import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  gradeEvaluationGroupKey,
  groupGradesByEvaluation,
  groupGradesByStudent,
} from './gradeEvaluationGroups';

describe('gradeEvaluationGroups', () => {
  it('regroupe les notes du même devoir / interrogation', () => {
    const grades = [
      {
        id: '1',
        title: 'Interro n°1',
        evaluationType: 'EVALUATION',
        courseId: 'c1',
        course: { id: 'c1', name: 'Maths' },
        date: '2026-03-10T10:00:00.000Z',
        score: 14,
        maxScore: 20,
        studentId: 's1',
        student: { id: 's1', user: { lastName: 'Bamba', firstName: 'Aya' } },
      },
      {
        id: '2',
        title: 'Interro n°1',
        evaluationType: 'EVALUATION',
        courseId: 'c1',
        course: { id: 'c1', name: 'Maths' },
        date: '2026-03-10T10:00:00.000Z',
        score: 12,
        maxScore: 20,
        studentId: 's2',
        student: { id: 's2', user: { lastName: 'Kouassi', firstName: 'Jean' } },
      },
      {
        id: '3',
        title: 'Devoir maison',
        evaluationType: 'CLASS_HOMEWORK',
        courseId: 'c1',
        course: { id: 'c1', name: 'Maths' },
        date: '2026-03-12T10:00:00.000Z',
        score: 16,
        maxScore: 20,
        studentId: 's1',
        student: { id: 's1', user: { lastName: 'Bamba', firstName: 'Aya' } },
      },
    ];

    const groups = groupGradesByEvaluation(grades);
    assert.equal(groups.length, 2);

    const interro = groups.find((g) => g.title === 'Interro n°1');
    assert.ok(interro);
    assert.equal(interro!.grades.length, 2);
    assert.equal(interro!.averageOn20, 13);
    assert.equal(interro!.evaluationLabel, 'Évaluation');

    const devoir = groups.find((g) => g.title === 'Devoir maison');
    assert.ok(devoir);
    assert.equal(devoir!.grades.length, 1);
  });

  it('sépare deux évaluations de même titre à des dates différentes', () => {
    const a = {
      id: '1',
      title: 'Quiz',
      evaluationType: 'EVALUATION',
      courseId: 'c1',
      date: '2026-01-01T00:00:00.000Z',
    };
    const b = {
      id: '2',
      title: 'Quiz',
      evaluationType: 'EVALUATION',
      courseId: 'c1',
      date: '2026-02-01T00:00:00.000Z',
    };
    assert.notEqual(gradeEvaluationGroupKey(a), gradeEvaluationGroupKey(b));
  });

  it('regroupe toutes les évaluations d’un élève au même endroit', () => {
    const grades = [
      {
        id: '1',
        title: 'Interro n°1',
        evaluationType: 'EVALUATION',
        courseId: 'c1',
        course: { id: 'c1', name: 'Maths' },
        date: '2026-03-10T10:00:00.000Z',
        score: 14,
        maxScore: 20,
        studentId: 's1',
        student: {
          id: 's1',
          user: { lastName: 'Bamba', firstName: 'Aya' },
          class: { id: 'cl1', name: '6ème A' },
        },
      },
      {
        id: '2',
        title: 'Devoir maison',
        evaluationType: 'CLASS_HOMEWORK',
        courseId: 'c2',
        course: { id: 'c2', name: 'Français' },
        date: '2026-03-12T10:00:00.000Z',
        score: 16,
        maxScore: 20,
        studentId: 's1',
        student: {
          id: 's1',
          user: { lastName: 'Bamba', firstName: 'Aya' },
          class: { id: 'cl1', name: '6ème A' },
        },
      },
      {
        id: '3',
        title: 'Interro n°1',
        evaluationType: 'EVALUATION',
        courseId: 'c1',
        course: { id: 'c1', name: 'Maths' },
        date: '2026-03-10T10:00:00.000Z',
        score: 10,
        maxScore: 20,
        studentId: 's2',
        student: {
          id: 's2',
          user: { lastName: 'Kouassi', firstName: 'Jean' },
          class: { id: 'cl1', name: '6ème A' },
        },
      },
    ];

    const byStudent = groupGradesByStudent(grades);
    assert.equal(byStudent.length, 2);

    const aya = byStudent.find((s) => s.studentId === 's1');
    assert.ok(aya);
    assert.equal(aya!.fullName, 'Aya Bamba');
    assert.equal(aya!.grades.length, 2);
    assert.equal(aya!.byCourse.length, 2);
    assert.equal(aya!.averageOn20, 15);
  });
});
