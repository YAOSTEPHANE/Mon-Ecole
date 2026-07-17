import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import GradesChart from './GradesChart';
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiMinus, 
  FiChevronDown, 
  FiChevronUp,
  FiFileText,
  FiCalendar,
  FiAward,
  FiBook,
  FiDownload,
  FiSearch,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getEvaluationTypeLabel } from '@/lib/evaluationTypes';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const StudentGrades = ({ searchQuery = '', searchCategory = 'all', searchDateRange = 'all' }: { searchQuery?: string; searchCategory?: string; searchDateRange?: string }) => {
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [selectedReportCard, setSelectedReportCard] = useState<any>(null);
  const [showReportCardModal, setShowReportCardModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => studentApi.getGrades(),
  });

  const { data: reportPayload } = useQuery({
    queryKey: ['student-report-cards'],
    queryFn: () => studentApi.getReportCards(),
  });

  const tuitionBlock = data?.tuitionBlock as
    | { active?: boolean; hiddenAcademicYears?: string[] }
    | undefined;

  const legacyReportList = Array.isArray(reportPayload);
  const reportCardsList = legacyReportList
    ? (reportPayload as any[])
    : ((reportPayload as { reportCards?: any[] } | undefined)?.reportCards ?? []);
  const reportCardsTuitionBlock = legacyReportList
    ? tuitionBlock
    : (reportPayload as { tuitionBlock?: { active?: boolean; hiddenAcademicYears?: string[] } } | undefined)
        ?.tuitionBlock ?? tuitionBlock;

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

    // Filtre par période
    if (searchDateRange !== 'all') {
      const now = new Date();
      let dateLimit = new Date();
      if (searchDateRange === 'week') {
        dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (searchDateRange === 'month') {
        dateLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (searchDateRange === 'semester') {
        dateLimit = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      }
      filtered = filtered.filter((grade: any) => {
        const gradeDate = new Date(grade.date);
        return gradeDate >= dateLimit;
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
  }, [data, searchQuery, searchDateRange]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
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

  const exportGradesToPDF = () => {
    if (!filteredData?.grades || filteredData.grades.length === 0) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const currentDate = new Date().toLocaleDateString('fr-FR');

    // Header
    doc.setFontSize(20);
    doc.setTextColor(147, 51, 234);
    doc.text('School Manager', 14, 20);
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Relevé de Notes', 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Généré le ${currentDate}`, 14, 37);

    // Table data
    const tableData = filteredData.grades.map((grade: any) => [
      grade.course?.name || 'N/A',
      format(new Date(grade.date), 'dd/MM/yyyy', { locale: fr }),
      `${grade.score}/${grade.maxScore}`,
      ((grade.score / grade.maxScore) * 20).toFixed(2),
      grade.coefficient.toString(),
      getEvaluationTypeLabel(grade.evaluationType),
      `${grade.teacher?.user?.firstName || ''} ${grade.teacher?.user?.lastName || ''}`.trim() || 'N/A',
    ]);

    const useAutoTable = (options: any) => {
      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable(options);
      } else {
        autoTable(doc, options);
      }
    };

    useAutoTable({
      head: [['Matière', 'Date', 'Note', 'Sur 20', 'Coeff.', 'Type', 'Enseignant']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });

    // Moyennes par matière
    let yPos = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text('Moyennes par Matière', 14, yPos);
    yPos += 10;

    Object.entries(filteredData.courseAverages || {}).forEach(([courseId, avg]: [string, any]) => {
      const course = filteredData.grades.find((g: any) => g.courseId === courseId)?.course;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${course?.name || 'N/A'}: ${avg.average.toFixed(2)}/20`, 14, yPos);
      yPos += 7;
    });

    doc.save(`notes_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-6">
      {(tuitionBlock?.active || reportCardsTuitionBlock?.active) &&
        ((tuitionBlock?.hiddenAcademicYears?.length ?? 0) > 0 ||
          (reportCardsTuitionBlock?.hiddenAcademicYears?.length ?? 0) > 0) && (
        <Card className="border-l-4 border-amber-500 bg-amber-50/90 ring-1 ring-amber-200/80">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div className="text-sm text-amber-950">
              <p className="font-semibold text-amber-900 mb-1">Accès aux notes et bulletins limité</p>
              <p className="text-amber-900/90 leading-relaxed">
                Des frais d&apos;inscription ou de scolarité restent impayés pour la ou les années scolaires :{' '}
                <span className="font-medium">
                  {[
                    ...(tuitionBlock?.hiddenAcademicYears ?? []),
                    ...(reportCardsTuitionBlock?.hiddenAcademicYears ?? []),
                  ]
                    .filter((y, i, arr) => arr.indexOf(y) === i)
                    .join(', ')}
                </span>.
                Les notes et bulletins de ces années ne sont plus affichés après la clôture de l&apos;année.
                Régularisez la situation auprès du secrétariat ou via la section Paiements.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Indicateur de recherche */}
      {(searchQuery || searchDateRange !== 'all') && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FiSearch className="w-5 h-5 text-purple-600" />
              <div>
                <p className="font-semibold text-gray-900">
                  {searchQuery && <>Recherche: <span className="text-purple-600">"{searchQuery}"</span></>}
                </p>
                <p className="text-sm text-gray-600">
                  {filteredData.grades.length} note(s) trouvée(s)
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Section Bulletins */}
      {reportCardsList.length > 0 && (
        <Card 
          className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
          style={{
            transform: 'translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 
                className="text-xl font-bold text-gray-900 relative"
                style={{
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  transform: 'perspective(300px) translateZ(10px)',
                }}
              >
                <FiFileText className="w-6 h-6 inline mr-2 text-purple-600" />
                Mes Bulletins
              </h2>
              <Button
                onClick={exportGradesToPDF}
                variant="secondary"
                size="sm"
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Exporter Notes (PDF)
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reportCardsList.map((reportCard: any) => (
                <Card
                  key={reportCard.id}
                  className="relative overflow-hidden group/card perspective-3d transform-gpu transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer"
                  style={{
                    transform: 'translateZ(0)',
                    transformStyle: 'preserve-3d',
                  }}
                  onClick={() => {
                    setSelectedReportCard(reportCard);
                    setShowReportCardModal(true);
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white transform rotate-3 group-hover/card:rotate-6 transition-transform"
                        style={{
                          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        <FiAward className="w-6 h-6" />
                      </div>
                      <Badge variant="info" size="sm">
                        {reportCard.period}
                      </Badge>
                    </div>
                    <h3 
                      className="font-bold text-gray-900 mb-1 relative"
                      style={{
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                        transform: 'translateZ(5px)',
                      }}
                    >
                      {reportCard.academicYear}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Moyenne: <span className="font-bold text-purple-600">{reportCard.average?.toFixed(2) || 'N/A'}/20</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(reportCard.createdAt), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Notes par matière */}
      {filteredData.grades && filteredData.grades.length > 0 ? (
        <>
          <div className="space-y-4">
            {Object.entries(filteredData.courseAverages || {}).map(([courseId, avg]: [string, any]) => {
              const course = filteredData.grades.find((g: any) => g.courseId === courseId)?.course;
              const courseGrades = filteredData.grades
                .filter((g: any) => g.courseId === courseId)
                .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
              const trend = getTrend(courseId);
              const isExpanded = expandedCourses.has(courseId);
              
              return (
                <Card 
                  key={courseId}
                  className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
                  style={{
                    transform: 'translateZ(0)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  <div className="relative z-10">
                    {/* Header de la matière */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getAverageColor(avg.average)} flex items-center justify-center text-white transform rotate-3 group-hover:rotate-6 transition-transform`}
                            style={{
                              boxShadow: `0 4px 12px ${avg.average >= 16 ? 'rgba(16, 185, 129, 0.3)' : avg.average >= 12 ? 'rgba(59, 130, 246, 0.3)' : avg.average >= 10 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                            }}
                          >
                            <FiBook className="w-7 h-7" />
                          </div>
                          <div className="flex-1">
                            <h3 
                              className="font-bold text-lg text-gray-900 relative"
                              style={{
                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                                transform: 'translateZ(5px)',
                              }}
                            >
                              {course?.name || 'Matière inconnue'}
                            </h3>
                            <p className="text-sm text-gray-600">{course?.class?.name || ''}</p>
                          </div>
                          {trend && (
                            <div className="ml-2">
                              {trend === 'up' && <FiTrendingUp className="w-6 h-6 text-green-500" />}
                              {trend === 'down' && <FiTrendingDown className="w-6 h-6 text-red-500" />}
                              {trend === 'stable' && <FiMinus className="w-6 h-6 text-gray-400" />}
                            </div>
                          )}
                        </div>
                        
                        {/* Moyenne */}
                        <div className={`bg-gradient-to-r ${getAverageColor(avg.average)} rounded-lg p-4 text-white mb-4`}
                          style={{
                            boxShadow: `0 4px 12px ${avg.average >= 16 ? 'rgba(16, 185, 129, 0.3)' : avg.average >= 12 ? 'rgba(59, 130, 246, 0.3)' : avg.average >= 10 ? 'rgba(234, 179, 8, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                          }}
                        >
                          <p className="text-sm opacity-90 mb-1">Moyenne de la matière</p>
                          <p className="text-3xl font-bold">
                            {avg.average.toFixed(2)} <span className="text-lg">/ 20</span>
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-sm opacity-90">
                              {courseGrades.length} note(s)
                            </span>
                            <Badge 
                              variant={avg.average >= 10 ? 'success' : 'danger'} 
                              size="sm"
                              className="bg-white/20 text-white border-white/30"
                            >
                              {avg.average >= 10 ? 'Admis' : 'Non admis'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bouton pour voir les détails */}
                    <Button
                      onClick={() => toggleCourse(courseId)}
                      variant="secondary"
                      size="sm"
                      className="w-full"
                    >
                      {isExpanded ? (
                        <>
                          <FiChevronUp className="w-4 h-4 mr-2" />
                          Masquer les détails
                        </>
                      ) : (
                        <>
                          <FiChevronDown className="w-4 h-4 mr-2" />
                          Voir toutes les notes ({courseGrades.length})
                        </>
                      )}
                    </Button>

                    {/* Détails des notes */}
                    {isExpanded && (
                      <div className="mt-4 space-y-3">
                        <h4 className="font-semibold text-gray-800 mb-3">Détail des notes :</h4>
                        {courseGrades.map((grade: any) => {
                          const gradeOn20 = (grade.score / grade.maxScore) * 20;
                          return (
                            <Card
                              key={grade.id}
                              className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-l-4"
                              style={{
                                borderLeftColor: gradeOn20 >= 16 ? '#10b981' : gradeOn20 >= 12 ? '#3b82f6' : gradeOn20 >= 10 ? '#eab308' : '#ef4444',
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-4 mb-2">
                                    <div className="flex items-center space-x-1 text-sm text-gray-600">
                                      <FiCalendar className="w-4 h-4" />
                                      <span>{format(new Date(grade.date), 'dd MMMM yyyy', { locale: fr })}</span>
                                    </div>
                                    <Badge variant="info" size="sm">
                                      {getEvaluationTypeLabel(grade.evaluationType)}
                                    </Badge>
                                    <Badge variant="secondary" size="sm">
                                      Coeff. {grade.coefficient}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    Enseignant: {grade.teacher?.user?.firstName} {grade.teacher?.user?.lastName}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-gray-900">
                                    {gradeOn20.toFixed(2)}
                                    <span className="text-sm text-gray-500">/20</span>
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {grade.score}/{grade.maxScore}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <GradesChart grades={filteredData.grades} />
        </>
      ) : (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiBook className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">
              {tuitionBlock?.active ? 'Notes non disponibles' : 'Aucune note disponible'}
            </p>
            <p className="text-sm">
              {tuitionBlock?.active
                ? 'Certaines notes peuvent être masquées tant que la scolarité ou l\'inscription n\'est pas entièrement réglée pour les années concernées.'
                : 'Vos notes apparaîtront ici une fois saisies par vos enseignants'}
            </p>
          </div>
        </Card>
      )}

      {/* Modal pour voir le bulletin */}
      <Modal
        isOpen={showReportCardModal}
        onClose={() => {
          setShowReportCardModal(false);
          setSelectedReportCard(null);
        }}
        title="Détails du Bulletin"
        size="lg"
      >
        {selectedReportCard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Période</p>
                <p className="font-semibold">{selectedReportCard.period}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Année scolaire</p>
                <p className="font-semibold">{selectedReportCard.academicYear}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Moyenne générale</p>
                <p className="font-bold text-2xl text-purple-600">
                  {selectedReportCard.average?.toFixed(2) || 'N/A'}/20
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Rang</p>
                <p className="font-semibold">{selectedReportCard.rank || 'N/A'}</p>
              </div>
            </div>
            {selectedReportCard.subjects && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Notes par matière :</p>
                <div className="space-y-2">
                  {Object.entries(selectedReportCard.subjects).map(([subject, data]: [string, any]) => (
                    <div key={subject} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{subject}</span>
                        <span className="font-bold">{data.average?.toFixed(2) || 'N/A'}/20</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

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

export default StudentGrades;

