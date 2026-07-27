'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiCalendar, FiCheck, FiClipboard, FiEye, FiInbox, FiTrash2, FiX } from 'react-icons/fi';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { ADM } from './adminModuleLayout';
import AbsencePermissionReviewModal, {
  type AbsencePermissionReviewDecision,
} from './AbsencePermissionReviewModal';
import {
  ABSENCE_PERMISSION_MOTIF_LABELS,
  ABSENCE_PERMISSION_STATUS_LABELS,
  ABSENCE_PERMISSION_DELETE_BLOCKED_MESSAGE,
  absencePermissionReviewerLabel,
  absencePermissionStatusVariant,
  canDeleteAbsencePermission,
  type AbsencePermissionRequest,
  type AbsencePermissionStats,
} from '@/lib/studentAbsencePermission';

type StatFilter = 'all' | 'PENDING' | 'APPROVED' | 'REJECTED';

const STAT_CARDS: Array<{
  filter: StatFilter;
  label: string;
  key: keyof AbsencePermissionStats;
  cardClass: string;
  valueClass: string;
  icon: typeof FiInbox;
}> = [
  {
    filter: 'all',
    label: 'Total',
    key: 'total',
    cardClass: 'border-stone-200/80 ring-stone-200/70',
    valueClass: 'text-stone-900',
    icon: FiInbox,
  },
  {
    filter: 'PENDING',
    label: 'En attente',
    key: 'pending',
    cardClass: 'border-amber-200/80 bg-amber-50/40 ring-amber-100/80',
    valueClass: 'text-amber-900',
    icon: FiClipboard,
  },
  {
    filter: 'APPROVED',
    label: 'Approuvées',
    key: 'approved',
    cardClass: 'border-emerald-200/80 bg-emerald-50/40 ring-emerald-100/80',
    valueClass: 'text-emerald-900',
    icon: FiCheck,
  },
  {
    filter: 'REJECTED',
    label: 'Refusées',
    key: 'rejected',
    cardClass: 'border-rose-200/80 bg-rose-50/40 ring-rose-100/80',
    valueClass: 'text-rose-900',
    icon: FiX,
  },
];

