import type { Prisma } from '@prisma/client';
import prisma from './prisma';

export async function awardGamificationPoints(opts: {
  studentId: string;
  kind: 'GRADE' | 'ASSIGNMENT' | 'ATTENDANCE' | 'BADGE';
  points: number;
  label: string;
  badgeCode?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.studentGamificationEvent.create({
    data: {
      studentId: opts.studentId,
      kind: opts.kind,
      points: opts.points,
      label: opts.label,
      badgeCode: opts.badgeCode ?? null,
      metadata: (opts.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function getStudentGamificationSummary(studentId: string) {
  const events = await prisma.studentGamificationEvent.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const totalPoints = events.reduce((s, e) => s + e.points, 0);
  const badges = [
    ...new Set(events.filter((e) => e.badgeCode).map((e) => e.badgeCode as string)),
  ];
  return { totalPoints, badges, recent: events.slice(0, 20) };
}
