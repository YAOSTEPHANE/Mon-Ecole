import type { Prisma } from '@prisma/client';
import prisma from './prisma';

/** Domaine technique pour les comptes élève sans adresse e-mail réelle. */
export const STUDENT_LOCAL_EMAIL_DOMAIN = 'eleve.local';

const userLoginInclude = {
  teacherProfile: true,
  studentProfile: true,
  parentProfile: true,
  educatorProfile: true,
  staffProfile: true,
} satisfies Prisma.UserInclude;

export type UserWithLoginProfiles = Prisma.UserGetPayload<{
  include: typeof userLoginInclude;
}>;

export function isSyntheticStudentEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${STUDENT_LOCAL_EMAIL_DOMAIN}`);
}

export function isRealEmailAddress(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed.includes('@')) return false;
  if (isSyntheticStudentEmail(trimmed)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

/** Normalise un matricule / n° élève pour l’e-mail technique. */
export function normalizeMatriculeForLogin(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._+-]/g, '')
    .slice(0, 64);
}

/**
 * Construit l’identifiant e-mail technique à partir du n° élève ou du matricule FNE.
 * Ex. `STUAB12` → `stuab12@eleve.local`
 */
export function buildStudentLoginEmailFromMatricule(matricule: string): string {
  const local = normalizeMatriculeForLogin(matricule);
  if (!local) {
    throw new Error('Matricule / numéro d’élève invalide pour créer l’identifiant de connexion');
  }
  return `${local}@${STUDENT_LOCAL_EMAIL_DOMAIN}`;
}

export function resolveStudentAccountEmail(input: {
  email?: string | null;
  studentId: string;
  nationalMatricule?: string | null;
}): { email: string; usesMatriculeLogin: boolean } {
  const rawEmail = typeof input.email === 'string' ? input.email.trim() : '';
  if (rawEmail) {
    if (!isRealEmailAddress(rawEmail) && !isSyntheticStudentEmail(rawEmail)) {
      throw new Error('Adresse e-mail invalide');
    }
    return {
      email: rawEmail.toLowerCase(),
      usesMatriculeLogin: isSyntheticStudentEmail(rawEmail),
    };
  }

  const matriculeSource =
    (typeof input.nationalMatricule === 'string' && input.nationalMatricule.trim()
      ? input.nationalMatricule.trim()
      : null) || input.studentId;

  return {
    email: buildStudentLoginEmailFromMatricule(matriculeSource),
    usesMatriculeLogin: true,
  };
}

/**
 * Résout un compte à partir d’un e-mail, d’un n° élève ou d’un matricule FNE.
 */
export async function findUserByLoginIdentifier(
  rawIdentifier: string,
): Promise<UserWithLoginProfiles | null> {
  const identifier = rawIdentifier.trim();
  if (!identifier) return null;

  const emailCandidate = identifier.toLowerCase();

  const byEmail = await prisma.user.findUnique({
    where: { email: emailCandidate },
    include: userLoginInclude,
  });
  if (byEmail) return byEmail;

  // Identifiant sans @ → n° élève ou matricule FNE (variantes de casse)
  if (!identifier.includes('@')) {
    const variants = Array.from(
      new Set([identifier, identifier.toUpperCase(), identifier.toLowerCase()]),
    );
    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId: { in: variants } },
          { nationalMatricule: { in: variants } },
        ],
      },
      select: { userId: true },
    });
    if (student) {
      return prisma.user.findUnique({
        where: { id: student.userId },
        include: userLoginInclude,
      });
    }
  }

  return null;
}
