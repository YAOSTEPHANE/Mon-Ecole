/** Jeton d’accès en mémoire uniquement (pas localStorage) — le cookie HttpOnly assure la persistance. */

type WindowWithToken = Window & { __smAccessToken?: string };

export function setMemoryAccessToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  const w = window as WindowWithToken;
  if (token) w.__smAccessToken = token;
  else delete w.__smAccessToken;
  try {
    localStorage.removeItem('token');
  } catch {
    /* ignore */
  }
}

export function getMemoryAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (window as WindowWithToken).__smAccessToken || null;
}
