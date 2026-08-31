import {
  ABOUT_REGLEMENT_CHAPTERS,
  ABOUT_REGLEMENT_META,
  type AboutReglementChapter,
} from '@/data/schoolAbout';

export type RulebookMeta = {
  republic?: string;
  motto?: string;
  ministry?: string;
  year?: string;
};

export type ParsedRulebookContent = {
  meta: RulebookMeta;
  chapters: AboutReglementChapter[];
  plainText?: string;
};

export function defaultRulebookJson(): string {
  return JSON.stringify(
    {
      meta: ABOUT_REGLEMENT_META,
      chapters: ABOUT_REGLEMENT_CHAPTERS,
    },
    null,
    2,
  );
}

function isChapterArray(value: unknown): value is AboutReglementChapter[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  return value.every(
    (ch) =>
      typeof ch === 'object' &&
      ch !== null &&
      typeof (ch as AboutReglementChapter).title === 'string' &&
      Array.isArray((ch as AboutReglementChapter).articles),
  );
}

function parseMeta(value: unknown): RulebookMeta {
  if (!value || typeof value !== 'object') return {};
  const m = value as Record<string, unknown>;
  return {
    republic: typeof m.republic === 'string' ? m.republic : undefined,
    motto: typeof m.motto === 'string' ? m.motto : undefined,
    ministry: typeof m.ministry === 'string' ? m.ministry : undefined,
    year: typeof m.year === 'string' ? m.year : undefined,
  };
}

/** Parse le contenu admin (JSON structuré ou texte brut). */
export function parseRulebookContent(content: string): ParsedRulebookContent | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      if (isChapterArray(parsed.chapters)) {
        return {
          meta: parseMeta(parsed.meta),
          chapters: parsed.chapters,
        };
      }
      if (typeof parsed.plainText === 'string' && parsed.plainText.trim()) {
        return {
          meta: parseMeta(parsed.meta),
          chapters: [],
          plainText: parsed.plainText.trim(),
        };
      }
    } catch {
      /* texte libre ci-dessous */
    }
  }

  return {
    meta: {},
    chapters: [],
    plainText: trimmed,
  };
}
