import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import { 
  FiAward, 
  FiClock, 
  FiUsers, 
  FiMessageSquare, 
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
  FiCalendar,
  FiFileText,
  FiSearch,
  FiUser,
  FiShield
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const DISC_CAT_FR: Record<string, string> = {
  VERBAL_WARNING: 'Avertissement verbal',
  WRITTEN_WARNING: 'Avertissement écrit',
  REPRIMAND: 'Blâme',
  TEMPORARY_EXCLUSION: 'Exclusion temporaire',
  DISCIPLINE_COUNCIL_HEARING: 'Conseil de discipline (audition)',
  DISCIPLINE_COUNCIL_DECISION: 'Conseil de discipline (décision)',
  BEHAVIOR_CONTRACT: 'Contrat de comportement',
  OTHER: 'Autre',
};

const StudentConduct = ({ searchQuery = '' }: { searchQuery?: string }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('all');

  const { data: conducts, isLoading } = useQuery({
    queryKey: ['student-conduct', selectedPeriod, selectedAcademicYear],
    queryFn: () => studentApi.getConduct({
      ...(selectedPeriod !== 'all' && { period: selectedPeriod }),
      ...(selectedAcademicYear !== 'all' && { academicYear: selectedAcademicYear }),
    }),
  });

  const { data: rulebook } = useQuery({
    queryKey: ['student-discipline-rulebook'],
    queryFn: studentApi.getDisciplineRulebook,
  });

  const { data: disciplineRecords = [] } = useQuery({
    queryKey: ['student-discipline-records', selectedAcademicYear],
    queryFn: () =>
      studentApi.getDisciplineRecords(
        selectedAcademicYear !== 'all' ? { academicYear: selectedAcademicYear } : undefined
      ),
  });

  const filteredConducts = useMemo(() => {
    if (!conducts) return [];
    
    let filtered = conducts;
    
    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c: any) => {
        const period = c.period?.toLowerCase() || '';
        const academicYear = c.academicYear?.toLowerCase() || '';
        const comments = c.comments?.toLowerCase() || '';
        return period.includes(query) || academicYear.includes(query) || comments.includes(query);
      });
    }
    
    return filtered.sort((a: any, b: any) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [conducts, searchQuery]);

  const periods = [
    { value: 'all', label: 'Toutes les périodes' },
    { value: 'trim1', label: 'Trimestre 1' },
    { value: 'trim2', label: 'Trimestre 2' },
    { value: 'trim3', label: 'Trimestre 3' },
    { value: 'sem1', label: 'Semestre 1' },
    { value: 'sem2', label: 'Semestre 2' },
  ];

  const academicYears = useMemo(() => {
    if (!conducts) return [{ value: 'all', label: 'Toutes les années' }];
    const years = new Set(conducts.map((c: any) => c.academicYear as string));
    return [
      { value: 'all', label: 'Toutes les années' },
      ...Array.from(years).map((year) => ({ value: String(year), label: String(year) })),
    ];
  }, [conducts]);

  const getConductColor = (average: number) => {
    if (average >= 16) return 'from-green-500 to-emerald-500';
    if (average >= 12) return 'from-blue-500 to-indigo-500';
    if (average >= 10) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getConductLabel = (average: number) => {
    if (average >= 16) return 'Excellente';
    if (average >= 12) return 'Bonne';
    if (average >= 10) return 'Moyenne';
    return 'À améliorer';
  };

  const getTrend = (current: any, previous: any) => {
    if (!previous) return null;
    if (current.average > previous.average + 0.5) return 'up';
    if (current.average < previous.average - 0.5) return 'down';
    return 'stable';
  };

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Chargement de la conduite...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {rulebook &&
      typeof rulebook === 'object' &&
      rulebook !== null &&
      'content' in rulebook &&
      typeof (rulebook as { content?: unknown }).content === 'string' ? (
        <Card className="border-2 border-purple-100 bg-gradient-to-r from-purple-50/80 to-pink-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FiFileText className="w-5 h-5 text-purple-600" aria-hidden />
            {(rulebook as { title?: string }).title ?? 'Règlement intérieur'}
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Mis à jour le{' '}
            {format(new Date((rulebook as { updatedAt: string }).updatedAt), 'dd/MM/yyyy', {
              locale: fr,
            })}
          </p>
          <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-48 overflow-y-auto rounded-lg p-3 bg-white/80 border border-purple-100">
            {(rulebook as { content: string }).content}
          </div>
        </Card>
      ) : null}

      {(disciplineRecords as { id: string }[]).length > 0 ? (
        <Card>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <FiShield className="w-5 h-5 text-purple-600" aria-hidden />
            Suivi disciplinaire
          </h3>
          <ul className="space-y-2">
            {(disciplineRecords as {
              id: string;
              category: string;
              title: string;
              description?: string | null;
              incidentDate: string;
              academicYear: string;
            }[]).map((r) => (
              <li key={r.id} className="border border-gray-200 rounded-lg p-3 text-sm">
                <p className="font-semibold text-gray-900">
                  {DISC_CAT_FR[r.category] ?? r.category} · {r.title}
                </p>
                <p className="text-xs text-gray-500">
                  {format(new Date(r.incidentDate), 'dd MMM yyyy', { locale: fr })} · {r.academicYear}
                </p>
                {r.description ? <p className="text-gray-700 mt-1">{r.description}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* Indicateur de recherche */}
      {searchQuery && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-semibold text-gray-900">
                Recherche: <span className="text-purple-600">"{searchQuery}"</span>
              </p>
              <p className="text-sm text-gray-600">
                {filteredConducts.length} évaluation(s) trouvée(s)
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filtres */}
      <Card 
        className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300"
        style={{
          transform: 'translateZ(0)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FiCalendar className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filtres :</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Période :</label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {periods.map(period => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Année scolaire :</label>
            <select
              value={selectedAcademicYear}
              onChange={(e) => setSelectedAcademicYear(e.target.value)}
              className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {academicYears.map(year => (
                <option key={year.value} value={year.value}>{year.label}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {filteredConducts && filteredConducts.length > 0 ? (
        <div className="space-y-6">
          {filteredConducts.map((conduct: any, index: number) => {
            const previousConduct = index < filteredConducts.length - 1 ? filteredConducts[index + 1] : null;
            const trend = getTrend(conduct, previousConduct);

            return (
              <Card 
                key={conduct.id}
                className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
                style={{
                  transform: 'translateZ(0)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 
                        className="text-xl font-bold text-gray-900 mb-1 relative"
                        style={{
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                          transform: 'perspective(300px) translateZ(10px)',
                        }}
                      >
                        Conduite - {conduct.period}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Année scolaire: {conduct.academicYear}
                      </p>
                    </div>
                    {trend && (
                      <div className="flex items-center space-x-2">
                        {trend === 'up' && <FiTrendingUp className="w-6 h-6 text-green-500" />}
                        {trend === 'down' && <FiTrendingDown className="w-6 h-6 text-red-500" />}
                        {trend === 'stable' && <FiMinus className="w-6 h-6 text-gray-400" />}
                      </div>
                    )}
                  </div>

                  {/* Moyenne générale de conduite */}
                  <div className={`bg-gradient-to-r ${getConductColor(conduct.average)} rounded-lg p-6 text-white mb-6`}
                    style={{
                      boxShadow: `0 4px 12px ${conduct.average >= 16 ? 'rgba(16, 185, 129, 0.3)' : conduct.average >= 12 ? 'rgba(59, 130, 246, 0.3)' : conduct.average >= 10 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm opacity-90 mb-1">Moyenne de Conduite</p>
                        <p className="text-4xl font-bold">
                          {conduct.average.toFixed(2)} <span className="text-2xl">/ 20</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={conduct.average >= 10 ? 'success' : 'danger'} 
                          size="md"
                          className="bg-white/20 text-white border-white/30"
                        >
                          {getConductLabel(conduct.average)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Détails par critère */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white">
                            <FiClock className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Ponctualité</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {conduct.punctuality.toFixed(2)}/20
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white">
                            <FiUsers className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Respect</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {conduct.respect.toFixed(2)}/20
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 border-l-4 border-purple-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                            <FiMessageSquare className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Participation</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {conduct.participation.toFixed(2)}/20
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 bg-gradient-to-br from-orange-50 to-red-50 border-l-4 border-orange-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white">
                            <FiAward className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Comportement</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {conduct.behavior.toFixed(2)}/20
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Commentaires */}
                  {conduct.comments && (
                    <Card className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 border-l-4 border-gray-400">
                      <div className="flex items-start space-x-3">
                        <FiFileText className="w-5 h-5 text-gray-600 mt-1" />
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-1">Commentaires</p>
                          <p className="text-sm text-gray-600">{conduct.comments}</p>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Évaluateur et Date */}
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-2">
                      {conduct.evaluatedBy && (
                        <>
                          {conduct.evaluatedBy.role === 'ADMIN' ? (
                            <FiShield className="w-4 h-4 text-purple-600" />
                          ) : (
                            <FiUser className="w-4 h-4 text-blue-600" />
                          )}
                          <span>
                            Évalué par <span className="font-semibold text-gray-700">
                              {conduct.evaluatedBy.firstName} {conduct.evaluatedBy.lastName}
                            </span>
                            {conduct.evaluatedBy.role === 'ADMIN' ? (
                              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                Administration
                              </span>
                            ) : (
                              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                Professeur Principal
                              </span>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                    <div>
                      Le {format(new Date(conduct.createdAt), 'dd MMMM yyyy', { locale: fr })}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiAward className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucune évaluation de conduite disponible</p>
            <p className="text-sm">Vos évaluations de conduite apparaîtront ici une fois saisies</p>
          </div>
        </Card>
      )}

      {/* Styles CSS pour les effets 3D */}
      <style>{`
        .perspective-3d {
          perspective: 1000px;
        }
        
        .transform-gpu {
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default StudentConduct;

