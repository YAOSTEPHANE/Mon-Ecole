'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { FiCalendar, FiUserCheck, FiUsers } from 'react-icons/fi';

type DistItem = { name: string; value: number };
type StackItem = { label: string; value: number; color: string };

type OpsVisualKpisProps = {
  treatmentTotal: number;
  treatmentDelta: number;
  bubbles: DistItem[];
  satisfactionPct: number;
  satisfactionDelta: number;
  satisfactionLabel: string;
  satisfactionLegend?: Array<{ key: string; label: string; color: string }>;
  stackedTotal: number;
  stackedDelta: number;
  stacked: StackItem[];
  weeklyCounts: number[];
  weeklyPresent?: number[];
  weeklyAbsent?: number[];
  weeklyHighlight: number;
  weeklyDelta?: number;
  weeklyLabels?: string[];
  weeklyTotal?: number;
  weeklyLegend?: Array<{ key: string; label: string; color: string }>;
  treatmentLabel?: string;
  treatmentSuffix?: string;
  stackedLabel?: string;
  weeklyLabel?: string;
  onTreatmentMore?: () => void;
  onSatisfactionMore?: () => void;
  onStackedMore?: () => void;
  onWeeklyMore?: () => void;
};

const CARD =
  'ops-kpi-card flex h-[272px] min-w-0 flex-col self-start rounded-[1.35rem] bg-white p-5 ring-1 ring-[#eceff5] shadow-[0_10px_28px_-18px_rgba(28,39,76,0.28)]';

const BUBBLE_COLORS = ['#0018A8', '#8EB0FF', '#E6E8ED'];
const BUBBLE_LAYOUT = [
  { x: 4, y: 22, size: 74, font: 18, z: 3 },
  { x: 54, y: 2, size: 54, font: 15, z: 2 },
  { x: 96, y: 28, size: 36, font: 12, z: 1 },
];
const BUBBLE_FRAME = { width: 136, height: 98 };
const GAUGE_TICKS = [0, 25, 35, 50, 65, 85, 100];
const HIST_BARS = 24;
const HIST_GROUPS = 4;

function easeOutCubic(t: number) {
  return 1 - (1 - t) ** 3;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

function useCountUp(target: number, duration: number, reduced: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    let raf = 0;
    const startAt = performance.now();
    const run = (now: number) => {
      const t = Math.min(1, (now - startAt) / duration);
      setValue(target * easeOutCubic(t));
      if (t < 1) raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduced]);
  return value;
}

function DeltaPill({ value, suffix = '' }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`inline-flex h-4.5 items-center rounded-full px-2 text-[11px] font-semibold leading-none tabular-nums ${
        up ? 'bg-[#e8eefc] text-[#3d6bff]' : 'bg-[#fde8e8] text-[#f07167]'
      }`}
    >
      {up ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

function CardHead({
  title,
  icon: Icon,
  onMore,
}: {
  title: string;
  icon: IconType;
  onMore?: () => void;
}) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span className="ops-kpi-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8eefc] text-[#0018A8]">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <p className="truncate text-[13px] font-semibold leading-none text-stone-900">{title}</p>
      </div>
      {onMore ? (
        <button
          type="button"
          onClick={onMore}
          className="shrink-0 text-[12px] font-medium leading-none text-[#3d6bff] transition hover:text-[#0018A8]"
        >
          Voir plus
        </button>
      ) : null}
    </div>
  );
}

function MetricRow({
  value,
  delta,
  suffix = '',
}: {
  value: string | number;
  delta: number;
  suffix?: string;
}) {
  return (
    <div className="mt-3 flex h-9 shrink-0 items-center gap-2">
      <span className="ops-kpi-metric text-[32px] font-bold leading-none tracking-tight text-stone-900">{value}</span>
      <DeltaPill value={delta} suffix={suffix} />
    </div>
  );
}

