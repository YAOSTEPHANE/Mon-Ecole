'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { adminApi } from '../../services/api';
import { teacherApi } from '../../services/api';
import { getCurrentAcademicYear } from '../../utils/academicYear';

type Mode = 'admin' | 'teacher';

type QuestionDraft = {
  prompt: string;
  kind: 'MCQ' | 'TRUE_FALSE' | 'SHORT_TEXT';
  optionsText: string;
  correctAnswer: string;
  points: string;
};

const emptyQuestion = (): QuestionDraft => ({
  prompt: '',
  kind: 'MCQ',
  optionsText: 'A) Option 1\nB) Option 2\nC) Option 3\nD) Option 4',
  correctAnswer: 'A',
  points: '1',
});

type Props = { mode?: Mode; compact?: boolean };

export default function MockExamsManagementPanel({ mode = 'admin', compact = false }: Props) {
  const qc = useQueryClient();
  const year = getCurrentAcademicYear();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [examKind, setExamKind] = useState<'BEPC' | 'BAC' | 'OTHER'>('BEPC');
  const [classId, setClassId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [countsAsGrade, setCountsAsGrade] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [questions, setQuestions] = useState<QuestionDraft[]>([emptyQuestion()]);

  const listKey = mode === 'admin' ? ['admin-mock-exams'] : ['teacher-mock-exams'];
  const classesKey = mode === 'admin' ? ['admin-mock-exam-classes'] : ['teacher-mock-exam-classes'];

  const { data: exams = [], isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      mode === 'admin' ? adminApi.getMockExams({ academicYear: year }) : teacherApi.getMockExams(),
  });

  const { data: examClassesData } = useQuery({
    queryKey: classesKey,
    queryFn: () =>
      mode === 'admin'
        ? adminApi.getMockExamClasses({ academicYear: year })
        : teacherApi.getMockExamClasses(),
  });

  const examClasses = (examClassesData?.classes || []) as Array<{
    id: string;
    name: string;
    level: string;
    courseId?: string;
    courseName?: string;
    suggestedExamKind?: 'BEPC' | 'BAC' | 'OTHER';
  }>;

  const selectedClass = useMemo(
    () => examClasses.find((c) => c.id === classId || (mode === 'teacher' && c.courseId === courseId)),
    [examClasses, classId, courseId, mode]
  );

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        subject: subject || undefined,
        examKind,
        academicYear: year,
        classId: mode === 'admin' ? classId || undefined : selectedClass?.id,
        courseId: mode === 'teacher' ? courseId || selectedClass?.courseId : undefined,
        targetLevels: selectedClass?.level ? [selectedClass.level] : examKind === 'BEPC' ? ['3ème'] : examKind === 'BAC' ? ['Terminale'] : [],
        durationMinutes: parseInt(durationMinutes, 10) || 60,
        countsAsGrade,
        isPublished,
        maxAttempts: 2,
        questions: questions.map((q) => ({
          prompt: q.prompt,
          kind: q.kind,
          correctAnswer: q.correctAnswer,
          points: parseInt(q.points, 10) || 1,
          options:
            q.kind === 'MCQ'
              ? q.optionsText
                  .split('\n')
                  .map((l) => l.trim())
                  .filter(Boolean)
              : q.kind === 'TRUE_FALSE'
                ? ['Vrai', 'Faux']
                : null,
        })),
      };
      return mode === 'admin' ? adminApi.createMockExam(payload) : teacherApi.createMockExam(payload);
    },
    onSuccess: () => {
      toast.success('Examen blanc créé');
      qc.invalidateQueries({ queryKey: listKey });
      setTitle('');
      setSubject('');
      setQuestions([emptyQuestion()]);
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur création'),
  });

  const togglePublish = useMutation({
    mutationFn: (row: { id: string; isPublished: boolean }) =>
      mode === 'admin'
        ? adminApi.updateMockExam(row.id, { isPublished: !row.isPublished })
        : teacherApi.publishMockExam(row.id, !row.isPublished),
    onSuccess: () => {
      toast.success('Publication mise à jour');
      qc.invalidateQueries({ queryKey: listKey });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteMockExam(id),
    onSuccess: () => {
      toast.success('Examen blanc supprimé');
      qc.invalidateQueries({ queryKey: listKey });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  return (
    <div className={`space-y-4 ${compact ? 'text-sm' : ''}`}>
      <Card className="p-4 border border-indigo-100 bg-indigo-50/40 space-y-2">
        <h3 className="text-sm font-semibold text-indigo-950">Examens blancs</h3>
        <p className="text-xs text-indigo-900/80 leading-relaxed">
          Destinés aux classes d’examen (<strong>3ème</strong> → BEPC, <strong>Terminale</strong> → BAC).
          Les élèves concernés passent le QCM en ligne ; optionnellement, une note « Examen blanc » est
          enregistrée.
        </p>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">Créer un examen blanc</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <Input label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input label="Matière" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={examKind}
              onChange={(e) => setExamKind(e.target.value as 'BEPC' | 'BAC' | 'OTHER')}
              aria-label="Type d'examen"
            >
              <option value="BEPC">BEPC</option>
              <option value="BAC">BAC</option>
              <option value="OTHER">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              {mode === 'teacher' ? 'Cours / classe' : 'Classe d’examen'}
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={mode === 'teacher' ? courseId : classId}
              onChange={(e) => {
                const v = e.target.value;
                if (mode === 'teacher') {
                  setCourseId(v);
                  const found = examClasses.find((c) => c.courseId === v);
                  if (found?.suggestedExamKind) setExamKind(found.suggestedExamKind);
                  if (found) setClassId(found.id);
                } else {
                  setClassId(v);
                  const found = examClasses.find((c) => c.id === v);
                  if (found?.suggestedExamKind) setExamKind(found.suggestedExamKind);
                }
              }}
              aria-label="Classe"
            >
              <option value="">Sélectionner…</option>
              {examClasses.map((c) => (
                <option key={mode === 'teacher' ? c.courseId || c.id : c.id} value={mode === 'teacher' ? c.courseId : c.id}>
                  {mode === 'teacher'
                    ? `${c.courseName} — ${c.name} (${c.level})`
                    : `${c.name} (${c.level})`}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Durée (min)"
            type="number"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
          <label className="flex items-end gap-2 text-xs pb-2">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Publié immédiatement
          </label>
          <label className="flex items-end gap-2 text-xs pb-2">
            <input
              type="checkbox"
              checked={countsAsGrade}
              onChange={(e) => setCountsAsGrade(e.target.checked)}
            />
            Compter comme note
          </label>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Questions</h4>
            <Button type="button" size="sm" variant="secondary" onClick={() => setQuestions([...questions, emptyQuestion()])}>
              + Question
            </Button>
          </div>
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-lg border p-3 space-y-2 bg-gray-50/80">
              <div className="flex justify-between gap-2">
                <span className="text-xs font-medium text-gray-600">Q{idx + 1}</span>
                {questions.length > 1 && (
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={() => setQuestions(questions.filter((_, i) => i !== idx))}
                  >
                    Retirer
                  </button>
                )}
              </div>
              <Input
                label="Énoncé"
                value={q.prompt}
                onChange={(e) => {
                  const next = [...questions];
                  next[idx] = { ...q, prompt: e.target.value };
                  setQuestions(next);
                }}
              />
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={q.kind}
                    onChange={(e) => {
                      const next = [...questions];
                      next[idx] = {
                        ...q,
                        kind: e.target.value as QuestionDraft['kind'],
                        correctAnswer: e.target.value === 'TRUE_FALSE' ? 'Vrai' : q.correctAnswer,
                      };
                      setQuestions(next);
                    }}
                    aria-label={`Type question ${idx + 1}`}
                  >
                    <option value="MCQ">QCM</option>
                    <option value="TRUE_FALSE">Vrai / Faux</option>
                    <option value="SHORT_TEXT">Réponse courte</option>
                  </select>
                </div>
                <Input
                  label="Bonne réponse"
                  value={q.correctAnswer}
                  onChange={(e) => {
                    const next = [...questions];
                    next[idx] = { ...q, correctAnswer: e.target.value };
                    setQuestions(next);
                  }}
                />
                <Input
                  label="Points"
                  type="number"
                  value={q.points}
                  onChange={(e) => {
                    const next = [...questions];
                    next[idx] = { ...q, points: e.target.value };
                    setQuestions(next);
                  }}
                />
              </div>
              {q.kind === 'MCQ' && (
                <label className="block text-xs text-gray-600">
                  Options (une par ligne)
                  <textarea
                    className="mt-1 w-full rounded-lg border px-3 py-2 text-sm min-h-[80px]"
                    value={q.optionsText}
                    onChange={(e) => {
                      const next = [...questions];
                      next[idx] = { ...q, optionsText: e.target.value };
                      setQuestions(next);
                    }}
                  />
                </label>
              )}
            </div>
          ))}
        </div>

        <Button
          type="button"
          size="sm"
          disabled={!title.trim() || questions.every((q) => !q.prompt.trim()) || create.isPending}
          onClick={() => create.mutate()}
        >
          Créer l’examen blanc
        </Button>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Chargement…</div>
        ) : (exams as any[]).length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">Aucun examen blanc pour le moment.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-3 py-2">Titre</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Classe</th>
                <th className="px-3 py-2 text-right">Q / tentatives</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(exams as any[]).map((exam) => (
                <tr key={exam.id} className="border-t">
                  <td className="px-3 py-2">
                    <div className="font-medium">{exam.title}</div>
                    <div className="text-xs text-gray-500">{exam.subject || '—'}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={exam.examKind === 'BAC' ? 'danger' : 'warning'}>{exam.examKind}</Badge>
                    {!exam.isPublished && (
                      <span className="ml-1 text-[10px] text-amber-700">Brouillon</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {exam.class ? `${exam.class.name} (${exam.class.level})` : (exam.targetLevels || []).join(', ') || '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-xs">
                    {exam._count?.questions ?? 0} / {exam._count?.attempts ?? 0}
                  </td>
                  <td className="px-3 py-2 text-right space-x-2">
                    <button
                      type="button"
                      className="text-xs text-indigo-700"
                      onClick={() => togglePublish.mutate(exam)}
                    >
                      {exam.isPublished ? 'Dépublier' : 'Publier'}
                    </button>
                    {mode === 'admin' && (
                      <button
                        type="button"
                        className="text-xs text-red-600"
                        onClick={() => {
                          if (window.confirm('Supprimer cet examen blanc ?')) remove.mutate(exam.id);
                        }}
                      >
                        Suppr.
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
