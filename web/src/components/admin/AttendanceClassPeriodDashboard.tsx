'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiActivity,
  FiAlertCircle,
  FiBarChart2,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiGrid,
  FiUserCheck,
  FiUsers,
} from 'react-icons/fi';
import { adminApi } from '../../services/api';
import AttendanceDailySummarySection from './AttendanceDailySummarySection';
import AttendanceDashboardCharts from './AttendanceDashboardCharts';
import Card from '../ui/Card';
import FilterDropdown from '../ui/FilterDropdown';
import { ADM } from './adminModuleLayout';
import {
  attendanceRateBarClass,
  attendanceRateTone,
  formatAttendanceRate,
  resolveAttendancePeriod,
  studentAbsenceRateBarClass,
  studentAbsenceRateTone,
  type AttendancePeriodPreset,
  type AttendanceStats,
} from '@/lib/attendanceStats';
import {
  CHART_AXIS_TICK,
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  RechartsViewport,
  chartBlueRed,
} from '../charts';

const PERIOD_PRESETS: Array<{ id: Exclude<AttendancePeriodPreset, 'custom'>; label: string }> = [
  { id: 'week', label: '7 jours' },
  { id: 'month', label: 'Ce mois' },
  { id: 'quarter', label: '3 mois' },
];

type AttendanceClassPeriodDashboardProps = {
  onOpenAbsences?: () => void;
};

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0] ?? '';
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

const EMPTY_STATS: AttendanceStats = {
  total: 0,
  present: 0,
  absentUnexcused: 0,
  late: 0,
  excusedAbsent: 0,
  medicalCertificates: 0,
  sanctionsRecorded: 0,
  avgLateMinutes: null,
  punctualityRate: 0,
  bySource: { manual: 0, nfc: 0, biometric: 0, other: 0 },
  byDay: [],
  bySession: [],
  byClass: [],
  byLevel: [],
  byGender: [],
  byAgeGroup: [],
  byStudent: [],
  topLateStudents: [],
};

