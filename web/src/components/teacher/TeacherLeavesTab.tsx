'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';
import { FiCalendar, FiPlus, FiInfo } from 'react-icons/fi';
import { differenceInCalendarDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  TEACHER_LEAVE_TYPE_LABELS,
  TEACHER_LEAVE_STATUS_LABELS,
  leaveStatusBadgeVariant,
} from '../../lib/teacherWorkspace';

const TeacherLeavesTab = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'ANNUAL' as 'ANNUAL' | 'SICK' | 'PERSONAL' | 'TRAINING' | 'OTHER',
    startDate: '',
    endDate: '',
    reason: '',
  });

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['teacher-leaves'],
    queryFn: teacherApi.getLeaves,
  });

  const cancelMutation = useMutation({
    mutationFn: (leaveId: string) => teacherApi.cancelLeave(leaveId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success('Demande annulée');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Annulation impossible'),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      teacherApi.createLeave({
        type: form.type,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        reason: form.reason.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teacher-leaves'] });
      toast.success('Demande enregistrée');
      setShowForm(false);
      setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' });
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'Envoi impossible'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) {
      toast.error('Indiquez les dates de début et de fin');
      return;
    }
    const start = new Date(form.startDate);
    const end = new Date(form.endDate);
    if (end < start) {
      toast.error('La date de fin doit être le même jour ou après la date de début');
      return;
    }
    createMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Card>
    );
  }

  const list = leaves ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 px-5 py-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Congés et absences</h1>
          <p className="mt-2 text-sm text-gray-600">
            Déposez une demande de congé ou consultez le statut de vos demandes (validation par la direction).
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 shrink-0">
          <FiPlus className="w-5 h-5" />
          {showForm ? 'Fermer le formulaire' : 'Nouvelle demande'}
        </Button>
      </div>

      {showForm && (
        <Card className="border border-emerald-200 bg-emerald-50/20">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Nouvelle demande</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
            <div>
              <label htmlFor="leave-type" className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                id="leave-type"
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as typeof form.type }))
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5"
              >
                {(Object.keys(TEACHER_LEAVE_TYPE_LABELS) as Array<keyof typeof TEACHER_LEAVE_TYPE_LABELS>).map(
                  (k) => (
                    <option key={k} value={k}>
                      {TEACHER_LEAVE_TYPE_LABELS[k]}
                    </option>
                  )
                )}
              </select>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leave-start" className="block text-sm font-medium text-gray-700 mb-1">
                  Du
                </label>
                <input
                  id="leave-start"
                  type="date"
                  required
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5"
                />
              </div>
              <div>
                <label htmlFor="leave-end" className="block text-sm font-medium text-gray-700 mb-1">
                  Au
                </label>
                <input
                  id="leave-end"
                  type="date"
                  required
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5"
                />
              </div>
            </div>
            {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
              <p className="text-xs text-gray-600">
                Durée :{' '}
                <strong>
                  {differenceInCalendarDays(new Date(form.endDate), new Date(form.startDate)) + 1}
                </strong>{' '}
                jour(s) calendaires
              </p>
            )}
            <div>
              <label htmlFor="leave-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Motif (optionnel)
              </label>
              <textarea
                id="leave-reason"
                rows={3}
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending}>
              Envoyer la demande
            </Button>
          </form>
        </Card>
      )}

      <Card className="border border-gray-200/80">
        <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <FiCalendar className="w-5 h-5 text-emerald-600" />
          Historique des demandes
        </h2>
        <p className="text-xs text-gray-500 flex items-start gap-2 mb-6">
          <FiInfo className="w-4 h-4 shrink-0 mt-0.5" />
          Les absences ponctuelles non planifiées (maladie du jour) peuvent aussi être signalées ici ; la direction
          valide ou refuse selon la politique de l&apos;établissement.
        </p>

        {list.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Aucune demande pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((lv: any) => (
              <li key={lv.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {TEACHER_LEAVE_TYPE_LABELS[lv.type] ?? lv.type}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {format(new Date(lv.startDate), 'd MMM yyyy', { locale: fr })} →{' '}
                    {format(new Date(lv.endDate), 'd MMM yyyy', { locale: fr })}
                  </p>
                  {lv.reason && <p className="text-sm text-gray-500 mt-2 italic">{lv.reason}</p>}
                  {lv.adminComment && (
                    <p className="text-sm text-indigo-800 mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                      <span className="font-medium">Réponse administration : </span>
                      {lv.adminComment}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {differenceInCalendarDays(new Date(lv.endDate), new Date(lv.startDate)) + 1} jour(s)
                    calendaires
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <Badge variant={leaveStatusBadgeVariant(lv.status)}>
                    {TEACHER_LEAVE_STATUS_LABELS[lv.status] ?? lv.status}
                  </Badge>
                  {lv.status === 'PENDING' && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      disabled={cancelMutation.isPending}
                      onClick={() => {
                        if (
                          typeof window !== 'undefined' &&
                          !window.confirm('Annuler cette demande ?')
                        ) {
                          return;
                        }
                        cancelMutation.mutate(lv.id);
                      }}
                    >
                      Annuler la demande
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default TeacherLeavesTab;
