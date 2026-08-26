'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import { useAppBranding } from '../contexts/AppBrandingContext';
import Button from '../components/ui/Button';
import Footer from '../components/Footer';
import HomeReveal from '../components/public/HomeReveal';
import HomeDirectorSection from '../components/public/HomeDirectorSection';
import HomePageImage from '../components/public/HomePageImage';
import PreInscriptionSchoolEntry from '../components/public/PreInscriptionSchoolEntry';
import HomeFneMatriculeLookup from '../components/public/HomeFneMatriculeLookup';
import HomeAcademicResultsSection from '../components/public/HomeAcademicResultsSection';
import PublicSectionsReveal from '../components/public/PublicSectionsReveal';
import PublicAdmissionRateInfo from '../components/public/PublicAdmissionRateInfo';
import { getRoleDashboardPath } from '../lib/rolePaths';
import {
  SCHOOL_MARQUEE,
  SCHOOL_NEWS,
  SCHOOL_OPENING_HOURS,
  SCHOOL_DEFAULTS,
  SCHOOL_STATS,
  SCHOOL_VALUES,
  getGoogleMapsSearchUrl,
  getSchoolMapsQuery,
} from '../data/schoolDefaults';
import {
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBook,
  FiCamera,
  FiCheck,
  FiCompass,
  FiClock,
  FiCpu,
  FiFileText,
  FiHeart,
  FiLayers,
  FiMapPin,
  FiMenu,
  FiMessageSquare,
  FiPhone,
  FiShield,
  FiStar,
  FiTarget,
  FiUsers,
  FiX,
  FiZap,
} from 'react-icons/fi';

const NAV_LINKS = [
  { href: '/a-propos', label: 'À propos' },
  { href: '#etablissement', label: 'Établissement' },
  { href: '#resultats', label: 'Résultats' },
  { href: '/examens-blancs', label: 'Examens blancs' },
  { href: '#galerie', label: 'Galerie' },
  { href: '#matricule-fne', label: 'Matricule FNE' },
  { href: '#parcours', label: 'Admissions' },
  { href: '#actualites', label: 'Actualités' },
  { href: '/contact', label: 'Contact' },
];

function HomeNavItem({
  href,
  label,
  className,
  onClick,
}: {
  href: string;
  label: string;
  className: string;
  onClick?: () => void;
}) {
  if (href.startsWith('#')) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {label}
      </a>
    );
  }
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        // Fermer le menu après le clic, sans démonter le lien trop tôt.
        window.setTimeout(() => onClick?.(), 0);
      }}
    >
      {label}
    </Link>
  );
}

const MARQUEE_ITEMS = [...SCHOOL_MARQUEE];

const PILLARS = [
  {
    title: 'Formation de qualité',
    text: SCHOOL_DEFAULTS.mission,
    icon: FiBook,
    accent: 'bg-tran-mauve-700',
    span: 'md:col-span-2',
    imageSlot: 'homePillarPedagogy' as const,
    image: '/home/pillar-pedagogy.jpg',
    imageAlt: 'Salle de classe à Mon Ecole',
  },
  {
    title: 'Innovation pédagogique',
    text: 'Une approche moderne pour préparer les leaders compétents et responsables de demain.',
    icon: FiZap,
    accent: 'bg-tran-mustard-600',
    span: 'md:col-span-1',
    imageSlot: 'homePillarPortals' as const,
    image: '/home/pillar-portals.jpg',
    imageAlt: 'Élèves et enseignants en activité pédagogique',
  },
  {
    title: 'Vie scolaire',
    text: 'Discipline, accompagnement et écoute pour garantir un climat de travail serein.',
    icon: FiShield,
    accent: 'bg-tran-mauve-600',
    span: 'md:col-span-1',
    imageSlot: 'homePillarSecurity' as const,
    image: '/home/pillar-security.jpg',
    imageAlt: 'Encadrement et discipline au quotidien',
  },
  {
    title: 'Administration & familles',
    text: 'Pré-inscriptions, suivi scolaire et lien renforcé avec les parents d’élèves.',
    icon: FiLayers,
    accent: 'bg-[#8a6a3d]',
    span: 'md:col-span-2',
    imageSlot: 'homePillarAdministration' as const,
    image: '/home/pillar-administration.jpg',
    imageAlt: 'Équipe éducative et administrative du collège',
  },
];

const ROLES = [
  {
    label: 'Direction',
    desc: 'Pilotage de l’établissement, vie scolaire et orientation vers la réussite.',
    gradient: 'bg-tran-mauve-700',
    ring: 'ring-tran-mauve-500/25',
    icon: FiBarChart2,
    imageSlot: 'homeRoleAdmin' as const,
    image: '/home/role-admin.jpg',
    imageAlt: 'Direction de Mon Ecole',
  },
  {
    label: 'Enseignant',
    desc: 'Transmission des savoirs, évaluations et accompagnement personnalisé.',
    gradient: 'bg-tran-mauve-600',
    ring: 'ring-tran-mauve-400/25',
    icon: FiBook,
    imageSlot: 'homeRoleTeacher' as const,
    image: '/home/role-teacher.jpg',
    imageAlt: 'Corps enseignant de Mon Ecole',
  },
  {
    label: 'Élève',
    desc: 'Progression, motivation et révélation du plein potentiel de chaque élève.',
    gradient: 'bg-tran-mustard-600',
    ring: 'ring-tran-mustard-500/25',
    icon: FiAward,
    imageSlot: 'homeRoleStudent' as const,
    image: '/home/role-student.jpg',
    imageAlt: 'Élèves de Mon Ecole',
  },
  {
    label: 'Parent',
    desc: 'Partenaire essentiel : suivi, dialogue et engagement pour la réussite scolaire.',
    gradient: 'bg-[#8a6a3d]',
    ring: 'ring-tran-mustard-500/20',
    icon: FiHeart,
    imageSlot: 'homeRoleParent' as const,
    image: '/home/role-parent.jpg',
    imageAlt: 'Familles et parents d’élèves',
  },
];

const VALUE_ICONS = {
  award: FiAward,
  heart: FiHeart,
  shield: FiShield,
  users: FiUsers,
} as const;

const HIGHLIGHTS = SCHOOL_VALUES.map((v) => ({
  title: v.title,
  text: v.text,
  icon: VALUE_ICONS[v.icon],
}));

