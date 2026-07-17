/** Agrégation d’heures / minutes par jour, semaine ISO ou mois. */

export type HoursGroupBy = 'day' | 'week' | 'month';

export function parseHoursGroupBy(raw: unknown): HoursGroupBy {
  if (raw === 'week' || raw === 'month' || raw === 'day') return raw;
  return 'day';
}

/** Clé de période à partir d’une date YYYY-MM-DD. */
export function periodKeyFromYmd(ymd: string, groupBy: HoursGroupBy): string {
  const d = ymd.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || 'unknown';
  if (groupBy === 'day') return d;
  if (groupBy === 'month') return d.slice(0, 7);
  return isoWeekKey(d);
}

export function periodLabelFromKey(key: string, groupBy: HoursGroupBy): string {
  if (groupBy === 'day') {
    try {
      const dt = new Date(`${key}T12:00:00`);
      return dt.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return key;
    }
  }
  if (groupBy === 'month') {
    const [y, m] = key.split('-').map((x) => parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m)) return key;
    return new Date(y, m - 1, 1).toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    });
  }
  // week: YYYY-Www
  return `Semaine ${key.replace(/^\d{4}-W/, '')} (${key})`;
}

function isoWeekKey(ymd: string): string {
  const [ys, ms, ds] = ymd.split('-').map((x) => parseInt(x, 10));
  const date = new Date(Date.UTC(ys, ms - 1, ds));
  // ISO week: Thursday-based
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const y = date.getUTCFullYear();
  return `${y}-W${String(week).padStart(2, '0')}`;
}

export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 100) / 100;
}

/** Minutes travaillées à partir d’entrée/sortie ou d’un champ explicite. */
export function resolveWorkedMinutes(input: {
  workedMinutes?: number | null;
  checkInAt?: Date | string | null;
  checkOutAt?: Date | string | null;
}): number | null {
  if (input.workedMinutes != null && Number.isFinite(input.workedMinutes) && input.workedMinutes >= 0) {
    return Math.round(input.workedMinutes);
  }
  if (input.checkInAt && input.checkOutAt) {
    const a = new Date(input.checkInAt).getTime();
    const b = new Date(input.checkOutAt).getTime();
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) {
      return Math.round((b - a) / 60000);
    }
  }
  return null;
}

export type PeriodBucket = {
  key: string;
  label: string;
  minutes: number;
  plannedMinutes: number;
  sessions: number;
  hours: number;
};

export function accumulatePeriod(
  map: Map<string, PeriodBucket>,
  ymd: string,
  groupBy: HoursGroupBy,
  minutes: number,
  plannedMinutes = 0
): void {
  const key = periodKeyFromYmd(ymd, groupBy);
  const cur = map.get(key) ?? {
    key,
    label: periodLabelFromKey(key, groupBy),
    minutes: 0,
    plannedMinutes: 0,
    sessions: 0,
    hours: 0,
  };
  cur.minutes += minutes;
  cur.plannedMinutes += plannedMinutes;
  cur.sessions += 1;
  cur.hours = minutesToHours(cur.minutes);
  map.set(key, cur);
}

export function sortedPeriodBuckets(map: Map<string, PeriodBucket>): PeriodBucket[] {
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}
