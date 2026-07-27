'use client';

import type { ReactNode } from 'react';

type PremiumGlassCardProps = {
  children: ReactNode;
  className?: string;
  accent?: 'none' | 'gold' | 'indigo' | 'emerald';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
};

const ACCENT_BORDER = {
  none: '',
  gold: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-gradient-to-b before:from-cptb-gold before:via-amber-500 before:to-cptb-gold-dark before:rounded-l-2xl',
  indigo:
    'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-gradient-to-b before:from-cptb-blue before:via-brand-600 before:to-cptb-blue-dark before:rounded-l-2xl',
  emerald:
    'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-gradient-to-b before:from-emerald-500 before:to-teal-700 before:rounded-l-2xl',
} as const;

const PADDING = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-8',
} as const;

export default function PremiumGlassCard({
  children,
  className = '',
  accent = 'none',
  padding = 'md',
  hover = false,
}: PremiumGlassCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white/94 backdrop-blur-xl shadow-dash-card ring-1 ring-stone-200/70 transition-all duration-300 ease-premium ${
        hover ? 'hover:shadow-dash-card-hover hover:-translate-y-0.5' : ''
      } ${ACCENT_BORDER[accent]} ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/70 via-transparent to-amber-50/25" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-cptb-gold/8 to-transparent" aria-hidden />
      <div className={`relative ${PADDING[padding]}`}>{children}</div>
    </div>
  );
}
