import type { Request, Response, NextFunction } from 'express';
import { getAllowedCorsOrigins } from '../utils/cors-origins.util';
import { AUTH_COOKIE_NAME } from '../utils/auth-cookie.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function hasBearerAuth(req: Request): boolean {
  const header = req.headers.authorization;
  return Boolean(header?.startsWith('Bearer ') && header.slice(7).trim());
}

function hasSessionCookie(req: Request): boolean {
  const raw = req.headers.cookie;
  if (!raw) return false;
  return raw.split(';').some((part) => {
    const [k] = part.trim().split('=');
    return k === AUTH_COOKIE_NAME;
  });
}

function originFromReferer(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function isAllowedOrigin(origin: string | null, allowed: Set<string>): boolean {
  if (!origin) return false;
  return allowed.has(origin);
}

function isExemptPath(req: Request): boolean {
  const url = `${req.originalUrl || ''}${req.path || ''}`.toLowerCase();
  return (
    url.includes('/webhooks/') ||
    url.includes('/payments/webhooks') ||
    url.includes('/nfc/') ||
    url.includes('/face/') ||
    url.includes('/mena-presence/webhook') ||
    url.endsWith('/health') ||
    url.includes('/health/')
  );
}

/**
 * Protection CSRF pour les sessions cookie HttpOnly :
 * les mutations authentifiées par cookie doivent provenir d’une origine CORS autorisée.
 * Les clients Bearer (mobile / API) sont exemptés.
 */
export function csrfOriginGuard(req: Request, res: Response, next: NextFunction): void {
  const method = (req.method || 'GET').toUpperCase();
  if (SAFE_METHODS.has(method) || isExemptPath(req)) {
    next();
    return;
  }

  if (hasBearerAuth(req) || !hasSessionCookie(req)) {
    next();
    return;
  }

  const allowed = new Set(getAllowedCorsOrigins());
  const originHeader = req.get('Origin')?.trim() || null;
  const refererOrigin = originFromReferer(req.get('Referer'));

  if (isAllowedOrigin(originHeader, allowed) || isAllowedOrigin(refererOrigin, allowed)) {
    next();
    return;
  }

  res.status(403).json({
    error: 'Origine non autorisée (protection CSRF).',
    code: 'CSRF_ORIGIN_DENIED',
  });
}
