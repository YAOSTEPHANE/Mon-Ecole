'use client';

import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { FiMenu, FiSearch } from 'react-icons/fi';
import AccountHeaderControls from '../AccountHeaderControls';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';

export type PortalSpaceTab = {
  id: string;
  label: string;
  icon: IconType;
  color: string;
};

type PortalSpaceHeaderProps = {
  user: Parameters<typeof AccountHeaderControls>[0]['user'];
  role: string;
  onLogout: () => void | Promise<void>;
  staffRoleBadgeLabel?: string;
  title: string;
  onMenuClick?: () => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  searchSlot?: ReactNode;
  trailing?: ReactNode;
  mobileTabs?: PortalSpaceTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
};

export default function PortalSpaceHeader({
  user,
  role,
  onLogout,
  staffRoleBadgeLabel,
  title,
  onMenuClick,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Rechercher…',
  searchAriaLabel = 'Recherche',
  searchSlot,
  trailing,
  mobileTabs,
  activeTab,
  onTabChange,
}: PortalSpaceHeaderProps) {
  return (
    <header className="dash-command-bar z-20 shrink-0 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
        {onMenuClick ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
            aria-label="Ouvrir le menu"
          >
            <FiMenu className="h-4 w-4" aria-hidden />
          </button>
        ) : null}

        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">{title}</p>

        {searchSlot ??
          (onSearchChange ? (
            <div className="relative hidden w-44 shrink-0 md:block lg:w-64">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                <FiSearch className="h-4 w-4" aria-hidden />
              </div>
              <input
                type="search"
                value={searchValue ?? ''}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="dash-search-field w-full rounded-xl py-2 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400"
                aria-label={searchAriaLabel}
              />
            </div>
          ) : null)}

        {trailing}

        <AccountHeaderControls
          user={user}
          role={role}
          onLogout={onLogout}
          staffRoleBadgeLabel={staffRoleBadgeLabel}
        />
      </div>

      {mobileTabs && mobileTabs.length > 0 && onTabChange ? (
        <div className="dash-mobile-tabs scrollbar-hide px-3 pb-2 lg:hidden">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                aria-label={tab.label}
                title={tab.label}
                className={`dash-mobile-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${
                  isActive
                    ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                <Icon
                  className={`h-3.5 w-3.5 shrink-0 ${
                    isActive ? 'text-white' : inactiveModuleIconClass(tab.color)
                  }`}
                />
                <span className="dash-mobile-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
