/** Domaine technique des comptes élève sans e-mail réel (aligné serveur). */
export const STUDENT_LOCAL_EMAIL_DOMAIN = 'eleve.local';

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

/** Affiche l’identifiant de connexion (matricule) plutôt que l’e-mail technique. */
export function displayStudentLoginIdentifier(params: {
  email?: string | null;
  studentId?: string | null;
  nationalMatricule?: string | null;
}): string {
  const email = params.email?.trim() ?? '';
  if (email && !isSyntheticStudentEmail(email)) return email;
  const matricule = params.nationalMatricule?.trim();
  if (matricule) return matricule;
  const studentId = params.studentId?.trim();
  if (studentId) return studentId;
  return email || '—';
}
