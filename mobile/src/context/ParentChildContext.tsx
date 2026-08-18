import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { parentApi, type ParentChild } from '../api/parent';
import { useAuth } from './AuthContext';
import { normalizeRole } from '../lib/roles';

type ParentChildContextValue = {
  childrenList: ParentChild[];
  selectedId: string | null;
  selectedChild: ParentChild | null;
  loading: boolean;
  setSelectedId: (id: string) => void;
  reload: () => Promise<void>;
};

const ParentChildContext = createContext<ParentChildContextValue | null>(null);

export function ParentChildProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isParent = normalizeRole(user?.role ?? '') === 'PARENT';
  const [childrenList, setChildrenList] = useState<ParentChild[]>([]);
  const [selectedId, setSelectedIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!isParent) {
      setChildrenList([]);
      setSelectedIdState(null);
      return;
    }
    setLoading(true);
    try {
      const list = await parentApi.getChildren();
      setChildrenList(list);
      setSelectedIdState((prev) => {
        if (prev && list.some((c) => c.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch {
      setChildrenList([]);
    } finally {
      setLoading(false);
    }
  }, [isParent]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const selectedChild = useMemo(
    () => childrenList.find((c) => c.id === selectedId) ?? null,
    [childrenList, selectedId],
  );

  const setSelectedId = useCallback((id: string) => {
    setSelectedIdState(id);
  }, []);

  const value = useMemo(
    () => ({
      childrenList,
      selectedId,
      selectedChild,
      loading,
      setSelectedId,
      reload,
    }),
    [childrenList, selectedId, selectedChild, loading, setSelectedId, reload],
  );

  return <ParentChildContext.Provider value={value}>{children}</ParentChildContext.Provider>;
}

export function useParentChild(): ParentChildContextValue {
  const ctx = useContext(ParentChildContext);
  if (!ctx) {
    return {
      childrenList: [],
      selectedId: null,
      selectedChild: null,
      loading: false,
      setSelectedId: () => undefined,
      reload: async () => undefined,
    };
  }
  return ctx;
}

export function childDisplayName(child: ParentChild | null | undefined): string {
  if (!child) return 'Enfant';
  return `${child.user?.firstName ?? ''} ${child.user?.lastName ?? ''}`.trim() || 'Enfant';
}
