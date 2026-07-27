import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import {
  FiAlertCircle,
  FiCheck,
  FiDownload,
  FiDollarSign,
  FiPlus,
  FiRefreshCw,
  FiX,
} from 'react-icons/fi';
import { adminApi } from '../../../services/api';
import { formatFCFA } from '../../../utils/currency';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Card from '../../ui/Card';

type PayrollStatus = 'DRAFT' | 'VALIDATED' | 'PAID' | 'CANCELLED';

type PayrollLine = {
  id: string;
  personKind: 'TEACHER' | 'EDUCATOR' | 'STAFF';
  displayName: string;
  employeeId: string;
  engagementKind?: string | null;
  contractType?: string | null;
  baseSalary: number;
  hoursWorked?: number | null;
  hourlyRate?: number | null;
  bonuses: number;
  deductions: number;
  netAmount: number;
  included: boolean;
  notes?: string | null;
};

type PayrollRun = {
  id: string;
  year: number;
  month: number;
  label?: string;
  status: PayrollStatus;
  totalBase: number;
  totalBonuses: number;
  totalDeductions: number;
  totalNet: number;
  lineCount: number;
  notes?: string | null;
  schoolExpenseId?: string | null;
  lines?: PayrollLine[];
};

const STATUS_LABEL: Record<PayrollStatus, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

const STATUS_VARIANT: Record<PayrollStatus, 'warning' | 'info' | 'success' | 'default'> = {
  DRAFT: 'warning',
  VALIDATED: 'info',
  PAID: 'success',
  CANCELLED: 'default',
};

const KIND_LABEL: Record<PayrollLine['personKind'], string> = {
  TEACHER: 'Enseignant',
  EDUCATOR: 'Éducateur',
  STAFF: 'Personnel',
};

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

