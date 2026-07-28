'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiLayers,
  FiPieChart,
  FiRadio,
  FiTrendingUp,
  FiUser,
  FiUsers,
} from 'react-icons/fi';
import Card from '../ui/Card';
import {
  ATTENDANCE_SOURCE_LABELS,
  formatAttendanceRate,
  type AttendanceStats,
} from '@/lib/attendanceStats';
import {
  CHART_AXIS_TICK,
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  CHART_MARGIN_TILTED,
  RechartsViewport,
  chartBlueRed,
  premiumPieGeometry,
} from '../charts';

const STATUS_COLORS = {
  present: '#10b981',
  late: '#f59e0b',
  absent: '#f43f5e',
  excused: '#8b5cf6',
} as const;

const SOURCE_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#94a3b8'] as const;

type AttendanceDashboardChartsProps = {
  stats: AttendanceStats;
  classId: string;
  selectedClassName: string;
};

function ChartCard({
  title,
  subtitle,
  icon: Icon,
  children,
  empty,
  className = '',
}: {
  title: string;
  subtitle: string;
  icon: typeof FiBarChart2;
  children: ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <Card className={`border border-gray-200 p-4 ${className}`}>
      <div className="mb-3 flex items-start gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
          <Icon className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>
      {empty ? <p className="py-10 text-center text-sm text-gray-500">Aucune donnée à afficher.</p> : children}
    </Card>
  );
}

function truncateLabel(value: string, max = 18): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

