import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import Input from '../ui/Input';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiShield } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import { downloadPaymentReceiptPdf } from '../../lib/paymentReceiptPdf';
import { ADM } from './adminModuleLayout';
import { useAppBranding } from '../../contexts/AppBrandingContext';
import {
  TUITION_BILLING_STATUS_LABELS,
  type TuitionBillingStatus,
} from '../../lib/tuitionBilling';

interface PaymentReceiptsPanelProps {
  compact?: boolean;
}

const PaymentReceiptsPanel: React.FC<PaymentReceiptsPanelProps> = ({ compact = false }) => {
  const [search, setSearch] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const tc = compact ? 'px-3 py-2' : 'px-4 py-3';
  const { branding, navigationLogoAbsolute, loginLogoAbsolute } = useAppBranding();

  const receiptBranding = useMemo(
    () => ({
      schoolName: branding.schoolDisplayName || branding.appTitle,
      schoolPhone: branding.schoolPhone,
      schoolEmail: branding.schoolEmail,
      schoolAddress: branding.schoolAddress,
      schoolPrincipal: branding.schoolPrincipal,
      logoAbsoluteUrl: navigationLogoAbsolute || loginLogoAbsolute,
    }),
    [branding, navigationLogoAbsolute, loginLogoAbsolute],
  );

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments-flat'],
    queryFn: () => adminApi.getPayments(),
  });

  const verifyMut = useMutation({
    mutationFn: () => adminApi.verifyPaymentReceipt(verifyCode.trim()),
    onError: (e: { response?: { data?: { message?: string; error?: string } } }) => {
      toast.error(e.response?.data?.message || e.response?.data?.error || 'Reçu introuvable');
    },
  });

  const completed = useMemo(() => {
    if (!payments || !Array.isArray(payments)) return [];
    return payments.filter((p: any) => p.status === 'COMPLETED');
  }, [payments]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return completed;
    return completed.filter((p: any) => {
      const s = `${p.student?.user?.firstName || ''} ${p.student?.user?.lastName || ''}`.toLowerCase();
      const payer = `${p.payer?.firstName || ''} ${p.payer?.lastName || ''}`.toLowerCase();
      const ref = String(
        p.receiptNumber || p.verificationCode || p.paymentReference || p.id || '',
      ).toLowerCase();
      return s.includes(q) || payer.includes(q) || ref.includes(q);
    });
  }, [completed, search]);

  const handlePdf = async (p: any) => {
    try {
      setDownloadingId(p.id);
      await downloadPaymentReceiptPdf(p, receiptBranding);
      toast.success('Reçu PDF téléchargé');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return <Card className="p-10 text-center text-gray-500">Chargement des paiements…</Card>;
  }

  const verified = verifyMut.data;

  return (
    <div className={compact ? ADM.root : 'space-y-6'}>
      <div>
        <h2 className={compact ? ADM.h2 : 'text-lg font-semibold text-gray-900'}>Génération de reçus</h2>
        <p className={compact ? ADM.intro : 'text-sm text-gray-500 mt-0.5'}>
          Reçus officiels numérotés (REC-AAAA-0001), code-barres et vérification anti-falsification réservée à la comptabilité.
        </p>
      </div>

      <Card className={compact ? 'p-3 border border-gray-200 space-y-3' : 'p-4 border border-gray-200 space-y-3'}>
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <FiShield className="w-4 h-4 text-teal-600" />
          Vérification comptabilité
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <Input
              label="N° reçu ou code de vérification"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              placeholder="REC-2026-0001 ou code"
            />
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!verifyCode.trim() || verifyMut.isPending}
            onClick={() => verifyMut.mutate()}
          >
            Vérifier
          </Button>
        </div>
        {verified?.valid && verified.payment ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50/80 p-3 text-sm">
            <Badge variant="success" className="mb-2">
              Reçu authentique
            </Badge>
            <p>
              <strong>{verified.payment.receiptNumber}</strong> — {formatFCFA(verified.payment.amount)} —{' '}
              {verified.payment.student.firstName} {verified.payment.student.lastName}
              {verified.payment.student.className ? ` (${verified.payment.student.className})` : ''}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {verified.payment.tuitionFee.period} · {verified.payment.tuitionFee.academicYear} ·{' '}
              {TUITION_BILLING_STATUS_LABELS[verified.payment.tuitionFee.billingStatus as TuitionBillingStatus] ??
                verified.payment.tuitionFee.billingStatus}
            </p>
          </div>
        ) : verifyMut.isError ? (
          <p className="text-sm text-red-600">Reçu introuvable ou code invalide.</p>
        ) : null}
      </Card>

      <Card className={compact ? 'p-3 border border-gray-200' : 'p-4 border border-gray-200'}>
        <SearchBar
          compact={compact}
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par élève, payeur, n° reçu ou code…"
        />
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <FiFileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          Aucun paiement confirmé à afficher.
        </Card>
      ) : (
        <Card className="border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`min-w-full ${compact ? 'text-xs' : 'text-sm'}`}>
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>Date</th>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>N° reçu</th>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>Élève</th>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>Payeur</th>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>Montant</th>
                  <th className={compact ? 'px-3 py-2 font-medium' : 'px-4 py-3 font-medium'}>Période</th>
                  <th className={`font-medium text-right ${compact ? 'px-3 py-2' : 'px-4 py-3'}`}>Reçu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/80">
                    <td className={`${tc} text-gray-700 whitespace-nowrap`}>
                      {format(new Date(p.paidAt || p.createdAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
                    </td>
                    <td className={`${tc} font-mono text-xs text-gray-800`}>
                      {p.receiptNumber || '—'}
                      {p.verificationCode ? (
                        <span className="block text-[10px] text-gray-500">{p.verificationCode}</span>
                      ) : null}
                    </td>
                    <td className={tc}>
                      {p.student?.user?.firstName} {p.student?.user?.lastName}
                      <span className="block text-xs text-gray-500">{p.student?.class?.name}</span>
                    </td>
                    <td className={`${tc} text-gray-700`}>
                      {p.payer?.firstName} {p.payer?.lastName}
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {p.payer?.role}
                      </Badge>
                    </td>
                    <td className={`${tc} font-medium`}>{formatFCFA(p.amount)}</td>
                    <td className={`${tc} text-gray-600 text-xs`}>
                      {p.tuitionFee?.period} · {p.tuitionFee?.academicYear}
                    </td>
                    <td className={`${tc} text-right`}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void handlePdf(p)}
                        disabled={downloadingId === p.id}
                      >
                        <FiDownload className="w-4 h-4 mr-1 inline" />
                        PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PaymentReceiptsPanel;
