import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import TeacherOverview from '../../components/teacher/TeacherOverview';
import CoursesList from '../../components/teacher/CoursesList';
import GradesManager from '../../components/teacher/GradesManager';
import AttendanceManager from '../../components/teacher/AttendanceManager';
import AssignmentsManager from '../../components/teacher/AssignmentsManager';
import TeacherConduct from '../../components/teacher/TeacherConduct';
import TeacherPersonalProfile from '../../components/teacher/TeacherPersonalProfile';
import TeacherScheduleTab from '../../components/teacher/TeacherScheduleTab';
import TeacherSubjectsTab from '../../components/teacher/TeacherSubjectsTab';
import TeacherEvaluationsTab from '../../components/teacher/TeacherEvaluationsTab';
import TeacherLeavesTab from '../../components/teacher/TeacherLeavesTab';
import TeacherPayslipPanel from '../../components/teacher/TeacherPayslipPanel';
import TeacherSelfAttendance from '../../components/teacher/TeacherSelfAttendance';
import TeacherAppointmentsPanel from '../../components/teacher/TeacherAppointmentsPanel';
import TeacherInternalMessaging from '../../components/teacher/TeacherInternalMessaging';
import AcademicValidationPanel from '../../components/academic/AcademicValidationPanel';
import DigitalLibraryBrowser from '../../components/digital-library/DigitalLibraryBrowser';
import ElearningHub from '../../components/elearning/ElearningHub';
import {
  FiLayout,
  FiBook,
  FiClipboard,
  FiUserCheck,
  FiFileText,
  FiShield,
  FiUser,
  FiCalendar,
  FiLayers,
  FiStar,
  FiSun,
  FiClock,
  FiMessageCircle,
  FiCheckCircle,
  FiCloud,
  FiMonitor,
  FiTarget,
  FiDollarSign,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalSpaceHeader from '../../components/dashboard/PortalSpaceHeader';
import MockExamsManagementPanel from '../../components/admin/MockExamsManagementPanel';
import TeacherLessonLogsPanel from '../../components/teacher/TeacherLessonLogsPanel';

const VALID_TAB_IDS = [
  'overview',
  'appointments',
  'profile',
  'schedule',
  'subjects',
  'evaluation',
  'leaves',
  'payroll',
  'courses',
  'grades',
  'attendance',
  'assignments',
  'conduct',
  'messaging',
  'validations',
  'digital-library',
  'elearning',
  'mock-exams',
  'lesson-logs',
] as const;

type TabId = (typeof VALID_TAB_IDS)[number];

const MOBILE_PRIMARY_TABS: TabId[] = [
  'overview',
  'grades',
  'attendance',
  'assignments',
  'schedule',
  'messaging',
];

type TabDef = {
  id: TabId;
  label: string;
  icon: IconType;
  color: string;
  description: string;
};

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, color: 'from-emerald-500 to-teal-600', description: 'Synthèse pédagogique et charges de travail' },
      { id: 'appointments', label: 'Rendez-vous parents', icon: FiClock, color: 'from-teal-500 to-emerald-600', description: 'Demandes d’entretien et rendez-vous confirmés' },
      { id: 'profile', label: 'Profil & infos', icon: FiUser, color: 'from-teal-500 to-cyan-600', description: 'Coordonnées et informations professionnelles' },
      { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-green-500 to-emerald-600', description: 'Planning des cours et créneaux' },
      { id: 'subjects', label: 'Matières', icon: FiLayers, color: 'from-lime-500 to-green-600', description: 'Matières enseignées et rattachements' },
      { id: 'evaluation', label: 'Évaluation RH', icon: FiStar, color: 'from-amber-500 to-orange-600', description: 'Entretiens et évaluations internes' },
      { id: 'leaves', label: 'Congés & absences', icon: FiSun, color: 'from-sky-500 to-teal-600', description: 'Demandes de congé et absences' },
      { id: 'payroll', label: 'Ma paie', icon: FiDollarSign, color: 'from-emerald-500 to-lime-600', description: 'Lignes de paie et bulletins' },
      { id: 'courses', label: 'Mes cours', icon: FiBook, color: 'from-emerald-600 to-green-700', description: 'Groupes, contenus et suivi par classe' },
      { id: 'grades', label: 'Notes', icon: FiClipboard, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Saisie et suivi des évaluations' },
      { id: 'validations', label: 'Validations', icon: FiCheckCircle, color: 'from-cptb-blue-mid to-cptb-blue-dark', description: 'Valider les notes et moyennes (professeur principal)' },
      { id: 'attendance', label: 'Présences', icon: FiUserCheck, color: 'from-cyan-500 to-teal-600', description: 'Appels et assiduité' },
      { id: 'assignments', label: 'Devoirs', icon: FiFileText, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Travaux donnés et rendus' },
      { id: 'conduct', label: 'Conduite', icon: FiShield, color: 'from-rose-500 to-pink-600', description: 'Appréciations de comportement' },
      {
        id: 'messaging',
        label: 'Messagerie interne',
        icon: FiMessageCircle,
        color: 'from-sky-600 to-cptb-blue',
        description: 'Échanges avec l’administration, les collègues, les familles et messages groupés par classe',
      },
      { id: 'digital-library', label: 'Bibliothèque numérique', icon: FiCloud, color: 'from-sky-600 to-cptb-blue', description: 'E-books, PDF et ressources pédagogiques' },
      { id: 'elearning', label: 'E-learning', icon: FiMonitor, color: 'from-cptb-blue to-cptb-blue-mid', description: 'Cours en ligne, classes virtuelles et banque de ressources' },
      {
        id: 'mock-exams',
        label: 'Examens blancs',
        icon: FiTarget,
        color: 'from-fuchsia-500 to-rose-600',
        description: 'Créer des examens blancs pour les classes d’examen (3ème, Terminale)',
      },
      {
        id: 'lesson-logs',
        label: 'Cahier de texte',
        icon: FiBook,
        color: 'from-orange-500 to-amber-600',
        description: 'Compte-rendu de séance et devoirs pour les familles',
      },
    ],
    []
  );

  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t && VALID_TAB_IDS.includes(t as TabId)) {
      setActiveTab(t as TabId);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && VALID_TAB_IDS.includes(detail as TabId)) {
        setActiveTab(detail as TabId);
        router.replace(`/teacher?tab=${encodeURIComponent(detail)}`);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
  }, [router]);

  const changeTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tabId);
    router.replace(`/teacher?${params.toString()}`);
  };

  const activeMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeMeta.icon;

  return (
    <Layout user={user} onLogout={logout} role="TEACHER" hideHeader>
      <PremiumPortalShell variant="teacher">
      <div className="flex dash-min-h-under-header w-full items-stretch">
        {sidebarOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-[55] cursor-default border-0 bg-slate-900/40 p-0 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer la navigation"
          />
        ) : null}
        <aside
          className={`w-64 shrink-0 flex-col border-r border-stone-200/90 bg-white/92 shadow-[0_12px_40px_-20px_rgba(12,10,9,0.12)] backdrop-blur-xl
            fixed left-0 top-0 z-[60] h-dvh max-h-dvh
            ${sidebarOpen ? 'flex' : 'hidden'}
            lg:sticky lg:flex dash-sticky-under-header dash-h-under-header lg:self-start lg:z-50`}
        >
          <div className="flex min-h-0 flex-1 flex-col p-2.5">
            <p className="shrink-0 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              Enseignant
            </p>
            <nav className="dash-sidebar-scroll min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5 text-xs leading-snug">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => changeTab(tab.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                      isActive
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-md ring-1 ring-white/20`
                        : 'text-stone-600 hover:bg-stone-100/90 hover:text-stone-900'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-white' : inactiveModuleIconClass(tab.color)
                      }`}
                    />
                    <span className="truncate text-left">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <PortalSpaceHeader
            user={user}
            role="TEACHER"
            onLogout={logout}
            title="Espace enseignant"
            onMenuClick={() => setSidebarOpen((open) => !open)}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Rechercher…"
            searchAriaLabel="Recherche dans l’espace enseignant"
            mobileTabs={tabs.filter((tab) => MOBILE_PRIMARY_TABS.includes(tab.id))}
            activeTab={activeTab}
            onTabChange={(id) => changeTab(id as TabId)}
          />

          <main className="dash-workspace flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] scroll-smooth">
            <div className="mx-auto max-w-[1240px] space-y-5 sm:space-y-6">
              <TeacherSelfAttendance />
              {activeTab !== 'overview' ? (
                <PremiumModuleHeader
                  title={activeMeta.label}
                  description={activeMeta.description}
                  icon={ActiveTabIcon}
                  gradient={activeMeta.color}
                  badge="Enseignant"
                />
              ) : null}

              <div className="animate-slide-up">
                {activeTab === 'overview' && <TeacherOverview />}
                {activeTab === 'appointments' && <TeacherAppointmentsPanel />}
                {activeTab === 'profile' && <TeacherPersonalProfile />}
                {activeTab === 'schedule' && <TeacherScheduleTab />}
                {activeTab === 'subjects' && <TeacherSubjectsTab />}
                {activeTab === 'evaluation' && <TeacherEvaluationsTab />}
                {activeTab === 'leaves' && <TeacherLeavesTab />}
                {activeTab === 'payroll' && <TeacherPayslipPanel />}
                {activeTab === 'courses' && <CoursesList searchQuery={searchQuery} />}
                {activeTab === 'grades' && <GradesManager searchQuery={searchQuery} />}
                {activeTab === 'validations' && (
                  <AcademicValidationPanel title="Validations (professeur principal)" />
                )}
                {activeTab === 'attendance' && <AttendanceManager searchQuery={searchQuery} />}
                {activeTab === 'assignments' && <AssignmentsManager searchQuery={searchQuery} />}
                {activeTab === 'conduct' && <TeacherConduct />}
                {activeTab === 'messaging' && <TeacherInternalMessaging />}
                {activeTab === 'digital-library' && <DigitalLibraryBrowser />}
                {activeTab === 'elearning' && <ElearningHub mode="teacher" />}
                {activeTab === 'mock-exams' && <MockExamsManagementPanel mode="teacher" />}
                {activeTab === 'lesson-logs' && <TeacherLessonLogsPanel />}
              </div>
            </div>
          </main>
        </div>
      </div>
      </PremiumPortalShell>
    </Layout>
  );
};

export default TeacherDashboard;
