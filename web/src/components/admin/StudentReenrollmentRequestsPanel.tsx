'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiCheck, FiClipboard, FiInbox, FiRefreshCw, FiX } from 'react-icons/fi';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import {
  REENROLLMENT_STATUS_LABELS,
  reenrollmentRequesterLabel,
  reenrollmentReviewerLabel,
  reenrollmentStatusVariant,
  type ReenrollmentRequest,
  type ReenrollmentStats,
} from '@/lib/studentReenrollment';

type StatFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STAT_CARDS: Array<{
  filter: StatFilter;
  label: string;
  key: keyof ReenrollmentStats;
  cardClass: string;
  valueClass: string;
  icon: typeof FiInbox;
}> = [
  {
    filter: 'all',
    label: 'Total',
    key: 'total',
    cardClass: 'border-stone-200/80',
    valueClass: 'text-stone-900',
    icon: FiInbox,
  },
  {
    filter: 'PENDING',
    label: 'En attente',
    key: 'pending',
    cardClass: 'border-amber-200/80 bg-amber-50/40',
    valueClass: 'text-amber-900',
    icon: FiClipboard,
  },
  {
    filter: 'APPROVED',
    label: 'Approuvées',
    key: 'approved',
    cardClass: 'border-emerald-200/80 bg-emerald-50/40',
    valueClass: 'text-emerald-900',
    icon: FiCheck,
  },
  {
    filter: 'REJECTED',
    label: 'Refusées',
    key: 'rejected',
    cardClass: 'border-rose-200/80 bg-rose-50/40',
    valueClass: 'text-rose-900',
    icon: FiX,
  },
];

