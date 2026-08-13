"use client";

import { Suspense } from "react";
import Search from "@/views/Search";

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center premium-body premium-body-v3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-cptb-gold/30 border-t-cptb-gold" />
        </div>
      }
    >
      <Search />
    </Suspense>
  );
}
