'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export type FneYearOption = { value: string; label: string };

/** Convertit une année de début scolaire (ex. 1990) → code FNE `9091`. */
export function academicStartYearToFneCode(startYear: number): string {
  const a = String(startYear).slice(-2);
  const b = String(startYear + 1).slice(-2);
  return `${a}${b}`;
}

/** Code FNE `9091` → année de début 1990. */
export function fneCodeToAcademicStartYear(code: string): number | null {
  const m = String(code || '').trim().match(/^(\d{2})(\d{2})$/);
  if (!m) return null;
  const yy = Number(m[1]);
  const zz = Number(m[2]);
  // 90→1990, 00→2000, 25→2025
  const start = yy >= 70 ? 1900 + yy : 2000 + yy;
  const expectedEnd = (start + 1) % 100;
  if (zz !== expectedEnd) {
    // Tolère les codes non stricts en prenant yy comme début
    return start;
  }
  return start;
}

function rangeFromOptions(years: FneYearOption[]): { min: number; max: number } {
  const starts = years
    .map((y) => fneCodeToAcademicStartYear(y.value))
    .filter((n): n is number => n != null);
  if (starts.length === 0) {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + 1;
    const currentStart = m >= 9 ? y : y - 1;
    return { min: 1980, max: currentStart + 1 };
  }
  return { min: Math.min(...starts), max: Math.max(...starts) };
}

type FneAcademicYearCalendarProps = {
  value: string;
  onChange: (fneCode: string) => void;
  years?: FneYearOption[];
  /** Années réellement proposées par SIGFNE (surlignées dans le calendrier). */
  portalYears?: FneYearOption[];
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
};

/**
 * Sélecteur calendrier d’années scolaires FNE (remplace le long déroulant).
 * Affiche « 1990-1991 » et encode en `9091` pour l’API SIGFNE.
 */
export default function FneAcademicYearCalendar({
  value,
  onChange,
  years = [],
  portalYears = [],
  disabled = false,
  className = '',
  inputClassName = '',
}: FneAcademicYearCalendarProps) {
  const { min, max } = useMemo(() => rangeFromOptions(years), [years]);
  const portalCodes = useMemo(
    () => new Set(portalYears.map((y) => y.value)),
    [portalYears]
  );
  const selectedStart = fneCodeToAcademicStartYear(value);
  const [open, setOpen] = useState(false);
  const [decadeStart, setDecadeStart] = useState(() => {
    const base = selectedStart ?? max;
    return Math.floor(base / 10) * 10;
  });
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const base = selectedStart ?? max;
    setDecadeStart(Math.floor(base / 10) * 10);
  }, [open, selectedStart, max]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label =
    selectedStart != null ? `${selectedStart}-${selectedStart + 1}` : 'Choisir l’année…';

  const cells = useMemo(() => {
    const list: number[] = [];
    for (let y = decadeStart; y < decadeStart + 12; y += 1) list.push(y);
    return list;
  }, [decadeStart]);

  const canPrev = decadeStart > min;
  const canNext = decadeStart + 10 <= max;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          inputClassName ||
          'mt-1.5 flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200 bg-stone-50/80 px-3 py-2.5 text-left text-sm disabled:opacity-60'
        }
      >
        <span className={selectedStart != null ? 'font-medium text-stone-900' : 'text-stone-500'}>
          {label}
        </span>
        <FiCalendar className="h-4 w-4 shrink-0 text-stone-500" aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Calendrier des années scolaires FNE"
          className="absolute z-40 mt-1.5 w-full min-w-[16rem] rounded-2xl border border-stone-200 bg-white p-3 shadow-xl ring-1 ring-stone-900/5"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              disabled={!canPrev}
              onClick={() => setDecadeStart((d) => d - 10)}
              className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              aria-label="Décennie précédente"
            >
              <FiChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-600">
              {decadeStart} – {decadeStart + 9}
            </p>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setDecadeStart((d) => d + 10)}
              className="rounded-lg p-1.5 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
              aria-label="Décennie suivante"
            >
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {cells.map((y) => {
              const inRange = y >= min && y <= max;
              const active = selectedStart === y;
              const onPortal = portalCodes.has(academicStartYearToFneCode(y));
              return (
                <button
                  key={y}
                  type="button"
                  disabled={!inRange}
                  onClick={() => {
                    onChange(academicStartYearToFneCode(y));
                    setOpen(false);
                  }}
                  className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-cptb-blue text-white shadow-sm'
                      : onPortal
                        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100'
                        : inRange
                          ? 'text-stone-800 hover:bg-stone-100'
                          : 'cursor-not-allowed text-stone-300'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-[10px] leading-snug text-stone-500">
            Année choisie = début du fichier scolaire (ex. 1990 → fichier 1990-1991).
            {portalYears.length > 0
              ? ' Les années en vert sont celles actuellement ouvertes sur le portail public SIGFNE.'
              : ''}
          </p>
        </div>
      )}
    </div>
  );
}
