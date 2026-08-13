'use client';

import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Footer from '../Footer';
import { useAppBranding } from '@/contexts/AppBrandingContext';

type UltraPremiumPageShellProps = {
  /** Court libellé affiché à droite du bandeau (ex. « Support », « Légal »). */
  navLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

/**
 * En-tête sticky, héros sombre (glow + grain) et pied de page — langage visuel aligné sur l’accueil.
 */
export default function UltraPremiumPageShell({
  navLabel,
  title,
  description,
  children,
}: UltraPremiumPageShellProps) {
  const { branding, navigationLogoAbsolute } = useAppBranding();
  const appTitle = (branding.appTitle && branding.appTitle.trim()) || 'Mon Ecole';

  return (
    <div className="premium-body premium-body-v2 premium-body-v3 min-h-screen text-stone-900 antialiased">
      <header className="glass-nav glass-nav-v2 sticky top-0 z-30 shadow-nav-elevated">
        <div className="h-0.5 w-full bg-gradient-to-r from-cptb-blue via-cptb-gold to-cptb-blue" aria-hidden />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/home"
            className="-ml-1 inline-flex items-center gap-2.5 rounded-lg px-1 text-sm font-semibold text-stone-800 transition-colors hover:text-cptb-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cptb-gold/45"
          >
            <FiArrowLeft className="h-4 w-4 shrink-0 text-cptb-gold" aria-hidden />
            <span className="hidden sm:inline">Accueil</span>
            {navigationLogoAbsolute ? (
              <img
                src={navigationLogoAbsolute}
                alt=""
                className="h-7 w-auto max-w-[7rem] object-contain"
              />
            ) : (
              <span className="font-display tracking-[0.08em]">{appTitle}</span>
            )}
          </Link>
          <span className="rounded-full border border-cptb-gold/25 bg-amber-50/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-600">
            {navLabel}
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-[#07081a] text-white">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f2e] via-[#001270] to-[#07081a]" aria-hidden />
        <div className="page-hero-v2__glow absolute inset-0" aria-hidden />
        <div className="page-hero-v2__noise absolute inset-0 opacity-45" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/35 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-cptb-gold/90">{navLabel}</p>
          <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl lg:text-[3.25rem]">{title}</h1>
          <div className="mx-auto mt-5 h-0.5 w-16 rounded-full bg-gradient-to-r from-cptb-blue via-cptb-gold to-amber-300" />
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-300 sm:text-xl">
            {description}
          </p>
        </div>
      </section>

      <div className="relative z-10 animate-dash-enter">{children}</div>

      <Footer />
    </div>
  );
}
