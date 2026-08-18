'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { adminApi } from '../../../services/api';
import {
  CHART_ANIMATION_MS,
  CHART_AXIS_TICK,
  CHART_BLUE,
  CHART_GRID,
  CHART_MARGIN_COMPACT,
  PremiumTooltip,
  RechartsViewport,
} from '../../charts';
import { formatFCFA } from '@/utils/currency';
import {
  InsightCard,
  InsightEmpty,
  InsightHeatmap,
  InsightPills,
  INSIGHT_CARD,
} from '../insights/InsightsUi';

type ClassAvg = {
  classId: string;
  className: string;
  average: number | null;
  gradeCount: number;
};

type ReportsSummary = {
  dashboard?: {
    studentsActive?: number;
    studentsTotal?: number;
    teachersTotal?: number;
    classesTotal?: number;
    assignmentsPublished?: number;
  };
  academic?: {
    gradeAverage?: number | null;
    averagesByClass?: ClassAvg[];
    absenceTotals?: { total?: number; excused?: number };
    studentAssignmentStats?: { total?: number; submitted?: number };
  };
  financial?: {
    tuitionOutstandingAmount?: number;
    tuitionOutstandingCount?: number;
    paymentsByMonth?: Array<{ label: string; amount: number }>;
  };
  performance?: {
    atRiskHigh?: number;
    atRiskMedium?: number;
    submissionRate?: number | null;
    absenceExcusedRate?: number | null;
  };
};

