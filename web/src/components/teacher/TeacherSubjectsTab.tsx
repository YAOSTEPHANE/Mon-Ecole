'use client';

import { useQuery } from '@tanstack/react-query';
import { teacherApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiBook, FiUsers, FiClipboard, FiUserCheck } from 'react-icons/fi';

const TeacherSubjectsTab = () => {
  const { data: courses, isLoading } = useQuery({
    queryKey: ['teacher-courses'],
    queryFn: () => teacherApi.getCourses(),
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

  const list = courses ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/20 px-5 py-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Matières enseignées</h1>
        <p className="mt-2 text-sm text-gray-600">
          Vue synthétique de vos cours, classes et volumes d&apos;activité (notes et absences enregistrées).
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="p-10 text-center text-gray-500">
          <FiBook className="w-14 h-14 mx-auto mb-3 text-gray-300" />
          <p>Aucun cours ne vous est encore assigné.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((course: any) => (
            <Card
              key={course.id}
              className="border border-gray-200/80 hover:border-emerald-200 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FiBook className="w-5 h-5 text-emerald-600" />
                    {course.name}
                  </h3>
                  <p className="text-sm font-mono text-gray-500 mt-0.5">{course.code}</p>
                </div>
                <Badge variant="info">{course.class?.name}</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                <FiUsers className="w-4 h-4 text-gray-400" />
                Classe : {course.class?.name} — {course.class?.level}
              </p>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                  <FiClipboard className="w-4 h-4" />
                  Notes : <strong>{course._count?.grades ?? 0}</strong>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800">
                  <FiUserCheck className="w-4 h-4" />
                  Absences : <strong>{course._count?.absences ?? 0}</strong>
                </span>
              </div>
              {course.description && (
                <p className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">{course.description}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherSubjectsTab;
