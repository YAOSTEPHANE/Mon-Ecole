'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { studentApi } from '../../services/api';
import { FiAward, FiClock } from 'react-icons/fi';

type ExamListItem = {
  id: string;
  title: string;
  subject?: string | null;
  examKind: string;
  durationMinutes?: number | null;
  maxAttempts: number;
  mySubmittedAttempts: number;
  bestScoreOn20: number | null;
  canRetry: boolean;
  _count?: { questions: number };
};

export default function StudentMockExamsPanel() {
  const qc = useQueryClient();
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<{
    scoreOn20: number;
    passed: boolean;
    passingScore: number;
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['student-mock-exams'],
    queryFn: () => studentApi.getMockExams(),
  });

  const { data: examDetail, isLoading: loadingDetail } = useQuery({
    queryKey: ['student-mock-exam', activeExamId],
    queryFn: () => studentApi.getMockExam(activeExamId!),
    enabled: !!activeExamId,
  });

  const submit = useMutation({
    mutationFn: () => studentApi.submitMockExam(activeExamId!, answers),
    onSuccess: (res) => {
      setLastResult({
        scoreOn20: res.result.scoreOn20,
        passed: res.result.passed,
        passingScore: res.result.passingScore,
      });
      toast.success(
        res.result.passed
          ? `Réussi — ${res.result.scoreOn20}/20`
          : `Score ${res.result.scoreOn20}/20`
      );
      qc.invalidateQueries({ queryKey: ['student-mock-exams'] });
      qc.invalidateQueries({ queryKey: ['student-gamification'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Échec de la soumission'),
  });

  const exams = (data?.exams || []) as ExamListItem[];
  const isExamClass = Boolean(data?.isExamClass);

  const questions = useMemo(() => {
    return (examDetail?.questions || []) as Array<{
      id: string;
      kind: string;
      prompt: string;
      options?: string[] | null;
      points: number;
    }>;
  }, [examDetail]);

  if (isLoading) {
    return <Card className="p-6 text-center text-gray-500">Chargement des examens blancs…</Card>;
  }

  if (!isExamClass) {
    return (
      <Card className="p-5 border border-amber-100 bg-amber-50/50">
        <h3 className="text-sm font-semibold text-amber-950">Examens blancs</h3>
        <p className="text-xs text-amber-900/80 mt-2 leading-relaxed">
          Cette section est réservée aux élèves des classes d’examen (<strong>3ème</strong> et{' '}
          <strong>Terminale</strong>). Votre classe actuelle n’est pas concernée.
        </p>
      </Card>
    );
  }

  if (activeExamId && examDetail) {
    return (
      <div className="space-y-4">
        <Card className="p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{examDetail.title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {examDetail.subject || 'Matière'} · {examDetail.examKind}
                {examDetail.durationMinutes ? ` · ${examDetail.durationMinutes} min` : ''}
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={() => {
              setActiveExamId(null);
              setAnswers({});
              setLastResult(null);
            }}>
              Retour
            </Button>
          </div>
          {examDetail.description && (
            <p className="text-xs text-gray-600 leading-relaxed">{examDetail.description}</p>
          )}
        </Card>

        {lastResult ? (
          <Card className="p-5 border border-violet-100 bg-violet-50/50 space-y-2">
            <div className="flex items-center gap-2">
              <FiAward className="text-violet-700" />
              <h4 className="font-semibold text-violet-950">Résultat</h4>
            </div>
            <p className="text-2xl font-bold text-violet-900">{lastResult.scoreOn20} / 20</p>
            <Badge variant={lastResult.passed ? 'success' : 'warning'}>
              {lastResult.passed
                ? `Réussi (seuil ${lastResult.passingScore}/20)`
                : `À retravailler (seuil ${lastResult.passingScore}/20)`}
            </Badge>
            <Button type="button" size="sm" onClick={() => {
              setActiveExamId(null);
              setAnswers({});
              setLastResult(null);
            }}>
              Revenir à la liste
            </Button>
          </Card>
        ) : loadingDetail ? (
          <Card className="p-6 text-center text-gray-500">Chargement du sujet…</Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q, i) => (
              <Card key={q.id} className="p-4 space-y-2">
                <p className="text-sm font-medium text-gray-900">
                  {i + 1}. {q.prompt}{' '}
                  <span className="text-xs text-gray-500">({q.points} pt)</span>
                </p>
                {q.kind === 'MCQ' || q.kind === 'TRUE_FALSE' ? (
                  <div className="space-y-1.5">
                    {(q.options || (q.kind === 'TRUE_FALSE' ? ['Vrai', 'Faux'] : [])).map((opt) => {
                      const letterMatch = String(opt).match(/^([A-D])[).:\-]\s*/i);
                      const answerValue = letterMatch ? letterMatch[1].toUpperCase() : String(opt);
                      return (
                        <label key={String(opt)} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="radio"
                            name={q.id}
                            checked={answers[q.id] === answerValue}
                            onChange={() => setAnswers({ ...answers, [q.id]: answerValue })}
                          />
                          <span>{String(opt)}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    className="w-full rounded-lg border px-3 py-2 text-sm"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="Votre réponse"
                    aria-label={`Réponse question ${i + 1}`}
                  />
                )}
              </Card>
            ))}
            <Button
              type="button"
              onClick={() => submit.mutate()}
              disabled={submit.isPending || questions.length === 0}
            >
              Soumettre l’examen blanc
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-indigo-100 bg-indigo-50/40">
        <h3 className="text-sm font-semibold text-indigo-950">Mes examens blancs</h3>
        <p className="text-xs text-indigo-900/80 mt-1 leading-relaxed">
          Entraînez-vous aux conditions de l’examen officiel (
          {data?.student?.class?.level || 'classe d’examen'}).
        </p>
      </Card>

      {exams.length === 0 ? (
        <Card className="p-6 text-center text-sm text-gray-500">
          Aucun examen blanc publié pour votre classe pour le moment.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {exams.map((exam) => (
            <Card key={exam.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-gray-900">{exam.title}</div>
                  <div className="text-xs text-gray-500">{exam.subject || '—'}</div>
                </div>
                <Badge variant={exam.examKind === 'BAC' ? 'danger' : 'warning'}>{exam.examKind}</Badge>
              </div>
              <div className="flex flex-wrap gap-3 text-[11px] text-gray-600">
                <span className="inline-flex items-center gap-1">
                  <FiClock /> {exam.durationMinutes || '—'} min
                </span>
                <span>{exam._count?.questions ?? 0} questions</span>
                <span>
                  Tentatives : {exam.mySubmittedAttempts}/{exam.maxAttempts}
                </span>
                {exam.bestScoreOn20 != null && (
                  <span className="font-semibold text-violet-800">Meilleur : {exam.bestScoreOn20}/20</span>
                )}
              </div>
              <Button
                type="button"
                size="sm"
                disabled={!exam.canRetry && exam.mySubmittedAttempts > 0}
                onClick={() => {
                  setLastResult(null);
                  setAnswers({});
                  setActiveExamId(exam.id);
                }}
              >
                {exam.mySubmittedAttempts > 0 && exam.canRetry
                  ? 'Retenter'
                  : exam.canRetry
                    ? 'Commencer'
                    : 'Terminé'}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
