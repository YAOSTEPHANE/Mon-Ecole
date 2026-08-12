import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { overlaps } from './timetable-constraints.util';
import { buildClassCouncilMinutesHtml, buildPayslipHtml } from './html-document.util';

describe('timetable overlaps', () => {
  it('détecte un chevauchement partiel', () => {
    assert.equal(overlaps('08:00', '09:00', '08:30', '09:30'), true);
  });

  it('accepte des créneaux adjacents sans chevauchement', () => {
    assert.equal(overlaps('08:00', '09:00', '09:00', '10:00'), false);
  });

  it('détecte un créneau entièrement inclus', () => {
    assert.equal(overlaps('08:00', '10:00', '08:30', '09:00'), true);
  });
});

describe('html-document.util', () => {
  it('génère un PV de conseil de classe HTML', () => {
    const html = buildClassCouncilMinutesHtml({
      schoolName: 'École Test',
      className: '6ème A',
      classLevel: '6ème',
      period: 'Trimestre 1',
      academicYear: '2025-2026',
      meetingDate: new Date('2026-01-15T10:00:00Z'),
      title: 'Conseil T1',
      summary: 'Classe sérieuse',
      decisions: 'Encouragements',
      recommendations: 'Continuer',
      studentOpinions: [
        {
          studentName: 'Jean Dupont',
          average: 12.5,
          subjectOpinion: 'Bon travail',
          conductOpinion: 'Correcte',
          councilDecision: 'Encouragements',
        },
      ],
    });
    assert.match(html, /Procès-verbal de conseil de classe/);
    assert.match(html, /6ème A/);
    assert.match(html, /Jean Dupont/);
    assert.match(html, /12\.50/);
    assert.match(html, /Encouragements/);
  });

  it('échappe le HTML dans le PV', () => {
    const html = buildClassCouncilMinutesHtml({
      className: '6ème <script>',
      period: 'T1',
      academicYear: '2025-2026',
      meetingDate: new Date('2026-01-15'),
      summary: '<b>x</b>',
    });
    assert.doesNotMatch(html, /<script>/);
    assert.match(html, /&lt;script&gt;/);
    assert.match(html, /&lt;b&gt;x&lt;\/b&gt;/);
  });

  it('génère un bulletin de paie HTML', () => {
    const html = buildPayslipHtml({
      schoolName: 'École Test',
      employeeName: 'Marie Martin',
      employeeId: 'EMP-001',
      personKind: 'TEACHER',
      year: 2026,
      month: 3,
      monthLabel: 'Mars 2026',
      baseSalary: 250000,
      bonuses: 10000,
      deductions: 5000,
      netPay: 255000,
      notes: 'Prime assiduité',
    });
    assert.match(html, /Bulletin de paie/);
    assert.match(html, /Marie Martin/);
    assert.match(html, /EMP-001/);
    assert.match(html, /255[\s\u00a0]?000/);
    assert.match(html, /Prime assiduité/);
  });
});
