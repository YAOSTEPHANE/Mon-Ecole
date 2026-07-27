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
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${gradient} p-px shadow-[0_24px_56px_-24px_rgba(15,23,42,0.45)] ring-1 ring-white/20`}
    >
      <div className="relative overflow-hidden rounded-[15px] bg-white/[0.98] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_85%_at_100%_0%,rgba(255,255,255,0.72),transparent_58%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(0,24,168,0.03),transparent_42%,rgba(235,176,45,0.04))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
        <div className="relative flex flex-col gap-3 px-3.5 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:px-5 sm:py-4">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-[0_12px_28px_-10px_rgba(0,0,0,0.45)] ring-1 ring-white/35`}
            >
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold tracking-tight text-stone-900 sm:text-lg">
                {title}
              </h2>
              {description && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-600 sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
            {badge && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-gradient-to-r from-stone-50 to-amber-50/80 px-2.5 py-1 text-xs font-semibold text-stone-700 shadow-sm">
                <BadgeIcon className="h-3.5 w-3.5 text-amber-800/90" aria-hidden />
                {badge}
              </span>
            )}
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
