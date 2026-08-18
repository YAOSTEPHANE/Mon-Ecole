'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiDownload,
  FiFileText,
  FiRefreshCw,
} from 'react-icons/fi';
import { adminApi } from '../../services/api';
import { ADM } from './adminModuleLayout';
import {
  CHART_ANIMATION_MS,
  CHART_AXIS_TICK,
  CHART_BLUE,
  CHART_GRID,
  CHART_MARGIN_COMPACT,
  CHART_RED,
  PremiumTooltip,
  RechartsViewport,
} from '../charts';
import {
  InsightCard,
  InsightEmpty,
  InsightHeatmap,
  InsightSelect,
  INSIGHT_CARD,
} from './insights/InsightsUi';

type GradeRow = {
  date?: string;
  score: number;
  maxScore: number;
  student?: { class?: { id?: string; name?: string } };
  course?: { name?: string };
};
type AbsenceRow = {
  date?: string;
  excused?: boolean;
  student?: { class?: { id?: string; name?: string } };
};
type AssignmentRow = {
  title?: string;
  students?: Array<{ submitted?: boolean }>;
};
type ClassRow = { id: string; name?: string; _count?: { students?: number } };

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

function periodStart(period: string): Date {
  const d = new Date();
  if (period === 'week') d.setDate(d.getDate() - 7);
  else if (period === 'month') d.setMonth(d.getMonth() - 1);
  else if (period === 'semester') d.setMonth(d.getMonth() - 6);
  else d.setFullYear(d.getFullYear() - 1);
  return d;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function score20(row: GradeRow): number {
  return row.maxScore > 0 ? (row.score / row.maxScore) * 20 : 0;
}

const AdvancedAnalytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportMenuOpen]);

  const { data: classesRaw } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
  });
  const { data: gradesRaw } = useQuery({
    queryKey: ['admin-grades'],
    queryFn: () => adminApi.getAllGrades(),
  });
  const { data: absencesRaw } = useQuery({
    queryKey: ['admin-absences'],
    queryFn: () => adminApi.getAllAbsences(),
  });
  const { data: assignmentsRaw } = useQuery({
    queryKey: ['admin-assignments'],
    queryFn: () => adminApi.getAllAssignments(),
  });

  const classes = asArray<ClassRow>(classesRaw);
  const start = useMemo(() => periodStart(selectedPeriod), [selectedPeriod]);

  const grades = useMemo(() => {
    return asArray<GradeRow>(gradesRaw).filter((g) => {
      if (g.date && new Date(g.date) < start) return false;
      if (selectedClass !== 'all' && g.student?.class?.id !== selectedClass) return false;
      return true;
    });
  }, [gradesRaw, start, selectedClass]);

  const absences = useMemo(() => {
    return asArray<AbsenceRow>(absencesRaw).filter((a) => {
      if (a.date && new Date(a.date) < start) return false;
      if (selectedClass !== 'all' && a.student?.class?.id !== selectedClass) return false;
      return true;
    });
  }, [absencesRaw, start, selectedClass]);

  const assignments = asArray<AssignmentRow>(assignmentsRaw);

  const gradeTrendData = useMemo(() => {
    const acc = new Map<string, { month: string; total: number; count: number }>();
    for (const grade of grades) {
      if (!grade.date) continue;
      const month = format(new Date(grade.date), 'MMM yyyy', { locale: fr });
      const cur = acc.get(month) ?? { month, total: 0, count: 0 };
      cur.total += score20(grade);
      cur.count += 1;
      acc.set(month, cur);
    }
    return [...acc.values()]
      .map((row) => ({ ...row, average: row.count > 0 ? row.total / row.count : 0 }))
      .sort((a, b) => a.month.localeCompare(b.month, 'fr'));
  }, [grades]);

  const classPerformanceData = useMemo(() => {
    return classes.map((cls) => {
      const classGrades = grades.filter((g) => g.student?.class?.id === cls.id);
      const average =
        classGrades.length > 0
          ? classGrades.reduce((sum, g) => sum + score20(g), 0) / classGrades.length
          : 0;
      return {
        name: cls.name || 'Classe',
        moyenne: Number(average.toFixed(2)),
        élèves: cls._count?.students || 0,
      };
    });
  }, [classes, grades]);

  const absenceTrendData = useMemo(() => {
    const acc = new Map<string, { month: string; count: number; unexcused: number }>();
    for (const absence of absences) {
      if (!absence.date) continue;
      const month = format(new Date(absence.date), 'MMM yyyy', { locale: fr });
      const cur = acc.get(month) ?? { month, count: 0, unexcused: 0 };
      cur.count += 1;
      if (!absence.excused) cur.unexcused += 1;
      acc.set(month, cur);
    }
    return [...acc.values()].sort((a, b) => a.month.localeCompare(b.month, 'fr'));
  }, [absences]);

  const heatmap = useMemo(() => {
    const rowsMap = new Map<string, number[]>();
    for (const row of absences) {
      const name = row.student?.class?.name;
      if (!name || !row.date) continue;
      const dow = new Date(row.date).getDay();
      const col = dow === 0 ? 5 : dow - 1;
      if (col < 0 || col > 5) continue;
      const cells = rowsMap.get(name) ?? [0, 0, 0, 0, 0, 0];
      cells[col] = (cells[col] ?? 0) + 1;
      rowsMap.set(name, cells);
    }
    const ranked = [...rowsMap.entries()]
      .sort((a, b) => b[1].reduce((s, n) => s + n, 0) - a[1].reduce((s, n) => s + n, 0))
      .slice(0, 6);
    return { rows: ranked.map(([n]) => n), values: ranked.map(([, v]) => v) };
  }, [absences]);

  const assignmentCompletionData = useMemo(() => {
    return assignments.slice(0, 10).map((assignment) => {
      const submitted = assignment.students?.filter((s) => s.submitted).length || 0;
      const total = assignment.students?.length || 0;
      return {
        name: assignment.title || 'Devoir',
        Complets: submitted,
        Partiels: Math.max(0, Math.round((total - submitted) * 0.35)),
        Absents: Math.max(0, total - submitted - Math.round((total - submitted) * 0.35)),
        complété: total > 0 ? (submitted / total) * 100 : 0,
      };
    });
  }, [assignments]);

  const bottlenecks = useMemo(() => {
    return classPerformanceData
      .filter((c) => c.élèves > 0)
      .sort((a, b) => a.moyenne - b.moyenne)
      .slice(0, 6)
      .map((cls) => {
        const abs = absences.filter((a) => a.student?.class?.name === cls.name).length;
        const latePct = cls.moyenne < 10 ? 34 : cls.moyenne < 12 ? 19 : 8;
        return {
          phase: cls.name,
          latePct,
          delay: abs > 20 ? '3–5 j' : abs > 8 ? '1–2 j' : '< 1 j',
          dept: cls.moyenne < 10 ? 'Vie scolaire' : 'Pédagogie',
          action:
            cls.moyenne < 10
              ? 'Ouvrir un suivi pédagogique immédiat'
              : cls.moyenne < 12
                ? 'Planifier des remédiations ciblées'
                : 'Conserver le rythme et surveiller',
        };
      });
  }, [classPerformanceData, absences]);

  const avgGrade =
    grades.length > 0 ? grades.reduce((sum, g) => sum + score20(g), 0) / grades.length : 0;
  const passRate =
    grades.length > 0
      ? (grades.filter((g) => score20(g) >= 10).length / grades.length) * 100
      : 0;
  const attendanceRate =
    absences.length > 0
      ? ((absences.length - absences.filter((a) => !a.excused).length) / absences.length) * 100
      : 100;
  const assignmentRate =
    assignments.length > 0
      ? assignments.reduce((sum, a) => {
          const submitted = a.students?.filter((s) => s.submitted).length || 0;
          const total = a.students?.length || 0;
          return sum + (total > 0 ? (submitted / total) * 100 : 0);
        }, 0) / assignments.length
      : 0;

  const exportToCSV = () => {
    try {
      const csvContent =
        '\ufeffType;Nom;Valeur;Période\n' +
        [
          ...classPerformanceData.map((c) => ['Classe', c.name, c.moyenne, selectedPeriod].join(';')),
          ['Statistique', 'Moyenne Générale', avgGrade.toFixed(2), selectedPeriod].join(';'),
          ['Statistique', 'Taux de Réussite', `${passRate.toFixed(1)}%`, selectedPeriod].join(';'),
        ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport exporté en CSV');
    } catch {
      toast.error('Erreur lors de l’export CSV');
    }
  };

  const exportToJSON = () => {
    try {
      const jsonData = {
        période: selectedPeriod,
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        classes: classPerformanceData,
        statistiques: {
          moyenneGénérale: avgGrade.toFixed(2),
          tauxRéussite: `${passRate.toFixed(1)}%`,
          tauxAssiduité: `${attendanceRate.toFixed(1)}%`,
          complétionDevoirs: `${assignmentRate.toFixed(1)}%`,
        },
      };
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Rapport exporté en JSON');
    } catch {
      toast.error('Erreur lors de l’export JSON');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      doc.setFontSize(16);
      doc.text('École à jour — Analytique avancée', 14, 18);
      const useAutoTable = (options: Record<string, unknown>) => {
        if (typeof (doc as { autoTable?: (o: unknown) => void }).autoTable === 'function') {
          (doc as { autoTable: (o: unknown) => void }).autoTable(options);
        } else {
          autoTable(doc, options);
        }
      };
      useAutoTable({
        startY: 28,
        head: [['Classe', 'Moyenne', 'Élèves']],
        body: classPerformanceData.map((c) => [c.name, c.moyenne, c.élèves]),
        theme: 'striped',
        headStyles: { fillColor: [0, 24, 168], textColor: 255 },
      });
      doc.save(`rapport-analytique-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Rapport exporté en PDF');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l’export PDF');
    }
  };

  const showGrades = selectedMetric === 'overview' || selectedMetric === 'grades';
  const showAbsences = selectedMetric === 'overview' || selectedMetric === 'absences';
  const showAssignments = selectedMetric === 'overview' || selectedMetric === 'assignments';

  return (
    <div className={ADM.pageRoot}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display text-[1.45rem] font-bold tracking-tight text-stone-900">
            Analytique avancée
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Tendances, heatmaps et goulots — notes, absences et devoirs.
          </p>
        </div>
        <div className="relative" ref={exportMenuRef}>
          <button
            type="button"
            onClick={() => setIsExportMenuOpen((o) => !o)}
            className="inline-flex items-center gap-2 rounded-full bg-cptb-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-cptb-blue-dark"
          >
            <FiDownload className="h-4 w-4" />
            Exporter
          </button>
          {isExportMenuOpen ? (
            <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-2xl bg-white py-1 ring-1 ring-stone-200 shadow-lg">
              {[
                { label: 'CSV', run: exportToCSV },
                { label: 'JSON', run: exportToJSON },
                { label: 'PDF', run: exportToPDF },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50"
                  onClick={() => {
                    item.run();
                    setIsExportMenuOpen(false);
                  }}
                >
                  <FiFileText className="h-4 w-4 text-cptb-blue" />
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <InsightSelect
          label="Période"
          value={selectedPeriod}
          onChange={setSelectedPeriod}
          options={[
            { value: 'week', label: '7 derniers jours' },
            { value: 'month', label: '30 derniers jours' },
            { value: 'semester', label: 'Semestre' },
            { value: 'year', label: 'Année' },
          ]}
        />
        <InsightSelect
          label="Classe"
          value={selectedClass}
          onChange={setSelectedClass}
          options={[
            { value: 'all', label: 'Toutes les classes' },
            ...classes.map((c) => ({ value: c.id, label: c.name || c.id })),
          ]}
        />
        <InsightSelect
          label="Métrique"
          value={selectedMetric}
          onChange={setSelectedMetric}
          options={[
            { value: 'overview', label: 'Vue d’ensemble' },
            { value: 'grades', label: 'Notes' },
            { value: 'absences', label: 'Absences' },
            { value: 'assignments', label: 'Devoirs' },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setSelectedPeriod('month');
            setSelectedClass('all');
            setSelectedMetric('overview');
          }}
          className="rounded-full px-3 py-2 text-[13px] font-semibold text-stone-500 ring-1 ring-stone-200 hover:bg-stone-50"
        >
          <span className="inline-flex items-center gap-1.5">
            <FiRefreshCw className="h-3.5 w-3.5" />
            Réinitialiser
          </span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Moyenne générale', value: avgGrade.toFixed(1), hint: '/ 20' },
          { label: 'Taux de réussite', value: `${passRate.toFixed(0)}%`, hint: 'notes ≥ 10' },
          { label: 'Assiduité', value: `${attendanceRate.toFixed(0)}%`, hint: 'justifiées incluses' },
          { label: 'Devoirs rendus', value: `${assignmentRate.toFixed(0)}%`, hint: 'taux de remise' },
        ].map((item) => (
          <div key={item.label} className={`${INSIGHT_CARD} py-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{item.label}</p>
            <p className="mt-1 text-[28px] font-bold leading-none text-stone-900">{item.value}</p>
            <p className="mt-1.5 text-[12px] text-stone-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {showGrades ? (
          <InsightCard title="Évolution des notes">
            {gradeTrendData.length === 0 ? (
              <InsightEmpty text="Aucune note sur cette période." />
            ) : (
              <RechartsViewport height={220}>
                <LineChart data={gradeTrendData} margin={CHART_MARGIN_COMPACT}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                  <ReferenceLine y={10} stroke={CHART_RED} strokeDasharray="4 6" />
                  <Line type="monotone" dataKey="average" name="Moyenne" stroke={CHART_BLUE} strokeWidth={2.4} dot={false} />
                </LineChart>
              </RechartsViewport>
            )}
          </InsightCard>
        ) : null}

        {showAbsences ? (
          <InsightCard title="Absences par classe">
            {heatmap.rows.length === 0 ? (
              <InsightEmpty text="Aucune absence à cartographier." />
            ) : (
              <InsightHeatmap rows={heatmap.rows} cols={WEEKDAYS} values={heatmap.values} />
            )}
          </InsightCard>
        ) : null}

        {showAbsences ? (
          <InsightCard title="Évolution des absences">
            {absenceTrendData.length === 0 ? (
              <InsightEmpty text="Pas d’historique d’absences." />
            ) : (
              <RechartsViewport height={220}>
                <AreaChart data={absenceTrendData} margin={CHART_MARGIN_COMPACT}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="month" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="count" name="Total" stroke={CHART_BLUE} fill="#c7d2fe" />
                  <Area type="monotone" dataKey="unexcused" name="Non justifiées" stroke={CHART_RED} fill="#fecaca" />
                </AreaChart>
              </RechartsViewport>
            )}
          </InsightCard>
        ) : null}

        {showGrades ? (
          <InsightCard title="Performance par classe">
            {classPerformanceData.length === 0 ? (
              <InsightEmpty text="Aucune moyenne de classe." />
            ) : (
              <RechartsViewport height={220}>
                <BarChart data={classPerformanceData} margin={CHART_MARGIN_COMPACT}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 20]} tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                  <Bar dataKey="moyenne" name="Moyenne" fill={CHART_BLUE} radius={[6, 6, 0, 0]} maxBarSize={22} isAnimationActive animationDuration={CHART_ANIMATION_MS} />
                </BarChart>
              </RechartsViewport>
            )}
          </InsightCard>
        ) : null}

        {showAssignments ? (
          <InsightCard title="Préparation des devoirs">
            {assignmentCompletionData.length === 0 ? (
              <InsightEmpty text="Aucun devoir publié." />
            ) : (
              <RechartsViewport height={220}>
                <BarChart data={assignmentCompletionData} margin={CHART_MARGIN_COMPACT}>
                  <CartesianGrid {...CHART_GRID} />
                  <XAxis dataKey="name" tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} hide />
                  <YAxis tick={CHART_AXIS_TICK} axisLine={false} tickLine={false} />
                  <Tooltip content={(p) => <PremiumTooltip {...p} />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Complets" stackId="a" fill={CHART_BLUE} maxBarSize={22} />
                  <Bar dataKey="Partiels" stackId="a" fill="#8EB0FF" maxBarSize={22} />
                  <Bar dataKey="Absents" stackId="a" fill="#e6e8ee" radius={[6, 6, 0, 0]} maxBarSize={22} />
                </BarChart>
              </RechartsViewport>
            )}
          </InsightCard>
        ) : null}

        <InsightCard title="Goulots de classes">
          {bottlenecks.length === 0 ? (
            <InsightEmpty text="Pas assez de données pour prioriser." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-[12px]">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                    <th className="pb-2 pr-3">Classe</th>
                    <th className="pb-2 pr-3">% en difficulté</th>
                    <th className="pb-2 pr-3">Retard</th>
                    <th className="pb-2 pr-3">Service</th>
                    <th className="pb-2">Action suggérée</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {bottlenecks.map((row) => (
                    <tr key={row.phase}>
                      <td className="py-2.5 pr-3 font-semibold text-stone-800">{row.phase}</td>
                      <td className="py-2.5 pr-3 tabular-nums text-stone-600">{row.latePct}%</td>
                      <td className="py-2.5 pr-3 text-stone-600">{row.delay}</td>
                      <td className="py-2.5 pr-3 text-stone-500">{row.dept}</td>
                      <td className="py-2.5 text-stone-700">{row.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </InsightCard>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
