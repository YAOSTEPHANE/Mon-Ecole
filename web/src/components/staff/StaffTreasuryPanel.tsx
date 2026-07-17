'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { staffApi } from '@/services/api/staff.api';
import Card from '../ui/Card';
import PendingCashPaymentsPanel from '../payments/PendingCashPaymentsPanel';

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

export default function StaffTreasuryPanel() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['staff-treasury-summary'],
    queryFn: staffApi.getTreasurySummary,
  });
  const { data: overdue = [] } = useQuery({
    queryKey: ['staff-treasury-overdue'],
    queryFn: staffApi.listTreasuryOverdue,
  });
  const { data: recent = [] } = useQuery({
    queryKey: ['staff-treasury-recent'],
    queryFn: staffApi.listTreasuryRecentPayments,
  });

  return (
    <div className="space-y-4">
      <PendingCashPaymentsPanel mode="staff" />
      {summaryLoading ? (
        <p className="text-sm text-stone-500">Chargement…</p>
      ) : summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-stone-500">Encours total</p>
            <p className="text-lg font-bold text-amber-800">{formatFcfa(summary.totalOutstanding)} FCFA</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-stone-500">Lignes impayées</p>
            <p className="text-lg font-bold">{summary.unpaidLines}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-stone-500">Encaissé aujourd’hui</p>
            <p className="text-lg font-bold text-emerald-700">{formatFcfa(summary.collectedToday)} FCFA</p>
            <p className="text-[10px] text-stone-500">{summary.paymentsTodayCount} paiement(s)</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-stone-500">Encaissé ce mois</p>
            <p className="text-lg font-bold text-emerald-700">{formatFcfa(summary.collectedMonth)} FCFA</p>
            <p className="text-[10px] text-stone-500">{summary.paymentsMonthCount} paiement(s)</p>
          </Card>
        </div>
      ) : null}

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Échéances dépassées ({summary?.overdueCount ?? 0})</h3>
        <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
          {(overdue as Array<{
            id: string;
            period: string;
            dueDate: string;
            remainingAmount: number;
            student: { user: { firstName: string; lastName: string }; class?: { name: string } | null };
          }>).map((f) => (
            <li key={f.id} className="flex justify-between gap-2 border-b border-stone-100 pb-2">
              <span>
                {f.student.user.lastName} {f.student.user.firstName}
                {f.student.class?.name ? ` · ${f.student.class.name}` : ''}
                <span className="block text-xs text-stone-500">{f.period}</span>
              </span>
              <span className="font-medium text-rose-700 shrink-0">{formatFcfa(f.remainingAmount)} FCFA</span>
            </li>
          ))}
          {(overdue as unknown[]).length === 0 && (
            <li className="text-stone-500 text-xs">Aucun impayé en retard.</li>
          )}
        </ul>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3">Derniers encaissements</h3>
        <ul className="space-y-2 max-h-64 overflow-y-auto text-sm">
          {(recent as Array<{
            id: string;
            amount: number;
            paymentMethod: string;
            paidAt?: string | null;
            student: { user: { firstName: string; lastName: string } };
            tuitionFee?: { period: string } | null;
          }>).map((p) => (
            <li key={p.id} className="flex justify-between gap-2 border-b border-stone-100 pb-2">
              <span>
                {p.student.user.lastName} {p.student.user.firstName}
                <span className="block text-xs text-stone-500">
                  {p.tuitionFee?.period} · {p.paymentMethod}
                  {p.paidAt ? ` · ${format(new Date(p.paidAt), 'dd/MM/yyyy HH:mm', { locale: fr })}` : ''}
                </span>
              </span>
              <span className="font-medium text-emerald-700 shrink-0">{formatFcfa(p.amount)} FCFA</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
