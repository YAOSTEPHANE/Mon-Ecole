/**
 * Typographie et grilles pour les modules admin (sidebar).
 * Style Insights : cartes blanches, pills navy, onglets discrets.
 */
export const ADM = {
  root: 'space-y-6 text-sm min-w-0 max-w-full animate-dash-enter',
  section: 'space-y-5',
  h2: 'font-display text-base font-bold tracking-tight text-stone-900 sm:text-lg',
  intro: 'text-xs font-medium text-stone-500 mt-1.5 leading-relaxed max-w-3xl',
  tabRow:
    'flex flex-nowrap sm:flex-wrap gap-1 overflow-x-auto sm:overflow-visible scrollbar-hide rounded-full bg-[#f4f5f9] p-1 ring-1 ring-[#e4e8f2]',
  tabIcon: 'w-3.5 h-3.5 shrink-0 opacity-90',
  /** `activeClass` conservé pour compatibilité — l’état actif est navy. */
  tabBtn: (active: boolean, _activeClass?: string) =>
    `inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${
      active
        ? 'bg-[#0018A8] text-white shadow-sm'
        : 'text-stone-500 hover:bg-white hover:text-stone-800'
    }`,
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5',
  grid5: 'grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5',
  grid6: 'grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5',
  statCard:
    'premium-surface p-4 sm:p-5',
  statLabel: 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500',
  statVal: 'font-display text-2xl font-bold text-stone-900 mt-1.5 tabular-nums leading-none tracking-tight',
  statValTone: 'font-display text-2xl font-bold mt-1.5 tabular-nums leading-none tracking-tight',
  statHint: 'text-[11px] font-medium text-stone-500 mt-1.5 leading-snug',
  olSm: 'text-[11px] text-stone-700 mt-2 space-y-1 list-decimal list-inside leading-snug',
  helpCard:
    'premium-surface p-5',
  helpTitle: 'font-display text-sm font-bold text-stone-900 mb-2',
  helpOl: 'text-xs text-stone-700 space-y-1.5 list-decimal list-inside leading-relaxed',
  helpUl: 'text-xs text-stone-600 space-y-1.5 list-disc list-inside leading-relaxed',
  pageRoot: 'space-y-6 text-sm min-w-0 max-w-full animate-dash-enter',
  heroTitle: 'font-display text-xl sm:text-2xl font-bold tracking-tight leading-tight',
  heroSub: 'text-sm font-medium text-stone-500 leading-relaxed mt-1.5',
  heroStatNum: 'font-display text-xl font-bold tabular-nums tracking-tight',
  heroStatLbl: 'text-[11px] font-semibold uppercase tracking-wider opacity-90',
  bigTabRow: 'flex items-center gap-1 overflow-x-auto scrollbar-hide pb-1 -mx-0.5 px-0.5 touch-pan-x overscroll-x-contain rounded-full bg-[#f4f5f9] p-1 ring-1 ring-[#e4e8f2]',
  bigTabBtn: (active: boolean, _activeGradient?: string) =>
    `relative flex items-center gap-2 px-3.5 py-2 rounded-full font-semibold text-xs transition-all duration-200 whitespace-nowrap ${
      active
        ? 'bg-[#0018A8] text-white shadow-sm'
        : 'text-stone-500 hover:bg-white hover:text-stone-800'
    }`,
  bigTabIcon: 'w-4 h-4 shrink-0',
  /** Panneau principal module */
  modulePanel:
    'premium-surface',
  modulePanelBody: 'p-4 sm:p-6',
} as const;
