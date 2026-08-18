import { useEffect, useState } from 'react';
import { staffApi, type StaffWorkspace } from '../api/staff';

export function useStaffWorkspace(enabled: boolean) {
  const [workspace, setWorkspace] = useState<StaffWorkspace | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setWorkspace(null);
      setLoading(false);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        setWorkspace(await staffApi.getWorkspace());
      } catch {
        setWorkspace(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  const hasModule = (moduleId: string) =>
    workspace?.visibleModules?.includes(moduleId) ?? false;

  return { workspace, loading, hasModule };
}