export default function StudentReenrollmentRequestsPanel() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatFilter>('PENDING');
  const [reviewTarget, setReviewTarget] = useState<ReenrollmentRequest | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [approvedClassId, setApprovedClassId] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [allowPromotionOverride, setAllowPromotionOverride] = useState(false);

  const { data: stats } = useQuery({
    queryKey: ['admin-reenrollment-request-stats'],
    queryFn: () => adminApi.getReenrollmentRequestStats(),
    staleTime: 30_000,
  });

  const { data: requests, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-reenrollment-requests', filter],
    queryFn: () =>
      adminApi.getReenrollmentRequests({
        ...(filter !== 'all' ? { status: filter } : {}),
      }),
  });

  const { data: classes } = useQuery({
    queryKey: ['admin-classes-reenrollment'],
    queryFn: adminApi.getClasses,
  });

  const reviewMutation = useMutation({
    mutationFn: () => {
      if (!reviewTarget) throw new Error('Aucune demande');
      return adminApi.updateReenrollmentRequest(reviewTarget.id, {
        status: decision,
        approvedClassId: decision === 'APPROVED' ? approvedClassId : undefined,
        adminComment: adminComment.trim() || undefined,
        effectiveDate: decision === 'APPROVED' ? effectiveDate : undefined,
        allowPromotionOverride: decision === 'APPROVED' ? allowPromotionOverride : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reenrollment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-reenrollment-request-stats'] });
      toast.success(decision === 'APPROVED' ? 'Réinscription approuvée' : 'Demande refusée');
      setReviewTarget(null);
      setAdminComment('');
      setApprovedClassId('');
      setAllowPromotionOverride(false);
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Traitement impossible');
    },
  });

  const list = (requests as ReenrollmentRequest[] | undefined) ?? [];
  const classList = (classes as Array<{ id: string; name: string; level: string; academicYear: string }> | undefined) ?? [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = filter === card.filter;
          return (
            <button
              key={card.filter}
              type="button"
              onClick={() => setFilter(card.filter)}
              className={`rounded-xl border p-3 text-left transition ${card.cardClass} ${
                active ? 'ring-2 ring-violet-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-stone-600">{card.label}</span>
                <Icon className="h-4 w-4 text-stone-400" />
              </div>
              <p className={`mt-1 text-xl font-bold tabular-nums ${card.valueClass}`}>
                {stats?.[card.key] ?? 0}
              </p>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" variant="secondary" onClick={() => refetch()} disabled={isFetching}>
          <FiRefreshCw className={`mr-1.5 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <Card className="overflow-hidden !p-0">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-stone-500">Chargement…</p>
        ) : list.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-500">Aucune demande pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left text-stone-600">
                  <th className="px-4 py-3 font-semibold">Élève</th>
                  <th className="px-4 py-3 font-semibold">Année</th>
                  <th className="px-4 py-3 font-semibold">Souhait</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((req) => {
                  const name = `${req.student?.user?.firstName ?? ''} ${req.student?.user?.lastName ?? ''}`.trim();
                  return (
                    <tr key={req.id} className="border-b border-stone-100 hover:bg-stone-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">{name || '—'}</div>
                        <div className="text-xs text-stone-500">
                          {req.student?.class?.name ? `Classe actuelle : ${req.student.class.name}` : 'Sans classe'}
                          {' · '}
                          {reenrollmentRequesterLabel(req.requestedByRole)}
                        </div>
                      </td>
                      <td className="px-4 py-3">{req.targetAcademicYear}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {req.preferredClass
                          ? `${req.preferredClass.name} (${req.preferredClass.level})`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={reenrollmentStatusVariant(req.status)} size="sm">
                          {REENROLLMENT_STATUS_LABELS[req.status]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                        {format(new Date(req.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {req.status === 'PENDING' ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setReviewTarget(req);
                              setDecision('APPROVED');
                              setApprovedClassId(
                                req.promotionHint?.suggestedClassId ||
                                  req.preferredClassId ||
                                  '',
                              );
                              setAdminComment('');
                              setAllowPromotionOverride(false);
                              setEffectiveDate(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            Traiter
                          </Button>
                        ) : (
                          <span className="text-xs text-stone-500">
                            {req.approvedClass?.name
                              ? `Affecté : ${req.approvedClass.name}`
                              : reenrollmentReviewerLabel(req.reviewedBy)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title="Traiter la demande de réinscription"
      >
        {reviewTarget ? (
          <div className="space-y-4">
            <p className="text-sm text-stone-700">
              <strong>
                {reviewTarget.student?.user?.firstName} {reviewTarget.student?.user?.lastName}
              </strong>{' '}
              — année {reviewTarget.targetAcademicYear}
            </p>
            {reviewTarget.message ? (
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                Message famille : {reviewTarget.message}
              </p>
            ) : null}

            {reviewTarget.promotionHint?.decision ? (
              <div
                className={`rounded-lg px-3 py-2 text-xs ${
                  reviewTarget.promotionHint.endOfCycle
                    ? 'bg-amber-50 text-amber-950 border border-amber-200'
                    : 'bg-violet-50 text-violet-950 border border-violet-200'
                }`}
              >
                <p className="font-semibold">
                  Décision fin d’année :{' '}
                  {reviewTarget.promotionHint.decision === 'ADMIS' ? 'Admis(e)' : 'Doublant(e)'}
                </p>
                {reviewTarget.promotionHint.endOfCycle ? (
                  <p className="mt-1">Fin de cycle — réinscription en classe supérieure non applicable.</p>
                ) : (
                  <p className="mt-1">
                    Niveau attendu : <strong>{reviewTarget.promotionHint.expectedLevel || '—'}</strong>
                    {reviewTarget.promotionHint.suggestedClassName
                      ? ` · Suggestion : ${reviewTarget.promotionHint.suggestedClassName}`
                      : ' · Aucune classe N+1 correspondante (lancez le rollover des classes).'}
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-600">
                Aucune décision Admis/Doublant enregistrée pour cet élève — contrôle de niveau non appliqué.
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDecision('APPROVED')}
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                  decision === 'APPROVED'
                    ? 'border-emerald-600 bg-emerald-600 text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                Approuver
              </button>
              <button
                type="button"
                onClick={() => setDecision('REJECTED')}
                className={`rounded-lg px-3 py-2 text-sm font-medium border ${
                  decision === 'REJECTED'
                    ? 'border-rose-600 bg-rose-600 text-white'
                    : 'border-stone-200 bg-white text-stone-700'
                }`}
              >
                Refuser
              </button>
            </div>

            {decision === 'APPROVED' ? (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-700">
                    Classe de destination *
                  </label>
                  <select
                    value={approvedClassId}
                    onChange={(e) => setApprovedClassId(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  >
                    <option value="">— Choisir —</option>
                    {classList
                      .filter((c) => c.academicYear === reviewTarget.targetAcademicYear)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.level}) — {c.academicYear}
                          {reviewTarget.promotionHint?.suggestedClassId === c.id
                            ? ' ★ suggérée'
                            : ''}
                        </option>
                      ))}
                  </select>
                  {classList.filter((c) => c.academicYear === reviewTarget.targetAcademicYear)
                    .length === 0 ? (
                    <p className="mt-1 text-xs text-rose-700">
                      Aucune classe pour {reviewTarget.targetAcademicYear}. Utilisez le rollover
                      d’année dans la gestion des classes.
                    </p>
                  ) : null}
                </div>
                <label className="inline-flex items-center gap-2 text-xs text-stone-700">
                  <input
                    type="checkbox"
                    checked={allowPromotionOverride}
                    onChange={(e) => setAllowPromotionOverride(e.target.checked)}
                  />
                  Forcer malgré la décision Admis/Doublant (dérogation)
                </label>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-700">Date effective</label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700">
                Commentaire {decision === 'REJECTED' ? '*' : '(optionnel)'}
              </label>
              <textarea
                rows={3}
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm"
                placeholder={
                  decision === 'REJECTED' ? 'Motif du refus…' : 'Message pour la famille…'
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setReviewTarget(null)}>
                Fermer
              </Button>
              <Button
                type="button"
                disabled={reviewMutation.isPending}
                onClick={() => {
                  if (decision === 'APPROVED' && !approvedClassId) {
                    toast.error('Choisissez une classe');
                    return;
                  }
                  if (decision === 'REJECTED' && !adminComment.trim()) {
                    toast.error('Le motif de refus est obligatoire');
                    return;
                  }
                  reviewMutation.mutate();
                }}
              >
                {reviewMutation.isPending ? 'Enregistrement…' : 'Confirmer'}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
