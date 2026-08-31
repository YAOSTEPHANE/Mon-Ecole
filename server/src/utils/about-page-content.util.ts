/** Contenu éditable de la page publique `/a-propos` (AppBranding.aboutPageContent). */

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

const STRING_LIMITS: Record<
  Exclude<keyof AboutPageContentRecord, 'atouts' | 'platformFeatures' | 'platformGoals'>,
  number
> = {
  tagline: 300,
  heroTitle: 120,
  founderParagraphs: 20_000,
  missionTitle: 120,
  missionText: 2_000,
  valuesTitle: 120,
  valuesText: 2_000,
  statsEyebrow: 80,
  statsTitle: 200,
  atoutsEyebrow: 80,
  atoutsTitle: 200,
  platformBadge: 120,
  platformTitle: 200,
  platformIntro: 4_000,
  staffEyebrow: 80,
  staffTitle: 200,
  staffText: 2_000,
  campusesEyebrow: 80,
  campusesTitle: 200,
  reglementEyebrow: 80,
  reglementTitle: 200,
  reglementText: 2_000,
};

const MAX_ATOUTS = 3;
const MAX_FEATURES = 5;
const MAX_GOALS = 8;
const ITEM_TITLE_MAX = 120;
const ITEM_TEXT_MAX = 800;
const GOAL_MAX = 400;

function trimNullable(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function parseTitleTextList(
  raw: unknown,
  maxItems: number,
): AboutTitleTextItem[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (!Array.isArray(raw)) return undefined;
  const out: AboutTitleTextItem[] = [];
  for (const item of raw.slice(0, maxItems)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const title = trimNullable((item as { title?: unknown }).title, ITEM_TITLE_MAX);
    const text = trimNullable((item as { text?: unknown }).text, ITEM_TEXT_MAX);
    if (!title && !text) continue;
    out.push({ title: title ?? '', text: text ?? '' });
  }
  return out;
}

function parseGoals(raw: unknown): string[] | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw === 'string') {
    const parts = raw
      .split(/\n+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(0, MAX_GOALS)
      .map((p) => p.slice(0, GOAL_MAX));
    return parts.length > 0 ? parts : null;
  }
  if (!Array.isArray(raw)) return undefined;
  const out: string[] = [];
  for (const item of raw.slice(0, MAX_GOALS)) {
    if (typeof item !== 'string') continue;
    const t = item.trim().slice(0, GOAL_MAX);
    if (t) out.push(t);
  }
  return out.length > 0 ? out : null;
}

/** Parse et borne le JSON reçu (PUT admin). `null` = reset. */
export function sanitizeAboutPageContent(raw: unknown): AboutPageContentRecord | null {
  if (raw === null) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const src = raw as Record<string, unknown>;
  const out: AboutPageContentRecord = {};

  for (const [key, max] of Object.entries(STRING_LIMITS) as Array<
    [keyof typeof STRING_LIMITS, number]
  >) {
    const v = trimNullable(src[key], max);
    if (v !== undefined) out[key] = v;
  }

  const atouts = parseTitleTextList(src.atouts, MAX_ATOUTS);
  if (atouts !== undefined) out.atouts = atouts;

  const features = parseTitleTextList(src.platformFeatures, MAX_FEATURES);
  if (features !== undefined) out.platformFeatures = features;

  const goals = parseGoals(src.platformGoals);
  if (goals !== undefined) out.platformGoals = goals;

  return out;
}

/** Forme publique : objet borné ou null. */
export function toPublicAboutPageContent(raw: unknown): AboutPageContentRecord | null {
  if (raw === null || raw === undefined) return null;
  return sanitizeAboutPageContent(raw);
}
