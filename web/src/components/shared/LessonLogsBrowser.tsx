'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '../ui/Card';
import { FiBookOpen } from 'react-icons/fi';

export type LessonLogRow = {
  id: string;
  lessonDate: string;
  title?: string | null;
  content: string;
  objectives?: string | null;
  homeworkNotes?: string | null;
  courseName?: string | null;
  teacherName?: string | null;
};

type LessonLogsBrowserProps = {
  queryKey: unknown[];
  queryFn: () => Promise<LessonLogRow[]>;
  emptyHint?: string;
};

export default function LessonLogsBrowser({
  queryKey,
  queryFn,
  emptyHint = 'Aucune séance publiée pour le moment.',
}: LessonLogsBrowserProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  if (isLoading) {
    return (
      <Card className="p-8 text-center text-stone-500">
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-amber-600" />
        Chargement du cahier de texte…
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-8 text-center text-stone-500">
        <FiBookOpen className="mx-auto mb-3 h-8 w-8 text-stone-300" />
        <p className="text-sm">{emptyHint}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
        <h3 className="font-display text-sm font-bold text-stone-900">Cahier de texte</h3>
        <p className="mt-0.5 text-xs text-stone-600">
          Séances publiées par les enseignants — contenu, objectifs et devoirs indiqués.
        </p>
      </div>
      {logs.map((log) => (
        <Card key={log.id} className="space-y-2 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-stone-900">
              {log.title?.trim() || 'Séance de cours'}
              {log.courseName ? (
                <span className="ml-2 text-sm font-normal text-stone-500">{log.courseName}</span>
              ) : null}
            </p>
            <time className="text-xs font-medium text-stone-500">
              {format(new Date(log.lessonDate), 'EEEE d MMMM yyyy', { locale: fr })}
            </time>
          </div>
          {log.teacherName ? (
            <p className="text-xs text-stone-500">Enseignant·e : {log.teacherName}</p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">{log.content}</p>
          {log.objectives?.trim() ? (
            <p className="text-xs text-stone-600">
              <span className="font-semibold">Objectifs :</span> {log.objectives}
            </p>
          ) : null}
          {log.homeworkNotes?.trim() ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-950">
              <span className="font-semibold">Devoirs :</span> {log.homeworkNotes}
            </p>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
