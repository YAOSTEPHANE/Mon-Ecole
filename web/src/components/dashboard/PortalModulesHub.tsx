'use client';

import { useMemo, useState } from 'react';
import Card from '../ui/Card';
import { FiSearch, FiArrowRight, FiX } from 'react-icons/fi';

export type PortalModuleTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
};

export type PortalModuleCategory = {
  title: string;
  hint?: string;
  moduleIds: string[];
};

type PortalModulesHubProps = {
  allTabs: PortalModuleTab[];
  categories: PortalModuleCategory[];
  onNavigate: (tabId: string) => void;
  title?: string;
  subtitle?: string;
  excludeIds?: string[];
  embedded?: boolean;
};

export default function PortalModulesHub({
  allTabs,
  categories,
  onNavigate,
  title = 'Annuaire des modules',
  subtitle = 'Accès rapide à toutes les fonctions, groupées par domaine. Filtrez par nom ou mot-clé.',
  excludeIds = [],
  embedded = false,
}: PortalModulesHubProps) {
  const [q, setQ] = useState('');
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds]);

  const byId = useMemo(
    () => new Map(allTabs.filter((t) => !exclude.has(t.id)).map((t) => [t.id, t])),
    [allTabs, exclude],
  );

  const normalizedQ = q.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    const match = (t: PortalModuleTab) => {
      if (!normalizedQ) return true;
      const blob = `${t.id} ${t.label} ${t.description}`.toLowerCase();
      return blob.includes(normalizedQ);
    };
    return categories
      .map((cat) => {
        const modules = cat.moduleIds
          .map((id) => byId.get(id))
          .filter((t): t is PortalModuleTab => Boolean(t))
          .filter(match);
        return { ...cat, modules };
      })
      .filter((c) => c.modules.length > 0);
  }, [byId, categories, normalizedQ]);

  const showEmptySearch = Boolean(normalizedQ) && filteredCategories.length === 0;

  return (
    <section
      className={embedded ? 'space-y-5' : 'dash-section-panel space-y-5'}
      aria-labelledby="portal-modules-hub-title"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="portal-modules-hub-title"
            className="font-display text-base font-bold tracking-tight text-stone-900 sm:text-lg"
          >
            {title}
          </h3>
          <div className="mt-2 h-0.5 w-12 rounded-full bg-[#0018A8]" />
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-stone-600">{subtitle}</p>
        </div>
        <div className="relative w-full sm:w-72">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
            aria-hidden
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un module…"
            aria-label="Filtrer les modules"
            className="dash-search-field w-full rounded-xl py-2.5 pl-10 pr-10 text-sm text-stone-900 placeholder:text-stone-400"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35"
              aria-label="Effacer la recherche"
            >
              <FiX className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      {showEmptySearch ? (
        <div
          className="premium-empty"
          role="status"
        >
          <p className="text-sm font-semibold text-stone-800">Aucun module ne correspond</p>
          <p className="text-sm text-stone-600 mt-2 max-w-md mx-auto">
            Essayez un autre mot-clé ou effacez la recherche pour tout réafficher.
          </p>
          <button
            type="button"
            onClick={() => setQ('')}
            className="mt-4 text-sm font-semibold text-[#0018A8] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 rounded"
          >
            Réinitialiser la recherche
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCategories.map((cat) => (
            <div key={cat.title}>
              <div className="mb-3 flex items-baseline gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">{cat.title}</h4>
                {cat.hint ? (
                  <span className="hidden text-xs text-stone-400 sm:inline">{cat.hint}</span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cat.modules.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onNavigate(t.id)}
                      className="dash-action-tile group rounded-[1.25rem] border border-[#e4e8f2] bg-white text-left shadow-[0_12px_32px_-20px_rgba(28,39,76,0.28)] transition-all duration-200 hover:border-[#c5cfe4] hover:shadow-[0_16px_36px_-18px_rgba(28,39,76,0.32)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0018A8]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#f6f7fb]"
                    >
                      <Card hover={false} className="border-0 bg-transparent p-3.5 shadow-none sm:p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${t.color} text-white`}
                          >
                            <Icon className="h-[18px] w-[18px]" aria-hidden />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold leading-snug text-stone-900">{t.label}</span>
                              <FiArrowRight
                                className="mt-0.5 h-4 w-4 shrink-0 -translate-x-0.5 text-[#0018A8] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                                aria-hidden
                              />
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-600">
                              {t.description}
                            </p>
                          </div>
                        </div>
                      </Card>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
