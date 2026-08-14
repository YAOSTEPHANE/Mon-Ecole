'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiPlus, FiTrash2, FiTrendingUp } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

type TeacherRow = {
  id: string;
  employeeId?: string | null;
  specialization?: string | null;
  user?: { firstName?: string; lastName?: string };
};

type TrainingRow = {
  id: string;
  teacherId: string;
  title: string;
  organization?: string | null;
  hours?: number | null;
  completedAt?: string | null;
  notes?: string | null;
  teacher?: TeacherRow;
};

const selectClass =
  'mt-1 w-full rounded-xl border border-stone-200/90 bg-white/95 px-4 py-3 text-sm text-stone-900 shadow-sm focus:border-cptb-gold/55 focus:outline-none focus:ring-2 focus:ring-cptb-gold/40';

function teacherName(t?: TeacherRow | null): string {
  if (!t?.user) return 'Enseignant';
  return `${t.user.firstName ?? ''} ${t.user.lastName ?? ''}`.trim() || 'Enseignant';
}

export default function TeacherTrainingAdminModule() {
  const qc = useQueryClient();
  const [teacherId, setTeacherId] = useState('');
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [hours, setHours] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [q, setQ] = useState('');

  const { data: teachers = [] } = useQuery({
    queryKey: ['admin-training-teachers'],
    queryFn: adminApi.getTeachers,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-professional-trainings'],
    queryFn: adminApi.getProfessionalTrainings,
  });

  const teacherList = teachers as TeacherRow[];
  const trainings = rows as TrainingRow[];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return trainings;
    return trainings.filter((row) => {
      const hay = `${teacherName(row.teacher)} ${row.title} ${row.organization ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [trainings, q]);

  const hoursTotal = trainings.reduce((sum, row) => sum + (row.hours ?? 0), 0);

  const createMut = useMutation({
    mutationFn: () =>
      adminApi.addTeacherProfessionalTraining(teacherId, {
        title: title.trim(),
        organization: organization.trim() || undefined,
        hours: hours.trim() ? Number(hours) : null,
        completedAt: completedAt || null,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Formation enregistrée');
      setTitle('');
      setOrganization('');
      setHours('');
      setCompletedAt('');
      setNotes('');
      qc.invalidateQueries({ queryKey: ['admin-professional-trainings'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Enregistrement impossible'),
  });

  const deleteMut = useMutation({
    mutationFn: ({ teacherId: tid, id }: { teacherId: string; id: string }) =>
      adminApi.deleteTeacherProfessionalTraining(tid, id),
    onSuccess: () => {
      toast.success('Formation supprimée');
      qc.invalidateQueries({ queryKey: ['admin-professional-trainings'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Suppression impossible'),
  });

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiTrendingUp className="h-5 w-5 text-cptb-gold" />
            Formation continue
          </span>
        </h2>
        <p className={ADM.intro}>
          Suivi des formations des enseignants : organismes, volumes horaires et dates de
          validation.
        </p>
      </div>

      <div className={ADM.grid3}>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Sessions</p>
          <p className={ADM.statVal}>{trainings.length}</p>
        </div>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Heures cumulées</p>
          <p className={ADM.statVal}>{hoursTotal}</p>
        </div>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>Enseignants</p>
          <p className={ADM.statVal}>{teacherList.length}</p>
        </div>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <h3 className="font-display text-sm font-bold text-stone-900">
          <span className="inline-flex items-center gap-2">
            <FiPlus className="h-4 w-4 text-cptb-gold" />
            Nouvelle formation
          </span>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold tracking-wide text-stone-800">
              Enseignant
            </label>
            <select
              aria-label="Enseignant formé"
              className={selectClass}
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">— Sélectionner —</option>
              {teacherList.map((t) => (
                <option key={t.id} value={t.id}>
                  {teacherName(t)}
                  {t.employeeId ? ` (${t.employeeId})` : ''}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Intitulé"
            placeholder="Didactique, numérique éducatif…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            label="Organisme"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
          />
          <Input
            label="Heures"
            type="number"
            min={0}
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Input
            label="Date de validation"
            type="date"
            value={completedAt}
            onChange={(e) => setCompletedAt(e.target.value)}
          />
          <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          isLoading={createMut.isPending}
          onClick={() => {
            if (!teacherId || !title.trim()) {
              toast.error('Enseignant et intitulé requis');
              return;
            }
            createMut.mutate();
          }}
        >
          Enregistrer
        </Button>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-stone-900">Historique</h3>
          <Input
            placeholder="Rechercher"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-stone-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Aucune formation enregistrée.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Enseignant</th>
                  <th className="px-4 py-2.5">Formation</th>
                  <th className="px-4 py-2.5">Heures</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-2.5">{teacherName(row.teacher)}</td>
                    <td className="px-4 py-2.5">
                      {row.title}
                      {row.organization ? (
                        <span className="mt-0.5 block text-[11px] text-stone-500">
                          {row.organization}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{row.hours ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {row.completedAt
                        ? format(new Date(row.completedAt), 'd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (window.confirm('Supprimer cette formation ?')) {
                            deleteMut.mutate({ teacherId: row.teacherId, id: row.id });
                          }
                        }}
                      >
                        <FiTrash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
