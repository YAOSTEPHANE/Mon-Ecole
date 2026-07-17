'use client';

import { useQuery } from '@tanstack/react-query';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { studentApi } from '../../services/api';
import { FiAward } from 'react-icons/fi';

export default function StudentGamificationCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['student-gamification'],
    queryFn: () => studentApi.getGamification(),
  });

  if (isLoading) {
    return (
      <Card className="p-4 text-sm text-gray-500">Chargement des points…</Card>
    );
  }

  const total = data?.totalPoints ?? 0;
  const badges = (data?.badges || []) as string[];
  const recent = (data?.recent || []) as Array<{
    id: string;
    label: string;
    points: number;
    kind: string;
  }>;

  return (
    <Card className="p-4 space-y-3 border border-amber-100 bg-gradient-to-br from-amber-50/80 to-white">
      <div className="flex items-center gap-2">
        <FiAward className="h-5 w-5 text-amber-700" />
        <h3 className="text-sm font-semibold text-amber-950">Mes points & badges</h3>
      </div>
      <p className="text-2xl font-bold text-amber-900">{total} pts</p>
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {badges.map((b) => (
            <Badge key={b} variant="warning">
              {b}
            </Badge>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <ul className="space-y-1 text-xs text-gray-600">
          {recent.slice(0, 5).map((e) => (
            <li key={e.id} className="flex justify-between gap-2">
              <span className="truncate">{e.label}</span>
              <span className="shrink-0 font-medium text-amber-800">+{e.points}</span>
            </li>
          ))}
        </ul>
      )}
      {recent.length === 0 && (
        <p className="text-xs text-gray-500">
          Les points s’accumulent avec les bonnes notes, devoirs et assiduité.
        </p>
      )}
    </Card>
  );
}