const HRPayrollPanel: React.FC = () => {
  const qc = useQueryClient();
  const initial = currentYearMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const runsQuery = useQuery({
    queryKey: ['admin-hr-payroll-runs', year],
    queryFn: () => adminApi.getPayrollRuns({ year }),
  });

  const runQuery = useQuery({
    queryKey: ['admin-hr-payroll-run', selectedId],
    queryFn: () => adminApi.getPayrollRun(selectedId!),
    enabled: Boolean(selectedId),
  });

  const runs = (runsQuery.data as PayrollRun[] | undefined) ?? [];
  const selected = (runQuery.data as PayrollRun | undefined) ?? null;

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['admin-hr-payroll-runs'] });
    if (selectedId) {
      await qc.invalidateQueries({ queryKey: ['admin-hr-payroll-run', selectedId] });
    }
  };

  const createMut = useMutation({
    mutationFn: (force?: boolean) =>
      adminApi.createPayrollRun({ year, month, force: Boolean(force) }),
    onSuccess: async (run: PayrollRun) => {
      toast.success(`Paie ${run.label ?? `${month}/${year}`} générée`);
      setSelectedId(run.id);
      await invalidate();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Impossible de générer la paie';
      const runId = err?.response?.data?.runId as string | undefined;
      if (runId && String(msg).includes('force=true')) {
        if (window.confirm(`${msg}\n\nRégénérer le brouillon ?`)) {
          createMut.mutate(true);
        }
        return;
      }
      if (runId) setSelectedId(runId);
      toast.error(msg);
    },
  });

  const validateMut = useMutation({
    mutationFn: (id: string) => adminApi.validatePayrollRun(id),
    onSuccess: async () => {
      toast.success('Cycle validé');
      await invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Validation impossible'),
  });

  const paidMut = useMutation({
    mutationFn: (id: string) => adminApi.markPayrollRunPaid(id, { createExpense: true }),
    onSuccess: async () => {
      toast.success('Marqué comme payé (dépense comptable créée)');
      await invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Paiement impossible'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => adminApi.cancelPayrollRun(id),
    onSuccess: async () => {
      toast.success('Cycle annulé');
      await invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Annulation impossible'),
  });

  const lineMut = useMutation({
    mutationFn: (payload: {
      runId: string;
      lineId: string;
      data: {
        baseSalary?: number;
        bonuses?: number;
        deductions?: number;
        included?: boolean;
      };
    }) => adminApi.updatePayrollLine(payload.runId, payload.lineId, payload.data),
    onSuccess: async () => {
      await invalidate();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Mise à jour impossible'),
  });

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: new Date(2000, i, 1).toLocaleDateString('fr-FR', { month: 'long' }),
      })),
    []
  );

  const exportCsv = (run: PayrollRun) => {
    const lines = run.lines ?? [];
    const header = [
      'Nom',
      'Rôle',
      'Matricule',
      'Engagement',
      'Base',
      'Heures',
      'Primes',
      'Retenues',
      'Net',
      'Inclus',
      'Notes',
    ];
    const rows = lines.map((l) =>
      [
        l.displayName,
        KIND_LABEL[l.personKind],
        l.employeeId,
        l.engagementKind ?? '',
        String(l.baseSalary),
        l.hoursWorked != null ? String(l.hoursWorked) : '',
        String(l.bonuses),
        String(l.deductions),
        String(l.netAmount),
        l.included ? 'oui' : 'non',
        (l.notes ?? '').replace(/;/g, ','),
      ].join(';')
    );
    const csv = ['\ufeff' + header.join(';'), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paie_${run.year}-${String(run.month).padStart(2, '0')}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const isDraft = selected?.status === 'DRAFT';

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-amber-100 bg-amber-50/50">
        <div className="flex gap-3">
          <FiAlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">
            Générez une <strong>paie mensuelle</strong> à partir des salaires de référence (enseignants,
            éducateurs, personnel). Les vacataires avec plafond horaire sont calculés selon les heures
            pointées du mois. Workflow : <strong>Brouillon → Validé → Payé</strong> (crée une charge
            comptable « Personnel »).
          </p>
        </div>
      </Card>

      <Card className="p-4 border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div>
            <label htmlFor="payroll-year" className="block text-xs font-medium text-gray-600 mb-1">
              Année
            </label>
            <input
              id="payroll-year"
              type="number"
              className="w-28 rounded-lg border border-stone-200 px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(Number(e.target.value) || initial.year)}
            />
          </div>
          <div>
            <label htmlFor="payroll-month" className="block text-xs font-medium text-gray-600 mb-1">
              Mois
            </label>
            <select
              id="payroll-month"
              className="rounded-lg border border-stone-200 px-3 py-2 text-sm capitalize"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            onClick={() => createMut.mutate(false)}
            disabled={createMut.isPending}
            isLoading={createMut.isPending}
          >
            <FiPlus className="w-4 h-4 mr-2" />
            Générer la paie
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="overflow-hidden xl:col-span-1">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Cycles {year}</h3>
          </div>
          {runsQuery.isLoading ? (
            <div className="p-6 text-center text-gray-500 text-sm">Chargement…</div>
          ) : runs.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">Aucun cycle pour cette année.</div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-112 overflow-y-auto">
              {runs.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-stone-50 transition ${
                      selectedId === r.id ? 'bg-rose-50/70' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900 capitalize">
                        {r.label ?? `${r.month}/${r.year}`}
                      </span>
                      <Badge variant={STATUS_VARIANT[r.status]} size="sm">
                        {STATUS_LABEL[r.status]}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 tabular-nums">
                      {r.lineCount} pers. · {formatFCFA(r.totalNet)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="xl:col-span-2 space-y-4">
          {!selectedId ? (
            <Card className="p-8 text-center text-gray-500">
              Sélectionnez un cycle ou générez la paie du mois.
            </Card>
          ) : runQuery.isLoading ? (
            <Card className="p-8 text-center text-gray-500">Chargement du détail…</Card>
          ) : !selected ? (
            <Card className="p-8 text-center text-gray-500">Cycle introuvable.</Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase flex items-center gap-1">
                    <FiDollarSign className="w-4 h-4" /> Net à payer
                  </p>
                  <p className="text-xl font-bold text-gray-900 mt-1 tabular-nums">
                    {formatFCFA(selected.totalNet)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{selected.lineCount} ligne(s) incluse(s)</p>
                </Card>
                <Card className="p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase">Base + primes</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1 tabular-nums">
                    {formatFCFA(selected.totalBase + selected.totalBonuses)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Retenues : {formatFCFA(selected.totalDeductions)}
                  </p>
                </Card>
                <Card className="p-4 border border-gray-200 flex flex-col justify-center gap-2">
                  <Badge variant={STATUS_VARIANT[selected.status]} size="sm">
                    {STATUS_LABEL[selected.status]}
                  </Badge>
                  <p className="text-sm font-medium text-gray-800 capitalize">{selected.label}</p>
                </Card>
              </div>

              <Card className="p-3 border border-gray-200 flex flex-wrap gap-2">
                {isDraft && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => validateMut.mutate(selected.id)}
                    disabled={validateMut.isPending}
                    isLoading={validateMut.isPending}
                  >
                    <FiCheck className="w-4 h-4 mr-1" />
                    Valider
                  </Button>
                )}
                {selected.status === 'VALIDATED' && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Marquer la paie comme payée et enregistrer une charge de ${formatFCFA(selected.totalNet)} ?`
                        )
                      ) {
                        paidMut.mutate(selected.id);
                      }
                    }}
                    disabled={paidMut.isPending}
                    isLoading={paidMut.isPending}
                  >
                    <FiDollarSign className="w-4 h-4 mr-1" />
                    Marquer payé
                  </Button>
                )}
                {(selected.status === 'DRAFT' || selected.status === 'VALIDATED') && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Annuler ce cycle de paie ?')) {
                        cancelMut.mutate(selected.id);
                      }
                    }}
                    disabled={cancelMut.isPending}
                  >
                    <FiX className="w-4 h-4 mr-1" />
                    Annuler
                  </Button>
                )}
                {isDraft && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => createMut.mutate(true)}
                    disabled={createMut.isPending}
                  >
                    <FiRefreshCw className="w-4 h-4 mr-1" />
                    Régénérer
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => exportCsv(selected)}
                  disabled={!selected.lines?.length}
                >
                  <FiDownload className="w-4 h-4 mr-1" />
                  Export CSV
                </Button>
              </Card>

              <Card className="overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Détail par personne</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-600">
                        <th className="py-2 px-3 font-semibold">Nom</th>
                        <th className="py-2 px-3 font-semibold">Rôle</th>
                        <th className="py-2 px-3 font-semibold text-right">Base</th>
                        <th className="py-2 px-3 font-semibold text-right">Primes</th>
                        <th className="py-2 px-3 font-semibold text-right">Retenues</th>
                        <th className="py-2 px-3 font-semibold text-right">Net</th>
                        <th className="py-2 px-3 font-semibold text-center">Inclus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.lines ?? []).map((l) => (
                        <tr
                          key={l.id}
                          className={`border-b border-gray-100 ${!l.included ? 'opacity-50' : ''}`}
                        >
                          <td className="py-2 px-3">
                            <div className="font-medium text-gray-900">{l.displayName}</div>
                            <div className="text-[11px] text-gray-500">
                              {l.employeeId}
                              {l.hoursWorked != null ? ` · ${l.hoursWorked} h` : ''}
                              {l.notes ? ` · ${l.notes}` : ''}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-gray-600">
                            {KIND_LABEL[l.personKind]}
                            {l.engagementKind === 'VACATAIRE' ? ' (vac.)' : ''}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isDraft ? (
                              <input
                                type="number"
                                min={0}
                                className="w-24 rounded border border-stone-200 px-2 py-1 text-right tabular-nums"
                                defaultValue={l.baseSalary}
                                key={`base-${l.id}-${l.baseSalary}`}
                                onBlur={(e) => {
                                  const v = Math.round(Number(e.target.value));
                                  if (!Number.isFinite(v) || v === l.baseSalary) return;
                                  lineMut.mutate({
                                    runId: selected.id,
                                    lineId: l.id,
                                    data: { baseSalary: v },
                                  });
                                }}
                              />
                            ) : (
                              <span className="tabular-nums">{formatFCFA(l.baseSalary)}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isDraft ? (
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded border border-stone-200 px-2 py-1 text-right tabular-nums"
                                defaultValue={l.bonuses}
                                key={`bon-${l.id}-${l.bonuses}`}
                                onBlur={(e) => {
                                  const v = Math.round(Number(e.target.value));
                                  if (!Number.isFinite(v) || v === l.bonuses) return;
                                  lineMut.mutate({
                                    runId: selected.id,
                                    lineId: l.id,
                                    data: { bonuses: v },
                                  });
                                }}
                              />
                            ) : (
                              <span className="tabular-nums">{formatFCFA(l.bonuses)}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right">
                            {isDraft ? (
                              <input
                                type="number"
                                min={0}
                                className="w-20 rounded border border-stone-200 px-2 py-1 text-right tabular-nums"
                                defaultValue={l.deductions}
                                key={`ded-${l.id}-${l.deductions}`}
                                onBlur={(e) => {
                                  const v = Math.round(Number(e.target.value));
                                  if (!Number.isFinite(v) || v === l.deductions) return;
                                  lineMut.mutate({
                                    runId: selected.id,
                                    lineId: l.id,
                                    data: { deductions: v },
                                  });
                                }}
                              />
                            ) : (
                              <span className="tabular-nums">{formatFCFA(l.deductions)}</span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold tabular-nums">
                            {formatFCFA(l.netAmount)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={l.included}
                              disabled={!isDraft || lineMut.isPending}
                              onChange={(e) =>
                                lineMut.mutate({
                                  runId: selected.id,
                                  lineId: l.id,
                                  data: { included: e.target.checked },
                                })
                              }
                              aria-label={`Inclure ${l.displayName}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HRPayrollPanel;
