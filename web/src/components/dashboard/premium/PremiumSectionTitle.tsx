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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0018A8] text-white shadow-[0_8px_16px_-8px_rgba(0,24,168,0.45)]">
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
        </div>
      </div>
      {action}
    </div>
  );
}
