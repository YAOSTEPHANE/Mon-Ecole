import { useSchool } from '@/contexts/SchoolContext';

/**
 * true lorsque l’établissement actif peut servir de scope aux requêtes admin/staff.
 * Si un `activeSchoolId` est déjà en cache (localStorage), on n’attend pas la fin
 * du chargement de la liste des écoles — le header API l’utilise déjà.
 */
export function useSchoolReady(): boolean {
  const { activeSchoolId, schools } = useSchool();
  if (!activeSchoolId) return false;
  if (schools.length === 0) return true;
  return schools.some((s) => s.id === activeSchoolId);
}

/** Clé React Query incluant l’établissement (évite le cache d’un autre collège). */
export function schoolQueryKey(base: readonly unknown[], activeSchoolId: string | null): unknown[] {
  return [...base, activeSchoolId ?? 'pending'];
}
