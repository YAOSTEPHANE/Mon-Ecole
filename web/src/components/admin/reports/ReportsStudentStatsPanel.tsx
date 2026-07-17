import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import Card from '../../ui/Card';
import { adminApi } from '../../../services/api';
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  PremiumTooltip,
  RechartsViewport,
} from '../../charts';

function guessDefaultAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const GENDER_COLORS = ['#2563eb', '#db2777', '#64748b'];

const PERIODS = [
  { id: 'full', label: 'Année complète' },
  { id: 'trim1', label: 'Trimestre 1' },
  { id: 'trim2', label: 'Trimestre 2' },
  { id: 'trim3', label: 'Trimestre 3' },
] as const;

type AvgRow = {
  id: string;
  name: string;
  level: string;
  average20: number | null;
  gradeCount: number;
  studentsWithGrades: number;
};

type RecapRow = {
  id: string;
  name: string;
  level: string;
  effectifTotal: number;
  effectifAssigned: number;
  effectifNotAssigned: number;
  above10Count: number;
  above10Percent: number;
  mid85Count: number;
  mid85Percent: number;
  below85Count: number;
  below85Percent: number;
  studentsWithGrades: number;
  average20: number | null;
};

type StudentStatsReport = {
  periodLabel?: string;
  academicYear?: string | null;
  summary?: {
    studentsActive: number;
    gradesCount: number;
    globalAverage20: number | null;
    stateAssignedCount?: number;
    notStateAssignedCount?: number;
    stateAssignedAverage20?: number | null;
    notStateAssignedAverage20?: number | null;
    stateAssignedStudentsWithGrades?: number;
    notStateAssignedStudentsWithGrades?: number;
  };
  gender?: Array<{ key: string; label: string; count: number; percent: number }>;
  genderByLevel?: Array<{
    level: string;
    male: number;
    female: number;
    other: number;
    total: number;
  }>;
  averagesByClass?: AvgRow[];
  averagesByLevel?: AvgRow[];
  recapByLevel?: RecapRow[];
  recapByClass?: RecapRow[];
};

function formatBand(count: number, percent: number) {
  return `${count} (${percent} %)`;
}

