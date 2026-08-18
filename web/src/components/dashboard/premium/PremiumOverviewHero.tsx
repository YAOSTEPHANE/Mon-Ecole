'use client';

import type { ReactNode } from 'react';

type PremiumOverviewHeroProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  gradient?: string;
  badge?: string;
};

export default function PremiumOverviewHero({
  eyebrow,
  title,
  description,
  badge,
}: PremiumOverviewHeroProps) {
  return (
    <div className="premium-surface px-4 py-4 sm:px-6 sm:py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0018A8]">{eyebrow}</p>
      <p className="mt-1 font-display text-base font-bold tracking-tight text-stone-900 sm:text-xl">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-3xl text-xs font-medium leading-relaxed text-stone-500 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
          {description}
        </p>
      )}
      {badge && (
        <p className="mt-2 inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-700 sm:mt-3 sm:px-3 sm:py-1 sm:text-xs">
          {badge}
        </p>
      )}
    </div>
  );
}
