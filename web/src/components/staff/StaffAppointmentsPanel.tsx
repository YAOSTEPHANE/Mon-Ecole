'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { staffApi } from '@/services/api/staff.api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmé',
  DECLINED: 'Refusé',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
};

export default function StaffAppointmentsPanel() {
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');

  const { data: stats } = useQuery({
    queryKey: ['staff-appointments-stats'],
    queryFn: staffApi.getAppointmentsStats,
  });
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['staff-appointments', statusFilter, q],
    queryFn: () =>
      staffApi.listAppointments({ status: statusFilter || undefined, q: q || undefined }),
  });

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-xs text-stone-500">En attente</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.today}</p>
            <p className="text-xs text-stone-500">Aujourd’hui</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-2xl font-bold">{stats.confirmed}</p>
            <p className="text-xs text-stone-500">Confirmés</p>
          </Card>
        </div>
      )}

      <Card className="p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <input
            className="flex-1 min-w-[200px] rounded-lg border px-3 py-2 text-sm"
            placeholder="Rechercher élève, parent ou enseignant…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-lg border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="">Tous</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="text-sm text-stone-500">Chargement…</p>
        ) : (rows as unknown[]).length === 0 ? (
          <p className="text-sm text-stone-500">Aucun rendez-vous.</p>
        ) : (
          <ul className="space-y-2">
            {(rows as Array<{
              id: string;
              scheduledStart: string;
              durationMinutes: number;
              status: string;
              topic?: string | null;
              student: { user: { firstName: string; lastName: string }; class?: { name: string } | null };
              parent: { user: { firstName: string; lastName: string; phone?: string | null } };
              teacher: { user: { firstName: string; lastName: string } };
            }>).map((a) => (
              <li key={a.id} className="rounded-xl border border-stone-200 p-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">
                      {format(new Date(a.scheduledStart), 'EEE d MMM yyyy · HH:mm', { locale: fr })}
                      <span className="text-stone-500 font-normal"> · {a.durationMinutes} min</span>
                    </p>
                    <p className="text-xs text-stone-600 mt-1">
                      Élève : {a.student.user.lastName} {a.student.user.firstName}
                      {a.student.class?.name ? ` (${a.student.class.name})` : ''}
                    </p>
                    <p className="text-xs text-stone-600">
                      Parent : {a.parent.user.lastName} {a.parent.user.firstName}
                      {a.parent.user.phone ? ` · ${a.parent.user.phone}` : ''}
                    </p>
                    <p className="text-xs text-stone-600">
                      Enseignant : {a.teacher.user.lastName} {a.teacher.user.firstName}
                    </p>
                    {a.topic && <p className="text-xs text-stone-500 mt-1">Sujet : {a.topic}</p>}
                  </div>
                  <Badge>{STATUS_LABELS[a.status] ?? a.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

