import prisma from './prisma';

/**
 * Invalide toutes les sessions JWT d’un utilisateur en incrémentant tokenVersion.
 * Le middleware authenticate refuse tout token dont tokenVersion ≠ valeur DB.
 *
 * Note MongoDB/Prisma : `{ increment: 1 }` peut ne pas persister sur Int — on lit puis on set.
 */
export async function bumpUserTokenVersion(userId: string): Promise<number> {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  if (!current) {
    throw new Error('Utilisateur introuvable pour invalidation de session');
  }
  const next = (current.tokenVersion ?? 0) + 1;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: next },
    select: { tokenVersion: true },
  });
  return updated.tokenVersion;
}
