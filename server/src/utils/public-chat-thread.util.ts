import prisma from './prisma';

export async function findOrCreateOpenPublicChatThread(params: {
  publicVisitorId: string;
  schoolId: string;
}): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.publicChatThread.findFirst({
    where: {
      publicVisitorId: params.publicVisitorId,
      schoolId: params.schoolId,
    },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, status: true },
  });
  if (existing) {
    if (existing.status !== 'OPEN') {
      await prisma.publicChatThread.update({
        where: { id: existing.id },
        data: { status: 'OPEN', updatedAt: new Date() },
      });
    }
    return { id: existing.id, created: false };
  }

  const thread = await prisma.publicChatThread.create({
    data: {
      publicVisitorId: params.publicVisitorId,
      schoolId: params.schoolId,
      status: 'OPEN',
    },
    select: { id: true },
  });
  return { id: thread.id, created: true };
}

export function formatOrientationChatNotice(criteria: Record<string, unknown>): string {
  const level = String(criteria.currentLevel ?? '').trim() || 'non précisé';
  const intentRaw = String(criteria.intent ?? '').trim();
  const intent =
    intentRaw === 'pre_inscription'
      ? 'pré-inscription'
      : intentRaw === 'orientation'
        ? 'orientation / parcours'
        : intentRaw === 'info'
          ? 'informations générales'
          : intentRaw || 'non précisée';
  const interests = Array.isArray(criteria.interests)
    ? (criteria.interests as unknown[]).map((x) => String(x)).filter(Boolean)
    : [];
  const interestLine = interests.length > 0 ? `\nCentres d’intérêt : ${interests.join(', ')}` : '';
  return `Demande d’orientation (widget site)\nNiveau : ${level}\nDemande : ${intent}${interestLine}`;
}
