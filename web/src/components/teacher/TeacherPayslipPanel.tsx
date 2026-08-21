'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiDollarSign, FiExternalLink } from 'react-icons/fi';
import { teacherApi } from '@/services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const RUN_STATUS: Record<string, string> = {
  DRAFT: 'Brouillon',
  VALIDATED: 'Validé',
  PAID: 'Payé',
  CANCELLED: 'Annulé',
};

const MONTHS_FR = [
  '',
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

type PayrollLineRow = {
  id: string;
  netAmount: number;
  payrollRun: {
    year: number;
    month: number;
    status: string;
    paidAt?: string | null;
  };
};

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n);
}

export default function TeacherPayslipPanel() {
  const { data: lines = [], isLoading } = useQuery({
    queryKey: ['teacher-payroll-lines'],
    queryFn: teacherApi.getMyPayrollLines,
  });

  const openPayslip = async (lineId: string) => {
    try {
      const html = await teacherApi.openMyPayslip(lineId);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('Bulletin indisponible pour cette ligne.');
    }
  };

  const list = lines as PayrollLineRow[];

  return (
    <Card>
      <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2">
        <FiDollarSign className="h-5 w-5 text-emerald-600" aria-hidden />
        Ma paie
      </h3>
      <p className="text-sm text-stone-600 mb-4">
        Bulletins disponibles lorsque le cycle est validé ou payé par la direction.
      </p>

      {isLoading ? (
        <p className="text-stone-500 text-sm py-8 text-center">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="text-stone-600 text-sm py-8 text-center">Aucune ligne de paie pour le moment.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {list.map((line) => {
            const canOpen =
              line.payrollRun.status === 'VALIDATED' || line.payrollRun.status === 'PAID';
            const period = `${MONTHS_FR[line.payrollRun.month] ?? line.payrollRun.month} ${line.payrollRun.year}`;
            return (
              <li
                key={line.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3"
              >
                <div>
                  <p className="font-semibold text-stone-900 capitalize">{period}</p>
                  <p className="text-sm text-stone-700">
                    Net : {formatFcfa(line.netAmount)}
                    {line.payrollRun.paidAt ? (
                      <span className="text-stone-500">
                        {' '}
                        · payé le{' '}
                        {format(new Date(line.payrollRun.paidAt), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    className={
                      line.payrollRun.status === 'PAID'
                        ? 'bg-green-100 text-green-800'
                        : line.payrollRun.status === 'VALIDATED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-100 text-stone-700'
                    }
                  >
                    {RUN_STATUS[line.payrollRun.status] ?? line.payrollRun.status}
                  </Badge>
                  {canOpen ? (
                    <button
                      type="button"
                      onClick={() => void openPayslip(line.id)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      <FiExternalLink className="h-3.5 w-3.5" aria-hidden />
                      Bulletin
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
