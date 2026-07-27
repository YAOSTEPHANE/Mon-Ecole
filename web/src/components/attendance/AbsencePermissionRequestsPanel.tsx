'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiCalendar, FiFile, FiPlus, FiX } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import ImageUpload from '../ui/ImageUpload';
import {
  ABSENCE_PERMISSION_MOTIF_LABELS,
  ABSENCE_PERMISSION_STATUS_LABELS,
  absencePermissionReviewerLabel,
  absencePermissionStatusVariant,
  ABSENCE_PERMISSION_DELETE_BLOCKED_MESSAGE,
  type AbsencePermissionMotif,
  type AbsencePermissionRequest,
} from '@/lib/studentAbsencePermission';

type AbsencePermissionRequestsPanelProps = {
  mode: 'student' | 'parent';
  studentId?: string;
  queryKey: string[];
  fetchRequests: () => Promise<AbsencePermissionRequest[]>;
  createRequest: (payload: {
    startDate: string;
    endDate: string;
    motif: AbsencePermissionMotif;
    reasonDetail: string;
    justificationDocuments?: string[];
  }) => Promise<AbsencePermissionRequest>;
  cancelRequest?: (id: string) => Promise<AbsencePermissionRequest>;
};

const emptyForm = {
  startDate: '',
  endDate: '',
  motif: 'MEDICAL' as AbsencePermissionMotif,
  reasonDetail: '',
};

