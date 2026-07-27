'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  FiAlertCircle,
  FiBarChart2,
  FiChevronDown,
  FiChevronUp,
  FiDownload,
  FiGrid,
  FiUsers,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import FilterDropdown from '../ui/FilterDropdown';
import AccountingMetricNoteDropdown from './AccountingMetricNoteDropdown';
import { formatFCFA } from '../../utils/currency';
import {
  collectionRateBarClass,
  collectionRateTone,
  enrichClassFinancialRows,
  exportClassFinancialCsv,
  formatCollectionRate,
  summarizeClassFinancialRows,
  type ClassFinancialRow,
  type ClassMoneyRow,
} from '@/lib/classFinancialSituation';
import {
  CHART_AXIS_TICK,
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  PremiumTooltip,
  RechartsViewport,
  CHART_BLUE,
  CHART_RED,
} from '../charts';

type FinancialOverview = {
  paidAmount: number;
  unpaidAmount: number;
  overdueAmount: number;
  studentsWithPayments: number;
  studentsWithUnpaid: number;
};

type AccountingClassFinancialSituationSectionProps = {
  academicYear: string;
  byClass: ClassMoneyRow[];
  overview?: FinancialOverview;
  isLoading?: boolean;
};

type MetricNoteId = 'paid' | 'unpaid' | 'overdue' | 'collection';

const METRIC_NOTES: { id: MetricNoteId; title: string; body: string }[] = [
  {
    id: 'paid',
    title: 'Encaissé',
    body:
      'Montants effectivement perçus (paiements validés) pour les élèves de la classe sur l\'année scolaire sélectionnée.',
  },
  {
    id: 'unpaid',
    title: 'Impayés',
    body:
      'Reste à payer sur les frais attribués : échéances non soldées, hors remises déjà appliquées au dossier élève.',
  },
  {
    id: 'overdue',
    title: 'En retard',
    body:
      'Part des impayés dont la date d\'échéance est dépassée. À traiter en priorité pour le recouvrement.',
  },
  {
    id: 'collection',
    title: 'Taux de recouvrement',
    body:
      'Formule : encaissé ÷ (encaissé + impayés). Un taux inférieur à 60 % signale une classe à suivre de près.',
  },
];

