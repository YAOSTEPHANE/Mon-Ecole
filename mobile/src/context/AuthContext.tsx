import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi, type User } from '../api/auth';
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from '../lib/session';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, twoFactorCode?: string) => Promise<User>;
  acceptSession: (sessionToken: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const stored = await getStoredToken();
        if (!stored) {
          setLoading(false);
          return;
        }
        setToken(stored);
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        await clearStoredToken();
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(
    async (email: string, password: string, twoFactorCode?: string) => {
      const res = await authApi.login(email, password, twoFactorCode);
      await setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    },
    [],
  );

  const acceptSession = useCallback(async (sessionToken: string) => {
    const trimmed = sessionToken.trim();
    if (!trimmed) throw new Error('Jeton manquant');
    await setStoredToken(trimmed);
    setToken(trimmed);
    const me = await authApi.getMe();
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await clearStoredToken();
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authApi.getMe();
    setUser(me);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, acceptSession, logout, refreshUser }),
    [user, token, loading, login, acceptSession, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
