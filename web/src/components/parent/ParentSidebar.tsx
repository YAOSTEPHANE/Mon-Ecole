import { FiAward, FiAlertCircle, FiFileText, FiCalendar, FiShield, FiCreditCard, FiUsers, FiLayout, FiX, FiBook, FiMessageCircle } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';

export type ParentNavItem = {
  id: string;
  label: string;
  icon: IconType;
  requiresChild: boolean;
  /** Classes Tailwind pour le dégradé actif, ex. from-orange-500 to-amber-600 */
  color: string;
};

interface ParentSidebarProps {
  items: ParentNavItem[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedChild: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

const ParentSidebar = ({ items, activeTab, onTabChange, selectedChild, isOpen, onToggle }: ParentSidebarProps) => {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[55] cursor-default border-0 bg-slate-900/40 p-0 backdrop-blur-sm lg:hidden"
          onClick={onToggle}
          aria-label="Fermer la navigation"
        />
      )}

      <aside
        className={`dash-sidebar-rail z-50 shrink-0 border-r border-white/10
          transition-transform duration-300 ease-premium
          w-[min(16rem,calc(100vw-2rem))] lg:w-64
          fixed left-0 dash-sticky-under-header dash-h-under-header
          max-lg:!top-0 max-lg:!h-dvh max-lg:!max-h-dvh max-lg:z-[60]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:sticky lg:left-auto lg:translate-x-0 lg:self-start`}
        aria-label="Navigation espace parent"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Menu</p>
              <h2 className="font-display text-sm font-semibold tracking-wide text-white">Espace parent</h2>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cptb-gold/45 lg:hidden"
              aria-label="Fermer le menu"
            >
              <FiX className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <nav className="dash-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-2 text-xs leading-snug">
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isDisabled = item.requiresChild && !selectedChild;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (!isDisabled) {
                      onTabChange(item.id);
                      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                        onToggle();
                      }
                    }
                  }}
                  disabled={isDisabled}
                  className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cptb-gold/40 ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-[0_0_28px_-8px_rgba(251,191,36,0.5)] ring-1 ring-cptb-gold/35`
                      : isDisabled
                        ? 'cursor-not-allowed bg-white/[0.03] text-zinc-600'
                        : 'text-zinc-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                  title={isDisabled ? 'Sélectionnez d’abord un enfant' : item.label}
                >
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isDisabled
                        ? 'text-zinc-600'
                        : isActive
                          ? 'scale-105 text-white'
                          : inactiveModuleIconClass(item.color)
                    }`}
                  />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cptb-gold" aria-hidden />}
                </button>
              );
            })}
          </nav>

          {selectedChild && (
            <div className="shrink-0 border-t border-white/10 bg-white/[0.04] px-2.5 py-2.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" aria-hidden />
                <p className="text-xs font-semibold text-white/90">Enfant sélectionné</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ParentSidebar;
