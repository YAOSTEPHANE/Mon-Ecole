'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { adminAccountingApi } from '../../services/api/admin-accounting.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Badge from '../ui/Badge';
import { ADM } from './adminModuleLayout';
import { formatFCFA } from '../../utils/currency';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import toast from 'react-hot-toast';
import AccountingTransactionJournalSection from './AccountingTransactionJournalSection';
import AccountingClassFinancialSituationSection from './AccountingClassFinancialSituationSection';
import AccountingCashManagementSection from './AccountingCashManagementSection';
import { exportJournalCsv, type AccountingJournalRow } from '../../lib/accountingJournal';
import { adminApi } from '../../services/api';
import {
  FiBook,
  FiList,
  FiLayers,
  FiTrendingUp,
  FiShoppingCart,
  FiTruck,
  FiDownload,
  FiPlus,
  FiTrash2,
  FiUsers,
  FiArchive,
} from 'react-icons/fi';

type Sub =
  | 'bilan'
  | 'journal'
  | 'ledger'
  | 'budget'
  | 'expenses'
  | 'suppliers'
  | 'cash'
  | 'by_class'
  | 'reports';

const EXPENSE_CAT_LABEL: Record<string, string> = {
  SUPPLIES: 'Fournitures',
  SERVICES: 'Services',
  UTILITIES: 'Charges locatives / énergie',
  MAINTENANCE: 'Entretien',
  PAYROLL_AUX: 'Personnel (charges)',
  TRANSPORT: 'Transport',
  CATERING: 'Restauration',
  IT: 'Informatique',
  OTHER: 'Autre',
};

const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'MOBILE_MONEY'] as const;