const EXPERIENCE_CARDS = [
  {
    eyebrow: 'Pédagogie',
    title: 'Un cadre académique exigeant',
    text: 'Des apprentissages structurés, une progression lisible et des repères clairs pour accompagner chaque élève.',
    stat: 'Suivi continu',
    icon: FiTarget,
    accent: 'bg-tran-mauve-700',
    image: '/home/experience-academique.jpg',
    imageAlt: 'Élèves concentrés lors d’une évaluation en classe',
  },
  {
    eyebrow: 'Vie scolaire',
    title: 'Discipline, écoute et sérénité',
    text: 'Un environnement organisé où la rigueur, le dialogue et l’encadrement renforcent la confiance.',
    stat: 'Cadre maîtrisé',
    icon: FiShield,
    accent: 'bg-tran-mustard-600',
    image: '/home/experience-vie-scolaire.jpg',
    imageAlt: 'Accompagnement d’élèves dans les couloirs de l’établissement',
  },
  {
    eyebrow: 'Familles',
    title: 'Parents pleinement associés',
    text: 'Une relation école-famille pensée pour rendre les informations plus accessibles et les décisions plus rapides.',
    stat: 'Lien renforcé',
    icon: FiUsers,
    accent: 'bg-[#8a6a3d]',
    image: '/home/experience-familles.jpg',
    imageAlt: 'Rencontre parents–enseignants dans une salle de classe',
  },
] as const;

const CAMPUS_GALLERY = [
  {
    src: '/home/gallery-assembly.jpg',
    alt: 'Rassemblement des élèves dans la cour',
    label: 'Vie collective',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    src: '/home/gallery-lab.jpg',
    alt: 'Travaux pratiques en laboratoire',
    label: 'Sciences',
    span: '',
  },
  {
    src: '/home/gallery-library.jpg',
    alt: 'Lecture et recherche en bibliothèque',
    label: 'Bibliothèque',
    span: '',
  },
  {
    src: '/home/gallery-sport.jpg',
    alt: 'Activité sportive sur le terrain de l’école',
    label: 'Sport',
    span: 'md:col-span-2',
  },
] as const;

const ADMISSION_STEPS = [
  {
    step: '01',
    title: 'Préparer le dossier',
    text: 'Choisissez le niveau, renseignez les informations essentielles et rassemblez les pièces demandées.',
    icon: FiFileText,
  },
  {
    step: '02',
    title: 'Soumettre la demande',
    text: 'La pré-inscription est enregistrée avec une référence de suivi pour garder une trace claire du dossier.',
    icon: FiCompass,
  },
  {
    step: '03',
    title: 'Suivi par l’établissement',
    text: 'L’administration examine la demande, oriente la famille et confirme les prochaines étapes.',
    icon: FiCheck,
  },
] as const;

const PLATFORM_FEATURES = [
  { title: 'Portails sécurisés', text: 'Accès dédiés pour l’administration, les équipes, les familles et les élèves.', icon: FiShield },
  { title: 'Suivi scolaire', text: 'Notes, absences, frais et informations importantes centralisés.', icon: FiBarChart2 },
  { title: 'Communication claire', text: 'Informations pratiques, annonces et démarches mieux organisées.', icon: FiMessageSquare },
  { title: 'Pilotage moderne', text: 'Une interface conçue pour accélérer les tâches et réduire les erreurs.', icon: FiCpu },
] as const;

const TESTIMONIALS = [
  {
    quote:
      'Un établissement qui associe exigence, discipline et accompagnement humain dans une vision claire de la réussite.',
    author: 'Communauté éducative',
    role: 'Projet scolaire Mon Ecole',
  },
  {
    quote:
      'Chaque élève doit se sentir attendu, guidé et encouragé à progresser avec sérieux et confiance.',
    author: 'Vie scolaire',
    role: 'Encadrement quotidien',
  },
] as const;

