import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { FiClock, FiRefreshCw, FiDownload } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { downloadTeacherAttendanceSessionsPdf } from '../../../lib/hoursSummaryPdf';

const STATUS_META: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'secondary' }
> = {
  PRESENT: { label: 'Présent', variant: 'success' },
  LATE: { label: 'En retard', variant: 'warning' },
  ABSENT: { label: 'Absent', variant: 'danger' },
  EXCUSED: { label: 'Excusé', variant: 'info' },
};

const SOURCE_LABEL: Record<string, string> = {
  NFC: 'Pointage NFC / carte',
  ADMIN: 'Saisie administration',
  SELF: 'Pointage enseignant (app)',
};

function fmtMin(mins: number | null | undefined): string {
  if (mins == null || mins <= 0) return '—';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function fmtTime(d: string | Date | null | undefined): string {
  if (!d) return '—';
  return format(new Date(d), 'HH:mm', { locale: fr });
}

const HRTeacherAttendancePanel: React.FC = () => {
  const defaultRange = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);
    return {
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }, []);

  const [teacherId, setTeacherId] = useState('');
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);

  const { data: teachers } = useQuery({
    queryKey: ['admin-teachers-hr-attendance'],
    queryFn: adminApi.getTeachers,
  });

  const { data: rows, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['admin-teacher-attendance', teacherId, from, to],
    queryFn: () => {
      const params: { teacherId?: string; from: string; to: string } = { from, to };
      if (teacherId) params.teacherId = teacherId;
      return adminApi.getTeacherAttendance(params);
    },
  });

  const list = (rows as any[]) ?? [];
  const teacherOptions = (teachers as any[]) ?? [];

  const handleDownloadPdf = () => {
    try {
      downloadTeacherAttendanceSessionsPdf({
        from,
        to,
        rows: list.map((row) => {
          const st = STATUS_META[row.status];
          return {
            attendanceDate: row.attendanceDate
              ? format(new Date(row.attendanceDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: fr })
              : '—',
            teacherName: `${row.teacher?.user?.firstName ?? ''} ${row.teacher?.user?.lastName ?? ''}`.trim() || '—',
            courseLabel: row.course?.name
              ? `${row.course.name}${row.course?.code ? ` (${row.course.code})` : ''}`
              : '—',
            status: st?.label ?? row.status ?? '—',
            checkIn: fmtTime(row.checkInAt),
            checkOut: fmtTime(row.actualCheckOutAt ?? row.checkOutAt),
            hours:
              row.teachingMinutes != null
                ? `${(row.teachingMinutes / 60).toFixed(2).replace('.', ',')} h`
                : '—',
            source: SOURCE_LABEL[row.source] ?? row.source ?? '—',
          };
        }),
      });
      toast.success('PDF téléchargé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur export PDF');
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-teal-100 bg-teal-50/40">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <FiClock className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          <span>
            <strong>1er pointage</strong> = arrivée (retard ou avance vs début EDT) ·{' '}
            <strong>2e pointage</strong> = départ réel (écart vs fin EDT) · Les{' '}
            <strong>heures décomptées</strong> utilisent l&apos;intervalle arrivée → départ réel
            (ou fin EDT si pas de 2e pointage).
          </span>
        </p>
      </Card>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row lg:flex-wrap gap-3 lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="hr-att-teacher" className="block text-xs font-medium text-gray-600 mb-1">
              Enseignant
            </label>
            <select
              id="hr-att-teacher"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm"
              aria-label="Filtrer par enseignant"
            >
              <option value="">Tous</option>
              {teacherOptions.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.user?.firstName} {t.user?.lastName} — {t.employeeId}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="hr-att-from" className="block text-xs font-medium text-gray-600 mb-1">
              Du
            </label>
            <input
              id="hr-att-from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              aria-label="Date de début"
            />
          </div>
          <div>
            <label htmlFor="hr-att-to" className="block text-xs font-medium text-gray-600 mb-1">
              Au
            </label>
            <input
              id="hr-att-to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
              aria-label="Date de fin"
            />
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-60"
          >
            <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleDownloadPdf}
            disabled={isLoading}
          >
            <FiDownload className="w-4 h-4 mr-1.5" />
            Télécharger PDF
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun pointage sur cette période{teacherId ? ' pour cet enseignant' : ''}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="py-3 px-3 font-semibold">Date</th>
                  <th className="py-3 px-3 font-semibold">Enseignant</th>
                  <th className="py-3 px-3 font-semibold">Cours</th>
                  <th className="py-3 px-3 font-semibold">EDT</th>
                  <th className="py-3 px-3 font-semibold">Arrivée</th>
                  <th className="py-3 px-3 font-semibold">Écart début</th>
                  <th className="py-3 px-3 font-semibold">Départ</th>
                  <th className="py-3 px-3 font-semibold">Écart fin</th>
                  <th className="py-3 px-3 font-semibold">Heures</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row: any) => {
                  const st = STATUS_META[row.status] ?? {
                    label: row.status,
                    variant: 'secondary' as const,
                  };
                  const edt =
                    row.schedule?.startTime && row.schedule?.endTime
                      ? `${row.schedule.startTime} – ${row.schedule.endTime}`
                      : row.scheduledStartAt && row.scheduledEndAt
                        ? `${fmtTime(row.scheduledStartAt)} – ${fmtTime(row.scheduledEndAt)}`
                        : '—';
                  const startDelta =
                    (row.minutesLateStart ?? 0) > 0
                      ? `+${row.minutesLateStart} min retard`
                      : (row.minutesEarlyStart ?? 0) > 0
                        ? `−${row.minutesEarlyStart} min avance`
                        : "À l'heure";
                  const endDelta =
                    (row.minutesEarlyEnd ?? 0) > 0
                      ? `−${row.minutesEarlyEnd} min avant`
                      : (row.minutesOvertimeEnd ?? 0) > 0
                        ? `+${row.minutesOvertimeEnd} min après`
                        : row.actualCheckOutAt
                          ? "À l'heure"
                          : 'Fin EDT (auto)';
                  return (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-gray-900 text-xs">
                        {row.attendanceDate
                          ? format(new Date(row.attendanceDate + 'T12:00:00'), 'dd/MM/yyyy', {
                              locale: fr,
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-3 text-xs">
                        <div className="font-medium text-gray-900">
                          {row.teacher?.user?.firstName} {row.teacher?.user?.lastName}
                        </div>
                        <Badge variant={st.variant} size="sm" className="mt-1">
                          {st.label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-gray-700 text-xs">
                        {row.course?.name ?? '—'}
                        {row.course?.code ? ` (${row.course.code})` : ''}
                      </td>
                      <td className="py-3 px-3 text-gray-600 text-xs whitespace-nowrap">{edt}</td>
                      <td className="py-3 px-3 text-gray-800 whitespace-nowrap text-xs font-medium">
                        {fmtTime(row.checkInAt)}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">{startDelta}</td>
                      <td className="py-3 px-3 text-gray-800 whitespace-nowrap text-xs font-medium">
                        {fmtTime(row.actualCheckOutAt ?? row.checkOutAt)}
                      </td>
                      <td className="py-3 px-3 text-xs text-gray-600 whitespace-nowrap">{endDelta}</td>
                      <td className="py-3 px-3 text-gray-800 whitespace-nowrap text-xs tabular-nums font-medium">
                        {fmtMin(row.teachingMinutes)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default HRTeacherAttendancePanel;
