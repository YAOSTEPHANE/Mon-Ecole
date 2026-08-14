'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FiAward, FiRotateCcw } from 'react-icons/fi';
import { adminApi } from '@/services/api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import { ADM } from './adminModuleLayout';

type StatusFilter = 'ARCHIVED' | 'GRADUATED';

type StudentRow = {
  id: string;
  studentId?: string;
  enrollmentStatus?: string;
  archivedAt?: string | null;
  user?: { firstName?: string; lastName?: string; email?: string };
  class?: { name?: string; level?: string } | null;
};

const STATUS_LABEL: Record<StatusFilter, string> = {
  ARCHIVED: 'Archivés',
  GRADUATED: 'Diplômés',
};

export default function AlumniAdminModule() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<StatusFilter>('ARCHIVED');
  const [q, setQ] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['admin-alumni-students', tab],
    queryFn: () => adminApi.getStudents({ enrollmentStatus: tab }),
  });

  const list = students as StudentRow[];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((s) => {
      const hay = `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''} ${s.studentId ?? ''} ${s.class?.name ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [list, q]);

  const unarchiveMut = useMutation({
    mutationFn: (id: string) => adminApi.unarchiveStudent(id),
    onSuccess: () => {
      toast.success('Élève réintégré');
      qc.invalidateQueries({ queryKey: ['admin-alumni-students'] });
      qc.invalidateQueries({ queryKey: ['admin-students'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Réintégration impossible'),
  });

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>
          <span className="inline-flex items-center gap-2">
            <FiAward className="h-5 w-5 text-cptb-gold" />
            Anciens élèves
          </span>
        </h2>
        <p className={ADM.intro}>
          Élèves archivés ou diplômés. Vous pouvez réintégrer un dossier archivé dans les
          effectifs actifs.
        </p>
      </div>

      <div className={ADM.tabRow} role="tablist">
        {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={ADM.tabBtn(tab === id)}
            onClick={() => setTab(id)}
          >
            {STATUS_LABEL[id]}
          </button>
        ))}
      </div>

      <div className={ADM.grid3}>
        <div className={ADM.statCard}>
          <p className={ADM.statLabel}>{STATUS_LABEL[tab]}</p>
          <p className={ADM.statVal}>{list.length}</p>
          <p className={ADM.statHint}>Page courante (200 max.)</p>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-3">
          <h3 className="font-display text-sm font-bold text-stone-900">{STATUS_LABEL[tab]}</h3>
          <Input
            placeholder="Rechercher"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
        </div>
        {isLoading ? (
          <p className="p-4 text-sm text-stone-500">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-stone-500">Aucun élève dans cette liste.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-stone-50 text-left text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Élève</th>
                  <th className="px-4 py-2.5">Matricule</th>
                  <th className="px-4 py-2.5">Dernière classe</th>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/80">
                    <td className="px-4 py-2.5">
                      {s.user?.firstName} {s.user?.lastName}
                      {s.user?.email ? (
                        <span className="mt-0.5 block text-[11px] text-stone-500">{s.user.email}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{s.studentId ?? '—'}</td>
                    <td className="px-4 py-2.5">{s.class?.name ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {s.archivedAt
                        ? format(new Date(s.archivedAt), 'd MMM yyyy', { locale: fr })
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {tab === 'ARCHIVED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isLoading={unarchiveMut.isPending}
                          onClick={() => {
                            if (window.confirm('Réintégrer cet élève dans les effectifs actifs ?')) {
                              unarchiveMut.mutate(s.id);
                            }
                          }}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <FiRotateCcw className="h-3.5 w-3.5" />
                            Réintégrer
                          </span>
                        </Button>
                      ) : (
                        <span className="text-xs text-stone-400">Diplômé</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
