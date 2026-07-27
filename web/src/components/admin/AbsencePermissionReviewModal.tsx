'use client';

import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiCheck, FiFile, FiX } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import {
  ABSENCE_PERMISSION_MOTIF_LABELS,
  ABSENCE_PERMISSION_STATUS_LABELS,
  absencePermissionStatusVariant,
  type AbsencePermissionRequest,
} from '@/lib/studentAbsencePermission';

export type AbsencePermissionReviewDecision = 'APPROVED' | 'REJECTED';

type AbsencePermissionReviewModalProps = {
  request: AbsencePermissionRequest;
  decision: AbsencePermissionReviewDecision;
  comment: string;
  isSubmitting: boolean;
  onDecisionChange: (decision: AbsencePermissionReviewDecision) => void;
  onCommentChange: (comment: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export default function AbsencePermissionReviewModal({
  request,
  decision,
  comment,
  isSubmitting,
  onDecisionChange,
  onCommentChange,
  onClose,
  onConfirm,
}: AbsencePermissionReviewModalProps) {
  const studentName = `${request.student?.user?.firstName ?? ''} ${request.student?.user?.lastName ?? ''}`.trim();
  const days =
    differenceInCalendarDays(new Date(request.endDate), new Date(request.startDate)) + 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-perm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto p-5" hover={false}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="review-perm-title" className="text-lg font-bold text-stone-900">
              Révision par la direction
            </h3>
            <p className="mt-1 text-sm text-stone-600">
              Approuvez ou refusez la demande. Les familles sont notifiées par e-mail et dans l&apos;application.
              À l&apos;approbation, les absences déjà enregistrées sur la période sont automatiquement excusées.
            </p>
          </div>
          <Badge variant={absencePermissionStatusVariant(request.status)} size="sm">
            {ABSENCE_PERMISSION_STATUS_LABELS[request.status]}
          </Badge>
        </div>

        <div className="mt-5 rounded-xl border border-stone-200/80 bg-stone-50/80 p-4 text-sm">
          <p className="font-semibold text-stone-900">
            {studentName || 'Élève'}
            {request.student?.class?.name ? (
              <span className="ml-2 font-normal text-stone-500">· {request.student.class.name}</span>
            ) : null}
          </p>
          <p className="mt-2 text-stone-700">
            <strong>{ABSENCE_PERMISSION_MOTIF_LABELS[request.motif]}</strong>
            {' — '}
            {format(new Date(request.startDate), 'd MMM yyyy', { locale: fr })}
            {' au '}
            {format(new Date(request.endDate), 'd MMM yyyy', { locale: fr })}
            <span className="text-stone-500">
              {' '}
              ({days} jour{days > 1 ? 's' : ''})
            </span>
          </p>
          <p className="mt-3 leading-relaxed text-stone-600">{request.reasonDetail}</p>
          <p className="mt-2 text-xs text-stone-500">
            Déposée par {request.requestedByRole === 'PARENT' ? 'un parent' : "l'élève"} le{' '}
            {format(new Date(request.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}
          </p>
          {request.justificationDocuments?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {request.justificationDocuments.map((url, i) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"
                >
                  <FiFile className="h-3 w-3" aria-hidden />
                  Pièce {i + 1}
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5">
          <p className="text-sm font-medium text-stone-700">Décision</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onDecisionChange('APPROVED')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                decision === 'APPROVED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-emerald-50'
              }`}
            >
              <FiCheck className="h-4 w-4" aria-hidden />
              Approuver
            </button>
            <button
              type="button"
              onClick={() => onDecisionChange('REJECTED')}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                decision === 'REJECTED'
                  ? 'bg-rose-700 text-white'
                  : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-rose-50'
              }`}
            >
              <FiX className="h-4 w-4" aria-hidden />
              Refuser
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="review-comment" className="block text-sm font-medium text-stone-700">
            Commentaire de la direction
            {decision === 'REJECTED' ? (
              <span className="text-rose-600"> *</span>
            ) : (
              <span className="font-normal text-stone-500"> (optionnel)</span>
            )}
          </label>
          <textarea
            id="review-comment"
            rows={4}
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            disabled={isSubmitting}
            placeholder={
              decision === 'REJECTED'
                ? 'Motif du refus communiqué à la famille…'
                : 'Message optionnel pour la famille (ex. : demande acceptée, bon rétablissement…)…'
            }
            className="mt-1 w-full resize-none rounded-xl border border-stone-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={isSubmitting} onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            className={
              decision === 'REJECTED'
                ? 'bg-rose-700 hover:bg-rose-800'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }
            onClick={onConfirm}
          >
            {isSubmitting
              ? 'Enregistrement…'
              : decision === 'APPROVED'
                ? 'Confirmer l’approbation'
                : 'Confirmer le refus'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
