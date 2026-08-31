import { SCHOOL_DEFAULTS } from '@/data/schoolDefaults';

type BrandingNameFields = {
  schoolDisplayName?: string | null;
  appTitle?: string | null;
  appTagline?: string | null;
};

/** Nom affiché sur l’accueil, le footer, les PDF et les pages publiques. */
export function resolveSchoolDisplayName(
  branding: BrandingNameFields | null | undefined,
): string {
  return (
    branding?.schoolDisplayName?.trim() ||
    branding?.appTitle?.trim() ||
    SCHOOL_DEFAULTS.fullName
  );
}

export function resolveSchoolTagline(
  branding: BrandingNameFields | null | undefined,
): string {
  return branding?.appTagline?.trim() || SCHOOL_DEFAULTS.tagline;
}

/** Remplace le nom par défaut dans un texte modèle (ex. mot de la directrice). */
export function applySchoolNameToText(text: string, schoolName: string): string {
  if (!schoolName || schoolName === SCHOOL_DEFAULTS.fullName) return text;
  return text.split(SCHOOL_DEFAULTS.fullName).join(schoolName);
}

export function resolveSchoolIntro(schoolName: string): string {
  return applySchoolNameToText(SCHOOL_DEFAULTS.intro, schoolName);
}
