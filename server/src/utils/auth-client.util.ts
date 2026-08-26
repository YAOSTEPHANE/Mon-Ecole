import type { Request } from 'express';

/**
 * Clients natifs (mobile) qui ont besoin du JWT dans le corps JSON
 * (pas de cookie HttpOnly fiable cross-origine).
 */
export function clientWantsBearerTokenInBody(req: Request): boolean {
  const header = (req.get('X-Client') || req.get('x-client') || '').trim().toLowerCase();
  if (header === 'mobile' || header === 'native' || header === 'expo') return true;

  const q = req.query.client;
  if (typeof q === 'string' && ['mobile', 'native', 'expo'].includes(q.trim().toLowerCase())) {
    return true;
  }

  const bodyClient =
    req.body && typeof req.body === 'object' && 'client' in req.body
      ? String((req.body as { client?: unknown }).client ?? '')
          .trim()
          .toLowerCase()
      : '';
  return bodyClient === 'mobile' || bodyClient === 'native' || bodyClient === 'expo';
}
