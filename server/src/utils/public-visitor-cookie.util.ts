import type { Request } from 'express';

export const PUBLIC_VISITOR_COOKIE_NAME = 'visitor_id';

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

/** Identifiant visiteur anonyme envoyé via cookie (page publique uniquement). */
export function readPublicVisitorIdFromRequest(req: Request): string | undefined {
  const cookies = parseCookies(req.headers.cookie);
  const raw = cookies[PUBLIC_VISITOR_COOKIE_NAME];
  if (!raw) return undefined;
  const v = String(raw).trim();
  return v.length > 0 ? v : undefined;
}

