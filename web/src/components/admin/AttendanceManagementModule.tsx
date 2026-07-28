import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import CompleteManagement from './CompleteManagement';
import PointageEleves from './PointageEleves';
import AttendanceReportsPanel from './AttendanceReportsPanel';
import AttendanceStatisticsPanel from './AttendanceStatisticsPanel';
import ParentAttendanceNotifyPanel from './ParentAttendanceNotifyPanel';
import StudentAbsencePermissionsPanel from './StudentAbsencePermissionsPanel';
import MenaDailyPresencePanel from './MenaDailyPresencePanel';
import {
  FiGrid,
  FiUserCheck,
  FiCalendar,
  FiBarChart2,
  FiBell,
  FiClipboard,
  FiFlag,
} from 'react-icons/fi';
import { ADM } from './adminModuleLayout';

type AttendanceTab =
  | 'overview'
  | 'rollcall'
  | 'mena'
  | 'absences'
  | 'permissions'
  | 'reports'
  | 'parents';

const AttendanceManagementModule: React.FC = () => {
  const searchParams = useSearchParams();
  const initialSubTab = searchParams?.get('attendanceTab');
  const [tab, setTab] = useState<AttendanceTab>(() => {
    if (
      initialSubTab === 'overview' ||
      initialSubTab === 'rollcall' ||
      initialSubTab === 'mena' ||
      initialSubTab === 'absences' ||
      initialSubTab === 'permissions' ||
      initialSubTab === 'reports' ||
      initialSubTab === 'parents'
    ) {
      return initialSubTab;
    }
    return 'overview';
  });

  useEffect(() => {
    if (
      initialSubTab === 'overview' ||
      initialSubTab === 'rollcall' ||
      initialSubTab === 'mena' ||
      initialSubTab === 'absences' ||
      initialSubTab === 'permissions' ||
      initialSubTab === 'reports' ||
      initialSubTab === 'parents'
    ) {
      setTab(initialSubTab);
    }
  }, [initialSubTab]);

  const { data: permissionStats } = useQuery({
    queryKey: ['admin-absence-permission-request-stats'],
    queryFn: () => adminApi.getAbsencePermissionRequestStats(),
    staleTime: 30_000,
  });

  const pendingPermissionCount = permissionStats?.pending ?? 0;

  const subTabs: { id: AttendanceTab; label: string; icon: typeof FiGrid }[] = [
    { id: 'overview', label: 'Tableau de bord classe & période', icon: FiGrid },
    { id: 'rollcall', label: 'Pointage (NFC / bio / manuel)', icon: FiUserCheck },
    { id: 'mena', label: 'Présence MENA (jour)', icon: FiFlag },
    { id: 'absences', label: 'Suivi des absences', icon: FiCalendar },
    { id: 'permissions', label: 'Permissions d\'absence', icon: FiClipboard },
    { id: 'reports', label: 'Rapports d’assiduité', icon: FiBarChart2 },
    { id: 'parents', label: 'Notifications parents', icon: FiBell },
  ];

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Absences, retards & assiduité</h2>
        <p className={ADM.intro}>
          Pointage quotidien (manuel, carte NFC ou biométrie), justification des absences et certificats médicaux,
          suivi des retards avec notification automatique aux parents (e-mail / SMS si configuré), statistiques
          d’assiduité et sanctions pour absences non justifiées.
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
              className={`${ADM.tabBtn(active, 'bg-teal-50 text-teal-900 ring-1 ring-teal-200')}`}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
              {t.id === 'permissions' && pendingPermissionCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {pendingPermissionCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <AttendanceStatisticsPanel onOpenAbsences={() => setTab('absences')} />
      )}

      {tab === 'rollcall' && <PointageEleves embedded />}

      {tab === 'mena' && <MenaDailyPresencePanel />}

      {tab === 'absences' && <CompleteManagement attendanceModule compact />}

      {tab === 'permissions' && <StudentAbsencePermissionsPanel />}

      {tab === 'reports' && <AttendanceReportsPanel />}

      {tab === 'parents' && <ParentAttendanceNotifyPanel />}
    </div>
  );
};

export default AttendanceManagementModule;
