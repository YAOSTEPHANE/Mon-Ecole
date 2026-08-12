'use client';

/** Placeholder léger pendant le chargement d’un onglet code-split. */
export default function DashboardTabLoading() {
  return (
    <div className="flex items-center justify-center py-16" role="status" aria-live="polite">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-amber-600 border-b-transparent" />
      <span className="sr-only">Chargement du module…</span>
    </div>
  );
}
