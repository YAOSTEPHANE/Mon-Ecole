"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Monte les enfants uniquement dans le navigateur, sans `next/dynamic` (évite un 404 SSR). */
export default function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return children;
}
