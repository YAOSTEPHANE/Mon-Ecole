import prisma from './prisma';

const DEFAULT_WAITLIST_DAYS = 30;

/**
 * Passe en REJECTED les dossiers WAITLIST plus anciens que `maxAgeDays`
 * (basé sur updatedAt).
 */
export async function expireStaleWaitlistAdmissions(opts?: {
  maxAgeDays?: number;
  schoolId?: string;
}): Promise<{ expired: number; maxAgeDays: number }> {
  const maxAgeDays = opts?.maxAgeDays ?? DEFAULT_WAITLIST_DAYS;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const stale = await prisma.admission.findMany({
    where: {
      status: 'WAITLIST',
      updatedAt: { lt: cutoff },
      ...(opts?.schoolId ? { schoolId: opts.schoolId } : {}),
    },
    select: { id: true },
    take: 500,
  });

  let expired = 0;
  for (const row of stale) {
    await prisma.admission.update({
      where: { id: row.id },
      data: {
        status: 'REJECTED',
        reviewedAt: new Date(),
        adminNotes: `Liste d’attente expirée automatiquement après ${maxAgeDays} jour(s) sans suite.`,
      },
    });
    expired += 1;
  }

  return { expired, maxAgeDays };
}
