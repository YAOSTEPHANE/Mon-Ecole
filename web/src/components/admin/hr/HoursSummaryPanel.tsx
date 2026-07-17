import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import toast from 'react-hot-toast';
import { FiChevronDown, FiChevronUp, FiDownload } from 'react-icons/fi';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { adminApi } from '../../../services/api';
import { downloadHoursSummaryPdf } from '../../../lib/hoursSummaryPdf';
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  PremiumTooltip,
  RechartsViewport,
  PREMIUM_BAR_RADIUS_TOP,
  PREMIUM_CHART_ANIMATION,
} from '../../charts';

type GroupBy = 'day' | 'week' | 'month';

type PeriodRow = {
  key: string;
  label: string;
  minutes: number;
  hours: number;
  sessions: number;
};

type TeacherRow = {
  teacherId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  hours: number;
  teachingMinutes: number;
  plannedMinutes?: number;
  plannedHours?: number;
  sessions: number;
  maxWeeklyHours: number | null;
  engagementKind: string | null;
  byPeriod?: PeriodRow[];
};

type StaffRow = {
  staffId: string;
  firstName: string;
  lastName: string;
  employeeId: string;
  jobTitle: string | null;
  hours: number;
  workedMinutes: number;
  sessions: number;
  presentDays: number;
  byPeriod?: PeriodRow[];
};

