import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import FilterDropdown from '../ui/FilterDropdown';
import {
  ComposedChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  PremiumTooltip,
  LineAreaGradient,
  CHART_GRID,
  CHART_AXIS_TICK,
  CHART_MARGIN_COMPACT,
  CHART_MARGIN_TILTED,
  RechartsViewport,
  CHART_BLUE,
  CHART_RED,
  chartBlueRed,
  CHART_ANIMATION_MS,
} from '../charts';
import {
  FiBarChart,
  FiTrendingUp,
  FiTrendingDown,
  FiDownload,
  FiSearch,
  FiFilter,
  FiUsers,
  FiBook,
  FiAward,
  FiCalendar,
  FiActivity,
  FiTarget,
  FiRefreshCw,
  FiFileText,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { ADM } from './adminModuleLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AdvancedAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedMetric, setSelectedMetric] = useState<string>('grades');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Fermer le menu d'export quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Fetch data
  const { data: students } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });

  const { data: grades } = useQuery({
    queryKey: ['admin-grades'],
    queryFn: () => adminApi.getAllGrades(),
  });

  const { data: absences } = useQuery({
    queryKey: ['admin-absences'],
    queryFn: () => adminApi.getAllAbsences(),
  });

  const { data: assignments } = useQuery({
    queryKey: ['admin-assignments'],
    queryFn: () => adminApi.getAllAssignments(),
  });

  // Calculer les données pour les graphiques
  const gradeTrendData = grades
    ? grades
        .reduce((acc: any[], grade: any) => {
          const month = format(new Date(grade.date), 'MMM yyyy', { locale: fr });
          const existing = acc.find((item) => item.month === month);
          const score = (grade.score / grade.maxScore) * 20;

          if (existing) {
            existing.total += score;
            existing.count += 1;
            existing.average = existing.total / existing.count;
          } else {
            acc.push({ month, total: score, count: 1, average: score });
          }
          return acc;
        }, [])
        .sort(
          (
            a: { month: string; total: number; count: number; average: number },
            b: { month: string; total: number; count: number; average: number }
          ) => new Date(a.month).getTime() - new Date(b.month).getTime()
        )
    : [];

  const classPerformanceData = classes
    ? classes.map((cls: any) => {
        const classGrades = grades?.filter(
          (g: any) => g.student?.class?.id === cls.id
        ) || [];
        const average =
          classGrades.length > 0
            ? classGrades.reduce(
                (sum: number, g: any) => sum + (g.score / g.maxScore) * 20,
                0
              ) / classGrades.length
            : 0;
        return {
          name: cls.name,
          moyenne: average.toFixed(2),
          élèves: cls._count?.students || 0,
        };
      })
    : [];

  const subjectDistribution = grades
    ? grades.reduce((acc: any, grade: any) => {
        const courseName = grade.course?.name || 'Inconnu';
        if (!acc[courseName]) {
          acc[courseName] = { name: courseName, count: 0, total: 0 };
        }
        acc[courseName].count += 1;
        acc[courseName].total += (grade.score / grade.maxScore) * 20;
        return acc;
      }, {})
    : {};

  const subjectData = Object.values(subjectDistribution).map((subj: any) => ({
    name: subj.name,
    moyenne: (subj.total / subj.count).toFixed(2),
    count: subj.count,
  }));

  const absenceTrendData = absences
    ? absences
        .reduce((acc: any[], absence: any) => {
          const month = format(new Date(absence.date), 'MMM yyyy', { locale: fr });
          const existing = acc.find((item) => item.month === month);

          if (existing) {
            existing.count += 1;
            if (!absence.excused) existing.unexcused += 1;
          } else {
            acc.push({
              month,
              count: 1,
              unexcused: absence.excused ? 0 : 1,
            });
          }
          return acc;
        }, [])
        .sort(
          (
            a: { month: string; count: number; unexcused: number },
            b: { month: string; count: number; unexcused: number }
          ) => new Date(a.month).getTime() - new Date(b.month).getTime()
        )
    : [];

  const assignmentCompletionData = assignments
    ? assignments.map((assignment: any) => {
        const submitted = assignment.students?.filter((s: any) => s.submitted).length || 0;
        const total = assignment.students?.length || 0;
        return {
          name: assignment.title,
          complété: total > 0 ? (submitted / total) * 100 : 0,
          total,
          submitted,
        };
      })
    : [];

  // Export functions
  const exportToCSV = () => {
    try {
      const headers = ['Type', 'Nom', 'Valeur', 'Période'];
      const csvContent =
        '\ufeff' + // BOM for UTF-8
        headers.join(';') +
        '\n' +
        [
          ...classPerformanceData.map((c: any) =>
            ['Classe', c.name, c.moyenne, selectedPeriod].join(';')
          ),
          ...subjectData.map((s: any) =>
            ['Matière', s.name, s.moyenne, selectedPeriod].join(';')
          ),
          [
            'Statistique',
            'Moyenne Générale',
            grades?.length
              ? (grades.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) /
                  grades.length).toFixed(2)
              : '0.00',
            selectedPeriod,
          ].join(';'),
          [
            'Statistique',
            'Taux de Réussite',
            grades?.length
              ? (
                  (grades.filter((g: any) => (g.score / g.maxScore) * 20 >= 10).length /
                    grades.length) *
                  100
                ).toFixed(1) + '%'
              : '0.0%',
            selectedPeriod,
          ].join(';'),
        ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport exporté en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportToJSON = () => {
    try {
      const jsonData = {
        période: selectedPeriod,
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        classes: classPerformanceData.map((c: any) => ({
          nom: c.name,
          moyenne: c.moyenne,
          nombreÉlèves: c.élèves,
        })),
        matières: subjectData.map((s: any) => ({
          nom: s.name,
          moyenne: s.moyenne,
          nombreNotes: s.count,
        })),
        statistiques: {
          moyenneGénérale: grades?.length
            ? (grades.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) /
                grades.length).toFixed(2)
            : '0.00',
          tauxRéussite: grades?.length
            ? (
                (grades.filter((g: any) => (g.score / g.maxScore) * 20 >= 10).length /
                  grades.length) *
                100
              ).toFixed(1) + '%'
            : '0.0%',
          tauxAssiduité: absences?.length
            ? (
                ((absences.length - absences.filter((a: any) => !a.excused).length) /
                  absences.length) *
                100
              ).toFixed(1) + '%'
            : '100.0%',
          complétionDevoirs: assignments?.length
            ? (
                assignments.reduce((sum: number, a: any) => {
                  const submitted = a.students?.filter((s: any) => s.submitted).length || 0;
                  const total = a.students?.length || 0;
                  return sum + (total > 0 ? (submitted / total) * 100 : 0);
                }, 0) / assignments.length
              ).toFixed(1) + '%'
            : '0.0%',
        },
        évolutionNotes: gradeTrendData.map((g: any) => ({
          mois: g.month,
          moyenne: g.average.toFixed(2),
        })),
        évolutionAbsences: absenceTrendData.map((a: any) => ({
          mois: a.month,
          total: a.count,
          nonJustifiées: a.unexcused,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport exporté en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');
      
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129);
      doc.text('School Manager', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Rapport Analytique Avancé', 14, 30);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate} - Période: ${selectedPeriod}`, 14, 37);

      // Données des classes
      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      useAutoTable({
        startY: 45,
        head: [['Classe', 'Moyenne', 'Nombre d\'élèves']],
        body: classPerformanceData.map((c: any) => [c.name, c.moyenne, c.élèves]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      // Données des matières
      let finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Performance par Matière', 14, finalY);
      useAutoTable({
        startY: finalY + 10,
        head: [['Matière', 'Moyenne', 'Nombre de notes']],
        body: subjectData.map((s: any) => [s.name, s.moyenne, s.count]),
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      // Statistiques
      finalY = (doc as any).lastAutoTable.finalY + 20;
      doc.setFontSize(14);
      doc.text('Statistiques Globales', 14, finalY);
      const statsData = [
        [
          'Moyenne Générale',
          grades?.length
            ? (grades.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) /
                grades.length).toFixed(2)
            : '0.00',
        ],
        [
          'Taux de Réussite',
          grades?.length
            ? (
                (grades.filter((g: any) => (g.score / g.maxScore) * 20 >= 10).length /
                  grades.length) *
                100
              ).toFixed(1) + '%'
            : '0.0%',
        ],
        [
          'Taux d\'Assiduité',
          absences?.length
            ? (
                ((absences.length - absences.filter((a: any) => !a.excused).length) /
                  absences.length) *
                100
              ).toFixed(1) + '%'
            : '100.0%',
        ],
        [
          'Complétion Devoirs',
          assignments?.length
            ? (
                assignments.reduce((sum: number, a: any) => {
                  const submitted = a.students?.filter((s: any) => s.submitted).length || 0;
                  const total = a.students?.length || 0;
                  return sum + (total > 0 ? (submitted / total) * 100 : 0);
                }, 0) / assignments.length
              ).toFixed(1) + '%'
            : '0.0%',
        ],
      ];
      useAutoTable({
        startY: finalY + 10,
        head: [['Indicateur', 'Valeur']],
        body: statsData,
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport exporté en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className={ADM.pageRoot}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className={`text-emerald-50 ${ADM.heroTitle}`}>Analytique Avancée</h2>
            <p className="text-green-100/95 text-sm leading-snug mt-0.5">
              Tableaux de bord interactifs avec données en temps réel
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="outline"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                  <button
                    onClick={() => {
                      exportToCSV();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <FiFileText className="w-4 h-4 text-green-600" />
                    <span>Exporter en CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToJSON();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <FiFileText className="w-4 h-4 text-blue-600" />
                    <span>Exporter en JSON</span>
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF();
                      setIsExportMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                  >
                    <FiFileText className="w-4 h-4 text-red-600" />
                    <span>Exporter en PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-3">
          <FilterDropdown
            compact
            label="Période"
            value={selectedPeriod}
            onChange={setSelectedPeriod}
            options={[
              { value: 'week', label: 'Semaine' },
              { value: 'month', label: 'Mois' },
              { value: 'semester', label: 'Semestre' },
              { value: 'year', label: 'Année' },
            ]}
          />
          <FilterDropdown
            compact
            label="Classe"
            value={selectedClass}
            onChange={setSelectedClass}
            options={[
              { value: 'all', label: 'Toutes les classes' },
              ...(classes?.map((c: any) => ({ value: c.id, label: c.name })) || []),
            ]}
          />
          <FilterDropdown
            compact
            label="Métrique"
            value={selectedMetric}
            onChange={setSelectedMetric}
            options={[
              { value: 'grades', label: 'Notes' },
              { value: 'absences', label: 'Absences' },
              { value: 'assignments', label: 'Devoirs' },
              { value: 'overview', label: 'Vue d\'ensemble' },
            ]}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPeriod('month');
              setSelectedClass('all');
              setSelectedMetric('grades');
            }}
            className="self-end"
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Réinitialiser
          </Button>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des notes */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Évolution des Notes</h3>
            <Badge className="bg-blue-100 text-blue-800">
              {selectedPeriod === 'week' ? 'Semaine' : selectedPeriod === 'month' ? 'Mois' : selectedPeriod === 'semester' ? 'Semestre' : 'Année'}
            </Badge>
          </div>
          {gradeTrendData.length > 0 ? (
            <RechartsViewport height={320}>
              <ComposedChart data={gradeTrendData} margin={CHART_MARGIN_COMPACT}>
                <LineAreaGradient id="advLineArea" colorFrom={CHART_BLUE} colorTo="#dbeafe" />
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="month"
                  tick={CHART_AXIS_TICK}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 20]}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm font-medium text-slate-600">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="average"
                  stroke="none"
                  fill="url(#advLineArea)"
                  fillOpacity={1}
                  legendType="none"
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke={CHART_RED}
                  strokeWidth={3}
                  name="Moyenne (/20)"
                  dot={{ r: 5, strokeWidth: 2, stroke: '#fff', fill: CHART_RED }}
                  activeDot={{ r: 8, strokeWidth: 2, stroke: '#fff' }}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
              </ComposedChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Performance par classe */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">Performance par Classe</h3>
            {selectedClass !== 'all' && (
              <Badge className="bg-green-100 text-green-800">
                {classes?.find((c: any) => c.id === selectedClass)?.name || 'Classe sélectionnée'}
              </Badge>
            )}
          </div>
          {classPerformanceData.length > 0 ? (
            <RechartsViewport height={320}>
              <BarChart data={classPerformanceData} margin={CHART_MARGIN_TILTED}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="name"
                  angle={-40}
                  textAnchor="end"
                  height={88}
                  interval={0}
                  tick={CHART_AXIS_TICK}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 20]}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm font-medium text-slate-600">{value}</span>
                  )}
                />
                <Bar
                  dataKey="moyenne"
                  name="Moyenne (/20)"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={56}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                >
                  {classPerformanceData.map((_, index) => (
                    <Cell key={`perf-${index}`} fill={chartBlueRed(index)} />
                  ))}
                </Bar>
              </BarChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Distribution par matière */}
        <Card>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Distribution par Matière</h3>
          {subjectData.length > 0 ? (
            <RechartsViewport height={320}>
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props) => {
                    const { name, moyenne } = props as { name?: string; moyenne?: number | string };
                    return `${name ?? ''}: ${moyenne ?? ''}`;
                  }}
                  outerRadius={96}
                  innerRadius={28}
                  paddingAngle={2}
                  cornerRadius={6}
                  stroke="#fff"
                  strokeWidth={2}
                  dataKey="count"
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                >
                  {subjectData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartBlueRed(index)} />
                  ))}
                </Pie>
                <Tooltip content={(p) => <PremiumTooltip {...p} />} />
              </PieChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Évolution des absences */}
        <Card>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Évolution des Absences</h3>
          {absenceTrendData.length > 0 ? (
            <RechartsViewport height={320}>
              <AreaChart data={absenceTrendData} margin={CHART_MARGIN_COMPACT}>
                <defs>
                  <linearGradient id="advAbsTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.06} />
                  </linearGradient>
                  <linearGradient id="advAbsUnex" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_RED} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={CHART_RED} stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="month"
                  tick={CHART_AXIS_TICK}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm font-medium text-slate-600">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stackId="1"
                  stroke={CHART_BLUE}
                  strokeWidth={2}
                  fill="url(#advAbsTotal)"
                  name="Total absences"
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
                <Area
                  type="monotone"
                  dataKey="unexcused"
                  stackId="2"
                  stroke={CHART_RED}
                  strokeWidth={2}
                  fill="url(#advAbsUnex)"
                  name="Non justifiées"
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
              </AreaChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Taux de complétion des devoirs */}
        <Card>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Taux de Complétion des Devoirs</h3>
          {assignmentCompletionData.length > 0 ? (
            <RechartsViewport height={320}>
              <BarChart data={assignmentCompletionData} margin={CHART_MARGIN_TILTED}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis
                  dataKey="name"
                  angle={-40}
                  textAnchor="end"
                  height={88}
                  interval={0}
                  tick={CHART_AXIS_TICK}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={CHART_AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={(p) => <PremiumTooltip {...p} valueSuffix="%" />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-sm font-medium text-slate-600">{value}</span>
                  )}
                />
                <Bar
                  dataKey="complété"
                  fill={CHART_BLUE}
                  name="Complétion"
                  radius={[10, 10, 0, 0]}
                  maxBarSize={48}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
              </BarChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>

        {/* Vue d'ensemble radar */}
        <Card>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Vue d'Ensemble</h3>
          {(grades?.length || absences?.length || assignments?.length) ? (
            <RechartsViewport height={320}>
              <RadarChart
                cx="50%"
                cy="50%"
                outerRadius="75%"
                data={[
                  {
                    subject: 'Notes',
                    A: grades?.length
                      ? (grades.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) /
                          grades.length /
                          20) *
                        100
                      : 0,
                    fullMark: 100,
                  },
                  {
                    subject: 'Assiduité',
                    A: absences?.length
                      ? ((absences.length - absences.filter((a: any) => !a.excused).length) / absences.length) * 100
                      : 100,
                    fullMark: 100,
                  },
                  {
                    subject: 'Devoirs',
                    A: assignments?.length
                      ? assignments.reduce((sum: number, a: any) => {
                          const submitted = a.students?.filter((s: any) => s.submitted).length || 0;
                          const total = a.students?.length || 0;
                          return sum + (total > 0 ? (submitted / total) * 100 : 0);
                        }, 0) / assignments.length
                      : 0,
                    fullMark: 100,
                  },
                ]}
              >
                <defs>
                  <radialGradient id="advRadarFill" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.42} />
                    <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.08} />
                  </radialGradient>
                </defs>
                <PolarGrid stroke="#cbd5e1" strokeDasharray="4 8" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                />
                <Radar
                  name="Indice"
                  dataKey="A"
                  stroke={CHART_BLUE}
                  strokeWidth={2.5}
                  fill="url(#advRadarFill)"
                  fillOpacity={1}
                  isAnimationActive
                  animationDuration={CHART_ANIMATION_MS}
                />
                <Tooltip content={(p) => <PremiumTooltip {...p} valueSuffix="%" />} />
              </RadarChart>
            </RechartsViewport>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-gray-400">
              <div className="text-center">
                <FiBarChart className="w-12 h-12 mx-auto mb-2" />
                <p>Aucune donnée disponible</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Statistiques détaillées */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Moyenne Générale</p>
              <p className="text-2xl font-bold text-blue-600">
                {grades?.length
                  ? (grades.reduce((sum: number, g: any) => sum + (g.score / g.maxScore) * 20, 0) /
                      grades.length).toFixed(2)
                  : '0.00'}
                /20
              </p>
            </div>
            <FiAward className="w-12 h-12 text-blue-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Taux de Réussite</p>
              <p className="text-2xl font-bold text-green-600">
                {grades?.length
                  ? (
                      (grades.filter((g: any) => (g.score / g.maxScore) * 20 >= 10).length /
                        grades.length) *
                      100
                    ).toFixed(1)
                  : '0.0'}
                %
              </p>
            </div>
            <FiTrendingUp className="w-12 h-12 text-green-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Taux d'Assiduité</p>
              <p className="text-2xl font-bold text-yellow-600">
                {absences?.length
                  ? (
                      ((absences.length - absences.filter((a: any) => !a.excused).length) /
                        absences.length) *
                      100
                    ).toFixed(1)
                  : '100.0'}
                %
              </p>
            </div>
            <FiCalendar className="w-12 h-12 text-yellow-400" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Complétion Devoirs</p>
              <p className="text-2xl font-bold text-purple-600">
                {assignments?.length
                  ? (
                      assignments.reduce((sum: number, a: any) => {
                        const submitted = a.students?.filter((s: any) => s.submitted).length || 0;
                        const total = a.students?.length || 0;
                        return sum + (total > 0 ? (submitted / total) * 100 : 0);
                      }, 0) / assignments.length
                    ).toFixed(1)
                  : '0.0'}
                %
              </p>
            </div>
            <FiTarget className="w-12 h-12 text-purple-400" />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;