const StudentAbsencePermissionsPanel = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<StatFilter>('PENDING');
  const [reviewTarget, setReviewTarget] = useState<AbsencePermissionRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<AbsencePermissionReviewDecision>('APPROVED');
  const [reviewComment, setReviewComment] = useState('');

  const { data: requests, isLoading } = useQuery({
    queryKey: ['admin-absence-permission-requests', filter],
    queryFn: () =>
      adminApi.getAbsencePermissionRequests(filter === 'all' ? undefined : { status: filter }),
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-absence-permission-request-stats'],
    queryFn: () => adminApi.getAbsencePermissionRequestStats(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: { id: string; status: 'APPROVED' | 'REJECTED'; adminComment?: string }) =>
      adminApi.updateAbsencePermissionRequest(payload.id, {
        status: payload.status,
        ...(payload.adminComment !== undefined && { adminComment: payload.adminComment }),
      }),
    onSuccess: (data: AbsencePermissionRequest & { absencesUpdated?: number }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-absence-permission-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-absence-permission-request-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-absences-overview'] });
      const extra =
        data.absencesUpdated && data.absencesUpdated > 0
          ? ` — ${data.absencesUpdated} absence(s) marquée(s) excusée(s).`
          : '';
      toast.success(`Décision enregistrée — la famille a été notifiée.${extra}`);
      closeReview();
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Mise à jour impossible');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteAbsencePermissionRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-absence-permission-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-absence-permission-request-stats'] });
      toast.success('Demande supprimée');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      toast.error(err.response?.data?.error || 'Suppression impossible');
    },
  });

  const list = (requests as AbsencePermissionRequest[]) ?? [];
  const counts: AbsencePermissionStats = stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 };

  const openReview = (req: AbsencePermissionRequest) => {
    setReviewTarget(req);
    setReviewDecision('APPROVED');
    setReviewComment('');
  };

  const closeReview = () => {
    setReviewTarget(null);
    setReviewComment('');
    setReviewDecision('APPROVED');
  };

  const confirmReview = () => {
    if (!reviewTarget) return;
    const trimmed = reviewComment.trim();
    if (reviewDecision === 'REJECTED' && !trimmed) {
      toast.error('Le motif de refus est obligatoire.');
      return;
    }
    updateMutation.mutate({
      id: reviewTarget.id,
      status: reviewDecision,
      adminComment: trimmed || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className={ADM.grid4}>
        {STAT_CARDS.map((card) => {
          const Icon = card.icon;
          const active = filter === card.filter;
          return (
            <button
              key={card.filter}
              type="button"
              onClick={() => setFilter(card.filter)}
              className={`text-left ${ADM.statCard} border ${card.cardClass} ${
                active ? 'ring-2 ring-teal-500/60 shadow-md' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={ADM.statLabel}>{card.label}</p>
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-teal-700' : 'text-stone-400'}`} aria-hidden />
              </div>
              <p className={`${ADM.statValTone} ${card.valueClass}`}>
                {statsLoading ? '—' : counts[card.key]}
              </p>
              {card.filter === 'PENDING' && counts.pending > 0 ? (
                <p className={ADM.statHint}>À réviser en priorité</p>
              ) : card.filter === 'all' ? (
                <p className={ADM.statHint}>Toutes les demandes déposées</p>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card className="border border-teal-100 bg-teal-50/40 p-4">
        <p className="flex items-start gap-2 text-sm text-gray-700">
          <FiClipboard className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" aria-hidden />
          <span>
            <strong>Révision par directeur ou administrateur</strong> — examinez chaque demande de
            permission d&apos;absence.{' '}
            <strong>Auto-excusement :</strong> à l&apos;approbation, les absences enregistrées sur la
            période sont automatiquement excusées.{' '}
            <strong>Les demandes approuvées ne peuvent pas être supprimées</strong> (historique et
            traçabilité).
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STAT_CARDS.map((f) => (
            <button
              key={f.filter}
              type="button"
              onClick={() => setFilter(f.filter)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                filter === f.filter
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-teal-900 ring-1 ring-teal-200 hover:bg-teal-50'
              }`}
            >
              {f.label}
              {f.key !== 'total' && counts[f.key] > 0 ? ` (${counts[f.key]})` : ''}
            </button>
          ))}
        </div>
      </Card>

      <Card className="!p-0 overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-teal-600" />
          </div>
        ) : list.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-stone-500">Aucune demande pour ce filtre.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/80 text-left text-stone-600">
                  <th className="px-4 py-3 font-semibold">Élève</th>
                  <th className="px-4 py-3 font-semibold">Motif</th>
                  <th className="px-4 py-3 font-semibold">Période</th>
                  <th className="px-4 py-3 font-semibold">Statut</th>
                  <th className="max-w-[220px] px-4 py-3 font-semibold">Décision direction</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((req) => {
                  const studentName = `${req.student?.user?.firstName ?? ''} ${req.student?.user?.lastName ?? ''}`.trim();
                  const days =
                    differenceInCalendarDays(new Date(req.endDate), new Date(req.startDate)) + 1;
                  return (
                    <tr key={req.id} className="border-b border-stone-100 hover:bg-stone-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">{studentName || 'Élève'}</div>
                        <div className="text-xs text-stone-500">
                          {req.student?.class?.name ?? '—'}
                          {' · '}
                          {req.requestedByRole === 'PARENT' ? 'via parent' : 'via élève'}
                        </div>
                      </td>
                      <td className="px-4 py-3">{ABSENCE_PERMISSION_MOTIF_LABELS[req.motif]}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1 text-stone-800">
                          <FiCalendar className="h-3.5 w-3.5 text-stone-400" aria-hidden />
                          {format(new Date(req.startDate), 'dd MMM', { locale: fr })}
                          {' — '}
                          {format(new Date(req.endDate), 'dd MMM yyyy', { locale: fr })}
                        </div>
                        <div className="text-xs text-stone-500">
                          {days} jour{days > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={absencePermissionStatusVariant(req.status)} size="sm">
                          {ABSENCE_PERMISSION_STATUS_LABELS[req.status]}
                        </Badge>
                      </td>
                      <td className="max-w-[220px] px-4 py-3 text-xs text-stone-600">
                        {req.status === 'PENDING' ? (
                          <span className="text-stone-400">À réviser</span>
                        ) : (
                          <div className="space-y-1">
                            {req.adminComment ? (
                              <p className="line-clamp-3" title={req.adminComment}>
                                {req.adminComment}
                              </p>
                            ) : (
                              <p className="text-stone-400">—</p>
                            )}
                            {req.reviewedAt ? (
                              <p className="text-[11px] text-stone-500">
                                Par {absencePermissionReviewerLabel(req.reviewedBy)} le{' '}
                                {format(new Date(req.reviewedAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                              </p>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'PENDING' ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="inline-flex items-center gap-1"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                              onClick={() => openReview(req)}
                            >
                              <FiEye className="h-3.5 w-3.5" aria-hidden />
                              Réviser
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="inline-flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                              onClick={() => {
                                openReview(req);
                                setReviewDecision('APPROVED');
                              }}
                            >
                              <FiCheck className="h-3.5 w-3.5" aria-hidden />
                              Approuver
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="inline-flex items-center gap-1 text-rose-700 ring-rose-200 hover:bg-rose-50"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                              onClick={() => {
                                openReview(req);
                                setReviewDecision('REJECTED');
                              }}
                            >
                              <FiX className="h-3.5 w-3.5" aria-hidden />
                              Refuser
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="inline-flex items-center gap-1 text-rose-700 ring-rose-200 hover:bg-rose-50"
                              disabled={updateMutation.isPending || deleteMutation.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    'Supprimer définitivement cette demande ? Cette action est irréversible.'
                                  )
                                ) {
                                  deleteMutation.mutate(req.id);
                                }
                              }}
                            >
                              <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                              Supprimer
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-stone-400">Traitée</span>
                            {canDeleteAbsencePermission(req.status) ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="inline-flex items-center gap-1 text-rose-700 ring-rose-200 hover:bg-rose-50"
                                disabled={deleteMutation.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Supprimer définitivement cette demande ? Cette action est irréversible.'
                                    )
                                  ) {
                                    deleteMutation.mutate(req.id);
                                  }
                                }}
                              >
                                <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
                                Supprimer
                              </Button>
                            ) : (
                              <span
                                className="text-[11px] text-stone-500"
                                title={ABSENCE_PERMISSION_DELETE_BLOCKED_MESSAGE}
                              >
                                Non supprimable
                              </span>
                            )}
                          </div>
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

      {reviewTarget && (
        <AbsencePermissionReviewModal
          request={reviewTarget}
          decision={reviewDecision}
          comment={reviewComment}
          isSubmitting={updateMutation.isPending}
          onDecisionChange={setReviewDecision}
          onCommentChange={setReviewComment}
          onClose={closeReview}
          onConfirm={confirmReview}
        />
      )}
    </div>
  );
};

export default StudentAbsencePermissionsPanel;
