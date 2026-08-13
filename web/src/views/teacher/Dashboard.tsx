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
  FiSearch,
  FiTrendingUp,
  FiShield,
  FiUser,
  FiCalendar,
  FiLayers,
  FiStar,
  FiSun,
  FiCommand,
  FiClock,
  FiMessageCircle,
  FiCheckCircle,
  FiCloud,
  FiMonitor,
  FiTarget,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalRoleModulesHub from '../../components/dashboard/PortalRoleModulesHub';
import { TEACHER_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
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

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, color: 'from-emerald-500 to-teal-600', description: 'Synthèse pédagogique et charges de travail' },
      { id: 'appointments', label: 'Rendez-vous parents', icon: FiClock, color: 'from-teal-500 to-emerald-600', description: 'Demandes d’entretien et rendez-vous confirmés' },
      { id: 'profile', label: 'Profil & infos', icon: FiUser, color: 'from-teal-500 to-cyan-600', description: 'Coordonnées et informations professionnelles' },
      { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-green-500 to-emerald-600', description: 'Planning des cours et créneaux' },
      { id: 'subjects', label: 'Matières', icon: FiLayers, color: 'from-lime-500 to-green-600', description: 'Matières enseignées et rattachements' },
      { id: 'evaluation', label: 'Évaluation RH', icon: FiStar, color: 'from-amber-500 to-orange-600', description: 'Entretiens et évaluations internes' },
      { id: 'leaves', label: 'Congés & absences', icon: FiSun, color: 'from-sky-500 to-teal-600', description: 'Demandes de congé et absences' },
      { id: 'courses', label: 'Mes cours', icon: FiBook, color: 'from-emerald-600 to-green-700', description: 'Groupes, contenus et suivi par classe' },
      { id: 'grades', label: 'Notes', icon: FiClipboard, color: 'from-violet-500 to-purple-600', description: 'Saisie et suivi des évaluations' },
      { id: 'validations', label: 'Validations', icon: FiCheckCircle, color: 'from-blue-600 to-indigo-600', description: 'Valider les notes et moyennes (professeur principal)' },
      { id: 'attendance', label: 'Présences', icon: FiUserCheck, color: 'from-cyan-500 to-teal-600', description: 'Appels et assiduité' },
      { id: 'assignments', label: 'Devoirs', icon: FiFileText, color: 'from-indigo-500 to-blue-600', description: 'Travaux donnés et rendus' },
      { id: 'conduct', label: 'Conduite', icon: FiShield, color: 'from-rose-500 to-pink-600', description: 'Appréciations de comportement' },
      {
        id: 'messaging',
        label: 'Messagerie interne',
        icon: FiMessageCircle,
        color: 'from-sky-500 to-indigo-600',
        description: 'Échanges avec l’administration, les collègues, les familles et messages groupés par classe',
      },
      { id: 'digital-library', label: 'Bibliothèque numérique', icon: FiCloud, color: 'from-sky-500 to-indigo-600', description: 'E-books, PDF et ressources pédagogiques' },
      { id: 'elearning', label: 'E-learning', icon: FiMonitor, color: 'from-violet-500 to-purple-600', description: 'Cours en ligne, classes virtuelles et banque de ressources' },
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
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tabId);
    router.replace(`/teacher?${params.toString()}`);
  };

  const activeMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeMeta.icon;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <Layout user={user} onLogout={logout} role="TEACHER">
      <PremiumPortalShell variant="teacher">
      <div className="flex dash-min-h-under-header w-full items-stretch">
        <aside className="relative z-50 hidden shrink-0 flex-col border-r border-stone-200/90 bg-white/92 shadow-[0_12px_40px_-20px_rgba(12,10,9,0.12)] backdrop-blur-xl lg:sticky dash-sticky-under-header lg:flex dash-h-under-header lg:w-64 lg:self-start">
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
          <header className="dash-command-bar sticky dash-sticky-under-header z-20 shrink-0">
            <div className="px-3 sm:px-6 py-2 sm:py-3">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                  <div className="min-w-0">
                    <h1 className="font-display text-base sm:text-lg md:text-xl font-bold text-stone-900 tracking-tight leading-snug">
                      {getGreeting()}, {user?.firstName}
                    </h1>
                    <p className="text-stone-600 text-xs mt-0.5 line-clamp-1 max-w-md">
                      Vos classes et votre journée
                    </p>
                    <p className="dash-mobile-meta text-[11px] sm:text-xs text-stone-500 mt-1 tabular-nums">
                      {format(new Date(), "EEE d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-900 text-xs font-semibold shrink-0 ring-1 ring-emerald-900/5">
                    <FiTrendingUp className="w-3.5 h-3.5 text-emerald-700" aria-hidden />
                    Enseignant
                  </div>
                </div>

                <div className="dash-mobile-tabs scrollbar-hide">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => changeTab(tab.id)}
                        aria-label={tab.label}
                        title={tab.label}
                        className={`dash-mobile-tab focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${
                          isActive
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-md`
                            : 'bg-stone-100 text-stone-700'
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-white' : inactiveModuleIconClass(tab.color)
                          }`}
                        />
                        <span className="dash-mobile-tab-label">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-full max-w-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <FiSearch className="w-4 h-4" aria-hidden />
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher cours, élèves, devoirs…"
                    className="dash-search-field w-full rounded-xl pl-10 pr-3 py-2 sm:py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
                    aria-label="Recherche dans l’espace enseignant"
                  />
                </div>
              </div>
            </div>
          </header>

          <main className="dash-workspace flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] scroll-smooth">
            <div className="mx-auto max-w-[1240px] space-y-5 sm:space-y-6">
              <TeacherSelfAttendance />
                            <PremiumModuleHeader
                title={activeMeta.label}
                description={activeMeta.description}
                icon={ActiveTabIcon}
                gradient={activeMeta.color}
                badge="Enseignant"
              />

              <div className="animate-slide-up">
                {activeTab === 'overview' && (
                  <>
                    <TeacherOverview />
                    <PortalRoleModulesHub
                      tabs={tabs}
                      categories={TEACHER_MODULE_CATEGORIES}
                      onNavigate={(id) => changeTab(id as TabId)}
                    />
                  </>
                )}
                {activeTab === 'appointments' && <TeacherAppointmentsPanel />}
                {activeTab === 'profile' && <TeacherPersonalProfile />}
                {activeTab === 'schedule' && <TeacherScheduleTab />}
                {activeTab === 'subjects' && <TeacherSubjectsTab />}
                {activeTab === 'evaluation' && <TeacherEvaluationsTab />}
                {activeTab === 'leaves' && <TeacherLeavesTab />}
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
