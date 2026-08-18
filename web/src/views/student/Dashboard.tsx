import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import DashboardTabLoading from '../../components/dashboard/DashboardTabLoading';
import {
  FiLayout,
  FiUser,
  FiAward,
  FiCalendar,
  FiAlertCircle,
  FiFileText,
  FiSearch,
  FiBook,
  FiStar,
  FiX,
  FiFilter,
  FiDollarSign,
  FiArchive,
  FiCreditCard,
  FiMessageCircle,
  FiMap,
  FiNavigation,
  FiCloud,
  FiMonitor,
  FiTarget,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import Card from '../../components/ui/Card';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalSpaceHeader from '../../components/dashboard/PortalSpaceHeader';
import { studentApi } from '../../services/api';

const StudentOverview = dynamic(() => import('../../components/student/StudentOverview'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentProfile = dynamic(() => import('../../components/student/StudentProfile'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentGrades = dynamic(() => import('../../components/student/StudentGrades'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentSchedule = dynamic(() => import('../../components/student/StudentSchedule'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentAbsences = dynamic(() => import('../../components/student/StudentAbsences'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentAssignments = dynamic(() => import('../../components/student/StudentAssignments'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentConduct = dynamic(() => import('../../components/student/StudentConduct'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentPayments = dynamic(() => import('../../components/student/StudentPayments'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentAcademicHistory = dynamic(() => import('../../components/student/StudentAcademicHistory'), { loading: () => <DashboardTabLoading />, ssr: false });
const IdentityDocumentsPanel = dynamic(() => import('../../components/identity/IdentityDocumentsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const SchoolCommunication = dynamic(() => import('../../components/portal/SchoolCommunication'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentExtracurricularPanel = dynamic(() => import('../../components/student/StudentExtracurricularPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentOrientationPanel = dynamic(() => import('../../components/student/StudentOrientationPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const DigitalLibraryBrowser = dynamic(() => import('../../components/digital-library/DigitalLibraryBrowser'), { loading: () => <DashboardTabLoading />, ssr: false });
const ElearningHub = dynamic(() => import('../../components/elearning/ElearningHub'), { loading: () => <DashboardTabLoading />, ssr: false });
const StudentMockExamsPanel = dynamic(() => import('../../components/student/StudentMockExamsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const LessonLogsBrowser = dynamic(() => import('../../components/shared/LessonLogsBrowser'), { loading: () => <DashboardTabLoading />, ssr: false });

const VALID_TAB_IDS = [
  'overview',
  'profile',
  'academic-history',
  'identity-documents',
  'grades',
  'schedule',
  'absences',
  'assignments',
  'lesson-logs',
  'conduct',
  'extracurricular',
  'orientation',
  'payments',
  'messages',
  'digital-library',
  'elearning',
  'mock-exams',
] as const;

type TabId = (typeof VALID_TAB_IDS)[number];

const MOBILE_PRIMARY_TABS: TabId[] = [
  'overview',
  'grades',
  'absences',
  'assignments',
  'schedule',
  'payments',
];

type TabDef = {
  id: TabId;
  label: string;
  icon: IconType;
  color: string;
  description: string;
};

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchCategory, setSearchCategory] = useState<
    'all' | 'grades' | 'absences' | 'assignments' | 'schedule' | 'conduct'
  >('all');
  const [searchDateRange, setSearchDateRange] = useState<'all' | 'week' | 'month' | 'semester'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Résumé de votre scolarité et accès rapides' },
      { id: 'profile', label: 'Profil', icon: FiUser, color: 'from-fuchsia-500 to-pink-600', description: 'Coordonnées et informations personnelles' },
      { id: 'academic-history', label: 'Historique scolaire', icon: FiArchive, color: 'from-cptb-blue-mid to-cptb-blue-dark', description: 'Parcours et données académiques' },
      { id: 'identity-documents', label: 'Documents d’identité', icon: FiCreditCard, color: 'from-slate-600 to-slate-800', description: 'Pièces officielles et justificatifs' },
      { id: 'grades', label: 'Notes', icon: FiAward, color: 'from-purple-500 to-fuchsia-600', description: 'Résultats et évaluations' },
      { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-pink-500 to-rose-600', description: 'Planning des cours' },
      { id: 'absences', label: 'Absences', icon: FiAlertCircle, color: 'from-amber-500 to-orange-600', description: 'Assiduité et justifications' },
      { id: 'assignments', label: 'Devoirs', icon: FiFileText, color: 'from-cyan-500 to-teal-600', description: 'Travaux à rendre et rendus' },
      { id: 'lesson-logs', label: 'Cahier de texte', icon: FiBook, color: 'from-amber-600 to-orange-700', description: 'Séances publiées par les enseignants' },
      { id: 'conduct', label: 'Conduite', icon: FiStar, color: 'from-rose-500 to-pink-600', description: 'Comportement et appréciations' },
      {
        id: 'extracurricular',
        label: 'Activités parascolaires',
        icon: FiMap,
        color: 'from-teal-500 to-cyan-600',
        description: 'Clubs, événements, sorties et inscriptions',
      },
      {
        id: 'orientation',
        label: 'Orientation',
        icon: FiNavigation,
        color: 'from-cptb-blue to-cptb-blue-dark',
        description: 'Filières, tests, conseils, partenariats, suivi et stages',
      },
      { id: 'payments', label: 'Paiements', icon: FiDollarSign, color: 'from-emerald-500 to-green-600', description: 'Frais et règlements en ligne' },
      { id: 'messages', label: 'Messages école', icon: FiMessageCircle, color: 'from-cptb-blue-mid to-cptb-blue-dark', description: 'Échanges avec l’administration' },
      { id: 'digital-library', label: 'Bibliothèque numérique', icon: FiCloud, color: 'from-sky-600 to-cptb-blue', description: 'E-books, PDF et ressources pédagogiques en ligne' },
      { id: 'elearning', label: 'E-learning', icon: FiMonitor, color: 'from-cptb-blue to-cptb-blue-mid', description: 'Cours en ligne, quiz et classes virtuelles' },
      {
        id: 'mock-exams',
        label: 'Examens blancs',
        icon: FiTarget,
        color: 'from-fuchsia-500 to-rose-600',
        description: 'Entraînement BEPC / BAC pour les classes d’examen',
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

  const changeTab = (tabId: TabId) => {
    setActiveTab(tabId);
    setSidebarOpen(false);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tabId);
    router.replace(`/student?${params.toString()}`);
  };

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && VALID_TAB_IDS.includes(detail as TabId)) {
        changeTab(detail as TabId);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
  }, [router, searchParams]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setShowSearchFilters(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchFilters(false);
      }
    };
    if (showSearchFilters) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchFilters]);

  const activeMeta = tabs.find((t) => t.id === activeTab) ?? tabs[0];
  const ActiveTabIcon = activeMeta.icon;

  const enrollmentStatus = (user as { studentProfile?: { enrollmentStatus?: string } } | null)
    ?.studentProfile?.enrollmentStatus;

  return (
    <Layout user={user} onLogout={logout} role="STUDENT" hideHeader>
      <PremiumPortalShell variant="student">
      <div className="min-h-screen flex flex-col">
        {enrollmentStatus === 'GRADUATED' && (
          <div className="bg-sky-50/95 border-b border-sky-200/80 backdrop-blur-md shrink-0">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
              <p className="text-sm text-sky-950 leading-relaxed">
                <span className="font-semibold">Profil diplômé·e</span> — vous conservez l’accès à cet espace pour
                consulter votre historique et vos documents.
              </p>
            </div>
          </div>
        )}

        <div className="flex dash-min-h-under-header w-full flex-1 items-stretch">
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
                Élève
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
              role="STUDENT"
              onLogout={logout}
              title="Espace élève"
              onMenuClick={() => setSidebarOpen((open) => !open)}
              mobileTabs={tabs.filter((tab) => MOBILE_PRIMARY_TABS.includes(tab.id))}
              activeTab={activeTab}
              onTabChange={(id) => changeTab(id as TabId)}
              searchSlot={
                <div className="relative hidden w-52 shrink-0 md:block lg:w-72" ref={searchContainerRef}>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                      <FiSearch className="h-4 w-4" aria-hidden />
                    </div>
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowSearchFilters(true)}
                      placeholder="Rechercher…"
                      aria-label="Recherche dans l’espace élève"
                      className="dash-search-field w-full rounded-xl py-2 pl-10 pr-16 text-sm text-stone-900 placeholder:text-stone-400"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        aria-label="Effacer la recherche"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchCategory('all');
                          setSearchDateRange('all');
                        }}
                        className="absolute inset-y-0 right-8 flex items-center pr-1 text-stone-400 hover:text-stone-700"
                      >
                        <FiX className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      aria-label={showSearchFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
                      onClick={() => setShowSearchFilters(!showSearchFilters)}
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                        showSearchFilters || searchCategory !== 'all' || searchDateRange !== 'all'
                          ? 'text-cptb-blue'
                          : 'text-stone-400 hover:text-stone-600'
                      }`}
                    >
                      <FiFilter className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                  {showSearchFilters ? (
                    <Card
                      variant="premium"
                      className="absolute top-full right-0 z-50 mt-2 w-[min(100vw-2rem,22rem)] !p-4 border border-stone-200/90 ring-1 ring-cptb-gold/25"
                      hover={false}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-stone-900">Filtres</h3>
                        <button
                          type="button"
                          aria-label="Fermer les filtres"
                          onClick={() => setShowSearchFilters(false)}
                          className="rounded-lg p-1 text-stone-400 hover:text-stone-700"
                        >
                          <FiX className="h-4 w-4" aria-hidden />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'all' as const, label: 'Tout', icon: FiLayout },
                          { value: 'grades' as const, label: 'Notes', icon: FiAward },
                          { value: 'absences' as const, label: 'Absences', icon: FiAlertCircle },
                          { value: 'assignments' as const, label: 'Devoirs', icon: FiFileText },
                          { value: 'schedule' as const, label: 'EDT', icon: FiCalendar },
                          { value: 'conduct' as const, label: 'Conduite', icon: FiStar },
                        ].map((cat) => {
                          const Icon = cat.icon;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setSearchCategory(cat.value);
                                if (cat.value !== 'all') changeTab(cat.value);
                              }}
                              className={`flex flex-col items-center justify-center rounded-xl border p-2 text-[11px] font-medium ${
                                searchCategory === cat.value
                                  ? 'border-cptb-gold bg-amber-50 text-stone-900'
                                  : 'border-stone-200 text-stone-700 hover:border-cptb-gold/40'
                              }`}
                            >
                              <Icon className="mb-1 h-4 w-4" />
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                      <label htmlFor="student-search-period" className="mb-1 mt-3 block text-xs font-medium text-stone-600">
                        Période
                      </label>
                      <select
                        id="student-search-period"
                        aria-label="Période pour la recherche"
                        value={searchDateRange}
                        onChange={(e) => setSearchDateRange(e.target.value as typeof searchDateRange)}
                        className="w-full rounded-xl border border-stone-200/90 bg-white px-3 py-2 text-sm text-stone-900"
                      >
                        <option value="all">Toutes les périodes</option>
                        <option value="week">7 derniers jours</option>
                        <option value="month">30 derniers jours</option>
                        <option value="semester">6 derniers mois</option>
                      </select>
                    </Card>
                  ) : null}
                </div>
              }
            />

            <main className="dash-workspace flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] scroll-smooth">
              <div className="mx-auto max-w-[1240px] space-y-5 sm:space-y-6">
              {activeTab !== 'overview' ? (
                <PremiumModuleHeader
                  title={activeMeta.label}
                  description={activeMeta.description}
                  icon={ActiveTabIcon}
                  gradient={activeMeta.color}
                  badge="Élève"
                />
              ) : null}

              <div className="animate-slide-up">
                  {activeTab === 'overview' && (
                    <StudentOverview searchQuery={searchQuery} searchCategory={searchCategory} />
                  )}
                  {activeTab === 'profile' && <StudentProfile searchQuery={searchQuery} />}
                  {activeTab === 'academic-history' && <StudentAcademicHistory searchQuery={searchQuery} />}
                  {activeTab === 'identity-documents' && <IdentityDocumentsPanel mode="student" />}
                  {activeTab === 'grades' && (
                    <StudentGrades
                      searchQuery={searchQuery}
                      searchCategory={searchCategory}
                      searchDateRange={searchDateRange}
                    />
                  )}
                  {activeTab === 'schedule' && <StudentSchedule searchQuery={searchQuery} />}
                  {activeTab === 'absences' && (
                    <StudentAbsences searchQuery={searchQuery} searchDateRange={searchDateRange} />
                  )}
                  {activeTab === 'assignments' && (
                    <StudentAssignments
                      searchQuery={searchQuery}
                      searchCategory={searchCategory}
                      searchDateRange={searchDateRange}
                    />
                  )}
                  {activeTab === 'lesson-logs' && (
                    <LessonLogsBrowser
                      queryKey={['student-lesson-logs']}
                      queryFn={() => studentApi.getLessonLogs()}
                    />
                  )}
                  {activeTab === 'conduct' && <StudentConduct searchQuery={searchQuery} />}
                  {activeTab === 'extracurricular' && <StudentExtracurricularPanel />}
                  {activeTab === 'orientation' && <StudentOrientationPanel />}
                  {activeTab === 'payments' && <StudentPayments />}
                  {activeTab === 'messages' && <SchoolCommunication role="student" />}
                  {activeTab === 'digital-library' && <DigitalLibraryBrowser />}
                  {activeTab === 'elearning' && <ElearningHub mode="student" />}
                  {activeTab === 'mock-exams' && <StudentMockExamsPanel />}
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
      </PremiumPortalShell>
    </Layout>
  );
};

export default StudentDashboard;
