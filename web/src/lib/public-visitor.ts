const COOKIE_NAME = 'visitor_id';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const v = `; ${document.cookie}`;
  const parts = v.split(`; ${name}=`);
  if (parts.length < 2) return null;
  const value = parts.pop();
  if (!value) return null;
  return decodeURIComponent(value.split(';').shift() || '').trim() || null;
}

function setCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const secure = window.location.protocol === 'https:';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${ONE_YEAR_SECONDS}`,
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  document.cookie = parts.join('; ');
}

function createVisitorId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  // Fallback simple
  return `v_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

/** Garantit un identifiant visiteur anonyme côté navigateur (cookie). */
export function ensurePublicVisitorId(): string {
  const existing = getCookie(COOKIE_NAME);
  if (existing) return existing;
  const id = createVisitorId();
  setCookie(COOKIE_NAME, id);
  return id;
}

export function getPublicVisitorId(): string | null {
  return getCookie(COOKIE_NAME);
}

