/** Jeton d’accès en mémoire uniquement (pas localStorage) — le cookie HttpOnly assure la persistance. */

type WindowWithToken = Window & { __smAccessToken?: string };

const SESSION_HINT_COOKIE = 'sm_has_session';

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

/** Cookie non-HttpOnly posé avec la session — indique qu’un probe /auth/me a un sens. */
export function hasAuthSessionHint(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    return document.cookie.split(';').some((part) => {
      const [k, ...rest] = part.trim().split('=');
      return k === SESSION_HINT_COOKIE && rest.join('=') === '1';
    });
  } catch {
    return false;
  }
}

/** True s’il y a une chance d’avoir une session (évite un 401 bruyant au chargement public). */
export function mayHaveAuthSession(): boolean {
  if (typeof window === 'undefined') return false;
  if (getMemoryAccessToken()) return true;
  if (hasAuthSessionHint()) return true;
  try {
    if (localStorage.getItem('token')) return true;
  } catch {
    /* ignore */
  }
  return false;
}
