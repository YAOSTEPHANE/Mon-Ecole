'use client';

import type { ReactNode } from 'react';

type PremiumDashboardShellProps = {
  children: ReactNode;
  variant?: 'admin' | 'super' | 'teacher' | 'student' | 'parent' | 'educator' | 'staff' | 'director';
};

const VARIANT_ATMOSPHERE: Record<
  NonNullable<PremiumDashboardShellProps['variant']>,
  { mesh: string; orbs: [string, string, string] }
> = {
  admin: {
    mesh: 'bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(0,24,168,0.06),transparent_55%),linear-gradient(180deg,#fafaf9_0%,#f6f4f0_48%,#fafaf9_100%)]',
    orbs: ['bg-cptb-blue/8', 'bg-cptb-gold/10', 'bg-tran-mauve-600/6'],
  },
  super: {
    mesh: 'bg-gradient-to-br from-slate-100/80 via-stone-50 to-amber-50/50',
    orbs: ['bg-slate-500/10', 'bg-amber-400/14', 'bg-cptb-blue/8'],
  },
  teacher: {
    mesh: 'bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(16,185,129,0.07),transparent_55%),linear-gradient(180deg,#fafaf9_0%,#f4faf8_48%,#fafaf9_100%)]',
    orbs: ['bg-emerald-400/10', 'bg-teal-400/8', 'bg-cptb-gold/8'],
  },
  student: {
    mesh: 'bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(99,102,241,0.07),transparent_55%),linear-gradient(180deg,#fafaf9_0%,#f6f4fc_48%,#fafaf9_100%)]',
    orbs: ['bg-indigo-400/10', 'bg-violet-400/8', 'bg-cptb-gold/8'],
  },
  parent: {
    mesh: 'bg-[radial-gradient(ellipse_90%_55%_at_50%_-8%,rgba(245,158,11,0.08),transparent_55%),linear-gradient(180deg,#fafaf9_0%,#faf6f0_48%,#fafaf9_100%)]',
    orbs: ['bg-amber-400/12', 'bg-orange-400/8', 'bg-rose-400/6'],
  },
  educator: {
    mesh: 'bg-gradient-to-br from-rose-50/35 via-white to-pink-50/25',
    orbs: ['bg-rose-400/12', 'bg-pink-400/8', 'bg-cptb-gold/8'],
  },
  staff: {
    mesh: 'bg-gradient-to-br from-teal-50/35 via-white to-emerald-50/25',
    orbs: ['bg-teal-400/12', 'bg-emerald-400/10', 'bg-cptb-gold/8'],
  },
  director: {
    mesh: 'bg-mesh-dashboard',
    orbs: ['bg-cptb-blue/12', 'bg-cptb-gold/14', 'bg-stone-500/8'],
  },
};

export default function PremiumDashboardShell({
  children,
  variant = 'admin',
}: PremiumDashboardShellProps) {
  const atmosphere = VARIANT_ATMOSPHERE[variant] ?? VARIANT_ATMOSPHERE.admin;

  return (
    <div className={`relative min-h-full ${atmosphere.mesh}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className={`absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full ${atmosphere.orbs[0]} blur-3xl animate-soft-pulse`}
        />
        <div
          className={`absolute -right-24 top-1/4 h-80 w-80 rounded-full ${atmosphere.orbs[1]} blur-3xl`}
        />
        <div
          className={`absolute bottom-0 left-1/3 h-72 w-72 rounded-full ${atmosphere.orbs[2]} blur-3xl`}
        />
        <div className="absolute inset-0 bg-sheen-gold opacity-25" />
      </div>
      {/* Pas de transform ici : animate-dash-enter casse position:fixed des sidebars */}
      <div className="relative">{children}</div>
    </div>
  );
}
