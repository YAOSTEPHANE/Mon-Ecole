'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  FiBarChart2,
  FiCalendar,
  FiCheck,
  FiCreditCard,
  FiMapPin,
  FiClock,
  FiShield,
  FiVolume2,
} from 'react-icons/fi';
import AboutPageFrame from '../components/public/AboutPageFrame';
import AboutMediaCard from '../components/public/AboutMediaCard';
import HomeReveal from '../components/public/HomeReveal';
import HomePageImage from '../components/public/HomePageImage';
import PreInscriptionSchoolEntry from '../components/public/PreInscriptionSchoolEntry';
import { useAppBranding } from '@/contexts/AppBrandingContext';
import { usePublicSchools } from '@/hooks/usePublicSchools';
import { publicApi } from '@/services/api';
import {
  SCHOOL_DEFAULTS,
  SCHOOL_OPENING_HOURS,
} from '@/data/schoolDefaults';
import {
  ABOUT_ATOUTS,
  ABOUT_CYCLES,
  ABOUT_PLATFORM_FEATURES,
  ABOUT_PLATFORM_GOALS,
  ABOUT_STAFF_CATEGORIES,
  ABOUT_TAGLINE,
  founderParagraphs,
} from '@/data/schoolAbout';
import { resolveSchoolContactInfo } from '@/lib/schoolContact';
import { resolveDirectorMessageContent } from '@/lib/homeDirectorMessage';

const PLATFORM_ICONS = [FiBarChart2, FiCalendar, FiShield, FiCreditCard, FiVolume2];
const DEFAULT_DIRECTOR_PHOTO = '/home/directrice-etudes.jpg';