export default function Home() {
  const { user } = useAuth();
  const { navigationLogoAbsolute, branding } = useAppBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const schoolDisplayName =
    (branding.schoolDisplayName && branding.schoolDisplayName.trim()) ||
    (branding.appTitle && branding.appTitle.trim()) ||
    SCHOOL_DEFAULTS.fullName;
  const schoolShortName =
    (branding.appTitle && branding.appTitle.trim() && branding.appTitle.trim() !== schoolDisplayName)
      ? branding.appTitle.trim()
      : SCHOOL_DEFAULTS.shortName;
  const headerTitle = schoolDisplayName;
  const headerTagline =
    (branding.appTagline && branding.appTagline.trim()) || SCHOOL_DEFAULTS.tagline;
  const schoolCode =
    (branding.schoolCode && branding.schoolCode.trim()) || SCHOOL_DEFAULTS.establishmentCode;
  const schoolMapsUrl = getGoogleMapsSearchUrl(
    getSchoolMapsQuery(branding.schoolAddress)
  );
  const schoolLocationLabel =
    branding.schoolAddress?.trim() ||
    [SCHOOL_DEFAULTS.city, SCHOOL_DEFAULTS.country].filter(Boolean).join(', ') ||
    SCHOOL_DEFAULTS.country;
  const schoolPhoneDisplay =
    branding.schoolPhone?.trim() || SCHOOL_DEFAULTS.phoneDisplay;
  const schoolPhoneTel = branding.schoolPhone?.trim()
    ? `tel:${branding.schoolPhone.replace(/[\s().-]/g, '').replace(/^00/, '+')}`
    : SCHOOL_DEFAULTS.phoneTel;

  useEffect(() => {
    document.title = `${headerTitle} · Accueil`;
  }, [headerTitle]);

  return (
    <div className="home-page home-page--v3 home-page--v4 min-h-screen premium-body premium-body-v2 premium-body-v3 font-sans text-tran-mauve-950 antialiased">
      <header className="home-header sticky top-0 z-50 glass-nav glass-nav-v2 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 min-h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:h-16 sm:px-6">
          <Link
            href="/"
            className="group flex min-w-0 flex-1 items-center gap-2 rounded-xl sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tran-mustard-500/45 focus-visible:ring-offset-2"
          >
            <div
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-tran-mustard-900/25 ring-2 ring-tran-mustard-400/45 transition-transform duration-300 group-hover:scale-[1.03] sm:h-11 sm:w-11 ${
                navigationLogoAbsolute
                  ? 'bg-white'
                  : 'bg-tran-mauve-900 text-tran-mustard-100'
              }`}
            >
              {navigationLogoAbsolute ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={navigationLogoAbsolute}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <FiBook className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" aria-hidden />
              )}
            </div>
            <div className="min-w-0 leading-tight">
              <span className="block truncate font-display text-base font-semibold tracking-tight text-stone-900 sm:text-lg">
                {headerTitle}
              </span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-tran-mustard-800/80 sm:block">
                {headerTagline}
              </span>
              {schoolCode ? (
              <span className="mt-0.5 hidden text-[10px] font-bold tabular-nums tracking-wider text-tran-mauve-700/90 sm:block">
                Code : {schoolCode}
              </span>
              ) : null}
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:gap-3 md:flex">
            <PublicAdmissionRateInfo variant="chip" />
            {user ? (
                <Link href={getRoleDashboardPath(user.role)}>
                <Button>Mon espace</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="secondary">Connexion</Button>
                </Link>
                <PreInscriptionSchoolEntry />
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 md:hidden">
            {!user ? (
              <Link href="/login" className="min-w-0">
                <Button size="sm" variant="secondary" className="px-3 py-2 text-xs">
                  Connexion
                </Button>
              </Link>
            ) : (
              <Link href={getRoleDashboardPath(user.role)} className="min-w-0">
                <Button size="sm" className="px-3 py-2 text-xs">
                  Espace
                </Button>
              </Link>
            )}
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-stone-600 transition-colors hover:bg-stone-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tran-mustard-500/45"
              aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="home-nav-bar hidden md:block">
          <nav className="mx-auto flex max-w-7xl items-center justify-center gap-1 px-3 py-1.5 sm:px-6">
            {NAV_LINKS.map(({ href, label }) => (
              <HomeNavItem
                key={href}
                href={href}
                label={label}
                className="home-nav-link rounded-lg px-3.5 py-2.5 text-sm font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              />
            ))}
          </nav>
        </div>

        {menuOpen && (
          <div className="home-nav-bar max-h-[min(70svh,28rem)] overflow-y-auto px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <HomeNavItem
                  key={href}
                  href={href}
                  label={label}
                  className="rounded-xl px-4 py-3 text-sm font-semibold text-white hover:bg-white/12"
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </nav>
            <div className="mt-4 flex flex-col gap-2 border-t border-white/20 pt-4">
              {user ? (
                <Link href={getRoleDashboardPath(user.role)} onClick={() => setMenuOpen(false)}>
                  <Button className="w-full">Mon espace</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMenuOpen(false)}>
                    <Button variant="secondary" className="w-full">
                      Connexion
                    </Button>
                  </Link>
                  <PreInscriptionSchoolEntry
                    className="w-full"
                    onNavigate={() => setMenuOpen(false)}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <PublicSectionsReveal extraSelector="#resultats article, .home-stats-rail .home-stat-tile">
      <main>
        {/* Hero full-bleed — marque, promesse, CTA */}
        <section className="home-hero-shell home-hero-shell--cinematic relative isolate min-h-[min(78svh,40rem)] overflow-hidden text-white sm:min-h-[min(92vh,52rem)] lg:min-h-[min(96vh,58rem)]">
          <div className="absolute inset-0" aria-hidden>
            <HomePageImage
              slot="homeHeroPlatform"
              defaultPath="/home/hero-platform.jpg"
              alt=""
              fill
              className="home-hero-bg-image object-cover scale-[1.04]"
              sizes="100vw"
              priority
            />
          </div>
          <div className="home-hero-veil absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-end px-3 sm:top-5 sm:px-5 md:hidden">
            <PublicAdmissionRateInfo
              variant="chip"
              className="admission-lux-chip--hero pointer-events-auto"
            />
          </div>
          <div className="page-hero-v2__noise pointer-events-none absolute inset-0 opacity-18" aria-hidden />
          <div className="home-hero-fine-grid pointer-events-none absolute inset-0 opacity-12" aria-hidden />
          <div
            className="home-hero-orb home-hero-orb--drift-a absolute -left-28 top-10 h-[min(32rem,55vw)] w-[min(32rem,55vw)] bg-cptb-blue/16"
            aria-hidden
          />
          <div
            className="home-hero-orb home-hero-orb--drift-b absolute -right-24 bottom-8 h-[min(26rem,48vw)] w-[min(26rem,48vw)] bg-tran-mustard-500/12"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[8] hidden w-[min(48%,38rem)] lg:block">
            <div className="relative isolate h-full w-full mix-blend-normal">
              <Image
                src="/home/hero-students-cutout.png"
                alt="Élèves en uniforme"
                fill
                unoptimized
                className="object-contain object-right-bottom drop-shadow-[0_28px_40px_rgba(0,0,0,0.5)]"
                sizes="(min-width: 1024px) 38rem, 0px"
                priority
              />
            </div>
          </div>

          <div className="relative z-10 mx-auto flex min-h-[min(78svh,40rem)] max-w-7xl flex-col justify-end px-4 pb-10 pt-16 sm:min-h-[min(92vh,52rem)] sm:px-6 sm:pb-20 sm:pt-24 lg:min-h-[min(96vh,58rem)] lg:justify-center lg:pb-28 lg:pt-32">
            <div className="home-section-fade max-w-3xl">
              <h1 className="home-hero-h1 home-hero-title-line font-display text-[2.35rem] font-semibold leading-[1.02] tracking-tight text-white [overflow-wrap:anywhere] sm:text-6xl sm:leading-[0.96] lg:text-[5.35rem] lg:leading-[0.92]">
                <span className="home-hero-h1__line home-hero-brand-mark">{schoolDisplayName}</span>
              </h1>
              <p className="home-hero-sub-line mt-4 max-w-xl text-[1.05rem] font-medium leading-relaxed text-stone-100/95 sm:mt-7 sm:text-2xl sm:leading-snug">
                {headerTagline || SCHOOL_DEFAULTS.tagline}
              </p>

              {!user ? (
                <div className="mt-6 sm:mt-10">
                  <Link href="/login" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="home-hero-cta-primary w-full border-0 bg-white px-5 font-bold text-stone-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] transition-transform hover:bg-tran-mustard-50 hover:scale-[1.02] sm:w-auto sm:px-9"
                    >
                      Espace sécurisé
                      <FiArrowRight className="ml-2 inline h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="mt-6 sm:mt-10">
                  <Link href={getRoleDashboardPath(user.role)}>
                    <Button
                      size="lg"
                      variant="secondary"
                      className="home-hero-cta-primary w-full border-0 bg-white px-5 font-bold text-stone-900 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] transition-transform hover:bg-tran-mustard-50 hover:scale-[1.02] sm:w-auto sm:px-9"
                    >
                      Ouvrir mon espace
                      <FiArrowRight className="ml-2 inline h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="home-scroll-hint pointer-events-none absolute bottom-8 left-1/2 z-20 hidden -translate-x-1/2 lg:flex" aria-hidden>
            <span>Découvrir</span>
            <span className="home-scroll-hint__line" />
          </div>
        </section>

        <section className="home-stats-rail relative z-10" aria-label="Chiffres clés">
          <div className="home-stats-rail__grid mx-auto grid max-w-7xl grid-cols-1 gap-2 px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-6 sm:py-8 lg:grid-cols-4">
            {SCHOOL_STATS.map((s) => (
              <div
                key={s.l}
                className="home-stat-tile flex items-center justify-between gap-3 text-left sm:block sm:text-left"
              >
                <p className="home-stat-num font-display text-xl font-semibold tabular-nums sm:text-3xl">{s.n}</p>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 sm:mt-1 sm:text-[10px] sm:tracking-[0.16em]">
                    {s.l}
                  </p>
                  <p className="text-[11px] text-stone-500 sm:mt-0.5 sm:block sm:text-xs">{s.d}</p>
                </div>
              </div>
            ))}
            <PublicAdmissionRateInfo variant="stat" />
          </div>
        </section>

        <HomeFneMatriculeLookup />

        {/* Bandeau défilant */}
        <section className="home-marquee-strip relative overflow-visible border-y border-white/10 py-5 text-white">
          <div className="home-marquee overflow-hidden min-h-[3rem] flex items-center">
            <div className="home-marquee-track items-center gap-10 pr-10 text-sm font-semibold uppercase tracking-[0.2em]">
              {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
                <span
                  key={`${item}-${i}`}
                  className="flex shrink-0 items-center gap-10 whitespace-nowrap"
                >
                  <span className="text-tran-mustard-400/90 drop-shadow-[0_0_8px_rgba(201,162,39,0.35)]" aria-hidden>
                    ◆
                  </span>
                  <span className="home-marquee-text">{item}</span>
                </span>
              ))}
            </div>
          </div>
          <div
            className="pointer-events-none absolute -bottom-px left-0 right-0 z-[1] h-12 w-full text-[#fafaf9] sm:h-16"
            aria-hidden
          >
            <svg className="block h-full w-full" viewBox="0 0 1440 64" preserveAspectRatio="none" fill="none">
              <path
                fill="currentColor"
                d="M0 32C180 8 360 52 540 36C720 20 900 48 1080 40C1260 32 1380 20 1440 14V64H0V32Z"
              />
            </svg>
          </div>
        </section>

        <HomeDirectorSection />

        <HomeAcademicResultsSection />

        {/* Expérience premium */}
        <section id="experience" className="relative z-10 px-3 py-12 sm:px-6 sm:py-20 scroll-mt-20">
          <HomeReveal>
            <div className="mx-auto max-w-7xl">
              <div className="home-experience-shell relative overflow-hidden rounded-3xl border border-white/80 bg-white/78 p-4 shadow-[0_40px_100px_-48px_rgba(30,31,56,0.42)] backdrop-blur-2xl ring-1 ring-tran-mustard-400/20 sm:rounded-[2.25rem] sm:p-8 lg:p-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(201,162,39,0.2),transparent_36%),radial-gradient(circle_at_92%_18%,rgba(0,24,168,0.12),transparent_40%)]" aria-hidden />
                <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-tran-mustard-400/10 blur-3xl" aria-hidden />
                <div className="relative grid gap-8 lg:grid-cols-[0.9fr_1.35fr] lg:items-end">
                  <div>
                    <span className="home-eyebrow">
                      Expérience scolaire premium
                    </span>
                    <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[3.15rem]">
                      <span className="home-title-lux">Un établissement pensé comme un parcours de réussite.</span>
                    </h2>
                    <div className="home-section-accent mx-0 mt-4" aria-hidden />
                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-600">
                      {schoolDisplayName} combine exigence académique, encadrement quotidien et relation famille-école
                      pour offrir une expérience claire, rassurante et ambitieuse.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {EXPERIENCE_CARDS.map(({ eyebrow, title, text, stat, icon: Icon, accent, image, imageAlt }, idx) => (
                      <HomeReveal key={title} delayMs={idx * 70}>
                        <article className="home-experience-card group relative h-full overflow-hidden rounded-3xl border border-stone-200/80 bg-white/90 shadow-lg shadow-stone-900/[0.04] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-tran-mauve-900/[0.08]">
                          <div className="relative h-40 overflow-hidden sm:h-44">
                            <Image
                              src={image}
                              alt={imageAlt}
                              fill
                              className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, 33vw"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/55 via-stone-900/10 to-transparent" />
                          </div>
                          <div className="relative p-6">
                            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ${accent} text-white shadow-xl ring-4 ring-white`}>
                              <Icon className="h-6 w-6" aria-hidden />
                            </div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tran-mustard-800">
                              {eyebrow}
                            </p>
                            <h3 className="mt-2 font-display text-xl font-semibold text-stone-900">{title}</h3>
                            <p className="mt-3 text-sm leading-relaxed text-stone-600">{text}</p>
                            <div className="mt-6 inline-flex rounded-full border border-tran-mauve-100 bg-tran-mauve-50 px-3 py-1 text-xs font-bold text-tran-mauve-800">
                              {stat}
                            </div>
                          </div>
                        </article>
                      </HomeReveal>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </HomeReveal>
        </section>

        {/* Bento — Piliers */}
        <section className="relative z-10 px-3 sm:px-6">
          <HomeReveal>
          <div className="home-bento-outer relative mx-auto max-w-7xl rounded-[1.5rem] border border-stone-200/90 bg-white/65 p-1 shadow-[0_32px_64px_-28px_rgba(12,10,9,0.22)] backdrop-blur-2xl sm:rounded-[2rem] sm:p-2">
            <div className="home-bento-inner relative rounded-[1.25rem] bg-gradient-to-b from-white via-white to-stone-50/95 px-4 py-10 ring-1 ring-stone-900/[0.04] sm:rounded-[1.65rem] sm:px-8 sm:py-14 lg:px-12 lg:py-16">
              <div className="mb-12 flex flex-col gap-4 text-center lg:mb-14">
                <span className="home-eyebrow mx-auto">
                  Notre projet éducatif
                </span>
                <h2 className="font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[3.15rem] lg:tracking-tight">
                  <span className="home-title-lux">{SCHOOL_DEFAULTS.mottoShort}</span>
                </h2>
                <div className="home-section-accent home-section-accent--glow" aria-hidden />
                <p className="mx-auto max-w-2xl text-lg leading-relaxed text-stone-600">
                  {SCHOOL_DEFAULTS.mission}
                </p>
              </div>
              <div className="grid gap-5 md:grid-cols-3 md:gap-6">
                {PILLARS.map(({ title, text, icon: Icon, accent, span, image, imageAlt, imageSlot }, idx) => (
                  <HomeReveal key={title} delayMs={idx * 70} className={span}>
                  <article
                    className="home-pillar-sheen group relative h-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-[0_20px_50px_-28px_rgba(30,31,56,0.12)] transition-all duration-500 hover:-translate-y-1.5 hover:border-tran-mustard-300/60 hover:shadow-[0_28px_56px_-22px_rgba(90,91,154,0.18)]"
                  >
                    <div
                      className={`relative w-full overflow-hidden ${span.includes('col-span-2') ? 'h-48 sm:h-56' : 'h-44 sm:h-48'}`}
                    >
                      <HomePageImage
                        slot={imageSlot}
                        defaultPath={image}
                        alt={imageAlt}
                        fill
                        className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-900/15 to-transparent" />
                      <span className="absolute left-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-sm font-bold text-stone-900 shadow-lg ring-1 ring-stone-200/80">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <div className="relative p-6 sm:p-7">
                      <div
                        className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${accent} text-white shadow-lg ring-2 ring-white/30 transition-transform duration-300 group-hover:scale-105`}
                      >
                        <Icon className="h-6 w-6" aria-hidden />
                      </div>
                      <h3 className="font-display text-xl font-semibold text-stone-900 sm:text-2xl">{title}</h3>
                      <p className="mt-2 leading-relaxed text-stone-600">{text}</p>
                    </div>
                  </article>
                  </HomeReveal>
                ))}
              </div>
            </div>
          </div>
          </HomeReveal>
        </section>

        {/* Galerie photo */}
        <section id="galerie" className="mx-auto max-w-7xl scroll-mt-20 px-3 py-12 sm:px-6 sm:py-20">
          <HomeReveal>
            <div className="mb-10 flex flex-col gap-4 text-center">
              <span className="home-eyebrow mx-auto">
                <FiCamera className="mr-1.5 inline h-3.5 w-3.5" aria-hidden />
                La vie à l’école
              </span>
              <h2 className="font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[3.15rem]">
                <span className="home-title-lux">Un campus, des visages, une communauté</span>
              </h2>
              <div className="home-section-accent" aria-hidden />
              <p className="mx-auto max-w-2xl text-lg leading-relaxed text-stone-600">
                Classes, laboratoire, bibliothèque, sport et rassemblements : le quotidien de {schoolDisplayName} en images.
              </p>
            </div>
            <div className="grid auto-rows-[12rem] gap-4 sm:auto-rows-[14rem] md:grid-cols-4 md:auto-rows-[11rem]">
              {CAMPUS_GALLERY.map(({ src, alt, label, span }, idx) => (
                <HomeReveal key={src} delayMs={idx * 60} className={`h-full min-h-[12rem] ${span}`}>
                  <figure className="group relative h-full min-h-[12rem] overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-stone-100 shadow-[0_20px_44px_-24px_rgba(28,39,76,0.28)]">
                    <Image
                      src={src}
                      alt={alt}
                      fill
                      className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-950/30 to-transparent px-5 pb-4 pt-12">
                      <p className="text-sm font-semibold text-white">{label}</p>
                    </figcaption>
                  </figure>
                </HomeReveal>
              ))}
            </div>
          </HomeReveal>
        </section>

        {/* Établissement */}
        <section id="etablissement" className="mx-auto max-w-7xl px-3 py-12 sm:px-6 sm:py-20 scroll-mt-20">
          <HomeReveal>
          <div className="home-campus-split group overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-[0_28px_56px_-24px_rgba(12,10,9,0.18)] ring-1 ring-tran-mustard-500/15 transition-all duration-500 hover:ring-tran-mustard-500/25 sm:rounded-[2rem] lg:grid lg:grid-cols-2">
            <div className="relative min-h-[220px] lg:min-h-[400px]">
              <HomePageImage
                slot="homeSplitCampus"
                defaultPath="/home/split-campus.jpg"
                alt="Bâtiment et campus scolaire, perspective architecturale"
                fill
                className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.02]"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div
                className="absolute inset-0 bg-gradient-to-r from-stone-950/50 via-stone-950/10 to-transparent lg:from-stone-950/55"
                aria-hidden
              />
              <div className="absolute bottom-3 left-3 right-3 z-10 rounded-2xl border border-white/15 bg-stone-950/50 p-3 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6 sm:p-4 lg:max-w-xs">
                <p className="text-sm font-semibold text-white">{schoolLocationLabel}</p>
                {schoolCode ? (
                <p className="mt-1 text-xs font-bold tabular-nums text-tran-mustard-200">
                  Code établissement : {schoolCode}
                </p>
                ) : null}
                <p className="mt-1 text-xs text-stone-300">
                  Établissement scolaire ouvert du lundi au vendredi.
                </p>
              </div>
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-10 lg:p-14">
              <span className="inline-flex w-fit items-center rounded-full border border-tran-mustard-200/80 bg-tran-mustard-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tran-mustard-950">
                {schoolShortName}
              </span>
              <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
                <span className="home-title-lux">{schoolDisplayName}, un établissement exigeant</span>
              </h2>
              <div className="home-section-accent mx-0 mt-3" aria-hidden />
              <p className="mt-5 text-lg leading-relaxed text-stone-600">
                {SCHOOL_DEFAULTS.intro}
              </p>
              <ul className="mt-8 space-y-3 text-stone-700">
                {[
                  'Éducation complète au-delà des cours',
                  'Équipes pédagogiques à l’écoute',
                  'Partenariat actif avec les familles',
                ].map((line) => (
                  <li key={line} className="flex items-center gap-3 text-sm font-medium">
                    <FiCheck className="h-5 w-5 shrink-0 text-tran-mauve-600" aria-hidden />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                {schoolPhoneDisplay && schoolPhoneTel ? (
                <a
                  href={schoolPhoneTel}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-tran-mauve-900 px-7 py-4 text-sm font-bold text-white shadow-xl shadow-tran-mauve-900/25 transition-all hover:bg-tran-mauve-800"
                >
                  <FiPhone className="h-4 w-4" aria-hidden />
                  {schoolPhoneDisplay}
                </a>
                ) : null}
                <Link
                  href="/a-propos"
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-stone-300 bg-white px-7 py-4 text-sm font-bold text-stone-900 shadow-sm transition-all hover:border-tran-mustard-400 hover:bg-tran-mustard-50 sm:w-auto"
                >
                  À propos de nous
                </Link>
              </div>
            </div>
          </div>
          </HomeReveal>
        </section>

        {/* Parcours d'admission */}
        <section id="parcours" className="relative overflow-hidden border-y border-stone-200/80 bg-tran-mauve-950 py-12 text-white sm:py-24 scroll-mt-20">
          <div className="page-hero-v2__glow pointer-events-none absolute inset-0 opacity-70" aria-hidden />
          <div className="home-journey-grid pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative z-10 mx-auto max-w-7xl px-3 sm:px-6">
            <HomeReveal>
              <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <div className="relative mb-8 overflow-hidden rounded-[1.75rem] border border-white/15 shadow-2xl">
                    <Image
                      src="/home/admissions-desk.jpg"
                      alt="Famille accueillie au bureau des admissions"
                      width={1200}
                      height={675}
                      className="h-56 w-full object-cover sm:h-72"
                      sizes="(max-width: 1024px) 100vw, 45vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-tran-mauve-950/50 to-transparent" />
                  </div>
                  <span className="inline-flex w-fit items-center rounded-full border border-tran-mustard-300/35 bg-tran-mustard-400/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-tran-mustard-100 backdrop-blur-md">
                    Admissions & accompagnement
                  </span>
                  <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.15rem]">
                    Une inscription claire, premium et rassurante.
                  </h2>
                  <p className="mt-5 max-w-xl text-lg leading-relaxed text-stone-300">
                    Le parcours est conçu pour guider les familles avec méthode : dossier, référence de suivi,
                    échange avec l’établissement et orientation vers la bonne classe.
                  </p>
                  <div className="mt-9 flex w-full flex-col gap-3 sm:flex-row">
                    {!user && (
                      <PreInscriptionSchoolEntry
                        variant="button"
                        buttonVariant="secondary"
                        className="inline-flex w-full items-center justify-center rounded-2xl border-0 bg-white px-5 py-4 text-sm font-bold text-stone-900 shadow-xl hover:bg-tran-mustard-50 sm:w-auto sm:px-7"
                      />
                    )}
                    <Link href="/contact" className="w-full sm:w-auto">
                      <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-5 py-4 text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/15 sm:px-7">
                        <FiMessageSquare className="h-4 w-4" aria-hidden />
                        Demander un renseignement
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {ADMISSION_STEPS.map(({ step, title, text, icon: Icon }, idx) => (
                    <HomeReveal key={title} delayMs={idx * 80}>
                      <article className="home-step-card relative h-full overflow-hidden rounded-3xl border border-white/15 bg-white/[0.08] p-6 shadow-2xl shadow-black/20 backdrop-blur-xl ring-1 ring-white/10">
                        <div className="flex items-center justify-between gap-4">
                          <span className="font-display text-4xl font-black text-white/15">{step}</span>
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tran-mustard-400 text-tran-mauve-950 shadow-lg shadow-tran-mustard-950/20">
                            <Icon className="h-5 w-5" aria-hidden />
                          </span>
                        </div>
                        <h3 className="mt-7 font-display text-xl font-semibold text-white">{title}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-stone-300">{text}</p>
                      </article>
                    </HomeReveal>
                  ))}
                </div>
              </div>
            </HomeReveal>
          </div>
        </section>

        {/* Rôles */}
        <section className="mx-auto max-w-7xl px-3 py-12 sm:px-6 sm:py-20">
          <HomeReveal>
          <div className="text-center">
            <span className="inline-flex items-center rounded-full border border-cptb-blue/15 bg-cptb-blue/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-cptb-blue">
              Communauté
            </span>
            <h2 className="mt-4 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[3.15rem]">
              <span className="home-title-lux">La communauté Mon Ecole</span>
            </h2>
            <div className="home-section-accent mt-4" aria-hidden />
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
              Direction, enseignants, élèves et parents : chacun a sa place dans un projet éducatif commun.
            </p>
          </div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {ROLES.map(({ label, desc, gradient, ring, icon: Icon, image, imageAlt, imageSlot }, idx) => (
              <HomeReveal key={label} delayMs={idx * 55}>
              <div
                className={`home-role-card group relative overflow-hidden rounded-3xl border border-stone-200/80 bg-white shadow-lg shadow-stone-900/[0.06] ring-2 ${ring} transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl`}
              >
                <div className="relative h-40 w-full overflow-hidden">
                  <HomePageImage
                    slot={imageSlot}
                    defaultPath={image}
                    alt={imageAlt}
                    fill
                    className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-110"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/65 via-transparent to-transparent" />
                  <div
                    className={`absolute -bottom-5 left-5 flex h-14 w-14 items-center justify-center rounded-2xl ${gradient} text-white shadow-xl ring-4 ring-white transition-transform duration-300 group-hover:scale-105`}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </div>
                </div>
                <div className="px-6 pb-7 pt-10">
                  <h3 className="font-display text-lg font-semibold text-stone-900">{label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{desc}</p>
                </div>
              </div>
              </HomeReveal>
            ))}
          </div>
          </HomeReveal>
        </section>

        {/* Plateforme digitale */}
        <section className="px-3 py-12 sm:px-6 sm:py-20">
          <HomeReveal>
            <div className="home-platform-panel relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-stone-200/90 bg-stone-950 text-white shadow-[0_34px_80px_-36px_rgba(12,10,9,0.55)] sm:rounded-[2.25rem]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(201,162,39,0.2),transparent_34%),radial-gradient(circle_at_88%_12%,rgba(90,91,154,0.22),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),transparent_45%)]" aria-hidden />
              <div className="relative grid gap-8 p-4 sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
                <div className="flex flex-col justify-between gap-10">
                  <div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-tran-mustard-100 backdrop-blur-md">
                      <FiCpu className="h-3.5 w-3.5" aria-hidden />
                      Écosystème digital
                    </span>
                    <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-tight text-white sm:text-4xl lg:text-[3.15rem]">
                      Une vitrine moderne pour une gestion scolaire plus fluide.
                    </h2>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-300">
                      La page d’accueil présente une image premium de l’établissement et oriente rapidement chaque
                      public vers le bon espace : familles, élèves, enseignants, personnel et direction.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {PLATFORM_FEATURES.map(({ title, text, icon: Icon }) => (
                      <article key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur-md transition-all hover:bg-white/[0.09]">
                        <Icon className="h-5 w-5 text-tran-mustard-300" aria-hidden />
                        <h3 className="mt-4 font-display text-lg font-semibold text-white">{title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-stone-400">{text}</p>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="home-dashboard-mockup relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                  <div className="rounded-[1.35rem] bg-stone-950/90 p-4 ring-1 ring-white/10">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-tran-mustard-200">
                          Tableau de bord
                        </p>
                        <p className="mt-1 font-display text-xl font-semibold">Vue établissement</p>
                      </div>
                      <span className="rounded-full bg-tran-mustard-400 px-3 py-1 text-xs font-bold text-tran-mauve-950">
                        Live
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        ['Admissions', 'Dossiers suivis'],
                        ['Scolarité', 'Paiements contrôlés'],
                        ['Pédagogie', 'Progression visible'],
                        ['Familles', 'Informations centralisées'],
                      ].map(([title, desc], idx) => (
                        <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${
                                idx % 2 === 0
                                  ? 'w-4/5 bg-tran-mustard-400'
                                  : 'w-2/3 bg-tran-mauve-400'
                              }`}
                            />
                          </div>
                          <p className="font-semibold text-white">{title}</p>
                          <p className="mt-1 text-xs text-stone-400">{desc}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-2xl border border-tran-mustard-300/20 bg-tran-mustard-400/10 p-4">
                      <p className="text-sm font-semibold text-tran-mustard-100">
                        Expérience premium, administration plus claire, décisions plus rapides.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </HomeReveal>
        </section>

        {/* Actualités */}
        <section id="actualites" className="mx-auto max-w-7xl px-3 py-12 sm:px-6 sm:py-20 scroll-mt-20">
          <HomeReveal>
            <div className="text-center mb-12">
              <span className="home-eyebrow mx-auto">
                Vie de l&apos;établissement
              </span>
              <h2 className="mt-4 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
                <span className="home-title-lux">Actualités de Mon Ecole</span>
              </h2>
              <div className="home-section-accent mt-4" aria-hidden />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {SCHOOL_NEWS.map((item, idx) => (
                <HomeReveal key={item.title} delayMs={idx * 60}>
                  <article className="home-news-card group h-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white shadow-lg shadow-stone-900/[0.04]">
                    <div className="relative h-44 overflow-hidden sm:h-52">
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        fill
                        className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/45 to-transparent" />
                    </div>
                    <div className="p-6">
                      <p className="text-xs font-bold uppercase tracking-wider text-tran-mustard-800">{item.date}</p>
                      <h3 className="mt-2 font-display text-xl font-semibold text-stone-900">{item.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-stone-600">{item.excerpt}</p>
                    </div>
                  </article>
                </HomeReveal>
              ))}
            </div>
          </HomeReveal>
        </section>

        {/* Infos pratiques */}
        <section className="border-y border-stone-200/80 bg-stone-50 py-12 sm:py-20">
          <div className="mx-auto max-w-7xl px-3 sm:px-6">
            <HomeReveal>
              <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
                <div>
                  <div className="relative mb-6 overflow-hidden rounded-[1.5rem]">
                    <Image
                      src="/home/split-campus.jpg"
                      alt={`Campus de ${schoolDisplayName}`}
                      width={900}
                      height={520}
                      className="h-44 w-full object-cover sm:h-52"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 to-transparent" />
                  </div>
                  <h2 className="font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
                    <span className="home-title-lux">Infos pratiques</span>
                  </h2>
                  <div className="home-section-accent mx-0 mt-3" aria-hidden />
                  <div className="mt-6 space-y-4">
                    <p className="flex items-start gap-3 text-stone-700">
                      <FiMapPin className="mt-0.5 h-5 w-5 shrink-0 text-tran-mustard-700" aria-hidden />
                      <span>
                        <a
                          href={schoolMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-stone-900 hover:text-tran-mustard-800 underline-offset-2 hover:underline"
                          aria-label={`Voir ${schoolDisplayName} sur Google Maps`}
                        >
                          {schoolDisplayName}
                        </a>
                        <br />
                        {schoolLocationLabel}
                      </span>
                    </p>
                    {schoolPhoneDisplay && schoolPhoneTel ? (
                    <p className="flex items-center gap-3 text-stone-700">
                      <FiPhone className="h-5 w-5 shrink-0 text-tran-mustard-700" aria-hidden />
                      <a href={schoolPhoneTel} className="font-semibold text-stone-900 hover:text-tran-mustard-800">
                        {schoolPhoneDisplay}
                      </a>
                    </p>
                    ) : null}
                  </div>
                  <Link href="/contact" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-tran-mustard-900 hover:text-tran-mustard-700">
                    <FiMessageSquare className="h-4 w-4" />
                    Nous écrire
                  </Link>
                </div>
                <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-lg ring-1 ring-stone-900/[0.03] sm:p-8">
                  <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-stone-900">
                    <FiClock className="h-5 w-5 text-tran-mustard-700" aria-hidden />
                    Heures d&apos;ouverture
                  </h3>
                  <table className="mt-5 w-full text-sm">
                    <tbody>
                      {SCHOOL_OPENING_HOURS.map((row) => (
                        <tr key={row.day} className="border-b border-stone-100 last:border-0">
                          <td className="py-2.5 font-medium text-stone-800">{row.day}</td>
                          <td className="py-2.5 text-right tabular-nums text-stone-600">{row.hours}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </HomeReveal>
          </div>
        </section>

        {/* Points forts */}
        <section className="border-y border-stone-200/80 bg-white py-12 sm:py-24">
          <div className="mx-auto max-w-7xl px-3 sm:px-6">
            <HomeReveal>
            <div className="text-center">
              <h2 className="font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
                <span className="home-title-lux">Pourquoi choisir Mon Ecole ?</span>
              </h2>
              <div className="home-section-accent mt-4" aria-hidden />
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
                Nos élèves sont notre fierté : motivation, courage et détermination au service de la réussite.
              </p>
            </div>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {HIGHLIGHTS.map(({ title, text, icon: Icon }, i) => (
                <HomeReveal key={title} delayMs={i * 80}>
                <div
                  className="group relative rounded-3xl border border-tran-mustard-300/50 bg-tran-mustard-100/40 p-[1px] shadow-lg shadow-tran-mustard-900/5 transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="h-full rounded-[1.4rem] bg-white/95 p-5 shadow-inner ring-1 ring-stone-900/[0.03] backdrop-blur-sm sm:p-8">
                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-tran-mustard-800/70">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-tran-mustard-100 text-tran-mustard-900 shadow-md ring-1 ring-tran-mustard-200/80 transition-transform group-hover:scale-105">
                      <Icon className="h-7 w-7" aria-hidden />
                    </div>
                    <h3 className="font-display text-xl font-semibold text-stone-900">{title}</h3>
                    <p className="mt-3 leading-relaxed text-stone-600">{text}</p>
                  </div>
                </div>
                </HomeReveal>
              ))}
            </div>
            </HomeReveal>
          </div>
        </section>

        {/* Témoignages / preuve de confiance */}
        <section className="mx-auto max-w-7xl px-3 py-12 sm:px-6 sm:py-20">
          <HomeReveal>
            <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-stretch">
              <div className="rounded-3xl border border-tran-mustard-200/70 bg-tran-mustard-50 p-5 shadow-xl shadow-tran-mauve-900/[0.05] ring-1 ring-white sm:rounded-[2rem] sm:p-8">
                <span className="inline-flex w-fit items-center rounded-full border border-tran-mustard-200/80 bg-white px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tran-mustard-950">
                  Confiance
                </span>
                <h2 className="mt-5 font-display text-[1.85rem] font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-[2.75rem]">
                  <span className="home-title-lux">Une image d’établissement forte et cohérente.</span>
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-stone-600">
                  Une page d’accueil premium doit rassurer immédiatement : positionnement clair, accès rapides,
                  sérieux institutionnel et chaleur humaine.
                </p>
                <div className="mt-8 flex items-center gap-2">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="h-5 w-5 fill-tran-mustard-400 text-tran-mustard-400" aria-hidden />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-stone-600">Exigence, suivi, réussite</span>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {TESTIMONIALS.map(({ quote, author, role }, idx) => (
                  <HomeReveal key={author} delayMs={idx * 80}>
                    <figure className="home-testimonial-card relative h-full overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-5 shadow-xl shadow-stone-900/[0.05] sm:rounded-[2rem] sm:p-7">
                      <span className="absolute -right-2 -top-8 font-display text-8xl font-black leading-none text-tran-mustard-100" aria-hidden>
                        ”
                      </span>
                      <blockquote className="relative z-10 font-display text-xl font-medium leading-relaxed text-stone-900">
                        “{quote}”
                      </blockquote>
                      <figcaption className="relative z-10 mt-8 border-t border-stone-100 pt-5">
                        <p className="font-semibold text-stone-900">{author}</p>
                        <p className="mt-1 text-sm text-stone-500">{role}</p>
                      </figcaption>
                    </figure>
                  </HomeReveal>
                ))}
              </div>
            </div>
          </HomeReveal>
        </section>

        {/* Citation */}
        <section className="mx-auto max-w-7xl px-3 py-12 sm:px-6 sm:py-20">
          <HomeReveal>
          <div className="home-quote-panel relative overflow-hidden rounded-3xl border border-tran-mustard-200/50 bg-tran-mustard-50 px-4 py-10 text-center shadow-[0_28px_56px_-22px_rgba(90,91,154,0.16)] ring-1 ring-tran-mauve-200/50 sm:rounded-[2rem] sm:px-14 sm:py-16">
            <span
              className="pointer-events-none absolute -left-4 top-6 z-[1] font-display text-[8rem] font-bold leading-none text-tran-mustard-200/45 sm:left-8"
              aria-hidden
            >
              «
            </span>
            <FiMessageSquare className="relative z-10 mx-auto h-11 w-11 text-tran-mustard-800 drop-shadow-sm" aria-hidden />
            <blockquote className="relative z-10 mx-auto mt-8 max-w-3xl font-display text-2xl font-medium leading-snug text-stone-900 sm:text-4xl sm:leading-snug">
              {SCHOOL_DEFAULTS.motto}
            </blockquote>
            <p className="relative z-10 mt-8 text-sm font-semibold uppercase tracking-wider text-stone-500">
              {SCHOOL_DEFAULTS.fullName}
            </p>
            <div className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-2">
              {[...Array(5)].map((_, i) => (
                <FiStar key={i} className="h-5 w-5 fill-tran-mustard-400 text-tran-mustard-400" aria-hidden />
              ))}
              <span className="ml-2 text-sm font-medium text-stone-600">Nos élèves, notre fierté</span>
            </div>
          </div>
          </HomeReveal>
        </section>

        {/* CTA final */}
        <section className="mx-auto max-w-7xl px-3 pb-16 sm:px-6 sm:pb-28">
          <HomeReveal>
          <div className="home-cta-shell relative overflow-hidden rounded-3xl bg-tran-mauve-950 px-4 py-12 text-center sm:rounded-[2rem] sm:px-12 sm:py-20 lg:py-24">
            <div className="home-cta-aurora pointer-events-none absolute inset-0 z-[1]" aria-hidden />
            <div className="relative z-10 mx-auto max-w-2xl">
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.5)] backdrop-blur-md ring-1 ring-tran-mustard-400/20">
                <FiClock className="h-8 w-8 text-tran-mustard-200" aria-hidden />
              </div>
              <h2 className="home-cta-title font-display text-[1.85rem] font-semibold sm:text-4xl lg:text-[3.25rem]">
                Rejoignez {schoolDisplayName}
              </h2>
              <p className="mt-5 text-lg text-stone-400">
                Inscription en ligne, espace sécurisé pour les familles et l’équipe pédagogique.
                {schoolPhoneDisplay && schoolPhoneTel ? (
                  <>
                    {' '}
                    Pour toute question :{' '}
                    <a href={schoolPhoneTel} className="font-semibold text-tran-mustard-200 hover:text-white">
                      {schoolPhoneDisplay}
                    </a>
                    .
                  </>
                ) : null}
              </p>
              <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-12 sm:items-center sm:gap-4 sm:flex-row">
                {!user ? (
                  <>
                    <Link href="/login" className="w-full sm:w-auto">
                      <Button
                        size="lg"
                        variant="secondary"
                        className="w-full min-w-0 border-0 bg-white font-bold text-stone-900 shadow-xl hover:bg-tran-mustard-50 sm:min-w-[220px]"
                      >
                        Se connecter
                      </Button>
                    </Link>
                    <Link href="/contact" className="w-full sm:w-auto">
                      <span className="inline-flex w-full min-w-0 items-center justify-center rounded-2xl border-2 border-white/35 bg-transparent px-6 py-4 text-base font-bold text-white transition-colors hover:bg-white/10 sm:min-w-[220px] sm:px-8">
                        Parler à un responsable
                      </span>
                    </Link>
                  </>
                ) : (
                  <Link href={getRoleDashboardPath(user.role)} className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="w-full border-0 bg-white font-bold text-stone-900 shadow-xl hover:bg-tran-mustard-50"
                    >
                      Retour à mon espace
                    </Button>
                  </Link>
                )}
              </div>
              <p className="mt-12 text-sm text-stone-500">
                <Link
                  href="/examens-blancs"
                  className="font-medium text-tran-mustard-200/90 underline decoration-tran-mustard-400/40 underline-offset-4 hover:text-white"
                >
                  Examens blancs
                </Link>
                <span className="mx-2 text-stone-600">·</span>
                <Link
                  href="/faq"
                  className="font-medium text-tran-mustard-200/90 underline decoration-tran-mustard-400/40 underline-offset-4 hover:text-white"
                >
                  Questions fréquentes
                </Link>
                <span className="mx-2 text-stone-600">·</span>
                <Link
                  href="/contact"
                  className="font-medium text-tran-mustard-200/90 underline decoration-tran-mustard-400/40 underline-offset-4 hover:text-white"
                >
                  Contact
                </Link>
              </p>
            </div>
          </div>
          </HomeReveal>
        </section>
      </main>

      <Footer />
      </PublicSectionsReveal>
    </div>
  );
}
