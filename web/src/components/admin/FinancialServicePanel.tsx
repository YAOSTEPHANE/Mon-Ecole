import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { FiDownload } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { adminApi } from '../../services/api';
import { formatFCFA } from '../../utils/currency';
import { downloadFinancialServicePdf } from '../../lib/financialServicePdf';
import {
  CHART_AXIS_TICK,
  CHART_CURSOR,
  CHART_GRID_SOFT,
  CHART_MARGIN_TILTED,
  PremiumTooltip,
  RechartsViewport,
  PREMIUM_BAR_RADIUS_TOP,
  PREMIUM_CHART_ANIMATION,
  PREMIUM_LEGEND_STYLE,
  premiumLegendFormatter,
} from '../charts';

function guessDefaultAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  if (m >= 8) return `${y}-${y + 1}`;
  return `${y - 1}-${y}`;
}

const EXPENSE_CAT_LABELS: Record<string, string> = {
  SUPPLIES: 'Fournitures',
  SERVICES: 'Services',
  UTILITIES: 'Charges',
  MAINTENANCE: 'Maintenance',
  PAYROLL_AUX: 'Masse salariale aux.',
  TRANSPORT: 'Transport',
  CATERING: 'Restauration',
  IT: 'Informatique',
  OTHER: 'Autre',
};

type MoneyRow = {
  key: string;
  label: string;
  level?: string;
  paidAmount: number;
  paidCount: number;
  unpaidAmount: number;
  unpaidCount: number;
  overdueAmount: number;
  overdueCount: number;
  studentsPaid: number;
  studentsUnpaid: number;
};

type Breakdown = {
  overview?: {
    paidAmount: number;
    paidCount: number;
    studentsWithPayments: number;
    unpaidAmount: number;
    unpaidCount: number;
    studentsWithUnpaid: number;
    overdueAmount: number;
    overdueCount: number;
    expensesAmount: number;
    expensesCount: number;
    netEncaissementsMoinsDepenses: number;
  };
  paymentsAndUnpaid?: {
    byClass: MoneyRow[];
    byLevel: MoneyRow[];
    byGender: MoneyRow[];
  };
  expensesByCategory?: Array<{ category: string; count: number; totalAmount: number }>;
  filters?: { academicYear?: string | null; note?: string };
};

type DimTab = 'class' | 'level' | 'gender';

