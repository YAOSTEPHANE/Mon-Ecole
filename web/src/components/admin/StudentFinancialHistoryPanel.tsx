import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FilterDropdown from '../ui/FilterDropdown';
import toast from 'react-hot-toast';
import { FiUser, FiDownload, FiArrowDownCircle, FiArrowUpCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import { ADM } from './adminModuleLayout';

type Line = {
  id: string;
  kind: 'fee' | 'payment';
  date: string;
  label: string;
  amount: number;
  detail: string;
  status?: string;
};

interface StudentFinancialHistoryPanelProps {
  compact?: boolean;
}

const StudentFinancialHistoryPanel: React.FC<StudentFinancialHistoryPanelProps> = ({
  compact = false,
}) => {
  const [studentId, setStudentId] = useState<string>('');

  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
  });

  const { data: fees } = useQuery({
    queryKey: ['admin-tuition-fees', 'student', studentId],
    queryFn: () => adminApi.getTuitionFees({ studentId }),
    enabled: !!studentId,
  });

  const { data: allPayments } = useQuery({
    queryKey: ['admin-payments-flat'],
    queryFn: () => adminApi.getPayments(),
  });

  const lines = useMemo(() => {
    if (!studentId) return [];
    const out: Line[] = [];
    (fees || []).forEach((fee: any) => {
      out.push({
        id: `fee-${fee.id}`,
        kind: 'fee',
        date: fee.createdAt || fee.dueDate,
        label: `Frais — ${fee.period}`,
        amount: fee.amount,
        detail: `${fee.academicYear} · échéance ${format(new Date(fee.dueDate), 'dd/MM/yyyy', { locale: fr })}`,
        status: fee.isPaid ? 'Soldé' : 'En attente',
      });
    });
    (allPayments || [])
      .filter((p: any) => p.studentId === studentId)
      .forEach((p: any) => {
        out.push({
          id: `pay-${p.id}`,
          kind: 'payment',
          date: p.paidAt || p.createdAt,
          label: `Paiement ${p.paymentMethod || ''}`,
          amount: Math.abs(p.amount),
          detail: p.tuitionFee
            ? `${p.tuitionFee.period} (${p.tuitionFee.academicYear})`
            : 'Paiement',
          status: p.status,
        });
      });
    out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return out;
  }, [studentId, fees, allPayments]);

  const studentLabel = useMemo(() => {
    const s = students?.find((x: any) => x.id === studentId);
    if (!s?.user) return '';
    return `${s.user.firstName} ${s.user.lastName} — ${s.class?.name || 'Sans classe'}`;
  }, [students, studentId]);

  const exportCsv = () => {
    if (!lines.length) {
      toast.error('Aucune ligne à exporter');
      return;
    }
    const rows = lines.map((l) =>
      [
        format(new Date(l.date), 'dd/MM/yyyy', { locale: fr }),
        l.kind === 'fee' ? 'Frais' : 'Paiement',
        l.label.replace(/;/g, ','),
        l.kind === 'payment' ? -l.amount : l.amount,
        (l.detail || '').replace(/;/g, ','),
        l.status || '',
      ].join(';')
    );
    const csv =
      '\ufeff' +
      'Date;Type;Libellé;Montant (négatif = paiement);Détail;Statut\n' +
      rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `historique-financier-${studentId.slice(-6)}-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Export CSV téléchargé');
  };

  const studentOptions = [
    { label: 'Choisir un élève…', value: '' },
    ...(students || []).map((s: any) => ({
      value: s.id,
      label: `${s.user?.firstName || ''} ${s.user?.lastName || ''} (${s.class?.name || '—'})`,
    })),
  ];

  return (
    <div className={compact ? ADM.root : 'space-y-6'}>
      <div>
        <h2 className={compact ? ADM.h2 : 'text-lg font-semibold text-gray-900'}>
          Historique financier par élève
        </h2>
        <p className={compact ? ADM.intro : 'text-sm text-gray-500 mt-0.5'}>
          Frais émis et paiements enregistrés, triés du plus récent au plus ancien.
        </p>
      </div>

      <Card
        className={`border border-gray-200 flex flex-col sm:flex-row gap-4 sm:items-end ${
          compact ? 'p-3' : 'p-4'
        }`}
      >
        <div className="min-w-[260px] flex-1">
          <FilterDropdown
            compact={compact}
            label="Élève"
            selected={studentId}
            onChange={setStudentId}
            options={studentOptions}
          />
        </div>
        {studentId && lines.length > 0 && (
          <Button variant="secondary" size={compact ? 'sm' : 'md'} onClick={exportCsv}>
            <FiDownload className="w-4 h-4 mr-2 inline" />
            Export CSV
          </Button>
        )}
      </Card>

      {!studentId ? (
        <Card className="p-8 text-center text-gray-500 border-dashed">
          <FiUser className="w-10 h-10 mx-auto mb-2 text-gray-300" />
          Sélectionnez un élève pour afficher son historique.
        </Card>
      ) : (
        <>
          <Card className="p-4 bg-slate-50 border border-slate-200">
            <p className="text-sm text-gray-800">
              <strong>{studentLabel}</strong>
            </p>
          </Card>
          {lines.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">Aucun frais ni paiement pour cet élève.</Card>
          ) : (
            <Card className="border border-gray-200 overflow-hidden">
              <div className="divide-y divide-gray-100">
                {lines.map((l) => (
                  <div
                    key={l.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-2 justify-between hover:bg-gray-50/80 ${
                      compact ? 'px-3 py-2' : 'px-4 py-3'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 p-1.5 rounded-lg ${
                          l.kind === 'fee' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {l.kind === 'fee' ? (
                          <FiArrowDownCircle className="w-4 h-4" />
                        ) : (
                          <FiArrowUpCircle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{l.label}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(l.date), 'dd/MM/yyyy HH:mm', { locale: fr })} · {l.detail}
                        </p>
                        {l.status && (
                          <Badge variant="secondary" className="mt-1 text-xs">
                            {l.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div
                      className={`text-right font-semibold tabular-nums ${
                        l.kind === 'payment' ? 'text-emerald-700' : 'text-gray-900'
                      }`}
                    >
                      {l.kind === 'fee' ? '+' : '−'}
                      {formatFCFA(l.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default StudentFinancialHistoryPanel;