export default function APropos() {
  const { branding, studiesDirectorPhotoAbsolute } = useAppBranding();
  const contact = resolveSchoolContactInfo(branding);
  const director = resolveDirectorMessageContent(branding);
  const { schools, loading: schoolsLoading } = usePublicSchools();
  const { data: results } = useQuery({
    queryKey: ['public-academic-results'],
    queryFn: () => publicApi.getAcademicResults(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const schoolName =
    branding.schoolDisplayName?.trim() || branding.appTitle?.trim() || SCHOOL_DEFAULTS.fullName;
  const schoolShortName = branding.appTitle?.trim() || SCHOOL_DEFAULTS.shortName;
  const mapsUrl = contact.mapsUrl;
  const founderName = branding.schoolPrincipal?.trim() || director.name;
  const founderRole = branding.schoolPrincipal?.trim() ? 'Fondateur' : director.role;
  const examStats = results?.examStats ?? [];
  const bepc = examStats.find((s) => s.examKind === 'BEPC');
  const bac = examStats.find((s) => s.examKind === 'BAC');
  const directorPhoto = studiesDirectorPhotoAbsolute ?? DEFAULT_DIRECTOR_PHOTO;
  const useCustomDirectorPhoto = Boolean(studiesDirectorPhotoAbsolute);
  const founderCopy = founderParagraphs(schoolName);

  const stats = [
    {
      value: schools.length > 0 ? String(schools.length) : '1',
      label: schools.length > 1 ? 'établissements' : 'établissement',
      hint: schoolShortName,
    },
    {
      value: bepc ? `${bepc.passRate.toLocaleString('fr-FR')} %` : '—',
      label: 'réussite au BEPC',
      hint: bepc?.academicYear ? `Année ${bepc.academicYear}` : 'Dès publication',
    },
    {
      value: bac ? `${bac.passRate.toLocaleString('fr-FR')} %` : '—',
      label: 'réussite au BAC',
      hint: bac?.academicYear ? `Année ${bac.academicYear}` : 'Dès publication',
    },
    {
      value: '7j/7',
      label: 'espace familles',
      hint: 'Notes, emploi du temps, paiements',
    },
  ];

  return (
    <AboutPageFrame
      navLabel="À propos"
      title="À propos de nous"
      description={`Bienvenue chez ${schoolName}. ${ABOUT_TAGLINE}`}
      heroSlot="homeHeroPlatform"
      heroDefaultPath="/home/hero-platform.jpg"
      heroImageAlt={`Campus et communauté de ${schoolName}`}
      heroSize="lg"
      heroCutout
      heroKicker={schoolShortName}
    >
      <HomeReveal>
        <section
          id="identite"
          className="scroll-mt-32 overflow-hidden rounded-[2rem] bg-[#07081a] text-white shadow-[0_40px_80px_-32px_rgba(7,8,26,0.65)] ring-1 ring-white/10 lg:grid lg:grid-cols-12"
        >
          <div className="relative min-h-[280px] lg:col-span-5 lg:min-h-[520px]">
            {useCustomDirectorPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={directorPhoto}
                alt={founderName ? `Portrait de ${founderName}` : 'Direction pédagogique'}
                className="absolute inset-0 h-full w-full object-cover object-[center_18%]"
              />
            ) : (
              <Image
                src={DEFAULT_DIRECTOR_PHOTO}
                alt={founderName ? `Portrait de ${founderName}` : 'Direction pédagogique'}
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
            )}
            <div
              className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-[#07081a]/45 to-transparent lg:bg-gradient-to-r lg:from-[#07081a]/20 lg:via-transparent lg:to-[#07081a]/85"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[min(52%,14rem)] bg-gradient-to-t from-[#07081a] via-[#07081a]/92 to-transparent"
              aria-hidden
            />
            <div className="absolute bottom-5 left-5 right-5 z-10 lg:bottom-8 lg:left-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">
                Vision fondatrice
              </p>
              {founderName ? (
                <p className="mt-2 font-display text-2xl font-semibold drop-shadow-[0_2px_12px_rgba(0,0,0,0.65)]">
                  {founderName}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-stone-200 drop-shadow-[0_1px_8px_rgba(0,0,0,0.55)]">{founderRole}</p>
            </div>
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-12 lg:col-span-7 lg:px-14">
            <span className="inline-flex w-fit items-center rounded-full border border-tran-mustard-300/30 bg-tran-mustard-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tran-mustard-100">
              {schoolShortName}
            </span>
            <h2 className="mt-5 font-display text-[1.75rem] font-semibold tracking-tight sm:text-4xl">
              Bienvenue chez {schoolName}
            </h2>
            <p className="mt-6 font-display text-xl leading-snug text-tran-mustard-100/95 sm:text-2xl">
              « {founderCopy[founderCopy.length - 1]} »
            </p>
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-stone-300 sm:text-base">
              {founderCopy.slice(0, -1).map((paragraph) => (
                <p key={paragraph.slice(0, 48)}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      </HomeReveal>

      <HomeReveal delayMs={70}>
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <AboutMediaCard
            src="/home/pillar-pedagogy.jpg"
            slot="homePillarPedagogy"
            alt="Mission pédagogique"
            eyebrow="Notre mission"
            title="Former avec exigence"
            text={SCHOOL_DEFAULTS.mission}
            minHeightClass="min-h-[18rem] sm:min-h-[22rem]"
          />
          <AboutMediaCard
            src="/home/experience-familles.jpg"
            alt="Valeurs de l’établissement"
            eyebrow="Nos valeurs"
            title="Un cadre humain"
            text={`${SCHOOL_DEFAULTS.valuesLine} ${SCHOOL_DEFAULTS.tagline}`}
            minHeightClass="min-h-[18rem] sm:min-h-[22rem]"
          />
        </div>
      </HomeReveal>

      <section id="chiffres" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <div className="overflow-hidden rounded-[2rem] bg-[#07081a] ring-1 ring-white/10">
            <div className="px-6 pt-8 text-center sm:px-10 sm:pt-10">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
                Quelques chiffres
              </span>
              <h2 className="mt-3 font-display text-[1.65rem] font-semibold tracking-tight text-white sm:text-4xl">
                Une école tournée vers la réussite
              </h2>
            </div>
            <div className="home-stats-rail mt-2 border-0 bg-transparent">
              <div className="home-stats-rail__grid mx-auto grid max-w-7xl grid-cols-1 gap-2 px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-6 sm:py-8 lg:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label} className="home-stat-tile text-left">
                    <p className="home-stat-num font-sans text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">
                      {stat.value}
                    </p>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{stat.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>

      <section id="atouts" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <div className="max-w-2xl">
            <span className="home-eyebrow">Nos atouts</span>
            <h2 className="mt-4 font-display text-[1.65rem] font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Pourquoi les familles nous font confiance
            </h2>
            <div className="home-section-accent mx-0 mt-4" aria-hidden />
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {ABOUT_ATOUTS.map((atout, idx) => (
              <HomeReveal key={atout.title} delayMs={idx * 70}>
                <AboutMediaCard
                  src={atout.image}
                  alt={atout.imageAlt}
                  title={atout.title}
                  text={atout.text}
                  minHeightClass="min-h-[24rem]"
                />
              </HomeReveal>
            ))}
          </div>
        </HomeReveal>
      </section>

      <section id="plateforme" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <div className="overflow-hidden rounded-[2rem] bg-[#07081a] text-white shadow-[0_40px_80px_-32px_rgba(7,8,26,0.55)] ring-1 ring-white/10 lg:grid lg:grid-cols-12">
            <div className="relative min-h-[240px] lg:col-span-5 lg:min-h-full">
              <Image
                src="/home/admissions-desk.jpg"
                alt="Espace numérique familles"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div
                className="absolute inset-0 bg-gradient-to-t from-[#07081a] via-[#07081a]/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#07081a]/70"
                aria-hidden
              />
            </div>
            <div className="px-6 py-8 sm:px-10 sm:py-12 lg:col-span-7">
              <span className="inline-flex w-fit items-center rounded-full border border-tran-mustard-300/35 bg-tran-mustard-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tran-mustard-100">
                Du nouveau à {schoolShortName}
              </span>
              <h2 className="mt-5 font-display text-2xl font-semibold tracking-tight sm:text-4xl">
                Une plateforme numérique moderne et sécurisée
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-stone-300 sm:text-base">
                Afin de renforcer la communication entre l’école, les élèves et les parents,{' '}
                {schoolName} a mis en place un espace en ligne. Chaque famille peut consulter en temps
                réel les informations essentielles de la scolarité, depuis un ordinateur, une tablette
                ou un smartphone.
              </p>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {ABOUT_PLATFORM_FEATURES.map((feature, idx) => {
                  const Icon = PLATFORM_ICONS[idx] ?? FiCheck;
                  return (
                    <li
                      key={feature.title}
                      className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-tran-mustard-300" aria-hidden />
                      <div>
                        <p className="font-semibold text-white">{feature.title}</p>
                        <p className="mt-1 text-sm text-stone-300">{feature.text}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <ul className="mt-8 space-y-2 text-sm text-stone-200">
                {ABOUT_PLATFORM_GOALS.map((goal) => (
                  <li key={goal} className="flex items-start gap-2">
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-tran-mustard-300" aria-hidden />
                    {goal}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-2xl bg-tran-mustard-400 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-lg hover:bg-tran-mustard-300"
                >
                  Se connecter à l’espace
                </Link>
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>

      <section id="personnel" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="home-eyebrow">Le personnel</span>
              <h2 className="mt-4 font-display text-[1.65rem] font-semibold tracking-tight text-stone-900 sm:text-4xl">
                Une communauté éducative soudée
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-stone-600 sm:text-base">
                La réussite de chaque élève repose sur une équipe pédagogique et administrative
                engagée, compétente et disponible.
              </p>
            </div>
            <Link
              href="/a-propos/personnel"
              className="inline-flex w-fit rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-900 shadow-sm hover:border-tran-mustard-400 hover:bg-tran-mustard-50"
            >
              Découvrir l’équipe
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ABOUT_STAFF_CATEGORIES.map((category) => (
              <AboutMediaCard
                key={category.title}
                src={category.image}
                alt={category.imageAlt}
                slot={'slot' in category ? category.slot : undefined}
                title={category.title}
                text={category.text}
                href="/a-propos/personnel"
                minHeightClass="min-h-[20rem]"
              />
            ))}
          </div>
        </HomeReveal>
      </section>

      <section id="etablissements" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <span className="home-eyebrow">Nos établissements</span>
              <h2 className="mt-4 font-display text-[1.65rem] font-semibold tracking-tight text-stone-900 sm:text-4xl">
                Des cycles complets, de la maternelle au supérieur
              </h2>
            </div>
            <Link
              href="/a-propos/etablissements"
              className="inline-flex w-fit rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-bold text-stone-900 shadow-sm hover:border-tran-mustard-400 hover:bg-tran-mustard-50"
            >
              Voir nos établissements
            </Link>
          </div>
          {!schoolsLoading && schools.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-2">
              {schools.map((school) => (
                <li
                  key={school.id}
                  className="rounded-full border border-stone-200/80 bg-white/80 px-4 py-1.5 text-sm font-semibold text-stone-800 shadow-sm backdrop-blur"
                >
                  {school.shortName?.trim() || school.name}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {ABOUT_CYCLES.map((cycle, idx) => (
              <AboutMediaCard
                key={cycle.title}
                src={cycle.image}
                alt={cycle.imageAlt}
                slot={'slot' in cycle ? cycle.slot : undefined}
                eyebrow={`Cycle ${idx + 1}`}
                title={cycle.title}
                text={cycle.text}
                href="/a-propos/etablissements"
                minHeightClass={idx === 0 ? 'min-h-[22rem] md:min-h-[28rem]' : 'min-h-[22rem]'}
              >
                <ul className="mt-3 space-y-1 text-xs text-stone-200/90">
                  {cycle.items.slice(0, 3).map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <FiCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tran-mustard-300" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </AboutMediaCard>
            ))}
          </div>
        </HomeReveal>
      </section>

      <section id="reglement" className="mt-16 scroll-mt-32 sm:mt-20">
        <HomeReveal>
          <article className="relative overflow-hidden rounded-[2rem] min-h-[18rem] sm:min-h-[22rem]">
            <Image
              src="/home/gallery-assembly.jpg"
              alt="Cadre de vie scolaire"
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-[#07081a]/70" aria-hidden />
            <div className="relative z-10 flex h-full min-h-[18rem] flex-col justify-end p-6 sm:min-h-[22rem] sm:p-10">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
                Règlement intérieur
              </span>
              <h2 className="mt-3 max-w-xl font-display text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                Un cadre clair pour toute la communauté
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-stone-200 sm:text-base">
                Le règlement intérieur régit l’environnement scolaire, les activités de l’école et les
                relations entre personnels, élèves et familles. Il est lu chaque année à la réunion de
                rentrée.
              </p>
              <Link
                href="/a-propos/reglement-interieur"
                className="mt-6 inline-flex w-fit rounded-2xl bg-white px-6 py-3 text-sm font-bold text-stone-950 shadow-lg hover:bg-tran-mustard-200"
              >
                Lire le règlement intérieur
              </Link>
            </div>
          </article>
        </HomeReveal>
      </section>

      <section className="mt-16 sm:mt-20">
        <HomeReveal>
          <div className="overflow-hidden rounded-[2rem] bg-[#07081a] text-white ring-1 ring-white/10 lg:grid lg:grid-cols-12">
            <div className="relative min-h-[220px] lg:col-span-5">
              <HomePageImage
                slot="homeSplitCampus"
                defaultPath="/home/split-campus.jpg"
                alt={`Campus de ${schoolName}`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07081a] to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#07081a]/80" />
            </div>
            <div className="grid gap-8 px-6 py-8 sm:px-10 sm:py-12 lg:col-span-7 lg:grid-cols-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-tran-mustard-200">
                  Infos pratiques
                </span>
                <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  Venir à {schoolName}
                </h2>
                <p className="mt-4 flex items-start gap-3 text-stone-200">
                  <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-tran-mustard-300" aria-hidden />
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-white underline-offset-2 hover:text-tran-mustard-200 hover:underline"
                  >
                    {contact.address}
                  </a>
                </p>
                {contact.phone ? (
                  <p className="mt-3 text-sm text-stone-300">Accueil : {contact.phone}</p>
                ) : null}
                {contact.email ? (
                  <p className="mt-2 text-sm text-stone-300">{contact.email}</p>
                ) : null}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <PreInscriptionSchoolEntry
                    variant="button"
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-tran-mustard-400 px-6 py-3.5 text-sm font-bold text-stone-950 shadow-lg hover:bg-tran-mustard-300 sm:w-auto"
                  />
                  <Link
                    href="/contact"
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-bold text-white hover:bg-white/10 sm:w-auto"
                  >
                    Nous contacter
                  </Link>
                </div>
              </div>
              <div>
                <p className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-400">
                  <FiClock className="h-4 w-4 text-tran-mustard-300" aria-hidden />
                  Horaires d’ouverture
                </p>
                <table className="w-full text-sm">
                  <tbody>
                    {SCHOOL_OPENING_HOURS.map((row) => (
                      <tr key={row.day} className="border-b border-white/10 last:border-0">
                        <th className="py-2.5 pr-4 text-left font-semibold text-white">{row.day}</th>
                        <td className="py-2.5 text-right tabular-nums text-stone-300">{row.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </HomeReveal>
      </section>
    </AboutPageFrame>
  );
}
