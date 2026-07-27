'use client';

import type { IconType } from 'react-icons';

type PremiumSectionTitleProps = {
  title: string;
  subtitle?: string;
  icon?: IconType;
  action?: React.ReactNode;
};

export default function PremiumSectionTitle({
  title,
  subtitle,
  icon: Icon,
  action,
}: PremiumSectionTitleProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-950 via-zinc-900 to-black text-cptb-gold shadow-[0_10px_24px_-12px_rgba(0,0,0,0.55)] ring-1 ring-white/12">
            <Icon className="h-[1.05rem] w-[1.05rem]" aria-hidden />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-[0.95rem] font-bold tracking-tight text-stone-900 sm:text-base">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs font-medium leading-relaxed text-stone-500">{subtitle}</p>
          )}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-0.5 w-8 rounded-full bg-gradient-to-r from-cptb-blue to-cptb-gold" />
            <div className="h-px flex-1 max-w-16 bg-gradient-to-r from-cptb-gold/50 to-transparent" />
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}
