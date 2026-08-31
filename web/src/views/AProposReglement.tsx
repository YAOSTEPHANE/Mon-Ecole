'use client';

import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import AboutPageFrame from '../components/public/AboutPageFrame';
import HomeReveal from '../components/public/HomeReveal';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';
import { ABOUT_REGLEMENT_CHAPTERS, ABOUT_REGLEMENT_META } from '@/data/schoolAbout';
import { parseRulebookContent } from '@/lib/rulebookContent';
import { publicApi } from '@/services/api/public';

function ReglementChapterSection({
  chapter,
  index,
}: {
  chapter: (typeof ABOUT_REGLEMENT_CHAPTERS)[number];
  index: number;
}) {
  return (
    <HomeReveal>
      <section className="overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-[#fbf8f1] shadow-[0_24px_48px_-28px_rgba(7,8,26,0.28)]">
        <div className="flex items-stretch">
          <div
            className="hidden w-2 bg-gradient-to-b from-tran-mustard-400 to-[#07081a] sm:block"
            aria-hidden
          />
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
                <article key={`${chapter.title}-${article.heading}`}>
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
  );
}

export default function AProposReglement() {
  const { branding } = useAppBranding();
  const schoolName =
    branding.schoolDisplayName?.trim() || branding.appTitle?.trim() || SCHOOL_DEFAULTS.fullName;

  const { data: publishedRulebook, isLoading } = useQuery({
    queryKey: ['public-discipline-rulebook'],
    queryFn: publicApi.getDisciplineRulebook,
    staleTime: 60_000,
  });

  const parsedPublished = publishedRulebook?.content
    ? parseRulebookContent(publishedRulebook.content)
    : null;

  const meta = {
    republic: parsedPublished?.meta.republic ?? ABOUT_REGLEMENT_META.republic,
    motto: parsedPublished?.meta.motto ?? ABOUT_REGLEMENT_META.motto,
    ministry: parsedPublished?.meta.ministry ?? ABOUT_REGLEMENT_META.ministry,
    year:
      parsedPublished?.meta.year ??
      publishedRulebook?.academicYear ??
      branding.currentAcademicYear ??
      ABOUT_REGLEMENT_META.year,
  };

  const chapters =
    parsedPublished && parsedPublished.chapters.length > 0
      ? parsedPublished.chapters
      : !parsedPublished?.plainText
        ? ABOUT_REGLEMENT_CHAPTERS
        : [];

  const plainTextBody = parsedPublished?.plainText;
  const documentTitle = publishedRulebook?.title?.trim() || 'Règlement intérieur';

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
              {meta.republic}
            </p>
            <p className="mt-2 text-sm font-medium text-stone-300">{meta.motto}</p>
            <p className="mt-4 text-sm text-stone-300">{meta.ministry}</p>
            <h2 className="mt-6 font-display text-2xl font-semibold sm:text-4xl">
              {documentTitle} de {schoolName}
            </h2>
            <p className="mt-3 text-sm text-stone-300">Année scolaire {meta.year}</p>
            {publishedRulebook ? (
              <p className="mt-2 text-xs text-tran-mustard-200/90">
                Version publiée — mise à jour le{' '}
                {new Date(publishedRulebook.updatedAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            ) : null}
          </div>
        </header>
      </HomeReveal>

      {isLoading ? (
        <p className="mt-10 text-center text-sm text-stone-500">Chargement du règlement…</p>
      ) : null}

      <div className="mt-10 space-y-8">
        {plainTextBody ? (
          <HomeReveal>
            <section className="overflow-hidden rounded-[1.75rem] border border-stone-200/70 bg-[#fbf8f1] p-6 sm:p-9 shadow-[0_24px_48px_-28px_rgba(7,8,26,0.28)]">
              <div className="whitespace-pre-wrap leading-relaxed text-stone-700">{plainTextBody}</div>
            </section>
          </HomeReveal>
        ) : (
          chapters.map((chapter, index) => (
            <ReglementChapterSection key={chapter.title} chapter={chapter} index={index} />
          ))
        )}
      </div>

      <p className="mt-10 text-center text-xs text-stone-500">
        Document de référence de {schoolName} — à diffuser auprès de la communauté éducative.
        {!publishedRulebook && !isLoading ? (
          <span className="block mt-1 text-stone-400">
            Contenu par défaut (aucune version publiée en administration).
          </span>
        ) : null}
      </p>
    </AboutPageFrame>
  );
}
