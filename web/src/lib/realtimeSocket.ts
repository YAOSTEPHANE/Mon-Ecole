import { API_URL } from '@/services/api/client';

/** Origine HTTP du serveur Express (sans `/api`) pour Socket.IO. */
export function getRealtimeOrigin(): string {
  const api = API_URL.replace(/\/+$/, '');
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
    return window.location.origin;
  }
  return 'http://localhost:5000';
}