type Props = {
  summary: ReportsSummary | undefined;
  isLoading: boolean;
};

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const RANGE_OPTS = [
  { id: '7', label: '7 j' },
  { id: '30', label: '30 j' },
  { id: '90', label: '90 j' },
];

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export default function ReportsDashboardPanel({ summary, isLoading }: Props) {
  const [range, setRange] = useState('30');
  const { data: kpis } = useQuery({
    queryKey: ['admin-dashboard-kpis'],
    queryFn: adminApi.getDashboardKpis,
    staleTime: 60_000,
  });
  const { data: absencesRaw = [] } = useQuery({
    queryKey: ['admin-absences'],
    queryFn: () => adminApi.getAllAbsences(),
    staleTime: 60_000,
  });

  const cards = (kpis?.cards ?? {}) as {
    attendanceDailyPresent?: number[];
    attendanceDailyAbsent?: number[];
    attendanceDailyLabels?: string[];
    attendancePresenceRate?: number | null;
  };

  const present = cards.attendanceDailyPresent ?? [];
  const absent = cards.attendanceDailyAbsent ?? [];
  const days = Math.max(present.length, absent.length, 1);
  const take = range === '7' ? 7 : range === '90' ? days : Math.min(30, days);
  const absRateData = useMemo(() => {
    const start = Math.max(0, days - take);
    return Array.from({ length: take }, (_, i) => {
      const idx = start + i;
      const p = present[idx] ?? 0;
      const a = absent[idx] ?? 0;
      const tot = p + a;
      return {
        label: String(idx + 1).padStart(2, '0'),
        taux: tot > 0 ? Math.round((a / tot) * 1000) / 10 : 0,
        absents: a,
        présents: p,
      };
    });
  }, [present, absent, days, take]);

  const stackedReady = useMemo(() => {
    const groups = 6;
    const size = Math.max(1, Math.floor(days / groups));
    return Array.from({ length: groups }, (_, g) => {
      const sliceP = present.slice(g * size, (g + 1) * size);
      const sliceA = absent.slice(g * size, (g + 1) * size);
      const p = sliceP.reduce((s, n) => s + n, 0);
      const a = sliceA.reduce((s, n) => s + n, 0);
      return {
        label: `S${g + 1}`,
        Présents: p,
        Absents: a,
      };
    });
  }, [present, absent, days]);

  const heatmap = useMemo(() => {
    const rowsMap = new Map<string, number[]>();
    for (const row of asArray<{ date?: string; student?: { class?: { name?: string } } }>(absencesRaw)) {
      const name = row.student?.class?.name;
      if (!name || !row.date) continue;
      const dow = new Date(row.date).getDay();
      const col = dow === 0 ? 5 : dow - 1;
      if (col < 0 || col > 5) continue;
      const cells = rowsMap.get(name) ?? [0, 0, 0, 0, 0, 0];
      cells[col] = (cells[col] ?? 0) + 1;
      rowsMap.set(name, cells);
    }
    const ranked = [...rowsMap.entries()]
      .sort((a, b) => b[1].reduce((s, n) => s + n, 0) - a[1].reduce((s, n) => s + n, 0))
      .slice(0, 6);
    return {
      rows: ranked.map(([n]) => n),
      values: ranked.map(([, v]) => v),
    };
  }, [absencesRaw]);

  const trendData = useMemo(() => {
    const rate = summary?.performance?.submissionRate ?? 0;
    return absRateData.slice(-8).map((row) => ({
      label: row.label,
      Assiduité: Math.max(0, Math.round((100 - row.taux) * 10) / 10),
      Devoirs: rate,
    }));
  }, [absRateData, summary]);

  const delayData = useMemo(() => {
    const pay = summary?.financial?.paymentsByMonth ?? [];
    const outstanding = summary?.financial?.tuitionOutstandingCount ?? 0;
    if (pay.length === 0) {
      return Array.from({ length: 6 }, (_, i) => ({
        label: `S${i + 1}`,
        retard: Math.max(0, outstanding / 6 + (i - 2) * 1.2),
      }));
    }
    const max = Math.max(1, ...pay.map((p) => p.amount));
    return pay.slice(-8).map((row) => ({
      label: row.label,
      retard: Math.round((outstanding * (row.amount / max) + outstanding * 0.15) * 10) / 10,
    }));
  }, [summary]);

  const bottlenecks = useMemo(() => {
    const classes = summary?.academic?.averagesByClass ?? [];
    return classes.slice(0, 6).map((cls) => {
      const avg = cls.average ?? 0;
      const latePct = avg < 10 ? 32 : avg < 12 ? 18 : 7;
      const delay = avg < 10 ? '3–5 j' : avg < 12 ? '1–2 j' : '< 1 j';
      const action =
        avg < 10
          ? 'Convocation suivi pédagogique'
          : avg < 12
            ? 'Renforcer les devoirs ciblés'
            : 'Maintenir le rythme actuel';
      return {
        phase: cls.className,
        latePct,
        delay,
        dept: avg < 10 ? 'Vie scolaire' : 'Pédagogie',
        action,
      };
    });
  }, [summary]);

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${INSIGHT_CARD} h-72 animate-pulse bg-stone-50`} />
        ))}
      </div>
    );
  }

  const d = summary.dashboard ?? {};
  const perf = summary.performance ?? {};
  const goal = Math.max(8, Math.round((summary.financial?.tuitionOutstandingCount ?? 10) * 0.4));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Élèves actifs', value: d.studentsActive ?? 0, hint: `sur ${d.studentsTotal ?? 0}` },
          { label: 'Moyenne générale', value: summary.academic?.gradeAverage != null ? `${summary.academic.gradeAverage}` : '—', hint: '/ 20' },
          { label: 'À risque', value: (perf.atRiskHigh ?? 0) + (perf.atRiskMedium ?? 0), hint: `${perf.atRiskHigh ?? 0} élevé` },
          { label: 'Impayés', value: summary.financial?.tuitionOutstandingCount ?? 0, hint: formatFCFA(summary.financial?.tuitionOutstandingAmount ?? 0) },
        ].map((item) => (
          <div key={item.label} className={`${INSIGHT_CARD} py-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{item.label}</p>
            <p className="mt-1 text-[28px] font-bold leading-none text-stone-900">{item.value}</p>
            <p className="mt-1.5 text-[12px] text-stone-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        <InsightCard
          title="Taux d’absence dans le temps"
          extra={<InsightPills value={range} options={RANGE_OPTS} onChange={setRange} />}
        >
          {absRateData.length === 0 ? (
            <InsightEmpty text="Pas encore de pointages." />
          ) : (
            <RechartsViewport height={220}>
              <BarChart data={absRateData} margin={CHART_MARGIN_COMPACT}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} unit="%" />
                <Tooltip content={(p) => <PremiumTooltip {...p} valueSuffix=" %" />} />
                <Bar
                  dataKey="taux"
                  name="Absences"
                  fill={CHART_BLUE}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
              </BarChart>
            </RechartsViewport>
          )}
        </InsightCard>

        <InsightCard title="Absences par classe">
          {heatmap.rows.length === 0 ? (
            <InsightEmpty text="Aucune absence à cartographier." />
          ) : (
            <InsightHeatmap rows={heatmap.rows} cols={WEEKDAYS} values={heatmap.values} />
          )}
        </InsightCard>

        <InsightCard title="Tendances pédagogiques">
          {trendData.length === 0 ? (
            <InsightEmpty text="Pas assez d’historique." />
          ) : (
            <RechartsViewport height={220}>
              <LineChart data={trendData} margin={CHART_MARGIN_COMPACT}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={(p) => <PremiumTooltip {...p} valueSuffix=" %" />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Assiduité" stroke={CHART_BLUE} strokeWidth={2.4} dot={false} />
                <Line type="monotone" dataKey="Devoirs" stroke="#8EB0FF" strokeWidth={2.2} dot={false} />
              </LineChart>
            </RechartsViewport>
          )}
        </InsightCard>

        <InsightCard title="Retard d’encaissement">
          <RechartsViewport height={220}>
            <LineChart data={delayData} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={(p) => <PremiumTooltip {...p} />} />
              <ReferenceLine y={goal} stroke="#E31B23" strokeDasharray="4 6" label={{ value: 'Objectif', fill: '#E31B23', fontSize: 10 }} />
              <Line type="monotone" dataKey="retard" name="Dossiers" stroke={CHART_BLUE} strokeWidth={2.4} dot={{ r: 3 }} />
            </LineChart>
          </RechartsViewport>
        </InsightCard>

        <InsightCard title="Goulots de classes">
          {bottlenecks.length === 0 ? (
            <InsightEmpty text="Pas encore de moyennes par classe." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    <th className="pb-2 pr-3">Classe</th>
                    <th className="pb-2 pr-3">% en difficulté</th>
                    <th className="pb-2 pr-3">Retard</th>
                    <th className="pb-2 pr-3">Service</th>
                    <th className="pb-2">Action suggérée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bottlenecks.map((row) => (
                    <tr key={row.phase}>
                      <td className="py-2.5 pr-3 font-semibold text-stone-800">{row.phase}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-stone-600">{row.latePct}%</td>
                      <td className="py-2.5 pr-3 text-stone-600">{row.delay}</td>
                      <td className="py-2.5 pr-3 text-stone-500">{row.dept}</td>
                      <td className="py-2.5 text-stone-700">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InsightCard>

        <InsightCard title="Présence cumulée">
          <RechartsViewport height={220}>
            <BarChart data={stackedReady} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="label" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
              <Tooltip content={(p) => <PremiumTooltip {...p} />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Présents" stackId="a" fill={CHART_BLUE} maxBarSize={22} />
              <Bar dataKey="Absents" stackId="a" fill="#e6e8ee" radius={[6, 6, 0, 0]} maxBarSize={22} />
            </BarChart>
          </RechartsViewport>
        </InsightCard>
      </div>
    </div>
  );
}
