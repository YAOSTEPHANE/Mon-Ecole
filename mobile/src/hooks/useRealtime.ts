import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { getRealtimeOrigin } from '../config';
import { useAuth } from '../context/AuthContext';

/**
 * Connexion Socket.IO — toasts natifs sur notification / message.
 */
export function useRealtime(onEvent?: () => void) {
  const { token, user } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!token || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(getRealtimeOrigin(), {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('notification', (payload: { title?: string; content?: string }) => {
      onEventRef.current?.();
      if (payload?.title) {
        Alert.alert(payload.title, payload.content || undefined);
      }
    });

    socket.on('message', (payload: { title?: string; content?: string }) => {
      onEventRef.current?.();
      if (payload?.title) {
        Alert.alert(payload.title, payload.content || undefined);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token, user?.id]);

  return { connected };
}
