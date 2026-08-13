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
  const gradient =
    variant === 'super'
      ? 'from-slate-950 via-[#12162a] to-stone-950'
      : 'from-[#060b22] via-[#001066] to-[#0a1028]';

  return (
    <div className="dash-hero-premium relative overflow-hidden rounded-[1.35rem] shadow-[0_32px_80px_-32px_rgba(0,18,80,0.62)] ring-1 ring-white/12">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_65%_at_12%_-15%,rgba(235,176,45,0.32),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_98%_105%,rgba(0,24,168,0.5),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/65 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cptb-gold/10 blur-3xl" />

      <div className="relative flex min-w-0 flex-col gap-4 p-4 sm:gap-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-5">
          {Icon && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cptb-gold via-amber-400 to-cptb-gold-dark text-stone-950 shadow-[0_16px_40px_-12px_rgba(235,176,45,0.55)] ring-1 ring-white/30 sm:h-14 sm:w-14">
              <Icon className="h-5 w-5 sm:h-7 sm:w-7" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="inline-flex max-w-full items-center gap-2 truncate rounded-full border border-white/12 bg-white/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-cptb-gold backdrop-blur-sm sm:px-3 sm:text-[10px] sm:tracking-[0.22em]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cptb-gold shadow-[0_0_8px_rgba(235,176,45,0.8)]" aria-hidden />
              <span className="truncate">{eyebrow}</span>
            </p>
            <h1 className="mt-2.5 font-display text-xl font-bold tracking-tight text-white sm:mt-3 sm:text-3xl lg:text-[2.1rem] lg:leading-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-300/95 sm:mt-2.5 sm:text-[0.95rem]">
                {description}
              </p>
            )}
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 sm:mt-4">
              {badge && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/14 px-2.5 py-1 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-400/28 sm:px-3">
                  <FiTrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {badge}
                </span>
              )}
              {lastSync && (
                <span className="inline-flex items-center rounded-full bg-white/6 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-400 ring-1 ring-white/8">
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
