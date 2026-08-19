'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FiCheck, FiMapPin } from 'react-icons/fi';
import AboutPageFrame from '../components/public/AboutPageFrame';
import AboutMediaCard from '../components/public/AboutMediaCard';
import HomeReveal from '../components/public/HomeReveal';
import HomePageImage from '../components/public/HomePageImage';
import PreInscriptionSchoolEntry from '../components/public/PreInscriptionSchoolEntry';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { usePublicSchools } from '@/hooks/usePublicSchools';
import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';
import { ABOUT_CAMPUS_PHOTOS, ABOUT_CYCLES } from '@/data/schoolAbout';
import { resolveSchoolContactInfo } from '@/lib/schoolContact';

export default function AProposEtablissements() {
  const { branding } = useAppBranding();
  const contact = resolveSchoolContactInfo(branding);
  const { schools, loading } = usePublicSchools();
  const schoolName =
    branding.schoolDisplayName?.trim() || branding.appTitle?.trim() || SCHOOL_DEFAULTS.fullName;
  const listedSchools =
    schools.length > 0
      ? schools
      : [{ id: 'default', name: schoolName, slug: 'default', shortName: schoolName }];

  return (
    <AboutPageFrame
      navLabel="Nos établissements"
      title="Nos établissements"
      description={`${schoolName} propose un enseignement de qualité, de la maternelle aux formations supérieures, dans un cadre exigeant et humain.`}
      heroSlot="homeSplitCampus"
      heroDefaultPath="/home/split-campus.jpg"
      heroImageAlt={`Campus de ${schoolName}`}
      heroKicker="Campus & cycles"
    >
      <HomeReveal>
        {loading ? (
          <p className="text-center text-sm text-stone-500">Chargement des établissements…</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {listedSchools.map((school, index) => {
              const photo = ABOUT_CAMPUS_PHOTOS[index % ABOUT_CAMPUS_PHOTOS.length];
              return (
                <article
                  key={school.id}
                  className="group overflow-hidden rounded-[1.75rem] bg-[#07081a] text-white shadow-[0_28px_56px_-28px_rgba(7,8,26,0.5)] ring-1 ring-white/10"
                >
                  <div className="relative min-h-[16rem]">
                    {'slot' in photo && photo.slot ? (
                      <HomePageImage
                        slot={photo.slot}
                        defaultPath={photo.src}
                        alt={photo.alt}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-[#07081a]/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
                        Établissement
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-semibold">
                        {school.shortName?.trim() || school.name}
                      </h2>
                      {school.shortName?.trim() && school.shortName.trim() !== school.name ? (
                        <p className="mt-1 text-sm text-stone-300">{school.name}</p>
                      ) : null}
                      <p className="mt-4 flex items-start gap-2 text-sm text-stone-200">
                        <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-tran-mustard-300" aria-hidden />
                        {contact.address}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </HomeReveal>

      <section className="mt-16">
        <HomeReveal>
          <h2 className="font-display text-2xl font-semibold text-stone-900 sm:text-3xl">
            Cycles et filières
          </h2>
          <div className="home-section-accent mx-0 mt-4" aria-hidden />
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-600">
            Un parcours complet : maternelle et primaire, enseignement général, enseignement
            technique, puis formations supérieures de type BTS.
          </p>
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {ABOUT_CYCLES.map((cycle) => (
              <AboutMediaCard
                key={cycle.title}
                src={cycle.image}
                alt={cycle.imageAlt}
                slot={'slot' in cycle ? cycle.slot : undefined}
                title={cycle.title}
                text={cycle.text}
                minHeightClass="min-h-[24rem]"
              >
                <ul className="mt-4 space-y-1.5 text-sm text-stone-200">
                  {cycle.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-tran-mustard-300" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </AboutMediaCard>
            ))}
          </div>
        </HomeReveal>
      </section>

      <HomeReveal>
        <div className="relative mt-12 overflow-hidden rounded-[2rem] min-h-[14rem]">
          <HomePageImage
            slot="homeRoleParent"
            defaultPath="/home/role-parent.jpg"
            alt="Inscriptions et familles"
            fill
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#07081a]/72" />
          <div className="relative z-10 px-6 py-10 text-center text-white sm:px-10">
            <p className="font-display text-2xl font-semibold">
              Les inscriptions se font en ligne, puis au secrétariat aux heures d’ouverture.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PreInscriptionSchoolEntry variant="button" />
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur hover:bg-white/16"
              >
                Demander un renseignement
              </Link>
            </div>
          </div>
        </div>
      </HomeReveal>
    </AboutPageFrame>
  );
}
