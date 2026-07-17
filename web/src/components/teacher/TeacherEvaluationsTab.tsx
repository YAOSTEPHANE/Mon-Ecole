'use client';

import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import { FiStar, FiTarget, FiTrendingUp, FiAlertCircle, FiUser } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const TeacherEvaluationsTab = () => {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['teacher-performance-reviews'],
    queryFn: teacherApi.getPerformanceReviews,
  });

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Card>
    );
  }

  const list = reviews ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 px-5 py-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Évaluation du personnel</h1>
        <p className="mt-2 text-sm text-gray-600">
          Synthèses et entretiens saisis par la direction ou les RH. Consultation uniquement.
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <FiStar className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Aucune évaluation enregistrée pour le moment.</p>
          <p className="text-sm mt-2 max-w-md mx-auto">
            Les fiches d&apos;évaluation périodiques apparaîtront ici lorsqu&apos;elles auront été saisies par
            l&apos;administration.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((r: any) => (
            <Card key={r.id} className="border border-gray-200/80">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{r.periodLabel}</h3>
                  <p className="text-sm text-gray-500">Année scolaire {r.academicYear}</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {r.createdAt && (
                    <p>Saisie le {format(new Date(r.createdAt), 'd MMM yyyy', { locale: fr })}</p>
                  )}
                  {r.reviewerName && (
                    <p className="flex items-center justify-end gap-1 mt-1 text-gray-600">
                      <FiUser className="w-4 h-4" />
                      {r.reviewerName}
                    </p>
                  )}
                </div>
              </div>

              {r.overallScore != null && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-center gap-3">
                  <FiStar className="w-8 h-8 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-amber-800">Note globale</p>
                    <p className="text-2xl font-bold text-amber-900">{r.overallScore} / 20</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                {r.objectives && (
                  <div className="rounded-lg border border-gray-100 p-3 bg-gray-50/80">
                    <p className="text-xs font-semibold text-gray-500 flex items-center gap-1 mb-1">
                      <FiTarget className="w-3.5 h-3.5" /> Objectifs
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.objectives}</p>
                  </div>
                )}
                {r.achievements && (
                  <div className="rounded-lg border border-emerald-100 p-3 bg-emerald-50/50">
                    <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1 mb-1">
                      <FiTrendingUp className="w-3.5 h-3.5" /> Points forts
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.achievements}</p>
                  </div>
                )}
                {r.improvements && (
                  <div className="rounded-lg border border-orange-100 p-3 bg-orange-50/50">
                    <p className="text-xs font-semibold text-orange-800 flex items-center gap-1 mb-1">
                      <FiAlertCircle className="w-3.5 h-3.5" /> Axes de progrès
                    </p>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{r.improvements}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherEvaluationsTab;
