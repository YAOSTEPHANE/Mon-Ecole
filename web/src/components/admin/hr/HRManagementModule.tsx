import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../../services/api';
import Card from '../../ui/Card';
import HRContractsPanel from './HRContractsPanel';
import HRPayrollPanel from './HRPayrollPanel';
import HRBenefitsPanel from './HRBenefitsPanel';
import HRPerformancePanel from './HRPerformancePanel';
import HRLeavesPanel from './HRLeavesPanel';
import HRTeacherAttendancePanel from './HRTeacherAttendancePanel';
import HoursSummaryPanel from './HoursSummaryPanel';
import {
  FiGrid,
  FiBriefcase,
  FiDollarSign,
  FiHeart,
  FiAward,
  FiCalendar,
  FiClock,
  FiBarChart2,
  FiUsers,
} from 'react-icons/fi';
import { ADM } from '../adminModuleLayout';

type HRTab =
  | 'overview'
  | 'contracts'
  | 'payroll'
  | 'benefits'
  | 'performance'
  | 'attendance'
  | 'hours-teachers'
  | 'hours-staff'
  | 'leaves';

const HRManagementModule: React.FC = () => {
  const [tab, setTab] = useState<HRTab>('overview');

  const { data: teachers } = useQuery({
    queryKey: ['admin-teachers-hr-overview'],
    queryFn: adminApi.getTeachers,
  });
  const { data: educators } = useQuery({
    queryKey: ['admin-educators-hr-overview'],
    queryFn: adminApi.getEducators,
  });
  const { data: staffMembers } = useQuery({
    queryKey: ['admin-staff-members-hr-overview'],
    queryFn: adminApi.getStaffMembers,
  });
  const { data: leaves } = useQuery({
    queryKey: ['admin-hr-teacher-leaves', 'overview-pending'],
    queryFn: () => adminApi.getHrTeacherLeaves({ status: 'PENDING' }),
  });
  const { data: reviews } = useQuery({
    queryKey: ['admin-hr-performance-reviews-overview'],
    queryFn: adminApi.getHrTeacherPerformanceReviews,
  });

  const stats = useMemo(() => {
    const t = (teachers as any[] | undefined)?.length ?? 0;
    const ed = (educators as any[] | undefined)?.length ?? 0;
    const st = (staffMembers as any[] | undefined)?.length ?? 0;
    const pending = (leaves as any[] | undefined)?.length ?? 0;
    const rev = (reviews as any[] | undefined)?.length ?? 0;
    return { staff: t + ed + st, pending, reviews: rev };
  }, [teachers, educators, staffMembers, leaves, reviews]);

  const subTabs: { id: HRTab; label: string; icon: typeof FiGrid }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: FiGrid },
    { id: 'contracts', label: 'Contrats', icon: FiBriefcase },
    { id: 'payroll', label: 'Paies', icon: FiDollarSign },
    { id: 'benefits', label: 'Avantages sociaux', icon: FiHeart },
    { id: 'performance', label: 'Évaluation', icon: FiAward },
    { id: 'attendance', label: 'Présence enseignants', icon: FiClock },
    { id: 'hours-teachers', label: 'Heures enseignants', icon: FiBarChart2 },
    { id: 'hours-staff', label: 'Heures personnel', icon: FiUsers },
    { id: 'leaves', label: 'Congés & permissions', icon: FiCalendar },
  ];

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Ressources humaines</h2>
        <p className={ADM.intro}>
          Contrats, paie mensuelle (génération / validation / paiement), politique sociale, évaluations et
          validation des congés.
        </p>
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
              className={ADM.tabBtn(active, 'bg-rose-50 text-rose-900 ring-1 ring-rose-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className={ADM.grid3}>
          <Card className={`${ADM.statCard} border border-gray-200`}>
            <p className={ADM.statLabel}>Personnel suivi</p>
            <p className={ADM.statVal}>{stats.staff}</p>
            <p className={ADM.statHint}>Enseignants + éducateurs</p>
          </Card>
          <Card className={`${ADM.statCard} border border-amber-100 bg-amber-50/40`}>
            <p className="text-[10px] font-medium text-amber-800 uppercase tracking-wide leading-tight">
              Congés en attente
            </p>
            <p className={`${ADM.statValTone} text-amber-900`}>{stats.pending}</p>
            <p className={ADM.statHint}>À traiter dans Congés & permissions</p>
          </Card>
          <Card className={`${ADM.statCard} border border-violet-100 bg-violet-50/40`}>
            <p className="text-[10px] font-medium text-violet-800 uppercase tracking-wide leading-tight">
              Fiches d’évaluation
            </p>
            <p className={`${ADM.statValTone} text-violet-900`}>{stats.reviews}</p>
            <p className={ADM.statHint}>Enregistrées (historique)</p>
          </Card>
          <Card className={`${ADM.statCard} border border-teal-100 bg-teal-50/40 sm:col-span-2 lg:col-span-3`}>
            <p className="text-[10px] font-medium text-teal-800 uppercase tracking-wide leading-tight">
              Décompte des heures
            </p>
            <p className="text-xs text-stone-700 mt-1.5 leading-relaxed">
              Consultez les onglets <strong>Heures enseignants</strong> et <strong>Heures personnel</strong> pour
              le total par personne (jour / semaine / mois), graphique et export CSV/PDF.
            </p>
          </Card>
        </div>
      )}

      {tab === 'contracts' && <HRContractsPanel />}
      {tab === 'payroll' && <HRPayrollPanel />}
      {tab === 'benefits' && <HRBenefitsPanel />}
      {tab === 'performance' && <HRPerformancePanel />}
      {tab === 'attendance' && <HRTeacherAttendancePanel />}
      {tab === 'hours-teachers' && <HoursSummaryPanel mode="teachers" />}
      {tab === 'hours-staff' && <HoursSummaryPanel mode="staff" />}
      {tab === 'leaves' && <HRLeavesPanel />}
    </div>
  );
};

export default HRManagementModule;
