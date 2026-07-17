import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Button from '../../ui/Button';
import ReportsDashboardPanel from './ReportsDashboardPanel';
import ReportsFinancialPanel from './ReportsFinancialPanel';
import ReportsAcademicPanel from './ReportsAcademicPanel';
import ReportsAdministrativePanel from './ReportsAdministrativePanel';
import ReportsMenaPanel from './ReportsMenaPanel';
import ReportsStudentStatsPanel from './ReportsStudentStatsPanel';
import ReportsAdmissionsPanel from './ReportsAdmissionsPanel';
import ReportsPerformancePanel from './ReportsPerformancePanel';
import FinancialServicePanel from '../FinancialServicePanel';
import {
  FiGrid,
  FiDollarSign,
  FiBook,
  FiUserPlus,
  FiTrendingUp,
  FiRefreshCw,
  FiBriefcase,
  FiFlag,
  FiUsers,
  FiPieChart,
} from 'react-icons/fi';
import { ADM } from '../adminModuleLayout';

type RepTab =
  | 'dashboard'
  | 'financial'
  | 'finance-service'
  | 'academic'
  | 'administrative'
  | 'student-stats'
  | 'mena'
  | 'admissions'
  | 'performance';

const ReportsStatisticsModule: React.FC = () => {
  const [tab, setTab] = useState<RepTab>('dashboard');

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['admin-reports-summary'],
    queryFn: () => adminApi.getReportsSummary(),
    staleTime: 60_000,
  });

  const subTabs: { id: RepTab; label: string; icon: typeof FiGrid }[] = [
    { id: 'dashboard', label: 'Tableaux de bord', icon: FiGrid },
    { id: 'student-stats', label: 'Stats élèves', icon: FiUsers },
    { id: 'finance-service', label: 'Service financier', icon: FiPieChart },
    { id: 'financial', label: 'Rapports financiers', icon: FiDollarSign },
    { id: 'academic', label: 'Rapports académiques', icon: FiBook },
    { id: 'administrative', label: 'Rapports administratifs', icon: FiBriefcase },
    { id: 'mena', label: 'MENA / DESPS', icon: FiFlag },
    { id: 'admissions', label: 'Statistiques d’inscription', icon: FiUserPlus },
    { id: 'performance', label: 'Analyses de performances', icon: FiTrendingUp },
  ];

  const updated =
    dataUpdatedAt > 0
      ? new Date(dataUpdatedAt).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : null;

  return (
    <div className={ADM.root}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className={ADM.h2}>Rapports et statistiques</h2>
          <p className={ADM.intro}>
            Indicateurs consolidés : finances, résultats, dossiers d’inscription et risques pédagogiques.
          </p>
          {updated && (
            <p className="text-[11px] text-gray-400 mt-1">Dernière mise à jour : {updated}</p>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <FiRefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      <div className={ADM.tabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(active, 'bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'dashboard' && <ReportsDashboardPanel summary={data} isLoading={isLoading} />}
      {tab === 'student-stats' && <ReportsStudentStatsPanel />}
      {tab === 'finance-service' && <FinancialServicePanel />}
      {tab === 'financial' && <ReportsFinancialPanel summary={data} isLoading={isLoading} />}
      {tab === 'academic' && <ReportsAcademicPanel summary={data} isLoading={isLoading} />}
      {tab === 'administrative' && <ReportsAdministrativePanel />}
      {tab === 'mena' && <ReportsMenaPanel />}
      {tab === 'admissions' && <ReportsAdmissionsPanel summary={data} isLoading={isLoading} />}
      {tab === 'performance' && <ReportsPerformancePanel summary={data} isLoading={isLoading} />}
    </div>
  );
};

export default ReportsStatisticsModule;
