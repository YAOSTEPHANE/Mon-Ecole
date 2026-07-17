"use client";

import { Suspense } from "react";
import OAuthCallbackClient from "@/views/OAuthCallback";

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center premium-body">
          <p className="text-stone-600">Chargement…</p>
        </div>
      }
    >
      <OAuthCallbackClient />
    </Suspense>
  );
}
