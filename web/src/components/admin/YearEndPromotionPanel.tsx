'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiAward, FiAlertTriangle, FiCheck, FiDownload, FiUsers } from 'react-icons/fi';
import { adminApi } from '../../services/api';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FilterDropdown from '../ui/FilterDropdown';
import { ADM } from './adminModuleLayout';

type PreviewRow = {
  studentId: string;
  studentCode: string;
  firstName: string;
  lastName: string;
  average: number;
  rankInClass: number;
  gradeCount: number;
  decision: 'ADMIS' | 'DOUBLANT' | 'SANS_NOTES';
  previousDecision?: 'ADMIS' | 'DOUBLANT' | null;
};

type ClassGroup = {
  classId: string;
  className: string;
  classLevel: string | null;
  admis: PreviewRow[];
  doublants: PreviewRow[];
  sansNotes: PreviewRow[];
  stats: { total: number; admis: number; doublants: number; sansNotes: number };
};

type PreviewResponse = {
  academicYear: string;
  period: string;
  periodLabel: string;
  threshold: number;
  groups: ClassGroup[];
  totals: { total: number; admis: number; doublants: number; sansNotes: number };
};

const YEARS = ['2024-2025', '2025-2026', '2026-2027'];

function exportCsv(data: PreviewResponse) {
  const lines = [
    ['Classe', 'Niveau', 'Rang', 'Élève', 'Matricule', 'Moyenne', 'Notes', 'Décision'].join(';'),
  ];
  for (const g of data.groups) {
    const all = [...g.admis, ...g.doublants, ...g.sansNotes];
    for (const r of all) {
      lines.push(
        [
          `"${g.className}"`,
          `"${g.classLevel || ''}"`,
          r.rankInClass || '',
          `"${r.lastName} ${r.firstName}"`,
          r.studentCode,
          r.average.toFixed(2).replace('.', ','),
          r.gradeCount,
          r.decision,
        ].join(';')
      );
    }
  }
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `decisions_${data.period}_${data.academicYear}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const YearEndPromotionPanel: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const qc = useQueryClient();
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [classId, setClassId] = useState('');
  const [threshold, setThreshold] = useState('10');
  const [notifyParents, setNotifyParents] = useState(false);
  const [includeSansNotes, setIncludeSansNotes] = useState(false);

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const thresholdNum = Number(threshold);
  const safeThreshold = Number.isFinite(thresholdNum) ? thresholdNum : 10;

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['promotion-decisions', academicYear, classId, safeThreshold],
    queryFn: () =>
      adminApi.getPromotionDecisions({
        academicYear,
        period: 'trim3',
        classId: classId || undefined,
        threshold: safeThreshold,
      }) as Promise<PreviewResponse>,
  });

  const declareMut = useMutation({
    mutationFn: () =>
      adminApi.declarePromotionDecisions({
        academicYear,
        period: 'trim3',
        classId: classId || undefined,
        threshold: safeThreshold,
        notifyParents,
        includeSansNotesAsDoublant: includeSansNotes,
      }),
    onSuccess: (res: { message?: string; admis?: number; doublants?: number }) => {
      toast.success(res.message || 'Décisions enregistrées');
      qc.invalidateQueries({ queryKey: ['promotion-decisions'] });
      qc.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur lors de la déclaration'),
  });

  const totals = data?.totals;
  const groups = data?.groups ?? [];

  const confirmLabel = useMemo(() => {
    if (!totals) return 'Déclarer Admis / Doublant';
    return `Déclarer ${totals.admis} admis et ${totals.doublants} doublant(s)`;
  }, [totals]);

  return (
    <div className={compact ? ADM.root : 'space-y-4'}>
      <Card className="p-4 border border-emerald-100 bg-emerald-50/30">
        <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
          <FiAward className="h-5 w-5 text-emerald-700" />
          Passage / redoublement — 3ᵉ trimestre
        </h3>
        <p className="mt-1 text-sm text-stone-600 leading-relaxed">
          Calcule les moyennes du <strong>3ᵉ trimestre</strong>, trie les élèves par classe (moyenne
          décroissante), puis déclare <strong>Admis</strong> (≥ {safeThreshold}/20) et{' '}
          <strong>Doublant</strong> (&lt; {safeThreshold}/20). Met à jour le statut « redoublant » de
          l’élève.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <span className="block text-xs font-medium text-stone-700 mb-1">Année scolaire</span>
            <FilterDropdown
              variant="field"
              label="Année"
              value={academicYear}
              onChange={setAcademicYear}
              options={YEARS.map((y) => ({ value: y, label: y }))}
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-stone-700 mb-1">Classe (optionnel)</span>
            <FilterDropdown
              variant="field"
              label="Classe"
              value={classId}
              onChange={setClassId}
              options={[
                { value: '', label: 'Toutes les classes' },
                ...(classes as Array<{ id: string; name: string; level?: string }>).map((c) => ({
                  value: c.id,
                  label: `${c.name}${c.level ? ` (${c.level})` : ''}`,
                })),
              ]}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Seuil d’admission</label>
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="w-full rounded-xl border-2 border-stone-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex flex-col justify-end gap-2">
            <Button size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
              Recalculer
            </Button>
            {data && (
              <Button size="sm" variant="secondary" onClick={() => exportCsv(data)}>
                <FiDownload className="mr-1.5 h-3.5 w-3.5" />
                CSV
              </Button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-700">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyParents}
              onChange={(e) => setNotifyParents(e.target.checked)}
            />
            Notifier les parents à la déclaration
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={includeSansNotes}
              onChange={(e) => setIncludeSansNotes(e.target.checked)}
            />
            Traiter les élèves sans notes comme doublants
          </label>
        </div>
      </Card>

      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-3">
            <p className="text-[10px] uppercase text-stone-500 font-medium">Élèves</p>
            <p className="text-xl font-bold tabular-nums">{totals.total}</p>
          </Card>
          <Card className="p-3 border-emerald-100 bg-emerald-50/50">
            <p className="text-[10px] uppercase text-emerald-800 font-medium">Admis</p>
            <p className="text-xl font-bold tabular-nums text-emerald-900">{totals.admis}</p>
          </Card>
          <Card className="p-3 border-rose-100 bg-rose-50/50">
            <p className="text-[10px] uppercase text-rose-800 font-medium">Doublants</p>
            <p className="text-xl font-bold tabular-nums text-rose-900">{totals.doublants}</p>
          </Card>
          <Card className="p-3 border-amber-100 bg-amber-50/40">
            <p className="text-[10px] uppercase text-amber-800 font-medium">Sans notes</p>
            <p className="text-xl font-bold tabular-nums text-amber-900">{totals.sansNotes}</p>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            if (
              !window.confirm(
                `Confirmer la déclaration officielle ?\nAdmis ≥ ${safeThreshold}/20, Doublant < ${safeThreshold}/20.`
              )
            ) {
              return;
            }
            declareMut.mutate();
          }}
          disabled={declareMut.isPending || !totals || totals.admis + totals.doublants === 0}
        >
          <FiCheck className="mr-1.5 h-4 w-4" />
          {declareMut.isPending ? 'Déclaration…' : confirmLabel}
        </Button>
        <p className="text-xs text-stone-500">
          Période : {data?.periodLabel || 'Trimestre 3'} · année {academicYear}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Calcul des moyennes T3…</p>
      ) : groups.length === 0 ? (
        <Card className="p-6 text-center text-sm text-stone-500">
          Aucune classe / élève pour cette année. Vérifiez l’année scolaire et les notes du 3ᵉ
          trimestre.
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <Card key={g.classId} className="p-4 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h4 className="font-semibold text-stone-900 flex items-center gap-2">
                  <FiUsers className="h-4 w-4 text-violet-600" />
                  {g.className}
                  {g.classLevel ? (
                    <span className="text-sm font-normal text-stone-500">· {g.classLevel}</span>
                  ) : null}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="success">{g.stats.admis} admis</Badge>
                  <Badge variant="danger">{g.stats.doublants} doublant(s)</Badge>
                  {g.stats.sansNotes > 0 && (
                    <Badge variant="warning">{g.stats.sansNotes} sans notes</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-emerald-800 mb-1.5">
                    Admis (≥ {safeThreshold})
                  </p>
                  {g.admis.length === 0 ? (
                    <p className="text-xs text-stone-500">Aucun</p>
                  ) : (
                    <ul className="max-h-56 overflow-y-auto divide-y divide-emerald-50 rounded-lg border border-emerald-100">
                      {g.admis.map((r) => (
                        <li
                          key={r.studentId}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs"
                        >
                          <span>
                            <span className="text-stone-400 tabular-nums mr-1.5">#{r.rankInClass}</span>
                            {r.lastName} {r.firstName}
                          </span>
                          <span className="font-semibold tabular-nums text-emerald-800">
                            {r.average.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-rose-800 mb-1.5 flex items-center gap-1">
                    <FiAlertTriangle className="h-3 w-3" />
                    Doublants (&lt; {safeThreshold})
                  </p>
                  {g.doublants.length === 0 ? (
                    <p className="text-xs text-stone-500">Aucun</p>
                  ) : (
                    <ul className="max-h-56 overflow-y-auto divide-y divide-rose-50 rounded-lg border border-rose-100">
                      {g.doublants.map((r) => (
                        <li
                          key={r.studentId}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs"
                        >
                          <span>
                            <span className="text-stone-400 tabular-nums mr-1.5">#{r.rankInClass}</span>
                            {r.lastName} {r.firstName}
                          </span>
                          <span className="font-semibold tabular-nums text-rose-800">
                            {r.average.toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {g.sansNotes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-amber-800 mb-1.5">
                    Sans notes T3 (non déclarés automatiquement)
                  </p>
                  <p className="text-[11px] text-stone-500 mb-1">
                    {g.sansNotes.map((r) => `${r.lastName} ${r.firstName}`).join(' · ')}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default YearEndPromotionPanel;
