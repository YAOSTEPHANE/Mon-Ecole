import { Agent, fetch as undiciFetch } from 'undici';

export type FneCycle = 'secondary' | 'primary';

export type FneYearOption = { value: string; label: string };

export type FneSchoolOption = { id: string; name: string };

export type FneLookupResult = {
  fullName: string;
  matricule: string;
  dateOfBirth: string | null;
  birthPlace: string | null;
  father: string | null;
  mother: string | null;
  establishment: string | null;
  establishmentCode: string | null;
  fileYear: string;
};

export type FneLookupResponse = {
  cycle: FneCycle;
  query: {
    annee: string;
    nom: string;
    prenoms: string;
    datenaiss: string;
    etablissement: string;
  };
  results: FneLookupResult[];
  truncated: boolean;
  sourceUrl: string;
  note: string | null;
};

const SECONDARY = {
  origin: 'http://agfne.sigfne.net',
  formPath: '/vas/recherche-matricule-eleve-dsps/',
  postPath: '/vas/recherche-matricule-eleve/',
} as const;

const PRIMARY = {
  origin: 'https://agcp.sigfne.net',
  formPath: '/edit/recherche-matricule-eleve-dsps/',
  postPath: '/edit/recherche-matricule-eleve/',
} as const;

/** Certificat du portail primaire souvent invalide côté Node. */
const insecureTlsAgent = new Agent({ connect: { rejectUnauthorized: false } });

/** Première année scolaire proposée (début civil). */
const FNE_YEAR_RANGE_START = 2010;

/**
 * Construit les codes FNE `YYZZ` (ex. 2425 = 2024-2025) jusqu’à l’année scolaire
 * en cours (+1 pour anticiper l’ouverture du prochain fichier).
 */
export function buildFneYearOptions(
  startYear: number = FNE_YEAR_RANGE_START,
  endStartYear?: number
): FneYearOption[] {
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth() + 1;
  // Même logique que l’année scolaire app : sept.–déc. = année en cours → suivante
  const currentStart = utcMonth >= 9 ? utcYear : utcYear - 1;
  const lastStart = endStartYear ?? currentStart + 1;
  const years: FneYearOption[] = [];
  for (let y = startYear; y <= lastStart; y += 1) {
    const a = String(y).slice(-2);
    const b = String(y + 1).slice(-2);
    years.push({ value: `${a}${b}`, label: `Fichier ${y}-${y + 1}` });
  }
  return years;
}

/** Fusionne options portail + plage complète (le SIGFNE secondaire n’expose souvent que 3 années). */
export function mergeFneYearOptions(
  scraped: FneYearOption[],
  fallback: FneYearOption[]
): FneYearOption[] {
  const byValue = new Map<string, FneYearOption>();
  for (const y of fallback) byValue.set(y.value, y);
  for (const y of scraped) {
    if (!y.value) continue;
    byValue.set(y.value, y);
  }
  return [...byValue.values()].sort((a, b) => a.value.localeCompare(b.value));
}

const DEFAULT_SECONDARY_YEARS: FneYearOption[] = buildFneYearOptions();
const DEFAULT_PRIMARY_YEARS: FneYearOption[] = buildFneYearOptions();

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(s: string): string {
  return decodeHtml(s.replace(/<[^>]+>/g, ' '));
}

function endpoints(cycle: FneCycle) {
  return cycle === 'primary' ? PRIMARY : SECONDARY;
}

async function fetchText(
  cycle: FneCycle,
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
): Promise<{ status: number; text: string; setCookie: string[] }> {
  if (cycle === 'primary') {
    const res = await undiciFetch(url, {
      method: init?.method ?? 'GET',
      headers: init?.headers,
      body: init?.body,
      dispatcher: insecureTlsAgent,
      redirect: 'follow',
    });
    const setCookie =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    return { status: res.status, text: await res.text(), setCookie };
  }

  const res = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: init?.headers,
    body: init?.body,
    redirect: 'follow',
  });
  const setCookie =
    typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
  return { status: res.status, text: await res.text(), setCookie };
}

