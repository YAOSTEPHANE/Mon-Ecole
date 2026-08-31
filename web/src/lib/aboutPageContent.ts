import {
  ABOUT_ATOUTS,
  ABOUT_PLATFORM_FEATURES,
  ABOUT_PLATFORM_GOALS,
  ABOUT_TAGLINE,
  founderParagraphs,
} from '@/data/schoolAbout';
import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';
import { applySchoolNameToText } from '@/lib/resolveSchoolBranding';

export type AboutTitleTextItem = {
  title: string;
  text: string;
};

export type AboutPageContentRecord = {
  tagline?: string | null;
  heroTitle?: string | null;
  founderParagraphs?: string | null;
  missionTitle?: string | null;
  missionText?: string | null;
  valuesTitle?: string | null;
  valuesText?: string | null;
  statsEyebrow?: string | null;
  statsTitle?: string | null;
  atoutsEyebrow?: string | null;
  atoutsTitle?: string | null;
  atouts?: AboutTitleTextItem[] | null;
  platformBadge?: string | null;
  platformTitle?: string | null;
  platformIntro?: string | null;
  platformFeatures?: AboutTitleTextItem[] | null;
  platformGoals?: string[] | null;
  staffEyebrow?: string | null;
  staffTitle?: string | null;
  staffText?: string | null;
  campusesEyebrow?: string | null;
  campusesTitle?: string | null;
  reglementEyebrow?: string | null;
  reglementTitle?: string | null;
  reglementText?: string | null;
};

export type ResolvedAboutPageContent = {
  tagline: string;
  heroTitle: string;
  founderParagraphs: string[];
  missionTitle: string;
  missionText: string;
  valuesTitle: string;
  valuesText: string;
  statsEyebrow: string;
  statsTitle: string;
  atoutsEyebrow: string;
  atoutsTitle: string;
  atouts: Array<AboutTitleTextItem & { image: string; imageAlt: string }>;
  platformBadge: string;
  platformTitle: string;
  platformIntro: string;
  platformFeatures: AboutTitleTextItem[];
  platformGoals: string[];
  staffEyebrow: string;
  staffTitle: string;
  staffText: string;
  campusesEyebrow: string;
  campusesTitle: string;
  reglementEyebrow: string;
  reglementTitle: string;
  reglementText: string;
};

const DEFAULT_MISSION_TITLE = 'Former avec exigence';
const DEFAULT_VALUES_TITLE = 'Un cadre humain';
const DEFAULT_STATS_EYEBROW = 'Quelques chiffres';
const DEFAULT_STATS_TITLE = 'Une école tournée vers la réussite';
const DEFAULT_ATOUTS_EYEBROW = 'Nos atouts';
const DEFAULT_ATOUTS_TITLE = 'Pourquoi les familles nous font confiance';
const DEFAULT_PLATFORM_TITLE = 'Une plateforme numérique moderne et sécurisée';
const DEFAULT_STAFF_EYEBROW = 'Le personnel';
const DEFAULT_STAFF_TITLE = 'Une communauté éducative soudée';
const DEFAULT_STAFF_TEXT =
  'La réussite de chaque élève repose sur une équipe pédagogique et administrative engagée, compétente et disponible.';
const DEFAULT_CAMPUSES_EYEBROW = 'Nos établissements';
const DEFAULT_CAMPUSES_TITLE = 'Des cycles complets, de la maternelle au supérieur';
const DEFAULT_REGLEMENT_EYEBROW = 'Règlement intérieur';
const DEFAULT_REGLEMENT_TITLE = 'Un cadre clair pour toute la communauté';
const DEFAULT_REGLEMENT_TEXT =
  'Le règlement intérieur régit l’environnement scolaire, les activités de l’école et les relations entre personnels, élèves et familles. Il est lu chaque année à la réunion de rentrée.';
const DEFAULT_HERO_TITLE = 'À propos de nous';

function pick(value: string | null | undefined, fallback: string): string {
  const t = value?.trim();
  return t || fallback;
}

