"use client";

import { Suspense } from "react";
import ResetPassword from "@/views/ResetPassword";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center premium-body premium-body-v3">
          <div className="premium-spinner" />
        </div>
      }
    >
      <ResetPassword />
    </Suspense>
  );
}
