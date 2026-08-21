import type { Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'sm_session';
/** Indicateur lisible côté JS (non HttpOnly) pour éviter un GET /auth/me inutile. */
export const AUTH_SESSION_HINT_COOKIE = 'sm_has_session';

/** Durée cookie alignée sur JWT (défaut 12 h). */
export function authCookieMaxAgeMs(): number {
  const raw = (process.env.JWT_EXPIRES_IN ?? '12h').trim().toLowerCase();
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 12 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = match[2];
  const mult =
    unit === 's' ? 1000 : unit === 'm' ? 60_000 : unit === 'h' ? 3_600_000 : 86_400_000;
  return n * mult;
}

function cookieSameSite(): 'Strict' | 'Lax' | 'None' {
  const raw = (process.env.AUTH_COOKIE_SAMESITE ?? 'lax').trim().toLowerCase();
  if (raw === 'none') return 'None';
  if (raw === 'strict') return 'Strict';
  return 'Lax';
}

/** Doit être identique à la pose du cookie, sinon le navigateur refuse de l’effacer. */
function cookieSecure(sameSite: 'Strict' | 'Lax' | 'None'): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    sameSite === 'None' ||
    process.env.AUTH_COOKIE_SECURE === '1'
  );
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

/** Bearer en priorité, sinon cookie HttpOnly `sm_session`. */
export function extractAccessToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const bearer = header.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  const fromCookie = cookies[AUTH_COOKIE_NAME]?.trim();
  return fromCookie || undefined;
}

function appendCookie(
  res: Response,
  name: string,
  value: string,
  opts: { httpOnly: boolean; maxAge: number; sameSite: 'Strict' | 'Lax' | 'None'; secure: boolean },
): void {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
  ];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function setAuthSessionCookie(res: Response, token: string): void {
  const sameSite = cookieSameSite();
  const secure = cookieSecure(sameSite);
  const maxAge = Math.floor(authCookieMaxAgeMs() / 1000);
  appendCookie(res, AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    maxAge,
    sameSite,
    secure,
  });
  appendCookie(res, AUTH_SESSION_HINT_COOKIE, '1', {
    httpOnly: false,
    maxAge,
    sameSite,
    secure,
  });
}

export function clearAuthSessionCookie(res: Response): void {
  const sameSite = cookieSameSite();
  const secure = cookieSecure(sameSite);
  appendCookie(res, AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    sameSite,
    secure,
  });
  appendCookie(res, AUTH_SESSION_HINT_COOKIE, '', {
    httpOnly: false,
    maxAge: 0,
    sameSite,
    secure,
  });
}
