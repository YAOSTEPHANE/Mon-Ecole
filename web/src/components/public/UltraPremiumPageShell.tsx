'use client';

import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Footer from '../Footer';

type UltraPremiumPageShellProps = {
  /** Court libellé affiché à droite du bandeau (ex. « Support », « Légal »). */
  navLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

/**
 * En-tête sticky, héros sombre (glow + grain) et pied de page — langage visuel aligné sur l’accueil v2.
 */
export default function UltraPremiumPageShell({
  navLabel,
  title,
  description,
  children,
}: UltraPremiumPageShellProps) {
  return (
    <div className="premium-body premium-body-v2 min-h-screen text-stone-900 antialiased">
      <header className="glass-nav glass-nav-v2 sticky top-0 z-30 shadow-nav-elevated">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href="/home"
            className="-ml-1 inline-flex items-center gap-2 rounded-lg px-1 text-sm font-semibold text-amber-900/90 transition-colors hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
          >
            <FiArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            Accueil
          </Link>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{navLabel}</span>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-b from-[#0a0f2e] via-[#001270] to-zinc-950 text-white">
        <div className="page-hero-v2__glow absolute inset-0" aria-hidden />
        <div className="page-hero-v2__noise absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/45 to-transparent" />
        <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-16">
          <h1 className="font-display text-4xl font-black tracking-tight md:text-5xl">{title}</h1>
          <div className="mx-auto mt-4 h-0.5 w-14 rounded-full bg-gradient-to-r from-cptb-blue via-cptb-gold to-amber-300" />
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-stone-300 sm:text-xl">
            {description}
          </p>
        </div>
      </section>

      <div className="relative z-10 animate-dash-enter">{children}</div>

      <Footer />
    </div>
  );
}
