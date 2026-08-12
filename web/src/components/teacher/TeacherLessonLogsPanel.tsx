'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { teacherApi } from '@/services/api/teacher.api';
import Card from '../ui/Card';
import Button from '../ui/Button';

export default function TeacherLessonLogsPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    courseId: '',
    classId: '',
    title: '',
    content: '',
    objectives: '',
    homeworkNotes: '',
    lessonDate: new Date().toISOString().slice(0, 10),
  });

  const { data: profile } = useQuery({
    queryKey: ['teacher-profile-lesson-logs'],
    queryFn: () => teacherApi.getProfile(),
  });

  const courses =
    (profile as { courses?: Array<{ id: string; name: string; class: { id: string; name: string } }> })
      ?.courses ?? [];

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['teacher-lesson-logs', form.courseId],
    queryFn: () => teacherApi.getLessonLogs({ courseId: form.courseId || undefined }),
  });

  const createMut = useMutation({
    mutationFn: () =>
      teacherApi.createLessonLog({
        courseId: form.courseId,
        classId: form.classId,
        title: form.title || undefined,
        content: form.content,
        objectives: form.objectives || undefined,
        homeworkNotes: form.homeworkNotes || undefined,
        lessonDate: form.lessonDate,
      }),
    onSuccess: () => {
      toast.success('Séance enregistrée');
      setForm((f) => ({ ...f, title: '', content: '', objectives: '', homeworkNotes: '' }));
      void qc.invalidateQueries({ queryKey: ['teacher-lesson-logs'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-stone-900">Nouvelle séance — cahier de texte</h3>
        <select
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={form.courseId}
          onChange={(e) => {
            const c = courses.find((x) => x.id === e.target.value);
            setForm((f) => ({
              ...f,
              courseId: e.target.value,
              classId: c?.class.id ?? '',
            }));
          }}
          aria-label="Cours"
        >
          <option value="">Choisir un cours</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.class.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="w-full rounded-lg border px-3 py-2 text-sm"
          value={form.lessonDate}
          onChange={(e) => setForm((f) => ({ ...f, lessonDate: e.target.value }))}
          aria-label="Date de la séance"
        />
        <input
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Titre (optionnel)"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Contenu de la séance *"
          rows={4}
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
        />
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Objectifs pédagogiques"
          rows={2}
          value={form.objectives}
          onChange={(e) => setForm((f) => ({ ...f, objectives: e.target.value }))}
        />
        <textarea
          className="w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="Devoirs / travail à faire"
          rows={2}
          value={form.homeworkNotes}
          onChange={(e) => setForm((f) => ({ ...f, homeworkNotes: e.target.value }))}
        />
        <Button
          onClick={() => createMut.mutate()}
          disabled={
            !form.courseId || !form.classId || !form.content.trim() || createMut.isPending
          }
        >
          Publier la séance
        </Button>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-stone-900 mb-3">Séances récentes</h3>
        {isLoading ? (
          <p className="text-sm text-stone-500">Chargement…</p>
        ) : (logs as unknown[]).length === 0 ? (
          <p className="text-sm text-stone-500">Aucune séance enregistrée.</p>
        ) : (
          <ul className="space-y-3">
            {(logs as Array<{
              id: string;
              lessonDate: string;
              title?: string;
              content: string;
              homeworkNotes?: string;
            }>).map((log) => (
              <li key={log.id} className="rounded-xl border border-stone-200 p-3">
                <p className="text-sm font-medium">
                  {format(new Date(log.lessonDate), 'PPP', { locale: fr })}
                  {log.title ? ` · ${log.title}` : ''}
                </p>
                <p className="text-sm text-stone-600 mt-1 whitespace-pre-wrap">{log.content}</p>
                {log.homeworkNotes && (
                  <p className="text-xs text-orange-800 mt-2 bg-orange-50 rounded p-2">
                    Devoirs : {log.homeworkNotes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
