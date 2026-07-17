import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifyAccessToken } from './jwt.util';
import { getAllowedCorsOrigins } from './cors-origins.util';

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

/**
 * Attache Socket.IO au serveur HTTP (désactivé sur Vercel serverless).
 * Auth : JWT en `auth.token` ou query `token`.
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
    try {
      const raw =
        (typeof socket.handshake.auth?.token === 'string' && socket.handshake.auth.token) ||
        (typeof socket.handshake.query?.token === 'string' && socket.handshake.query.token) ||
        '';
      const token = raw.replace(/^Bearer\s+/i, '').trim();
      if (!token) {
        next(new Error('Token manquant'));
        return;
      }
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error('Token invalide'));
    }
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
