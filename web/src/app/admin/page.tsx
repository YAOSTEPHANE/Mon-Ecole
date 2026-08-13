"use client";

import { Suspense } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboard from "@/views/admin/Dashboard";

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center premium-body premium-body-v3">
            <div className="premium-spinner" />
          </div>
        }
      >
        <AdminDashboard />
      </Suspense>
    </ProtectedRoute>
  );
}