function LegendSlot({
  items,
}: {
  items: Array<{ key: string; label: string; color: string }>;
}) {
  return (
    <div className="mt-2.5 flex h-5 shrink-0 min-w-0 items-center gap-3 overflow-hidden text-[11px] leading-none text-stone-500">
      {items.map((item) => (
        <span key={item.key} className="inline-flex shrink-0 items-center gap-1.5">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.color }} />
          <span className="max-w-20 truncate">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function SegmentedGauge({ pct }: { pct: number }) {
  const needle = Math.min(100, Math.max(0, pct));
  const cx = 100;
  const cy = 118;
  const needleAngle = -90 + (needle / 100) * 180;
  const ticks = 32;
  const inner = 64;
  const outer = 79;

  return (
    <svg viewBox="0 0 200 148" className="h-full w-full" aria-hidden>
      {Array.from({ length: ticks }, (_, i) => {
        const t = i / (ticks - 1);
        const ang = Math.PI * (1 - t);
        const filled = t * 100 <= needle + 0.5;
        const x1 = cx + inner * Math.cos(ang);
        const y1 = cy - inner * Math.sin(ang);
        const x2 = cx + outer * Math.cos(ang);
        const y2 = cy - outer * Math.sin(ang);
        return (
          <line
            key={`g-${i}`}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={filled ? '#0018A8' : '#eceff3'}
            strokeWidth="4.6"
            strokeLinecap="round"
          />
        );
      })}
      {GAUGE_TICKS.map((tick) => {
        const ang = Math.PI - (tick / 100) * Math.PI;
        const r = 96;
        const x = cx + r * Math.cos(ang);
        const y = cy - r * Math.sin(ang);
        return (
          <text
            key={tick}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#a8a29e"
            fontSize="7.5"
            fontWeight="600"
          >
            {tick}
          </text>
        );
      })}
      <g transform={`rotate(${needleAngle} ${cx} ${cy})`}>
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - 66}
          stroke="#111827"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="6.2" fill="#111827" />
        <circle cx={cx} cy={cy} r="2.3" fill="#fff" />
      </g>
    </svg>
  );
}

function groupBubbles(items: DistItem[]): DistItem[][] {
  const ranked = [...items]
    .filter((item) => item.name && item.name !== '—')
    .sort((a, b) => b.value - a.value);
  if (ranked.length === 0) {
    return [
      [
        { name: '', value: 0 },
        { name: '', value: 0 },
        { name: '', value: 0 },
      ],
    ];
  }
  const groups: DistItem[][] = [];
  for (let i = 0; i < ranked.length; i += 3) {
    groups.push(ranked.slice(i, i + 3));
  }
  return groups;
}

function ClassBubbles({ items, reduced }: { items: DistItem[]; reduced: boolean }) {
  const live0 = useCountUp(items[0]?.value ?? 0, 850, reduced);
  const live1 = useCountUp(items[1]?.value ?? 0, 980, reduced);
  const live2 = useCountUp(items[2]?.value ?? 0, 1100, reduced);
  const lives = [live0, live1, live2];

  return (
    <div className="relative" style={{ width: BUBBLE_FRAME.width, height: BUBBLE_FRAME.height }}>
      {items.map((b, i) => {
        const layout = BUBBLE_LAYOUT[i] ?? { x: 96, y: 28, size: 36, font: 12, z: 1 };
        const dark = i < 2;
        return (
          <span
            key={`bubble-${i}-${b.name}`}
            title={b.name ? `${b.name} · ${b.value}` : undefined}
            className="ops-kpi-bubble absolute flex items-center justify-center rounded-full font-bold tabular-nums"
            style={{
              width: layout.size,
              height: layout.size,
              left: layout.x,
              top: layout.y,
              fontSize: layout.font,
              lineHeight: 1,
              background: BUBBLE_COLORS[i],
              color: dark ? '#fff' : '#52525b',
              zIndex: layout.z,
              boxShadow: i === 0 ? '0 10px 18px -6px rgba(0,24,168,0.42)' : 'none',
              animationDelay: `${180 + i * 120}ms`,
            }}
          >
            {Math.round(lives[i] ?? 0)}
          </span>
        );
      })}
    </div>
  );
}

function expandHistogram(counts: number[]): number[] {
  const src = counts.length > 0 ? counts : Array.from({ length: HIST_BARS }, () => 0);
  if (src.length >= HIST_BARS) return src.slice(0, HIST_BARS);
  return Array.from({ length: HIST_BARS }, (_, i) => {
    const left = Math.floor((i / HIST_BARS) * src.length);
    const right = Math.min(src.length - 1, left + 1);
    const t = (i / HIST_BARS) * src.length - left;
    const a = src[left] ?? 0;
    const b = src[right] ?? a;
    return Math.max(0, Math.round(a + (b - a) * t));
  });
}

function weekRangeLabels(): string[] {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const dow = first.getDay();
  let monday = dow === 1 ? 1 : dow === 0 ? 2 : 9 - dow;
  if (monday > 7) monday -= 7;
  return Array.from({ length: HIST_GROUPS }, (_, i) => {
    const start = monday + i * 7;
    const end = start + 4;
    return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
  });
}

export default function OpsVisualKpis({
  treatmentTotal,
  treatmentDelta,
  bubbles,
  satisfactionPct,
  satisfactionDelta,
  satisfactionLabel,
  satisfactionLegend = [],
  stackedTotal,
  stackedDelta,
  stacked,
  weeklyCounts,
  weeklyPresent,
  weeklyAbsent,
  weeklyHighlight,
  weeklyDelta = 0,
  weeklyLabels,
  weeklyTotal,
  weeklyLegend = [],
  treatmentLabel = 'Cours principaux',
  stackedLabel = 'Total élèves',
  weeklyLabel = 'Total présent et absence',
  treatmentSuffix = '',
  onTreatmentMore,
  onSatisfactionMore,
  onStackedMore,
  onWeeklyMore,
}: OpsVisualKpisProps) {
  const reduced = useReducedMotion();
  const [play, setPlay] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setPlay(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const bubbleGroups = useMemo(() => groupBubbles(bubbles), [bubbles]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [bubblePage, setBubblePage] = useState(0);
  useEffect(() => {
    setBubblePage(0);
    scrollerRef.current?.scrollTo({ left: 0 });
  }, [bubbleGroups]);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || bubbleGroups.length < 2) return;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [bubbleGroups.length]);
  const activeGroup = bubbleGroups[bubblePage] ?? bubbleGroups[0] ?? [];
  const visibleLegend = activeGroup.filter((b) => b.name);
  const stackSum = stacked.reduce((s, x) => s + x.value, 0) || 1;
  const histPresent = expandHistogram(weeklyPresent ?? weeklyCounts);
  const histAbsent = expandHistogram(
    weeklyAbsent ?? Array.from({ length: weeklyCounts.length }, () => 0),
  );
  const hist = histPresent.map((p, i) => p + (histAbsent[i] ?? 0));
  const maxBar = Math.max(1, ...hist);
  const avgRatio = hist.reduce((a, b) => a + b, 0) / hist.length / maxBar;
  const needle = Math.min(100, Math.max(0, satisfactionPct));
  const groupLabels =
    weeklyLabels && weeklyLabels.filter(Boolean).length === HIST_GROUPS
      ? weeklyLabels.filter(Boolean)
      : weekRangeLabels();
  const highlight = Math.min(
    HIST_BARS - 1,
    Math.round((weeklyHighlight / Math.max(1, Math.max(weeklyCounts.length, 1) - 1)) * (HIST_BARS - 1))
  );
  const perGroup = HIST_BARS / HIST_GROUPS;
  const avgBottom = 16 + Math.max(8, avgRatio * 54);

  const liveTreatment = useCountUp(treatmentTotal, 900, reduced);
  const liveNeedle = useCountUp(needle, 1100, reduced);
  const liveStacked = useCountUp(stackedTotal, 950, reduced);
  const liveWeekly = useCountUp(
    weeklyTotal ?? weeklyCounts.reduce((a, b) => a + b, 0),
    1000,
    reduced,
  );

  return (
    <div className="grid min-w-0 grid-cols-4 items-start gap-4">
      <article className={CARD} style={{ animationDelay: '40ms' }}>
        <CardHead title={treatmentLabel} icon={FiUsers} onMore={onTreatmentMore} />
        <MetricRow value={`${Math.round(liveTreatment)}${treatmentSuffix}`} delta={treatmentDelta} />
        <LegendSlot
          items={visibleLegend.map((b, i) => ({
            key: `bubble-leg-${i}-${b.name}`,
            label: b.name,
            color: BUBBLE_COLORS[i] ?? '#0018A8',
          }))}
        />
        <div className="mt-auto flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={scrollerRef}
            className={`flex min-h-0 min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden scrollbar-hide ${
              bubbleGroups.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''
            }`}
            onScroll={(event) => {
              const el = event.currentTarget;
              const width = el.clientWidth || 1;
              setBubblePage(Math.round(el.scrollLeft / width));
            }}
            aria-label="Présents par classe, faire défiler pour voir les autres classes"
          >
            {bubbleGroups.map((group, gi) => (
              <div
                key={`bubble-page-${gi}`}
                className="flex h-full w-full min-w-full shrink-0 snap-center items-center justify-center"
              >
                <ClassBubbles items={group} reduced={reduced} />
              </div>
            ))}
          </div>
          {bubbleGroups.length > 1 ? (
            <div className="mt-1 flex h-3 shrink-0 items-center justify-center gap-1">
              {bubbleGroups.map((_, i) => (
                <button
                  key={`bubble-dot-${i}`}
                  type="button"
                  aria-label={`Voir les classes ${i * 3 + 1} à ${Math.min((i + 1) * 3, bubbles.length)}`}
                  className={`h-1.5 rounded-full transition ${
                    i === bubblePage ? 'w-3 bg-[#0018A8]' : 'w-1.5 bg-stone-300 hover:bg-stone-400'
                  }`}
                  onClick={() => {
                    const el = scrollerRef.current;
                    if (!el) return;
                    el.scrollTo({ left: i * el.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>
      </article>

      <article className={CARD} style={{ animationDelay: '120ms' }}>
        <CardHead title={satisfactionLabel} icon={FiUserCheck} onMore={onSatisfactionMore} />
        <MetricRow value={`${Math.round(liveNeedle)}%`} delta={satisfactionDelta} suffix="%" />
        <LegendSlot items={satisfactionLegend} />
        <div className="mt-auto flex min-h-0 flex-1 items-center justify-center">
          <div className="ops-kpi-gauge h-29.5 w-full max-w-52.5">
            <SegmentedGauge pct={liveNeedle} />
          </div>
        </div>
      </article>

      <article className={CARD} style={{ animationDelay: '200ms' }}>
        <CardHead title={stackedLabel} icon={FiUsers} onMore={onStackedMore} />
        <MetricRow value={Math.round(liveStacked)} delta={stackedDelta} />
        <LegendSlot
          items={stacked.map((s, i) => ({
            key: `stack-leg-${i}-${s.label}`,
            label: s.label,
            color: s.color,
          }))}
        />
        <div className="mt-auto flex min-h-0 flex-1 flex-col justify-center">
          <div className="mb-1.5 flex items-end">
            {stacked.map((s, i) => (
              <span
                key={`stack-n-${i}-${s.label}`}
                className="ops-kpi-stack text-[13px] font-bold leading-none tabular-nums text-stone-800"
                style={{ width: play || reduced ? `${(s.value / stackSum) * 100}%` : '0%' }}
              >
                {s.value}
              </span>
            ))}
          </div>
          <div className="ops-kpi-stack-track flex h-2.5 overflow-hidden rounded-full bg-[#eef1f6]">
            {stacked.map((s, i) => (
              <span
                key={`stack-bar-${i}-${s.label}`}
                className="ops-kpi-stack ops-kpi-stack-seg h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: play || reduced ? `${(s.value / stackSum) * 100}%` : '0%',
                  background: s.color,
                }}
                title={`${s.label}: ${s.value}`}
              />
            ))}
          </div>
        </div>
      </article>

      <article className={CARD} style={{ animationDelay: '280ms' }}>
        <CardHead title={weeklyLabel} icon={FiCalendar} onMore={onWeeklyMore} />
        <MetricRow value={Math.round(liveWeekly)} delta={weeklyDelta} />
        <LegendSlot items={weeklyLegend} />
        <div className="relative mt-auto min-h-0 flex-1 pl-7 pt-5">
          <span
            className="absolute left-0 z-10 flex h-4 -translate-y-1/2 items-center rounded bg-stone-900 px-1.5 text-[9px] font-semibold tracking-wide text-white transition-[bottom] duration-700"
            style={{ bottom: avgBottom }}
          >
            Avg
          </span>
          <span
            className="absolute inset-x-7 border-t border-dashed border-stone-300 transition-[bottom] duration-700"
            style={{ bottom: avgBottom }}
            aria-hidden
          />
          <div className="flex h-full items-end gap-2">
            {Array.from({ length: HIST_GROUPS }, (_, g) => (
              <div key={`g-${g}`} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex h-17 w-full items-end justify-between gap-px">
                  {hist.slice(g * perGroup, (g + 1) * perGroup).map((n, j) => {
                    const i = g * perGroup + j;
                    const present = histPresent[i] ?? 0;
                    const absent = histAbsent[i] ?? 0;
                    const h = Math.max(6, (n / maxBar) * 58);
                    const presentH = n > 0 ? Math.max(absent > 0 ? 2 : 6, (present / n) * h) : 0;
                    const absentH = Math.max(0, h - presentH);
                    const active = i === highlight;
                    return (
                      <div key={`bar-${i}`} className="ops-kpi-hist-item relative flex h-full flex-1 flex-col items-center justify-end">
                        {active ? (
                          <span className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 rounded-md bg-[#0018A8] px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                            {n}
                            <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0018A8]" />
                          </span>
                        ) : null}
                        <span
                          className={`${active ? 'ops-kpi-bar-active' : 'ops-kpi-bar'} flex w-full max-w-1.5 flex-col overflow-hidden rounded-full`}
                          style={{ height: h, animationDelay: `${220 + i * 22}ms` }}
                          title={`Présents ${present} · Absents ${absent}`}
                        >
                          <span className="w-full bg-[#e6e8ee]" style={{ height: absentH }} />
                          <span className="w-full bg-[#0018A8]" style={{ height: presentH }} />
                        </span>
                      </div>
                    );
                  })}
                </div>
                <span className="mt-1.5 h-4 text-center text-[10px] font-medium leading-none text-stone-400">
                  {groupLabels[g] ?? ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
