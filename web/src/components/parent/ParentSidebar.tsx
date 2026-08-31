import { FiX } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { PARENT_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
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
  selectedChildLabel?: string | null;
  isOpen: boolean;
  onToggle: () => void;
}

type NavGroup = {
  title: string | null;
  ids: string[];
};

export default function ParentSidebar({
  items,
  activeTab,
  onTabChange,
  selectedChild,
  selectedChildLabel,
  isOpen,
  onToggle,
}: ParentSidebarProps) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const grouped: NavGroup[] = [
    { title: null, ids: ['overview'] },
    ...PARENT_MODULE_CATEGORIES.map((category) => ({
      title: category.title,
      ids: category.moduleIds,
    })),
  ];
  const seen = new Set(grouped.flatMap((group) => group.ids));
  const leftover = items.filter((item) => !seen.has(item.id)).map((item) => item.id);
  if (leftover.length > 0) {
    grouped.push({ title: 'Autres', ids: leftover });
  }

  const renderItem = (item: ParentNavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const isDisabled = item.requiresChild && !selectedChild;

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => {
          if (isDisabled) return;
          onTabChange(item.id);
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            onToggle();
          }
        }}
        disabled={isDisabled}
        className={`flex min-h-[38px] w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cptb-gold/40 ${
          isActive
            ? `bg-gradient-to-r ${item.color} text-white shadow-sm`
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
        {isActive ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cptb-gold" aria-hidden /> : null}
      </button>
    );
  };

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
          transition-[transform,visibility] duration-300 ease-premium
          max-lg:fixed max-lg:left-0 max-lg:top-0 max-lg:z-[60]
          max-lg:h-dvh max-lg:max-h-dvh max-lg:w-[min(16rem,calc(100vw-2rem))]
          max-lg:overflow-hidden
          lg:w-64
          dash-sticky-under-header dash-h-under-header
          lg:sticky lg:left-auto lg:translate-x-0 lg:self-start
          ${
            isOpen
              ? 'max-lg:translate-x-0 max-lg:visible'
              : 'max-lg:-translate-x-full max-lg:invisible max-lg:pointer-events-none'
          }`}
        aria-label="Navigation espace parent"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">Famille</p>
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

          <nav className="dash-sidebar-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 text-xs leading-snug">
            {grouped.map((group) => (
              <div key={group.title ?? 'overview'} className="mb-2.5">
                {group.title ? (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
                    {group.title}
                  </p>
                ) : null}
                <div className="space-y-0.5">
                  {group.ids.map((id) => {
                    const item = byId.get(id);
                    return item ? renderItem(item) : null;
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="shrink-0 border-t border-white/10 bg-white/[0.04] px-2.5 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">Profil suivi</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  selectedChild
                    ? 'animate-pulse bg-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-zinc-500'
                }`}
                aria-hidden
              />
              <p className="truncate text-xs font-semibold text-white/90">
                {selectedChildLabel || (selectedChild ? 'Enfant sélectionné' : 'Aucun enfant')}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
