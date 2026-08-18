'use client';

import type { ReactNode } from 'react';

export const INSIGHT_CARD =
  'premium-surface p-5';

const HEAT_COLORS = ['#eef2ff', '#c7d2fe', '#8EB0FF', '#3d6bff', '#0018A8'];

export function InsightGrip() {
  return (
    <span className="flex h-4 w-3 shrink-0 flex-col justify-center gap-0.5" aria-hidden>
      <span className="h-px w-full bg-stone-300" />
      <span className="h-px w-full bg-stone-300" />
    </span>
  );
}

export function InsightCard({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={`${INSIGHT_CARD} min-w-0`}>
      <div className="mb-4 flex h-8 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <InsightGrip />
          <h3 className="truncate text-[13px] font-semibold leading-none text-stone-900">{title}</h3>
        </div>
        {extra ? <div className="shrink-0">{extra}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function InsightPills({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ id: string; label: string }>;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-stone-100/90 p-1">
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
              active ? 'bg-[#0018A8] text-white shadow-sm' : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function InsightSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  label: string;
}) {
  return (
    <label className="inline-flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-44 appearance-none rounded-full border border-stone-200/90 bg-white py-2 pl-3 pr-8 text-[13px] font-semibold text-stone-700 outline-none focus:ring-2 focus:ring-cptb-gold/35"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function InsightHeatmap({
  rows,
  cols,
  values,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
}) {
  const flat = values.flat();
  const max = Math.max(1, ...flat);
  return (
    <div className="min-w-0 overflow-x-auto">
      <div className="mb-2 flex items-center justify-end gap-2 text-[10px] font-medium text-stone-400">
        <span>Moins</span>
        <span className="flex gap-0.5">
          {HEAT_COLORS.map((c) => (
            <span key={c} className="h-2 w-3 rounded-sm" style={{ background: c }} />
          ))}
        </span>
        <span>Plus</span>
      </div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `minmax(4.5rem,7rem) repeat(${cols.length}, minmax(1.6rem,1fr))` }}
      >
        <span />
        {cols.map((col) => (
          <span key={col} className="truncate text-center text-[10px] font-medium text-stone-400">
            {col}
          </span>
        ))}
        {rows.map((row, ri) => (
          <div key={`r-${row}`} className="contents">
            <span className="truncate self-center text-[11px] font-medium text-stone-600">{row}</span>
            {cols.map((col, ci) => {
              const n = values[ri]?.[ci] ?? 0;
              const t = n / max;
              const color =
                t <= 0
                  ? '#f4f4f5'
                  : HEAT_COLORS[Math.min(HEAT_COLORS.length - 1, Math.floor(t * (HEAT_COLORS.length - 1) + 0.01))];
              return (
                <span
                  key={`${row}-${col}`}
                  title={`${row} · ${col} : ${n}`}
                  className="aspect-square rounded-md"
                  style={{ background: color }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function InsightEmpty({ text }: { text: string }) {
  return (
    <div className="flex h-48 items-center justify-center text-sm text-stone-400">{text}</div>
  );
}