function RecapTable({
  rows,
  mode,
  emptyLabel,
}: {
  rows: RecapRow[];
  mode: 'level' | 'class';
  emptyLabel: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">{emptyLabel}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[11px]">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            {mode === 'class' ? (
              <>
                <th className="py-2 pr-2 sticky left-0 bg-white">Classe</th>
                <th className="py-2 pr-2">Niveau</th>
              </>
            ) : (
              <th className="py-2 pr-2 sticky left-0 bg-white">Niveau</th>
            )}
            <th className="py-2 pr-2 text-right">Effectif total</th>
            <th className="py-2 pr-2 text-right">Affectés</th>
            <th className="py-2 pr-2 text-right">Non affectés</th>
            <th className="py-2 pr-2 text-right" title="Moyenne ≥ 10 /20 (parmi les élèves notés)">
              ≥ 10
            </th>
            <th
              className="py-2 pr-2 text-right"
              title="Moyenne entre 8,5 et 9,99 /20 (parmi les élèves notés)"
            >
              8,5 – 9,99
            </th>
            <th className="py-2 pr-2 text-right" title="Moyenne &lt; 8,5 /20 (parmi les élèves notés)">
              &lt; 8,5
            </th>
            <th className="py-2 pr-2 text-right">
              {mode === 'class' ? 'Moyenne classe' : 'Moyenne niveau'}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 hover:bg-slate-50/80">
              {mode === 'class' ? (
                <>
                  <td className="py-2 pr-2 font-medium text-gray-900 sticky left-0 bg-white">
                    {r.name}
                  </td>
                  <td className="py-2 pr-2 text-gray-600">{r.level}</td>
                </>
              ) : (
                <td className="py-2 pr-2 font-medium text-gray-900 sticky left-0 bg-white">
                  {r.level}
                </td>
              )}
              <td className="py-2 pr-2 text-right tabular-nums font-semibold">{r.effectifTotal}</td>
              <td className="py-2 pr-2 text-right tabular-nums text-amber-900">
                {r.effectifAssigned}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-slate-700">
                {r.effectifNotAssigned}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-emerald-800">
                {formatBand(r.above10Count, r.above10Percent)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-amber-800">
                {formatBand(r.mid85Count, r.mid85Percent)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums text-rose-800">
                {formatBand(r.below85Count, r.below85Percent)}
              </td>
              <td className="py-2 pr-2 text-right tabular-nums font-semibold text-indigo-900">
                {r.average20 != null ? `${r.average20}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-500 mt-2">
        Les % des tranches de moyennes sont calculés sur les élèves ayant au moins une note sur la
        période (≥ 10 · 8,5–9,99 · &lt; 8,5).
      </p>
    </div>
  );
}

const ReportsStudentStatsPanel: React.FC = () => {
  const [academicYear, setAcademicYear] = useState(guessDefaultAcademicYear);
  const [period, setPeriod] = useState<string>('full');
  const [useAllYears, setUseAllYears] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => adminApi.getClasses(),
    staleTime: 120_000,
  });

  const academicYears = useMemo(() => {
    const s = new Set<string>();
    for (const c of classes as { academicYear?: string }[]) {
      if (c.academicYear) s.add(c.academicYear);
    }
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [classes]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-reports-student-stats', useAllYears ? '' : academicYear, period],
    queryFn: () =>
      adminApi.getStudentStatsReports({
        ...(useAllYears ? {} : { academicYear: academicYear || undefined }),
        period,
      }),
    staleTime: 30_000,
  });

  const report = data as StudentStatsReport | undefined;
  const busy = isLoading || isFetching;

  const genderPie = useMemo(
    () =>
      (report?.gender ?? []).map((g) => ({
        name: g.label,
        value: g.count,
        percent: g.percent,
      })),
    [report?.gender]
  );

  const genderStacked = useMemo(
    () =>
      (report?.genderByLevel ?? []).map((r) => ({
        level: r.level,
        Garçons: r.male,
        Filles: r.female,
        Autre: r.other,
      })),
    [report?.genderByLevel]
  );

  const assignmentPie = useMemo(() => {
    const a = report?.summary?.stateAssignedCount ?? 0;
    const n = report?.summary?.notStateAssignedCount ?? 0;
    return [
      { name: 'Affectés État', value: a },
      { name: 'Non affectés', value: n },
    ].filter((d) => d.value > 0);
  }, [report?.summary?.stateAssignedCount, report?.summary?.notStateAssignedCount]);

  const levelEffectifsChart = useMemo(
    () =>
      (report?.recapByLevel ?? []).map((r) => ({
        name: r.level.length > 12 ? `${r.level.slice(0, 10)}…` : r.level,
        fullName: r.level,
        Affectés: r.effectifAssigned,
        'Non affectés': r.effectifNotAssigned,
      })),
    [report?.recapByLevel]
  );

  const levelBandsChart = useMemo(
    () =>
      (report?.recapByLevel ?? []).map((r) => ({
        name: r.level.length > 12 ? `${r.level.slice(0, 10)}…` : r.level,
        fullName: r.level,
        '≥ 10': r.above10Count,
        '8,5 – 9,99': r.mid85Count,
        '< 8,5': r.below85Count,
      })),
    [report?.recapByLevel]
  );

  const levelAvgChart = useMemo(
    () =>
      (report?.recapByLevel ?? [])
        .filter((r) => r.average20 != null)
        .map((r) => ({
          name: r.level.length > 12 ? `${r.level.slice(0, 10)}…` : r.level,
          fullName: r.level,
          moyenne: r.average20 ?? 0,
        })),
    [report?.recapByLevel]
  );

  const classEffectifsChart = useMemo(
    () =>
      (report?.recapByClass ?? []).map((r) => ({
        name: r.name.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
        fullName: `${r.name} (${r.level})`,
        Affectés: r.effectifAssigned,
        'Non affectés': r.effectifNotAssigned,
      })),
    [report?.recapByClass]
  );

  const classBandsChart = useMemo(
    () =>
      (report?.recapByClass ?? []).map((r) => ({
        name: r.name.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
        fullName: `${r.name} (${r.level})`,
        '≥ 10': r.above10Count,
        '8,5 – 9,99': r.mid85Count,
        '< 8,5': r.below85Count,
      })),
    [report?.recapByClass]
  );

  const classAvgChart = useMemo(
    () =>
      (report?.recapByClass ?? [])
        .filter((r) => r.average20 != null)
        .map((r) => ({
          name: r.name.length > 14 ? `${r.name.slice(0, 12)}…` : r.name,
          fullName: `${r.name} (${r.level})`,
          moyenne: r.average20 ?? 0,
        })),
    [report?.recapByClass]
  );

  const globalBandsPie = useMemo(() => {
    const rows = report?.recapByLevel ?? [];
    let above = 0;
    let mid = 0;
    let below = 0;
    for (const r of rows) {
      above += r.above10Count;
      mid += r.mid85Count;
      below += r.below85Count;
    }
    return [
      { name: '≥ 10', value: above, fill: '#059669' },
      { name: '8,5 – 9,99', value: mid, fill: '#d97706' },
      { name: '< 8,5', value: below, fill: '#e11d48' },
    ].filter((d) => d.value > 0);
  }, [report?.recapByLevel]);

  const ASSIGNMENT_COLORS = ['#d97706', '#64748b'];

  return (
    <div className="space-y-6">
      <Card className="p-5 border border-indigo-200 bg-indigo-50/40">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-indigo-950">Statistiques élèves</h3>
            <p className="text-xs text-indigo-900/80 mt-1">
              Répartition par genre, moyennes générales par classe et par niveau (notes pondérées /20).
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-xs text-indigo-950">
              <input
                type="checkbox"
                checked={useAllYears}
                onChange={(ev) => setUseAllYears(ev.target.checked)}
                className="rounded border-gray-300"
              />
              Toutes années
            </label>
            <label className="block text-xs font-medium text-gray-700 min-w-[9rem]">
              Année scolaire
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:opacity-50"
                value={academicYear}
                disabled={useAllYears}
                onChange={(ev) => setAcademicYear(ev.target.value)}
              >
                {academicYear && !academicYears.includes(academicYear) && (
                  <option value={academicYear}>{academicYear}</option>
                )}
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-medium text-gray-700 min-w-[9rem]">
              Période (notes)
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={period}
                onChange={(ev) => setPeriod(ev.target.value)}
              >
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {report?.periodLabel && (
          <p className="text-[11px] text-indigo-800/70 mt-3 border-t border-indigo-200/80 pt-3">
            Période des notes : {report.periodLabel}
            {report.academicYear ? ` · Année ${report.academicYear}` : ''}
          </p>
        )}
      </Card>

      {busy && !report ? (
        <p className="text-sm text-gray-500">Chargement des statistiques…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Élèves actifs</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.summary?.studentsActive ?? 0}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Moyenne générale</p>
              <p className="text-2xl font-semibold text-indigo-900">
                {report?.summary?.globalAverage20 != null
                  ? `${report.summary.globalAverage20} / 20`
                  : '—'}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-[11px] text-gray-500">Notes prises en compte</p>
              <p className="text-2xl font-semibold text-gray-900">
                {report?.summary?.gradesCount ?? 0}
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="p-4 border border-amber-200 bg-amber-50/40">
              <p className="text-[11px] text-amber-900">Affectés de l’État</p>
              <p className="text-2xl font-semibold text-amber-950">
                {report?.summary?.stateAssignedCount ?? 0}
              </p>
              <p className="text-xs text-amber-900/80 mt-1">
                Moyenne :{' '}
                {report?.summary?.stateAssignedAverage20 != null
                  ? `${report.summary.stateAssignedAverage20} / 20`
                  : '—'}
                {' · '}
                {report?.summary?.stateAssignedStudentsWithGrades ?? 0} élève(s) noté(s)
              </p>
            </Card>
            <Card className="p-4 border border-slate-200 bg-slate-50/50">
              <p className="text-[11px] text-slate-600">Non affectés</p>
              <p className="text-2xl font-semibold text-slate-900">
                {report?.summary?.notStateAssignedCount ?? 0}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Moyenne :{' '}
                {report?.summary?.notStateAssignedAverage20 != null
                  ? `${report.summary.notStateAssignedAverage20} / 20`
                  : '—'}
                {' · '}
                {report?.summary?.notStateAssignedStudentsWithGrades ?? 0} élève(s) noté(s)
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Affectation État</h4>
              <p className="text-xs text-gray-500 mb-3">Répartition globale des effectifs</p>
              {assignmentPie.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Aucun élève</p>
              ) : (
                <RechartsViewport height={240}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assignmentPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={assignmentPie.length > 1 ? 2 : 0}
                      >
                        {assignmentPie.map((_, i) => (
                          <Cell key={i} fill={ASSIGNMENT_COLORS[i % ASSIGNMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </RechartsViewport>
              )}
            </Card>
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">
                Tranches de moyennes (global)
              </h4>
              <p className="text-xs text-gray-500 mb-3">Élèves notés sur la période</p>
              {globalBandsPie.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Aucune note</p>
              ) : (
                <RechartsViewport height={240}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={globalBandsPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={globalBandsPie.length > 1 ? 2 : 0}
                      >
                        {globalBandsPie.map((d, i) => (
                          <Cell key={i} fill={d.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </RechartsViewport>
              )}
            </Card>
          </div>

          <Card className="p-5 border border-indigo-200">
            <h4 className="text-sm font-semibold text-indigo-950 mb-1">
              Récapitulatif par niveau
            </h4>
            <p className="text-xs text-indigo-900/80 mb-4">
              Effectifs (total, affectés, non affectés), tranches de moyennes et moyenne du niveau
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Effectifs affectés / non</h5>
                {levelEffectifsChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Aucune donnée</p>
                ) : (
                  <RechartsViewport height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={levelEffectifsChart} margin={CHART_MARGIN_COMPACT}>
                        <CartesianGrid {...CHART_GRID_SOFT} />
                        <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                        <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
                        <Tooltip
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          content={(p) => <PremiumTooltip {...p} />}
                          cursor={CHART_CURSOR}
                        />
                        <Legend />
                        <Bar dataKey="Affectés" stackId="e" fill="#d97706" />
                        <Bar dataKey="Non affectés" stackId="e" fill="#64748b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </RechartsViewport>
                )}
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Tranches de moyennes</h5>
                {levelBandsChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Aucune note</p>
                ) : (
                  <RechartsViewport height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={levelBandsChart} margin={CHART_MARGIN_COMPACT}>
                        <CartesianGrid {...CHART_GRID_SOFT} />
                        <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                        <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
                        <Tooltip
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          content={(p) => <PremiumTooltip {...p} />}
                          cursor={CHART_CURSOR}
                        />
                        <Legend />
                        <Bar dataKey="≥ 10" stackId="b" fill="#059669" />
                        <Bar dataKey="8,5 – 9,99" stackId="b" fill="#d97706" />
                        <Bar dataKey="< 8,5" stackId="b" fill="#e11d48" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </RechartsViewport>
                )}
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Moyenne par niveau</h5>
                {levelAvgChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Aucune moyenne</p>
                ) : (
                  <RechartsViewport height={240}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={levelAvgChart} margin={CHART_MARGIN_COMPACT}>
                        <CartesianGrid {...CHART_GRID_SOFT} />
                        <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                        <YAxis domain={[0, 20]} tick={CHART_AXIS_TICK} />
                        <Tooltip
                          formatter={(value) => [`${Number(value ?? 0)} / 20`, 'Moyenne']}
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          content={(p) => <PremiumTooltip {...p} />}
                          cursor={CHART_CURSOR}
                        />
                        <Bar dataKey="moyenne" fill="#4f46e5" radius={[6, 6, 0, 0]} maxBarSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  </RechartsViewport>
                )}
              </div>
            </div>

            <RecapTable
              rows={report?.recapByLevel ?? []}
              mode="level"
              emptyLabel="Aucun niveau à afficher"
            />
          </Card>

          <Card className="p-5 border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              Récapitulatif par classe
            </h4>
            <p className="text-xs text-slate-600 mb-4">
              Même détail pour chaque classe : effectifs, tranches de moyennes et moyenne de la classe
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Effectifs affectés / non</h5>
                {classEffectifsChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Aucune donnée</p>
                ) : (
                  <RechartsViewport height={Math.max(260, classEffectifsChart.length * 22)}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classEffectifsChart}
                        layout="vertical"
                        margin={{ ...CHART_MARGIN_COMPACT, left: 8 }}
                      >
                        <CartesianGrid {...CHART_GRID_SOFT} />
                        <XAxis type="number" allowDecimals={false} tick={CHART_AXIS_TICK} />
                        <YAxis type="category" dataKey="name" width={100} tick={CHART_AXIS_TICK} />
                        <Tooltip
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          content={(p) => <PremiumTooltip {...p} />}
                          cursor={CHART_CURSOR}
                        />
                        <Legend />
                        <Bar dataKey="Affectés" stackId="e" fill="#d97706" />
                        <Bar dataKey="Non affectés" stackId="e" fill="#64748b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </RechartsViewport>
                )}
              </div>
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-2">Tranches de moyennes</h5>
                {classBandsChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-6 text-center">Aucune note</p>
                ) : (
                  <RechartsViewport height={Math.max(260, classBandsChart.length * 22)}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={classBandsChart}
                        layout="vertical"
                        margin={{ ...CHART_MARGIN_COMPACT, left: 8 }}
                      >
                        <CartesianGrid {...CHART_GRID_SOFT} />
                        <XAxis type="number" allowDecimals={false} tick={CHART_AXIS_TICK} />
                        <YAxis type="category" dataKey="name" width={100} tick={CHART_AXIS_TICK} />
                        <Tooltip
                          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                          content={(p) => <PremiumTooltip {...p} />}
                          cursor={CHART_CURSOR}
                        />
                        <Legend />
                        <Bar dataKey="≥ 10" stackId="b" fill="#059669" />
                        <Bar dataKey="8,5 – 9,99" stackId="b" fill="#d97706" />
                        <Bar dataKey="< 8,5" stackId="b" fill="#e11d48" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </RechartsViewport>
                )}
              </div>
            </div>

            <div className="mb-6">
              <h5 className="text-xs font-semibold text-gray-700 mb-2">Moyenne par classe</h5>
              {classAvgChart.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">Aucune moyenne</p>
              ) : (
                <RechartsViewport height={Math.max(260, classAvgChart.length * 24)}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={classAvgChart}
                      layout="vertical"
                      margin={{ ...CHART_MARGIN_COMPACT, left: 8 }}
                    >
                      <CartesianGrid {...CHART_GRID_SOFT} />
                      <XAxis type="number" domain={[0, 20]} tick={CHART_AXIS_TICK} />
                      <YAxis type="category" dataKey="name" width={100} tick={CHART_AXIS_TICK} />
                      <Tooltip
                        formatter={(value) => [`${Number(value ?? 0)} / 20`, 'Moyenne']}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                        content={(p) => <PremiumTooltip {...p} />}
                        cursor={CHART_CURSOR}
                      />
                      <Bar dataKey="moyenne" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </RechartsViewport>
              )}
            </div>

            <RecapTable
              rows={report?.recapByClass ?? []}
              mode="class"
              emptyLabel="Aucune classe à afficher"
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Répartition par genre</h4>
              <p className="text-xs text-gray-500 mb-3">Effectifs élèves actifs</p>
              {genderPie.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Aucun élève</p>
              ) : (
                <RechartsViewport height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderPie}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={genderPie.length > 1 ? 2 : 0}
                      >
                        {genderPie.map((_, i) => (
                          <Cell key={i} fill={GENDER_COLORS[i % GENDER_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _n, item) => {
                          const p = (item?.payload as { percent?: number })?.percent;
                          return [`${value} (${p ?? 0} %)`, 'Effectif'];
                        }}
                        content={(p) => <PremiumTooltip {...p} />}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </RechartsViewport>
              )}
              <ul className="mt-2 space-y-1 text-xs text-gray-700">
                {(report?.gender ?? []).map((g) => (
                  <li key={g.key} className="flex justify-between gap-4">
                    <span>{g.label}</span>
                    <span className="font-semibold tabular-nums">
                      {g.count} · {g.percent} %
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Genre par niveau</h4>
              <p className="text-xs text-gray-500 mb-3">Garçons / filles / autre</p>
              {genderStacked.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">Aucune donnée</p>
              ) : (
                <RechartsViewport height={260}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderStacked} margin={CHART_MARGIN_COMPACT}>
                      <CartesianGrid {...CHART_GRID_SOFT} />
                      <XAxis dataKey="level" tick={CHART_AXIS_TICK} />
                      <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
                      <Tooltip content={(p) => <PremiumTooltip {...p} />} cursor={CHART_CURSOR} />
                      <Legend />
                      <Bar dataKey="Garçons" stackId="g" fill="#2563eb" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Filles" stackId="g" fill="#db2777" />
                      <Bar dataKey="Autre" stackId="g" fill="#64748b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </RechartsViewport>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsStudentStatsPanel;
