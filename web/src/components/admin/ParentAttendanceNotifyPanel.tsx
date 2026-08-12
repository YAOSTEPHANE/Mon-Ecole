import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { FiBell, FiSend } from 'react-icons/fi';
import { format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

function getParentReceiverIds(student: any): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const links = student?.parents ?? [];
  for (const link of links) {
    const uid = link?.parent?.user?.id;
    if (uid && typeof uid === 'string') {
      const fn = link?.parent?.user?.firstName ?? '';
      const ln = link?.parent?.user?.lastName ?? '';
      out.push({ id: uid, label: `${fn} ${ln}`.trim() || 'Parent' });
    }
  }
  return out;
}

const ParentAttendanceNotifyPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [days, setDays] = useState(7);

  const { data: students, isLoading: studentsLoading } = useQuery({
    queryKey: ['admin-students-parent-notify'],
    queryFn: () => adminApi.getStudents({ includeParents: true }),
  });

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['admin-absences-parent-notify'],
    queryFn: () => adminApi.getAllAbsences(),
  });

  const since = useMemo(() => subDays(new Date(), days), [days]);

  const rows = useMemo(() => {
    if (!absences?.length || !students?.length) return [];
    const studentMap = new Map((students as any[]).map((s) => [s.id, s]));
    const list: {
      absence: any;
      student: any;
      parents: { id: string; label: string }[];
    }[] = [];
    for (const a of absences as any[]) {
      if (a.status !== 'ABSENT' || a.excused) continue;
      const d = a.date ? parseISO(a.date) : null;
      if (!d || d < since) continue;
      const st = studentMap.get(a.studentId);
      if (!st) continue;
      const parents = getParentReceiverIds(st);
      if (parents.length === 0) continue;
      list.push({ absence: a, student: st, parents });
    }
    list.sort((x, y) => {
      const dx = x.absence.date ? parseISO(x.absence.date).getTime() : 0;
      const dy = y.absence.date ? parseISO(y.absence.date).getTime() : 0;
      return dy - dx;
    });
    return list;
  }, [absences, students, since]);

  const sendMutation = useMutation({
    mutationFn: adminApi.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message envoyé au parent');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Envoi impossible'),
  });

  const notify = (
    receiverId: string,
    studentName: string,
    courseName: string,
    dateStr: string
  ) => {
    const body = `Bonjour,\n\nNous vous informons que ${studentName} a été enregistré(e) absent(e) le ${dateStr} pour le cours : ${courseName}.\n\nMerci de prendre contact avec l'établissement en cas de besoin.\n\nCordialement,\nAdministration`;
    sendMutation.mutate({
      receiverId,
      subject: `Absence — ${studentName}`,
      content: body,
      category: 'ATTENDANCE',
    });
  };

  const loading = studentsLoading || absencesLoading;

  return (
    <div className="space-y-6">
      <Card className="p-4 border border-teal-100 bg-teal-50/30">
        <p className="text-sm text-gray-700">
          <FiBell className="inline w-4 h-4 mr-1 text-teal-600" />
          Liste des <strong>absences non justifiées</strong> sur les derniers jours, avec envoi d’un
          message privé au compte parent (messagerie admin). Complément : lors du pointage, des{' '}
          <strong>alertes automatiques e-mail / SMS</strong> peuvent aussi être envoyées aux parents
          (absences non justifiées et retards) si SMTP / SMS et{' '}
          <code className="text-xs bg-white/80 px-1 rounded">NOTIFY_PARENTS_ON_ATTENDANCE</code> sont
          configurés — voir aussi le détail d’une absence pour renvoyer une notification.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm text-gray-600">Fenêtre :</label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Nombre de jours pour la fenêtre d’absences"
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
          >
            <option value={7}>7 jours</option>
            <option value={14}>14 jours</option>
            <option value={30}>30 jours</option>
          </select>
        </div>
      </Card>

      <Card className="p-5 border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Absences à signaler aux parents</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune absence non justifiée récente avec parent lié au dossier.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Élève</th>
                  <th className="py-2 pr-3">Cours</th>
                  <th className="py-2 pr-3">Parents</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ absence, student, parents }) => {
                  const name = `${student.user?.firstName ?? ''} ${student.user?.lastName ?? ''}`.trim();
                  const dateLabel = absence.date
                    ? format(parseISO(absence.date), 'dd MMM yyyy', { locale: fr })
                    : '—';
                  return (
                    <tr key={absence.id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3 whitespace-nowrap">{dateLabel}</td>
                      <td className="py-3 pr-3">{name}</td>
                      <td className="py-3 pr-3">{absence.course?.name ?? '—'}</td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          {parents.map((p) => (
                            <Badge key={p.id} className="w-fit bg-gray-100 text-gray-800">
                              {p.label}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          {parents.map((p) => (
                            <Button
                              key={p.id}
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={sendMutation.isPending}
                              onClick={() =>
                                notify(
                                  p.id,
                                  name,
                                  absence.course?.name ?? 'cours',
                                  dateLabel
                                )
                              }
                              className="justify-start"
                            >
                              <FiSend className="w-3.5 h-3.5 mr-1 shrink-0" />
                              Notifier {p.label.split(' ')[0] || 'parent'}
                            </Button>
                          ))}
                        </div>
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

export default ParentAttendanceNotifyPanel;
