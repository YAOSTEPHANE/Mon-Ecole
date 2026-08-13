'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { educatorApi } from '../../services/api';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { FiBookOpen, FiUsers } from 'react-icons/fi';

interface EducatorTeachersListProps {
  searchQuery?: string;
}

const EducatorTeachersList = ({ searchQuery = '' }: EducatorTeachersListProps) => {
  const { data: teachers, isLoading } = useQuery({
    queryKey: ['educator-teachers'],
    queryFn: educatorApi.getTeachers,
  });

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = (teachers as any[] | undefined) ?? [];
    if (!q) return list;
    return list.filter((t) => {
      const u = t.user;
      const hay = [
        u?.firstName,
        u?.lastName,
        u?.email,
        t.specialization,
        t.employeeId,
        ...(t.classes ?? []).map((c: any) => c.name),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [teachers, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="premium-spinner mx-auto" />
          <p className="mt-3 text-stone-600 text-sm">Chargement des enseignants…</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-2 text-stone-600 text-sm">
        <FiUsers className="w-4 h-4 text-cptb-blue" />
        <span className="font-medium">{filtered.length} enseignant(s)</span>
      </Card>

      <Card className="overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center py-10 text-stone-500">Aucun enseignant trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="py-3 px-4 font-semibold text-stone-700">Enseignant</th>
                  <th className="py-3 px-4 font-semibold text-stone-700">Spécialité</th>
                  <th className="py-3 px-4 font-semibold text-stone-700">Classes</th>
                  <th className="py-3 px-4 font-semibold text-stone-700">Cours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-amber-50/40">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={t.user?.avatar}
                          name={`${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`}
                          size="md"
                        />
                        <div>
                          <p className="font-medium text-stone-900">
                            {t.user?.firstName} {t.user?.lastName}
                          </p>
                          <p className="text-xs text-stone-500">{t.user?.email}</p>
                          {t.user?.phone && <p className="text-xs text-stone-500">{t.user.phone}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-700">{t.specialization}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(t.classes ?? []).length === 0 ? (
                          <span className="text-stone-400">—</span>
                        ) : (
                          (t.classes ?? []).map((c: any) => (
                            <Badge key={c.id} variant="info">
                              {c.name}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      <span className="inline-flex items-center gap-1">
                        <FiBookOpen className="w-3.5 h-3.5 text-cptb-gold-dark" />
                        {(t.courses ?? []).length}
                      </span>
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

export default EducatorTeachersList;
