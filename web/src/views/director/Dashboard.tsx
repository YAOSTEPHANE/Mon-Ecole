'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import { adminApi } from '../../services/api';
import PortalModulesHub from '../../components/dashboard/PortalModulesHub';
import { DIRECTOR_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
import { buildAdminModuleTabs } from '@/lib/adminModuleTabMeta';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Cell } from 'recharts';
import {
  CHART_GRID_SOFT,
  CHART_MARGIN_COMPACT,
  CHART_AXIS_TICK,
  chartBlueRed,
  CHART_ANIMATION_MS,
  RechartsViewport,
  PremiumChartCard,
} from '../../components/charts';
import {
  PremiumPortalShell,
  PremiumDashboardHero,
  PremiumStatGrid,
  PremiumSectionTitle,
} from '../../components/dashboard/premium';
import { FiArrowLeft, FiTrendingUp, FiUsers, FiBookOpen, FiDollarSign, FiAlertCircle, FiBarChart2 } from 'react-icons/fi';

const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const adminTabs = useMemo(() => buildAdminModuleTabs(), []);
  const { data: dash } = useQuery({ queryKey: ['admin-dashboard'], queryFn: adminApi.getDashboard });
  const { data: kpis } = useQuery({ queryKey: ['admin-dashboard-kpis'], queryFn: adminApi.getDashboardKpis, staleTime: 60_000 });
  const { data: summary } = useQuery({ queryKey: ['admin-reports-summary'], queryFn: adminApi.getReportsSummary, staleTime: 60_000 });
  const { data: pendingMm = [] } = useQuery({
    queryKey: ['admin-pending-mobile-money'],
    queryFn: () => adminApi.getPendingMobileMoneyPayments() as Promise<unknown[]>,
    staleTime: 30_000,
  });
  const { data: atRisk = [] } = useQuery({
    queryKey: ['director-students-at-risk'],
    queryFn: () => adminApi.getStudentsAtRisk() as Promise<Array<{ aiScore?: number; aiLevel?: string; firstName?: string; lastName?: string; class?: string }>>,
    staleTime: 60_000,
  });
  const { data: permissionStats } = useQuery({
    queryKey: ['admin-absence-permission-request-stats'],
    queryFn: () => adminApi.getAbsencePermissionRequestStats(),
    staleTime: 30_000,
  });

  const payChart = kpis?.charts?.paymentsByMonth?.map((x: { label: string; amount: number }) => ({ label: x.label, k: Math.round(x.amount / 1000), amount: x.amount })) ?? [];
  const perf = summary?.performance;
  const fin = summary?.financial;
  const ac = summary?.academic;
  const topRisk = atRisk.slice(0, 5);

  const primaryKpis = [
    { label: 'Élèves actifs', value: dash?.activeStudents ?? '—', subtitle: `sur ${dash?.totalStudents ?? '—'} dossiers`, icon: FiUsers, accent: 'indigo' as const },
    { label: 'Corps enseignant', value: dash?.totalTeachers ?? '—', subtitle: `${dash?.totalClasses ?? '—'} classes`, icon: FiBookOpen, accent: 'emerald' as const },
    { label: 'Impayés scolarité', value: fin ? `${fmt(fin.tuitionOutstandingAmount)} FCFA` : '—', subtitle: `${fin?.tuitionOutstandingCount ?? '—'} échéance(s)`, icon: FiDollarSign, accent: 'rose' as const },
    { label: 'Risque pédagogique', value: atRisk.length || (perf ? `${perf.atRiskHigh} / ${perf.atRiskMedium}` : '—'), subtitle: atRisk.length ? `${atRisk.filter((s) => s.aiLevel === 'critical' || s.aiLevel === 'high').length} élevé/critique` : 'Élevé / modéré', icon: FiAlertCircle, accent: 'amber' as const },
  ];

  const secondaryKpis = kpis?.cards
    ? [
        { label: 'Dossiers admission', value: (kpis.cards.admissionsPending ?? 0) + (kpis.cards.admissionsUnderReview ?? 0), subtitle: `${kpis.cards.admissionsPending} attente`, icon: FiUsers, accent: 'violet' as const },
        { label: 'Encaissements (30 j.)', value: `${fmt(kpis.cards.paymentsCompleted30dAmount ?? 0)} FCFA`, subtitle: `${kpis.cards.paymentsCompleted30dCount} paiement(s)`, icon: FiTrendingUp, accent: 'emerald' as const },
        { label: 'Paiements en ligne', value: pendingMm.length, subtitle: 'MM / carte à confirmer', icon: FiDollarSign, accent: 'amber' as const },
        { label: 'Rendus devoirs', value: kpis.cards.studentAssignmentsSubmissionRate != null ? `${kpis.cards.studentAssignmentsSubmissionRate} %` : '—', subtitle: 'Taux global', icon: FiBookOpen, accent: 'slate' as const },
      ]
    : [];

  return (
    <Layout user={user} onLogout={logout} role="ADMIN">
      <PremiumPortalShell variant="director">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
          <PremiumDashboardHero
            eyebrow="Pilotage direction"
            title="Tableau de bord direction"
            icon={FiTrendingUp}
            badge="Vue synthétique"
            description="KPI, finances, risques pédagogiques et tendances d'encaissement."
            actions={
              <Link href="/admin" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20">
                <FiArrowLeft className="h-4 w-4" /> Administration complète
              </Link>
            }
          />
          <PremiumStatGrid items={primaryKpis} columns={4} />
          {secondaryKpis.length > 0 && <PremiumStatGrid items={secondaryKpis} columns={4} />}
          {(topRisk.length > 0 || pendingMm.length > 0) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {topRisk.length > 0 && (
                <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-stone-900">Priorité IA — élèves à risque</h3>
                    <Link href="/admin?tab=pedagogical" className="text-xs font-semibold text-amber-800 hover:underline">
                      Voir tout
                    </Link>
                  </div>
                  <ul className="space-y-2">
                    {topRisk.map((s, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate text-stone-800">
                          {s.lastName} {s.firstName}
                          {s.class ? ` · ${s.class}` : ''}
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-amber-900">
                          {s.aiScore ?? '—'}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="rounded-2xl border border-stone-200 bg-white/80 p-4">
                <h3 className="mb-3 text-sm font-bold text-stone-900">Accès rapides campus & finances</h3>
                <div className="flex flex-wrap gap-2">
                  <Link href="/admin?tab=campus" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100">
                    Cantine & transport
                  </Link>
                  <Link href="/admin?tab=payments" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
                    Paiements {pendingMm.length > 0 ? `(${pendingMm.length} en ligne)` : ''}
                  </Link>
                  <Link href="/admin?tab=elearning" className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-100">
                    Visio / e-learning
                  </Link>
                  <Link href="/admin?tab=pedagogical" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-900 hover:bg-rose-100">
                    Suivi pédagogique
                  </Link>
                  <Link
                    href="/admin?tab=attendance&attendanceTab=overview"
                    className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-900 hover:bg-cyan-100"
                  >
                    Tableau de bord classe & période
                  </Link>
                  <Link
                    href="/admin?tab=attendance&attendanceTab=permissions"
                    className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 hover:bg-teal-100"
                  >
                    Permissions d&apos;absence
                    {(permissionStats?.pending ?? 0) > 0 ? ` (${permissionStats?.pending} en attente)` : ''}
                  </Link>
                </div>
              </div>
            </div>
          )}
          <PremiumSectionTitle title="Graphiques & tendances" icon={FiBarChart2} />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {payChart.length > 0 && (
              <PremiumChartCard title="Tendance des encaissements" subtitle="Paiements complétés (6 mois, milliers FCFA)" accent="indigo" height={256}>
                <RechartsViewport height={240} className="w-full">
                  <BarChart data={payChart} margin={CHART_MARGIN_COMPACT}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => `${v}k`} width={32} />
                    <Tooltip formatter={(v, _n, p) => [`${fmt((p as { payload?: { amount?: number } })?.payload?.amount ?? v * 1000)} FCFA`, 'Montant']} />
                    <Bar dataKey="k" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={CHART_ANIMATION_MS}>
                      {payChart.map((_, i) => (<Cell key={i} fill={chartBlueRed(i)} />))}
                    </Bar>
                  </BarChart>
                </RechartsViewport>
              </PremiumChartCard>
            )}
            {summary?.financial?.paymentsByMonth && summary.financial.paymentsByMonth.length > 0 && (
              <PremiumChartCard title="Historique récent (6 mois)" subtitle="Série agrégée rapport financier" accent="violet" height={256}>
                <RechartsViewport height={240} className="w-full">
                  <LineChart data={summary.financial.paymentsByMonth.map((x: { label: string; amount: number }) => ({ ...x, k: Math.round(x.amount / 1000) }))} margin={{ ...CHART_MARGIN_COMPACT, top: 8 }}>
                    <CartesianGrid {...CHART_GRID_SOFT} />
                    <XAxis dataKey="label" tick={CHART_AXIS_TICK} />
                    <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => `${v}k`} width={32} />
                    <Tooltip formatter={(v) => [`${fmt(v * 1000)} FCFA`, '']} />
                    <Line type="monotone" dataKey="k" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} isAnimationActive animationDuration={CHART_ANIMATION_MS} />
                  </LineChart>
                </RechartsViewport>
              </PremiumChartCard>
            )}
          </div>
          <PremiumSectionTitle title="Modules de pilotage" icon={FiBarChart2} />
          <PortalModulesHub
            allTabs={adminTabs}
            categories={DIRECTOR_MODULE_CATEGORIES}
            excludeIds={['dashboard', 'schools', 'workspaces', 'settings', 'performance', 'security']}
            title="Accès aux modules d’administration"
            subtitle="Ouvrez directement un module métier dans l’espace administration complète."
            onNavigate={(tabId) => router.push(`/admin?tab=${encodeURIComponent(tabId)}`)}
          />
        </div>
      </PremiumPortalShell>
    </Layout>
  );
}
