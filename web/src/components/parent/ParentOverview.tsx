import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Avatar from '../ui/Avatar';
import {
  FiAward,
  FiUsers,
  FiAlertCircle,
  FiBookOpen,
} from 'react-icons/fi';
import Button from '../ui/Button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import {
  CHART_MARGIN_COMPACT,
  CHART_AXIS_TICK,
  RechartsViewport,
  PremiumChartCard,
  PremiumTooltip,
  BarGradientsMulti,
  PREMIUM_BAR_RADIUS_TOP,
  PREMIUM_BAR_MAX_SIZE,
  PREMIUM_CHART_ANIMATION,
  CHART_CURSOR,
  CHART_GRID_SOFT,
} from '../charts';
import { PremiumSectionTitle } from '../dashboard/premium';
import GdprUserRightsPanel from '../gdpr/GdprUserRightsPanel';
import PortalSchoolFeed from '../portal/PortalSchoolFeed';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type ParentChildRow = {
  id: string;
  studentId?: string;
  user: { firstName: string; lastName: string; avatar?: string | null };
  class?: { name?: string } | null;
};

type GradeRow = {
  score: number;
  maxScore: number;
  coefficient: number;
};

type AbsenceRow = {
  excused?: boolean;
};

type LessonLogRow = {
  id: string;
  title?: string;
  courseName?: string;
  content?: string;
  homeworkNotes?: string;
  lessonDate?: string;
};

type ParentOverviewProps = {
  selectedChildId: string | null;
};

function goToTab(tabId: string) {
  window.dispatchEvent(new CustomEvent('navigate-tab', { detail: tabId }));
}

