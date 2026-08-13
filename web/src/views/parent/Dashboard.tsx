import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalRoleModulesHub from '../../components/dashboard/PortalRoleModulesHub';
import DashboardTabLoading from '../../components/dashboard/DashboardTabLoading';
import { PARENT_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
import ParentSidebar, { type ParentNavItem } from '../../components/parent/ParentSidebar';
import Card from '../../components/ui/Card';
import { parentApi } from '../../services/api';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  FiSearch,
  FiHeart,
  FiMenu,
  FiAward,
  FiAlertCircle,
  FiFileText,
  FiCalendar,
  FiShield,
  FiCreditCard,
  FiUsers,
  FiLayout,
  FiBook,
  FiMessageCircle,
  FiCommand,
  FiClock,
  FiMap,
  FiNavigation,
  FiBell,
  FiCoffee,
  FiUserPlus,
  FiBookOpen,
  FiMonitor,
  FiTarget,
  FiCloud,
} from 'react-icons/fi';

const ParentOverview = dynamic(() => import('../../components/parent/ParentOverview'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildrenList = dynamic(() => import('../../components/parent/ChildrenList'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildGrades = dynamic(() => import('../../components/parent/ChildGrades'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildAbsences = dynamic(() => import('../../components/parent/ChildAbsences'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildReenrollment = dynamic(() => import('../../components/parent/ChildReenrollment'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildSchedule = dynamic(() => import('../../components/parent/ChildSchedule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildAssignments = dynamic(() => import('../../components/parent/ChildAssignments'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildPayments = dynamic(() => import('../../components/parent/ChildPayments'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildReportCards = dynamic(() => import('../../components/parent/ChildReportCards'), { loading: () => <DashboardTabLoading />, ssr: false });
const ChildConduct = dynamic(() => import('../../components/parent/ChildConduct'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentAppointmentsPanel = dynamic(() => import('../../components/parent/ParentAppointmentsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentFamilyProfilePanel = dynamic(() => import('../../components/parent/ParentFamilyProfilePanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentExtracurricularPanel = dynamic(() => import('../../components/parent/ParentExtracurricularPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentCampusPanel = dynamic(() => import('../../components/parent/ParentCampusPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentOrientationPanel = dynamic(() => import('../../components/parent/ParentOrientationPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentNotificationsPanel = dynamic(() => import('../../components/parent/ParentNotificationsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const SchoolCommunication = dynamic(() => import('../../components/portal/SchoolCommunication'), { loading: () => <DashboardTabLoading />, ssr: false });
const LessonLogsBrowser = dynamic(() => import('../../components/shared/LessonLogsBrowser'), { loading: () => <DashboardTabLoading />, ssr: false });
const DigitalLibraryBrowser = dynamic(() => import('../../components/digital-library/DigitalLibraryBrowser'), { loading: () => <DashboardTabLoading />, ssr: false });
const ElearningHub = dynamic(() => import('../../components/elearning/ElearningHub'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentMockExamsPanel = dynamic(() => import('../../components/student/StudentMockExamsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });

const VALID_PARENT_TABS = [
  'overview',
  'notifications',
  'communication',
  'appointments',
  'family',
  'children',
  'grades',
  'absences',
  'reenrollment',
  'assignments',
  'lesson-logs',
  'schedule',
  'report-cards',
  'conduct',
  'extracurricular',
  'orientation',
  'payments',
  'campus',
  'digital-library',
  'elearning',
  'mock-exams',
] as const;

type ParentTabId = (typeof VALID_PARENT_TABS)[number];

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: ParentNavItem[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, requiresChild: false, color: 'from-orange-500 to-amber-600' },
      { id: 'notifications', label: 'Notifications', icon: FiBell, requiresChild: false, color: 'from-amber-500 to-orange-600' },
      { id: 'communication', label: 'Messages école', icon: FiMessageCircle, requiresChild: false, color: 'from-amber-500 to-yellow-600' },
      { id: 'appointments', label: 'Rendez-vous', icon: FiClock, requiresChild: false, color: 'from-amber-600 to-orange-600' },
      {
        id: 'family',
        label: 'Compte & famille',
        icon: FiHeart,
        requiresChild: false,
        color: 'from-rose-500 to-orange-500',
      },
      { id: 'children', label: 'Mes enfants', icon: FiUsers, requiresChild: false, color: 'from-orange-600 to-rose-500' },
      { id: 'grades', label: 'Notes', icon: FiAward, requiresChild: true, color: 'from-amber-600 to-orange-600' },
      { id: 'absences', label: 'Absences', icon: FiAlertCircle, requiresChild: true, color: 'from-orange-500 to-red-500' },
      { id: 'reenrollment', label: 'Réinscription', icon: FiUserPlus, requiresChild: true, color: 'from-violet-500 to-purple-600' },
      { id: 'assignments', label: 'Devoirs', icon: FiFileText, requiresChild: true, color: 'from-yellow-500 to-amber-600' },
      { id: 'lesson-logs', label: 'Cahier de texte', icon: FiBookOpen, requiresChild: true, color: 'from-amber-600 to-orange-700' },
      { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, requiresChild: true, color: 'from-amber-500 to-orange-500' },
      { id: 'report-cards', label: 'Bulletins', icon: FiBook, requiresChild: true, color: 'from-orange-700 to-amber-700' },
      { id: 'conduct', label: 'Conduite', icon: FiShield, requiresChild: true, color: 'from-rose-500 to-orange-600' },
      {
        id: 'extracurricular',
        label: 'Activités parascolaires',
        icon: FiMap,
        requiresChild: true,
        color: 'from-teal-500 to-emerald-600',
      },
      {
        id: 'campus',
        label: 'Cantine & transport',
        icon: FiCoffee,
        requiresChild: true,
        color: 'from-amber-600 to-orange-700',
      },
      {
        id: 'orientation',
        label: 'Orientation',
        icon: FiNavigation,
        requiresChild: false,
        color: 'from-indigo-500 to-violet-600',
      },
      { id: 'payments', label: 'Paiements', icon: FiCreditCard, requiresChild: true, color: 'from-emerald-600 to-amber-600' },
      { id: 'digital-library', label: 'Bibliothèque', icon: FiCloud, requiresChild: false, color: 'from-sky-500 to-indigo-600' },
      { id: 'elearning', label: 'E-learning', icon: FiMonitor, requiresChild: false, color: 'from-violet-500 to-purple-600' },
      { id: 'mock-exams', label: 'Examens blancs', icon: FiTarget, requiresChild: false, color: 'from-fuchsia-500 to-pink-600' },
    ],
    []
  );

  const tabDescriptions: Record<string, string> = useMemo(
    () => ({
      overview: 'Vue d’ensemble de la scolarité et raccourcis utiles',
      notifications: 'Alertes paiements, notes, devoirs, présence et rendez-vous',
      communication: 'Échanges avec l’école',
      appointments: 'Entretiens avec les enseignants de vos enfants',
      family: 'Profil, préférences du portail, contacts, consentements et personnes autorisées à récupérer vos enfants',
      children: 'Liste de vos enfants et sélection du profil actif',
      grades: 'Notes et résultats de l’enfant sélectionné',
      absences: 'Assiduité et justifications',
      reenrollment: 'Demande de réinscription pour la prochaine année',
      assignments: 'Devoirs et travaux à rendre',
      'lesson-logs': 'Séances publiées par les enseignants',
      schedule: 'Emploi du temps hebdomadaire',
      'report-cards': 'Bulletins et bilans',
      conduct: 'Appréciations et conduite',
      extracurricular: 'Clubs, événements, sorties et inscriptions',
      campus: 'Cantine scolaire et lignes de transport',
      orientation: 'Filières, tests, conseils, partenariats et suivi de votre enfant',
      payments: 'Frais scolaires et règlements',
      'digital-library': 'Catalogue numérique (lecture)',
      elearning: 'Ressources e-learning (consultation)',
      'mock-exams': 'Examens blancs et entraînements',
    }),
    []
  );

  const hubTabs = useMemo(
    () =>
      navItems.map((n) => ({
        id: n.id,
        label: n.label,
        icon: n.icon,
        color: n.color,
        description: tabDescriptions[n.id] ?? n.label,
      })),
    [navItems, tabDescriptions]
  );

  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t && VALID_PARENT_TABS.includes(t as ParentTabId)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && VALID_PARENT_TABS.includes(detail as ParentTabId)) {
        setActiveTab(detail);
        const params = new URLSearchParams(searchParams?.toString() ?? '');
        params.set('tab', detail);
        router.replace(`/parent?${params.toString()}`);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
  }, [router, searchParams]);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tabId);
    router.replace(`/parent?${params.toString()}`);
  };

  const activeMeta = navItems.find((n) => n.id === activeTab) ?? navItems[0];
  const ActiveTabIcon = activeMeta.icon;
  const activeDescription = tabDescriptions[activeTab] ?? tabDescriptions.overview;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <Layout user={user} onLogout={logout} role="PARENT">
      <PremiumPortalShell variant="parent">
      <div className="flex min-h-[calc(100vh-4rem)] w-full items-stretch">
        <ParentSidebar
          items={navItems}
          activeTab={activeTab}
          onTabChange={changeTab}
          selectedChild={selectedChild}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="dash-command-bar sticky top-16 z-30 shrink-0">
            <div className="px-3 sm:px-6 py-2.5 sm:py-3">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                      className="lg:hidden p-2 rounded-xl hover:bg-stone-100/90 transition-colors text-stone-700 shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 focus-visible:ring-offset-2"
                      aria-label="Ouvrir le menu"
                    >
                      <FiMenu className="w-4 h-4" aria-hidden />
                    </button>
                    <div className="min-w-0">
                      <h1 className="font-display text-base sm:text-lg md:text-xl font-bold text-stone-900 tracking-tight leading-snug">
                        {getGreeting()}, {user?.firstName}
                      </h1>
                      <p className="text-stone-600 text-xs mt-0.5 line-clamp-2 sm:line-clamp-1 max-w-md">
                        Scolarité de vos enfants
                      </p>
                      <p className="text-[11px] sm:text-xs text-stone-500 mt-1 tabular-nums">
                        {format(new Date(), "EEE d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                  </div>
                  <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200/80 text-orange-950 text-xs font-semibold shrink-0 ring-1 ring-orange-900/5">
                    <FiHeart className="w-3.5 h-3.5 text-orange-700" aria-hidden />
                    Parent
                  </div>
                </div>

                <div className="relative w-full max-w-xl">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <FiSearch className="w-4 h-4" aria-hidden />
                  </div>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher…"
                    className="dash-search-field w-full rounded-xl pl-10 pr-3 py-2 sm:py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
                    aria-label="Recherche dans l’espace parent"
                  />
                </div>
              </div>
            </div>
          </header>

          <main className="dash-workspace flex-1 px-3 sm:px-6 py-5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] overflow-x-hidden overflow-y-auto scroll-smooth">
            <div className="max-w-[1240px] mx-auto space-y-5 sm:space-y-6">
                            <PremiumModuleHeader
                title={activeMeta.label}
                description={activeDescription}
                icon={ActiveTabIcon}
                gradient={activeMeta.color}
                badge="Parent"
              />

              <div className="animate-slide-up">
                {activeTab === 'overview' && (
                  <>
                    <ParentOverview />
                    <PortalRoleModulesHub
                      tabs={hubTabs}
                      categories={PARENT_MODULE_CATEGORIES}
                      onNavigate={changeTab}
                    />
                  </>
                )}
                {activeTab === 'notifications' && <ParentNotificationsPanel />}
                {activeTab === 'communication' && (
                  <SchoolCommunication role="parent" contextStudentId={selectedChild} />
                )}
                {activeTab === 'appointments' && <ParentAppointmentsPanel />}
                {activeTab === 'family' && <ParentFamilyProfilePanel />}
                {activeTab === 'children' && (
                  <ChildrenList
                    onSelectChild={setSelectedChild}
                    selectedChild={selectedChild}
                    searchQuery={searchQuery}
                  />
                )}
                {activeTab === 'grades' &&
                  (selectedChild ? (
                    <ChildGrades studentId={selectedChild} searchQuery={searchQuery} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir ses notes.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'absences' &&
                  (selectedChild ? (
                    <ChildAbsences studentId={selectedChild} searchQuery={searchQuery} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir ses absences.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'reenrollment' &&
                  (selectedChild ? (
                    <ChildReenrollment studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">
                          Choisissez un enfant dans « Mes enfants » pour demander sa réinscription.
                        </p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'assignments' &&
                  (selectedChild ? (
                    <ChildAssignments studentId={selectedChild} searchQuery={searchQuery} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir ses devoirs.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'lesson-logs' &&
                  (selectedChild ? (
                    <LessonLogsBrowser
                      queryKey={['parent-child-lesson-logs', selectedChild]}
                      queryFn={() => parentApi.getChildLessonLogs(selectedChild)}
                    />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant pour consulter le cahier de texte.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'schedule' &&
                  (selectedChild ? (
                    <ChildSchedule studentId={selectedChild} searchQuery={searchQuery} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir son emploi du temps.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'report-cards' &&
                  (selectedChild ? (
                    <ChildReportCards studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir ses bulletins.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'conduct' &&
                  (selectedChild ? (
                    <ChildConduct studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour voir sa conduite.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'orientation' && <ParentOrientationPanel studentId={selectedChild} />}
                {activeTab === 'extracurricular' &&
                  (selectedChild ? (
                    <ParentExtracurricularPanel studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">
                          Choisissez un enfant dans « Mes enfants » pour gérer les activités parascolaires.
                        </p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'campus' &&
                  (selectedChild ? (
                    <ParentCampusPanel studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">
                          Choisissez un enfant pour la cantine et le transport.
                        </p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'payments' &&
                  (selectedChild ? (
                    <ChildPayments studentId={selectedChild} />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-stone-600">
                        <p className="text-lg mb-2 font-semibold text-stone-900">Sélectionnez un enfant</p>
                        <p className="text-sm leading-relaxed">Choisissez un enfant dans « Mes enfants » pour gérer ses paiements.</p>
                      </div>
                    </Card>
                  ))}
                {activeTab === 'digital-library' && <DigitalLibraryBrowser />}
                {activeTab === 'elearning' && <ElearningHub mode="student" />}
                {activeTab === 'mock-exams' && <StudentMockExamsPanel />}
              </div>
            </div>
          </main>
        </div>
      </div>
      </PremiumPortalShell>
    </Layout>
  );
};

export default ParentDashboard;
