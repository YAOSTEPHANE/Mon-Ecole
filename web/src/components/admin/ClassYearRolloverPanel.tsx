'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiCopy, FiRefreshCw } from 'react-icons/fi';
import { adminApi } from '../../services/api';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import Card from '../ui/Card';
import Button from '../ui/Button';

function nextYear(academicYear: string): string {
  const start = Number(academicYear.split('-')[0]);
  if (!Number.isFinite(start)) return academicYear;
  return `${start + 1}-${start + 2}`;
}

export default function ClassYearRolloverPanel() {
  const qc = useQueryClient();
  const [fromYear, setFromYear] = useState(getCurrentAcademicYear());
  const toYear = nextYear(fromYear);
  const [copyTeachers, setCopyTeachers] = useState(false);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['class-year-rollover-preview', fromYear, toYear],
    queryFn: () =>
      adminApi.previewClassYearRollover({
        fromAcademicYear: fromYear,
        toAcademicYear: toYear,
      }),
  });

  const applyMut = useMutation({
    mutationFn: () =>
      adminApi.applyClassYearRollover({
        fromAcademicYear: fromYear,
        toAcademicYear: toYear,
        copyTeacherAssignments: copyTeachers,
      }),
    onSuccess: (res: { message?: string }) => {
      toast.success(res.message || 'Classes clonées');
      qc.invalidateQueries({ queryKey: ['classes'] });
      qc.invalidateQueries({ queryKey: ['admin-classes'] });
      qc.invalidateQueries({ queryKey: ['class-year-rollover-preview'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Rollover impossible');
    },
  });

  return (
    <Card className="border border-violet-100 bg-violet-50/30 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 flex items-center gap-2">
            <FiCopy className="h-4 w-4 text-violet-700" />
            Rollover année scolaire
          </h3>
          <p className="mt-1 text-xs text-stone-600 leading-relaxed max-w-xl">
            Clone les classes de {fromYear} vers {toYear} (même nom, niveau, capacité). Nécessaire
            avant les réinscriptions Admis → niveau suivant / Doublant → même niveau.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={fromYear}
            onChange={(e) => setFromYear(e.target.value)}
            className="rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs"
          >
            {['2024-2025', '2025-2026', '2026-2027'].map((y) => (
              <option key={y} value={y}>
                Depuis {y}
              </option>
            ))}
          </select>
          <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
            <FiRefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Aperçu
          </Button>
          <Button
            size="sm"
            disabled={applyMut.isPending || !data?.toCreate}
            onClick={() => {
              if (
                !window.confirm(
                  `Créer ${data?.toCreate ?? 0} classe(s) pour ${toYear} ? (${data?.alreadyExists ?? 0} déjà présentes seront ignorées.)`,
                )
              ) {
                return;
              }
              applyMut.mutate();
            }}
          >
            {applyMut.isPending ? 'Création…' : `Créer ${data?.toCreate ?? 0} classe(s)`}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-700">
        <span>
          À créer : <strong className="tabular-nums">{data?.toCreate ?? '—'}</strong>
        </span>
        <span>
          Déjà présentes : <strong className="tabular-nums">{data?.alreadyExists ?? '—'}</strong>
        </span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={copyTeachers}
            onChange={(e) => setCopyTeachers(e.target.checked)}
          />
          Copier les professeurs principaux
        </label>
      </div>
    </Card>
  );
}