const AccountingManagementModule: React.FC = () => {
  const qc = useQueryClient();
  const [sub, setSub] = useState<Sub>('bilan');
  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear());
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const periodParams = useMemo(() => {
    const p: { academicYear?: string; from?: string; to?: string } = { academicYear };
    if (from) p.from = `${from}T00:00:00.000Z`;
    if (to) p.to = `${to}T23:59:59.999Z`;
    return p;
  }, [academicYear, from, to]);

  const { data: summary, isLoading: loadSum } = useQuery({
    queryKey: ['admin-accounting-summary', periodParams],
    queryFn: () => adminAccountingApi.getAccountingSummary(periodParams),
    enabled: sub === 'bilan' || sub === 'reports' || sub === 'budget',
  });

  const { data: journal, isLoading: loadJ } = useQuery({
    queryKey: ['admin-accounting-journal', periodParams],
    queryFn: () => adminAccountingApi.getAccountingJournal(periodParams),
    enabled: sub === 'journal' || sub === 'reports',
  });

  const { data: ledger, isLoading: loadL } = useQuery({
    queryKey: ['admin-accounting-ledger', periodParams],
    queryFn: () => adminAccountingApi.getAccountingLedger(periodParams),
    enabled: sub === 'ledger',
  });

  const { data: suppliers } = useQuery({
    queryKey: ['admin-suppliers'],
    queryFn: adminAccountingApi.getSuppliers,
    enabled: sub === 'suppliers' || sub === 'expenses',
  });

  const { data: expenses } = useQuery({
    queryKey: ['admin-school-expenses', academicYear],
    queryFn: () => adminAccountingApi.getSchoolExpenses({ academicYear }),
    enabled: sub === 'expenses',
  });

  const { data: pettyBal } = useQuery({
    queryKey: ['admin-petty-balance'],
    queryFn: adminAccountingApi.getPettyCashBalance,
    enabled: sub === 'bilan',
  });

  const { data: budgetLines } = useQuery({
    queryKey: ['admin-budget-lines', academicYear],
    queryFn: () => adminAccountingApi.getBudgetLines({ academicYear }),
    enabled: sub === 'budget',
  });

  const { data: financialBreakdown, isLoading: loadFinClass } = useQuery({
    queryKey: ['admin-financial-breakdown-by-class', academicYear],
    queryFn: () => adminApi.getFinancialBreakdown({ academicYear }),
    enabled: sub === 'by_class',
  });

  const [supForm, setSupForm] = useState({ name: '', contactName: '', email: '', phone: '' });
  const createSup = useMutation({
    mutationFn: () => adminAccountingApi.createSupplier(supForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Fournisseur créé');
      setSupForm({ name: '', contactName: '', email: '', phone: '' });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const [expForm, setExpForm] = useState({
    expenseDate: format(new Date(), 'yyyy-MM-dd'),
    amount: '',
    category: 'OTHER',
    description: '',
    supplierId: '',
    paymentMethod: 'BANK_TRANSFER',
    isPettyCash: false,
  });
  const createExp = useMutation({
    mutationFn: () =>
      adminAccountingApi.createSchoolExpense({
        ...expForm,
        academicYear,
        amount: parseFloat(expForm.amount),
        supplierId: expForm.supplierId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-school-expenses'] });
      qc.invalidateQueries({ queryKey: ['admin-accounting-summary'] });
      toast.success('Dépense enregistrée');
      setExpForm((f) => ({ ...f, amount: '', description: '' }));
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const [budForm, setBudForm] = useState({ label: '', category: 'OTHER', budgetedAmount: '' });
  const createBud = useMutation({
    mutationFn: () =>
      adminAccountingApi.createBudgetLine({
        academicYear,
        label: budForm.label,
        category: budForm.category,
        budgetedAmount: parseFloat(budForm.budgetedAmount),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-budget-lines'] });
      toast.success('Ligne budgétaire ajoutée');
      setBudForm({ label: '', category: 'OTHER', budgetedAmount: '' });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Erreur'),
  });

  const delSup = useMutation({
    mutationFn: adminAccountingApi.deleteSupplier,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-suppliers'] });
      toast.success('Supprimé');
    },
  });
  const delExp = useMutation({
    mutationFn: adminAccountingApi.deleteSchoolExpense,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-school-expenses'] });
      toast.success('Supprimé');
    },
  });
  const delBud = useMutation({
    mutationFn: adminAccountingApi.deleteBudgetLine,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-budget-lines'] });
      toast.success('Supprimé');
    },
  });

  const exportJournalCsvHandler = () => {
    if (!journal || !Array.isArray(journal) || journal.length === 0) return;
    exportJournalCsv(journal as AccountingJournalRow[], academicYear);
    toast.success('Export CSV');
  };

  const tabs: { id: Sub; label: string; icon: typeof FiBook }[] = [
    { id: 'bilan', label: 'Bilan & résultat', icon: FiTrendingUp },
    { id: 'journal', label: 'Journal des transactions', icon: FiList },
    { id: 'ledger', label: 'Grand livre', icon: FiLayers },
    { id: 'budget', label: 'Budget prévisionnel', icon: FiBook },
    { id: 'expenses', label: 'Dépenses', icon: FiShoppingCart },
    { id: 'suppliers', label: 'Fournisseurs', icon: FiTruck },
    { id: 'cash', label: 'Gestion des caisses', icon: FiArchive },
    { id: 'by_class', label: 'Situation par classe', icon: FiUsers },
    { id: 'reports', label: 'Rapports', icon: FiDownload },
  ];

  const pl = summary?.simplifiedPL as Record<string, number> | undefined;

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Comptabilité</h2>
        <p className={ADM.intro}>
          Grand livre synthétique, journal des opérations (encaissements scolarité, dépenses, caisse), suivi
          budgétaire et fournisseurs. Les comptes 6xx / 706 sont indicatifs pour l’école ; adaptez-les avec votre
          expert-comptable.
        </p>
      </div>

      <Card className="mb-3 p-3 flex flex-wrap gap-3 items-end border border-stone-200">
        <Input label="Année scolaire" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        <Input label="Du (optionnel)" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="Au (optionnel)" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </Card>

      <div className={ADM.tabRow}>
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSub(t.id)}
              className={ADM.tabBtn(sub === t.id, 'bg-slate-50 text-slate-900 ring-1 ring-slate-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {sub === 'bilan' && (
        <div className="space-y-4">
          {loadSum ? (
            <p className="text-sm text-stone-500">Chargement…</p>
          ) : (
            <>
              <div className={ADM.grid3}>
                <Card className="p-4 border border-emerald-100 bg-emerald-50/40">
                  <p className="text-[10px] font-semibold uppercase text-emerald-900">Produits (scolarité encaissée)</p>
                  <p className="text-xl font-bold text-emerald-950 mt-1">{formatFCFA(summary?.tuitionRevenue ?? 0)}</p>
                </Card>
                <Card className="p-4 border border-rose-100 bg-rose-50/40">
                  <p className="text-[10px] font-semibold uppercase text-rose-900">Charges (dépenses enregistrées)</p>
                  <p className="text-xl font-bold text-rose-950 mt-1">{formatFCFA(summary?.totalExpenses ?? 0)}</p>
                </Card>
                <Card className="p-4 border border-indigo-100 bg-indigo-50/40">
                  <p className="text-[10px] font-semibold uppercase text-indigo-900">Solde petite caisse</p>
                  <p className="text-xl font-bold text-indigo-950 mt-1">{formatFCFA(pettyBal?.balance ?? 0)}</p>
                </Card>
              </div>
              {pl && (
                <Card className="p-4 border border-stone-200">
                  <h3 className="text-sm font-bold text-stone-900 mb-3">Compte de résultat simplifié (période)</h3>
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-stone-100">
                      <tr>
                        <td className="py-2">Produits — scolarité</td>
                        <td className="py-2 text-right font-medium">{formatFCFA(pl.produitsEncaissementsScolarite)}</td>
                      </tr>
                      <tr>
                        <td className="py-2">Entrées caisse</td>
                        <td className="py-2 text-right font-medium">{formatFCFA(pl.autresEncaissementsCaisse)}</td>
                      </tr>
                      <tr className="font-semibold bg-stone-50">
                        <td className="py-2">Total produits</td>
                        <td className="py-2 text-right">{formatFCFA(pl.totalProduits)}</td>
                      </tr>
                      <tr>
                        <td className="py-2">Charges exploitation</td>
                        <td className="py-2 text-right">{formatFCFA(pl.chargesExploitation)}</td>
                      </tr>
                      <tr>
                        <td className="py-2">Sorties caisse</td>
                        <td className="py-2 text-right">{formatFCFA(pl.sortiesCaisse)}</td>
                      </tr>
                      <tr className="font-semibold bg-stone-50">
                        <td className="py-2">Total charges</td>
                        <td className="py-2 text-right">{formatFCFA(pl.totalCharges)}</td>
                      </tr>
                      <tr className="font-bold text-amber-900">
                        <td className="py-2">Résultat net (simplifié)</td>
                        <td className="py-2 text-right">{formatFCFA(pl.resultatNet)}</td>
                      </tr>
                    </tbody>
                  </table>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {sub === 'journal' && (
        <AccountingTransactionJournalSection
          rows={(journal as AccountingJournalRow[]) ?? []}
          academicYear={academicYear}
          isLoading={loadJ}
        />
      )}

      {sub === 'ledger' && (
        <Card className="p-0 overflow-hidden border border-stone-200">
          {loadL ? (
            <p className="p-4 text-sm text-stone-500">Chargement…</p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-3 py-2 text-left">Compte</th>
                  <th className="px-3 py-2 text-left">Libellé</th>
                  <th className="px-3 py-2 text-left">Nature</th>
                  <th className="px-3 py-2 text-right">Total période</th>
                </tr>
              </thead>
              <tbody>
                {((ledger as any[]) ?? []).map((r) => (
                  <tr key={`${r.ledgerCode}-${r.kind}`} className="border-t border-stone-100">
                    <td className="px-3 py-2 font-mono text-xs">{r.ledgerCode}</td>
                    <td className="px-3 py-2">{r.ledgerLabel}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {r.kind}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{formatFCFA(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {sub === 'budget' && (
        <div className="space-y-4">
          <Card className="p-3 border border-stone-200 space-y-2">
            <h3 className="text-sm font-bold text-stone-900">Nouvelle ligne budgétaire</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <Input label="Libellé" value={budForm.label} onChange={(e) => setBudForm((f) => ({ ...f, label: e.target.value }))} />
              <div>
                <label className="text-xs font-medium text-stone-700">Catégorie</label>
                <select
                  aria-label="Catégorie budgétaire"
                  className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                  value={budForm.category}
                  onChange={(e) => setBudForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {Object.entries(EXPENSE_CAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Montant prévu (FCFA)"
                value={budForm.budgetedAmount}
                onChange={(e) => setBudForm((f) => ({ ...f, budgetedAmount: e.target.value }))}
              />
            </div>
            <Button type="button" size="sm" onClick={() => createBud.mutate()} disabled={createBud.isPending}>
              <FiPlus className="mr-1 inline w-4 h-4" />
              Ajouter
            </Button>
          </Card>
          <Card className="border border-stone-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-3 py-2">Libellé</th>
                  <th className="px-3 py-2">Cat.</th>
                  <th className="px-3 py-2 text-right">Prévu</th>
                  <th className="px-3 py-2 text-right">Réalisé</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {((budgetLines as any[]) ?? []).map((b) => {
                  const spent = (summary?.expensesByCategory as Record<string, number>)?.[b.category] ?? 0;
                  return (
                    <tr key={b.id} className="border-t border-stone-100">
                      <td className="px-3 py-2 font-medium">{b.label}</td>
                      <td className="px-3 py-2 text-xs">{EXPENSE_CAT_LABEL[b.category] ?? b.category}</td>
                      <td className="px-3 py-2 text-right">{formatFCFA(b.budgetedAmount)}</td>
                      <td className="px-3 py-2 text-right text-amber-800">{formatFCFA(spent)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="text-red-600 p-1"
                          title="Supprimer"
                          onClick={() => {
                            if (window.confirm('Supprimer cette ligne ?')) delBud.mutate(b.id);
                          }}
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {sub === 'expenses' && (
        <div className="space-y-4">
          <Card className="p-3 border border-stone-200 space-y-2">
            <h3 className="text-sm font-bold text-stone-900">Nouvelle dépense</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <Input type="date" label="Date" value={expForm.expenseDate} onChange={(e) => setExpForm((f) => ({ ...f, expenseDate: e.target.value }))} />
              <Input label="Montant (FCFA)" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} />
              <div>
                <label className="text-xs font-medium text-stone-700">Catégorie</label>
                <select
                  aria-label="Catégorie de dépense"
                  className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                  value={expForm.category}
                  onChange={(e) => setExpForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {Object.entries(EXPENSE_CAT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <Input label="Description" value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} />
              <div>
                <label className="text-xs font-medium text-stone-700">Fournisseur</label>
                <select
                  aria-label="Fournisseur"
                  className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                  value={expForm.supplierId}
                  onChange={(e) => setExpForm((f) => ({ ...f, supplierId: e.target.value }))}
                >
                  <option value="">—</option>
                  {((suppliers as any[]) ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-700">Mode de paiement</label>
                <select
                  aria-label="Mode de paiement"
                  className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                  value={expForm.paymentMethod}
                  onChange={(e) => setExpForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm col-span-full">
                <input
                  type="checkbox"
                  checked={expForm.isPettyCash}
                  onChange={(e) => setExpForm((f) => ({ ...f, isPettyCash: e.target.checked }))}
                />
                Réglée via petite caisse
              </label>
            </div>
            <Button type="button" size="sm" onClick={() => createExp.mutate()} disabled={createExp.isPending}>
              Enregistrer
            </Button>
          </Card>
          <Card className="border border-stone-200 overflow-hidden">
            <table className="min-w-full text-xs">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">Description</th>
                  <th className="px-2 py-2 text-right">Montant</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {((expenses as any[]) ?? []).map((e) => (
                  <tr key={e.id} className="border-t border-stone-100">
                    <td className="px-2 py-1.5">{format(new Date(e.expenseDate), 'dd/MM/yyyy', { locale: fr })}</td>
                    <td className="px-2 py-1.5">{e.description}</td>
                    <td className="px-2 py-1.5 text-right">{formatFCFA(e.amount)}</td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => {
                          if (window.confirm('Supprimer ?')) delExp.mutate(e.id);
                        }}
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {sub === 'suppliers' && (
        <div className="space-y-4">
          <Card className="p-3 border border-stone-200 grid sm:grid-cols-2 gap-2">
            <Input label="Raison sociale *" value={supForm.name} onChange={(e) => setSupForm((f) => ({ ...f, name: e.target.value }))} />
            <Input label="Contact" value={supForm.contactName} onChange={(e) => setSupForm((f) => ({ ...f, contactName: e.target.value }))} />
            <Input label="E-mail" value={supForm.email} onChange={(e) => setSupForm((f) => ({ ...f, email: e.target.value }))} />
            <Input label="Téléphone" value={supForm.phone} onChange={(e) => setSupForm((f) => ({ ...f, phone: e.target.value }))} />
            <Button type="button" size="sm" className="sm:col-span-2" onClick={() => createSup.mutate()} disabled={createSup.isPending}>
              Ajouter le fournisseur
            </Button>
          </Card>
          <ul className="space-y-2">
            {((suppliers as any[]) ?? []).map((s) => (
              <li key={s.id} className="flex justify-between items-center rounded-xl border border-stone-200 px-3 py-2">
                <div>
                  <p className="font-semibold text-stone-900">{s.name}</p>
                  <p className="text-xs text-stone-500">{s.email || s.phone || '—'}</p>
                </div>
                <button
                  type="button"
                  className="text-red-600 p-2"
                  onClick={() => {
                    if (window.confirm('Supprimer ?')) delSup.mutate(s.id);
                  }}
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sub === 'cash' && <AccountingCashManagementSection />}

      {sub === 'by_class' && (
        <AccountingClassFinancialSituationSection
          academicYear={academicYear}
          byClass={financialBreakdown?.paymentsAndUnpaid?.byClass ?? []}
          overview={financialBreakdown?.overview}
          isLoading={loadFinClass}
        />
      )}

      {sub === 'reports' && (
        <Card className="p-4 border border-stone-200 space-y-3">
          <p className="text-sm text-stone-600">
            Export CSV du journal (mêmes filtres année / dates que ci-dessus). Les rapports détaillés financiers
            élèves / familles restent aussi disponibles dans « Rapports & statistiques ».
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={exportJournalCsvHandler} disabled={!journal?.length}>
            <FiDownload className="mr-1 inline w-4 h-4" />
            Télécharger le journal (CSV)
          </Button>
        </Card>
      )}
    </div>
  );
};

export default AccountingManagementModule;