export default function AbsencePermissionRequestsPanel({
  mode,
  queryKey,
  fetchRequests,
  createRequest,
  cancelRequest,
}: AbsencePermissionRequestsPanelProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [documents, setDocuments] = useState<string[]>([]);

  const { data: requests, isLoading } = useQuery({
    queryKey,
    queryFn: fetchRequests,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRequest({
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        motif: form.motif,
        reasonDetail: form.reasonDetail.trim(),
        justificationDocuments: documents.length > 0 ? documents : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Demande de permission enregistrée');
      setShowForm(false);
      setForm(emptyForm);
      setDocuments([]);
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Envoi impossible');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => {
      if (!cancelRequest) {
        return Promise.reject(new Error('Annulation non disponible'));
      }
      return cancelRequest(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Demande annulée');
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Annulation impossible');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Indiquez la période d’absence');
      return;
    }
    if (form.reasonDetail.trim().length < 10) {
      toast.error('La justification doit contenir au moins 10 caractères');
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) {
      toast.error('La date de fin doit être après la date de début');
      return;
    }
    createMutation.mutate();
  };

  const handleDocumentUpload = (url: string) => {
    setDocuments((prev) => (prev.includes(url) ? prev : [...prev, url]));
    toast.success('Document ajouté à la demande');
  };

  const list = requests ?? [];

  return (
    <div className="space-y-4">
      <div className="dash-section-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-stone-900">Demandes de permission d&apos;absence</h2>
            <p className="mt-1 text-sm text-stone-600">
              {mode === 'student'
                ? 'Déposez une demande anticipée pour une absence prévue (médical, familial ou autre).'
                : 'Déposez une demande pour votre enfant avant une absence prévue.'}
            </p>
          </div>
          <Button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex shrink-0 items-center gap-2">
            <FiPlus className="h-4 w-4" aria-hidden />
            {showForm ? 'Fermer' : 'Nouvelle demande'}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4 border-t border-stone-200/80 pt-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="perm-start" className="mb-1 block text-sm font-medium text-stone-700">
                  Date de début
                </label>
                <input
                  id="perm-start"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="dash-search-field w-full rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="perm-end" className="mb-1 block text-sm font-medium text-stone-700">
                  Date de fin
                </label>
                <input
                  id="perm-end"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="dash-search-field w-full rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="perm-motif" className="mb-1 block text-sm font-medium text-stone-700">
                Motif
              </label>
              <select
                id="perm-motif"
                value={form.motif}
                onChange={(e) =>
                  setForm((f) => ({ ...f, motif: e.target.value as AbsencePermissionMotif }))
                }
                className="dash-search-field w-full max-w-md rounded-xl px-3 py-2.5 text-sm"
              >
                {(Object.keys(ABSENCE_PERMISSION_MOTIF_LABELS) as AbsencePermissionMotif[]).map((k) => (
                  <option key={k} value={k}>
                    {ABSENCE_PERMISSION_MOTIF_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="perm-reason" className="mb-1 block text-sm font-medium text-stone-700">
                Justification <span className="text-rose-600">*</span>
              </label>
              <textarea
                id="perm-reason"
                required
                rows={4}
                value={form.reasonDetail}
                onChange={(e) => setForm((f) => ({ ...f, reasonDetail: e.target.value }))}
                placeholder="Décrivez le contexte de l’absence (minimum 10 caractères)…"
                className="dash-search-field w-full resize-none rounded-xl px-3 py-2.5 text-sm"
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-stone-700">Pièces jointes (optionnel)</p>
              <ImageUpload onUpload={handleDocumentUpload} type="assignment" label="Ajouter un justificatif" />
              {documents.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {documents.map((url) => (
                    <li
                      key={url}
                      className="flex items-center justify-between gap-2 rounded-lg border border-stone-200/80 bg-stone-50/80 px-3 py-2 text-sm"
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-w-0 items-center gap-2 truncate text-cptb-blue hover:underline"
                      >
                        <FiFile className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="truncate">Document joint</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setDocuments((prev) => prev.filter((d) => d !== url))}
                        className="rounded-lg p-1 text-stone-500 hover:bg-stone-200/80 hover:text-stone-800"
                        aria-label="Retirer le document"
                      >
                        <FiX className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Envoi…' : 'Soumettre la demande'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(emptyForm);
                  setDocuments([]);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>

      <Card className="!p-0 overflow-hidden ring-stone-200/60">
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-amber-600" />
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            <FiCalendar className="mx-auto mb-3 h-10 w-10 text-stone-300" aria-hidden />
            Aucune demande de permission pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-stone-200/80">
            {list.map((req) => {
              const days =
                differenceInCalendarDays(new Date(req.endDate), new Date(req.startDate)) + 1;
              return (
                <div key={req.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={absencePermissionStatusVariant(req.status)} size="sm">
                        {ABSENCE_PERMISSION_STATUS_LABELS[req.status]}
                      </Badge>
                      <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                        {ABSENCE_PERMISSION_MOTIF_LABELS[req.motif]}
                      </span>
                      {req.requestedByRole === 'PARENT' && (
                        <span className="text-xs text-stone-500">· via parent</span>
                      )}
                    </div>
                    <p className="mt-2 font-display text-sm font-bold text-stone-900">
                      {format(new Date(req.startDate), 'd MMM yyyy', { locale: fr })}
                      {' — '}
                      {format(new Date(req.endDate), 'd MMM yyyy', { locale: fr })}
                      <span className="ml-2 font-normal text-stone-500">
                        ({days} jour{days > 1 ? 's' : ''})
                      </span>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-stone-600">{req.reasonDetail}</p>
                    {req.adminComment && (req.status === 'REJECTED' || req.status === 'APPROVED') && (
                      <p
                        className={`mt-2 text-sm ${
                          req.status === 'REJECTED' ? 'text-rose-800' : 'text-emerald-900'
                        }`}
                      >
                        <strong>
                          {req.status === 'REJECTED' ? 'Motif du refus' : 'Message de la direction'} :
                        </strong>{' '}
                        {req.adminComment}
                      </p>
                    )}
                    {req.reviewedAt && (req.status === 'APPROVED' || req.status === 'REJECTED') && (
                      <p className="mt-1 text-xs text-stone-500">
                        Révisée par {absencePermissionReviewerLabel(req.reviewedBy)} le{' '}
                        {format(new Date(req.reviewedAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    )}
                    {req.justificationDocuments?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {req.justificationDocuments.map((url, i) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200/80"
                          >
                            <FiFile className="h-3 w-3" aria-hidden />
                            Pièce {i + 1}
                          </a>
                        ))}
                      </div>
                    )}
                    {req.status === 'APPROVED' && (
                      <p className="mt-2 text-xs text-emerald-800">
                        {ABSENCE_PERMISSION_DELETE_BLOCKED_MESSAGE}
                      </p>
                    )}
                    <p className="mt-2 text-[11px] text-stone-400">
                      Déposée le {format(new Date(req.createdAt), 'd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  {req.status === 'PENDING' && cancelRequest && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      disabled={cancelMutation.isPending}
                      onClick={() => cancelMutation.mutate(req.id)}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
