'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/services/api';
import api from '@/services/api/client';
import { useAuth } from '@/contexts/AuthContext';
import { isOffline } from '@/lib/offline-api';

export type SchoolSummary = {
  id: string;
  name: string;
  slug: string;
  shortName?: string | null;
  isDefault?: boolean;
};

type SchoolContextValue = {
  schools: SchoolSummary[];
  activeSchool: SchoolSummary | null;
  activeSchoolId: string | null;
  /** Établissement résolu et valide — les listes peuvent charger. */
  schoolReady: boolean;
  setActiveSchoolId: (id: string) => Promise<void>;
  isLoading: boolean;
  isMultiSchool: boolean;
};

const SchoolContext = createContext<SchoolContextValue | null>(null);

const STORAGE_KEY = 'activeSchoolId';

function readStoredSchoolId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

/** Préfixes de cache métier à invalider lors d’un changement d’établissement. */
const SCHOOL_SCOPED_QUERY_ROOTS = new Set([
  'students',
  'teachers',
  'classes',
  'admin-students',
  'admin-classes',
  'admin-dashboard',
  'admin-dashboard-kpis',
  'admin-tuition-fees',
  'admin-tuition-fees-grouped',
  'admin-parents',
  'admin-courses',
  'admin-schedules',
  'admin-grades',
  'admin-absences',
  'admin-payments',
  'admin-notifications',
  'staff-workspace',
  'staff-admissions',
]);

/** Invalide le cache métier lié à l’établissement (évite une cascade globale). */
function invalidateSchoolScopedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const root = query.queryKey[0];
      return typeof root === 'string' && SCHOOL_SCOPED_QUERY_ROOTS.has(root);
    },
  });
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [activeSchoolId, setActiveSchoolIdState] = useState<string | null>(readStoredSchoolId);
  const lastResolvedSchoolRef = useRef<string | null>(null);

  const enabled =
    !!token &&
    !!user &&
    (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'STAFF');

  const { data: schools = [], isLoading } = useQuery({
    queryKey: ['schools', user?.role],
    queryFn: async () => {
      if (user?.role === 'STAFF') {
        const response = await api.get('/staff/schools');
        return response.data as SchoolSummary[];
      }
      return adminApi.listSchools() as Promise<SchoolSummary[]>;
    },
    enabled,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!enabled || schools.length === 0) return;

    const stored = readStoredSchoolId();
    const valid = stored && schools.some((s) => s.id === stored);
    const next = valid ? stored! : schools.find((s) => s.isDefault)?.id ?? schools[0].id;

    if (lastResolvedSchoolRef.current !== next) {
      const schoolChanged = lastResolvedSchoolRef.current != null && lastResolvedSchoolRef.current !== next;
      lastResolvedSchoolRef.current = next;
      localStorage.setItem(STORAGE_KEY, next);
      setActiveSchoolIdState(next);
      // Premier resolve : pas d’invalidation globale (les listes partent déjà avec le bon header).
      if (schoolChanged) {
        invalidateSchoolScopedQueries(queryClient);
      }
    }
  }, [enabled, schools, queryClient]);

  const setActiveSchoolId = useCallback(
    async (id: string) => {
      if (!schools.some((s) => s.id === id)) return;
      localStorage.setItem(STORAGE_KEY, id);
      lastResolvedSchoolRef.current = id;
      setActiveSchoolIdState(id);
      try {
        if (user?.role === 'STAFF') {
          await api.put('/staff/schools/active', { schoolId: id });
        } else {
          await adminApi.setActiveSchool(id);
        }
      } catch {
        /* préférence locale conservée */
      }
      invalidateSchoolScopedQueries(queryClient);
    },
    [schools, queryClient, user?.role]
  );

  const activeSchool = useMemo(() => {
    const found = schools.find((s) => s.id === activeSchoolId);
    if (found) return found;
    if (activeSchoolId && isOffline()) {
      return {
        id: activeSchoolId,
        name: 'Établissement (hors ligne)',
        slug: 'offline',
      } satisfies SchoolSummary;
    }
    return null;
  }, [schools, activeSchoolId]);

  const schoolReady =
    !enabled ||
    (isOffline() && !!activeSchoolId) ||
    (enabled &&
      !!activeSchoolId &&
      (schools.length === 0 || schools.some((s) => s.id === activeSchoolId)));

  const value = useMemo<SchoolContextValue>(
    () => ({
      schools,
      activeSchool,
      activeSchoolId,
      schoolReady,
      setActiveSchoolId,
      isLoading: enabled && isLoading,
      isMultiSchool: schools.length > 1,
    }),
    [schools, activeSchool, activeSchoolId, schoolReady, setActiveSchoolId, isLoading, enabled]
  );

  if (!enabled) {
    return <>{children}</>;
  }

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
}

export function useSchool() {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    return {
      schools: [] as SchoolSummary[],
      activeSchool: null,
      activeSchoolId: null,
      schoolReady: true,
      setActiveSchoolId: async () => {},
      isLoading: false,
      isMultiSchool: false,
    };
  }
  return ctx;
}
