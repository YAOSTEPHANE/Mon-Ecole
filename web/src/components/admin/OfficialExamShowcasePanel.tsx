'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiAward, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { adminApi } from '../../services/api';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import { ADM } from './adminModuleLayout';

type ExamKind = 'CEPE' | 'BEPC' | 'BAC' | 'OTHER';

type ExamStat = {
  id: string;
  examKind: ExamKind | string;
  examLabel: string;
  academicYear: string;
  candidates: number | null;
  admitted: number | null;
  passRate: number;
  displayOrder: number;
  isPublished: boolean;
};

type HonorPreview = {
  academicYear: string;
  period: string;
  periodLabel: string;
  students: Array<{
    classId: string;
    className: string;
    classLevel: string;
    firstName: string;
    lastName: string;
    average: number;
    photoUrl: string | null;
    isPlaceholder?: boolean;
  }>;
};

const KIND_OPTIONS: Array<{ value: ExamKind; label: string }> = [
  { value: 'CEPE', label: 'CEPE' },
  { value: 'BEPC', label: 'BEPC' },
  { value: 'BAC', label: 'Baccalauréat' },
  { value: 'OTHER', label: 'Autre examen' },
];

const PERIOD_OPTIONS = [
  { value: '', label: 'Dernière période publiée' },
  { value: 'trim1', label: 'Trimestre 1' },
  { value: 'trim2', label: 'Trimestre 2' },
  { value: 'trim3', label: 'Trimestre 3' },
];

