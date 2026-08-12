import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import TuitionFeesManagement from './TuitionFeesManagement';
import PaymentsManagement from './PaymentsManagement';
import PendingCashPaymentsPanel from '../payments/PendingCashPaymentsPanel';
import PendingMobileMoneyPanel from '../payments/PendingMobileMoneyPanel';
import PaymentRemindersPanel from './PaymentRemindersPanel';
import PaymentReceiptsPanel from './PaymentReceiptsPanel';
import StudentFinancialHistoryPanel from './StudentFinancialHistoryPanel';
import FinancialServicePanel from './FinancialServicePanel';
import {
  FiGrid,
  FiDollarSign,
  FiCreditCard,
  FiBell,
  FiFileText,
  FiUser,
  FiPieChart,
} from 'react-icons/fi';
import { formatFCFA } from '../../utils/currency';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import { ADM } from './adminModuleLayout';
import toast from 'react-hot-toast';
import Input from '../ui/Input';

type FeesTab =
  | 'overview'
  | 'service'
  | 'billing'
  | 'payments'
  | 'reminders'
  | 'receipts'
  | 'history';

const FeesManagementModule: React.FC = () => {
  const pathname = usePathname();
  const pendingCashMode = pathname?.startsWith('/staff') ? 'staff' : 'admin';
  const [tab, setTab] = useState<FeesTab>('overview');
  const qc = useQueryClient();
  const [invoiceYear, setInvoiceYear] = useState('');
  const [counterFeeId, setCounterFeeId] = useState('');
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMethod, setCounterMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [counterNotes, setCounterNotes] = useState('');

  const { data: tuitionFees } = useQuery({
    queryKey: ['admin-tuition-fees'],
    queryFn: () => adminApi.getTuitionFees(),
  });

  const { data: paymentsGrouped } = useQuery({
    queryKey: ['admin-payments-grouped'],
    queryFn: () => adminApi.getPaymentsGrouped(),
  });

  const assignInvoicesMut = useMutation({
    mutationFn: () =>
      adminApi.assignTuitionFeeInvoices({
        academicYear: invoiceYear.trim() || undefined,
      }),
    onSuccess: (d: { message?: string }) => {
      toast.success(d?.message || 'Numéros attribués');
      qc.invalidateQueries({ queryKey: ['admin-tuition-fees'] });
      qc.invalidateQueries({ queryKey: ['admin-tuition-fees-reminders'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const runRemindersMut = useMutation({
    mutationFn: () => adminApi.runTuitionFeeAutoReminders(),
    onSuccess: (d: { message?: string }) => {
      toast.success(d?.message || 'Relances envoyées');
      qc.invalidateQueries({ queryKey: ['admin-tuition-fees-reminders'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const counterPayMut = useMutation({
    mutationFn: () =>
      adminApi.recordCounterTuitionPayment({
        tuitionFeeId: counterFeeId.trim(),
        amount: parseFloat(counterAmount),
        paymentMethod: counterMethod,
        notes: counterNotes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Paiement guichet enregistré');
      setCounterFeeId('');
      setCounterAmount('');
      setCounterNotes('');
      qc.invalidateQueries({ queryKey: ['admin-tuition-fees'] });
      qc.invalidateQueries({ queryKey: ['admin-payments-grouped'] });
      qc.invalidateQueries({ queryKey: ['admin-payments-flat'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const totalFees = tuitionFees?.length ?? 0;
  const pending =
    tuitionFees?.filter((f: any) => !f.isPaid).length ?? 0;
  let totalPaid = 0;
  if (paymentsGrouped && Array.isArray(paymentsGrouped)) {
    paymentsGrouped.forEach((g: any) => {
      totalPaid += g.totalPaid || 0;
    });
  }

  const subTabs: { id: FeesTab; label: string; icon: typeof FiGrid }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: FiGrid },
    { id: 'service', label: 'Service financier', icon: FiPieChart },
    { id: 'billing', label: 'Facturation (frais)', icon: FiDollarSign },
    { id: 'payments', label: 'Suivi des paiements', icon: FiCreditCard },
    { id: 'reminders', label: 'Rappels', icon: FiBell },
    { id: 'receipts', label: 'Reçus PDF', icon: FiFileText },
    { id: 'history', label: 'Historique par élève', icon: FiUser },
  ];

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Gestion des frais</h2>
        <p className={ADM.intro}>Facturation, encaissements, relances, reçus et suivi par famille.</p>
      </div>

      <div className={ADM.tabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(active, 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className={ADM.section}>
          <div className={ADM.grid3}>
            <Card className={`${ADM.statCard} border border-gray-200`}>
              <p className={ADM.statLabel}>Lignes de frais</p>
              <p className={ADM.statVal}>{totalFees}</p>
            </Card>
            <Card className={`${ADM.statCard} border border-amber-100 bg-amber-50/40`}>
              <p className="text-[10px] font-medium text-amber-800 uppercase tracking-wide leading-tight">
                En attente de paiement
              </p>
              <p className={`${ADM.statValTone} text-amber-900`}>{pending}</p>
            </Card>
            <Card className={`${ADM.statCard} border border-emerald-100 bg-emerald-50/40`}>
              <p className="text-[10px] font-medium text-emerald-800 uppercase tracking-wide leading-tight">
                Volume encaissé (suivi)
              </p>
              <p className={`${ADM.statValTone} text-emerald-900 text-base`}>{formatFCFA(totalPaid)}</p>
            </Card>
          </div>
          <Card className={ADM.helpCard}>
            <h3 className={ADM.helpTitle}>Parcours recommandé</h3>
            <ol className={ADM.helpOl}>
              <li>
                <strong>Service financier</strong> : point général, paiements et impayés par classe /
                niveau / sexe, dépenses.
              </li>
              <li>
                <strong>Facturation</strong> : créer les frais (élève ou classe entière).
              </li>
              <li>
                <strong>Paiements</strong> : suivre les encaissements et l’état par famille.
              </li>
              <li>
                <strong>Rappels</strong> : copier les messages pour les retards ou échéances proches.
              </li>
              <li>
                <strong>Reçus PDF</strong> après chaque paiement confirmé.
              </li>
              <li>
                <strong>Historique</strong> pour le détail par élève.
              </li>
            </ol>
          </Card>

          <Card className="border border-emerald-100 bg-white p-4 space-y-4">
            <h3 className="text-sm font-bold text-emerald-950">Facturation, relances & guichet</h3>
            <p className="text-xs text-stone-600">
              <strong>Factures</strong> : numérotation automatique des lignes sans numéro (préfixe FAC).{' '}
              <strong>Relances</strong> : notifications in-app (+ e-mail si SMTP configuré), au plus une fois
              toutes les 7 jours par ligne (réglable côté serveur). <strong>Guichet</strong> : enregistrement
              espèces ou virement encaissé au secrétariat. Les parents et élèves paient déjà en ligne (carte,
              mobile money, virement simulé) depuis leur espace ; le reçu PDF est généré automatiquement à la
              confirmation.
            </p>
            <div className="flex flex-wrap gap-2 items-end">
              <div className="min-w-[140px]">
                <Input
                  label="Année (optionnel)"
                  placeholder={getCurrentAcademicYear()}
                  value={invoiceYear}
                  onChange={(e) => setInvoiceYear(e.target.value)}
                />
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => assignInvoicesMut.mutate()}
                disabled={assignInvoicesMut.isPending}
              >
                Générer les n° de facture
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (!window.confirm('Envoyer les relances automatiques maintenant ?')) return;
                  runRemindersMut.mutate();
                }}
                disabled={runRemindersMut.isPending}
              >
                Lancer les relances
              </Button>
            </div>
            <div className="border-t border-stone-100 pt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end">
              <Input
                label="ID ligne de frais (Mongo)"
                value={counterFeeId}
                onChange={(e) => setCounterFeeId(e.target.value)}
                placeholder="ObjectId…"
              />
              <Input
                label="Montant (FCFA)"
                value={counterAmount}
                onChange={(e) => setCounterAmount(e.target.value)}
                type="number"
              />
              <div>
                <label className="text-xs font-medium text-stone-700">Mode guichet</label>
                <select
                  aria-label="Mode de paiement au guichet"
                  className="mt-1 w-full rounded-xl border-2 border-stone-200 px-3 py-2 text-sm"
                  value={counterMethod}
                  onChange={(e) => setCounterMethod(e.target.value as 'CASH' | 'BANK_TRANSFER')}
                >
                  <option value="CASH">Espèces</option>
                  <option value="BANK_TRANSFER">Virement / chèque sur place</option>
                </select>
              </div>
              <Input
                label="Note (optionnel)"
                value={counterNotes}
                onChange={(e) => setCounterNotes(e.target.value)}
              />
              <div className="sm:col-span-2 lg:col-span-4">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    if (!counterFeeId.trim() || !counterAmount.trim()) {
                      toast.error('ID ligne et montant requis');
                      return;
                    }
                    counterPayMut.mutate();
                  }}
                  disabled={counterPayMut.isPending}
                >
                  Enregistrer paiement guichet
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'service' && <FinancialServicePanel />}
      {tab === 'billing' && <TuitionFeesManagement embedded compact />}
      {tab === 'payments' && (
        <div className="space-y-4">
          <PendingCashPaymentsPanel mode={pendingCashMode} compact />
          <PendingMobileMoneyPanel mode={pendingCashMode} compact />
          <PaymentsManagement embedded compact />
        </div>
      )}
      {tab === 'reminders' && <PaymentRemindersPanel compact />}
      {tab === 'receipts' && <PaymentReceiptsPanel compact />}
      {tab === 'history' && <StudentFinancialHistoryPanel compact />}
    </div>
  );
};

export default FeesManagementModule;
