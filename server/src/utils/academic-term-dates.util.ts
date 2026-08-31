import { getAppBrandingDelegate, APP_BRANDING_ID } from './app-branding-prisma.util';
import { brandingIdForSchool } from './school-context.util';

/** Jour/mois d’un trimestre (réutilisable chaque année scolaire). */
export type TermBoundary = {
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
};

export type AcademicTermDatesConfig = {
  trim1?: TermBoundary;
  trim2?: TermBoundary;
  trim3?: TermBoundary;
  sem1?: TermBoundary;
  sem2?: TermBoundary;
};

export const DEFAULT_TERM_BOUNDARIES: Record<string, TermBoundary> = {
  trim1: { startMonth: 9, startDay: 1, endMonth: 11, endDay: 30 },
  trim2: { startMonth: 12, startDay: 1, endMonth: 2, endDay: 28 },
  trim3: { startMonth: 3, startDay: 1, endMonth: 6, endDay: 30 },
  sem1: { startMonth: 9, startDay: 1, endMonth: 2, endDay: 28 },
  sem2: { startMonth: 3, startDay: 1, endMonth: 6, endDay: 30 },
};

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function parseAcademicYearParts(academicYear: string): { yearStart: number; yearEnd: number } | null {
  const parts = academicYear.split('-').map((x) => parseInt(x.trim(), 10));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return { yearStart: parts[0], yearEnd: parts[1] };
}

/** Mois 9–12 → année de début ; mois 1–8 → année de fin. */
export function calendarYearForSchoolMonth(month: number, yearStart: number, yearEnd: number): number {
  return month >= 9 ? yearStart : yearEnd;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, month));
}

export function boundaryToDates(
  boundary: TermBoundary,
  academicYear: string,
): { start: Date; end: Date } | null {
  const parts = parseAcademicYearParts(academicYear);
  if (!parts) return null;
  const { yearStart, yearEnd } = parts;
  const startYear = calendarYearForSchoolMonth(boundary.startMonth, yearStart, yearEnd);
  const endYear = calendarYearForSchoolMonth(boundary.endMonth, yearStart, yearEnd);
  const start = new Date(
    startYear,
    boundary.startMonth - 1,
    clampDay(startYear, boundary.startMonth, boundary.startDay),
  );
  const end = endOfDay(
    new Date(
      endYear,
      boundary.endMonth - 1,
      clampDay(endYear, boundary.endMonth, boundary.endDay),
    ),
  );
  if (start.getTime() > end.getTime()) return null;
  return { start, end };
}

function isValidBoundary(raw: unknown): raw is TermBoundary {
  if (!raw || typeof raw !== 'object') return false;
  const b = raw as Record<string, unknown>;
  const nums = [b.startMonth, b.startDay, b.endMonth, b.endDay];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) return false;
  const [sm, sd, em, ed] = nums as number[];
  if (sm < 1 || sm > 12 || em < 1 || em > 12) return false;
  if (sd < 1 || sd > 31 || ed < 1 || ed > 31) return false;
  return true;
}

