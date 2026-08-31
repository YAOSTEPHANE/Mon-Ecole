'use client';

import { useEffect } from 'react';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';

export type AdminNavTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
};

interface AdminSidebarProps {
  mainTabs: AdminNavTab[];
  bottomTabs: AdminNavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  /** lg+ : menu réduit aux icônes */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const AdminSidebar = ({
  mainTabs,
  bottomTabs,
  activeTab,
  onTabChange,
  isOpen,
  onToggle,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) => {
  const closeOnNavigate = (id: string) => {
    onTabChange(id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onToggle();
    }
  };

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    if (!mq.matches) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] bg-slate-900/40 backdrop-blur-sm lg:hidden cursor-default border-0 p-0"
          onClick={onToggle}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`dash-sidebar-rail z-50 border-r border-white/10
          transition-[transform,visibility] duration-300 ease-premium
          max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-[60]
          max-lg:h-dvh max-lg:max-h-dvh max-lg:w-[min(20rem,calc(100vw-1rem))]
          max-lg:max-w-[calc(100vw-1rem)] max-lg:overflow-hidden
          max-lg:shadow-[16px_0_48px_-12px_rgba(0,0,0,0.55)]
          ${
            isOpen
              ? 'max-lg:translate-x-0 max-lg:visible'
              : 'max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none'
          }
          ${collapsed ? 'lg:w-[4.25rem]' : 'lg:w-64'}
          lg:visible lg:sticky lg:left-auto lg:h-dvh lg:max-h-dvh lg:translate-x-0 lg:pointer-events-auto lg:shrink-0 lg:self-stretch lg:shadow-none lg:z-50 dash-sticky-under-header dash-h-under-header`}
        aria-label="Navigation administration"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div
            className={`hidden shrink-0 items-center border-b border-white/10 px-1.5 py-2 lg:flex ${
              collapsed ? 'justify-center' : 'justify-between gap-1'
            }`}
          >
            {!collapsed ? (
              <p className="min-w-0 truncate pl-1 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Menu
              </p>
            ) : null}
            {onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`flex shrink-0 items-center justify-center rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 min-h-[34px] min-w-[34px] ${
                  collapsed ? '' : 'ml-auto'
                }`}
                aria-expanded={collapsed ? false : true}
                aria-label={collapsed ? 'Développer le menu latéral' : 'Réduire le menu latéral'}
              >
                {collapsed ? (
                  <FiChevronRight className="h-4 w-4" aria-hidden />
                ) : (
                  <FiChevronLeft className="h-4 w-4" aria-hidden />
                )}
              </button>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-b border-white/10 px-2.5 py-2 shrink-0 pt-[max(0.5rem,env(safe-area-inset-top))] lg:hidden">
            <div>
              <p className="text-[8px] font-semibold text-white/45 uppercase tracking-[0.2em]">Navigation</p>
              <h2 className="text-sm font-display font-semibold tracking-wide text-white">Administration</h2>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="p-1.5 rounded-lg text-white/80 hover:bg-white/10 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              aria-label="Fermer le menu"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 py-2 max-lg:pl-[max(0.5rem,env(safe-area-inset-left))]">
            <nav
              className="dash-sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden overscroll-contain pr-1 pb-3 text-xs leading-snug max-lg:pb-[max(5.5rem,calc(env(safe-area-inset-bottom)+4.5rem))] lg:text-[10px] lg:leading-tight"
              aria-label="Modules administration"
            >
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    title={tab.label}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => closeOnNavigate(tab.id)}
                    className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium transition-all duration-300 ease-premium lg:min-h-0 lg:gap-2 lg:px-2 lg:py-1.5 ${
                      collapsed ? 'lg:justify-center lg:px-1.5 lg:gap-0' : ''
                    } ${
                      isActive
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-sm`
                        : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 lg:h-3.5 lg:w-3.5 ${
                        isActive ? 'text-white' : inactiveModuleIconClass(tab.color)
                      }`}
                    />
                    <span
                      className={`min-w-0 text-left text-[13px] lg:truncate lg:text-[inherit] ${collapsed ? 'lg:hidden' : ''}`}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}

              {bottomTabs.length > 0 ? (
                <div className="mt-2 border-t border-white/10 pt-2 space-y-0.5">
                  {bottomTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        title={tab.label}
                        aria-label={tab.label}
                        aria-current={isActive ? 'page' : undefined}
                        onClick={() => closeOnNavigate(tab.id)}
                        className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium transition-all duration-300 ease-premium lg:min-h-0 lg:gap-2 lg:px-2 lg:py-1.5 ${
                          collapsed ? 'lg:justify-center lg:px-1.5 lg:gap-0' : ''
                        } ${
                          isActive
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-sm`
                            : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.12]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 lg:h-3.5 lg:w-3.5 ${
                            isActive ? 'text-white' : inactiveModuleIconClass(tab.color)
                          }`}
                        />
                        <span
                          className={`min-w-0 text-left text-[13px] lg:truncate lg:text-[inherit] ${collapsed ? 'lg:hidden' : ''}`}
                        >
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
