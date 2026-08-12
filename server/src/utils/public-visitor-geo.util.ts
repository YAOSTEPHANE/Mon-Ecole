import type { Request } from 'express';

export type VisitorGeoInfo = {
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
};

type CacheEntry = { at: number; value: VisitorGeoInfo };

const geoCache = new Map<string, CacheEntry>();
const GEO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const GEO_TIMEOUT_MS = 2500;

function isPrivateOrLocalIp(ip: string): boolean {
  const v = ip.trim().toLowerCase();
  if (!v || v === '::1' || v === '127.0.0.1') return true;
  if (v.startsWith('10.') || v.startsWith('192.168.') || v.startsWith('169.254.')) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(v)) return true;
  if (v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe80:')) return true;
  return false;
}

/**
 * Extrait l’IP client (tient compte des reverse proxies).
 */
export function readClientIp(req: Request): string | null {
  const forwarded = req.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first.replace(/^::ffff:/, '');
  }
  const realIp = req.get('x-real-ip')?.trim();
  if (realIp) return realIp.replace(/^::ffff:/, '');
  const socketIp = req.ip || req.socket.remoteAddress || null;
  return socketIp ? String(socketIp).replace(/^::ffff:/, '') : null;
}

function geoFromHeaders(req: Request): VisitorGeoInfo | null {
  const cf = req.get('cf-ipcountry')?.trim().toUpperCase();
  if (cf && cf !== 'XX' && /^[A-Z]{2}$/.test(cf)) {
    return {
      countryCode: cf,
      country: cf,
      region: null,
      city: null,
    };
  }
  return null;
}

async function lookupIpApi(ip: string): Promise<VisitorGeoInfo | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.at < GEO_CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,regionName,city`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      country?: string;
      countryCode?: string;
      regionName?: string;
      city?: string;
    };
    if (data.status !== 'success') return null;
    const value: VisitorGeoInfo = {
      countryCode: data.countryCode?.trim() || null,
      country: data.country?.trim() || null,
      region: data.regionName?.trim() || null,
      city: data.city?.trim() || null,
    };
    geoCache.set(ip, { at: Date.now(), value });
    return value;
  } catch {
    return null;
  }
}

/**
 * Localisation approximative (ville / pays) via IP.
 * En local (127.0.0.1) la géo reste vide.
 */
export async function resolveVisitorGeo(req: Request, ip: string | null): Promise<VisitorGeoInfo> {
  const fromHeaders = geoFromHeaders(req);
  if (!ip || isPrivateOrLocalIp(ip)) {
    return (
      fromHeaders ?? {
        countryCode: null,
        country: null,
        region: null,
        city: null,
      }
    );
  }

  const lookedUp = await lookupIpApi(ip);
  if (lookedUp) return lookedUp;
  return (
    fromHeaders ?? {
      countryCode: null,
      country: null,
      region: null,
      city: null,
    }
  );
}

export function formatVisitorLocation(geo: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  countryCode?: string | null;
}): string {
  const parts = [geo.city, geo.region, geo.country || geo.countryCode].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  );
  return parts.length > 0 ? parts.join(', ') : 'Non déterminée';
}