export function parseAcademicTermDates(raw: unknown): AcademicTermDatesConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: AcademicTermDatesConfig = {};
  for (const key of ['trim1', 'trim2', 'trim3', 'sem1', 'sem2'] as const) {
    if (isValidBoundary(src[key])) out[key] = src[key];
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveTermBoundary(
  period: string,
  config?: AcademicTermDatesConfig | null,
): TermBoundary {
  const fromConfig = config?.[period as keyof AcademicTermDatesConfig];
  if (fromConfig) return fromConfig;
  return DEFAULT_TERM_BOUNDARIES[period] ?? DEFAULT_TERM_BOUNDARIES.trim1;
}

export function getPeriodDatesWithConfig(
  period: string,
  academicYear: string,
  config?: AcademicTermDatesConfig | null,
): { start: Date; end: Date } {
  const boundary = resolveTermBoundary(period, config);
  const resolved = boundaryToDates(boundary, academicYear);
  if (resolved) return resolved;

  const parts = parseAcademicYearParts(academicYear);
  const yearStart = parts?.yearStart ?? new Date().getFullYear();
  const yearEnd = parts?.yearEnd ?? yearStart + 1;
  return {
    start: new Date(yearStart, 8, 1),
    end: endOfDay(new Date(yearEnd, 5, 30)),
  };
}

export function inferReportingPeriodWithConfig(
  date: Date,
  academicYear: string,
  config?: AcademicTermDatesConfig | null,
): string | null {
  for (const period of ['trim1', 'trim2', 'trim3'] as const) {
    const { start, end } = getPeriodDatesWithConfig(period, academicYear, config);
    if (date >= start && date <= end) return period;
  }
  return null;
}

export function termBoundaryFromIsoRange(
  startIso: string,
  endIso: string,
  academicYear: string,
): TermBoundary | null {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (start.getTime() > end.getTime()) return null;

  const parts = parseAcademicYearParts(academicYear);
  if (!parts) return null;

  return {
    startMonth: start.getMonth() + 1,
    startDay: start.getDate(),
    endMonth: end.getMonth() + 1,
    endDay: end.getDate(),
  };
}

export function termBoundaryToIsoRange(
  boundary: TermBoundary,
  academicYear: string,
): { start: string; end: string } | null {
  const range = boundaryToDates(boundary, academicYear);
  if (!range) return null;
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: fmt(range.start), end: fmt(range.end) };
}

export function defaultTrimesterFormRows(academicYear: string): Array<{
  key: 'trim1' | 'trim2' | 'trim3';
  name: string;
  start: string;
  end: string;
}> {
  const labels = {
    trim1: 'Trimestre 1',
    trim2: 'Trimestre 2',
    trim3: 'Trimestre 3',
  } as const;
  return (['trim1', 'trim2', 'trim3'] as const).map((key) => {
    const iso = termBoundaryToIsoRange(DEFAULT_TERM_BOUNDARIES[key], academicYear)!;
    return { key, name: labels[key], start: iso.start, end: iso.end };
  });
}

export function trimesterFormRowsFromConfig(
  config: AcademicTermDatesConfig | null | undefined,
  academicYear: string,
): Array<{ key: 'trim1' | 'trim2' | 'trim3'; name: string; start: string; end: string }> {
  return (['trim1', 'trim2', 'trim3'] as const).map((key) => {
    const boundary = resolveTermBoundary(key, config);
    const iso = termBoundaryToIsoRange(boundary, academicYear)!;
    const labels = { trim1: 'Trimestre 1', trim2: 'Trimestre 2', trim3: 'Trimestre 3' };
    return { key, name: labels[key], start: iso.start, end: iso.end };
  });
}

export function parseAcademicTermDatesFromForm(
  rows: Array<{ key: string; start: string; end: string }>,
  academicYear: string,
): AcademicTermDatesConfig | null {
  const out: AcademicTermDatesConfig = {};
  for (const row of rows) {
    if (row.key !== 'trim1' && row.key !== 'trim2' && row.key !== 'trim3') continue;
    const boundary = termBoundaryFromIsoRange(row.start, row.end, academicYear);
    if (!boundary) continue;
    out[row.key] = boundary;
  }
  return Object.keys(out).length > 0 ? out : null;
}

export async function loadAcademicTermDatesForSchool(
  schoolId?: string | null,
): Promise<AcademicTermDatesConfig | null> {
  const delegate = getAppBrandingDelegate();
  if (!delegate) return null;
  const brandingId = schoolId ? await brandingIdForSchool(schoolId) : APP_BRANDING_ID;
  const row = await delegate.findUnique({ where: { id: brandingId } });
  return parseAcademicTermDates((row as { academicTermDates?: unknown } | null)?.academicTermDates);
}

export function serializeAcademicTermDatesForApi(
  config: AcademicTermDatesConfig | null | undefined,
): AcademicTermDatesConfig | null {
  if (!config) return null;
  const out: AcademicTermDatesConfig = {};
  for (const key of ['trim1', 'trim2', 'trim3'] as const) {
    if (config[key]) out[key] = config[key];
  }
  return Object.keys(out).length > 0 ? out : null;
}