export default function AttendanceDashboardCharts({
  stats,
  classId,
  selectedClassName,
}: AttendanceDashboardChartsProps) {
  const statusPie = useMemo(() => {
    const rows = [
      { key: 'present', name: 'Présents', value: stats.present, fill: STATUS_COLORS.present },
      { key: 'late', name: 'Retards', value: stats.late, fill: STATUS_COLORS.late },
      { key: 'absent', name: 'Absences NJ', value: stats.absentUnexcused, fill: STATUS_COLORS.absent },
      { key: 'excused', name: 'Justifiées', value: stats.excusedAbsent, fill: STATUS_COLORS.excused },
    ].filter((row) => row.value > 0);
    return rows;
  }, [stats.present, stats.late, stats.absentUnexcused, stats.excusedAbsent]);

  const statusTotal = useMemo(
    () => statusPie.reduce((sum, row) => sum + row.value, 0),
    [statusPie]
  );

  const sourcePie = useMemo(() => {
    const source = stats.bySource ?? { manual: 0, nfc: 0, biometric: 0, other: 0 };
    return (Object.keys(ATTENDANCE_SOURCE_LABELS) as Array<keyof typeof ATTENDANCE_SOURCE_LABELS>)
      .map((key, index) => ({
        key,
        name: ATTENDANCE_SOURCE_LABELS[key],
        value: source[key] ?? 0,
        fill: SOURCE_COLORS[index % SOURCE_COLORS.length],
      }))
      .filter((row) => row.value > 0);
  }, [stats.bySource]);

  const sourceTotal = useMemo(
    () => sourcePie.reduce((sum, row) => sum + row.value, 0),
    [sourcePie]
  );

  const levelChart = useMemo(
    () =>
      (stats.byLevel ?? []).map((row) => ({
        name: truncateLabel(row.label, 14),
        fullName: row.label,
        absences: row.absencesTotal,
        nj: row.absentUnexcused,
        justifiées: row.excusedAbsent,
        taux: row.absenceRate,
      })),
    [stats.byLevel]
  );

  const genderChart = useMemo(
    () =>
      (stats.byGender ?? []).map((row) => ({
        name: row.label,
        présents: row.present,
        retards: row.late,
        absences: row.absencesTotal,
        nj: row.absentUnexcused,
        justifiées: row.excusedAbsent,
        taux: row.absenceRate,
      })),
    [stats.byGender]
  );

  const ageChart = useMemo(
    () =>
      (stats.byAgeGroup ?? []).map((row) => ({
        name: truncateLabel(row.label, 16),
        fullName: row.label,
        absences: row.absencesTotal,
        nj: row.absentUnexcused,
        justifiées: row.excusedAbsent,
        taux: row.absenceRate,
      })),
    [stats.byAgeGroup]
  );

  const classAbsencesChart = useMemo(
    () =>
      (stats.byClass ?? [])
        .map((row) => ({
          name: truncateLabel(row.className, 12),
          fullName: row.className,
          présents: row.present,
          retards: row.late,
          nj: row.absentUnexcused,
          justifiées: row.excusedAbsent,
          taux: row.punctualityRate,
        }))
        .sort((a, b) => b.nj + b.justifiées - (a.nj + a.justifiées)),
    [stats.byClass]
  );

  const dayTrendChart = useMemo(
    () =>
      (stats.byDay ?? []).map((day) => {
        const absences = day.absentUnexcused + day.excusedAbsent;
        const punctuality =
          day.total > 0 ? Math.round(((day.present + day.late) / day.total) * 1000) / 10 : 0;
        return {
          label: format(parseISO(day.date), 'dd MMM', { locale: fr }),
          date: day.date,
          présents: day.present,
          retards: day.late,
          absences,
          taux: punctuality,
        };
      }),
    [stats.byDay]
  );

  const topAbsenceStudents = useMemo(
    () =>
      (stats.byStudent ?? [])
        .map((student) => ({
          name: truncateLabel(student.studentName, 16),
          fullName: student.studentName,
          className: student.className,
          absences: student.absentUnexcused + student.excusedAbsent,
          nj: student.absentUnexcused,
          taux: student.absenceRate,
        }))
        .filter((row) => row.absences > 0)
        .sort((a, b) => {
          if (b.absences !== a.absences) return b.absences - a.absences;
          return b.taux - a.taux;
        })
        .slice(0, 10),
    [stats.byStudent]
  );

  const topLateChart = useMemo(
    () =>
      (stats.topLateStudents ?? []).slice(0, 10).map((student) => ({
        name: truncateLabel(student.studentName, 16),
        fullName: student.studentName,
        className: student.className,
        retards: student.lateSessions,
      })),
    [stats.topLateStudents]
  );

  const sessionRiskChart = useMemo(
    () =>
      (stats.bySession ?? [])
        .map((session) => ({
          name: truncateLabel(`${session.courseName} · ${session.date.slice(5)}`, 22),
          fullName: `${session.courseName} — ${session.date} (${session.className})`,
          absences: session.absentUnexcused + session.excusedAbsent,
          nj: session.absentUnexcused,
          justifiées: session.excusedAbsent,
          total: session.total,
        }))
        .filter((row) => row.absences > 0)
        .sort((a, b) => b.absences - a.absences)
        .slice(0, 10),
    [stats.bySession]
  );

  const scopeHint =
    classId === 'all' ? 'toutes les classes' : selectedClassName;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FiBarChart2 className="h-5 w-5 text-teal-700" aria-hidden />
        <div>
          <h2 className="text-base font-bold text-stone-900">Graphiques d&apos;assiduité</h2>
          <p className="text-xs text-stone-500">
            Vue visuelle complète pour {scopeHint} sur la période sélectionnée
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Répartition des statuts"
          subtitle="Présents, retards, absences"
          icon={FiPieChart}
          empty={statusPie.length === 0}
        >
          <RechartsViewport height={240} className="w-full">
            <PieChart>
              <Pie
                data={statusPie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                {...premiumPieGeometry(statusPie.length)}
              >
                {statusPie.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  const pct =
                    statusTotal > 0 ? Math.round((n / statusTotal) * 1000) / 10 : 0;
                  return [`${n} (${pct} %)`, String(name)];
                }}
              />
              <Legend />
            </PieChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Sources de pointage"
          subtitle="Manuel, NFC, biométrie"
          icon={FiRadio}
          empty={sourcePie.length === 0}
        >
          <RechartsViewport height={240} className="w-full">
            <PieChart>
              <Pie
                data={sourcePie}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                {...premiumPieGeometry(sourcePie.length)}
              >
                {sourcePie.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  const pct =
                    sourceTotal > 0 ? Math.round((n / sourceTotal) * 1000) / 10 : 0;
                  return [`${n} (${pct} %)`, String(name)];
                }}
              />
              <Legend />
            </PieChart>
          </RechartsViewport>
        </ChartCard>
      </div>

      <ChartCard
        title="Évolution du taux de présence"
        subtitle="Courbe quotidienne (présents + retards) / total"
        icon={FiTrendingUp}
        empty={dayTrendChart.length === 0}
      >
        <RechartsViewport height={260} className="w-full">
          <ComposedChart data={dayTrendChart} margin={CHART_MARGIN_COMPACT}>
            <defs>
              <linearGradient id="attendanceRateFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...CHART_GRID_SOFT} />
            <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
            <YAxis tick={CHART_AXIS_TICK} domain={[0, 100]} unit="%" width={36} />
            <Tooltip
              formatter={(value, name) => {
                const n = typeof value === 'number' ? value : Number(value);
                if (name === 'taux') return [formatAttendanceRate(n), 'Taux présence'];
                return [n, String(name)];
              }}
            />
            <Area
              type="monotone"
              dataKey="taux"
              stroke="#0d9488"
              strokeWidth={2.5}
              fill="url(#attendanceRateFill)"
              name="taux"
            />
            <Line
              type="monotone"
              dataKey="absences"
              stroke="#f43f5e"
              strokeWidth={2}
              dot={false}
              name="absences"
            />
            <Legend />
          </ComposedChart>
        </RechartsViewport>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard
          title="Absences par niveau"
          subtitle="Volume d’absences (NJ + justifiées)"
          icon={FiLayers}
          empty={levelChart.length === 0}
        >
          <RechartsViewport height={240} className="w-full">
            <BarChart data={levelChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
              <Tooltip
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
                }
              />
              <Bar dataKey="nj" stackId="a" fill={STATUS_COLORS.absent} name="Non justifiées" />
              <Bar
                dataKey="justifiées"
                stackId="a"
                fill={STATUS_COLORS.excused}
                name="Justifiées"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Absences par sexe"
          subtitle="Répartition et volume"
          icon={FiUsers}
          empty={genderChart.length === 0}
        >
          <RechartsViewport height={240} className="w-full">
            <BarChart data={genderChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
              <Tooltip />
              <Legend />
              <Bar dataKey="présents" fill={STATUS_COLORS.present} radius={[4, 4, 0, 0]} />
              <Bar dataKey="retards" fill={STATUS_COLORS.late} radius={[4, 4, 0, 0]} />
              <Bar dataKey="absences" fill={STATUS_COLORS.absent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Absences par âge"
          subtitle="Tranches d’âge scolaires"
          icon={FiUser}
          empty={ageChart.length === 0}
        >
          <RechartsViewport height={240} className="w-full">
            <BarChart data={ageChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
              <Tooltip
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
                }
              />
              <Bar dataKey="absences" radius={[6, 6, 0, 0]}>
                {ageChart.map((entry, index) => (
                  <Cell key={entry.fullName} fill={chartBlueRed(index)} />
                ))}
              </Bar>
            </BarChart>
          </RechartsViewport>
        </ChartCard>
      </div>

      {classId === 'all' ? (
        <ChartCard
          title="Composition par classe"
          subtitle="Présents, retards et absences empilés"
          icon={FiActivity}
          empty={classAbsencesChart.length === 0}
        >
          <RechartsViewport height={300} className="w-full">
            <BarChart data={classAbsencesChart} margin={CHART_MARGIN_TILTED}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-25} textAnchor="end" height={60} />
              <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
              <Tooltip
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
                }
              />
              <Legend />
              <Bar dataKey="présents" stackId="a" fill={STATUS_COLORS.present} />
              <Bar dataKey="retards" stackId="a" fill={STATUS_COLORS.late} />
              <Bar dataKey="nj" stackId="a" fill={STATUS_COLORS.absent} name="Absences NJ" />
              <Bar
                dataKey="justifiées"
                stackId="a"
                fill={STATUS_COLORS.excused}
                name="Justifiées"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </RechartsViewport>
        </ChartCard>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Top absences élèves"
          subtitle="Les 10 élèves avec le plus d’absences"
          icon={FiBarChart2}
          empty={topAbsenceStudents.length === 0}
        >
          <RechartsViewport height={Math.max(220, topAbsenceStudents.length * 28)} className="w-full">
            <BarChart
              data={topAbsenceStudents}
              layout="vertical"
              margin={{ ...CHART_MARGIN_COMPACT, left: 8, right: 12 }}
            >
              <CartesianGrid {...CHART_GRID_SOFT} horizontal={false} />
              <XAxis type="number" tick={CHART_AXIS_TICK} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={CHART_AXIS_TICK} width={110} />
              <Tooltip
                formatter={(value, name) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  if (name === 'taux') return [formatAttendanceRate(n), 'Taux d’absence'];
                  return [n, String(name)];
                }}
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as
                    | { fullName?: string; className?: string }
                    | undefined;
                  return row ? `${row.fullName} (${row.className})` : '';
                }}
              />
              <Bar dataKey="absences" fill={STATUS_COLORS.absent} radius={[0, 6, 6, 0]} name="Absences" />
            </BarChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Top retards élèves"
          subtitle="Séances en retard sur la période"
          icon={FiClock}
          empty={topLateChart.length === 0}
        >
          <RechartsViewport height={Math.max(220, topLateChart.length * 28)} className="w-full">
            <BarChart
              data={topLateChart}
              layout="vertical"
              margin={{ ...CHART_MARGIN_COMPACT, left: 8, right: 12 }}
            >
              <CartesianGrid {...CHART_GRID_SOFT} horizontal={false} />
              <XAxis type="number" tick={CHART_AXIS_TICK} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={CHART_AXIS_TICK} width={110} />
              <Tooltip
                labelFormatter={(_, payload) => {
                  const row = payload?.[0]?.payload as
                    | { fullName?: string; className?: string }
                    | undefined;
                  return row ? `${row.fullName} (${row.className})` : '';
                }}
              />
              <Bar dataKey="retards" fill={STATUS_COLORS.late} radius={[0, 6, 6, 0]} name="Retards" />
            </BarChart>
          </RechartsViewport>
        </ChartCard>
      </div>

      <ChartCard
        title="Séances à risque"
        subtitle="Cours / jours avec le plus d’absences"
        icon={FiActivity}
        empty={sessionRiskChart.length === 0}
      >
        <RechartsViewport height={Math.max(240, sessionRiskChart.length * 26)} className="w-full">
          <BarChart
            data={sessionRiskChart}
            layout="vertical"
            margin={{ ...CHART_MARGIN_COMPACT, left: 8, right: 12 }}
          >
            <CartesianGrid {...CHART_GRID_SOFT} horizontal={false} />
            <XAxis type="number" tick={CHART_AXIS_TICK} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={CHART_AXIS_TICK} width={150} />
            <Tooltip
              labelFormatter={(_, payload) =>
                (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
              }
            />
            <Legend />
            <Bar dataKey="nj" stackId="a" fill={STATUS_COLORS.absent} name="Non justifiées" />
            <Bar
              dataKey="justifiées"
              stackId="a"
              fill={STATUS_COLORS.excused}
              name="Justifiées"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </RechartsViewport>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ChartCard
          title="Taux d’absence par niveau"
          subtitle="Pourcentage d’absences / total"
          icon={FiLayers}
          empty={levelChart.length === 0}
        >
          <RechartsViewport height={220} className="w-full">
            <BarChart data={levelChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} domain={[0, 100]} unit="%" width={36} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  return [formatAttendanceRate(n), 'Taux abs.'];
                }}
              />
              <Bar dataKey="taux" radius={[6, 6, 0, 0]}>
                {levelChart.map((entry, index) => (
                  <Cell key={entry.fullName} fill={chartBlueRed(index)} />
                ))}
              </Bar>
            </BarChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Taux d’absence par sexe"
          subtitle="Pourcentage d’absences / total"
          icon={FiUsers}
          empty={genderChart.length === 0}
        >
          <RechartsViewport height={220} className="w-full">
            <BarChart data={genderChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} domain={[0, 100]} unit="%" width={36} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  return [formatAttendanceRate(n), 'Taux abs.'];
                }}
              />
              <Bar dataKey="taux" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </RechartsViewport>
        </ChartCard>

        <ChartCard
          title="Taux d’absence par âge"
          subtitle="Pourcentage d’absences / total"
          icon={FiUser}
          empty={ageChart.length === 0}
        >
          <RechartsViewport height={220} className="w-full">
            <BarChart data={ageChart} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={CHART_AXIS_TICK} domain={[0, 100]} unit="%" width={36} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  return [formatAttendanceRate(n), 'Taux abs.'];
                }}
                labelFormatter={(_, payload) =>
                  (payload?.[0]?.payload as { fullName?: string } | undefined)?.fullName ?? ''
                }
              />
              <Bar dataKey="taux" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </RechartsViewport>
        </ChartCard>
      </div>
    </div>
  );
}
