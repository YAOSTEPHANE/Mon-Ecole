import { API_URL } from '@/services/api/client';

function trimSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

/**
 * Socket.IO n’est pas attaché sur Vercel (`VERCEL=1` → serverless Express).
 * Ne connecter le client que si une origine realtime dédiée existe, ou une API absolue
 * (hébergement Node classique hors Vercel).
 */
export function isRealtimeEnabled(): boolean {
  const disable = process.env.NEXT_PUBLIC_DISABLE_REALTIME?.trim().toLowerCase();
  if (disable === '1' || disable === 'true' || disable === 'yes') return false;

  const dedicated = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (dedicated && (dedicated.startsWith('http://') || dedicated.startsWith('https://'))) {
    return true;
  }

  const api = trimSlash(API_URL || '');
  if (api.startsWith('http://') || api.startsWith('https://')) return true;

  // URL relative `/api` : OK en local (rewrites Next → Express), pas sur Vercel serverless.
  if (api.startsWith('/') || !api) {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') return true;
    }
    return process.env.NODE_ENV !== 'production';
  }

  return false;
}

/** Origine HTTP du serveur Express (sans `/api`) pour Socket.IO. */
export function getRealtimeOrigin(): string {
  const dedicated = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (dedicated && (dedicated.startsWith('http://') || dedicated.startsWith('https://'))) {
    try {
      const u = new URL(dedicated);
      return u.origin;
    } catch {
      return trimSlash(dedicated);
    }
  }

  const api = trimSlash(API_URL || '');
  if (api.startsWith('http://') || api.startsWith('https://')) {
    try {
      const u = new URL(api);
      const basePath = u.pathname.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
      return `${u.origin}${basePath}`;
    } catch {
      return api.replace(/\/api$/i, '');
    }
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      const api = trimSlash(API_URL || '');
      // En dev, si l'API passe par le proxy Next (`/api`), Socket.IO aussi (rewrites next.config).
      if (!api.startsWith('http://') && !api.startsWith('https://')) {
        return window.location.origin;
      }
      try {
        const u = new URL(api);
        if (u.hostname === host || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          const basePath = u.pathname.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
          return `${u.origin}${basePath}`;
        }
      } catch {
        /* fallback ci-dessous */
      }
      return 'http://localhost:5000';
    }
    return window.location.origin;
  }
  return 'http://localhost:5000';
}