type HoursSummary = {
  filters?: { from: string; to: string; groupBy: GroupBy };
  totals?: {
    sessions: number;
    teachingMinutes?: number;
    workedMinutes?: number;
    hours: number;
    plannedHours?: number;
    presentDays?: number;
    teachersCount?: number;
    teachersListed?: number;
    staffCount?: number;
    staffListed?: number;
  };
  byPeriod?: PeriodRow[];
  byTeacher?: TeacherRow[];
  byStaff?: StaffRow[];
};

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function fmtHours(h: number) {
  return h.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

function exportPeopleCsv(mode: 'teachers' | 'staff', from: string, to: string, data: HoursSummary) {
  const lines =
    mode === 'teachers'
      ? [
          ['Rang', 'Enseignant', 'Matricule', 'Heures', 'Minutes', 'Sessions', 'Prévu (h)', 'Max/sem'].join(';'),
          ...(data.byTeacher ?? []).map((t, i) =>
            [
              i + 1,
              `"${t.lastName} ${t.firstName}"`,
              t.employeeId,
              fmtHours(t.hours).replace(/\s/g, '').replace(',', '.'),
              t.teachingMinutes,
              t.sessions,
              t.plannedHours != null ? fmtHours(t.plannedHours).replace(/\s/g, '').replace(',', '.') : '',
              t.maxWeeklyHours ?? '',
            ].join(';')
          ),
        ]
      : [
          ['Rang', 'Personnel', 'Matricule', 'Poste', 'Heures', 'Minutes', 'Sessions', 'Jours présents'].join(';'),
          ...(data.byStaff ?? []).map((s, i) =>
            [
              i + 1,
              `"${s.lastName} ${s.firstName}"`,
              s.employeeId,
              `"${s.jobTitle || ''}"`,
              fmtHours(s.hours).replace(/\s/g, '').replace(',', '.'),
              s.workedMinutes,
              s.sessions,
              s.presentDays,
            ].join(';')
          ),
        ];

  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `decompte_heures_${mode}_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type Props = {
  mode: 'teachers' | 'staff';
};

const HoursSummaryPanel: React.FC<Props> = ({ mode }) => {
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const [personId, setPersonId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: teachers } = useQuery({
    queryKey: ['admin-teachers-hours-filter'],
    queryFn: adminApi.getTeachers,
    enabled: mode === 'teachers',
  });
  const { data: staffMembers } = useQuery({
    queryKey: ['admin-staff-hours-filter'],
    queryFn: adminApi.getStaffMembers,
    enabled: mode === 'staff',
  });

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-hours-summary', mode, from, to, groupBy, personId],
    queryFn: () =>
      mode === 'teachers'
        ? (adminApi.getTeacherAttendanceSummary({
            from,
            to,
            groupBy,
            teacherId: personId || undefined,
          }) as Promise<HoursSummary>)
        : (adminApi.getStaffAttendanceSummary({
            from,
            to,
            groupBy,
            staffId: personId || undefined,
          }) as Promise<HoursSummary>),
  });

  const peopleRows = mode === 'teachers' ? data?.byTeacher ?? [] : data?.byStaff ?? [];

  const peopleChart = useMemo(() => {
    const rows =
      mode === 'teachers'
        ? (data?.byTeacher ?? []).filter((t) => t.hours > 0).slice(0, 20)
        : (data?.byStaff ?? []).filter((s) => s.hours > 0).slice(0, 20);
    return rows.map((r) => ({
      name:
        mode === 'teachers'
          ? `${(r as TeacherRow).lastName} ${(r as TeacherRow).firstName}`.trim().slice(0, 18)
          : `${(r as StaffRow).lastName} ${(r as StaffRow).firstName}`.trim().slice(0, 18),
      heures: r.hours,
    }));
  }, [data, mode]);

  const periodChart =
    data?.byPeriod?.map((p) => ({
      name: p.label.length > 16 ? `${p.label.slice(0, 14)}…` : p.label,
      heures: p.hours,
    })) ?? [];

  const people =
    mode === 'teachers'
      ? ((teachers as Array<{ id: string; user?: { firstName?: string; lastName?: string }; employeeId?: string }> ) ?? []).map(
          (t) => ({
            id: t.id,
            label: `${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''} — ${t.employeeId ?? ''}`.trim(),
          })
        )
      : ((staffMembers as Array<{ id: string; user?: { firstName?: string; lastName?: string }; employeeId?: string }> ) ?? []).map(
          (s) => ({
            id: s.id,
            label: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''} — ${s.employeeId ?? ''}`.trim(),
          })
        );

  const totals = data?.totals;

  const handleDownloadPdf = () => {
    if (!data) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    try {
      downloadHoursSummaryPdf({
        mode,
        from,
        to,
        groupBy,
        totals: data.totals,
        byPeriod: data.byPeriod,
        byTeacher: data.byTeacher,
        byStaff: data.byStaff,
      });
      toast.success('PDF téléchargé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur export PDF');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-teal-100 bg-teal-50/40">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-teal-950">
              {mode === 'teachers'
                ? 'Décompte des heures — par enseignant'
                : 'Décompte des heures — par personnel'}
            </h3>
            <p className="text-xs text-teal-900/80 mt-1">
              {mode === 'teachers'
                ? 'Total des minutes enseignées (pointages) pour chaque enseignant, avec détail jour / semaine / mois.'
                : 'Total des minutes travaillées (entrée/sortie ou saisie) pour chaque membre du personnel.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                if (!data) return toast.error('Aucune donnée');
                exportPeopleCsv(mode, from, to, data);
                toast.success('CSV téléchargé');
              }}
              disabled={!data || isLoading}
            >
              <FiDownload className="w-4 h-4 mr-1.5" />
              CSV par personne
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={!data || isLoading}
            >
              <FiDownload className="w-4 h-4 mr-1.5" />
              PDF
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`hours-person-${mode}`}>
              {mode === 'teachers' ? 'Filtrer un enseignant' : 'Filtrer un personnel'}
            </label>
            <select
              id={`hours-person-${mode}`}
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setExpandedId(null);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
            >
              <option value="">Tous</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`hours-from-${mode}`}>
              Du
            </label>
            <input
              id={`hours-from-${mode}`}
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1" htmlFor={`hours-to-${mode}`}>
              Au
            </label>
            <input
              id={`hours-to-${mode}`}
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
            />
          </div>
          <div className="flex gap-1">
            {(
              [
                { id: 'day' as const, label: 'Jour' },
                { id: 'week' as const, label: 'Semaine' },
                { id: 'month' as const, label: 'Mois' },
              ] as const
            ).map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGroupBy(g.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border ${
                  groupBy === g.id
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
          >
            Actualiser
          </button>
        </div>
      </Card>

      {isLoading ? (
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 border border-gray-200">
              <p className="text-[10px] uppercase text-gray-500 font-medium">Total heures</p>
              <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                {fmtHours(totals?.hours ?? 0)} h
              </p>
            </Card>
            <Card className="p-4 border border-gray-200">
              <p className="text-[10px] uppercase text-gray-500 font-medium">Sessions / jours</p>
              <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                {totals?.sessions ?? 0}
              </p>
            </Card>
            {mode === 'teachers' ? (
              <Card className="p-4 border border-gray-200">
                <p className="text-[10px] uppercase text-gray-500 font-medium">Prévu</p>
                <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                  {fmtHours(totals?.plannedHours ?? 0)} h
                </p>
              </Card>
            ) : (
              <Card className="p-4 border border-gray-200">
                <p className="text-[10px] uppercase text-gray-500 font-medium">Jours présents</p>
                <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                  {totals?.presentDays ?? 0}
                </p>
              </Card>
            )}
            <Card className="p-4 border border-gray-200">
              <p className="text-[10px] uppercase text-gray-500 font-medium">
                {mode === 'teachers' ? 'Enseignants' : 'Personnel'}
              </p>
              <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                {mode === 'teachers'
                  ? `${totals?.teachersCount ?? 0} / ${totals?.teachersListed ?? peopleRows.length}`
                  : `${totals?.staffCount ?? 0} / ${totals?.staffListed ?? peopleRows.length}`}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">avec heures / listés</p>
            </Card>
          </div>

          {peopleChart.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                {mode === 'teachers'
                  ? 'Heures par enseignant (top 20)'
                  : 'Heures par personnel (top 20)'}
              </h4>
              <div className="h-64">
                <RechartsViewport height={256}>
                  <BarChart data={peopleChart} margin={{ ...CHART_MARGIN_COMPACT, bottom: 48 }}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-35} textAnchor="end" height={60} />
                    <YAxis tick={CHART_AXIS_TICK} unit=" h" />
                    <Tooltip content={(p) => <PremiumTooltip {...p} />} cursor={CHART_CURSOR} />
                    <Bar
                      dataKey="heures"
                      fill="#0d9488"
                      radius={PREMIUM_BAR_RADIUS_TOP}
                      {...PREMIUM_CHART_ANIMATION}
                    />
                  </BarChart>
                </RechartsViewport>
              </div>
            </Card>
          )}

          {periodChart.length > 0 && (
            <Card className="p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Évolution globale ({groupBy === 'day' ? 'jour' : groupBy === 'week' ? 'semaine' : 'mois'})
              </h4>
              <div className="h-48">
                <RechartsViewport height={192}>
                  <BarChart data={periodChart} margin={CHART_MARGIN_COMPACT}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} unit=" h" />
                    <Tooltip content={(p) => <PremiumTooltip {...p} />} cursor={CHART_CURSOR} />
                    <Bar
                      dataKey="heures"
                      fill="#14b8a6"
                      radius={PREMIUM_BAR_RADIUS_TOP}
                      {...PREMIUM_CHART_ANIMATION}
                    />
                  </BarChart>
                </RechartsViewport>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <h4 className="text-sm font-semibold text-gray-900">
                {mode === 'teachers'
                  ? 'Détail par enseignant (trié par heures)'
                  : 'Détail par personnel (trié par heures)'}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                Cliquez une ligne pour voir le décompte {groupBy === 'day' ? 'journalier' : groupBy === 'week' ? 'hebdomadaire' : 'mensuel'}.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-white text-left text-gray-600">
                    <th className="py-3 px-3 font-semibold w-10">#</th>
                    <th className="py-3 px-4 font-semibold">Personne</th>
                    <th className="py-3 px-4 font-semibold text-right">Heures</th>
                    <th className="py-3 px-4 font-semibold text-right">Sessions</th>
                    {mode === 'staff' && (
                      <th className="py-3 px-4 font-semibold text-right">Jours présents</th>
                    )}
                    {mode === 'teachers' && (
                      <th className="py-3 px-4 font-semibold text-right">Prévu / max sem.</th>
                    )}
                    <th className="py-3 px-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {mode === 'teachers'
                    ? (data?.byTeacher ?? []).map((t, idx) => {
                        const open = expandedId === t.teacherId;
                        return (
                          <FragmentRow
                            key={t.teacherId}
                            open={open}
                            onToggle={() => setExpandedId(open ? null : t.teacherId)}
                            rank={idx + 1}
                            name={`${t.firstName} ${t.lastName}`}
                            sub={t.employeeId}
                            hours={t.hours}
                            sessions={t.sessions}
                            extraRight={
                              <>
                                {t.plannedHours != null ? `${fmtHours(t.plannedHours)} h` : '—'}
                                {t.maxWeeklyHours != null ? ` / ${t.maxWeeklyHours} h` : ''}
                              </>
                            }
                            byPeriod={t.byPeriod}
                            colSpan={6}
                          />
                        );
                      })
                    : (data?.byStaff ?? []).map((s, idx) => {
                        const open = expandedId === s.staffId;
                        return (
                          <FragmentRow
                            key={s.staffId}
                            open={open}
                            onToggle={() => setExpandedId(open ? null : s.staffId)}
                            rank={idx + 1}
                            name={`${s.firstName} ${s.lastName}`}
                            sub={s.jobTitle || s.employeeId}
                            hours={s.hours}
                            sessions={s.sessions}
                            presentDays={s.presentDays}
                            byPeriod={s.byPeriod}
                            colSpan={6}
                          />
                        );
                      })}
                  {peopleRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        Aucune personne / pointage sur cette période.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

function FragmentRow({
  open,
  onToggle,
  rank,
  name,
  sub,
  hours,
  sessions,
  presentDays,
  extraRight,
  byPeriod,
  colSpan,
}: {
  open: boolean;
  onToggle: () => void;
  rank: number;
  name: string;
  sub: string;
  hours: number;
  sessions: number;
  presentDays?: number;
  extraRight?: ReactNode;
  byPeriod?: PeriodRow[];
  colSpan: number;
}) {
  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-teal-50/40 cursor-pointer"
        onClick={onToggle}
      >
        <td className="py-3 px-3 text-gray-400 tabular-nums">{rank}</td>
        <td className="py-3 px-4">
          <div className="font-medium text-gray-900">{name}</div>
          <div className="text-xs text-gray-500">{sub}</div>
        </td>
        <td className="py-3 px-4 text-right tabular-nums font-semibold text-teal-900">
          {fmtHours(hours)} h
        </td>
        <td className="py-3 px-4 text-right tabular-nums">{sessions}</td>
        {presentDays != null && (
          <td className="py-3 px-4 text-right tabular-nums">{presentDays}</td>
        )}
        {extraRight != null && (
          <td className="py-3 px-4 text-right tabular-nums text-gray-600">{extraRight}</td>
        )}
        <td className="py-3 px-3 text-gray-400">
          {open ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
        </td>
      </tr>
      {open && (
        <tr className="bg-stone-50/80 border-b border-gray-100">
          <td colSpan={colSpan} className="px-4 py-3">
            {!byPeriod || byPeriod.length === 0 ? (
              <p className="text-xs text-gray-500">Aucun détail de période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-1.5 pr-3 font-medium">Période</th>
                      <th className="py-1.5 pr-3 font-medium text-right">Heures</th>
                      <th className="py-1.5 font-medium text-right">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPeriod.map((p) => (
                      <tr key={p.key} className="border-t border-stone-100">
                        <td className="py-1.5 pr-3 text-gray-800">{p.label}</td>
                        <td className="py-1.5 pr-3 text-right tabular-nums font-medium">
                          {fmtHours(p.hours)} h
                        </td>
                        <td className="py-1.5 text-right tabular-nums">{p.sessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default HoursSummaryPanel;
