import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FilterDropdown from '../ui/FilterDropdown';
import { FiBarChart, FiDownload } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ageFromDateOfBirth,
  ageGroupKey,
  formatAttendanceRate,
  genderKey,
  type AttendanceDimensionStats,
} from '@/lib/attendanceStats';

type DimensionFilter =
  | { kind: 'class'; key: string; label: string }
  | { kind: 'level'; key: string; label: string }
  | { kind: 'gender'; key: string; label: string }
  | { kind: 'age'; key: string; label: string }
  | null;

function isAbsenceStatus(status: string | undefined, excused: boolean | undefined): boolean {
  if (status === 'ABSENT' || status === 'EXCUSED') return true;
  if (status === 'LATE' || status === 'PRESENT') return false;
  return Boolean(excused);
}

function DimensionTable({
  title,
  rows,
  activeKey,
  onSelect,
}: {
  title: string;
  rows: AttendanceDimensionStats[];
  activeKey?: string | null;
  onSelect: (row: AttendanceDimensionStats) => void;
}) {
  return (
    <Card className="p-4 border border-gray-200">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune donnée sur la période.</p>
      ) : (
        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-2">Libellé</th>
                <th className="py-2 pr-2 text-right">Absences</th>
                <th className="py-2 pr-2 text-right">Non just.</th>
                <th className="py-2 pr-2 text-right">Justifiées</th>
                <th className="py-2 pr-2 text-right">Taux abs.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const selected = activeKey === row.key;
                return (
                  <tr
                    key={row.key}
                    className={`border-b border-gray-100 cursor-pointer hover:bg-slate-50 ${
                      selected ? 'bg-cyan-50' : ''
                    }`}
                    onClick={() => onSelect(row)}
                  >
                    <td className="py-2 pr-2 font-medium text-gray-900">{row.label}</td>
                    <td className="py-2 pr-2 text-right font-semibold text-red-700">
                      {row.absencesTotal}
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-700">{row.absentUnexcused}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">{row.excusedAbsent}</td>
                    <td className="py-2 pr-2 text-right text-gray-700">
                      {formatAttendanceRate(row.absenceRate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-gray-500 mt-2">Cliquez une ligne pour filtrer la liste des absences.</p>
    </Card>
  );
}

const AttendanceReportsPanel: React.FC = () => {
  const [classId, setClassId] = useState<string>('all');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dimensionFilter, setDimensionFilter] = useState<DimensionFilter>(null);
  const [absencesOnly, setAbsencesOnly] = useState(true);

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const { data: absences, isLoading } = useQuery({
    queryKey: ['admin-absences-report', classId],
    queryFn: () =>
      adminApi.getAllAbsences({
        ...(classId !== 'all' && { classId }),
      }),
  });

  const { data: apiStats } = useQuery({
    queryKey: ['admin-absence-stats', classId, fromDate, toDate],
    queryFn: () =>
      adminApi.getAbsenceStats({
        ...(classId !== 'all' && { classId }),
        from: fromDate,
        to: toDate,
      }),
  });

  const stats = apiStats ?? {
    total: 0,
    present: 0,
    absentUnexcused: 0,
    late: 0,
    excusedAbsent: 0,
    punctualityRate: 0,
    medicalCertificates: 0,
    sanctionsRecorded: 0,
    avgLateMinutes: null,
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

  const byClassAsDimension: AttendanceDimensionStats[] = useMemo(
    () =>
      (stats.byClass ?? []).map((c) => {
        const absencesTotal = c.absentUnexcused + c.excusedAbsent;
        return {
          key: c.classId,
          label: c.className,
          present: c.present,
          late: c.late,
          absentUnexcused: c.absentUnexcused,
          excusedAbsent: c.excusedAbsent,
          absencesTotal,
          total: c.total,
          punctualityRate: c.punctualityRate,
          absenceRate: c.total > 0 ? Math.round((absencesTotal / c.total) * 1000) / 10 : 0,
        };
      }),
    [stats.byClass]
  );

  const filtered = useMemo(() => {
    if (!absences?.length) return [];
    const start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
    const asOf = end;

    return absences.filter((a: {
      date?: string;
      status?: string;
      excused?: boolean;
      student?: {
        classId?: string | null;
        gender?: string | null;
        dateOfBirth?: string | null;
        class?: { name?: string; level?: string | null } | null;
      } | null;
    }) => {
      if (!a.date) return false;
      const d = parseISO(a.date);
      if (d < start || d > end) return false;

      if (absencesOnly && !isAbsenceStatus(a.status, a.excused)) return false;

      if (!dimensionFilter) return true;

      switch (dimensionFilter.kind) {
        case 'class':
          return (a.student?.classId ?? 'unassigned') === dimensionFilter.key;
        case 'level': {
          const level = a.student?.class?.level?.trim() || 'unknown';
          return level === dimensionFilter.key;
        }
        case 'gender':
          return genderKey(a.student?.gender) === dimensionFilter.key;
        case 'age':
          return ageGroupKey(ageFromDateOfBirth(a.student?.dateOfBirth, asOf)) === dimensionFilter.key;
        default: {
          const _exhaustive: never = dimensionFilter;
          void _exhaustive;
          return true;
        }
      }
    });
  }, [absences, fromDate, toDate, absencesOnly, dimensionFilter]);

  const exportCsv = () => {
    const headers = [
      'Élève',
      'Classe',
      'Niveau',
      'Sexe',
      'Date naissance',
      'Matière',
      'Date',
      'Statut',
      'Justifié',
      'Source',
      'Min retard',
      'Certif méd.',
      'Sanction',
    ];
    const rows = filtered.map((a: any) => [
      `${a.student?.user?.firstName ?? ''} ${a.student?.user?.lastName ?? ''}`.trim(),
      a.student?.class?.name ?? '',
      a.student?.class?.level ?? '',
      a.student?.gender ?? '',
      a.student?.dateOfBirth ? format(parseISO(a.student.dateOfBirth), 'yyyy-MM-dd') : '',
      a.course?.name ?? '',
      a.date ? format(parseISO(a.date), 'yyyy-MM-dd') : '',
      a.status ?? '',
      a.excused ? 'oui' : 'non',
      a.attendanceSource ?? '',
      a.minutesLate != null ? String(a.minutesLate) : '',
      a.hasMedicalCertificate ? 'oui' : 'non',
      (a.sanctionNote || '').replace(/\n/g, ' ').slice(0, 120),
    ]);
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assiduite_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 flex-wrap">
          <FilterDropdown
            label="Classe"
            value={classId}
            onChange={(value) => {
              setClassId(value);
              setDimensionFilter(null);
            }}
            options={[
              { value: 'all', label: 'Toutes les classes' },
              ...(classes || []).map((c: any) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              aria-label="Date de début de la période"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              aria-label="Date de fin de la période"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2">
            <input
              type="checkbox"
              checked={absencesOnly}
              onChange={(e) => setAbsencesOnly(e.target.checked)}
              className="rounded border-gray-300"
            />
            Liste : absences uniquement
          </label>
          <Button type="button" variant="outline" onClick={exportCsv} className="shrink-0">
            <FiDownload className="w-4 h-4 mr-2" />
            Exporter CSV (période)
          </Button>
        </div>
      </Card>

      {apiStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4 border border-violet-100 bg-violet-50/40">
            <p className="text-xs font-medium text-gray-500 uppercase">Certificats médicaux</p>
            <p className="text-2xl font-bold text-violet-800 mt-1">{apiStats.medicalCertificates ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Lignes marquées certificat sur la période (API)</p>
          </Card>
          <Card className="p-4 border border-amber-100 bg-amber-50/40">
            <p className="text-xs font-medium text-gray-500 uppercase">Sanctions enregistrées</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{apiStats.sanctionsRecorded ?? 0}</p>
            <p className="text-xs text-gray-500 mt-1">Notes de mesure saisies par l’administration</p>
          </Card>
          <Card className="p-4 border border-orange-100 bg-orange-50/40">
            <p className="text-xs font-medium text-gray-500 uppercase">Retard moyen</p>
            <p className="text-2xl font-bold text-orange-800 mt-1">
              {apiStats.avgLateMinutes != null ? `${apiStats.avgLateMinutes} min` : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Sur les séances « retard » avec durée renseignée</p>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border border-teal-100 bg-teal-50/40">
          <p className="text-xs font-medium text-gray-500 uppercase">Enregistrements</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Sur la période sélectionnée</p>
        </Card>
        <Card className="p-4 border border-green-100 bg-green-50/40">
          <p className="text-xs font-medium text-gray-500 uppercase">Présences + retards</p>
          <p className="text-2xl font-bold text-green-700 mt-1">
            {stats.present + stats.late}
          </p>
          <p className="text-xs text-gray-500 mt-1">Présent : {stats.present} · Retard : {stats.late}</p>
        </Card>
        <Card className="p-4 border border-red-100 bg-red-50/40">
          <p className="text-xs font-medium text-gray-500 uppercase">Absences non justifiées</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stats.absentUnexcused}</p>
          <p className="text-xs text-gray-500 mt-1">Justifiées : {stats.excusedAbsent}</p>
        </Card>
        <Card className="p-4 border border-cyan-100 bg-cyan-50/40">
          <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
            <FiBarChart className="w-3.5 h-3.5" /> Taux présence
          </p>
          <p className="text-2xl font-bold text-cyan-800 mt-1">{formatAttendanceRate(stats.punctualityRate)}</p>
          <p className="text-xs text-gray-500 mt-1">(présents + retards) / total lignes</p>
        </Card>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-lg font-semibold text-gray-900">Absences par dimension</h2>
          {dimensionFilter && (
            <Button
              type="button"
              variant="outline"
              className="text-sm"
              onClick={() => setDimensionFilter(null)}
            >
              Effacer le filtre : {dimensionFilter.label}
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <DimensionTable
            title="Par classe"
            rows={byClassAsDimension}
            activeKey={dimensionFilter?.kind === 'class' ? dimensionFilter.key : null}
            onSelect={(row) => setDimensionFilter({ kind: 'class', key: row.key, label: row.label })}
          />
          <DimensionTable
            title="Par niveau"
            rows={stats.byLevel ?? []}
            activeKey={dimensionFilter?.kind === 'level' ? dimensionFilter.key : null}
            onSelect={(row) => setDimensionFilter({ kind: 'level', key: row.key, label: row.label })}
          />
          <DimensionTable
            title="Par sexe"
            rows={stats.byGender ?? []}
            activeKey={dimensionFilter?.kind === 'gender' ? dimensionFilter.key : null}
            onSelect={(row) => setDimensionFilter({ kind: 'gender', key: row.key, label: row.label })}
          />
          <DimensionTable
            title="Par âge"
            rows={stats.byAgeGroup ?? []}
            activeKey={dimensionFilter?.kind === 'age' ? dimensionFilter.key : null}
            onSelect={(row) => setDimensionFilter({ kind: 'age', key: row.key, label: row.label })}
          />
        </div>
      </div>

      <Card className="p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">
          Liste des absences ({filtered.length}
          {dimensionFilter ? ` — ${dimensionFilter.label}` : ''})
        </h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune donnée pour cette période et ces filtres.</p>
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Élève</th>
                  <th className="py-2 pr-3">Classe</th>
                  <th className="py-2 pr-3">Niveau</th>
                  <th className="py-2 pr-3">Sexe</th>
                  <th className="py-2 pr-3">Âge</th>
                  <th className="py-2 pr-3">Matière</th>
                  <th className="py-2 pr-3">Statut</th>
                  <th className="py-2 pr-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((a: any) => {
                  const age = ageFromDateOfBirth(a.student?.dateOfBirth, new Date(toDate));
                  return (
                    <tr key={a.id} className="border-b border-gray-100">
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {a.date
                          ? format(parseISO(a.date), 'dd MMM yyyy', { locale: fr })
                          : '—'}
                      </td>
                      <td className="py-2 pr-3">
                        {a.student?.user?.firstName} {a.student?.user?.lastName}
                      </td>
                      <td className="py-2 pr-3">{a.student?.class?.name ?? '—'}</td>
                      <td className="py-2 pr-3">{a.student?.class?.level ?? '—'}</td>
                      <td className="py-2 pr-3">
                        {a.student?.gender === 'MALE'
                          ? 'G'
                          : a.student?.gender === 'FEMALE'
                            ? 'F'
                            : a.student?.gender ?? '—'}
                      </td>
                      <td className="py-2 pr-3">{age != null ? `${age} ans` : '—'}</td>
                      <td className="py-2 pr-3">{a.course?.name ?? '—'}</td>
                      <td className="py-2 pr-3">
                        {a.status === 'PRESENT'
                          ? 'Présent'
                          : a.status === 'LATE'
                            ? 'Retard'
                            : a.excused || a.status === 'EXCUSED'
                              ? 'Absent (just.)'
                              : 'Absent'}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-600">
                        {a.attendanceSource === 'BIOMETRIC'
                          ? 'Bio.'
                          : a.attendanceSource === 'NFC'
                            ? 'NFC'
                            : a.attendanceSource === 'MANUAL'
                              ? 'Manuel'
                              : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 200 && (
              <p className="text-xs text-gray-500 mt-2">
                Affichage des 200 premières lignes. Utilisez l’export CSV pour la liste complète.
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AttendanceReportsPanel;
