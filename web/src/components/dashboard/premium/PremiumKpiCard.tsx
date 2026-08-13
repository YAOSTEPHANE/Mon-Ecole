'use client';

import type { IconType } from 'react-icons';

type PremiumKpiCardProps = {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: IconType;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'rose' | 'indigo' | 'gold' | 'slate';
  trend?: string;
  className?: string;
};

const ACCENTS = {
  blue: {
    ring: 'from-cptb-blue/90 via-brand-600/60 to-brand-400/40',
    icon: 'from-cptb-blue to-cptb-blue-dark',
    glow: 'shadow-cptb-blue/22',
    value: 'text-cptb-blue',
  },
  emerald: {
    ring: 'from-emerald-500/85 via-teal-500/65 to-cyan-500/45',
    icon: 'from-emerald-600 to-teal-800',
    glow: 'shadow-emerald-500/18',
    value: 'text-emerald-800',
  },
  violet: {
    ring: 'from-violet-500/80 via-indigo-500/58 to-cptb-blue/38',
    icon: 'from-violet-600 to-indigo-800',
    glow: 'shadow-violet-500/18',
    value: 'text-violet-800',
  },
  amber: {
    ring: 'from-cptb-gold/95 via-amber-500/70 to-orange-500/45',
    icon: 'from-amber-500 to-cptb-gold-dark',
    glow: 'shadow-amber-500/22',
    value: 'text-amber-900',
  },
  rose: {
    ring: 'from-rose-500/85 via-pink-500/62 to-red-500/42',
    icon: 'from-rose-600 to-pink-800',
    glow: 'shadow-rose-500/18',
    value: 'text-rose-800',
  },
  indigo: {
    ring: 'from-indigo-500/85 via-cptb-blue/58 to-sky-500/38',
    icon: 'from-indigo-600 to-cptb-blue-dark',
    glow: 'shadow-indigo-500/18',
    value: 'text-indigo-900',
  },
  gold: {
    ring: 'from-cptb-gold/98 via-amber-400/75 to-amber-600/48',
    icon: 'from-cptb-gold to-cptb-gold-dark',
    glow: 'shadow-cptb-gold/28',
    value: 'text-amber-950',
  },
  slate: {
    ring: 'from-slate-400/75 via-stone-400/55 to-slate-600/42',
    icon: 'from-slate-800 to-stone-950',
    glow: 'shadow-slate-500/12',
    value: 'text-stone-900',
  },
} as const;

export default function PremiumKpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  accent = 'blue',
  trend,
  className = '',
}: PremiumKpiCardProps) {
  const a = ACCENTS[accent];

  return (
    <div
      className={`group relative rounded-2xl bg-gradient-to-br ${a.ring} p-px shadow-lg ${a.glow} transition-all duration-300 ease-premium hover:-translate-y-1 hover:shadow-xl ${className}`}
    >
      <div className="relative h-full overflow-hidden rounded-[15px] bg-white/[0.98] backdrop-blur-xl">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-white to-transparent opacity-80"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="relative p-3 sm:p-[1.15rem]">
          <div className="flex items-start justify-between gap-2 sm:gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 line-clamp-2 sm:tracking-[0.18em]">
                {label}
              </p>
              <p
                className={`mt-1.5 break-words font-display text-xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-[1.65rem] ${a.value}`}
              >
                {value}
              </p>
              {subtitle && (
                <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-stone-500 sm:mt-1.5">
                  {subtitle}
                </p>
              )}
              {trend && (
                <p className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200/80 sm:mt-2 sm:px-2.5">
                  {trend}
                </p>
              )}
            </div>
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${a.icon} text-white shadow-md ring-1 ring-white/35 transition-transform duration-300 ease-premium group-hover:scale-105 group-hover:rotate-2 sm:h-11 sm:w-11`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
