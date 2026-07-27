'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { FiCheckCircle, FiClock, FiLogOut, FiUserCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

function fmtMin(mins: number | null | undefined): string {
  if (mins == null || mins <= 0) return '—';
  return `${mins} min`;
}

/**
 * Pointage enseignant par session : arrivée + départ avec écarts vs EDT.
 */
const TeacherSelfAttendance: React.FC = () => {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['teacher-my-attendance', todayStr],
    queryFn: () => teacherApi.getMyAttendance({ date: todayStr }),
  });

  const checkInMut = useMutation({
    mutationFn: () => teacherApi.markMyAttendancePresent({ date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-my-attendance'] });
      toast.success('Arrivée enregistrée pour le cours en cours.');
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg || 'Impossible d’enregistrer l’arrivée');
    },
  });

  const checkOutMut = useMutation({
    mutationFn: (courseId?: string) =>
      teacherApi.markMyAttendanceDeparture(courseId ? { courseId } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-my-attendance'] });
      toast.success('Départ enregistré.');
    },
    onError: (err: unknown) => {
      const msg =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : undefined;
      toast.error(msg || 'Impossible d’enregistrer le départ');
    },
  });

  const sessions = (data?.sessions as any[]) ?? [];

  return (
    <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/95 to-teal-50/80 px-4 py-3 sm:px-5 shadow-sm ring-1 ring-emerald-900/5 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 rounded-xl bg-emerald-600 text-white p-2 shrink-0 shadow-sm">
            <FiUserCheck className="w-5 h-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-stone-900">Mes cours aujourd&apos;hui</p>
            <p className="text-xs text-stone-600 mt-0.5">
              1er clic = arrivée · 2e clic = départ. Heures décomptées : arrivée → fin du cours (emploi du temps).
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 whitespace-nowrap"
          disabled={checkInMut.isPending}
          onClick={() => checkInMut.mutate()}
        >
          {checkInMut.isPending ? 'Enregistrement…' : 'Pointer mon arrivée'}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-stone-500">Chargement des sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="text-xs text-stone-500">Aucun pointage pour aujourd&apos;hui.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => {
            const open = s.checkInAt && !s.actualCheckOutAt;
            const startDelta =
              (s.minutesLateStart ?? 0) > 0
                ? `Retard ${s.minutesLateStart} min`
                : (s.minutesEarlyStart ?? 0) > 0
                  ? `Avance ${s.minutesEarlyStart} min`
                  : null;
            return (
              <li
                key={s.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-xs"
              >
                <div>
                  <p className="font-semibold text-stone-900">
                    {s.course?.name ?? 'Cours'}
                    {s.course?.code ? ` (${s.course.code})` : ''}
                  </p>
                  <p className="text-stone-600 mt-0.5 flex flex-wrap items-center gap-2">
                    {s.checkInAt ? (
                      <>
                        <FiCheckCircle className="text-emerald-600" />
                        Arrivée {format(new Date(s.checkInAt), 'HH:mm')}
                        {startDelta ? <span className="text-amber-700">· {startDelta}</span> : null}
                      </>
                    ) : (
                      <span className="text-stone-500">Pas encore pointé</span>
                    )}
                    {s.actualCheckOutAt ? (
                      <span>
                        · Départ {format(new Date(s.actualCheckOutAt), 'HH:mm')}
                        {(s.minutesEarlyEnd ?? 0) > 0
                          ? ` (−${s.minutesEarlyEnd} min)`
                          : (s.minutesOvertimeEnd ?? 0) > 0
                            ? ` (+${s.minutesOvertimeEnd} min)`
                            : ''}
                      </span>
                    ) : s.checkInAt ? (
                      <span className="text-stone-500">· Fin EDT {format(new Date(s.checkOutAt), 'HH:mm')}</span>
                    ) : null}
                    {s.teachingMinutes != null ? (
                      <Badge variant="secondary" size="sm">
                        {fmtMin(s.teachingMinutes)}
                      </Badge>
                    ) : null}
                  </p>
                </div>
                {open ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={checkOutMut.isPending}
                    onClick={() => checkOutMut.mutate(s.courseId)}
                    className="shrink-0"
                  >
                    <FiLogOut className="w-3.5 h-3.5 mr-1 inline" />
                    Pointer départ
                  </Button>
                ) : s.actualCheckOutAt ? (
                  <Badge variant="success" size="sm">
                    Clôturé
                  </Badge>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TeacherSelfAttendance;
