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
};

export const DEFAULT_TERM_BOUNDARIES: Record<'trim1' | 'trim2' | 'trim3', TermBoundary> = {
  trim1: { startMonth: 9, startDay: 1, endMonth: 11, endDay: 30 },
  trim2: { startMonth: 12, startDay: 1, endMonth: 2, endDay: 28 },
  trim3: { startMonth: 3, startDay: 1, endMonth: 6, endDay: 30 },
};

function parseAcademicYearParts(academicYear: string): { yearStart: number; yearEnd: number } | null {
  const parts = academicYear.split('-').map((x) => parseInt(x.trim(), 10));
  if (parts.length < 2 || parts.some((n) => !Number.isFinite(n))) return null;
  return { yearStart: parts[0], yearEnd: parts[1] };
}

function calendarYearForSchoolMonth(month: number, yearStart: number, yearEnd: number): number {
  return month >= 9 ? yearStart : yearEnd;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number): number {
  return Math.min(Math.max(day, 1), daysInMonth(year, month));
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
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

export function parseAcademicTermDates(raw: unknown): AcademicTermDatesConfig | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const out: AcademicTermDatesConfig = {};
  for (const key of ['trim1', 'trim2', 'trim3'] as const) {
    const item = src[key];
    if (!item || typeof item !== 'object') continue;
    const b = item as Record<string, unknown>;
    const nums = [b.startMonth, b.startDay, b.endMonth, b.endDay];
    if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    out[key] = {
      startMonth: nums[0] as number,
      startDay: nums[1] as number,
      endMonth: nums[2] as number,
      endDay: nums[3] as number,
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveTermBoundary(
  period: 'trim1' | 'trim2' | 'trim3',
  config?: AcademicTermDatesConfig | null,
): TermBoundary {
  return config?.[period] ?? DEFAULT_TERM_BOUNDARIES[period];
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

export function termBoundaryFromIsoRange(
  startIso: string,
  endIso: string,
): TermBoundary | null {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (start.getTime() > end.getTime()) return null;
  return {
    startMonth: start.getMonth() + 1,
    startDay: start.getDate(),
    endMonth: end.getMonth() + 1,
    endDay: end.getDate(),
  };
}

export type TrimesterFormRow = {
  key: 'trim1' | 'trim2' | 'trim3';
  name: string;
  start: string;
  end: string;
};

export function trimesterFormRowsFromConfig(
  config: AcademicTermDatesConfig | null | undefined,
  academicYear: string,
): TrimesterFormRow[] {
  const labels = { trim1: 'Trimestre 1', trim2: 'Trimestre 2', trim3: 'Trimestre 3' };
  return (['trim1', 'trim2', 'trim3'] as const).map((key) => {
    const iso = termBoundaryToIsoRange(resolveTermBoundary(key, config), academicYear)!;
    return { key, name: labels[key], start: iso.start, end: iso.end };
  });
}

export function parseAcademicTermDatesFromForm(rows: TrimesterFormRow[]): AcademicTermDatesConfig | null {
  const out: AcademicTermDatesConfig = {};
  for (const row of rows) {
    const boundary = termBoundaryFromIsoRange(row.start, row.end);
    if (!boundary) continue;
    out[row.key] = boundary;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/** Affiche une date ISO (yyyy-MM-dd) au format français jj/mm/aaaa. */
export function formatIsoDateFr(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatTrimesterRangeFr(startIso: string, endIso: string): string {
  return `${formatIsoDateFr(startIso)} – ${formatIsoDateFr(endIso)}`;
}

export function getCurrentTrimester(
  reference = new Date(),
  academicYear: string,
  config?: AcademicTermDatesConfig | null,
): string {
  for (const period of ['trim1', 'trim2', 'trim3'] as const) {
    const boundary = resolveTermBoundary(period, config);
    const range = boundaryToDates(boundary, academicYear);
    if (range && reference >= range.start && reference <= range.end) return period;
  }
  return 'trim1';
}
