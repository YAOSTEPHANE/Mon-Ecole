"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ensurePublicVisitorId } from "@/lib/public-visitor";
import { publicApi } from "@/services/api/public";

export default function PublicVisitorBootstrap() {
  const { user } = useAuth();
  const pathname = usePathname();
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    // On ne track pas les utilisateurs connectés (tu peux modifier si tu veux).
    if (user) return;

    const visitorId = ensurePublicVisitorId();
    void visitorId; // explicite : on s’assure juste que le cookie est présent.

    const query = typeof window !== "undefined" ? window.location.search : "";
    const pageUrl = query ? `${pathname}${query}` : pathname;

    const signature = `page:${pageUrl}`;
    if (lastSentRef.current === signature) return;
    lastSentRef.current = signature;

    const referrerUrl = document.referrer || null;
    void publicApi
      .trackPublicPageView({
        pageUrl,
        referrerUrl,
        language: typeof navigator !== "undefined" ? navigator.language : null,
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : null,
        screen:
          typeof window !== "undefined"
            ? `${window.screen.width}x${window.screen.height}`
            : null,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      })
      .catch(() => {
        // Tracking best-effort : on ne bloque jamais l’UI
      });
  }, [pathname, user]);

  return null;
}