function MoneyTable({ rows, showLevel }: { rows: MoneyRow[]; showLevel?: boolean }) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500 py-6 text-center">Aucune donnée pour cette ventilation.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-600">
            <th className="py-2.5 px-3 font-semibold">Libellé</th>
            {showLevel && <th className="py-2.5 px-3 font-semibold">Niveau</th>}
            <th className="py-2.5 px-3 font-semibold text-right">Encaissé</th>
            <th className="py-2.5 px-3 font-semibold text-right">Paiements</th>
            <th className="py-2.5 px-3 font-semibold text-right">Impayés</th>
            <th className="py-2.5 px-3 font-semibold text-right">Échéances</th>
            <th className="py-2.5 px-3 font-semibold text-right">En retard</th>
            <th className="py-2.5 px-3 font-semibold text-right">Élèves (payé / dû)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-gray-100 hover:bg-gray-50/80">
              <td className="py-2.5 px-3 font-medium text-gray-900">{r.label}</td>
              {showLevel && <td className="py-2.5 px-3 text-gray-600">{r.level ?? '—'}</td>}
              <td className="py-2.5 px-3 text-right tabular-nums text-emerald-800">
                {formatFCFA(r.paidAmount)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{r.paidCount}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-rose-800">
                {formatFCFA(r.unpaidAmount)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-700">{r.unpaidCount}</td>
              <td className="py-2.5 px-3 text-right tabular-nums text-amber-800">
                {formatFCFA(r.overdueAmount)}
              </td>
              <td className="py-2.5 px-3 text-right tabular-nums text-gray-600">
                {r.studentsPaid} / {r.studentsUnpaid}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FinancialServicePanel: React.FC = () => {
  const [academicYear, setAcademicYear] = useState(guessDefaultAcademicYear);
  const [dim, setDim] = useState<DimTab>('class');

  const { data: classes = [] } = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => adminApi.getClasses(),
    staleTime: 120_000,
  });

  const academicYears = useMemo(() => {
    const s = new Set<string>();
    for (const c of classes as { academicYear?: string }[]) {
      if (c.academicYear) s.add(c.academicYear);
    }
    if (academicYear) s.add(academicYear);
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [classes, academicYear]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-reports-financial-breakdown', academicYear],
    queryFn: () =>
      adminApi.getFinancialBreakdown({ academicYear: academicYear || undefined }) as Promise<Breakdown>,
    staleTime: 30_000,
  });

  const ov = data?.overview;
  const rows =
    dim === 'class'
      ? data?.paymentsAndUnpaid?.byClass ?? []
      : dim === 'level'
        ? data?.paymentsAndUnpaid?.byLevel ?? []
        : data?.paymentsAndUnpaid?.byGender ?? [];

  const chartData = rows
    .filter((r) => r.paidAmount > 0 || r.unpaidAmount > 0)
    .slice(0, 16)
    .map((r) => ({
      name: r.label.length > 12 ? `${r.label.slice(0, 10)}…` : r.label,
      encaissé: Math.round(r.paidAmount / 1000),
      impayés: Math.round(r.unpaidAmount / 1000),
    }));

  const expChart =
    data?.expensesByCategory?.map((x) => ({
      name: EXPENSE_CAT_LABELS[x.category] ?? x.category,
      montant: Math.round(x.totalAmount / 1000),
      full: x.totalAmount,
    })) ?? [];

  const handleDownloadPdf = () => {
    if (!data) {
      toast.error('Aucune donnée à exporter');
      return;
    }
    try {
      downloadFinancialServicePdf({
        academicYear,
        note: data.filters?.note,
        overview: data.overview,
        byClass: data.paymentsAndUnpaid?.byClass,
        byLevel: data.paymentsAndUnpaid?.byLevel,
        byGender: data.paymentsAndUnpaid?.byGender,
        expensesByCategory: data.expensesByCategory,
      });
      toast.success('PDF téléchargé');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur export PDF');
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-4 border border-emerald-100 bg-emerald-50/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-emerald-950">Service financier</h3>
            <p className="text-xs text-emerald-900/80 mt-1">
              Point général, paiements et impayés par classe / niveau / sexe, et dépenses.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-medium text-gray-700 min-w-[10rem]">
              Année scolaire
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                aria-label="Année scolaire"
              >
                {academicYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={!data || isLoading}
              className="shrink-0"
            >
              <FiDownload className="w-4 h-4 mr-1.5" />
              Télécharger PDF
            </Button>
          </div>
        </div>
        {data?.filters?.note && (
          <p className="text-[11px] text-gray-500 mt-3">{data.filters.note}</p>
        )}
      </Card>

      {isLoading ? (
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 border border-emerald-100 bg-emerald-50/40">
              <p className="text-[10px] uppercase font-medium text-emerald-900">Encaissements</p>
              <p className="text-lg font-bold text-emerald-950 mt-1">
                {formatFCFA(ov?.paidAmount ?? 0)}
              </p>
              <p className="text-[11px] text-emerald-800 mt-1">
                {ov?.paidCount ?? 0} paiement(s) · {ov?.studentsWithPayments ?? 0} élève(s)
              </p>
            </Card>
            <Card className="p-4 border border-rose-100 bg-rose-50/40">
              <p className="text-[10px] uppercase font-medium text-rose-900">Impayés</p>
              <p className="text-lg font-bold text-rose-950 mt-1">
                {formatFCFA(ov?.unpaidAmount ?? 0)}
              </p>
              <p className="text-[11px] text-rose-800 mt-1">
                {ov?.unpaidCount ?? 0} échéance(s) · {ov?.studentsWithUnpaid ?? 0} élève(s)
              </p>
            </Card>
            <Card className="p-4 border border-amber-100 bg-amber-50/40">
              <p className="text-[10px] uppercase font-medium text-amber-900">En retard</p>
              <p className="text-lg font-bold text-amber-950 mt-1">
                {formatFCFA(ov?.overdueAmount ?? 0)}
              </p>
              <p className="text-[11px] text-amber-800 mt-1">{ov?.overdueCount ?? 0} échéance(s)</p>
            </Card>
            <Card className="p-4 border border-slate-200 bg-slate-50/50">
              <p className="text-[10px] uppercase font-medium text-slate-800">Dépenses</p>
              <p className="text-lg font-bold text-slate-950 mt-1">
                {formatFCFA(ov?.expensesAmount ?? 0)}
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Net : {formatFCFA(ov?.netEncaissementsMoinsDepenses ?? 0)}
              </p>
            </Card>
          </div>

          <Card className="p-4">
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  { id: 'class' as const, label: 'Par classe' },
                  { id: 'level' as const, label: 'Par niveau' },
                  { id: 'gender' as const, label: 'Par sexe' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setDim(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                    dim === t.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
              {isFetching && (
                <span className="text-xs text-gray-400 self-center ml-auto">Actualisation…</span>
              )}
            </div>

            {chartData.length > 0 && (
              <div className="mb-5 h-64">
                <RechartsViewport height={256}>
                  <BarChart data={chartData} margin={CHART_MARGIN_TILTED}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-25} textAnchor="end" height={60} />
                    <YAxis tick={CHART_AXIS_TICK} unit=" k" />
                    <Tooltip
                      content={(p) => <PremiumTooltip {...p} />}
                      cursor={CHART_CURSOR}
                    />
                    <Legend
                      wrapperStyle={PREMIUM_LEGEND_STYLE}
                      formatter={premiumLegendFormatter}
                    />
                    <Bar
                      dataKey="encaissé"
                      fill="#059669"
                      radius={PREMIUM_BAR_RADIUS_TOP}
                      {...PREMIUM_CHART_ANIMATION}
                    />
                    <Bar
                      dataKey="impayés"
                      fill="#e11d48"
                      radius={PREMIUM_BAR_RADIUS_TOP}
                      {...PREMIUM_CHART_ANIMATION}
                    />
                  </BarChart>
                </RechartsViewport>
              </div>
            )}

            <MoneyTable rows={rows} showLevel={dim === 'class'} />
          </Card>

          <Card className="p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Dépenses par catégorie</h4>
            {expChart.length === 0 ? (
              <p className="text-sm text-gray-500">Aucune dépense sur la période.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-56">
                  <RechartsViewport height={224}>
                    <BarChart data={expChart} margin={CHART_MARGIN_TILTED}>
                      <CartesianGrid {...CHART_GRID_SOFT} />
                      <XAxis dataKey="name" tick={CHART_AXIS_TICK} interval={0} angle={-20} textAnchor="end" height={55} />
                      <YAxis tick={CHART_AXIS_TICK} unit=" k" />
                      <Tooltip
                        content={(p) => <PremiumTooltip {...p} />}
                        cursor={CHART_CURSOR}
                      />
                      <Bar
                        dataKey="montant"
                        fill="#475569"
                        radius={PREMIUM_BAR_RADIUS_TOP}
                        {...PREMIUM_CHART_ANIMATION}
                      />
                    </BarChart>
                  </RechartsViewport>
                </div>
                <ul className="space-y-2 text-sm">
                  {data?.expensesByCategory?.map((e) => (
                    <li
                      key={e.category}
                      className="flex justify-between gap-3 border-b border-gray-100 pb-1.5"
                    >
                      <span className="text-gray-700">
                        {EXPENSE_CAT_LABELS[e.category] ?? e.category}
                        <span className="text-gray-400 ml-1">({e.count})</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatFCFA(e.totalAmount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default FinancialServicePanel;
