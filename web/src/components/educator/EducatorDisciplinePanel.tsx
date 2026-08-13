'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { educatorApi } from '@/services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiAlertTriangle } from 'react-icons/fi';

export default function EducatorDisciplinePanel() {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['educator-discipline-records'],
    queryFn: () => educatorApi.getDisciplineRecords(),
  });

  if (isLoading) {
    return <Card className="p-8 text-center text-stone-500">Chargement des dossiers…</Card>;
  }

  if (!records.length) {
    return (
      <Card className="p-8 text-center text-stone-500">
        Aucun dossier disciplinaire sur votre périmètre.
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
          <FiAlertTriangle className="h-4 w-4 text-amber-700" />
          Discipline — suivi de vos classes
        </h3>
        <p className="mt-0.5 text-xs text-stone-600">
          Lecture des sanctions et suivis enregistrés par l’administration.
        </p>
      </div>
      {records.map((r: {
        id: string;
        title: string;
        category: string;
        incidentDate: string;
        academicYear: string;
        description?: string | null;
        student?: {
          user?: { firstName?: string; lastName?: string };
          class?: { name?: string };
          studentId?: string;
        };
      }) => (
        <Card key={r.id} className="space-y-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-stone-900">
              {r.student?.user?.lastName} {r.student?.user?.firstName}
              {r.student?.class?.name ? (
                <span className="ml-2 text-sm font-normal text-stone-500">{r.student.class.name}</span>
              ) : null}
            </p>
            <Badge variant="warning">{r.category}</Badge>
          </div>
          <p className="text-sm text-stone-800">{r.title}</p>
          {r.description ? <p className="text-xs text-stone-600">{r.description}</p> : null}
          <p className="text-[11px] text-stone-500">
            {format(new Date(r.incidentDate), 'dd MMM yyyy', { locale: fr })} · {r.academicYear}
          </p>
        </Card>
      ))}
    </div>
  );
}