const ParentOverview = ({ selectedChildId }: ParentOverviewProps) => {
  const { data: children, isLoading: childrenLoading } = useQuery({
    queryKey: ['parent-children'],
    queryFn: parentApi.getChildren,
  });

  const { data: grades } = useQuery({
    queryKey: ['parent-grades', selectedChildId],
    queryFn: () => parentApi.getChildGrades(selectedChildId!),
    enabled: !!selectedChildId,
  });

  const { data: absences } = useQuery({
    queryKey: ['parent-absences', selectedChildId],
    queryFn: () => parentApi.getChildAbsences(selectedChildId!),
    enabled: !!selectedChildId,
  });

  const { data: parentKpi } = useQuery({
    queryKey: ['parent-dashboard-kpis'],
    queryFn: () => parentApi.getDashboardKpis(),
    staleTime: 60_000,
    enabled: !!children && children.length > 0,
  });

  const { data: recentLessonLogs = [] } = useQuery({
    queryKey: ['parent-lesson-logs-preview', selectedChildId],
    queryFn: () => parentApi.getChildLessonLogs(selectedChildId!),
    enabled: !!selectedChildId,
    staleTime: 60_000,
  });

  const childRows = (children ?? []) as ParentChildRow[];
  const selectedChildData = childRows.find((child) => child.id === selectedChildId);

  const recentLogs = useMemo(() => {
    return (Array.isArray(recentLessonLogs) ? (recentLessonLogs as LessonLogRow[]) : []).slice(0, 4);
  }, [recentLessonLogs]);

  if (childrenLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="premium-surface h-28 animate-pulse bg-stone-100/80" />
        ))}
      </div>
    );
  }

  const allGrades = (grades?.grades || []) as GradeRow[];
  const totalScore = allGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20 * g.coefficient, 0);
  const totalCoefficient = allGrades.reduce((sum, g) => sum + g.coefficient, 0);
  const overallAverage = totalCoefficient > 0 ? totalScore / totalCoefficient : 0;

  const absenceRows = (absences || []) as AbsenceRow[];
  const totalAbsences = absenceRows.length;
  const unexcusedAbsences = absenceRows.filter((a) => !a.excused).length;

  const tuitionBlock = grades?.tuitionBlock as
    | { active?: boolean; hiddenAcademicYears?: string[] }
    | undefined;

  const unpaid = parentKpi?.cards?.tuitionUnpaidAmount ?? 0;
  const chartRows =
    parentKpi?.charts?.averageByChild?.filter(
      (x: { average20: number | null }) => x.average20 != null,
    ) ?? [];

  const firstName = selectedChildData?.user.firstName;
  const alerts: Array<{ title: string; detail: string; tab: string }> = [];
  if (unexcusedAbsences > 0 && firstName) {
    alerts.push({
      title: `${unexcusedAbsences} absence(s) non justifiée(s)`,
      detail: `Déposez un justificatif pour ${firstName}.`,
      tab: 'absences',
    });
  }
  if (overallAverage > 0 && overallAverage < 10 && firstName) {
    alerts.push({
      title: 'Moyenne sous le seuil',
      detail: `${firstName} est à ${overallAverage.toFixed(2)}/20. Consultez les notes et le cahier de texte.`,
      tab: 'grades',
    });
  }
  if (tuitionBlock?.active && (tuitionBlock.hiddenAcademicYears?.length ?? 0) > 0) {
    alerts.push({
      title: 'Résultats partiellement masqués',
      detail: `Accès limité pour ${tuitionBlock.hiddenAcademicYears?.join(', ')} tant que les frais ne sont pas réglés.`,
      tab: 'payments',
    });
  }
  if (unpaid > 0) {
    alerts.push({
      title: 'Solde famille à régulariser',
      detail: `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(unpaid)} FCFA en attente.`,
      tab: 'payments',
    });
  }

  return (
    <div className="space-y-5">
      <section className="premium-surface overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {selectedChildData ? (
              <Avatar
                src={selectedChildData.user.avatar}
                name={`${selectedChildData.user.firstName} ${selectedChildData.user.lastName}`}
                size="lg"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#0018A8] text-amber-50">
                <FiUsers className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#0018A8]">
                Espace familles
              </p>
              <h2 className="mt-0.5 truncate font-display text-xl font-semibold tracking-tight text-stone-900">
                {selectedChildData
                  ? `${selectedChildData.user.firstName} ${selectedChildData.user.lastName}`
                  : 'Aucun enfant lié'}
              </h2>
              <p className="mt-0.5 text-sm text-stone-500">
                {selectedChildData
                  ? `${selectedChildData.class?.name || 'Classe non assignée'} · n° ${selectedChildData.studentId || '—'}`
                  : 'Contactez l’administration pour rattacher un élève.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold text-stone-600">
              {format(new Date(), 'EEEE d MMMM', { locale: fr })}
            </span>
            {unpaid > 0 ? (
              <button
                type="button"
                onClick={() => goToTab('payments')}
                className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-800 hover:bg-rose-100"
              >
                Impayés · {new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(unpaid)} F
              </button>
            ) : (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                Scolarité à jour
              </span>
            )}
          </div>
        </div>

        {alerts[0] ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-amber-100 bg-amber-50/80 px-4 py-3 sm:px-5">
            <p className="flex items-start gap-2 text-sm text-amber-950">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">{alerts[0].title}.</span> {alerts[0].detail}
              </span>
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={() => goToTab(alerts[0]?.tab ?? 'absences')}>
              Traiter
            </Button>
          </div>
        ) : null}

        {selectedChildData ? (
          <div className="grid grid-cols-2 gap-px border-t border-stone-100 bg-stone-100 sm:grid-cols-4">
            <div className="bg-white p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Moyenne</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-[#0018A8]">
                {overallAverage > 0 ? overallAverage.toFixed(2) : '—'}
              </p>
              <p className="text-[11px] text-stone-500">/ 20</p>
            </div>
            <div className="bg-white p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Notes</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900">{allGrades.length}</p>
              <p className="text-[11px] text-stone-500">saisies</p>
            </div>
            <button
              type="button"
              onClick={() => goToTab('absences')}
              className="bg-white p-3 text-left sm:p-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Absences</p>
              <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${unexcusedAbsences > 0 ? 'text-amber-800' : 'text-stone-900'}`}>
                {totalAbsences}
              </p>
              <p className="text-[11px] text-stone-500">{unexcusedAbsences} non justifiée(s)</p>
            </button>
            <div className="bg-white p-3 sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">Alertes</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums text-stone-900">
                {parentKpi?.cards?.unreadNotifications ?? 0}
              </p>
              <p className="text-[11px] text-stone-500">notifications</p>
            </div>
          </div>
        ) : null}
      </section>

      <PortalSchoolFeed role="parent" compact />

      {selectedChildData && (chartRows.length > 0 || recentLogs.length > 0) ? (
        <div className="grid gap-5 lg:grid-cols-12">
          {chartRows.length > 0 ? (
            <div className="lg:col-span-7">
              <PremiumChartCard
                title="Moyennes par enfant"
                subtitle="120 derniers jours"
                icon={FiAward}
                accent="indigo"
                height={220}
              >
                <RechartsViewport height={188}>
                  <BarChart
                    data={chartRows.map((x: { name: string; average20: number }) => ({
                      name: x.name.length > 14 ? `${x.name.slice(0, 12)}…` : x.name,
                      moyenne: x.average20,
                    }))}
                    margin={CHART_MARGIN_COMPACT}
                  >
                    <BarGradientsMulti count={chartRows.length} idPrefix="parent-child-avg" />
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
                    <YAxis domain={[0, 20]} width={28} tick={CHART_AXIS_TICK} />
                    <Tooltip content={(p) => <PremiumTooltip {...p} valueSuffix="/20" />} cursor={CHART_CURSOR} />
                    <Bar
                      dataKey="moyenne"
                      radius={PREMIUM_BAR_RADIUS_TOP}
                      maxBarSize={PREMIUM_BAR_MAX_SIZE}
                      {...PREMIUM_CHART_ANIMATION}
                    >
                      {chartRows.map((_: unknown, i: number) => (
                        <Cell key={i} fill={`url(#parent-child-avg-${i})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </RechartsViewport>
              </PremiumChartCard>
            </div>
          ) : null}

          {recentLogs.length > 0 ? (
            <section className={`premium-surface p-4 sm:p-5 ${chartRows.length > 0 ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
              <PremiumSectionTitle
                title="Cahier récent"
                subtitle={selectedChildData.user.firstName}
                icon={FiBookOpen}
                action={
                  <Button type="button" size="sm" variant="secondary" onClick={() => goToTab('lesson-logs')}>
                    Tout voir
                  </Button>
                }
              />
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <button
                    key={log.id}
                    type="button"
                    className="flex w-full flex-col gap-0.5 rounded-xl border border-stone-200/80 bg-white px-3 py-2.5 text-left hover:border-amber-300"
                    onClick={() => goToTab('lesson-logs')}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-stone-900">
                        {log.title || log.courseName || 'Séance'}
                      </p>
                      <span className="shrink-0 text-[11px] text-stone-500">
                        {log.lessonDate ? format(new Date(log.lessonDate), 'dd MMM', { locale: fr }) : ''}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs text-stone-600">
                      {log.content || log.homeworkNotes || '—'}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {childRows.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-stone-500">
            <FiUsers className="mx-auto mb-4 h-16 w-16 text-stone-300" />
            <p className="mb-2 text-lg font-semibold text-stone-900">Aucun enfant enregistré</p>
            <p className="text-sm">Contactez l&apos;administration pour lier vos enfants à votre compte.</p>
          </div>
        </Card>
      ) : null}

      <GdprUserRightsPanel />
    </div>
  );
};

export default ParentOverview;
