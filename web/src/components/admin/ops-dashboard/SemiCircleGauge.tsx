'use client';

type SemiCircleGaugeProps = {
  title: string;
  total: number;
  totalLabel: string;
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  badge?: { value: string; tone: 'up' | 'down' | 'neutral' };
};

const NAVY = '#0018A8';
const STONE = '#e7e5e4';

export default function SemiCircleGauge({
  title,
  total,
  totalLabel,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  badge,
}: SemiCircleGaugeProps) {
  const safeTotal = Math.max(total, 0);
  const primaryPct = safeTotal > 0 ? Math.min(100, (primary / safeTotal) * 100) : 0;

  const badgeClass =
    badge?.tone === 'up'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/80'
      : badge?.tone === 'down'
        ? 'bg-rose-50 text-rose-700 ring-rose-200/80'
        : 'bg-stone-100 text-stone-600 ring-stone-200/80';

  return (
    <div className="flex h-full min-h-[280px] flex-col rounded-[1.35rem] bg-white p-5 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.22)] ring-1 ring-stone-200/75 sm:p-6">
      <h3 className="font-display text-[15px] font-semibold leading-snug text-stone-800">{title}</h3>
      <div className="relative mx-auto mt-2 w-full max-w-[280px] flex-1">
        <svg viewBox="0 0 200 128" className="h-auto w-full" aria-hidden>
          <path
            d="M 22 112 A 78 78 0 0 1 178 112"
            fill="none"
            stroke={STONE}
            strokeWidth="16"
            strokeLinecap="round"
            pathLength={100}
          />
          {primaryPct > 0 && (
            <path
              d="M 22 112 A 78 78 0 0 1 178 112"
              fill="none"
              stroke={NAVY}
              strokeWidth="16"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${primaryPct} 100`}
            />
          )}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-1 flex flex-col items-center">
          <p className="font-display text-4xl font-bold tabular-nums leading-none tracking-tight text-stone-900 sm:text-[2.6rem]">
            {safeTotal}
          </p>
          <p className="mt-1.5 max-w-[11rem] text-center text-[11px] font-medium leading-snug text-stone-500">
            {totalLabel}
          </p>
          {badge ? (
            <span
              className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1 ${badgeClass}`}
            >
              {badge.value}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px] text-stone-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-cptb-blue" />
          {primaryLabel}{' '}
          <strong className="font-semibold tabular-nums text-stone-900">{primary}</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-stone-300" />
          {secondaryLabel}{' '}
          <strong className="font-semibold tabular-nums text-stone-900">{secondary}</strong>
        </span>
      </div>
    </div>
  );
}
