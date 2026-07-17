"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import toast from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getRealtimeOrigin } from "@/lib/realtimeSocket";

/**
 * Connexion Socket.IO : invalide les notifications et toast léger.
 */
export default function RealtimeBootstrap() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user?.id) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const origin = getRealtimeOrigin();
    const socket = io(origin, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 8,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on("notification", (payload: { title?: string; content?: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (payload?.title) {
        toast(payload.title, { duration: 4000 });
      }
    });

    socket.on("message", (payload: { title?: string }) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["messages"] });
      if (payload?.title) {
        toast(payload.title, { duration: 4000 });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user?.id, queryClient]);

  return null;
}
