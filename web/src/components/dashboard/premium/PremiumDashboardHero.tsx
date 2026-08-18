'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiTrendingUp } from 'react-icons/fi';

type PremiumDashboardHeroProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  icon?: IconType;
  badge?: string;
  lastSync?: string | null;
  isFetching?: boolean;
  actions?: ReactNode;
  variant?: 'admin' | 'super';
};

export default function PremiumDashboardHero({
  eyebrow,
  title,
  description,
  icon: Icon,
  badge,
  lastSync,
  isFetching,
  actions,
  variant = 'admin',
}: PremiumDashboardHeroProps) {
  const iconBg = variant === 'super' ? 'bg-slate-900' : 'bg-[#0018A8]';

  return (
    <div className="premium-surface p-4 sm:p-6">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {Icon && (
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${iconBg} text-white shadow-[0_10px_20px_-10px_rgba(0,24,168,0.5)] sm:h-12 sm:w-12`}>
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0018A8]">
              {eyebrow}
            </p>
            <h1 className="mt-1.5 font-display text-xl font-bold tracking-tight text-stone-900 sm:text-2xl lg:text-[1.85rem] lg:leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-stone-500 sm:text-sm">
                {description}
              </p>
            )}
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
              {badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                  <FiTrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {badge}
                </span>
              )}
              {lastSync && (
                <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium tabular-nums text-stone-500">
                  {isFetching ? 'Actualisation…' : `Synchro ${lastSync}`}
                </span>
              )}
            </div>
          </div>
        </div>
        {actions && <div className="flex min-w-0 w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
