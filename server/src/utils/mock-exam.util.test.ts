import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canonicalExamLevel,
  defaultExamKindForLevel,
  isExamClassLevel,
  studentMatchesMockExamTarget,
} from './exam-class.util';
import { gradeMockExamAnswers } from './mock-exam.util';

describe('exam-class', () => {
  it('détecte 3ème et Terminale', () => {
    assert.equal(isExamClassLevel('3ème'), true);
    assert.equal(isExamClassLevel('Terminale'), true);
    assert.equal(isExamClassLevel('Tle'), true);
    assert.equal(isExamClassLevel('6ème'), false);
    assert.equal(canonicalExamLevel('3eme'), '3ème');
    assert.equal(defaultExamKindForLevel('3ème'), 'BEPC');
    assert.equal(defaultExamKindForLevel('Terminale'), 'BAC');
  });

  it('filtre par niveau ou classe', () => {
    assert.equal(
      studentMatchesMockExamTarget({
        studentClassId: 'c1',
        studentLevel: '3ème',
        examClassId: 'c1',
        examTargetLevels: [],
      }),
      true
    );
    assert.equal(
      studentMatchesMockExamTarget({
        studentClassId: 'c1',
        studentLevel: '3ème',
        examClassId: null,
        examTargetLevels: ['3ème'],
      }),
      true
    );
    assert.equal(
      studentMatchesMockExamTarget({
        studentClassId: 'c1',
        studentLevel: '3ème',
        examClassId: null,
        examTargetLevels: ['Terminale'],
      }),
      false
    );
  });
});

describe('gradeMockExamAnswers', () => {
  it('calcule un score /20', () => {
    const result = gradeMockExamAnswers(
      [
        { id: 'q1', kind: 'MCQ', correctAnswer: 'A', points: 1 },
        { id: 'q2', kind: 'MCQ', correctAnswer: 'B', points: 1 },
      ],
      { q1: 'A', q2: 'C' }
    );
    assert.equal(result.score, 1);
    assert.equal(result.maxScore, 2);
    assert.equal(result.scoreOn20, 10);
  });
});