function paragraphsFromBody(body: string | null | undefined, schoolName: string): string[] {
  if (!body?.trim()) {
    return founderParagraphs(schoolName);
  }
  const parts = body
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => applySchoolNameToText(p, schoolName));
  return parts.length > 0 ? parts : founderParagraphs(schoolName);
}

export function founderBodyFromParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}

export function parseAboutPageContent(raw: unknown): AboutPageContentRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as AboutPageContentRecord;
}

export function defaultAboutPageDraft(schoolName: string): AboutPageContentRecord {
  const founders = founderParagraphs(schoolName);
  return {
    tagline: ABOUT_TAGLINE,
    heroTitle: DEFAULT_HERO_TITLE,
    founderParagraphs: founderBodyFromParagraphs(founders),
    missionTitle: DEFAULT_MISSION_TITLE,
    missionText: SCHOOL_DEFAULTS.mission,
    valuesTitle: DEFAULT_VALUES_TITLE,
    valuesText: `${SCHOOL_DEFAULTS.valuesLine} ${SCHOOL_DEFAULTS.tagline}`,
    statsEyebrow: DEFAULT_STATS_EYEBROW,
    statsTitle: DEFAULT_STATS_TITLE,
    atoutsEyebrow: DEFAULT_ATOUTS_EYEBROW,
    atoutsTitle: DEFAULT_ATOUTS_TITLE,
    atouts: ABOUT_ATOUTS.map((a) => ({ title: a.title, text: a.text })),
    platformBadge: `Du nouveau à ${schoolName}`,
    platformTitle: DEFAULT_PLATFORM_TITLE,
    platformIntro: `Afin de renforcer la communication entre l’école, les élèves et les parents, ${schoolName} a mis en place un espace en ligne. Chaque famille peut consulter en temps réel les informations essentielles de la scolarité, depuis un ordinateur, une tablette ou un smartphone.`,
    platformFeatures: ABOUT_PLATFORM_FEATURES.map((f) => ({ title: f.title, text: f.text })),
    platformGoals: [...ABOUT_PLATFORM_GOALS],
    staffEyebrow: DEFAULT_STAFF_EYEBROW,
    staffTitle: DEFAULT_STAFF_TITLE,
    staffText: DEFAULT_STAFF_TEXT,
    campusesEyebrow: DEFAULT_CAMPUSES_EYEBROW,
    campusesTitle: DEFAULT_CAMPUSES_TITLE,
    reglementEyebrow: DEFAULT_REGLEMENT_EYEBROW,
    reglementTitle: DEFAULT_REGLEMENT_TITLE,
    reglementText: DEFAULT_REGLEMENT_TEXT,
  };
}

