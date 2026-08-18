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
  blue: { icon: 'bg-[#0018A8]', value: 'text-[#0018A8]' },
  emerald: { icon: 'bg-emerald-600', value: 'text-emerald-800' },
  violet: { icon: 'bg-violet-600', value: 'text-violet-800' },
  amber: { icon: 'bg-amber-500', value: 'text-amber-900' },
  rose: { icon: 'bg-rose-600', value: 'text-rose-800' },
  indigo: { icon: 'bg-indigo-600', value: 'text-indigo-900' },
  gold: { icon: 'bg-[#EBB02D]', value: 'text-amber-950' },
  slate: { icon: 'bg-slate-800', value: 'text-stone-900' },
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
      className={`premium-surface p-3 sm:p-[1.15rem] transition-transform duration-200 ease-premium hover:-translate-y-0.5 ${className}`}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500 line-clamp-2 sm:tracking-[0.18em]">
            {label}
          </p>
          <p className={`mt-1.5 break-words font-display text-xl font-bold tabular-nums tracking-tight sm:mt-2 sm:text-[1.65rem] ${a.value}`}>
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-snug text-stone-500 sm:mt-1.5">
              {subtitle}
            </p>
          )}
          {trend && (
            <p className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 sm:mt-2 sm:px-2.5">
              {trend}
            </p>
          )}
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${a.icon} text-white shadow-[0_8px_16px_-8px_rgba(0,24,168,0.45)] sm:h-11 sm:w-11`}
        >
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
        </div>
      </div>
    </div>
  );
}
