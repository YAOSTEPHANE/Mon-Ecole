import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from './jwt.util';
import { getAllowedCorsOrigins } from './cors-origins.util';
import { AUTH_COOKIE_NAME } from './auth-cookie.util';
import prisma from './prisma';

export type RealtimeNotificationPayload = {
  type: string;
  title: string;
  content: string;
  link?: string | null;
  createdAt?: string;
};

export type RealtimeMessagePayload = {
  threadKey?: string | null;
  title: string;
  content: string;
  link?: string | null;
};

let io: Server | null = null;

function userRoom(userId: string): string {
  return `user:${userId}`;
}

function tokenFromCookieHeader(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    if (key !== AUTH_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      return part.slice(idx + 1).trim();
    }
  }
  return undefined;
}

/**
 * Attache Socket.IO au serveur HTTP (désactivé sur Vercel serverless).
 * Auth : JWT en `auth.token` (recommandé) ou cookie HttpOnly. Query `token` refusé en production.
 */
export function attachRealtime(httpServer: HttpServer): Server | null {
  if (process.env.VERCEL === '1') {
    console.warn('[realtime] WebSocket désactivé sur Vercel (serverless).');
    return null;
  }
  if (io) return io;

  const origins = getAllowedCorsOrigins();
  io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
      origin: origins.length > 0 ? origins : true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    void (async () => {
      try {
        const fromAuth =
          typeof socket.handshake.auth?.token === 'string' ? socket.handshake.auth.token : '';
        const fromQuery =
          typeof socket.handshake.query?.token === 'string' ? socket.handshake.query.token : '';
        if (fromQuery && process.env.NODE_ENV === 'production') {
          next(new Error('Token query non autorisé'));
          return;
        }
        const fromCookie = tokenFromCookieHeader(socket.handshake.headers.cookie);
        const raw = (fromAuth || fromCookie || (process.env.NODE_ENV !== 'production' ? fromQuery : '') || '')
          .replace(/^Bearer\s+/i, '')
          .trim();
        if (!raw) {
          next(new Error('Token manquant'));
          return;
        }
        const payload = verifyAccessToken(raw);
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, role: true, isActive: true },
        });
        if (!user?.isActive) {
          next(new Error('Utilisateur non autorisé'));
          return;
        }
        socket.data.userId = user.id;
        socket.data.role = user.role;
        next();
      } catch {
        next(new Error('Token invalide'));
      }
    })();
  });

  io.on('connection', (socket: Socket) => {
    const userId = String(socket.data.userId || '');
    if (!userId) {
      socket.disconnect(true);
      return;
    }
    void socket.join(userRoom(userId));
  });

  console.log('[realtime] Socket.IO prêt (path /socket.io)');
  return io;
}

export function emitNotificationToUser(
  userId: string,
  payload: RealtimeNotificationPayload,
): void {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit('notification', payload);
}

export function emitMessageToUser(userId: string, payload: RealtimeMessagePayload): void {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit('message', payload);
}

export function getRealtimeServer(): Server | null {
  return io;
}
