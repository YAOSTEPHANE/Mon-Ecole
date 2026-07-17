import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiMinus, 
  FiChevronDown, 
  FiChevronUp,
  FiCalendar,
  FiAward,
  FiBook,
  FiSearch,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getEvaluationBadgeVariant, getEvaluationTypeLabel } from '@/lib/evaluationTypes';

interface ChildGradesProps {
  studentId: string;
  searchQuery?: string;
}

const ChildGrades = ({ studentId, searchQuery = '' }: ChildGradesProps) => {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['parent-child-grades', studentId],
    queryFn: () => parentApi.getChildGrades(studentId),
  });

  const tuitionBlock = data?.tuitionBlock as
    | { active?: boolean; hiddenAcademicYears?: string[] }
    | undefined;

  const toggleCourse = (courseId: string) => {
    const newExpanded = new Set(expandedCourses);
    if (newExpanded.has(courseId)) {
      newExpanded.delete(courseId);
    } else {
      newExpanded.add(courseId);
    }
    setExpandedCourses(newExpanded);
  };

  const filteredData = useMemo(() => {
    if (!data?.grades) return { grades: [], courseAverages: {} };
    
    let filtered = data.grades;
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((grade: any) => {
        const courseName = grade.course?.name?.toLowerCase() || '';
        const teacherName = `${grade.teacher?.user?.firstName || ''} ${grade.teacher?.user?.lastName || ''}`.toLowerCase();
        const dateStr = format(new Date(grade.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase();
        const title = grade.title?.toLowerCase() || '';
        return courseName.includes(query) || teacherName.includes(query) || dateStr.includes(query) || title.includes(query);
      });
    }

    // Recalculer les moyennes pour les cours filtrés
    const courseAverages: Record<string, { total: number; count: number; average: number }> = {};
    filtered.forEach((grade: any) => {
      const courseId = grade.courseId;
      if (!courseAverages[courseId]) {
        courseAverages[courseId] = { total: 0, count: 0, average: 0 };
      }
      courseAverages[courseId].total += (grade.score / grade.maxScore) * 20 * grade.coefficient;
      courseAverages[courseId].count += grade.coefficient;
    });

    Object.keys(courseAverages).forEach((courseId) => {
      const course = courseAverages[courseId];
      course.average = course.count > 0 ? course.total / course.count : 0;
    });

    return { grades: filtered, courseAverages };
  }, [data, searchQuery]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Chargement des notes...</p>
        </div>
      </Card>
    );
  }

  const getAverageColor = (average: number) => {
    if (average >= 16) return 'from-green-500 to-emerald-500';
    if (average >= 12) return 'from-blue-500 to-indigo-500';
    if (average >= 10) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getTrend = (courseId: string) => {
    const courseGrades = filteredData.grades
      .filter((g: any) => g.courseId === courseId)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (courseGrades.length < 2) return null;
    
    const recent = courseGrades.slice(-3);
    const older = courseGrades.slice(-6, -3);
    
    if (older.length === 0) return null;
    
    const recentAvg = recent.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) / recent.length;
    const olderAvg = older.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) / older.length;
    
    if (recentAvg > olderAvg + 1) return 'up';
    if (recentAvg < olderAvg - 1) return 'down';
    return 'stable';
  };

  // Calculer la moyenne générale
  const allGrades = filteredData.grades;
  const totalScore = allGrades.reduce((sum: number, g: any) => {
    return sum + (g.score / g.maxScore) * 20 * g.coefficient;
  }, 0);
  const totalCoefficient = allGrades.reduce((sum: number, g: any) => sum + g.coefficient, 0);
  const overallAverage = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;

  const courses: string[] = Array.from(
    new Set(allGrades.map((g: any) => g.courseId) as string[]),
  ) as string[];

  return (
    <div className="space-y-6">
      {tuitionBlock?.active && (tuitionBlock.hiddenAcademicYears?.length ?? 0) > 0 && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/90 ring-1 ring-amber-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-950">
              <p className="font-semibold text-amber-900 mb-1">Accès aux notes limité</p>
              <p className="text-amber-900/90 leading-relaxed">
                Des frais d&apos;inscription ou de scolarité restent impayés pour la ou les années scolaires :{' '}
                <span className="font-medium">{tuitionBlock.hiddenAcademicYears?.join(', ')}</span>.
                Les notes correspondant à ces années ne sont plus affichées après la clôture de l&apos;année.
                Régularisez la situation depuis la section <strong>Paiements / Frais</strong> de l&apos;espace parent.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Indicateur de recherche */}
      {searchQuery && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-semibold text-gray-900">
                Recherche: <span className="text-orange-600">"{searchQuery}"</span>
              </p>
              <p className="text-sm text-gray-600">
                {allGrades.length} note(s) trouvée(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Moyenne générale */}
      {overallAverage > 0 && (
        <Card className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">Moyenne Générale</p>
              <div className="flex items-baseline space-x-2">
                <p className={`text-4xl font-bold ${
                  overallAverage >= 16 ? 'text-green-600' :
                  overallAverage >= 12 ? 'text-blue-600' :
                  overallAverage >= 10 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {overallAverage.toFixed(2)}
                </p>
                <p className="text-xl text-gray-500">/ 20</p>
              </div>
              <Badge
                variant={overallAverage >= 10 ? 'success' : 'danger'}
                size="sm"
                className="mt-2"
              >
                {overallAverage >= 10 ? 'Admis' : 'Non admis'}
              </Badge>
            </div>
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAverageColor(overallAverage)} flex items-center justify-center text-white`}>
              <FiAward className="w-10 h-10" />
            </div>
          </div>
        </Card>
      )}

      {/* Liste des cours */}
      {courses.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">
              {tuitionBlock?.active ? 'Notes non disponibles' : 'Aucune note disponible'}
            </p>
            <p className="text-sm">
              {tuitionBlock?.active
                ? 'Certaines notes peuvent être masquées tant que la scolarité ou l\'inscription n\'est pas entièrement réglée pour les années concernées. Consultez l\'encadré ci-dessus et la section Paiements / Frais.'
                : 'Les notes apparaîtront ici une fois saisies par les enseignants'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((courseId: string) => {
            const courseGrades = allGrades
              .filter((g: any) => g.courseId === courseId)
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const course = courseGrades[0]?.course;
            const average = filteredData.courseAverages[courseId]?.average || 0;
            const trend = getTrend(courseId);
            const isExpanded = expandedCourses.has(courseId);

            return (
              <Card key={courseId} hover>
                <div className="space-y-4">
                  {/* En-tête du cours */}
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleCourse(courseId)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getAverageColor(average)} flex items-center justify-center text-white`}>
                        <FiBook className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{course?.name}</h3>
                        <p className="text-sm text-gray-600">
                          {course?.teacher?.user?.firstName} {course?.teacher?.user?.lastName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center space-x-2">
                          <p className={`text-2xl font-bold ${
                            average >= 16 ? 'text-green-600' :
                            average >= 12 ? 'text-blue-600' :
                            average >= 10 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {average.toFixed(2)}
                          </p>
                          <span className="text-gray-500">/ 20</span>
                        </div>
                        {trend && (
                          <div className="flex items-center space-x-1 text-xs mt-1">
                            {trend === 'up' && <FiTrendingUp className="w-4 h-4 text-green-600" />}
                            {trend === 'down' && <FiTrendingDown className="w-4 h-4 text-red-600" />}
                            {trend === 'stable' && <FiMinus className="w-4 h-4 text-gray-600" />}
                            <span className={
                              trend === 'up' ? 'text-green-600' :
                              trend === 'down' ? 'text-red-600' :
                              'text-gray-600'
                            }>
                              {trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge
                          variant={
                            average >= 16 ? 'success' :
                            average >= 12 ? 'secondary' :
                            average >= 10 ? 'warning' : 'danger'
                          }
                          size="sm"
                        >
                          {courseGrades.length} note(s)
                        </Badge>
                        {isExpanded ? (
                          <FiChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <FiChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Détails des notes */}
                  {isExpanded && (
                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      {courseGrades.map((grade: any) => {
                        const score = (grade.score / grade.maxScore) * 20;
                        return (
                          <div
                            key={grade.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="font-medium text-gray-900">{grade.title}</p>
                                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                    <div className="flex items-center space-x-1">
                                      <FiCalendar className="w-4 h-4" />
                                      <span>{format(new Date(grade.date), 'dd MMM yyyy', { locale: fr })}</span>
                                    </div>
                                    <Badge
                                      variant={getEvaluationBadgeVariant(grade.evaluationType)}
                                      size="sm"
                                    >
                                      {getEvaluationTypeLabel(grade.evaluationType)}
                                    </Badge>
                                    {grade.coefficient > 1 && (
                                      <span className="text-xs text-gray-500">
                                        Coef. {grade.coefficient}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-xl font-bold ${
                                score >= 16 ? 'text-green-600' :
                                score >= 12 ? 'text-blue-600' :
                                score >= 10 ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {score.toFixed(2)}/20
                              </p>
                              <p className="text-xs text-gray-500">
                                {grade.score}/{grade.maxScore}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChildGrades;
