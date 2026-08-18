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
    mesh: 'bg-[#f6f7fb]',
    orbs: ['bg-[#0018A8]/6', 'bg-[#8EB0FF]/10', 'bg-slate-400/5'],
  },
  super: {
    mesh: 'bg-[#f6f7fb]',
    orbs: ['bg-slate-400/8', 'bg-[#0018A8]/6', 'bg-[#8EB0FF]/8'],
  },
  teacher: {
    mesh: 'bg-[#f6f8f7]',
    orbs: ['bg-emerald-400/8', 'bg-teal-400/6', 'bg-[#8EB0FF]/8'],
  },
  student: {
    mesh: 'bg-[#f7f6fb]',
    orbs: ['bg-indigo-400/8', 'bg-violet-400/6', 'bg-[#8EB0FF]/8'],
  },
  parent: {
    mesh: 'bg-[#faf8f4]',
    orbs: ['bg-amber-400/8', 'bg-orange-400/5', 'bg-[#0018A8]/5'],
  },
  educator: {
    mesh: 'bg-[#faf6f7]',
    orbs: ['bg-rose-400/8', 'bg-pink-400/5', 'bg-[#8EB0FF]/6'],
  },
  staff: {
    mesh: 'bg-[#f5f9f8]',
    orbs: ['bg-teal-400/8', 'bg-emerald-400/6', 'bg-[#8EB0FF]/6'],
  },
  director: {
    mesh: 'bg-[#f6f7fb]',
    orbs: ['bg-[#0018A8]/8', 'bg-[#8EB0FF]/10', 'bg-slate-400/5'],
  },
};

export default function PremiumDashboardShell({
  children,
  variant = 'admin',
}: PremiumDashboardShellProps) {
  const atmosphere = VARIANT_ATMOSPHERE[variant] ?? VARIANT_ATMOSPHERE.admin;

  return (
    <div className={`relative min-h-full overflow-hidden ${atmosphere.mesh}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className={`absolute -left-32 top-0 h-[22rem] w-[22rem] rounded-full ${atmosphere.orbs[0]} blur-3xl`}
        />
        <div
          className={`absolute -right-24 top-1/4 h-64 w-64 rounded-full ${atmosphere.orbs[1]} blur-3xl`}
        />
        <div
          className={`absolute bottom-0 left-1/3 h-56 w-56 rounded-full ${atmosphere.orbs[2]} blur-3xl`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.55),_transparent_58%)]" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
