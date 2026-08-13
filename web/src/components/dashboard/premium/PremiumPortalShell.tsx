'use client';

import type { ReactNode } from 'react';
import PremiumDashboardShell from './PremiumDashboardShell';

type PremiumPortalShellProps = {
  children: ReactNode;
  variant?: 'admin' | 'super' | 'teacher' | 'student' | 'parent' | 'educator' | 'staff' | 'director';
  className?: string;
};

/** Enveloppe premium pour tous les espaces métier (portails rôle + admin). */
export default function PremiumPortalShell({
  children,
  variant = 'admin',
  className = '',
}: PremiumPortalShellProps) {
  return (
    <PremiumDashboardShell variant={variant}>
      <div className={`dash-min-h-under-header ${className}`}>{children}</div>
    </PremiumDashboardShell>
  );
}
