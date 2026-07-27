'use client';

import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiCalendar } from 'react-icons/fi';
import Card from '../ui/Card';
import type { AttendanceDayStats, AttendanceSessionStats } from '@/lib/attendanceStats';

type AttendanceDailySummarySectionProps = {
  byDay: AttendanceDayStats[];
  bySession: AttendanceSessionStats[];
};

function sumSessions(sessions: AttendanceSessionStats[]) {
  return sessions.reduce(
    (acc, session) => ({
      present: acc.present + session.present,
      late: acc.late + session.late,
      absentUnexcused: acc.absentUnexcused + session.absentUnexcused,
      excusedAbsent: acc.excusedAbsent + session.excusedAbsent,
      total: acc.total + session.total,
    }),
    { present: 0, late: 0, absentUnexcused: 0, excusedAbsent: 0, total: 0 }
  );
}

const AttendanceDailySummarySection = ({ byDay, bySession }: AttendanceDailySummarySectionProps) => {
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, AttendanceSessionStats[]>();
    for (const session of bySession) {
      const list = map.get(session.date) ?? [];
      list.push(session);
      map.set(session.date, list);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [bySession]);

  if (byDay.length === 0 && bySession.length === 0) {
    return (
      <Card className="border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Résumé journalier par séance</h3>
        <p className="mt-2 text-sm text-gray-500">Aucun pointage sur la période sélectionnée.</p>
      </Card>
    );
  }

  return (
    <Card className="border border-gray-200 p-4">
      <div className="mb-4 flex items-start gap-2">
        <FiCalendar className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" aria-hidden />
        <div>
          <h3 className="font-semibold text-gray-900">Résumé journalier par séance</h3>
          <p className="text-xs text-stone-500">
            Présents, absents non justifiés, retards et excusés pour chaque séance (matière + jour).
          </p>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-left text-stone-600">
              <th className="py-2 pr-3 font-semibold">Jour</th>
              <th className="py-2 pr-3 font-semibold">Présents</th>
              <th className="py-2 pr-3 font-semibold">Retards</th>
              <th className="py-2 pr-3 font-semibold">Absents</th>
              <th className="py-2 pr-3 font-semibold">Excusés</th>
              <th className="py-2 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {byDay
              .slice()
              .reverse()
              .map((day) => (
                <tr key={day.date} className="border-b border-stone-100 bg-stone-50/40">
                  <td className="py-2 pr-3 font-medium text-stone-900">
                    {format(parseISO(day.date), 'EEEE d MMM yyyy', { locale: fr })}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-emerald-800">{day.present}</td>
                  <td className="py-2 pr-3 tabular-nums text-amber-800">{day.late}</td>
                  <td className="py-2 pr-3 tabular-nums text-rose-800">{day.absentUnexcused}</td>
                  <td className="py-2 pr-3 tabular-nums text-violet-800">{day.excusedAbsent}</td>
                  <td className="py-2 tabular-nums font-semibold text-stone-900">{day.total}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-6">
        {sessionsByDate.map(([date, sessions]) => {
          const dayTotal = sumSessions(sessions);
          return (
            <div key={date} className="overflow-hidden rounded-xl border border-stone-200/80">
              <div className="flex flex-col gap-1 border-b border-stone-200 bg-stone-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-semibold text-stone-900">
                  {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
                </p>
                <p className="text-xs text-stone-600">
                  {sessions.length} séance{sessions.length > 1 ? 's' : ''} · {dayTotal.present} présents ·{' '}
                  {dayTotal.late} retards · {dayTotal.absentUnexcused} absents · {dayTotal.excusedAbsent}{' '}
                  excusés
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 text-left text-stone-600">
                      <th className="px-4 py-2 font-semibold">Matière / séance</th>
                      <th className="py-2 pr-3 font-semibold">Classe</th>
                      <th className="py-2 pr-3 font-semibold">Présents</th>
                      <th className="py-2 pr-3 font-semibold">Retards</th>
                      <th className="py-2 pr-3 font-semibold">Absents</th>
                      <th className="py-2 pr-3 font-semibold">Excusés</th>
                      <th className="py-2 pr-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.sessionKey} className="border-b border-stone-100 last:border-0">
                        <td className="px-4 py-2 font-medium text-stone-900">{session.courseName}</td>
                        <td className="py-2 pr-3 text-stone-600">{session.className}</td>
                        <td className="py-2 pr-3 tabular-nums text-emerald-800">{session.present}</td>
                        <td className="py-2 pr-3 tabular-nums text-amber-800">{session.late}</td>
                        <td className="py-2 pr-3 tabular-nums text-rose-800">{session.absentUnexcused}</td>
                        <td className="py-2 pr-3 tabular-nums text-violet-800">{session.excusedAbsent}</td>
                        <td className="py-2 pr-3 tabular-nums font-medium text-stone-900">{session.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50/50 text-stone-800">
                      <td className="px-4 py-2 font-semibold" colSpan={2}>
                        Sous-total du jour
                      </td>
                      <td className="py-2 pr-3 tabular-nums font-semibold text-emerald-800">
                        {dayTotal.present}
                      </td>
                      <td className="py-2 pr-3 tabular-nums font-semibold text-amber-800">{dayTotal.late}</td>
                      <td className="py-2 pr-3 tabular-nums font-semibold text-rose-800">
                        {dayTotal.absentUnexcused}
                      </td>
                      <td className="py-2 pr-3 tabular-nums font-semibold text-violet-800">
                        {dayTotal.excusedAbsent}
                      </td>
                      <td className="py-2 pr-3 tabular-nums font-semibold">{dayTotal.total}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {bySession.length > 150 ? (
        <p className="mt-4 text-xs text-stone-500">
          Affichage limité aux {bySession.length} séances de la période. Réduisez la période pour un détail plus
          lisible.
        </p>
      ) : null}
    </Card>
  );
};

export default AttendanceDailySummarySection;
