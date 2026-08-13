/**
 * Typographie et grilles premium pour les modules admin (sidebar).
 * Style aligné sur le design system dashboard/premium — ultra-premium v3.
 */
export const ADM = {
  root: 'space-y-6 text-sm min-w-0 max-w-full animate-dash-enter',
  section: 'space-y-5',
  h2: 'font-display text-base font-bold tracking-tight text-stone-900 sm:text-lg',
  intro: 'text-xs font-medium text-stone-500 mt-1.5 leading-relaxed max-w-3xl',
  tabRow:
    'flex flex-nowrap sm:flex-wrap gap-1.5 overflow-x-auto sm:overflow-visible scrollbar-hide rounded-2xl bg-gradient-to-b from-stone-100/95 to-stone-50/90 p-1.5 ring-1 ring-stone-200/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.85)] backdrop-blur-sm',
  tabIcon: 'w-3.5 h-3.5 shrink-0 opacity-90',
  tabBtn: (active: boolean, activeClass: string) =>
    `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ease-premium ${
      active
        ? `${activeClass} text-white shadow-md shadow-black/10 ring-1 ring-white/25`
        : 'text-stone-600 hover:bg-white/90 hover:text-stone-900 hover:shadow-sm'
    }`,
  grid3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5',
  grid4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5',
  grid5: 'grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5',
  grid6: 'grid grid-cols-1 min-[380px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5',
  statCard:
    'relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl p-4 sm:p-5 shadow-dash-card ring-1 ring-stone-200/70 transition-all duration-300 ease-premium hover:shadow-dash-card-hover hover:-translate-y-0.5',
  statLabel: 'text-[10px] font-bold uppercase tracking-[0.14em] text-stone-500',
  statVal: 'font-display text-2xl font-bold text-stone-900 mt-1.5 tabular-nums leading-none tracking-tight',
  statValTone: 'font-display text-2xl font-bold mt-1.5 tabular-nums leading-none tracking-tight',
  statHint: 'text-[11px] font-medium text-stone-500 mt-1.5 leading-snug',
  olSm: 'text-[11px] text-stone-700 mt-2 space-y-1 list-decimal list-inside leading-snug',
  helpCard:
    'rounded-2xl border border-amber-200/25 bg-gradient-to-br from-white via-stone-50/90 to-amber-50/40 p-5 shadow-dash-card ring-1 ring-stone-200/50',
  helpTitle: 'font-display text-sm font-bold text-stone-900 mb-2',
  helpOl: 'text-xs text-stone-700 space-y-1.5 list-decimal list-inside leading-relaxed',
  helpUl: 'text-xs text-stone-600 space-y-1.5 list-disc list-inside leading-relaxed',
  pageRoot: 'space-y-6 text-sm min-w-0 max-w-full animate-dash-enter',
  heroTitle: 'font-display text-xl sm:text-2xl font-bold tracking-tight leading-tight',
  heroSub: 'text-sm font-medium text-stone-500 leading-relaxed mt-1.5',
  heroStatNum: 'font-display text-xl font-bold tabular-nums tracking-tight',
  heroStatLbl: 'text-[11px] font-semibold uppercase tracking-wider opacity-90',
  bigTabRow: 'flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-0.5 px-0.5 touch-pan-x overscroll-x-contain',
  bigTabBtn: (active: boolean, activeGradient: string) =>
    `relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all duration-300 ease-premium whitespace-nowrap ${
      active
        ? `${activeGradient} text-white shadow-lg shadow-black/15 ring-1 ring-white/30`
        : 'text-stone-600 hover:bg-white/90 hover:text-stone-900 ring-1 ring-transparent hover:ring-stone-200/80 hover:shadow-sm'
    }`,
  bigTabIcon: 'w-4 h-4 shrink-0',
  /** Panneau principal module */
  modulePanel:
    'rounded-2xl bg-white/92 backdrop-blur-xl shadow-dash-card ring-1 ring-stone-200/70 overflow-hidden transition-shadow duration-300 hover:shadow-dash-card-hover',
  modulePanelBody: 'p-4 sm:p-6',
} as const;
