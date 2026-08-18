'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiCommand } from 'react-icons/fi';

export type PremiumModuleHeaderProps = {
  title: string;
  description?: string;
  icon: IconType;
  gradient: string;
  badge?: string;
  badgeIcon?: IconType;
  actions?: ReactNode;
};

export default function PremiumModuleHeader({
  title,
  description,
  icon: Icon,
  gradient,
  badge,
  badgeIcon: BadgeIcon = FiCommand,
  actions,
}: PremiumModuleHeaderProps) {
  return (
    <div className="premium-surface p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-start gap-2.5 sm:gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-[0_8px_16px_-8px_rgba(0,24,168,0.4)] sm:h-11 sm:w-11`}
          >
            <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-sm font-bold tracking-tight text-stone-900 sm:text-lg">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500 sm:mt-1 sm:text-sm">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:flex-wrap sm:items-center">
          {badge && (
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold text-stone-700 sm:text-xs">
              <BadgeIcon className="h-3.5 w-3.5 shrink-0 text-[#0018A8]" aria-hidden />
              {badge}
            </span>
          )}
          {actions ? (
            <div className="flex min-w-0 w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              {actions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