const AccountingClassFinancialSituationSection = ({
  academicYear,
  byClass,
  overview,
  isLoading = false,
}: AccountingClassFinancialSituationSectionProps) => {
  const [classId, setClassId] = useState('all');
  const [openNotes, setOpenNotes] = useState<Partial<Record<MetricNoteId, boolean>>>({});
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [legendOpen, setLegendOpen] = useState(false);

  const enriched = useMemo(() => enrichClassFinancialRows(byClass), [byClass]);
  const summary = useMemo(() => summarizeClassFinancialRows(enriched), [enriched]);

  const displayRows = useMemo(() => {
    if (classId === 'all') return enriched;
    return enriched.filter((r) => r.key === classId);
  }, [classId, enriched]);

  const chartData = useMemo(
    () =>
      enriched
        .filter((r) => r.totalBilled > 0)
        .sort((a, b) => b.totalBilled - a.totalBilled)
        .slice(0, 14)
        .map((r) => ({
          name: r.label.length > 14 ? `${r.label.slice(0, 12)}…` : r.label,
          fullName: r.label,
          encaissé: Math.round(r.paidAmount / 1000),
          impayés: Math.round(r.unpaidAmount / 1000),
          collectionRate: r.collectionRate,
        })),
    [enriched],
  );

  const classOptions = useMemo(
    () => [
      { value: 'all', label: 'Toutes les classes' },
      ...enriched.map((r) => ({ value: r.key, label: r.level ? `${r.label} (${r.level})` : r.label })),
    ],
    [enriched],
  );

  const atRiskClasses = useMemo(
    () => enriched.filter((r) => r.collectionRate < 60).map((r) => r.label),
    [enriched],
  );

  const toggleNote = (id: MetricNoteId) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleClassRow = (key: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = () => {
    if (displayRows.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    exportClassFinancialCsv(displayRows, academicYear);
    toast.success('Export CSV téléchargé');
  };

  if (isLoading) {
    return (
      <Card className="border border-stone-200 p-4">
        <p className="text-sm text-stone-500">Chargement de la situation par classe…</p>
      </Card>
    );
  }

  const ovPaid = overview?.paidAmount ?? summary.paidAmount;
  const ovUnpaid = overview?.unpaidAmount ?? summary.unpaidAmount;
  const ovOverdue = overview?.overdueAmount ?? summary.overdueAmount;
  const ovStudentsPaid = overview?.studentsWithPayments ?? summary.studentsPaid;
  const ovStudentsUnpaid = overview?.studentsWithUnpaid ?? summary.studentsUnpaid;
  const ovCollection =
    ovPaid + ovUnpaid > 0 ? Math.round((ovPaid / (ovPaid + ovUnpaid)) * 1000) / 10 : summary.collectionRate;

  const renderClassDetail = (r: ClassFinancialRow) => (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
        <p className="text-[10px] text-stone-500">Total dû (encaissé + impayés)</p>
        <p className="font-semibold text-stone-900 tabular-nums">{formatFCFA(r.totalBilled)}</p>
      </div>
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
        <p className="text-[10px] text-stone-500">Paiements / échéances impayées</p>
        <p className="font-semibold text-stone-900 tabular-nums">
          {r.paidCount} paiement{r.paidCount > 1 ? 's' : ''} · {r.unpaidCount} impayé
          {r.unpaidCount > 1 ? 's' : ''}
        </p>
      </div>
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
        <p className="text-[10px] text-stone-500">Retard / impayés</p>
        <p className="font-semibold text-amber-900 tabular-nums">
          {formatCollectionRate(r.overdueShareOfUnpaid)} des impayés en retard
        </p>
        <p className="text-[10px] text-stone-500">{r.overdueCount} échéance{r.overdueCount > 1 ? 's' : ''} en retard</p>
      </div>
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-stone-200">
        <p className="text-[10px] text-stone-500">Élèves (payé / impayé)</p>
        <p className="font-semibold text-stone-900 tabular-nums">
          {r.studentsPaid} / {r.studentsUnpaid}
        </p>
        <p className="text-[10px] text-stone-500">
          Part impayés : {formatCollectionRate(r.unpaidRate)} du total dû
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <FiUsers className="mt-0.5 h-4 w-4 shrink-0 text-indigo-700" aria-hidden />
          <div>
            <h3 className="text-sm font-bold text-stone-900">Situation financière par classe</h3>
            <p className="text-xs text-stone-500">
              Encaissements, impayés et retards ventilés par classe pour l&apos;année {academicYear}.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <FilterDropdown
            label="Classe"
            value={classId}
            onChange={setClassId}
            options={classOptions}
            className="min-w-[12rem]"
          />
          <Button type="button" size="sm" variant="secondary" onClick={handleExport} disabled={displayRows.length === 0}>
            <FiDownload className="mr-1 inline h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card className="border border-indigo-100 bg-indigo-50/40 p-3">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
        >
          <span className="text-sm font-bold text-indigo-950">Légende des indicateurs</span>
          {legendOpen ? <FiChevronUp className="shrink-0" /> : <FiChevronDown className="shrink-0" />}
        </button>
        {legendOpen && (
          <ul className="mt-2 space-y-2">
            {METRIC_NOTES.map((note) => (
              <li key={note.id} className="rounded-lg bg-white/80 px-3 py-2 text-xs text-stone-700 ring-1 ring-indigo-100">
                <strong className="text-stone-900">{note.title}</strong> — {note.body}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-emerald-100 bg-emerald-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-emerald-900">Encaissé</p>
          <p className="mt-1 text-lg font-bold text-emerald-950 tabular-nums">{formatFCFA(ovPaid)}</p>
          <p className="text-[10px] text-emerald-800/80">
            {ovStudentsPaid} élève{ovStudentsPaid > 1 ? 's' : ''} avec paiement
          </p>
          <AccountingMetricNoteDropdown
            title="Encaissé"
            body={METRIC_NOTES.find((n) => n.id === 'paid')!.body}
            open={!!openNotes.paid}
            onToggle={() => toggleNote('paid')}
          />
        </Card>
        <Card className="border border-rose-100 bg-rose-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-rose-900">Impayés</p>
          <p className="mt-1 text-lg font-bold text-rose-950 tabular-nums">{formatFCFA(ovUnpaid)}</p>
          <p className="text-[10px] text-rose-800/80">
            {ovStudentsUnpaid} élève{ovStudentsUnpaid > 1 ? 's' : ''} concerné{ovStudentsUnpaid > 1 ? 's' : ''}
          </p>
          <AccountingMetricNoteDropdown
            title="Impayés"
            body={METRIC_NOTES.find((n) => n.id === 'unpaid')!.body}
            open={!!openNotes.unpaid}
            onToggle={() => toggleNote('unpaid')}
          />
        </Card>
        <Card className="border border-amber-100 bg-amber-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-amber-900">En retard</p>
          <p className="mt-1 text-lg font-bold text-amber-950 tabular-nums">{formatFCFA(ovOverdue)}</p>
          <AccountingMetricNoteDropdown
            title="En retard"
            body={METRIC_NOTES.find((n) => n.id === 'overdue')!.body}
            open={!!openNotes.overdue}
            onToggle={() => toggleNote('overdue')}
          />
        </Card>
        <Card className="border border-indigo-100 bg-indigo-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase text-indigo-900">Taux de recouvrement</p>
          <p className={`mt-1 text-lg font-bold tabular-nums ${collectionRateTone(ovCollection)}`}>
            {formatCollectionRate(ovCollection)}
          </p>
          <p className="text-[10px] text-indigo-800/80">{summary.classCount} classe{summary.classCount > 1 ? 's' : ''}</p>
          <AccountingMetricNoteDropdown
            title="Taux de recouvrement"
            body={METRIC_NOTES.find((n) => n.id === 'collection')!.body}
            open={!!openNotes.collection}
            onToggle={() => toggleNote('collection')}
          />
        </Card>
      </div>

      {atRiskClasses.length > 0 && classId === 'all' && (
        <Card className="border border-amber-200 bg-amber-50/50 p-3">
          <button
            type="button"
            className="flex w-full items-start justify-between gap-2 text-left"
            onClick={() => toggleNote('collection')}
            aria-expanded={!!openNotes.collection}
          >
            <div className="flex items-start gap-2">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <p className="text-xs text-amber-900">
                <strong>Classes à suivre :</strong> {atRiskClasses.join(', ')} — taux de recouvrement inférieur à 60 %.
              </p>
            </div>
            <FiChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
          </button>
        </Card>
      )}

      {classId === 'all' && chartData.length > 0 && (
        <Card className="border border-stone-200 p-4">
          <div className="mb-3 flex items-center gap-2">
            <FiBarChart2 className="h-4 w-4 text-slate-600" aria-hidden />
            <h4 className="text-sm font-semibold text-stone-900">Comparatif encaissé / impayés (k FCFA)</h4>
          </div>
          <RechartsViewport height={280}>
            <BarChart data={chartData} margin={CHART_MARGIN_COMPACT}>
              <CartesianGrid {...CHART_GRID_SOFT} vertical={false} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-28} textAnchor="end" height={56} />
              <YAxis tick={CHART_AXIS_TICK} width={40} />
              <Tooltip
                content={(p) => {
                  const fullName = (p.payload?.[0]?.payload as { fullName?: string } | undefined)
                    ?.fullName;
                  return (
                    <PremiumTooltip
                      {...p}
                      label={fullName ?? p.label}
                      valueSuffix=" k FCFA"
                    />
                  );
                }}
              />
              <Bar dataKey="encaissé" fill={CHART_BLUE} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="impayés" fill={CHART_RED} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </RechartsViewport>
        </Card>
      )}

      <Card className="overflow-hidden border border-stone-200 p-0">
        {displayRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <FiGrid className="h-8 w-8 text-stone-300" aria-hidden />
            <p className="text-sm font-medium text-stone-700">Aucune donnée financière par classe</p>
            <p className="text-xs text-stone-500">
              Vérifiez l&apos;année scolaire et que des frais / paiements sont enregistrés.
            </p>
          </div>
        ) : (
          <div className="max-h-[520px] overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="sticky top-0 z-10 bg-stone-50 shadow-sm">
                <tr className="text-left text-stone-600">
                  <th className="w-8 px-2 py-2" aria-label="Déplier" />
                  <th className="px-3 py-2 font-semibold">Classe</th>
                  <th className="px-3 py-2 font-semibold">Niveau</th>
                  <th className="px-3 py-2 text-right font-semibold">Encaissé</th>
                  <th className="px-3 py-2 text-right font-semibold">Impayés</th>
                  <th className="px-3 py-2 text-right font-semibold">Retard</th>
                  <th className="px-3 py-2 font-semibold">Recouvrement</th>
                  <th className="px-3 py-2 text-right font-semibold">Élèves</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((r) => {
                  const open = expandedClasses.has(r.key);
                  return (
                    <Fragment key={r.key}>
                      <tr
                        className="cursor-pointer border-t border-stone-100 hover:bg-stone-50/80"
                        onClick={() => toggleClassRow(r.key)}
                      >
                        <td className="px-2 py-2 text-stone-400">
                          {open ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
                        </td>
                        <td className="px-3 py-2 font-medium text-stone-900">{r.label}</td>
                        <td className="px-3 py-2 text-stone-600">{r.level ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-emerald-800">{formatFCFA(r.paidAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-rose-800">{formatFCFA(r.unpaidAmount)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-amber-800">{formatFCFA(r.overdueAmount)}</td>
                        <td className="px-3 py-2">
                          <div className="flex min-w-[120px] items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100">
                              <div
                                className={`h-full rounded-full ${collectionRateBarClass(r.collectionRate)}`}
                                style={{ width: `${Math.min(100, r.collectionRate)}%` }}
                              />
                            </div>
                            <span
                              className={`w-10 text-right font-semibold tabular-nums ${collectionRateTone(r.collectionRate)}`}
                            >
                              {formatCollectionRate(r.collectionRate)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-stone-600">
                          {r.studentsPaid} / {r.studentsUnpaid}
                        </td>
                      </tr>
                      {open && (
                        <tr className="border-t border-stone-100 bg-indigo-50/20">
                          <td colSpan={8} className="px-4 py-3">
                            {renderClassDetail(r)}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AccountingClassFinancialSituationSection;
