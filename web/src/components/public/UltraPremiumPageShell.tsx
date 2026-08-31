'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FiArrowLeft } from 'react-icons/fi';
import Footer from '../Footer';
import HomePageImage from './HomePageImage';
import PublicSectionsReveal from './PublicSectionsReveal';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { resolveSchoolDisplayName } from '@/lib/resolveSchoolBranding';
import type { HomePageImageSlot } from '@/lib/homePageImages.types';

type UltraPremiumPageShellProps = {
  /** Court libellé affiché à droite du bandeau (ex. « Support », « Légal »). */
  navLabel: string;
  title: string;
  description: string;
  children: React.ReactNode;
  heroVariant?: 'classic' | 'cinematic';
  heroSlot?: HomePageImageSlot;
  heroDefaultPath?: string;
  heroImageAlt?: string;
  heroSize?: 'md' | 'lg';
  heroCutout?: boolean;
  heroKicker?: string;
  bodyClassName?: string;
};

/**
 * En-tête sticky, héros sombre (glow + grain) et pied de page — langage visuel aligné sur l’accueil.
 */
export default function UltraPremiumPageShell({
  navLabel,
  title,
  description,
  children,
  heroVariant = 'classic',
  heroSlot,
  heroDefaultPath,
  heroImageAlt = '',
  heroSize = 'md',
  heroCutout = false,
  heroKicker,
  bodyClassName = '',
}: UltraPremiumPageShellProps) {
  const { branding, navigationLogoAbsolute } = useAppBranding();
  const appTitle = resolveSchoolDisplayName(branding);
  const cinematic = heroVariant === 'cinematic' && Boolean(heroDefaultPath);
  const heightClass =
    heroSize === 'lg'
      ? 'min-h-[min(64svh,32rem)] sm:min-h-[min(76vh,42rem)] lg:min-h-[min(82vh,46rem)]'
      : 'min-h-[min(42svh,22rem)] sm:min-h-[min(52vh,28rem)] lg:min-h-[min(56vh,32rem)]';

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

      <PublicSectionsReveal extraSelector=".public-page-body > *">
      {cinematic ? (
        <section className={`home-hero-shell home-hero-shell--cinematic relative isolate overflow-hidden text-white ${heightClass}`}>
          <div className="absolute inset-0" aria-hidden>
            {heroSlot ? (
              <HomePageImage
                slot={heroSlot}
                defaultPath={heroDefaultPath!}
                alt=""
                fill
                className="home-hero-bg-image object-cover scale-[1.04]"
                sizes="100vw"
                priority
              />
            ) : (
              <Image
                src={heroDefaultPath!}
                alt=""
                fill
                priority
                className="home-hero-bg-image object-cover scale-[1.04]"
                sizes="100vw"
              />
            )}
          </div>
          <div className="about-hero-veil absolute inset-0" aria-hidden />
          <div className="page-hero-v2__noise pointer-events-none absolute inset-0 opacity-20" aria-hidden />
          <div
            className="home-hero-orb home-hero-orb--drift-a absolute -left-28 top-10 h-[min(28rem,50vw)] w-[min(28rem,50vw)] bg-cptb-blue/16"
            aria-hidden
          />
          <div
            className="home-hero-orb home-hero-orb--drift-b absolute -right-24 bottom-8 h-[min(22rem,42vw)] w-[min(22rem,42vw)] bg-tran-mustard-500/12"
            aria-hidden
          />
          {heroCutout ? (
            <div className="pointer-events-none absolute inset-y-0 right-0 z-[8] hidden w-[min(46%,36rem)] lg:block">
              <div className="relative isolate h-full w-full">
                <Image
                  src="/home/hero-students-cutout.png"
                  alt=""
                  fill
                  unoptimized
                  className="object-contain object-right-bottom drop-shadow-[0_28px_40px_rgba(0,0,0,0.5)]"
                  sizes="(min-width: 1024px) 36rem, 0px"
                  priority
                />
              </div>
            </div>
          ) : null}
          <div className={`relative z-10 mx-auto flex ${heightClass} max-w-7xl flex-col justify-end px-4 pb-16 pt-12 sm:px-6 sm:pb-20 lg:justify-center lg:pb-24`}>
            <div className="max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
                {heroKicker || navLabel}
              </p>
              <h1 className="mt-3 font-display text-[1.85rem] font-semibold tracking-tight text-white [overflow-wrap:anywhere] sm:text-5xl lg:text-[3.4rem] lg:leading-[1.02]">
                {title}
              </h1>
              <div className="mt-5 h-0.5 w-16 rounded-full bg-gradient-to-r from-cptb-gold via-amber-200 to-transparent" />
              <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-200/95 sm:text-lg">
                {description}
              </p>
            </div>
          </div>
          {heroImageAlt ? <span className="sr-only">{heroImageAlt}</span> : null}
        </section>
      ) : (
        <section className="relative overflow-hidden bg-[#07081a] text-white">
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f2e] via-[#001270] to-[#07081a]" aria-hidden />
          <div className="page-hero-v2__glow absolute inset-0" aria-hidden />
          <div className="page-hero-v2__noise absolute inset-0 opacity-45" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/50 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cptb-gold/35 to-transparent" />
          <div className="relative mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-20">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-cptb-gold/90 sm:tracking-[0.22em]">
              {navLabel}
            </p>
            <h1 className="font-display text-[1.75rem] font-semibold tracking-tight [overflow-wrap:anywhere] sm:text-4xl md:text-5xl lg:text-[3.25rem]">
              {title}
            </h1>
            <div className="mx-auto mt-5 h-0.5 w-16 rounded-full bg-gradient-to-r from-cptb-blue via-cptb-gold to-amber-300" />
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-stone-300 sm:text-xl">
              {description}
            </p>
          </div>
        </section>
      )}

      <div className={`public-page-body relative z-10 ${bodyClassName}`}>{children}</div>

      <Footer />
      </PublicSectionsReveal>
    </div>
  );
}
