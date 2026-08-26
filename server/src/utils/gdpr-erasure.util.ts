/**
 * Effacement / anonymisation RGPD d’un compte utilisateur (conservation scolaire minimale).
 */
import crypto from 'crypto';
import prisma from './prisma';
import { bumpUserTokenVersion } from './session-invalidation.util';

export class GdprErasureError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = 'GdprErasureError';
    this.status = status;
  }
}

function anonEmail(userId: string): string {
  const hash = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
  return `efface.${hash}@anonyme.invalid`;
}

/**
 * Anonymise le compte et les profils liés. Refuse ADMIN / SUPER_ADMIN.
 * Conserve les notes / absences / paiements (obligation scolaire) sans PII utilisateur.
 */
export async function executeGdprErasure(userId: string): Promise<{ userId: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      studentProfile: true,
      parentProfile: true,
    },
  });
  if (!user) throw new GdprErasureError('Utilisateur introuvable', 404);
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    throw new GdprErasureError(
      'Les comptes administrateurs ne peuvent pas être effacés via cette procédure.',
      403,
    );
  }

  const email = anonEmail(userId);
  const placeholderName = 'Anonymisé';

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        email,
        firstName: placeholderName,
        lastName: 'RGPD',
        phone: null,
        avatar: null,
        isActive: false,
        oauthProvider: null,
        oauthSubject: null,
        oauthKey: null,
        uiPreferences: undefined,
      },
    });

    if (user.studentProfile) {
      await tx.student.update({
        where: { id: user.studentProfile.id },
        data: {
          address: null,
          emergencyContact: null,
          emergencyPhone: null,
          medicalInfo: null,
          nfcId: null,
          biometricId: null,
          faceDescriptor: undefined,
          isActive: false,
        },
      });
    }

    if (user.parentProfile) {
      await tx.parent.update({
        where: { id: user.parentProfile.id },
        data: {
          profession: null,
          internalNotes: null,
          notifyEmail: false,
          notifySms: false,
          notifyWhatsApp: false,
        },
      });
    }

    await tx.userTwoFactorSettings.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
  });

  await bumpUserTokenVersion(userId);

  await prisma.securityEvent.create({
    data: {
      userId,
      type: 'gdpr_erasure_executed',
      description: `Effacement RGPD exécuté (compte anonymisé → ${email})`,
      severity: 'warning',
    },
  });

  return { userId };
}