export default function OfficialExamShowcasePanel() {
  const qc = useQueryClient();
  const defaultYear = getCurrentAcademicYear();
  const [year, setYear] = useState(defaultYear);
  const [examKind, setExamKind] = useState<ExamKind>('BEPC');
  const [examLabel, setExamLabel] = useState('BEPC');
  const [candidates, setCandidates] = useState('');
  const [admitted, setAdmitted] = useState('');
  const [passRate, setPassRate] = useState('');
  const [isPublished, setIsPublished] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-official-exam-stats', year],
    queryFn: () => adminApi.getOfficialExamStats({ academicYear: year }),
  });

  const stats = (data?.stats || []) as ExamStat[];
  const honor = data?.honorRoll as
    | { enabled: boolean; academicYear: string; period: string | null; preview: HonorPreview | null }
    | undefined;
  const computedRate = useMemo(() => {
    const c = Number(candidates);
    const a = Number(admitted);
    if (!Number.isFinite(c) || !Number.isFinite(a) || c <= 0) return null;
    return Math.round((Math.min(a, c) / c) * 1000) / 10;
  }, [candidates, admitted]);

  const createStat = useMutation({
    mutationFn: () =>
      adminApi.createOfficialExamStat({
        examKind,
        examLabel,
        academicYear: year,
        candidates: candidates === '' ? null : Number(candidates),
        admitted: admitted === '' ? null : Number(admitted),
        passRate: passRate === '' ? computedRate : Number(passRate.replace(',', '.')),
        isPublished,
      }),
    onSuccess: () => {
      toast.success('Taux d’admission enregistré');
      void qc.invalidateQueries({ queryKey: ['admin-official-exam-stats'] });
      setCandidates('');
      setAdmitted('');
      setPassRate('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg || 'Impossible d’enregistrer');
    },
  });

  const patchStat = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      adminApi.updateOfficialExamStat(id, data),
    onSuccess: () => {
      toast.success('Mis à jour');
      void qc.invalidateQueries({ queryKey: ['admin-official-exam-stats'] });
    },
    onError: () => toast.error('Mise à jour impossible'),
  });

  const removeStat = useMutation({
    mutationFn: (id: string) => adminApi.deleteOfficialExamStat(id),
    onSuccess: () => {
      toast.success('Supprimé');
      void qc.invalidateQueries({ queryKey: ['admin-official-exam-stats'] });
    },
    onError: () => toast.error('Suppression impossible'),
  });

  const saveHonor = useMutation({
    mutationFn: (payload: { enabled?: boolean; academicYear?: string | null; period?: string | null }) =>
      adminApi.updateHonorRollSettings(payload),
    onSuccess: () => {
      toast.success('Palmarès mis à jour');
      void qc.invalidateQueries({ queryKey: ['admin-official-exam-stats'] });
    },
    onError: () => toast.error('Impossible d’enregistrer le palmarès'),
  });

  return (
    <div className="space-y-6">
      <div className={ADM.modulePanel}>
        <div className={ADM.modulePanelBody}>
          <h3 className="font-display text-sm font-bold text-stone-900">
            Taux d’admission (page d’accueil)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Saisissez les pourcentages officiels (CEPE, BEPC, BAC…). Seuls les résultats cochés
            « publié » apparaissent sur la page publique.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-xs font-semibold text-stone-700">
              Année scolaire
              <input
                className="mt-1.5 w-full rounded-xl border border-[#e4e8f2] px-3 py-2.5 text-sm"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025-2026"
              />
            </label>
            <label className="block text-xs font-semibold text-stone-700">
              Examen
              <select
                className="mt-1.5 w-full rounded-xl border border-[#e4e8f2] px-3 py-2.5 text-sm"
                value={examKind}
                onChange={(e) => {
                  const next = e.target.value as ExamKind;
                  setExamKind(next);
                  if (next !== 'OTHER') {
                    setExamLabel(KIND_OPTIONS.find((k) => k.value === next)?.label || next);
                  }
                }}
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </label>
            <Input
              label="Libellé affiché"
              value={examLabel}
              onChange={(e) => setExamLabel(e.target.value)}
            />
            <label className="flex items-end gap-2 pb-2 text-xs font-semibold text-stone-700">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              Publier sur l’accueil
            </label>
            <Input
              label="Candidats"
              type="number"
              min={0}
              value={candidates}
              onChange={(e) => setCandidates(e.target.value)}
            />
            <Input
              label="Admis"
              type="number"
              min={0}
              value={admitted}
              onChange={(e) => setAdmitted(e.target.value)}
            />
            <Input
              label={computedRate != null ? `Taux % (calculé ${computedRate})` : 'Taux %'}
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={passRate}
              onChange={(e) => setPassRate(e.target.value)}
              placeholder={computedRate != null ? String(computedRate) : 'ex. 87.5'}
            />
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full"
                isLoading={createStat.isPending}
                onClick={() => createStat.mutate()}
              >
                <FiPlus className="mr-1.5 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            {isLoading ? (
              <p className="text-xs text-stone-500">Chargement…</p>
            ) : stats.length === 0 ? (
              <p className="text-xs text-stone-500">Aucun taux saisi pour {year}.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 text-left text-[11px] uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-3">Examen</th>
                    <th className="py-2 pr-3">Candidats</th>
                    <th className="py-2 pr-3">Admis</th>
                    <th className="py-2 pr-3">Taux</th>
                    <th className="py-2 pr-3">Accueil</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {stats.map((row) => (
                    <tr key={row.id} className="border-b border-stone-50">
                      <td className="py-2.5 pr-3 font-medium text-stone-900">{row.examLabel}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.candidates ?? '—'}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{row.admitted ?? '—'}</td>
                      <td className="py-2.5 pr-3 font-sans font-extrabold tabular-nums tracking-tight text-tran-mauve-900">
                        {row.passRate.toLocaleString('fr-FR')} %
                      </td>
                      <td className="py-2.5 pr-3">
                        <button
                          type="button"
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            row.isPublished
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-stone-100 text-stone-500'
                          }`}
                          onClick={() =>
                            patchStat.mutate({ id: row.id, data: { isPublished: !row.isPublished } })
                          }
                        >
                          {row.isPublished ? 'Publié' : 'Masqué'}
                        </button>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Supprimer ${row.examLabel}`}
                          onClick={() => {
                            if (window.confirm(`Supprimer ${row.examLabel} ?`)) {
                              removeStat.mutate(row.id);
                            }
                          }}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className={ADM.modulePanel}>
        <div className={ADM.modulePanelBody}>
          <h3 className="inline-flex items-center gap-2 font-display text-sm font-bold text-stone-900">
            <FiAward className="h-4 w-4 text-tran-mustard-700" />
            Palmarès (meilleurs de chaque niveau)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-stone-500">
            Un 1er par niveau (6ᵉ à Terminale). Tant qu’aucun bulletin publié n’existe pour un niveau,
            un élève d’exemple s’affiche (à remplacer). La photo réelle n’apparaît que si le
            consentement « Publication d’images » est accordé.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
              <input
                type="checkbox"
                checked={honor?.enabled ?? true}
                onChange={(e) =>
                  saveHonor.mutate({
                    enabled: e.target.checked,
                    academicYear: year,
                    period: honor?.period ?? null,
                  })
                }
              />
              Publier le palmarès sur l’accueil
            </label>
              <label className="block min-w-48 text-xs font-semibold text-stone-700">
              Période
              <select
                className="mt-1.5 w-full rounded-xl border border-[#e4e8f2] px-3 py-2.5 text-sm"
                value={honor?.period ?? ''}
                onChange={(e) =>
                  saveHonor.mutate({
                    enabled: honor?.enabled,
                    academicYear: year,
                    period: e.target.value || null,
                  })
                }
              >
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value || 'auto'} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {(honor?.preview?.students || []).length === 0 ? (
              <p className="text-xs text-stone-500 sm:col-span-2">
                Aucun bulletin publié pour constituer le palmarès. Publiez les bulletins (avec rang)
                dans Notation, puis actualisez.
              </p>
            ) : (
              honor?.preview?.students.map((s) => (
                <div key={s.classId} className="flex flex-col items-center gap-3 text-center">
                  <div className="h-28 w-28 overflow-hidden rounded-full bg-stone-200 shadow-sm">
                    {s.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.photoUrl}
                        alt=""
                        className="h-full w-full object-cover object-[center_18%]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-tran-mauve-900 text-sm font-bold text-white">
                        {s.firstName.charAt(0)}
                        {s.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-900">
                      {s.firstName} {s.lastName}
                    </p>
                    <p className="mt-1 text-[11px] text-stone-600">Classe · {s.className}</p>
                    <p className="text-[11px] text-stone-600">Niveau · {s.classLevel}</p>
                    <p className="mt-1 text-xs font-bold tabular-nums text-tran-mustard-800">
                      {s.average.toFixed(2)}/20
                      {s.isPlaceholder ? ' · exemple' : ''}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
