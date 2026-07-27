'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  FiArchive,
  FiDownload,
  FiDollarSign,
  FiPlus,
  FiTrash2,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi';
import { adminAccountingApi } from '../../services/api/admin-accounting.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import FilterDropdown from '../ui/FilterDropdown';
import { formatFCFA } from '../../utils/currency';
import {
  downloadCashMovementsCsv,
  MOVEMENT_KIND_LABEL,
  REGISTER_TYPE_LABEL,
  type CashOverview,
  type CashRegisterRow,
  type CashRegisterType,
} from '@/lib/cashManagement';

function monthStartIso(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split('T')[0] ?? '';
}

function todayIso(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

const AccountingCashManagementSection = () => {
  const qc = useQueryClient();
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(todayIso);
  const [registerFilter, setRegisterFilter] = useState('all');

  const periodParams = useMemo(() => {
    const p: { from?: string; to?: string; registerId?: string } = {};
    if (from) p.from = `${from}T00:00:00.000Z`;
    if (to) p.to = `${to}T23:59:59.999Z`;
    if (registerFilter !== 'all') p.registerId = registerFilter;
    return p;
  }, [from, to, registerFilter]);

  const { data: overview, isLoading } = useQuery({
    queryKey: ['admin-cash-overview', periodParams],
    queryFn: () => adminAccountingApi.getCashOverview(periodParams) as Promise<CashOverview>,
  });

  const { data: registers = [] } = useQuery({
    queryKey: ['admin-cash-registers'],
    queryFn: adminAccountingApi.getCashRegisters as () => Promise<CashRegisterRow[]>,
  });

  const physicalRegisters = useMemo(
    () => (overview?.registers ?? []).filter((r) => !r.isVirtual),
    [overview?.registers],
  );

  const registerOptions = useMemo(
    () => [
      { value: 'all', label: 'Toutes les caisses' },
      ...(overview?.registers ?? []).map((r) => ({
        value: r.id,
        label: r.isVirtual ? `${r.name} (auto)` : r.name,
      })),
    ],
    [overview?.registers],
  );

  const [regForm, setRegForm] = useState({
    code: '',
    name: '',
    type: 'PETTY' as CashRegisterType,
    description: '',
    openingFloat: '',
  });

  const createRegister = useMutation({
    mutationFn: () =>
      adminAccountingApi.createCashRegister({
        ...regForm,
        openingFloat: regForm.openingFloat ? parseFloat(regForm.openingFloat) : 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-registers'] });
      qc.invalidateQueries({ queryKey: ['admin-cash-overview'] });
      toast.success('Caisse créée');
      setRegForm({ code: '', name: '', type: 'PETTY', description: '', openingFloat: '' });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const deactivateRegister = useMutation({
    mutationFn: (id: string) => adminAccountingApi.updateCashRegister(id, { isActive: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-registers'] });
      qc.invalidateQueries({ queryKey: ['admin-cash-overview'] });
      toast.success('Caisse désactivée');
    },
  });

  const [mvForm, setMvForm] = useState({
    movementDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'IN' as 'IN' | 'OUT',
    amount: '',
    reason: '',
    reference: '',
    cashRegisterId: '',
  });

  const createMovement = useMutation({
    mutationFn: () =>
      adminAccountingApi.createPettyCashMovement({
        ...mvForm,
        amount: parseFloat(mvForm.amount),
        cashRegisterId: mvForm.cashRegisterId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-overview'] });
      qc.invalidateQueries({ queryKey: ['admin-petty-cash'] });
      qc.invalidateQueries({ queryKey: ['admin-petty-balance'] });
      qc.invalidateQueries({ queryKey: ['admin-accounting-summary'] });
      toast.success('Mouvement enregistré');
      setMvForm((f) => ({ ...f, amount: '', reason: '', reference: '' }));
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const delMovement = useMutation({
    mutationFn: adminAccountingApi.deletePettyCashMovement,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-cash-overview'] });
      toast.success('Mouvement supprimé');
    },
  });

  const consolidated = overview?.consolidated;
  const movements = overview?.movements ?? [];

  const handleExport = () => {
    if (movements.length === 0) {
      toast.error('Aucun mouvement à exporter');
      return;
    }
    downloadCashMovementsCsv(movements, `mouvements-caisses-${from}-${to}.csv`);
    toast.success('Export CSV');
  };

  const activePhysicalForSelect = registers.filter((r) => r.isActive);

  if (isLoading && !overview) {
    return (
      <Card className="border border-stone-200 p-4">
        <p className="text-sm text-stone-500">Chargement des caisses…</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FiArchive className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-stone-900">Gestion des caisses</h3>
            <p className="text-xs text-stone-500">
              Caisses physiques, mouvements entrée/sortie et encaissements guichet (espèces & mobile money).
            </p>
          </div>
        </div>
        <Button type="button" size="sm" variant="secondary" onClick={handleExport} disabled={movements.length === 0}>
          <FiDownload className="mr-1 inline h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card className="flex flex-wrap items-end gap-3 border border-stone-200 p-3">
        <Input label="Du" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Au" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <FilterDropdown
          label="Caisse"
          value={registerFilter}
          onChange={setRegisterFilter}
          options={registerOptions}
          className="min-w-48"
        />
      </Card>

      {consolidated && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-indigo-100 bg-indigo-50/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-indigo-900">Solde caisses physiques</p>
            <p className="mt-1 text-lg font-bold text-indigo-950 tabular-nums">
              {formatFCFA(consolidated.totalPhysicalBalance)}
            </p>
            <p className="text-[10px] text-indigo-800/80">{consolidated.registerCount} caisse(s)</p>
          </Card>
          <Card className="border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-emerald-900">
              <FiTrendingUp className="h-3 w-3" aria-hidden />
              Entrées période
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-950 tabular-nums">{formatFCFA(consolidated.periodIn)}</p>
            <p className="text-[10px] text-emerald-800/80">
              dont guichet {formatFCFA(consolidated.counterCollections)}
            </p>
          </Card>
          <Card className="border border-rose-100 bg-rose-50/50 p-3">
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase text-rose-900">
              <FiTrendingDown className="h-3 w-3" aria-hidden />
              Sorties période
            </p>
            <p className="mt-1 text-lg font-bold text-rose-950 tabular-nums">{formatFCFA(consolidated.periodOut)}</p>
          </Card>
          <Card className="border border-slate-200 bg-slate-50/50 p-3">
            <p className="text-[10px] font-semibold uppercase text-slate-800">Flux net période</p>
            <p
              className={`mt-1 text-lg font-bold tabular-nums ${
                consolidated.netFlow >= 0 ? 'text-slate-900' : 'text-rose-800'
              }`}
            >
              {formatFCFA(consolidated.netFlow)}
            </p>
            <p className="text-[10px] text-slate-600">{consolidated.movementCount} mouvement(s)</p>
          </Card>
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {(overview?.registers ?? []).map((reg) => (
          <Card
            key={reg.id}
            className={`border p-3 ${reg.isVirtual ? 'border-sky-200 bg-sky-50/30' : 'border-stone-200'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-mono text-[10px] text-stone-500">{reg.code}</p>
                <p className="font-semibold text-stone-900">{reg.name}</p>
                <p className="text-[10px] text-stone-500">
                  {REGISTER_TYPE_LABEL[reg.type]}
                  {reg.isVirtual ? ' · synchronisé' : ''}
                </p>
              </div>
              {!reg.isActive && !reg.isVirtual && (
                <Badge variant="secondary" className="text-[9px]">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-indigo-950">{formatFCFA(reg.balance)}</p>
            <div className="mt-1 flex justify-between text-[10px] text-stone-600 tabular-nums">
              <span className="text-emerald-700">+{formatFCFA(reg.periodIn)}</span>
              <span className="text-rose-700">−{formatFCFA(reg.periodOut)}</span>
            </div>
            {!reg.isVirtual && (
              <button
                type="button"
                className="mt-2 text-[11px] font-medium text-indigo-700 hover:underline"
                onClick={() => setRegisterFilter(reg.id)}
              >
                Filtrer les mouvements
              </button>
            )}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-2 border border-stone-200 p-3">
          <h4 className="text-sm font-bold text-stone-900">Nouvelle caisse</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input label="Code *" value={regForm.code} onChange={(e) => setRegForm((f) => ({ ...f, code: e.target.value }))} />
            <Input label="Nom *" value={regForm.name} onChange={(e) => setRegForm((f) => ({ ...f, name: e.target.value }))} />
            <div>
              <label className="text-xs font-medium text-stone-700">Type</label>
              <select
                aria-label="Type de caisse"
                className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                value={regForm.type}
                onChange={(e) => setRegForm((f) => ({ ...f, type: e.target.value as CashRegisterType }))}
              >
                {(Object.keys(REGISTER_TYPE_LABEL) as CashRegisterType[]).map((t) => (
                  <option key={t} value={t}>
                    {REGISTER_TYPE_LABEL[t]}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Fonds initial (FCFA)"
              value={regForm.openingFloat}
              onChange={(e) => setRegForm((f) => ({ ...f, openingFloat: e.target.value }))}
            />
            <Input
              label="Description"
              className="sm:col-span-2"
              value={regForm.description}
              onChange={(e) => setRegForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => createRegister.mutate()}
            disabled={createRegister.isPending || !regForm.code || !regForm.name}
          >
            <FiPlus className="mr-1 inline h-4 w-4" />
            Créer la caisse
          </Button>
          {physicalRegisters.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-stone-100 pt-2 text-xs text-stone-600">
              {registers
                .filter((r) => r.isActive)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between">
                    <span>
                      {r.code} — {r.name}
                    </span>
                    <button
                      type="button"
                      className="text-rose-600"
                      onClick={() => {
                        if (window.confirm('Désactiver cette caisse ?')) deactivateRegister.mutate(r.id);
                      }}
                    >
                      Désactiver
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-2 border border-stone-200 p-3">
          <h4 className="flex items-center gap-1 text-sm font-bold text-stone-900">
            <FiDollarSign className="h-4 w-4" aria-hidden />
            Mouvement de caisse
          </h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              type="date"
              label="Date"
              value={mvForm.movementDate}
              onChange={(e) => setMvForm((f) => ({ ...f, movementDate: e.target.value }))}
            />
            <div>
              <label className="text-xs font-medium text-stone-700">Caisse</label>
              <select
                aria-label="Caisse pour le mouvement"
                className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                value={mvForm.cashRegisterId}
                onChange={(e) => setMvForm((f) => ({ ...f, cashRegisterId: e.target.value }))}
              >
                <option value="">Par défaut (petite caisse)</option>
                {activePhysicalForSelect.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-700">Sens</label>
              <select
                aria-label="Sens du mouvement"
                className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                value={mvForm.type}
                onChange={(e) => setMvForm((f) => ({ ...f, type: e.target.value as 'IN' | 'OUT' }))}
              >
                <option value="IN">Entrée (alimentation)</option>
                <option value="OUT">Sortie (dépense)</option>
              </select>
            </div>
            <Input label="Montant (FCFA)" value={mvForm.amount} onChange={(e) => setMvForm((f) => ({ ...f, amount: e.target.value }))} />
            <Input
              label="Motif *"
              className="sm:col-span-2"
              value={mvForm.reason}
              onChange={(e) => setMvForm((f) => ({ ...f, reason: e.target.value }))}
            />
            <Input
              label="Référence"
              className="sm:col-span-2"
              value={mvForm.reference}
              onChange={(e) => setMvForm((f) => ({ ...f, reference: e.target.value }))}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => createMovement.mutate()}
            disabled={createMovement.isPending || !mvForm.amount || !mvForm.reason}
          >
            Enregistrer
          </Button>
        </Card>
      </div>

      <Card className="overflow-hidden border border-stone-200 p-0">
        <div className="border-b border-stone-100 px-3 py-2">
          <h4 className="text-sm font-semibold text-stone-900">Journal des mouvements</h4>
        </div>
        {movements.length === 0 ? (
          <p className="p-6 text-center text-sm text-stone-500">Aucun mouvement sur la période.</p>
        ) : (
          <div className="max-h-130 overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 bg-stone-50">
                <tr className="text-left text-stone-600">
                  <th className="px-2 py-2 font-semibold">Date</th>
                  <th className="px-2 py-2 font-semibold">Caisse</th>
                  <th className="px-2 py-2 font-semibold">Type</th>
                  <th className="px-2 py-2 font-semibold">Libellé</th>
                  <th className="px-2 py-2 text-right font-semibold">Montant</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-t border-stone-100 hover:bg-stone-50/60">
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {format(new Date(m.date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="font-medium text-stone-800">{m.registerName}</span>
                      <span className="block font-mono text-[9px] text-stone-500">{m.registerCode}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <Badge
                        variant={m.kind === 'OUT' ? 'danger' : m.kind === 'COLLECTION' ? 'success' : 'secondary'}
                        className="text-[9px]"
                      >
                        {MOVEMENT_KIND_LABEL[m.kind]}
                      </Badge>
                    </td>
                    <td className="max-w-xs truncate px-2 py-1.5 text-stone-700" title={m.label}>
                      {m.label}
                      {m.recordedBy && (
                        <span className="block text-[9px] text-stone-500">Par {m.recordedBy}</span>
                      )}
                    </td>
                    <td
                      className={`px-2 py-1.5 text-right font-semibold tabular-nums ${
                        m.kind === 'OUT' ? 'text-rose-800' : 'text-emerald-800'
                      }`}
                    >
                      {m.kind === 'OUT' ? '−' : '+'}
                      {formatFCFA(m.amount)}
                    </td>
                    <td className="px-2 py-1.5">
                      {m.source === 'PETTY' && (
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={() => {
                            if (window.confirm('Supprimer ce mouvement ?')) delMovement.mutate(m.id);
                          }}
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountingCashManagementSection;
