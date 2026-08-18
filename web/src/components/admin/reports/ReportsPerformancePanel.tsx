'use client';

import { InsightCard, InsightEmpty, INSIGHT_CARD } from '../insights/InsightsUi';

type ClassAvg = {
  classId: string;
  className: string;
  average: number | null;
};

type Props = {
  summary:
    | {
        academic?: {
          gradeAverage?: number | null;
          gradesCount?: number;
          averagesByClass?: ClassAvg[];
          absenceTotals?: { total?: number; excused?: number };
        };
        performance?: {
          atRiskHigh?: number;
          atRiskMedium?: number;
          atRiskTotal?: number;
          absenceExcusedRate?: number | null;
          submissionRate?: number | null;
        };
      }
    | undefined;
  isLoading: boolean;
};

export default function ReportsPerformancePanel({ summary, isLoading }: Props) {
  if (isLoading || !summary) {
    return <div className={`${INSIGHT_CARD} h-64 animate-pulse bg-stone-50`} />;
  }

  const p = summary.performance ?? {};
  const a = summary.academic ?? {};
  const bottlenecks = (a.averagesByClass ?? [])
    .slice()
    .sort((x, y) => (x.average ?? 20) - (y.average ?? 20))
    .slice(0, 8)
    .map((cls) => {
      const avg = cls.average ?? 0;
      const impact = avg < 10 ? 'Élevé' : avg < 12 ? 'Moyen' : 'Faible';
      const fix =
        avg < 10
          ? 'Suivi pédagogique + convocation famille'
          : avg < 12
            ? 'Remédiation sur les matières faibles'
            : 'Maintenir le rythme';
      return { classe: cls.className, moyenne: avg, impact, fix };
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { label: 'Risque élevé', value: p.atRiskHigh ?? 0, hint: 'Moyenne < 10 ou > 5 absences NJ' },
          { label: 'Risque modéré', value: p.atRiskMedium ?? 0, hint: 'Moyenne entre 10 et 12' },
          { label: 'Total à risque', value: p.atRiskTotal ?? 0, hint: 'Élèves à suivre' },
        ].map((item) => (
          <div key={item.label} className={`${INSIGHT_CARD} py-4`}>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{item.label}</p>
            <p className="mt-1 text-[28px] font-bold leading-none text-stone-900">{item.value}</p>
            <p className="mt-1.5 text-[12px] text-stone-500">{item.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InsightCard title="Moyenne générale">
          <p className="text-[32px] font-bold leading-none text-stone-900">
            {a.gradeAverage != null ? `${a.gradeAverage}` : '—'}
            <span className="ml-1 text-base font-semibold text-stone-400">/ 20</span>
          </p>
          <p className="mt-3 text-sm text-stone-500">
            {a.gradesCount ?? 0} notes · devoirs rendus{' '}
            {p.submissionRate != null ? `${p.submissionRate} %` : '—'}
          </p>
        </InsightCard>
        <InsightCard title="Assiduité">
          <p className="text-[32px] font-bold leading-none text-stone-900">
            {a.absenceTotals?.total ?? 0}
          </p>
          <p className="mt-3 text-sm text-stone-500">
            Absences enregistrées · justifiées{' '}
            {p.absenceExcusedRate != null ? `${p.absenceExcusedRate} %` : '—'}
          </p>
        </InsightCard>
      </div>

      <InsightCard title="Principaux goulots">
        {bottlenecks.length === 0 ? (
          <InsightEmpty text="Pas encore de moyennes par classe." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-[12px]">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">
                  <th className="pb-2 pr-3">Classe</th>
                  <th className="pb-2 pr-3">Moyenne</th>
                  <th className="pb-2 pr-3">Impact</th>
                  <th className="pb-2">Correctif suggéré</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {bottlenecks.map((row) => (
                  <tr key={row.classe}>
                    <td className="py-2.5 pr-3 font-semibold text-stone-800">{row.classe}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-stone-600">{row.moyenne.toFixed(1)}</td>
                    <td className="py-2.5 pr-3 text-stone-600">{row.impact}</td>
                    <td className="py-2.5 text-stone-700">{row.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </InsightCard>
    </div>
  );
}
