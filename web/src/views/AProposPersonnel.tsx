'use client';

import Image from 'next/image';
import Link from 'next/link';
import AboutPageFrame from '../components/public/AboutPageFrame';
import AboutMediaCard from '../components/public/AboutMediaCard';
import HomeReveal from '../components/public/HomeReveal';
import HomePageImage from '../components/public/HomePageImage';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';
import { ABOUT_STAFF_CATEGORIES, ABOUT_STAFF_ROLES } from '@/data/schoolAbout';
import { resolveDirectorMessageContent } from '@/lib/homeDirectorMessage';

const DEFAULT_DIRECTOR_PHOTO = '/home/directrice-etudes.jpg';

export default function AProposPersonnel() {
  const { branding, studiesDirectorPhotoAbsolute } = useAppBranding();
  const director = resolveDirectorMessageContent(branding);
  const schoolName =
    branding.schoolDisplayName?.trim() || branding.appTitle?.trim() || SCHOOL_DEFAULTS.fullName;
  const directorPhoto = studiesDirectorPhotoAbsolute ?? DEFAULT_DIRECTOR_PHOTO;
  const useCustomDirectorPhoto = Boolean(studiesDirectorPhotoAbsolute);

  const members = ABOUT_STAFF_ROLES.map((role, index) =>
    index === 0 && director.name
      ? {
          ...role,
          title: director.name,
          text: director.role,
          image: directorPhoto,
          imageAlt: `Portrait de ${director.name}`,
          useNativeImg: useCustomDirectorPhoto,
        }
      : { ...role, useNativeImg: false }
  );

  return (
    <AboutPageFrame
      navLabel="Le personnel"
      title="Notre équipe"
      description={`À ${schoolName}, la réussite de chaque élève repose sur une équipe pédagogique et administrative engagée, compétente et disponible.`}
      heroSlot="homeRoleAdmin"
      heroDefaultPath="/home/role-admin.jpg"
      heroImageAlt={`Équipe éducative de ${schoolName}`}
      heroKicker="Communauté éducative"
    >
      <HomeReveal>
        <div className="overflow-hidden rounded-[2rem] bg-[#07081a] text-white ring-1 ring-white/10 lg:grid lg:grid-cols-12">
          <div className="relative min-h-[260px] lg:col-span-5 lg:min-h-[380px]">
            {useCustomDirectorPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={directorPhoto}
                alt={`Portrait de ${director.name}`}
                className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
              />
            ) : (
              <Image
                src={DEFAULT_DIRECTOR_PHOTO}
                alt={`Portrait de ${director.name}`}
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-transparent to-transparent" />
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 lg:col-span-7">
            <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
              Direction pédagogique
            </span>
            <h2 className="mt-3 font-display text-3xl font-semibold">{director.name}</h2>
            <p className="mt-1 text-sm text-stone-300">{director.role}</p>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-stone-200">
              Ensemble, nous formons une communauté éducative soudée, animée par une mission commune :
              offrir une éducation de qualité, un cadre de vie épanouissant et un accompagnement
              personnalisé à chaque élève pour l’aider à construire son avenir.
            </p>
          </div>
        </div>
      </HomeReveal>

      <section className="mt-14">
        <HomeReveal>
          <h2 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">
            Les piliers de l’équipe
          </h2>
          <div className="home-section-accent mx-0 mt-4" aria-hidden />
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {ABOUT_STAFF_CATEGORIES.map((category) => (
              <AboutMediaCard
                key={category.title}
                src={category.image}
                alt={category.imageAlt}
                slot={'slot' in category ? category.slot : undefined}
                title={category.title}
                text={category.text}
                minHeightClass="min-h-[22rem]"
              />
            ))}
          </div>
        </HomeReveal>
      </section>

      <section className="mt-16">
        <HomeReveal>
          <h2 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">
            Quelques fonctions de notre équipe
          </h2>
          <div className="home-section-accent mx-0 mt-4" aria-hidden />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member) => (
              <article
                key={member.title}
                className="group overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_48px_-28px_rgba(7,8,26,0.4)] ring-1 ring-stone-200/80"
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {member.useNativeImg ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.image}
                      alt={member.imageAlt}
                      className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  ) : 'slot' in member && member.slot ? (
                    <HomePageImage
                      slot={member.slot}
                      defaultPath={member.image}
                      alt={member.imageAlt}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  ) : (
                    <Image
                      src={member.image}
                      alt={member.imageAlt}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-[#07081a]/20 to-transparent" />
                </div>
                <div className="-mt-16 relative z-10 px-5 pb-6 text-white">
                  <h3 className="font-display text-lg font-semibold">{member.title}</h3>
                  <p className="mt-1 text-sm text-stone-300">{member.text}</p>
                </div>
              </article>
            ))}
          </div>
        </HomeReveal>
      </section>

      <p className="mt-12 text-center">
        <Link
          href="/contact"
          className="inline-flex rounded-2xl bg-[#07081a] px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-stone-800"
        >
          Contacter l’établissement
        </Link>
      </p>
    </AboutPageFrame>
  );
}
