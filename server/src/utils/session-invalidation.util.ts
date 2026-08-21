import prisma from './prisma';

/**
 * Invalide toutes les sessions JWT d’un utilisateur en incrémentant tokenVersion.
 * Le middleware authenticate refuse tout token dont tokenVersion ≠ valeur DB.
 */
export async function bumpUserTokenVersion(userId: string): Promise<number> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
    select: { tokenVersion: true },
  });
  return updated.tokenVersion;
}