const AttendanceClassPeriodDashboard = ({ onOpenAbsences }: AttendanceClassPeriodDashboardProps) => {
  const [classId, setClassId] = useState('all');
  const [periodPreset, setPeriodPreset] = useState<AttendancePeriodPreset>('month');
  const [fromDate, setFromDate] = useState(monthStartIso);
  const [toDate, setToDate] = useState(todayIso);

  const applyPreset = (preset: Exclude<AttendancePeriodPreset, 'custom'>) => {
    const range = resolveAttendancePeriod(preset);
    setPeriodPreset(preset);
    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleCustomDateChange = (field: 'from' | 'to', value: string) => {
    setPeriodPreset('custom');
    if (field === 'from') setFromDate(value);
    else setToDate(value);
  };

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const { data: statsRaw, isLoading, isFetching } = useQuery({
    queryKey: ['admin-absence-stats', classId, fromDate, toDate],
    queryFn: () =>
      adminApi.getAbsenceStats({
        ...(classId !== 'all' && { classId }),
        from: fromDate,
        to: toDate,
      }),
    staleTime: 30_000,
  });

  const stats: AttendanceStats = useMemo(
    () => ({
      ...EMPTY_STATS,
      ...statsRaw,
      bySource: { ...EMPTY_STATS.bySource, ...statsRaw?.bySource },
      byDay: statsRaw?.byDay ?? [],
      bySession: statsRaw?.bySession ?? [],
      byClass: statsRaw?.byClass ?? [],
      byLevel: statsRaw?.byLevel ?? [],
      byGender: statsRaw?.byGender ?? [],
      byAgeGroup: statsRaw?.byAgeGroup ?? [],
      byStudent: statsRaw?.byStudent ?? [],
      topLateStudents: statsRaw?.topLateStudents ?? [],
    }),
    [statsRaw]
  );

  const selectedClassName = useMemo(() => {
    if (classId === 'all') return 'Toutes les classes';
    return (
      (classes as Array<{ id: string; name: string }> | undefined)?.find((c) => c.id === classId)
        ?.name ?? 'Classe'
    );
  }, [classId, classes]);

  const periodLabel = useMemo(() => {
    try {
      const from = format(parseISO(fromDate), 'd MMM yyyy', { locale: fr });
      const to = format(parseISO(toDate), 'd MMM yyyy', { locale: fr });
      return `${from} — ${to}`;
    } catch {
      return 'Période sélectionnée';
    }
  }, [fromDate, toDate]);

  const classChartData = useMemo(
    () =>
      (stats?.byClass ?? []).map((row) => ({
        name: row.className,
        classId: row.classId,
        taux: row.punctualityRate,
        total: row.total,
        absents: row.absentUnexcused,
      })),
    [stats?.byClass]
  );

  const dayChartData = useMemo(
    () =>
      (stats?.byDay ?? []).map((day) => ({
        label: format(parseISO(day.date), 'dd MMM', { locale: fr }),
        présents: day.present,
        retards: day.late,
        absents: day.absentUnexcused,
        excusés: day.excusedAbsent,
      })),
    [stats?.byDay]
  );

  const classStudents = useMemo(() => {
    if (classId === 'all') return stats?.byStudent ?? [];
    return (stats?.byStudent ?? []).filter((student) => student.classId === classId);
  }, [classId, stats?.byStudent]);

  const kpiCards = [
    {
      label: 'Enregistrements',
      value: stats?.total ?? 0,
      hint: selectedClassName,
      cardClass: 'border-stone-200/80 ring-stone-200/70',
      valueClass: 'text-stone-900',
      icon: FiActivity,
    },
    {
      label: 'Présents',
      value: stats?.present ?? 0,
      hint: 'Séances marquées présentes',
      cardClass: 'border-emerald-200/80 bg-emerald-50/40 ring-emerald-100/80',
      valueClass: 'text-emerald-900',
      icon: FiCheckCircle,
    },
    {
      label: 'Retards',
      value: stats?.late ?? 0,
      hint:
        stats?.avgLateMinutes != null
          ? `Retard moyen : ${stats.avgLateMinutes} min`
          : 'Séances en retard',
      cardClass: 'border-amber-200/80 bg-amber-50/40 ring-amber-100/80',
      valueClass: 'text-amber-900',
      icon: FiClock,
    },
    {
      label: 'Absences NJ',
      value: stats?.absentUnexcused ?? 0,
      hint: 'Non justifiées sur la période',
      cardClass: 'border-rose-200/80 bg-rose-50/40 ring-rose-100/80',
      valueClass: 'text-rose-900',
      icon: FiAlertCircle,
    },
    {
      label: 'Justifiées',
      value: stats?.excusedAbsent ?? 0,
      hint: `${stats?.medicalCertificates ?? 0} certificat(s) médical(aux)`,
      cardClass: 'border-violet-200/80 bg-violet-50/40 ring-violet-100/80',
      valueClass: 'text-violet-900',
      icon: FiUserCheck,
    },
    {
      label: 'Taux présence',
      value: formatAttendanceRate(stats?.punctualityRate ?? 0),
      hint: '(présents + retards) / total',
      cardClass: 'border-cyan-200/80 bg-cyan-50/40 ring-cyan-100/80',
      valueClass: attendanceRateTone(stats?.punctualityRate ?? 0),
      icon: FiBarChart2,
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="border border-teal-100 bg-teal-50/30 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="font-display text-base font-bold text-stone-900">
                Tableau de bord par classe et période
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
                <FiCalendar className="h-4 w-4 shrink-0 text-teal-700" aria-hidden />
                <span>
                  <strong>{selectedClassName}</strong> · {periodLabel}
                </span>
              </p>
            </div>
            {onOpenAbsences ? (
              <button
                type="button"
                onClick={onOpenAbsences}
                className="shrink-0 rounded-xl border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-50"
              >
                Détail des absences →
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {PERIOD_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  periodPreset === preset.id
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-teal-900 ring-1 ring-teal-200 hover:bg-teal-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
            {periodPreset === 'custom' ? (
              <span className="rounded-full bg-stone-200/80 px-3 py-1 text-xs font-semibold text-stone-700">
                Période personnalisée
              </span>
            ) : null}
          </div>

          <div className="flex flex-col flex-wrap gap-4 lg:flex-row lg:items-end">
            <FilterDropdown
              label="Classe"
              value={classId}
              onChange={setClassId}
              options={[
                { value: 'all', label: 'Toutes les classes (comparaison)' },
                ...(classes || []).map((c: { id: string; name: string }) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Du</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomDateChange('from', e.target.value)}
                aria-label="Date de début"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">Au</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleCustomDateChange('to', e.target.value)}
                aria-label="Date de fin"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
        </div>
      ) : (
        <>
          <div className={ADM.grid3}>
            {kpiCards.map((card) => {
              const Icon = card.icon;
              return (
                <Card key={card.label} className={`${ADM.statCard} border ${card.cardClass}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={ADM.statLabel}>{card.label}</p>
                    <Icon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden />
                  </div>
                  <p className={`${ADM.statValTone} ${card.valueClass}`}>{card.value}</p>
                  <p className={ADM.statHint}>{card.hint}</p>
                </Card>
              );
            })}
          </div>

          {isFetching && !isLoading ? (
            <p className="text-xs text-stone-500">Actualisation du tableau de bord…</p>
          ) : null}

          {classId === 'all' ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {(stats?.byClass ?? []).map((row) => (
                  <button
                    key={row.classId}
                    type="button"
                    onClick={() => setClassId(row.classId)}
                    className={`text-left ${ADM.statCard} border border-stone-200/80 bg-white transition-shadow hover:border-teal-200 hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-stone-900">{row.className}</p>
                      <FiGrid className="h-4 w-4 text-stone-400" aria-hidden />
                    </div>
                    <p className={`mt-2 text-2xl font-bold ${attendanceRateTone(row.punctualityRate)}`}>
                      {formatAttendanceRate(row.punctualityRate)}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {row.total} enregistrement{row.total > 1 ? 's' : ''} · {row.absentUnexcused} NJ ·{' '}
                      {row.late} retard{row.late > 1 ? 's' : ''}
                    </p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${attendanceRateBarClass(row.punctualityRate)}`}
                        style={{ width: `${Math.min(row.punctualityRate, 100)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-teal-800">Ouvrir le détail →</p>
                  </button>
                ))}
              </div>

              <Card className="border border-gray-200 p-4">
                <h3 className="mb-1 font-semibold text-gray-900">Comparaison des taux par classe</h3>
                <p className="mb-4 text-xs text-gray-500">Taux de présence (présents + retards) sur la période</p>
                {classChartData.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune donnée à comparer.</p>
                ) : (
                  <RechartsViewport height={280} className="w-full">
                    <BarChart data={classChartData} margin={CHART_MARGIN_COMPACT}>
                      <CartesianGrid {...CHART_GRID_SOFT} />
                      <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                      <YAxis tick={CHART_AXIS_TICK} unit="%" domain={[0, 100]} width={36} />
                      <Tooltip formatter={(value) => [`${value} %`, 'Taux présence']} />
                      <Bar
                        dataKey="taux"
                        radius={[6, 6, 0, 0]}
                        cursor="pointer"
                        onClick={(data) => {
                          const payload = data as { classId?: string };
                          if (payload.classId) setClassId(payload.classId);
                        }}
                      >
                        {classChartData.map((entry, index) => (
                          <Cell key={entry.classId} fill={chartBlueRed(index)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </RechartsViewport>
                )}
              </Card>
            </>
          ) : (
            <Card className="border border-teal-200 bg-teal-50/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-800">Classe sélectionnée</p>
                  <h3 className="font-display text-xl font-bold text-stone-900">{selectedClassName}</h3>
                  <p className="text-sm text-stone-600">{periodLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setClassId('all')}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  ← Comparer toutes les classes
                </button>
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="border border-gray-200 p-4 xl:col-span-2">
              <h3 className="mb-1 font-semibold text-gray-900">
                {classId === 'all' ? 'Évolution globale' : `Évolution — ${selectedClassName}`}
              </h3>
              <p className="mb-4 text-xs text-gray-500">Répartition quotidienne sur la période</p>
              {dayChartData.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune donnée pour afficher le graphique.</p>
              ) : (
                <RechartsViewport height={260} className="w-full">
                  <BarChart data={dayChartData} margin={CHART_MARGIN_COMPACT}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
                    <Tooltip />
                    <Bar dataKey="présents" stackId="a" fill="#10b981" />
                    <Bar dataKey="retards" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="absents" stackId="a" fill="#f43f5e" />
                    <Bar dataKey="excusés" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </RechartsViewport>
              )}
            </Card>

            <Card className="border border-gray-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FiClock className="h-4 w-4 text-amber-700" aria-hidden />
                <h3 className="font-semibold text-gray-900">Top retards</h3>
              </div>
              {(stats.topLateStudents.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-500">Aucun retard sur la période.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.topLateStudents.slice(0, 8).map((student, index) => (
                    <li
                      key={student.studentId}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/60 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-stone-900">
                          {index + 1}. {student.studentName}
                        </p>
                        <p className="text-xs text-stone-500">{student.className}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                        {student.lateSessions}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <AttendanceDashboardCharts
            stats={stats}
            classId={classId}
            selectedClassName={selectedClassName}
          />

          <AttendanceDailySummarySection
            byDay={stats.byDay}
            bySession={stats.bySession}
          />

          <Card className="border border-gray-200 p-4">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FiUsers className="h-4 w-4 text-teal-700" aria-hidden />
                <h3 className="font-semibold text-gray-900">
                  {classId === 'all'
                    ? 'Synthèse par élève (toutes classes)'
                    : `Élèves — ${selectedClassName}`}
                </h3>
              </div>
              <p className="text-[11px] text-stone-500">
                Taux d&apos;absence :{' '}
                <span className="font-medium text-emerald-800">&lt; 10 % vert</span>
                {' · '}
                <span className="font-medium text-amber-800">10–20 % orange</span>
                {' · '}
                <span className="font-medium text-rose-800">≥ 20 % rouge</span>
              </p>
            </div>
            {classStudents.length === 0 ? (
              <p className="text-sm text-gray-500">Aucun élève avec des pointages sur cette période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-600">
                      <th className="py-2 pr-3 font-semibold">Élève</th>
                      {classId === 'all' ? (
                        <th className="py-2 pr-3 font-semibold">Classe</th>
                      ) : null}
                      <th className="py-2 pr-3 font-semibold">Total</th>
                      <th className="py-2 pr-3 font-semibold">Présents</th>
                      <th className="py-2 pr-3 font-semibold">Retards</th>
                      <th className="py-2 pr-3 font-semibold">NJ</th>
                      <th className="py-2 pr-3 font-semibold">Just.</th>
                      <th className="py-2 font-semibold">Taux d&apos;absence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student) => (
                      <tr key={student.studentId} className="border-b border-stone-100">
                        <td className="py-2 pr-3 font-medium text-stone-900">{student.studentName}</td>
                        {classId === 'all' ? (
                          <td className="py-2 pr-3 text-stone-600">{student.className}</td>
                        ) : null}
                        <td className="py-2 pr-3 tabular-nums">{student.total}</td>
                        <td className="py-2 pr-3 tabular-nums text-emerald-800">{student.present}</td>
                        <td className="py-2 pr-3 tabular-nums text-amber-800">
                          {student.late}
                          {student.lateMinutesTotal > 0 ? (
                            <span className="ml-1 text-[11px] text-stone-500">
                              ({student.lateMinutesTotal} min)
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2 pr-3 tabular-nums text-rose-800">{student.absentUnexcused}</td>
                        <td className="py-2 pr-3 tabular-nums text-violet-800">{student.excusedAbsent}</td>
                        <td className="py-2">
                          <div className="flex min-w-28 items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className={`h-full rounded-full ${studentAbsenceRateBarClass(student.absenceRate)}`}
                                style={{ width: `${Math.min(student.absenceRate, 100)}%` }}
                                title={`${student.absentUnexcused + student.excusedAbsent} absence(s) sur ${student.total}`}
                              />
                            </div>
                            <span
                              className={`shrink-0 text-xs font-semibold tabular-nums ${studentAbsenceRateTone(student.absenceRate)}`}
                            >
                              {formatAttendanceRate(student.absenceRate)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AttendanceClassPeriodDashboard;
