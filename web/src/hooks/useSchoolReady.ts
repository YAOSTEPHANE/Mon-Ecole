import { useSchool } from '@/contexts/SchoolContext';

/**
 * true lorsque l’établissement actif peut servir de scope aux requêtes admin/staff.
 * Aligné sur SchoolContext (session cookie sans jeton mémoire).
 */
export function useSchoolReady(): boolean {
  return useSchool().schoolReady;
}

/** Clé React Query incluant l’établissement (évite le cache d’un autre collège). */
export function schoolQueryKey(base: readonly unknown[], activeSchoolId: string | null): unknown[] {
  return [...base, activeSchoolId ?? 'pending'];
}
