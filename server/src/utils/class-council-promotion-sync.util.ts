import prisma from './prisma';
import { getPeriodLabel } from './report-card.util';

function parseCouncilDecision(raw: unknown): 'ADMIS' | 'DOUBLANT' | null {
  if (raw == null) return null;
  const s = String(raw)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (!s) return null;
  if (
    s.includes('ADMIS') ||
    s.includes('PASSAGE') ||
    s === 'P' ||
    s.includes('PROMOU') ||
    s.includes('REUSS')
  ) {
    return 'ADMIS';
  }
  if (
    s.includes('DOUBL') ||
    s.includes('REDOUBL') ||
    s.includes('MAINTIEN') ||
    s === 'R'
  ) {
    return 'DOUBLANT';
  }
  return null;
}

/**
 * À la finalisation d’un conseil de classe, synchronise les avis
 * `councilDecision` vers `StudentPromotionDecision` (+ isRepeating).
 */
export async function syncPromotionDecisionsFromClassCouncil(
  councilId: string,
  declaredById?: string | null,
): Promise<{ synced: number; skipped: number }> {
  const council = await prisma.classCouncilSession.findUnique({
    where: { id: councilId },
    select: {
      id: true,
      classId: true,
      period: true,
      academicYear: true,
      studentOpinions: true,
    },
  });
  if (!council) {
    throw Object.assign(new Error('Conseil de classe introuvable'), { statusCode: 404 });
  }

  const opinions = Array.isArray(council.studentOpinions) ? council.studentOpinions : [];
  let synced = 0;
  let skipped = 0;

  for (const raw of opinions) {
    if (!raw || typeof raw !== 'object') {
      skipped += 1;
      continue;
    }
    const row = raw as Record<string, unknown>;
    const studentId = typeof row.studentId === 'string' ? row.studentId : '';
    if (!studentId) {
      skipped += 1;
      continue;
    }
    const decision = parseCouncilDecision(row.councilDecision);
    if (!decision) {
      skipped += 1;
      continue;
    }
    const average =
      row.average != null && Number.isFinite(Number(row.average)) ? Number(row.average) : 0;

    await prisma.studentPromotionDecision.upsert({
      where: {
        studentId_academicYear_period: {
          studentId,
          academicYear: council.academicYear,
          period: council.period,
        },
      },
      create: {
        studentId,
        classId: council.classId,
        academicYear: council.academicYear,
        period: council.period,
        average,
        decision,
        threshold: 10,
        declaredById: declaredById ?? null,
        notes: `Synchronisé depuis le conseil de classe (${getPeriodLabel(council.period)})`,
      },
      update: {
        classId: council.classId,
        average,
        decision,
        declaredById: declaredById ?? null,
        declaredAt: new Date(),
        notes: `Synchronisé depuis le conseil de classe (${getPeriodLabel(council.period)})`,
      },
    });

    await prisma.student.update({
      where: { id: studentId },
      data: { isRepeating: decision === 'DOUBLANT' },
    });
    synced += 1;
  }

  return { synced, skipped };
}
