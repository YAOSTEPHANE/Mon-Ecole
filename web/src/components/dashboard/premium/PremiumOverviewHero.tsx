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
  gradient = 'from-cptb-blue via-brand-700 to-cptb-blue-dark',
  badge,
}: PremiumOverviewHeroProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-px shadow-[0_18px_52px_-22px_rgba(0,24,168,0.35)] ring-1 ring-white/20`}
    >
      <div className="relative overflow-hidden rounded-[15px] bg-white/96 px-3.5 py-3.5 backdrop-blur-xl sm:px-6 sm:py-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_0%_0%,rgba(0,24,168,0.06),transparent_55%)]" />
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-cptb-gold/15 to-transparent" />
        <p className="relative text-[10px] font-bold uppercase tracking-[0.18em] text-cptb-blue/90">{eyebrow}</p>
        <p className="relative font-display text-base font-bold tracking-tight text-stone-900 sm:text-xl">{title}</p>
        {description && (
          <p className="relative mt-1.5 max-w-3xl text-xs font-medium leading-relaxed text-stone-600 line-clamp-3 sm:mt-2 sm:text-sm sm:line-clamp-none">
            {description}
          </p>
        )}
        {badge && (
          <p className="relative mt-2 inline-flex items-center rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 sm:mt-3 sm:px-3 sm:py-1 sm:text-xs">
            {badge}
          </p>
        )}
      </div>
    </div>
  );
}
