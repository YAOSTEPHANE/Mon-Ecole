'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiCheck, FiSmartphone } from 'react-icons/fi';
import { adminApi } from '@/services/api/admin.api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import { formatFCFA } from '../../utils/currency';

type PendingRow = {
  id: string;
  amount: number;
  createdAt: string;
  paymentReference?: string | null;
  transactionId?: string | null;
  method?: string | null;
  paymentMethod?: string | null;
  payer?: { firstName?: string; lastName?: string; role?: string };
  student?: {
    user?: { firstName?: string; lastName?: string };
    class?: { name?: string } | null;
  };
  tuitionFee?: { period?: string; academicYear?: string };
};

type PendingMobileMoneyPanelProps = {
  compact?: boolean;
};

export default function PendingMobileMoneyPanel({ compact = false }: PendingMobileMoneyPanelProps) {
  const qc = useQueryClient();
  const [txById, setTxById] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['admin-pending-mobile-money'],
    queryFn: () => adminApi.getPendingMobileMoneyPayments() as Promise<PendingRow[]>,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['admin-pending-mobile-money'] });
    qc.invalidateQueries({ queryKey: ['admin-payments-grouped'] });
    qc.invalidateQueries({ queryKey: ['admin-tuition-fees'] });
  };

  const confirmMut = useMutation({
    mutationFn: ({ paymentId, transactionId }: { paymentId: string; transactionId?: string }) =>
      adminApi.confirmMobileMoneyPayment(paymentId, { transactionId }),
    onSuccess: () => {
      toast.success('Paiement Mobile Money confirmé');
      invalidate();
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error ?? 'Erreur de confirmation'),
  });

  return (
    <Card className={compact ? 'p-3 sm:p-4' : 'p-4'}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
            <FiSmartphone className="h-4 w-4 text-emerald-600" aria-hidden />
            Mobile Money en attente
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            Confirmations manuelles / sandbox en attendant le webhook opérateur (
            <code className="text-[10px]">PAYMENT_WEBHOOK_SECRET</code>).
          </p>
        </div>
        <Badge variant="warning">{rows.length} en attente</Badge>
      </div>

      {isLoading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-4 text-sm text-stone-500">
          Aucun paiement Mobile Money en attente.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.id}
              className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">
                    {row.student?.user?.lastName} {row.student?.user?.firstName}
                    {row.student?.class?.name ? ` · ${row.student.class.name}` : ''}
                  </p>
                  <p className="text-xs text-stone-600">
                    {row.tuitionFee?.period} — {row.tuitionFee?.academicYear}
                    {row.paymentMethod || row.method
                      ? ` · ${row.paymentMethod || row.method}`
                      : ''}
                  </p>
                  <p className="text-xs text-stone-500">
                    {row.payer?.firstName} {row.payer?.lastName}
                    {row.paymentReference ? ` · réf. ${row.paymentReference}` : ''}
                    {' · '}
                    {format(new Date(row.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                  </p>
                </div>
                <p className="shrink-0 font-bold text-emerald-800">{formatFCFA(row.amount)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="min-w-[10rem] flex-1">
                  <Input
                    label="ID transaction (optionnel)"
                    value={txById[row.id] ?? row.transactionId ?? ''}
                    onChange={(e) => setTxById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    placeholder="Ex. MM-…"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    confirmMut.mutate({
                      paymentId: row.id,
                      transactionId: (txById[row.id] ?? '').trim() || undefined,
                    })
                  }
                  disabled={confirmMut.isPending}
                >
                  <FiCheck className="mr-1.5 h-3.5 w-3.5" />
                  Confirmer
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
