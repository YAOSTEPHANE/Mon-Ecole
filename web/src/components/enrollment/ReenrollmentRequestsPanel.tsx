'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { FiPlus, FiRefreshCw, FiX } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { getCurrentAcademicYear } from '@/utils/academicYear';
import {
  REENROLLMENT_STATUS_LABELS,
  reenrollmentRequesterLabel,
  reenrollmentReviewerLabel,
  reenrollmentStatusVariant,
  type ReenrollmentClassOption,
  type ReenrollmentRequest,
} from '@/lib/studentReenrollment';

type ReenrollmentOptions = {
  studentId: string;
  enrollmentStatus?: string;
  currentClassId?: string | null;
  classes: ReenrollmentClassOption[];
};

type Props = {
  mode: 'student' | 'parent';
  queryKey: string[];
  fetchRequests: () => Promise<ReenrollmentRequest[]>;
  fetchOptions: () => Promise<ReenrollmentOptions>;
  createRequest: (payload: {
    targetAcademicYear: string;
    preferredClassId?: string;
    message?: string;
  }) => Promise<ReenrollmentRequest>;
  cancelRequest?: (id: string) => Promise<ReenrollmentRequest>;
};

export default function ReenrollmentRequestsPanel({
  mode,
  queryKey,
  fetchRequests,
  fetchOptions,
  createRequest,
  cancelRequest,
}: Props) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const currentYear = useMemo(() => getCurrentAcademicYear(), []);
  const [form, setForm] = useState({
    targetAcademicYear: currentYear,
    preferredClassId: '',
    message: '',
  });

  const { data: requests, isLoading } = useQuery({
    queryKey,
    queryFn: fetchRequests,
  });

  const { data: options } = useQuery({
    queryKey: [...queryKey, 'options'],
    queryFn: fetchOptions,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createRequest({
        targetAcademicYear: form.targetAcademicYear.trim(),
        preferredClassId: form.preferredClassId || undefined,
        message: form.message.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('Demande de réinscription envoyée');
      setShowForm(false);
      setForm({ targetAcademicYear: currentYear, preferredClassId: '', message: '' });
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Envoi impossible');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => {
      if (!cancelRequest) throw new Error('Annulation non disponible');
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

  const list = requests ?? [];
  const hasPending = list.some((r) => r.status === 'PENDING');
  const classes = options?.classes ?? [];
  const yearOptions = useMemo(() => {
    const years = new Set<string>([currentYear, form.targetAcademicYear]);
    for (const c of classes) {
      if (c.academicYear) years.add(c.academicYear);
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [classes, currentYear, form.targetAcademicYear]);

  const filteredClasses = classes.filter(
    (c) => !form.targetAcademicYear || c.academicYear === form.targetAcademicYear,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-violet-200/80 bg-violet-50/50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-violet-950">Demande de réinscription</h3>
            <p className="mt-1 text-xs text-violet-900/80">
              {mode === 'parent'
                ? 'Déposez une demande pour votre enfant. L’administration choisira la classe définitive.'
                : 'Déposez une demande de réinscription. L’administration validera et affectera votre classe.'}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            disabled={hasPending}
            onClick={() => setShowForm((v) => !v)}
            title={hasPending ? 'Une demande est déjà en attente' : undefined}
          >
            <FiPlus className="mr-1.5 h-4 w-4" />
            Nouvelle demande
          </Button>
        </div>

        {showForm && (
          <form
            className="mt-4 space-y-3 border-t border-violet-200/70 pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!form.targetAcademicYear.trim()) {
                toast.error('Indiquez l’année scolaire');
                return;
              }
              createMutation.mutate();
            }}
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700" htmlFor="reenroll-year">
                Année scolaire cible
              </label>
              <select
                id="reenroll-year"
                value={form.targetAcademicYear}
                onChange={(e) =>
                  setForm((f) => ({ ...f, targetAcademicYear: e.target.value, preferredClassId: '' }))
                }
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700" htmlFor="reenroll-class">
                Classe souhaitée (suggestion)
              </label>
              <select
                id="reenroll-class"
                value={form.preferredClassId}
                onChange={(e) => setForm((f) => ({ ...f, preferredClassId: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">— Laisser l’admin décider —</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.level}) — {c.academicYear}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-700" htmlFor="reenroll-msg">
                Message (optionnel)
              </label>
              <textarea
                id="reenroll-msg"
                rows={3}
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                placeholder="Précisions pour l’administration…"
                className="w-full resize-none rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Envoi…' : 'Envoyer la demande'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm({ targetAcademicYear: currentYear, preferredClassId: '', message: '' });
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-4 py-3">
          <h4 className="text-sm font-semibold text-stone-900">Historique des demandes</h4>
          <button
            type="button"
            className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200/80"
            onClick={() => queryClient.invalidateQueries({ queryKey })}
            aria-label="Actualiser"
          >
            <FiRefreshCw className="h-4 w-4" />
          </button>
        </div>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-stone-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-stone-500">
            Aucune demande de réinscription pour le moment.
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {list.map((req) => (
              <li key={req.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={reenrollmentStatusVariant(req.status)} size="sm">
                      {REENROLLMENT_STATUS_LABELS[req.status]}
                    </Badge>
                    <span className="text-sm font-medium text-stone-900">
                      Année {req.targetAcademicYear}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-stone-600">
                    Déposée par {reenrollmentRequesterLabel(req.requestedByRole)} le{' '}
                    {format(new Date(req.createdAt), 'd MMM yyyy', { locale: fr })}
                    {req.preferredClass
                      ? ` · Souhait : ${req.preferredClass.name}`
                      : ''}
                    {req.approvedClass ? ` · Affecté : ${req.approvedClass.name}` : ''}
                  </p>
                  {req.message ? (
                    <p className="mt-1 text-xs text-stone-500">{req.message}</p>
                  ) : null}
                  {req.adminComment ? (
                    <p className="mt-1 text-xs text-amber-800">
                      Direction ({reenrollmentReviewerLabel(req.reviewedBy)}) : {req.adminComment}
                    </p>
                  ) : null}
                </div>
                {req.status === 'PENDING' && cancelRequest ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={cancelMutation.isPending}
                    onClick={() => cancelMutation.mutate(req.id)}
                  >
                    <FiX className="mr-1 h-3.5 w-3.5" />
                    Annuler
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
