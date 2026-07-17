import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Card from '../../ui/Card';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { CHART_GRID, CHART_MARGIN_COMPACT, chartBlueRed, CHART_ANIMATION_MS } from '../../charts';
import { adminApi } from '../../../services/api';

function guessDefaultAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const TRANSFER_LABELS: Record<string, string> = {
  CLASS_CHANGE: 'Changement de classe',
  REENROLLMENT: 'Réinscription',
  MUTATION: 'Mutation',
  DEPARTURE: 'Départ',
};

const ENROLLMENT_LABELS: Record<string, string> = {
  ACTIVE: 'Actifs',
  SUSPENDED: 'Suspendus',
  GRADUATED: 'Diplômés',
  ARCHIVED: 'Archivés',
};

const STAFF_CAT_LABELS: Record<string, string> = {
  ADMINISTRATION: 'Administration',
  SUPPORT: 'Soutien',
  SECURITY: 'Sécurité',
};

const ADMISSION_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: 'En examen',
  ACCEPTED: 'Acceptées',
  REJECTED: 'Refusées',
  WAITLIST: 'Liste d’attente',
  ENROLLED: 'Inscrites',
};

const ReportsAdministrativePanel: React.FC = () => {
  const [academicYear, setAcademicYear] = useState(guessDefaultAcademicYear);
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
    queryKey: ['admin-reports-administrative', useAllYears ? '' : academicYear],
    queryFn: () =>
      adminApi.getAdministrativeReports(
        useAllYears ? {} : { academicYear: academicYear || undefined }
      ),
    staleTime: 30_000,
  });

  const busy = isLoading || isFetching;
  const e = data?.effectifs;
  const p = data?.presence;
  const adm = data?.admissions;
  const mov = data?.studentMovements;
  const ratios = data?.ratios;

  const staffChart =
    e?.staffByCategory?.map((row: { category: string; count: number }) => ({
      name: STAFF_CAT_LABELS[row.category] ?? row.category,
      effectif: row.count,
    })) ?? [];

  const transferChart =
    mov?.transfersByType?.map((row: { transferType: string; count: number }) => ({
      name: TRANSFER_LABELS[row.transferType] ?? row.transferType,
      count: row.count,
    })) ?? [];

  const movementLine =
    mov?.byMonth?.map((row: { label: string; total?: number }) => ({
      label: row.label,
      mouvements: row.total ?? 0,
    })) ?? [];

  return (
    <div className="space-y-6">
      <Card className="p-5 border border-slate-200 bg-slate-50/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Rapports administratifs</h3>
            <p className="text-xs text-slate-600 mt-1">
              Effectifs, présences, dossiers d’inscription, mouvements d’élèves et ratios — périmètre
              aligné sur l’année scolaire ou les 90 derniers jours.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={useAllYears}
                onChange={(ev) => setUseAllYears(ev.target.checked)}
                className="rounded border-gray-300"
              />
              Toutes années (90 j.)
            </label>
            <label className="block text-xs font-medium text-gray-700 min-w-[10rem]">
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
          </div>
        </div>
        {data?.filters?.scopeNote && (
          <p className="text-[11px] text-slate-500 mt-3 border-t border-slate-200/80 pt-3">
            {data.filters.scopeNote}
          </p>
        )}
        {busy && <p className="text-xs text-indigo-600 mt-2 animate-pulse">Chargement…</p>}
      </Card>

      {e && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Élèves (total périmètre)</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{e.studentsTotal}</p>
            <p className="text-xs text-gray-500 mt-1">Actifs : {e.studentsActive}</p>
            {e.studentsWithoutClass != null && e.studentsWithoutClass > 0 && (
              <p className="text-xs text-amber-700 mt-1">Sans classe : {e.studentsWithoutClass}</p>
            )}
          </Card>
          <Card className="p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Enseignants</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{e.teachersTotal}</p>
            {e.teachersActiveInAcademicYearScope != null && (
              <p className="text-xs text-gray-500 mt-1">
                Avec cours sur l’année : {e.teachersActiveInAcademicYearScope}
              </p>
            )}
          </Card>
          <Card className="p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Personnel</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{e.staffTotal}</p>
            <p className="text-xs text-gray-500 mt-1">Éducateurs : {e.educatorsTotal}</p>
          </Card>
          <Card className="p-5 border border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">Classes</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{e.classesTotal}</p>
          </Card>
        </div>
      )}

      {ratios && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5 border border-indigo-100 bg-indigo-50/30">
            <p className="text-xs font-medium text-indigo-900 uppercase">Ratio élèves / enseignant</p>
            <p className="text-2xl font-bold text-indigo-950 mt-1">
              {ratios.studentsPerTeacher != null ? ratios.studentsPerTeacher : '—'}
            </p>
          </Card>
          <Card className="p-5 border border-indigo-100 bg-indigo-50/30">
            <p className="text-xs font-medium text-indigo-900 uppercase">Ratio élèves / classe</p>
            <p className="text-2xl font-bold text-indigo-950 mt-1">
              {ratios.studentsPerClass != null ? ratios.studentsPerClass : '—'}
            </p>
          </Card>
          <Card className="p-5 border border-indigo-100 bg-indigo-50/30">
            <p className="text-xs font-medium text-indigo-900 uppercase">Ratio enseignants / classe</p>
            <p className="text-2xl font-bold text-indigo-950 mt-1">
              {ratios.teachersPerClass != null ? ratios.teachersPerClass : '—'}
            </p>
          </Card>
        </div>
      )}
      {ratios?.basis && <p className="text-[11px] text-gray-500 -mt-2">{ratios.basis}</p>}

      {p && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['students', 'teachers', 'staff'] as const).map((key) => {
            const block = p[key];
            if (!block) return null;
            const title =
              key === 'students' ? 'Présence élèves' : key === 'teachers' ? 'Présence enseignants' : 'Présence personnel';
            return (
              <Card key={key} className="p-5 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                <p className="text-[11px] text-gray-500 mt-1">{block.periodLabel}</p>
                <p className="text-2xl font-bold text-teal-800 mt-2">
                  {block.presenceRatePercent != null ? `${block.presenceRatePercent} %` : '—'}
                </p>
                <p className="text-[11px] text-gray-500 mt-1">{block.formula}</p>
                <p className="text-xs text-gray-600 mt-2">Lignes : {block.totalRecords}</p>
              </Card>
            );
          })}
        </div>
      )}

      {adm && (
        <Card className="p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Statistiques d’inscription (dossiers)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(adm.byStatus ?? {}).map(([status, count]) => (
              <div key={status} className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2">
                <p className="text-[10px] font-medium text-gray-500 uppercase">
                  {ADMISSION_LABELS[status] ?? status}
                </p>
                <p className="text-xl font-bold text-gray-900">{count as number}</p>
              </div>
            ))}
          </div>
          {adm.byAcademicYear?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-600 mb-2">Volume par année (tous statuts)</p>
              <ul className="text-sm text-gray-700 flex flex-wrap gap-2">
                {adm.byAcademicYear.map((row: { academicYear: string; count: number }) => (
                  <li
                    key={row.academicYear}
                    className="rounded-full bg-white border border-gray-200 px-3 py-1"
                  >
                    {row.academicYear} : <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {mov && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Mouvements d’élèves (période)</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                <p className="text-[10px] uppercase text-emerald-800">Entrées (inscriptions)</p>
                <p className="text-2xl font-bold text-emerald-900">{mov.newEnrollmentsInPeriod}</p>
              </div>
              <div className="rounded-lg bg-rose-50 border border-rose-100 px-3 py-2">
                <p className="text-[10px] uppercase text-rose-800">Sorties (archives)</p>
                <p className="text-2xl font-bold text-rose-900">{mov.archivedExitsInPeriod}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Transferts enregistrés : <strong>{mov.transfersTotal}</strong> (changements de classe,
              réinscriptions, mutations, départs).
            </p>
          </Card>
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Statut d’inscription scolaire (élèves)</h3>
            <ul className="space-y-1 text-sm">
              {(e?.studentsByEnrollmentStatus ?? []).map((row: { status: string; count: number }) => (
                <li key={row.status} className="flex justify-between border-b border-gray-100 py-1">
                  <span>{ENROLLMENT_LABELS[row.status] ?? row.status}</span>
                  <strong className="tabular-nums">{row.count}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {staffChart.length > 0 && (
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Personnel par catégorie</h3>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChart} margin={CHART_MARGIN_COMPACT}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={32} />
                  <Tooltip />
                  <Bar dataKey="effectif" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={CHART_ANIMATION_MS}>
                    {staffChart.map((_, i) => (
                      <Cell key={i} fill={chartBlueRed(i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {transferChart.length > 0 && (
          <Card className="p-5 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Transferts par type (période)</h3>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transferChart} layout="vertical" margin={{ ...CHART_MARGIN_COMPACT, left: 8 }}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} isAnimationActive animationDuration={CHART_ANIMATION_MS} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {movementLine.length > 0 && (
        <Card className="p-5 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Volume mensuel des transferts</h3>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementLine} margin={{ ...CHART_MARGIN_COMPACT, bottom: 4 }}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} width={36} />
                <Tooltip formatter={(v) => [v, 'Transferts']} />
                <Line
                  type="monotone"
                  dataKey="mouvements"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ReportsAdministrativePanel;
