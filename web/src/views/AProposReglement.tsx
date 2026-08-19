'use client';

import Image from 'next/image';
import AboutPageFrame from '../components/public/AboutPageFrame';
import HomeReveal from '../components/public/HomeReveal';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';
import { ABOUT_REGLEMENT_CHAPTERS, ABOUT_REGLEMENT_META } from '@/data/schoolAbout';

export default function AProposReglement() {
  const { branding } = useAppBranding();
  const schoolName =
    branding.schoolDisplayName?.trim() || branding.appTitle?.trim() || SCHOOL_DEFAULTS.fullName;

  return (
    <AboutPageFrame
      navLabel="Règlement intérieur"
      title="Règlement intérieur"
      description={`Le cadre de vie et de travail de ${schoolName}, partagé avec toute la communauté éducative.`}
      heroDefaultPath="/home/gallery-assembly.jpg"
      heroImageAlt="Cadre de vie scolaire"
      heroKicker="Document officiel"
    >
      <HomeReveal>
        <header className="relative overflow-hidden rounded-[2rem] min-h-[16rem] text-white">
          <Image
            src="/home/pillar-security.jpg"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#07081a]/78" />
          <div className="relative z-10 px-6 py-10 text-center sm:px-12 sm:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
              {ABOUT_REGLEMENT_META.republic}
            </p>
            <p className="mt-2 text-sm font-medium text-stone-300">{ABOUT_REGLEMENT_META.motto}</p>
            <p className="mt-4 text-sm text-stone-300">{ABOUT_REGLEMENT_META.ministry}</p>
            <h2 className="mt-6 font-display text-2xl font-semibold sm:text-4xl">
              Règlement intérieur de {schoolName}
            </h2>
            <p className="mt-3 text-sm text-stone-300">Année scolaire {ABOUT_REGLEMENT_META.year}</p>
          </div>
        </header>
      </HomeReveal>

      <div className="mt-10 space-y-8">
        {ABOUT_REGLEMENT_CHAPTERS.map((chapter, index) => (
          <HomeReveal key={chapter.title}>
            <section className="overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-[#fbf8f1] shadow-[0_24px_48px_-28px_rgba(7,8,26,0.28)]">
              <div className="flex items-stretch">
                <div className="hidden w-2 bg-gradient-to-b from-tran-mustard-400 to-[#07081a] sm:block" aria-hidden />
                <div className="flex-1 p-6 sm:p-9">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tran-mustard-800">
                    Chapitre {String(index + 1).padStart(2, '0')}
                  </p>
                  <h2 className="mt-2 font-display text-xl font-semibold text-stone-900 sm:text-2xl">
                    {chapter.title}
                  </h2>
                  {chapter.intro ? (
                    <p className="mt-3 text-sm italic text-stone-500">{chapter.intro}</p>
                  ) : null}
                  <div className="mt-6 space-y-6">
                    {chapter.articles.map((article) => (
                      <article key={article.heading}>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-[#1a1464]">
                          {article.heading}
                        </h3>
                        <p className="mt-1.5 leading-relaxed text-stone-600">{article.body}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </HomeReveal>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-stone-500">
        Document de référence de {schoolName} — à diffuser auprès de la communauté éducative.
      </p>
    </AboutPageFrame>
  );
}
