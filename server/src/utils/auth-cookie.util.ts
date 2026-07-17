import type { Request, Response } from 'express';

export const AUTH_COOKIE_NAME = 'sm_session';

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

export function setAuthSessionCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const sameSite = cookieSameSite();
  const secure = isProd || sameSite === 'None' || process.env.AUTH_COOKIE_SECURE === '1';
  const maxAge = Math.floor(authCookieMaxAgeMs() / 1000);
  const parts = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}

export function clearAuthSessionCookie(res: Response): void {
  const sameSite = cookieSameSite();
  const secure = process.env.NODE_ENV === 'production' || sameSite === 'None';
  const parts = [
    `${AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
