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
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 lg:hidden cursor-default border-0 p-0"
          onClick={onToggle}
          aria-label="Fermer la navigation"
        />
      )}

      <aside
        className={`relative z-50 shrink-0 border-r border-amber-200/20 bg-white/94 shadow-dash-card backdrop-blur-xl
          transition-transform duration-300 ease-premium
          w-[min(16rem,calc(100vw-2rem))] lg:w-64
          fixed left-0 dash-sticky-under-header dash-h-under-header
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:sticky lg:left-auto lg:translate-x-0 lg:self-start`}
        aria-label="Navigation espace parent"
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex shrink-0 items-center justify-between border-b border-amber-200/25 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500">Menu</p>
              <h2 className="font-display text-sm font-bold tracking-tight text-stone-900">Espace parent</h2>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="lg:hidden p-2 rounded-xl hover:bg-stone-100 transition-colors text-stone-600 min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
              aria-label="Fermer le menu"
            >
              <FiX className="w-4 h-4" aria-hidden />
            </button>
          </div>

          <nav className="dash-sidebar-scroll flex-1 overflow-y-auto overscroll-contain px-2 py-2 space-y-1 min-h-0 text-xs leading-snug">
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
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium transition-all min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                    isActive
                      ? `bg-gradient-to-r ${item.color} text-white shadow-md ring-1 ring-white/20`
                      : isDisabled
                        ? 'text-stone-400 cursor-not-allowed bg-stone-50/80'
                        : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
                  }`}
                  title={isDisabled ? 'Sélectionnez d’abord un enfant' : item.label}
                >
                  <Icon
                    className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                      isDisabled
                        ? 'text-slate-400'
                        : isActive
                          ? 'text-white scale-105'
                          : inactiveModuleIconClass(item.color)
                    }`}
                  />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" aria-hidden />}
                </button>
              );
            })}
          </nav>

          {selectedChild && (
            <div className="px-2.5 py-2.5 border-t border-stone-200/80 bg-amber-50/60 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse shrink-0 ring-2 ring-emerald-500/30" aria-hidden />
                <p className="text-xs font-semibold text-stone-800">Enfant sélectionné</p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default ParentSidebar;