export function resolveAboutPageContent(
  raw: AboutPageContentRecord | null | undefined,
  schoolName: string,
  schoolShortName?: string,
): ResolvedAboutPageContent {
  const short = schoolShortName?.trim() || schoolName;
  const defaults = defaultAboutPageDraft(schoolName);

  const atoutsOverrides = Array.isArray(raw?.atouts) ? raw!.atouts! : null;
  const atouts = ABOUT_ATOUTS.map((base, idx) => {
    const o = atoutsOverrides?.[idx];
    return {
      title: pick(o?.title, base.title),
      text: pick(o?.text, base.text),
      image: base.image,
      imageAlt: base.imageAlt,
    };
  });

  const featureOverrides = Array.isArray(raw?.platformFeatures) ? raw!.platformFeatures! : null;
  const platformFeatures = ABOUT_PLATFORM_FEATURES.map((base, idx) => {
    const o = featureOverrides?.[idx];
    return {
      title: pick(o?.title, base.title),
      text: pick(o?.text, base.text),
    };
  });

  const goalOverrides = Array.isArray(raw?.platformGoals)
    ? raw!.platformGoals!.map((g) => g.trim()).filter(Boolean)
    : null;

  return {
    tagline: pick(raw?.tagline, ABOUT_TAGLINE),
    heroTitle: pick(raw?.heroTitle, DEFAULT_HERO_TITLE),
    founderParagraphs: paragraphsFromBody(raw?.founderParagraphs, schoolName),
    missionTitle: pick(raw?.missionTitle, DEFAULT_MISSION_TITLE),
    missionText: pick(raw?.missionText, SCHOOL_DEFAULTS.mission),
    valuesTitle: pick(raw?.valuesTitle, DEFAULT_VALUES_TITLE),
    valuesText: pick(
      raw?.valuesText,
      `${SCHOOL_DEFAULTS.valuesLine} ${SCHOOL_DEFAULTS.tagline}`,
    ),
    statsEyebrow: pick(raw?.statsEyebrow, DEFAULT_STATS_EYEBROW),
    statsTitle: pick(raw?.statsTitle, DEFAULT_STATS_TITLE),
    atoutsEyebrow: pick(raw?.atoutsEyebrow, DEFAULT_ATOUTS_EYEBROW),
    atoutsTitle: pick(raw?.atoutsTitle, DEFAULT_ATOUTS_TITLE),
    atouts,
    platformBadge: pick(raw?.platformBadge, `Du nouveau à ${short}`),
    platformTitle: pick(raw?.platformTitle, DEFAULT_PLATFORM_TITLE),
    platformIntro: pick(
      raw?.platformIntro,
      applySchoolNameToText(defaults.platformIntro ?? '', schoolName),
    ),
    platformFeatures,
    platformGoals:
      goalOverrides && goalOverrides.length > 0 ? goalOverrides : [...ABOUT_PLATFORM_GOALS],
    staffEyebrow: pick(raw?.staffEyebrow, DEFAULT_STAFF_EYEBROW),
    staffTitle: pick(raw?.staffTitle, DEFAULT_STAFF_TITLE),
    staffText: pick(raw?.staffText, DEFAULT_STAFF_TEXT),
    campusesEyebrow: pick(raw?.campusesEyebrow, DEFAULT_CAMPUSES_EYEBROW),
    campusesTitle: pick(raw?.campusesTitle, DEFAULT_CAMPUSES_TITLE),
    reglementEyebrow: pick(raw?.reglementEyebrow, DEFAULT_REGLEMENT_EYEBROW),
    reglementTitle: pick(raw?.reglementTitle, DEFAULT_REGLEMENT_TITLE),
    reglementText: pick(raw?.reglementText, DEFAULT_REGLEMENT_TEXT),
  };
}

/** Draft admin : valeurs résolues (prêtes à éditer), en conservant les overrides stockés. */
export function aboutPageContentToDraft(
  raw: AboutPageContentRecord | null | undefined,
  schoolName: string,
  schoolShortName?: string,
): AboutPageContentRecord {
  const resolved = resolveAboutPageContent(raw, schoolName, schoolShortName);
  return {
    tagline: resolved.tagline,
    heroTitle: resolved.heroTitle,
    founderParagraphs: founderBodyFromParagraphs(resolved.founderParagraphs),
    missionTitle: resolved.missionTitle,
    missionText: resolved.missionText,
    valuesTitle: resolved.valuesTitle,
    valuesText: resolved.valuesText,
    statsEyebrow: resolved.statsEyebrow,
    statsTitle: resolved.statsTitle,
    atoutsEyebrow: resolved.atoutsEyebrow,
    atoutsTitle: resolved.atoutsTitle,
    atouts: resolved.atouts.map(({ title, text }) => ({ title, text })),
    platformBadge: resolved.platformBadge,
    platformTitle: resolved.platformTitle,
    platformIntro: resolved.platformIntro,
    platformFeatures: resolved.platformFeatures,
    platformGoals: resolved.platformGoals,
    staffEyebrow: resolved.staffEyebrow,
    staffTitle: resolved.staffTitle,
    staffText: resolved.staffText,
    campusesEyebrow: resolved.campusesEyebrow,
    campusesTitle: resolved.campusesTitle,
    reglementEyebrow: resolved.reglementEyebrow,
    reglementTitle: resolved.reglementTitle,
    reglementText: resolved.reglementText,
  };
}
