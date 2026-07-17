'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { staffApi } from '@/services/api/staff.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

export default function StaffClassCouncilsPanel() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    classId: '',
    period: 'Trimestre 1',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    title: '',
    meetingDate: '',
    summary: '',
    decisions: '',
    recommendations: '',
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['staff-class-councils'],
    queryFn: () => staffApi.listClassCouncils(),
  });
  const { data: classes = [] } = useQuery({
    queryKey: ['staff-council-classes'],
    queryFn: staffApi.listCouncilClasses,
  });

  const createMut = useMutation({
    mutationFn: () => staffApi.createClassCouncil(form),
    onSuccess: () => {
      toast.success('Conseil de classe enregistré');
      setShowModal(false);
      void qc.invalidateQueries({ queryKey: ['staff-class-councils'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowModal(true)}>Nouveau conseil</Button>
      </div>

      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-stone-500">Chargement…</p>
        ) : (rows as unknown[]).length === 0 ? (
          <p className="text-sm text-stone-500">Aucune session enregistrée.</p>
        ) : (
          <ul className="space-y-3">
            {(rows as Array<{
              id: string;
              period: string;
              academicYear: string;
              title?: string | null;
              meetingDate: string;
              summary?: string | null;
              class: { name: string; level: string };
            }>).map((c) => (
              <li key={c.id} className="rounded-xl border border-stone-200 p-3">
                <p className="font-medium text-sm">
                  {c.class.name} · {c.period} ({c.academicYear})
                </p>
                <p className="text-xs text-stone-500">
                  {format(new Date(c.meetingDate), 'PPP', { locale: fr })}
                  {c.title ? ` · ${c.title}` : ''}
                </p>
                {c.summary && <p className="text-xs text-stone-600 mt-2">{c.summary}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouveau conseil de classe">
        <div className="space-y-3">
          <select
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
            aria-label="Classe"
          >
            <option value="">Choisir une classe</option>
            {(classes as { id: string; name: string; level: string }[]).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.level})
              </option>
            ))}
          </select>
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Période (ex. Trimestre 2)"
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
          />
          <input
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Année scolaire"
            value={form.academicYear}
            onChange={(e) => setForm((f) => ({ ...f, academicYear: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            value={form.meetingDate}
            onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
          />
          <textarea
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Synthèse"
            rows={3}
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
          />
          <Button
            onClick={() => createMut.mutate()}
            disabled={!form.classId || !form.meetingDate || createMut.isPending}
          >
            Enregistrer
          </Button>
        </div>
      </Modal>
    </div>
  );
}
