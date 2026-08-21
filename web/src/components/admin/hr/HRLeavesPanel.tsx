import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import { FiCalendar, FiCheck, FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

const LEAVE_TYPES: Record<string, string> = {
  ANNUAL: 'Congés annuels',
  SICK: 'Arrêt maladie',
  PERSONAL: 'Motif personnel',
  TRAINING: 'Formation',
  OTHER: 'Autre',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};

const PERSON_KIND_LABEL: Record<'TEACHER' | 'EDUCATOR' | 'STAFF', string> = {
  TEACHER: 'Enseignant',
  EDUCATOR: 'Éducateur',
  STAFF: 'Personnel',
};

type PersonKind = 'TEACHER' | 'EDUCATOR' | 'STAFF';

type NormalizedLeave = {
  id: string;
  personKind: PersonKind;
  personId: string;
  personName: string;
  personEmail?: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  adminComment?: string | null;
  sortKey: number;
};

const HRLeavesPanel: React.FC = () => {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>('all');
  const [rejectTarget, setRejectTarget] = useState<{
    personKind: PersonKind;
    personId: string;
    leaveId: string;
    personName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const statusParams = filter === 'all' ? undefined : { status: filter };

  const { data: teacherLeaves, isLoading: loadingTeachers } = useQuery({
    queryKey: ['admin-hr-teacher-leaves', filter],
    queryFn: () => adminApi.getHrTeacherLeaves(statusParams),
  });
  const { data: educatorLeaves, isLoading: loadingEducators } = useQuery({
    queryKey: ['admin-hr-educator-leaves', filter],
    queryFn: () => adminApi.getHrEducatorLeaves(statusParams),
  });
  const { data: staffLeaves, isLoading: loadingStaff } = useQuery({
    queryKey: ['admin-hr-staff-leaves', filter],
    queryFn: () => adminApi.getHrStaffLeaves(statusParams),
  });

  const isLoading = loadingTeachers || loadingEducators || loadingStaff;

  const list = useMemo(() => {
    const rows: NormalizedLeave[] = [];

    for (const lv of (teacherLeaves as any[]) ?? []) {
      rows.push({
        id: lv.id,
        personKind: 'TEACHER',
        personId: lv.teacherId,
        personName: `${lv.teacher?.user?.firstName ?? ''} ${lv.teacher?.user?.lastName ?? ''}`.trim(),
        personEmail: lv.teacher?.user?.email,
        type: lv.type,
        status: lv.status,
        startDate: lv.startDate,
        endDate: lv.endDate,
        adminComment: lv.adminComment,
        sortKey: lv.startDate ? new Date(lv.startDate).getTime() : 0,
      });
    }

    for (const lv of (educatorLeaves as any[]) ?? []) {
      rows.push({
        id: lv.id,
        personKind: 'EDUCATOR',
        personId: lv.educatorId,
        personName: `${lv.educator?.user?.firstName ?? ''} ${lv.educator?.user?.lastName ?? ''}`.trim(),
        personEmail: lv.educator?.user?.email,
        type: lv.type,
        status: lv.status,
        startDate: lv.startDate,
        endDate: lv.endDate,
        adminComment: lv.adminComment,
        sortKey: lv.startDate ? new Date(lv.startDate).getTime() : 0,
      });
    }

    for (const lv of (staffLeaves as any[]) ?? []) {
      rows.push({
        id: lv.id,
        personKind: 'STAFF',
        personId: lv.staffMemberId,
        personName: `${lv.staffMember?.user?.firstName ?? ''} ${lv.staffMember?.user?.lastName ?? ''}`.trim(),
        personEmail: lv.staffMember?.user?.email,
        type: lv.type,
        status: lv.status,
        startDate: lv.startDate,
        endDate: lv.endDate,
        adminComment: lv.adminComment,
        sortKey: lv.startDate ? new Date(lv.startDate).getTime() : 0,
      });
    }

    rows.sort((a, b) => b.sortKey - a.sortKey);
    return rows;
  }, [teacherLeaves, educatorLeaves, staffLeaves]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-hr-teacher-leaves'] });
    queryClient.invalidateQueries({ queryKey: ['admin-hr-educator-leaves'] });
    queryClient.invalidateQueries({ queryKey: ['admin-hr-staff-leaves'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: {
      personKind: PersonKind;
      personId: string;
      leaveId: string;
      status: 'APPROVED' | 'REJECTED';
      adminComment?: string;
    }) => {
      const data = {
        status: payload.status,
        ...(payload.adminComment !== undefined && { adminComment: payload.adminComment }),
      };
      switch (payload.personKind) {
        case 'TEACHER':
          return adminApi.updateTeacherLeaveStatus(payload.personId, payload.leaveId, data);
        case 'EDUCATOR':
          return adminApi.updateEducatorLeaveStatus(payload.personId, payload.leaveId, data);
        case 'STAFF':
          return adminApi.updateStaffLeaveStatus(payload.personId, payload.leaveId, data);
        default: {
          const _exhaustive: never = payload.personKind;
          return Promise.reject(new Error(`Type inconnu: ${_exhaustive}`));
        }
      }
    },
    onSuccess: () => {
      invalidateAll();
      toast.success('Demande mise à jour.');
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.error || 'Mise à jour impossible'),
  });

  const openRejectModal = (lv: NormalizedLeave) => {
    setRejectTarget({
      personKind: lv.personKind,
      personId: lv.personId,
      leaveId: lv.id,
      personName: lv.personName,
    });
    setRejectReason('');
  };

  const confirmReject = () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      toast.error('Le motif de refus est obligatoire.');
      return;
    }
    if (!rejectTarget) return;
    updateMutation.mutate({
      personKind: rejectTarget.personKind,
      personId: rejectTarget.personId,
      leaveId: rejectTarget.leaveId,
      status: 'REJECTED',
      adminComment: trimmed,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-orange-100 bg-orange-50/40">
        <p className="text-sm text-gray-700 flex items-start gap-2">
          <FiCalendar className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          Demandes de <strong>congés et permissions</strong> (enseignants, éducateurs, personnel). Validez ou
          refusez depuis la direction (refus : motif obligatoire).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['all', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-orange-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'Tous' : STATUS_LABEL[f] ?? f}
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : list.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Aucune demande pour ce filtre.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
                  <th className="py-3 px-4 font-semibold">Personne</th>
                  <th className="py-3 px-4 font-semibold">Profil</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold">Du</th>
                  <th className="py-3 px-4 font-semibold">Au</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold max-w-[220px]">Direction</th>
                  <th className="py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((lv) => (
                  <tr key={`${lv.personKind}-${lv.id}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{lv.personName || '—'}</div>
                      <div className="text-xs text-gray-500">{lv.personEmail}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          lv.personKind === 'TEACHER'
                            ? 'bg-blue-100 text-blue-800'
                            : lv.personKind === 'EDUCATOR'
                              ? 'bg-violet-100 text-violet-800'
                              : 'bg-stone-100 text-stone-800'
                        }
                      >
                        {PERSON_KIND_LABEL[lv.personKind]}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">{LEAVE_TYPES[lv.type] ?? lv.type}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {lv.startDate
                        ? format(new Date(lv.startDate), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {lv.endDate
                        ? format(new Date(lv.endDate), 'dd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          lv.status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : lv.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800'
                              : lv.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {STATUS_LABEL[lv.status] ?? lv.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 max-w-[220px]">
                      {lv.adminComment ? (
                        <span className="line-clamp-3" title={lv.adminComment}>
                          {lv.adminComment}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {lv.status === 'PENDING' ? (
                        <div className="flex flex-wrap gap-1">
                          <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={updateMutation.isPending}
                            onClick={() =>
                              updateMutation.mutate({
                                personKind: lv.personKind,
                                personId: lv.personId,
                                leaveId: lv.id,
                                status: 'APPROVED',
                              })
                            }
                          >
                            <FiCheck className="w-3.5 h-3.5 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={updateMutation.isPending}
                            onClick={() => openRejectModal(lv)}
                          >
                            <FiX className="w-3.5 h-3.5 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {rejectTarget && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-leave-title"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updateMutation.isPending) {
              setRejectTarget(null);
              setRejectReason('');
            }
          }}
        >
          <div
            className="w-full max-w-lg lux-card-surface p-6 shadow-xl border border-gray-200 rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="reject-leave-title" className="text-lg font-bold text-gray-900 mb-1">
              Refuser la demande
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {rejectTarget.personName ? (
                <>
                  Motif communiqué à <strong>{rejectTarget.personName}</strong>.
                </>
              ) : (
                <>Motif de refus obligatoire.</>
              )}
            </p>
            <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700 mb-2">
              Motif de refus <span className="text-red-600">*</span>
            </label>
            <textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              placeholder="Ex. : effectifs insuffisants sur la période demandée…"
              disabled={updateMutation.isPending}
            />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateMutation.isPending}
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason('');
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={updateMutation.isPending}
                onClick={confirmReject}
              >
                Confirmer le refus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRLeavesPanel;
