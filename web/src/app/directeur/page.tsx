'use client';

import { Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import DirectorDashboard from '@/views/director/Dashboard';

export default function DirecteurPage() {
  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center premium-body premium-body-v3">
            <div className="premium-spinner" />
          </div>
        }
      >
        <DirectorDashboard />
      </Suspense>
    </ProtectedRoute>
  );
}
