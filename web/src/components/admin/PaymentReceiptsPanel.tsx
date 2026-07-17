import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import { downloadPaymentReceiptPdf } from '../../lib/paymentReceiptPdf';
import { ADM } from './adminModuleLayout';
import { useAppBranding } from '../../contexts/AppBrandingContext';

interface PaymentReceiptsPanelProps {
  compact?: boolean;
}

const PaymentReceiptsPanel: React.FC<PaymentReceiptsPanelProps> = ({ compact = false }) => {
  const [search, setSearch] = useState('');
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
      const ref = String(p.paymentReference || p.id || '').toLowerCase();
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

  return (
    <div className={compact ? ADM.root : 'space-y-6'}>
      <div>
        <h2 className={compact ? ADM.h2 : 'text-lg font-semibold text-gray-900'}>Génération de reçus</h2>
        <p className={compact ? ADM.intro : 'text-sm text-gray-500 mt-0.5'}>
          Reçus PDF pour les paiements confirmés (référence, montant, payeur, élève, période).
        </p>
      </div>

      <Card className={compact ? 'p-3 border border-gray-200' : 'p-4 border border-gray-200'}>
        <SearchBar
          compact={compact}
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par élève, payeur ou référence…"
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
