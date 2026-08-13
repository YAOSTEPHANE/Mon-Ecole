'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { educatorApi } from '../../services/api';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { FiUsers } from 'react-icons/fi';

interface EducatorParentsListProps {
  searchQuery?: string;
}

const EducatorParentsList = ({ searchQuery = '' }: EducatorParentsListProps) => {
  const [classFilter, setClassFilter] = useState('');

  const { data: classes } = useQuery({
    queryKey: ['educator-classes'],
    queryFn: educatorApi.getClasses,
  });

  const { data: parents, isLoading } = useQuery({
    queryKey: ['educator-parents', classFilter],
    queryFn: () => educatorApi.getParents(classFilter ? { classId: classFilter } : undefined),
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (parents as any[] | undefined) ?? [];
    if (!q) return list;
    return list.filter((p) => {
      const u = p.user;
      const children = (p.students ?? [])
        .map((sp: any) => `${sp.student?.user?.firstName} ${sp.student?.user?.lastName}`)
        .join(' ');
      const hay = [u?.firstName, u?.lastName, u?.email, p.profession, children]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [parents, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="premium-spinner mx-auto" />
          <p className="mt-3 text-stone-600 text-sm">Chargement des parents…</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-stone-600 text-sm">
          <FiUsers className="w-4 h-4 text-cptb-blue" />
          <span className="font-medium">{filtered.length} parent(s)</span>
        </div>
        <select
          className="sm:ml-auto border border-stone-200 rounded-lg px-3 py-2 text-sm max-w-xs"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="">Toutes les classes</option>
          {((classes as any[]) ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} — {c.level}
            </option>
          ))}
        </select>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-stone-500">Aucun parent trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="py-3 px-4 font-semibold text-stone-700">Parent</th>
                  <th className="py-3 px-4 font-semibold text-stone-700">Enfants</th>
                  <th className="py-3 px-4 font-semibold text-stone-700">Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-amber-50/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={p.user?.avatar}
                          name={`${p.user?.firstName ?? ''} ${p.user?.lastName ?? ''}`}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-stone-900">
                            {p.user?.firstName} {p.user?.lastName}
                          </p>
                          {p.profession && <p className="text-xs text-stone-500">{p.profession}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(p.students ?? []).length === 0 ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          (p.students ?? []).map((sp: any) => (
                            <Badge key={sp.student?.id ?? sp.studentId} variant="info">
                              {sp.student?.user?.firstName} {sp.student?.user?.lastName}
                              {sp.student?.class?.name ? ` (${sp.student.class.name})` : ''}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      <p>{p.user?.email}</p>
                      {p.user?.phone && <p className="text-xs">{p.user.phone}</p>}
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
};

export default EducatorParentsList;
