'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { educatorApi } from '@/services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { FiAlertTriangle, FiPlus } from 'react-icons/fi';

const CATEGORIES = [
  { value: 'VERBAL_WARNING', label: 'Avertissement oral' },
  { value: 'WRITTEN_WARNING', label: 'Avertissement écrit' },
  { value: 'REPRIMAND', label: 'Blâme' },
  { value: 'TEMPORARY_EXCLUSION', label: 'Exclusion temporaire' },
  { value: 'DISCIPLINE_COUNCIL_HEARING', label: 'Conseil de discipline (convocation)' },
  { value: 'DISCIPLINE_COUNCIL_DECISION', label: 'Conseil de discipline (décision)' },
  { value: 'BEHAVIOR_CONTRACT', label: 'Contrat de comportement' },
  { value: 'OTHER', label: 'Autre' },
] as const;

const currentAcademicYear = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
};

export default function EducatorDisciplinePanel() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    academicYear: currentAcademicYear(),
    title: '',
    category: 'VERBAL_WARNING',
    description: '',
    incidentDate: new Date().toISOString().slice(0, 10),
    notifyParents: true,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['educator-discipline-records'],
    queryFn: () => educatorApi.getDisciplineRecords(),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['educator-students-discipline'],
    queryFn: () => educatorApi.getStudents(),
  });

  const sortedStudents = useMemo(() => {
    return [...(students as Array<{ id: string; user?: { firstName?: string; lastName?: string }; class?: { name?: string } }>)]
      .sort((a, b) =>
        `${a.user?.lastName || ''} ${a.user?.firstName || ''}`.localeCompare(
          `${b.user?.lastName || ''} ${b.user?.firstName || ''}`,
          'fr',
        ),
      );
  }, [students]);

  useEffect(() => {
    const studentId = searchParams?.get('studentId');
    if (!studentId) return;
    setShowForm(true);
    setForm((f) => ({
      ...f,
      studentId,
      title: f.title || 'Suivi absences non justifiées',
      category: f.category || 'VERBAL_WARNING',
      description:
        f.description ||
        'Créé depuis les alertes d’absences non justifiées (21 derniers jours).',
    }));
  }, [searchParams]);

  const createMut = useMutation({
    mutationFn: () =>
      educatorApi.createDisciplineRecord({
        studentId: form.studentId,
        academicYear: form.academicYear,
        title: form.title,
        category: form.category,
        description: form.description || undefined,
        incidentDate: form.incidentDate,
        notifyParents: form.notifyParents,
      }),
    onSuccess: () => {
      toast.success('Dossier disciplinaire enregistré');
      setForm((f) => ({ ...f, title: '', description: '', studentId: '' }));
      setShowForm(false);
      void qc.invalidateQueries({ queryKey: ['educator-discipline-records'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <FiAlertTriangle className="h-4 w-4 text-amber-700" />
            Discipline — vos classes
          </h3>
          <p className="mt-0.5 text-xs text-stone-600">
            Consultez et enregistrez les suivis disciplinaires sur votre périmètre.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
          <FiPlus className="mr-1 inline h-4 w-4" />
          {showForm ? 'Fermer' : 'Nouveau dossier'}
        </Button>
      </div>

      {showForm && (
        <Card className="space-y-3 p-4">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.studentId}
            onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
            aria-label="Élève"
          >
            <option value="">Choisir un élève</option>
            {sortedStudents.map((s) => (
              <option key={s.id} value={s.id}>
                {s.user?.lastName} {s.user?.firstName}
                {s.class?.name ? ` — ${s.class.name}` : ''}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border px-3 py-2 text-sm"
              value={form.academicYear}
              onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
              placeholder="Année scolaire"
              aria-label="Année scolaire"
            />
            <input
              type="date"
              className="rounded-lg border px-3 py-2 text-sm"
              value={form.incidentDate}
              onChange={(e) => setForm((f) => ({ ...f, incidentDate: e.target.value }))}
              aria-label="Date incident"
            />
          </div>
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            aria-label="Catégorie"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Titre / motif court"
            aria-label="Titre"
          />
          <textarea
            className="min-h-[80px] w-full rounded-lg border px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optionnel)"
            aria-label="Description"
          />
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.notifyParents}
              onChange={(e) => setForm((f) => ({ ...f, notifyParents: e.target.checked }))}
            />
            Notifier les parents
          </label>
          <Button
            type="button"
            disabled={createMut.isPending || !form.studentId || !form.title.trim()}
            onClick={() => createMut.mutate()}
          >
            Enregistrer
          </Button>
        </Card>
      )}

      {isLoading ? (
        <Card className="p-8 text-center text-stone-500">Chargement des dossiers…</Card>
      ) : !records.length ? (
        <Card className="p-8 text-center text-stone-500">
          Aucun dossier disciplinaire sur votre périmètre.
        </Card>
      ) : (
        records.map(
          (r: {
            id: string;
            title: string;
            category: string;
            incidentDate: string;
            academicYear: string;
            description?: string | null;
            student?: {
              user?: { firstName?: string; lastName?: string };
              class?: { name?: string };
            };
          }) => (
            <Card key={r.id} className="space-y-1 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-900">
                  {r.student?.user?.lastName} {r.student?.user?.firstName}
                  {r.student?.class?.name ? (
                    <span className="ml-2 text-sm font-normal text-stone-500">{r.student.class.name}</span>
                  ) : null}
                </p>
                <Badge variant="warning">{r.category}</Badge>
              </div>
              <p className="text-sm text-stone-800">{r.title}</p>
              {r.description ? <p className="text-xs text-stone-600">{r.description}</p> : null}
              <p className="text-[11px] text-stone-500">
                {format(new Date(r.incidentDate), 'dd MMM yyyy', { locale: fr })} · {r.academicYear}
              </p>
            </Card>
          ),
        )
      )}
    </div>
  );
}
