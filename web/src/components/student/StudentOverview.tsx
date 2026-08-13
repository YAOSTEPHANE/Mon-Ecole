import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { FiBook, FiCalendar, FiClipboard, FiAward, FiAlertCircle, FiSearch, FiBookOpen, FiFileText, FiMessageSquare } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import PortalSchoolFeed from '../portal/PortalSchoolFeed';
import StudentGamificationCard from './StudentGamificationCard';
import { PremiumOverviewHero, PremiumStatGrid, PremiumSectionTitle } from '../dashboard/premium';
import type { PremiumStatItem } from '../dashboard/premium/PremiumStatGrid';
import Button from '../ui/Button';

const StudentOverview = ({ searchQuery = '', searchCategory = 'all' }: { searchQuery?: string; searchCategory?: string }) => {
  const { data: grades, isLoading: gradesLoading } = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => studentApi.getGrades(),
  });

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['student-absences'],
    queryFn: () => studentApi.getAbsences(),
  });

  const { data: assignments, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => studentApi.getAssignments(),
  });

  // Filtrer les données selon la recherche (TOUJOURS appeler les hooks avant tout return)
  const filteredGrades = useMemo(() => {
    if (!grades?.grades || (!searchQuery && searchCategory === 'all')) return grades?.grades || [];
    if (searchCategory !== 'all' && searchCategory !== 'grades') return [];
    
    const query = searchQuery.toLowerCase();
    return grades.grades.filter((g: any) => {
      const courseName = g.course?.name?.toLowerCase() || '';
      const teacherName = `${g.teacher?.user?.firstName || ''} ${g.teacher?.user?.lastName || ''}`.toLowerCase();
      const dateStr = format(new Date(g.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase();
      const title = g.title?.toLowerCase() || '';
      return courseName.includes(query) || teacherName.includes(query) || dateStr.includes(query) || title.includes(query);
    });
  }, [grades, searchQuery, searchCategory]);

  const filteredAbsences = useMemo(() => {
    if (!absences || (!searchQuery && searchCategory === 'all')) return absences || [];
    if (searchCategory !== 'all' && searchCategory !== 'absences') return [];
    
    const query = searchQuery.toLowerCase();
    return absences.filter((a: any) => {
      const courseName = a.course?.name?.toLowerCase() || '';
      const dateStr = format(new Date(a.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase();
      return courseName.includes(query) || dateStr.includes(query);
    });
  }, [absences, searchQuery, searchCategory]);

  const filteredAssignments = useMemo(() => {
    if (!assignments || (!searchQuery && searchCategory === 'all')) return assignments || [];
    if (searchCategory !== 'all' && searchCategory !== 'assignments') return [];
    
    const query = searchQuery.toLowerCase();
    return assignments.filter((a: any) => {
      const title = a.assignment?.title?.toLowerCase() || '';
      const courseName = a.assignment?.course?.name?.toLowerCase() || '';
      const description = a.assignment?.description?.toLowerCase() || '';
      return title.includes(query) || courseName.includes(query) || description.includes(query);
    });
  }, [assignments, searchQuery, searchCategory]);

  // Calculer la moyenne générale
  const allGrades = filteredGrades;
  const totalScore = allGrades.reduce((sum: number, g: any) => {
    return sum + (g.score / g.maxScore) * 20 * g.coefficient;
  }, 0);
  const totalCoefficient = allGrades.reduce((sum: number, g: any) => sum + g.coefficient, 0);
  const overallAverage = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;

  // Compter les absences
  const totalAbsences = filteredAbsences.length;
  const unexcusedAbsences = filteredAbsences.filter((a: any) => !a.excused).length;

  // Compter les devoirs
  const totalAssignments = filteredAssignments.length;
  const pendingAssignments = filteredAssignments.filter((a: any) => !a.submitted).length;
  const overdueAssignments = filteredAssignments.filter((a: any) => {
    if (a.submitted) return false;
    return new Date(a.assignment.dueDate) < new Date();
  }).length;

  const nextAssignments = useMemo(() => {
    return filteredAssignments
      .filter((a: any) => !a.submitted && a.assignment?.dueDate)
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(a.assignment.dueDate).getTime() - new Date(b.assignment.dueDate).getTime()
      )
      .slice(0, 5);
  }, [filteredAssignments]);

  const stats: PremiumStatItem[] = [
    {
      label: 'Moyenne générale',
      value: overallAverage.toFixed(2),
      subtitle: '/ 20',
      icon: FiAward,
      accent: overallAverage >= 16 ? 'emerald' : overallAverage >= 12 ? 'blue' : overallAverage >= 10 ? 'amber' : 'rose',
      trend: overallAverage >= 10 ? 'Admis' : 'Non admis',
    },
    {
      label: 'Notes',
      value: allGrades.length,
      subtitle: 'Total',
      icon: FiClipboard,
      accent: 'blue',
    },
    {
      label: 'Absences',
      value: totalAbsences,
      subtitle: `${unexcusedAbsences} non justifiées`,
      icon: FiCalendar,
      accent: unexcusedAbsences > 0 ? 'amber' : 'emerald',
      trend: unexcusedAbsences > 0 ? 'Attention' : 'OK',
    },
    {
      label: 'Devoirs',
      value: pendingAssignments,
      subtitle: `${totalAssignments} au total`,
      icon: FiBook,
      accent: overdueAssignments > 0 ? 'rose' : pendingAssignments > 0 ? 'amber' : 'emerald',
      trend: overdueAssignments > 0 ? 'En retard' : pendingAssignments > 0 ? 'À faire' : 'À jour',
    },
  ];

  const hasSearchResults = searchQuery && (filteredGrades.length > 0 || filteredAbsences.length > 0 || filteredAssignments.length > 0);
  const hasNoResults = searchQuery && filteredGrades.length === 0 && filteredAbsences.length === 0 && filteredAssignments.length === 0;

  // Loading state - après tous les hooks
  if (gradesLoading || absencesLoading || assignmentsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-24 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {!searchQuery && (
        <>
          <PremiumOverviewHero
            eyebrow="Synthèse personnelle"
            title={format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
            gradient="from-violet-600 via-fuchsia-600 to-pink-600"
            description="Indicateurs consolidés à partir de vos notes, absences et devoirs. Consultez chaque section pour le détail."
            badge={
              overdueAssignments > 0 || unexcusedAbsences > 0
                ? `${overdueAssignments > 0 ? `${overdueAssignments} devoir(s) en retard` : ''}${overdueAssignments > 0 && unexcusedAbsences > 0 ? ' · ' : ''}${unexcusedAbsences > 0 ? `${unexcusedAbsences} absence(s) non justifiée(s)` : ''}`
                : undefined
            }
          />
          <section className="dash-section-panel">
            <StudentGamificationCard />
          </section>
          <section className="dash-section-panel">
            <PortalSchoolFeed role="student" compact />
          </section>
          <section className="dash-section-panel">
            <PremiumSectionTitle
              title="Accès rapides"
              subtitle="Travail scolaire du jour"
              icon={FiClipboard}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(
                [
                  { id: 'grades', label: 'Notes', icon: FiAward, color: 'from-violet-500 to-fuchsia-600' },
                  { id: 'assignments', label: 'Devoirs', icon: FiFileText, color: 'from-blue-500 to-indigo-600' },
                  { id: 'lesson-logs', label: 'Cahier', icon: FiBookOpen, color: 'from-amber-600 to-orange-700' },
                  { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-teal-500 to-cyan-600' },
                  { id: 'absences', label: 'Absences', icon: FiAlertCircle, color: 'from-orange-500 to-red-500' },
                  { id: 'messages', label: 'Messages', icon: FiMessageSquare, color: 'from-stone-500 to-stone-700' },
                ] as const
              ).map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="secondary"
                    className="flex h-auto flex-col items-start gap-2 rounded-2xl border border-stone-200/80 bg-white p-3 text-left shadow-sm hover:border-violet-300/60"
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: item.id }));
                    }}
                  >
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-xs font-semibold text-stone-800">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* Indicateur de recherche */}
      {searchQuery && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiSearch className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-semibold text-gray-900">
                  Recherche: <span className="text-purple-600">"{searchQuery}"</span>
                </p>
                <p className="text-sm text-gray-600">
                  {hasSearchResults 
                    ? `${filteredGrades.length} note(s), ${filteredAbsences.length} absence(s), ${filteredAssignments.length} devoir(s) trouvé(s)`
                    : 'Aucun résultat trouvé'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {hasNoResults ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiSearch className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucun résultat trouvé</p>
            <p className="text-sm">Essayez avec d'autres mots-clés</p>
          </div>
        </Card>
      ) : (
        <>
          <section className="dash-section-panel">
            <PremiumSectionTitle title="Indicateurs clés" subtitle="Votre progression scolaire" icon={FiAward} />
            <PremiumStatGrid items={stats} columns={4} />
          </section>

      {(overdueAssignments > 0 || unexcusedAbsences > 0) && (
        <section className="dash-section-panel border-l-4 border-l-orange-500">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100">
              <FiAlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="mb-2 font-semibold text-gray-900">Attention requise</h3>
              <div className="space-y-2 text-sm text-gray-700">
                {overdueAssignments > 0 && <p>• {overdueAssignments} devoir(s) en retard</p>}
                {unexcusedAbsences > 0 && <p>• {unexcusedAbsences} absence(s) non justifiée(s)</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {overdueAssignments > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'assignments' }))
                    }
                  >
                    Voir les devoirs
                  </Button>
                )}
                {unexcusedAbsences > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'absences' }))
                    }
                  >
                    Voir les absences
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {allGrades.length > 0 && (
        <section className="dash-section-panel">
          <PremiumSectionTitle title="Évolution de la moyenne" subtitle="Par matière" icon={FiBook} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {Object.entries(
                allGrades.reduce((acc: any, grade: any) => {
                  const courseName = grade.course?.name || 'Autre';
                  if (!acc[courseName]) {
                    acc[courseName] = [];
                  }
                  acc[courseName].push(grade);
                  return acc;
                }, {})
              ).slice(0, 3).map(([courseName, courseGrades]: [string, any]) => {
                const courseAvg = courseGrades.reduce((sum: number, g: any) => 
                  sum + (g.score / g.maxScore) * 20 * g.coefficient, 0
                ) / courseGrades.reduce((sum: number, g: any) => sum + g.coefficient, 0);
                
                return (
                  <div
                    key={courseName}
                    className="rounded-xl border border-stone-200/80 bg-white/95 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="text-sm font-medium text-gray-600 mb-2">{courseName}</p>
                    <div className="flex items-baseline space-x-2">
                      <p className="text-2xl font-bold text-gray-900">{courseAvg.toFixed(2)}</p>
                      <p className="text-sm text-gray-500">/ 20</p>
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          courseAvg >= 16 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                          courseAvg >= 12 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                          courseAvg >= 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-red-500 to-pink-500'
                        }`}
                        style={{ width: `${(courseAvg / 20) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      <section className="dash-section-panel">
        <PremiumSectionTitle title="Devoirs à rendre" subtitle="Prochaines échéances" icon={FiFileText} />
        <div className="space-y-2">
          {nextAssignments.length > 0 ? (
            nextAssignments.map((row: any) => {
              const due = new Date(row.assignment.dueDate);
              const overdue = due < new Date() && !row.submitted;
              return (
                <button
                  key={row.id || row.assignment?.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-stone-200/80 bg-white px-3 py-2.5 text-left hover:border-violet-300/70"
                  onClick={() =>
                    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'assignments' }))
                  }
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-900">
                      {row.assignment?.title || 'Devoir'}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {row.assignment?.course?.name || 'Matière'}
                    </p>
                  </div>
                  <Badge variant={overdue ? 'danger' : 'secondary'} size="sm">
                    {format(due, 'dd MMM', { locale: fr })}
                  </Badge>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-gray-500">
              <FiFileText className="mx-auto mb-3 h-12 w-12 text-gray-400" />
              <p>Aucun devoir en attente</p>
            </div>
          )}
        </div>
      </section>
        </>
      )}
    </div>
  );
};

export default StudentOverview;




