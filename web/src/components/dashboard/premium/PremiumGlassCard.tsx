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
  gold: 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#EBB02D] before:rounded-l-[1.25rem]',
  indigo:
    'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-[#0018A8] before:rounded-l-[1.25rem]',
  emerald:
    'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-emerald-500 before:rounded-l-[1.25rem]',
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
      className={`premium-surface ${
        hover ? 'transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-18px_rgba(28,39,76,0.28)]' : ''
      } ${ACCENT_BORDER[accent]} ${className}`}
    >
      <div className={`relative ${PADDING[padding]}`}>{children}</div>
    </div>
  );
}
