'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Card from '../ui/Card';
import { FiBookOpen, FiFilter } from 'react-icons/fi';

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
  const [courseFilter, setCourseFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [q, setQ] = useState('');

  const { data: logs = [], isLoading } = useQuery({
    queryKey,
    queryFn,
  });

  const courseOptions = useMemo(() => {
    const names = new Set<string>();
    for (const log of logs) {
      if (log.courseName?.trim()) names.add(log.courseName.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      if (courseFilter && (log.courseName || '') !== courseFilter) return false;
      const d = new Date(log.lessonDate);
      if (fromDate) {
        const from = new Date(fromDate);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (toDate) {
        const to = new Date(toDate);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        const hay = `${log.title || ''} ${log.content} ${log.objectives || ''} ${log.homeworkNotes || ''} ${log.courseName || ''} ${log.teacherName || ''}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [logs, courseFilter, fromDate, toDate, q]);

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
          Séances publiées — filtrez par matière, période ou mot-clé.
        </p>
      </div>

      <Card className="space-y-2 p-3 sm:p-4">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
          <FiFilter className="h-3.5 w-3.5" />
          Filtres ({filtered.length}/{logs.length})
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label="Filtrer par matière"
          >
            <option value="">Toutes les matières</option>
            {courseOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Du"
          />
          <input
            type="date"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="Au"
          />
          <input
            type="search"
            className="rounded-lg border border-stone-200 px-3 py-2 text-sm"
            placeholder="Rechercher…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Recherche dans le cahier"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
            onClick={() => {
              const today = new Date();
              const iso = today.toISOString().slice(0, 10);
              setFromDate(iso);
              setToDate(iso);
            }}
          >
            Aujourd’hui
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
            onClick={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(from.getDate() - 6);
              setFromDate(from.toISOString().slice(0, 10));
              setToDate(to.toISOString().slice(0, 10));
            }}
          >
            7 jours
          </button>
          <button
            type="button"
            className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-[11px] font-semibold text-stone-700 hover:bg-stone-50"
            onClick={() => {
              setFromDate('');
              setToDate('');
              setCourseFilter('');
              setQ('');
            }}
          >
            Réinitialiser
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-6 text-center text-sm text-stone-500">
          Aucune séance ne correspond aux filtres.
        </Card>
      ) : (
        filtered.map((log) => (
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
        ))
      )}
    </div>
  );
}
