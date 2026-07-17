'use client';

import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
} from 'recharts';
import {
  PremiumTooltip,
  PieSectorPercentTooltip,
  CHART_GRID_SOFT,
  CHART_AXIS_TICK,
  CHART_MARGIN_COMPACT,
  RechartsViewport,
  PremiumChartMeshBackground,
  PremiumPieActiveShape,
  CHART_BLUE,
  CHART_RED,
  chartBlueRed,
  CHART_ANIMATION_MS,
  CHART_ANIMATION_EASING,
} from '../charts';
import {
  STATE_ASSIGNMENT_LABELS,
  normalizeStateAssignment,
} from '../../lib/stateAssignment';
import {
  ENROLLMENT_STATUS_LABELS,
  type EnrollmentStatusValue,
} from '../../lib/enrollmentStatus';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiPieChart,
  FiUsers,
  FiTrendingUp,
  FiLayers,
  FiActivity,
  FiDatabase,
  FiDownload,
} from 'react-icons/fi';

function genderLabelFr(g: string) {
  switch (g) {
    case 'MALE':
      return 'Masculin';
    case 'FEMALE':
      return 'Féminin';
    case 'OTHER':
      return 'Autre';
    default:
      return g;
  }
}

const EMPTY_HINT = 'Ajoutez des élèves pour voir ce graphique.';

function normalizeEnrollmentForChart(raw: unknown): EnrollmentStatusValue {
  const u = String(raw ?? 'ACTIVE').trim().toUpperCase();
  if (u === 'SUSPENDED' || u === 'GRADUATED' || u === 'ACTIVE' || u === 'ARCHIVED') return u;
  return 'ACTIVE';
}

/**
 * Recharts : avec une seule part visible, `paddingAngle` et un `cornerRadius` élevé
 * peuvent faire disparaître l’anneau (secteur dégénéré).
 */
function pieGeometry(segmentCount: number) {
  const multi = segmentCount > 1;
  return {
    innerRadius: 52,
    outerRadius: 82,
    paddingAngle: multi ? 2 : 0,
    cornerRadius: multi ? 10 : 0,
    stroke: '#ffffff',
    strokeWidth: 2,
    animationDuration: CHART_ANIMATION_MS,
    animationEasing: CHART_ANIMATION_EASING,
  };
}

const PDF_HEAD_INDIGO: [number, number, number] = [79, 70, 229];

function runAutoTable(doc: jsPDF, options: Record<string, unknown>) {
  const d = doc as jsPDF & { autoTable?: (o: Record<string, unknown>) => void };
  if (typeof d.autoTable === 'function') {
    d.autoTable(options);
  } else {
    autoTable(doc, options);
  }
}

function ChartCardSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50/80 to-indigo-50/30 p-3 sm:p-4 shadow-sm ring-1 ring-slate-900/[0.04] ${
        wide ? 'md:col-span-2 xl:col-span-3' : ''
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="h-8 w-8 shrink-0 rounded-xl bg-slate-200/80 animate-pulse" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-3.5 w-[45%] max-w-[140px] rounded-md bg-slate-200/80 animate-pulse" />
          <div className="h-2.5 w-[60%] max-w-[180px] rounded bg-slate-100 animate-pulse" />
        </div>
      </div>
      <div
        className={`rounded-lg bg-slate-100/70 animate-pulse ${wide ? 'h-[200px] sm:h-[240px]' : 'h-[200px] sm:h-[228px]'}`}
      />
      {!wide && (
        <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200/60 pt-2">
          {[1, 2, 3].map((k) => (
            <div key={k} className="h-2 w-16 rounded-full bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolOverviewChartsSkeleton() {
  return (
    <section
      className="space-y-3"
      aria-busy="true"
      aria-label="Chargement des analyses graphiques"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-3.5 rounded bg-indigo-200 animate-pulse" />
            <div className="h-2.5 w-48 rounded bg-slate-200/90 animate-pulse sm:w-56" />
          </div>
          <div className="h-2 w-full max-w-xl rounded bg-slate-100 animate-pulse" />
          <div className="h-2 w-full max-w-md rounded bg-slate-100/90 animate-pulse" />
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <div className="h-7 w-[5.5rem] rounded-full bg-slate-100 animate-pulse ring-1 ring-slate-200/80" />
          <div className="h-7 w-[5.5rem] rounded-full bg-slate-100 animate-pulse ring-1 ring-slate-200/80" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <ChartCardSkeleton key={i} />
        ))}
        <ChartCardSkeleton wide />
      </div>
    </section>
  );
}

type PieLegendItem = { name: string; value: number; dotColor?: string };

function PieFooterLegend({ items }: { items: PieLegendItem[] }) {
  const sum = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="relative z-[1] mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200/80 pt-2">
      {items.map((d, i) => {
        const pct = sum > 0 ? Math.round((d.value / sum) * 1000) / 10 : 0;
        const c = d.dotColor ?? chartBlueRed(i);
        return (
          <span
            key={`${d.name}-${i}`}
            className="inline-flex items-center gap-1.5 text-[9px] font-semibold text-slate-600"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full shadow-sm ring-1 ring-white"
              style={{ background: c }}
            />
            <span className="max-w-[130px] truncate">{d.name}</span>
            <span className="tabular-nums text-slate-900">{d.value}</span>
            <span className="font-bold tabular-nums text-blue-700">{pct}%</span>
          </span>
        );
      })}
    </div>
  );
}

function DonutCenterOverlay({ total }: { total: number }) {
  if (total <= 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
      <div className="text-center -translate-y-0.5">
        <p className="text-[17px] font-black tabular-nums leading-none text-slate-900">{total}</p>
        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-500">élèves</p>
      </div>
    </div>
  );
}

function OccupancyStackTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string | number;
  payload?: unknown;
}) {
  if (!active || !Array.isArray(payload) || !payload.length) return null;
  const row = (payload[0] as { payload?: {
    fullName?: string;
    élèves?: number;
    capacité?: number;
    taux?: number;
  } })?.payload;
  if (!row) return null;
  return (
    <div className="relative min-w-[210px] max-w-[300px] rounded-2xl p-[1px] shadow-[0_28px_56px_-12px_rgba(15,23,42,0.35)] backdrop-blur-xl bg-gradient-to-br from-amber-200/80 via-white/40 to-orange-200/50">
      <div className="rounded-[15px] bg-white/[0.97] px-4 py-3.5 ring-1 ring-white/80">
        <p className="mb-2 border-b border-slate-100/90 pb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {row.fullName ?? label}
        </p>
        <ul className="space-y-1.5 text-sm text-slate-700">
          <li className="flex justify-between gap-4">
            <span className="text-slate-500">Élèves</span>
            <span className="font-bold tabular-nums text-slate-900">{row.élèves ?? '—'}</span>
          </li>
          <li className="flex justify-between gap-4">
            <span className="text-slate-500">Capacité</span>
            <span className="font-bold tabular-nums text-slate-900">{row.capacité ?? '—'}</span>
          </li>
          <li className="flex justify-between gap-4 border-t border-slate-100 pt-1.5">
            <span className="font-medium text-slate-600">Taux de remplissage</span>
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-black tabular-nums text-amber-900">
              {row.taux != null ? `${row.taux}%` : '—'}
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function SchoolOverviewCharts() {
  const { data: students, isLoading: studentsLoading, isError } = useQuery({
    queryKey: ['students'],
    queryFn: adminApi.getStudents,
    retry: 1,
  });

  const { data: classes, isLoading: classesLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
    retry: 1,
  });

  const chartsLoading = studentsLoading || classesLoading;

  const totalStudents = students?.length ?? 0;

  const stateAssignmentData = useMemo(() => {
    if (!students?.length) return [];
    let aff = 0;
    let non = 0;
    for (const s of students) {
      if (normalizeStateAssignment(s.stateAssignment) === 'STATE_ASSIGNED') aff += 1;
      else non += 1;
    }
    return [
      { name: STATE_ASSIGNMENT_LABELS.STATE_ASSIGNED, value: aff, key: 'STATE_ASSIGNED' },
      { name: STATE_ASSIGNMENT_LABELS.NOT_STATE_ASSIGNED, value: non, key: 'NOT_STATE_ASSIGNED' },
    ].filter((d) => d.value > 0);
  }, [students]);

  const enrollmentStatusData = useMemo(() => {
    if (!students?.length) return [];
    const counts: Record<EnrollmentStatusValue, number> = {
      ACTIVE: 0,
      SUSPENDED: 0,
      GRADUATED: 0,
      ARCHIVED: 0,
    };
    for (const s of students) {
      const k = normalizeEnrollmentForChart(s.enrollmentStatus);
      counts[k] += 1;
    }
    return (['ACTIVE', 'SUSPENDED', 'GRADUATED', 'ARCHIVED'] as const)
      .map((key) => ({
        name: ENROLLMENT_STATUS_LABELS[key],
        value: counts[key],
        key,
      }))
      .filter((d) => d.value > 0);
  }, [students]);

  const genderData = useMemo(() => {
    if (!students?.length) return [];
    const m: Record<string, number> = {};
    for (const s of students) {
      const g = s.gender || 'OTHER';
      m[g] = (m[g] || 0) + 1;
    }
    return Object.entries(m).map(([gender, count]) => ({
      name: genderLabelFr(gender),
      genderKey: gender,
      élèves: count,
    }));
  }, [students]);

  const classAssignmentData = useMemo(() => {
    if (!students?.length) return [];
    let withC = 0;
    let without = 0;
    for (const s of students) {
      if (s.classId) withC += 1;
      else without += 1;
    }
    return [
      { name: 'Avec classe', value: withC },
      { name: 'Sans classe', value: without },
    ].filter((d) => d.value > 0);
  }, [students]);

  const enrollmentTimeline = useMemo(() => {
    if (!students?.length) return [];
    const byKey: Record<string, { sortKey: string; label: string; count: number }> = {};
    for (const s of students) {
      const raw = s.enrollmentDate;
      if (!raw) continue;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) continue;
      const sortKey = format(d, 'yyyy-MM');
      const label = format(d, 'MMM yyyy', { locale: fr });
      if (!byKey[sortKey]) {
        byKey[sortKey] = { sortKey, label, count: 0 };
      }
      byKey[sortKey].count += 1;
    }
    return Object.values(byKey)
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .map(({ label, count }) => ({ month: label, count }));
  }, [students]);

  const occupancyData = useMemo(() => {
    if (!classes?.length) return [];
    return classes
      .map((c: any) => {
        const n = c._count?.students ?? (Array.isArray(c.students) ? c.students.length : 0);
        const cap = typeof c.capacity === 'number' ? c.capacity : 30;
        const pct = cap > 0 ? Math.min(100, Math.round((n / cap) * 1000) / 10) : 0;
        const short =
          String(c.name).length > 12 ? `${String(c.name).slice(0, 10)}…` : String(c.name);
        const rempliPct = cap > 0 ? Math.min(100, Math.round((n / cap) * 1000) / 10) : 0;
        const librePct = cap > 0 ? Math.max(0, Math.round((100 - rempliPct) * 10) / 10) : 100;
        return {
          name: short,
          fullName: c.name,
          élèves: n,
          capacité: cap,
          taux: pct,
          rempliPct,
          librePct,
        };
      })
      .sort((a: { élèves: number }, b: { élèves: number }) => b.élèves - a.élèves)
      .slice(0, 10);
  }, [classes]);

  const classCount = classes?.length ?? 0;

  const exportChartsPdf = useCallback(() => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const stamp = new Date().toLocaleString('fr-FR', {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      doc.setFontSize(17);
      doc.setTextColor(...PDF_HEAD_INDIGO);
      doc.text('Analyses graphiques (élèves & classes)', 14, 16);
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      doc.text(`Généré le ${stamp}`, 14, 23);
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.text(`Synthèse : ${totalStudents} élève(s) · ${classCount} classe(s)`, 14, 30);
      doc.setTextColor(0, 0, 0);

      let nextY = 38;

      const pctOf = (value: number, sum: number) =>
        sum > 0 ? `${Math.round((value / sum) * 1000) / 10} %` : '—';

      const addTable = (
        title: string,
        head: string[][],
        body: (string | number)[][],
      ) => {
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(title, 14, nextY);
        nextY += 6;
        runAutoTable(doc, {
          startY: nextY,
          head,
          body,
          theme: 'striped',
          headStyles: {
            fillColor: PDF_HEAD_INDIGO,
            textColor: 255,
            fontStyle: 'bold',
          },
          styles: { fontSize: 9, cellPadding: 2.5 },
          margin: { left: 14, right: 14 },
        });
        nextY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
      };

      const assignSum = stateAssignmentData.reduce((s, r) => s + r.value, 0);
      addTable(
        '1. Affectation État',
        [['Catégorie', 'Effectif', 'Part']],
        stateAssignmentData.length
          ? stateAssignmentData.map((r) => [r.name, r.value, pctOf(r.value, assignSum)])
          : [['(aucune donnée)', '0', '—']],
      );

      const enrollSum = enrollmentStatusData.reduce((s, r) => s + r.value, 0);
      addTable(
        '2. Statut d’inscription',
        [['Statut', 'Effectif', 'Part']],
        enrollmentStatusData.length
          ? enrollmentStatusData.map((r) => [r.name, r.value, pctOf(r.value, enrollSum)])
          : [['(aucune donnée)', '0', '—']],
      );

      const genderSum = genderData.reduce((s, r) => s + r.élèves, 0);
      addTable(
        '3. Répartition par genre',
        [['Genre', 'Effectif', 'Part']],
        genderData.length
          ? genderData.map((r) => [r.name, r.élèves, pctOf(r.élèves, genderSum)])
          : [['(aucune donnée)', '0', '—']],
      );

      const classAssignSum = classAssignmentData.reduce((s, r) => s + r.value, 0);
      addTable(
        '4. Affectation classe',
        [['Catégorie', 'Effectif', 'Part']],
        classAssignmentData.length
          ? classAssignmentData.map((r) => [r.name, r.value, pctOf(r.value, classAssignSum)])
          : [['(aucune donnée)', '0', '—']],
      );

      addTable(
        '5. Inscriptions par mois (date d’inscription)',
        [['Mois', 'Nombre d’inscriptions']],
        enrollmentTimeline.length
          ? enrollmentTimeline.map((r) => [r.month, r.count])
          : [['(aucune date renseignée)', '—']],
      );

      addTable(
        '6. Remplissage des classes (10 classes les plus chargées)',
        [['Classe', 'Élèves', 'Capacité', 'Taux']],
        occupancyData.length
          ? occupancyData.map((r) => [
              r.fullName,
              r.élèves,
              r.capacité,
              `${r.taux} %`,
            ])
          : [['(aucune classe ou effectif)', '—', '—', '—']],
      );

      const withLast = doc as jsPDF & { lastAutoTable: { finalY: number } };
      const pageH = doc.internal.pageSize.getHeight();
      const pageW = doc.internal.pageSize.getWidth();
      let footY = withLast.lastAutoTable.finalY + 8;
      if (footY > pageH - 16) {
        doc.addPage();
        footY = 14;
      }
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        'Document récapitulatif des données du tableau de bord (chiffres et pourcentages ; pas de rendu des graphiques).',
        14,
        footY,
        { maxWidth: pageW - 28 },
      );

      doc.save(`analyses-eleves-classes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF téléchargé');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur export PDF';
      toast.error(msg);
    }
  }, [
    classAssignmentData,
    classCount,
    enrollmentStatusData,
    enrollmentTimeline,
    genderData,
    occupancyData,
    stateAssignmentData,
    totalStudents,
  ]);

  if (chartsLoading) {
    return <SchoolOverviewChartsSkeleton />;
  }

  if (isError) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50/80 text-amber-900 text-sm">
        Impossible de charger les graphiques (liste des élèves). Vérifiez la connexion à l&apos;API.
      </Card>
    );
  }

  if (totalStudents === 0) {
    return (
      <section className="space-y-3" aria-labelledby="school-overview-charts-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3
            id="school-overview-charts-title"
            className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0 flex items-center gap-2"
          >
            <FiActivity className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
            Analyses graphiques (élèves & classes)
          </h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={exportChartsPdf}
            className="shrink-0 border-slate-200/90 bg-white/90 text-slate-700 shadow-sm"
            aria-label="Télécharger le récapitulatif PDF des analyses"
          >
            <FiDownload className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">Exporter PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-hidden border border-indigo-100/80 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/30 p-6 text-center"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] mx-auto max-w-md">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <FiDatabase className="h-6 w-6" aria-hidden />
            </div>
            <h4 className="text-base font-bold text-slate-900">Pas encore d&apos;élèves</h4>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Les graphiques (affectation État, statuts, genre, classes, inscriptions, remplissage)
              s&apos;afficheront dès que des élèves seront enregistrés dans l&apos;établissement.
            </p>
            {classCount > 0 && (
              <p className="mt-3 text-xs text-slate-500">
                {classCount} classe{classCount > 1 ? 's' : ''} déjà créée{classCount > 1 ? 's' : ''} — prêt pour les affectations.
              </p>
            )}
          </div>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="school-overview-charts-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3
            id="school-overview-charts-title"
            className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-2"
          >
            <FiActivity className="w-3.5 h-3.5 text-indigo-500" aria-hidden />
            Analyses graphiques (élèves & classes)
          </h3>
          <p className="text-[10px] text-slate-500 max-w-3xl leading-relaxed">
            Affectation État, statuts d&apos;inscription, genre, rattachement classe, dynamique des
            inscriptions et taux de remplissage — survol pour les pourcentages et détails.
          </p>
        </div>
        <div
          className="flex flex-wrap items-center gap-2 shrink-0"
          aria-label="Indicateurs récapitulatifs"
        >
          <span className="inline-flex items-center rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-bold tabular-nums text-slate-700 ring-1 ring-slate-900/10">
            {totalStudents} élève{totalStudents > 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold tabular-nums text-indigo-800 ring-1 ring-indigo-200/80">
            {classCount} classe{classCount > 1 ? 's' : ''}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={exportChartsPdf}
            className="border-slate-200/90 bg-white/90 text-slate-700 shadow-sm"
            aria-label="Télécharger le récapitulatif PDF des analyses"
          >
            <FiDownload className="h-3.5 w-3.5 sm:mr-1.5" aria-hidden />
            <span className="hidden sm:inline">Exporter PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
        {/* 1 — Affectation État */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/40 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-900/20">
                <FiPieChart className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Affectation État</h4>
                <p className="text-[9px] text-slate-500">Affecté vs non affecté</p>
              </div>
            </div>
            {stateAssignmentData.length > 0 ? (
              <>
                <div className="relative z-[2] min-h-[228px]">
                  <RechartsViewport height={228} className="relative z-[2]">
                    <PieChart
                      key={`so-assign-${stateAssignmentData.map((d) => `${d.key}:${d.value}`).join('|')}`}
                    >
                      <Pie
                        data={stateAssignmentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        {...pieGeometry(stateAssignmentData.length)}
                        shape={PremiumPieActiveShape}
                      >
                        {stateAssignmentData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={chartBlueRed(i)}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(p) => (
                          <PieSectorPercentTooltip {...p} total={totalStudents} unitLabel="élève(s)" />
                        )}
                      />
                    </PieChart>
                  </RechartsViewport>
                  <DonutCenterOverlay total={totalStudents} />
                </div>
                <PieFooterLegend items={stateAssignmentData} />
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                {EMPTY_HINT}
              </div>
            )}
          </div>
        </Card>

        {/* 2 — Statut d'inscription */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-violet-50/35 to-indigo-50/30 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-900/25">
                <FiUsers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Statut d&apos;inscription</h4>
                <p className="text-[9px] text-slate-500">Actif, suspendu, diplômé</p>
              </div>
            </div>
            {enrollmentStatusData.length > 0 ? (
              <>
                <div className="relative z-[2] min-h-[228px]">
                  <RechartsViewport height={228} className="relative z-[2]">
                    <PieChart
                      key={`so-enroll-${enrollmentStatusData.map((d) => `${d.key}:${d.value}`).join('|')}`}
                    >
                      <Pie
                        data={enrollmentStatusData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        {...pieGeometry(enrollmentStatusData.length)}
                        shape={PremiumPieActiveShape}
                      >
                        {enrollmentStatusData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={chartBlueRed(i)}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(p) => (
                          <PieSectorPercentTooltip {...p} total={totalStudents} unitLabel="élève(s)" />
                        )}
                      />
                    </PieChart>
                  </RechartsViewport>
                  <DonutCenterOverlay total={totalStudents} />
                </div>
                <PieFooterLegend items={enrollmentStatusData} />
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                {EMPTY_HINT}
              </div>
            )}
          </div>
        </Card>

        {/* 3 — Genre */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-rose-50/25 to-orange-50/30 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-md shadow-rose-900/20">
                <FiUsers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Répartition par genre</h4>
                <p className="text-[9px] text-slate-500">Effectifs par catégorie</p>
              </div>
            </div>
            {genderData.length > 0 ? (
              <>
                <RechartsViewport height={228} className="relative z-[2]">
                  <BarChart data={genderData} margin={{ ...CHART_MARGIN_COMPACT, bottom: 8 }}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis
                      dataKey="name"
                      tick={CHART_AXIS_TICK}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={CHART_AXIS_TICK}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={(p) => <PremiumTooltip {...p} valueLabel="élève(s)" />}
                    />
                    <Bar
                      dataKey="élèves"
                      radius={[10, 10, 4, 4]}
                      maxBarSize={52}
                      animationDuration={CHART_ANIMATION_MS}
                      animationEasing="ease-out"
                    >
                      {genderData.map((row, i) => (
                        <Cell
                          key={row.name}
                          fill={
                            row.genderKey === 'MALE'
                              ? CHART_BLUE
                              : row.genderKey === 'FEMALE'
                                ? CHART_RED
                                : chartBlueRed(i)
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </RechartsViewport>
                <PieFooterLegend
                  items={genderData.map((g, i) => ({
                    name: g.name,
                    value: g.élèves,
                    dotColor:
                      g.genderKey === 'MALE'
                        ? CHART_BLUE
                        : g.genderKey === 'FEMALE'
                          ? CHART_RED
                          : chartBlueRed(i),
                  }))}
                />
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                {EMPTY_HINT}
              </div>
            )}
          </div>
        </Card>

        {/* 4 — Avec / sans classe */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-sky-50/30 to-blue-50/25 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-900/25">
                <FiLayers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Affectation classe</h4>
                <p className="text-[9px] text-slate-500">Rattachés à une classe ou non</p>
              </div>
            </div>
            {classAssignmentData.length > 0 ? (
              <>
                <div className="relative z-[2] min-h-[228px]">
                  <RechartsViewport height={228} className="relative z-[2]">
                    <PieChart
                      key={`so-class-${classAssignmentData.map((d) => `${d.name}:${d.value}`).join('|')}`}
                    >
                      <Pie
                        data={classAssignmentData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        {...pieGeometry(classAssignmentData.length)}
                        shape={PremiumPieActiveShape}
                      >
                        {classAssignmentData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={chartBlueRed(i)}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(p) => (
                          <PieSectorPercentTooltip {...p} total={totalStudents} unitLabel="élève(s)" />
                        )}
                      />
                    </PieChart>
                  </RechartsViewport>
                  <DonutCenterOverlay total={totalStudents} />
                </div>
                <PieFooterLegend items={classAssignmentData} />
              </>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                {EMPTY_HINT}
              </div>
            )}
          </div>
        </Card>

        {/* 5 — Inscriptions dans le temps */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-cyan-50/25 to-indigo-50/20 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-900/20">
                <FiTrendingUp className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Inscriptions par mois</h4>
                <p className="text-[9px] text-slate-500">Aire + courbe</p>
              </div>
            </div>
            {enrollmentTimeline.length > 0 ? (
              <RechartsViewport height={248} className="relative z-[2]">
                <ComposedChart data={enrollmentTimeline} margin={{ ...CHART_MARGIN_COMPACT, bottom: 20 }}>
                  <defs>
                    <linearGradient id="soEnrollArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_BLUE} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={CHART_BLUE} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID_SOFT} />
                  <XAxis
                    dataKey="month"
                    tick={CHART_AXIS_TICK}
                    axisLine={{ stroke: '#e2e8f0' }}
                    tickLine={false}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={58}
                  />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={(p) => <PremiumTooltip {...p} valueLabel="inscription(s)" />} />
                  <Legend
                    wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
                    formatter={(v) => <span className="text-slate-600 font-medium">{v}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="none"
                    fill="url(#soEnrollArea)"
                    name="Volume (aire)"
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={CHART_RED}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, stroke: '#fff', fill: CHART_RED }}
                    activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: CHART_RED }}
                    name="Inscriptions"
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                </ComposedChart>
              </RechartsViewport>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                Aucune date d&apos;inscription exploitable.
              </div>
            )}
          </div>
        </Card>

        {/* 6 — Remplissage % empilé */}
        <Card
          variant="premium"
          hover={false}
          className="relative overflow-visible !p-0 border border-white/80 bg-gradient-to-br from-white via-amber-50/30 to-amber-100/20 shadow-md shadow-slate-900/5 ring-1 ring-slate-900/5 md:col-span-2 xl:col-span-3"
        >
          <PremiumChartMeshBackground />
          <div className="relative z-[1] p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-md shadow-amber-900/30">
                <FiLayers className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">Remplissage des classes</h4>
                <p className="text-[9px] text-slate-500">
                  Barres 100 % : occupé (bleu) vs places libres (rouge) — 10 classes les plus chargées
                </p>
              </div>
            </div>
            {occupancyData.length > 0 ? (
              <RechartsViewport height={280} className="relative z-[2]">
                <BarChart
                  data={occupancyData}
                  layout="vertical"
                  margin={{ top: 8, right: 20, left: 4, bottom: 8 }}
                >
                  <CartesianGrid {...CHART_GRID_SOFT} horizontal strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={CHART_AXIS_TICK}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={78}
                    tick={CHART_AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={(props) => <OccupancyStackTooltip {...props} />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                    formatter={(v) => <span className="text-slate-600">{v}</span>}
                  />
                  <Bar
                    dataKey="rempliPct"
                    stackId="occ"
                    fill={CHART_BLUE}
                    name="Taux occupé"
                    radius={[6, 0, 0, 6]}
                    maxBarSize={22}
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                  <Bar
                    dataKey="librePct"
                    stackId="occ"
                    fill={CHART_RED}
                    name="Places libres (%)"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={22}
                    animationDuration={CHART_ANIMATION_MS}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </RechartsViewport>
            ) : (
              <div className="flex h-[220px] items-center justify-center text-xs text-slate-400 px-4 text-center">
                Créez des classes pour afficher la capacité.
              </div>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}