function parseYearOptions(html: string, fallback: FneYearOption[]): FneYearOption[] {
  const block = (html.match(/name=["']annee["'][\s\S]*?<\/select>/i) || [''])[0];
  if (!block) return fallback;
  const years: FneYearOption[] = [];
  const re = /<option value="([^"]*)">([^<]*)<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const value = m[1].trim();
    const label = decodeHtml(m[2]);
    if (!value) continue;
    years.push({ value, label });
  }
  return years.length > 0 ? years : fallback;
}

function parseSchoolOptions(html: string): FneSchoolOption[] {
  const block = (html.match(/name=["']etablissement["'][\s\S]*?<\/select>/i) || [''])[0];
  if (!block) return [];
  const schools: FneSchoolOption[] = [];
  const re = /<option value="(\d+)">\s*([^<]*?)\s*<\/option>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    schools.push({ id: m[1], name: decodeHtml(m[2]) });
  }
  return schools;
}

export function parseFneSearchResults(html: string, fileYear: string): FneLookupResult[] {
  const tbody = (html.match(/<tbody>([\s\S]*?)<\/tbody>/i) || [])[1] || '';
  const results: FneLookupResult[] = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let tr: RegExpExecArray | null;
  while ((tr = trRe.exec(tbody)) !== null) {
    const cell = tr[1];
    const fullName = stripTags((cell.match(/<h5[^>]*>([\s\S]*?)<\/h5>/i) || [])[1] || '');
    const matricule =
      stripTags(
        (cell.match(/Matricule:\s*<span[^>]*>([\s\S]*?)<\/span>/i) ||
          cell.match(/name=["']matricule["']\s+value=["']([^"']+)["']/i) ||
          [])[1] || ''
      ) || '';
    if (!fullName && !matricule) continue;

    const para = stripTags((cell.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1] || '');
    const dobMatch = para.match(/Né\(e\)\s+le\s+([0-9]{1,2}-[0-9]{1,2}-[0-9]{4})\s+à\s+(.+?)(?:\s+Père:|$)/i);
    const parentsMatch = para.match(/Père:\s*(.*?)\s*-\s*Mère:\s*(.*?)(?:\s+Etablissement:|\s+Ecole:|$)/i);
    const etabMatch =
      para.match(/Etablissement:\s*(.+?)\s+Code:\s*(\d+)/i) ||
      para.match(/Ecole:\s*([^\s]+)\s*-\s*(.+?)(?:\s+IEPP:|$)/i);

    let establishment: string | null = null;
    let establishmentCode: string | null = null;
    if (etabMatch) {
      if (/Etablissement:/i.test(para)) {
        establishment = etabMatch[1]?.trim() || null;
        establishmentCode = etabMatch[2]?.trim() || null;
      } else {
        establishmentCode = etabMatch[1]?.trim() || null;
        establishment = etabMatch[2]?.trim() || null;
      }
    }

    results.push({
      fullName,
      matricule,
      dateOfBirth: dobMatch?.[1] ?? null,
      birthPlace: dobMatch?.[2]?.trim() || null,
      father: parentsMatch?.[1]?.trim() || null,
      mother: parentsMatch?.[2]?.trim() || null,
      establishment,
      establishmentCode,
      fileYear,
    });
  }
  return results;
}

/** Convertit une date ISO (yyyy-mm-dd) ou déjà dd-mm-yyyy vers le format du portail FNE. */
export function toFneDateFormat(raw: string | null | undefined): string {
  const v = (raw || '').trim();
  if (!v) return '';
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(v)) return v;
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const slash = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return `${slash[1].padStart(2, '0')}-${slash[2].padStart(2, '0')}-${slash[3]}`;
  return v;
}

export async function getFneFormOptions(cycle: FneCycle = 'secondary'): Promise<{
  cycle: FneCycle;
  years: FneYearOption[];
  schools: FneSchoolOption[];
  formUrl: string;
}> {
  const ep = endpoints(cycle);
  const formUrl = `${ep.origin}${ep.formPath}`;
  const fallbackYears = cycle === 'primary' ? DEFAULT_PRIMARY_YEARS : DEFAULT_SECONDARY_YEARS;
  try {
    const page = await fetchText(cycle, formUrl);
    if (page.status >= 400) {
      return { cycle, years: fallbackYears, schools: [], formUrl };
    }
    const scraped = parseYearOptions(page.text, []);
    return {
      cycle,
      years: mergeFneYearOptions(scraped, fallbackYears),
      schools: parseSchoolOptions(page.text),
      formUrl,
    };
  } catch {
    return { cycle, years: fallbackYears, schools: [], formUrl };
  }
}

export async function searchFneMatricule(input: {
  cycle?: FneCycle;
  annee: string;
  nom: string;
  prenoms?: string;
  datenaiss?: string;
  etablissement?: string;
}): Promise<FneLookupResponse> {
  const cycle: FneCycle = input.cycle === 'primary' ? 'primary' : 'secondary';
  const ep = endpoints(cycle);
  const formUrl = `${ep.origin}${ep.formPath}`;
  const postUrl = `${ep.origin}${ep.postPath}`;

  const nom = input.nom.trim().toUpperCase();
  const prenoms = (input.prenoms || '').trim().toUpperCase();
  const datenaiss = toFneDateFormat(input.datenaiss);
  const etablissement = (input.etablissement || '').trim();
  const annee = input.annee.trim();

  if (!nom && !prenoms && !datenaiss && !etablissement) {
    throw new Error('Indiquez au moins un critère (nom, prénoms, date de naissance ou établissement).');
  }
  if (!annee) {
    throw new Error('Sélectionnez un fichier / année FNE.');
  }

  const page = await fetchText(cycle, formUrl);
  if (page.status >= 400) {
    throw new Error(`Portail FNE indisponible (HTTP ${page.status}).`);
  }

  const cookie = page.setCookie.map((c) => c.split(';')[0]).join('; ');
  const body = new URLSearchParams({
    annee,
    nom,
    prenoms,
    datenaiss,
    etablissement,
  }).toString();

  const post = await fetchText(cycle, postUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: ep.origin,
      Referer: formUrl,
      'User-Agent': 'SchoolManager/1.0 (FNE matricule lookup)',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body,
  });

  if (post.status >= 400) {
    throw new Error(`Recherche FNE refusée (HTTP ${post.status}).`);
  }

  const results = parseFneSearchResults(post.text, annee);
  const truncated = /10 premières personnes/i.test(post.text);

  let note: string | null = null;
  if (results.length === 0) {
    note =
      cycle === 'secondary'
        ? 'Aucun résultat. Vérifiez l’orthographe, la date (jj-mm-aaaa) et le fichier année. Le portail secondaire public n’expose parfois que d’anciens fichiers.'
        : 'Aucun résultat sur le fichier primaire pour ces critères.';
  } else if (truncated) {
    note = 'Le portail FNE ne renvoie que les 10 premiers résultats — affinez la recherche si besoin.';
  }

  return {
    cycle,
    query: { annee, nom, prenoms, datenaiss, etablissement },
    results,
    truncated,
    sourceUrl: formUrl,
    note,
  };
}

export function findSchoolOption(
  schools: FneSchoolOption[],
  schoolCode: string | null | undefined,
  schoolNameHint?: string | null
): FneSchoolOption | null {
  const code = (schoolCode || '').trim();
  if (code) {
    const byCode = schools.find((s) => s.id === code || s.id.replace(/^0+/, '') === code.replace(/^0+/, ''));
    if (byCode) return byCode;
  }
  const hint = (schoolNameHint || '').trim().toLowerCase();
  if (hint) {
    const byName = schools.find((s) => s.name.toLowerCase().includes(hint) || hint.includes(s.name.toLowerCase()));
    if (byName) return byName;
  }
  return null;
}
