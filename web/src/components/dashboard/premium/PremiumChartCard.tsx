'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { PremiumChartMeshBackground } from '@/components/charts';

type PremiumChartCardProps = {
  title: string;
  subtitle?: string;
  icon?: IconType;
  height?: number;
  accent?: 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
  children: ReactNode;
  footer?: ReactNode;
  badge?: ReactNode;
  className?: string;
  padding?: 'sm' | 'md';
};

const ACCENT_ICON: Record<NonNullable<PremiumChartCardProps['accent']>, string> = {
  indigo: 'bg-[#0018A8]',
  violet: 'bg-[#001066]',
  emerald: 'bg-emerald-600',
  amber: 'bg-[#EBB02D]',
  rose: 'bg-rose-600',
  sky: 'bg-sky-600',
  slate: 'bg-slate-800',
};

export default function PremiumChartCard({
  title,
  subtitle,
  icon: Icon,
  height = 240,
  accent = 'indigo',
  children,
  footer,
  badge,
  className = '',
  padding = 'md',
}: PremiumChartCardProps) {
  const pad = padding === 'sm' ? 'p-3 sm:p-4' : 'p-4 sm:p-5';

  return (
    <div className={`premium-surface ${className}`}>
      <div className="relative h-full overflow-hidden rounded-[1.25rem]">
        <PremiumChartMeshBackground />
        <div className={`relative z-[1] ${pad}`}>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              {Icon && (
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${ACCENT_ICON[accent]} text-white`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold text-stone-900 sm:text-sm">{title}</h3>
                {subtitle && (
                  <p className="text-[11px] font-medium text-stone-500 sm:text-xs">{subtitle}</p>
                )}
              </div>
            </div>
            {badge}
          </div>
          <div className="w-full min-w-0" style={{ height }}>
            {children}
          </div>
          {footer && (
            <div className="relative z-[1] mt-3 border-t border-[#eceff5] pt-3">{footer}</div>
          )}
        </div>
      </div>
    </div>
  );
}
