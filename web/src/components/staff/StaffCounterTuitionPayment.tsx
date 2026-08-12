'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { staffApi } from '../../services/api/staff.api';
import type { SupportStaffKindKey } from '@/views/staff/staffSpaceConfig';
import { FiDollarSign, FiSearch, FiUser } from 'react-icons/fi';
import PendingCashPaymentsPanel from '../payments/PendingCashPaymentsPanel';

const COUNTER_KINDS = new Set<SupportStaffKindKey>(['SECRETARY', 'BURSAR', 'ACCOUNTANT']);

function formatFcfa(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
}

type StudentRow = {
  id: string;
  studentId: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  class?: { name?: string; level?: string; academicYear?: string };
};

type FeeRow = {
  id: string;
  period: string;
  academicYear: string;
  amount: number;
  isPaid: boolean;
  feeType?: string;
  remainingAmount: number;
  totalPaid: number;
};

export function staffCanRecordCounterPayment(supportKind: SupportStaffKindKey): boolean {
  return COUNTER_KINDS.has(supportKind);
}

interface StaffCounterTuitionPaymentProps {
  supportKind: SupportStaffKindKey;
}

export default function StaffCounterTuitionPayment({ supportKind }: StaffCounterTuitionPaymentProps) {
  const qc = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [tuitionFeeId, setTuitionFeeId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const { data: searchResults = [], isFetching: searchLoading } = useQuery({
    queryKey: ['staff-counter-students', debouncedQ],
    queryFn: () => staffApi.searchStudentsForCounter(debouncedQ),
    enabled: debouncedQ.length >= 2,
  });

  const { data: fees = [], isLoading: feesLoading } = useQuery({
    queryKey: ['staff-counter-fees', selectedStudent?.id],
    queryFn: () => staffApi.getStudentTuitionFeesForCounter(selectedStudent!.id),
    enabled: !!selectedStudent?.id,
  });

  const selectedFee = useMemo(
    () => (fees as FeeRow[]).find((f) => f.id === tuitionFeeId),
    [fees, tuitionFeeId],
  );

  const payableFees = useMemo(
    () => (fees as FeeRow[]).filter((f) => f.remainingAmount > 0),
    [fees],
  );

  useEffect(() => {
    if (!selectedStudent) {
      setTuitionFeeId('');
      setAmountStr('');
      return;
    }
    const list = payableFees;
    const firstUnpaid = list[0];
    if (firstUnpaid) {
      setTuitionFeeId(firstUnpaid.id);
      setAmountStr(String(Math.round(firstUnpaid.remainingAmount)));
    } else {
      setTuitionFeeId('');
      setAmountStr('');
    }
  }, [selectedStudent, payableFees]);

  const recordMutation = useMutation({
    mutationFn: () =>
      staffApi.recordCounterTuitionPayment(selectedStudent!.id, {
        tuitionFeeId,
        amount: Number(amountStr.replace(',', '.')),
        paymentMethod,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Paiement enregistré et ligne de frais mise à jour.');
      setNotes('');
      void qc.invalidateQueries({ queryKey: ['staff-counter-fees', selectedStudent!.id] });
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (e instanceof Error ? e.message : 'Erreur');
      toast.error(msg);
    },
  });

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedStudent || !tuitionFeeId) {
        toast.error('Sélectionnez un élève et une ligne de frais.');
        return;
      }
      recordMutation.mutate();
    },
    [selectedStudent, tuitionFeeId, recordMutation],
  );

  if (!staffCanRecordCounterPayment(supportKind)) {
    return null;
  }

  return (
    <div className="space-y-4">
      <PendingCashPaymentsPanel mode="staff" compact />
    <Card className="p-5 sm:p-6 border border-emerald-200/80 bg-gradient-to-br from-white via-emerald-50/40 to-teal-50/30 shadow-sm ring-1 ring-emerald-900/5">
      <div className="flex items-start gap-3 mb-5">
        <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200/70">
          <FiDollarSign className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-stone-900">Encaissement scolarité (guichet)</h2>
          <p className="text-sm text-stone-600 mt-1 leading-relaxed">
            Enregistrez un paiement en espèces ou par virement reçu à l&apos;école. Le montant est appliqué tout de
            suite sur la ligne de frais choisie (comme un paiement confirmé).
          </p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="staff-counter-search" className="block text-xs font-semibold text-stone-600 mb-1.5">
            Rechercher un élève (nom ou numéro)
          </label>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" aria-hidden />
            <input
              id="staff-counter-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Au moins 2 caractères…"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              autoComplete="off"
            />
          </div>
          {debouncedQ.length >= 2 && (
            <div className="mt-2 rounded-xl border border-stone-200 bg-white max-h-52 overflow-y-auto shadow-sm">
              {searchLoading ? (
                <p className="p-3 text-sm text-stone-500">Recherche…</p>
              ) : (searchResults as StudentRow[]).length === 0 ? (
                <p className="p-3 text-sm text-stone-500">Aucun élève trouvé.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {(searchResults as StudentRow[]).map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudent(s);
                          setSearchInput('');
                          setDebouncedQ('');
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-emerald-50/80 flex items-start gap-2"
                      >
                        <FiUser className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" aria-hidden />
                        <span className="min-w-0">
                          <span className="font-medium text-stone-900 block truncate">
                            {s.user?.firstName} {s.user?.lastName}
                          </span>
                          <span className="text-xs text-stone-500 tabular-nums">
                            N° {s.studentId}
                            {s.class?.name ? ` · ${s.class.name}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {selectedStudent && (
          <div className="rounded-xl border border-stone-200 bg-white/90 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold uppercase text-stone-500">Élève sélectionné</p>
                <p className="font-semibold text-stone-900">
                  {selectedStudent.user?.firstName} {selectedStudent.user?.lastName}{' '}
                  <span className="text-stone-500 font-normal text-sm">({selectedStudent.studentId})</span>
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
                Changer
              </Button>
            </div>

            {feesLoading ? (
              <p className="text-sm text-stone-500">Chargement des frais…</p>
            ) : (fees as FeeRow[]).length === 0 ? (
              <p className="text-sm text-amber-800">Aucune ligne de frais pour cet élève.</p>
            ) : payableFees.length === 0 ? (
              <p className="text-sm text-emerald-800 font-medium">Toutes les lignes de frais sont soldées.</p>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="staff-counter-fee" className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Ligne de frais
                  </label>
                  <select
                    id="staff-counter-fee"
                    title="Ligne de frais à régler"
                    value={tuitionFeeId}
                    onChange={(e) => {
                      setTuitionFeeId(e.target.value);
                      const f = payableFees.find((x) => x.id === e.target.value);
                      if (f) setAmountStr(String(Math.round(f.remainingAmount)));
                    }}
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40"
                  >
                    {payableFees.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.period} — {f.academicYear} — Reste {formatFcfa(f.remainingAmount)} FCFA
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="staff-counter-amount" className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Montant (FCFA)
                    </label>
                    <input
                      id="staff-counter-amount"
                      inputMode="decimal"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm tabular-nums focus:ring-2 focus:ring-emerald-500/40"
                    />
                    {selectedFee && (
                      <p className="text-[11px] text-stone-500 mt-1">
                        Reste dû sur cette ligne : {formatFcfa(selectedFee.remainingAmount)} FCFA
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="staff-counter-method" className="block text-xs font-semibold text-stone-600 mb-1.5">
                      Mode de paiement
                    </label>
                    <select
                      id="staff-counter-method"
                      title="Mode de paiement"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'BANK_TRANSFER')}
                      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40"
                    >
                      <option value="CASH">Espèces</option>
                      <option value="BANK_TRANSFER">Virement (encaissé)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="staff-counter-notes" className="block text-xs font-semibold text-stone-600 mb-1.5">
                    Commentaire (optionnel)
                  </label>
                  <input
                    id="staff-counter-notes"
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex. reçu papier n°, nom du payeur…"
                    className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/40"
                  />
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button type="submit" variant="success" isLoading={recordMutation.isPending}>
                    Valider l&apos;encaissement
                  </Button>
                  {selectedFee?.isPaid && <Badge variant="success">Ligne soldée</Badge>}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </Card>
    </div>
  );
}
