"use client";

import { useEffect } from "react";

/** Initialise Sentry côté navigateur si NEXT_PUBLIC_SENTRY_DSN est défini. */
export default function SentryBootstrap() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
    if (!dsn) return;
    void (async () => {
      try {
        const Sentry = await import("@sentry/nextjs");
        Sentry.init({
          dsn,
          environment: process.env.NODE_ENV || "development",
          tracesSampleRate: Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0.05),
        });
      } catch {
        console.warn("[sentry] @sentry/nextjs indisponible");
      }
    })();
  }, []);
  return null;
}
