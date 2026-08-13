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
  FiCommand,
  FiMap,
  FiNavigation,
  FiCloud,
  FiMonitor,
  FiTarget,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import Card from '../../components/ui/Card';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalRoleModulesHub from '../../components/dashboard/PortalRoleModulesHub';
import { STUDENT_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
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
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchCategory, setSearchCategory] = useState<
    'all' | 'grades' | 'absences' | 'assignments' | 'schedule' | 'conduct'
  >('all');
  const [searchDateRange, setSearchDateRange] = useState<'all' | 'week' | 'month' | 'semester'>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, color: 'from-violet-500 to-purple-600', description: 'Résumé de votre scolarité et accès rapides' },
      { id: 'profile', label: 'Profil', icon: FiUser, color: 'from-fuchsia-500 to-pink-600', description: 'Coordonnées et informations personnelles' },
      { id: 'academic-history', label: 'Historique scolaire', icon: FiArchive, color: 'from-indigo-500 to-violet-600', description: 'Parcours et données académiques' },
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
        color: 'from-indigo-500 to-violet-600',
        description: 'Filières, tests, conseils, partenariats, suivi et stages',
      },
      { id: 'payments', label: 'Paiements', icon: FiDollarSign, color: 'from-emerald-500 to-green-600', description: 'Frais et règlements en ligne' },
      { id: 'messages', label: 'Messages école', icon: FiMessageCircle, color: 'from-blue-500 to-indigo-600', description: 'Échanges avec l’administration' },
      { id: 'digital-library', label: 'Bibliothèque numérique', icon: FiCloud, color: 'from-sky-500 to-indigo-600', description: 'E-books, PDF et ressources pédagogiques en ligne' },
      { id: 'elearning', label: 'E-learning', icon: FiMonitor, color: 'from-violet-500 to-purple-600', description: 'Cours en ligne, quiz et classes virtuelles' },
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const enrollmentStatus = (user as { studentProfile?: { enrollmentStatus?: string } } | null)
    ?.studentProfile?.enrollmentStatus;

  return (
    <Layout user={user} onLogout={logout} role="STUDENT">
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
          <aside className="relative z-50 hidden shrink-0 flex-col border-r border-stone-200/90 bg-white/92 shadow-[0_12px_40px_-20px_rgba(12,10,9,0.12)] backdrop-blur-xl lg:sticky dash-sticky-under-header lg:flex dash-h-under-header lg:w-64 lg:self-start">
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
            <header className="dash-command-bar sticky dash-sticky-under-header z-20 shrink-0">
              <div className="mx-auto max-w-[1240px] px-3 sm:px-6 py-2 sm:py-3">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                    <div className="min-w-0">
                      <h1 className="font-display text-base sm:text-lg md:text-xl font-bold text-stone-900 tracking-tight leading-snug">
                        {getGreeting()}, {user?.firstName}
                      </h1>
                      <p className="text-stone-600 text-xs mt-0.5 line-clamp-1 max-w-md">
                        Progression et scolarité
                      </p>
                      <p className="dash-mobile-meta text-[11px] sm:text-xs text-stone-500 mt-1 tabular-nums">
                        {format(new Date(), "EEE d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200/80 text-violet-950 text-xs font-semibold shrink-0 ring-1 ring-violet-900/5">
                      <FiBook className="w-3.5 h-3.5 text-violet-700" aria-hidden />
                      Élève
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

                  <div className="relative w-full max-w-xl" ref={searchContainerRef}>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                        <FiSearch className="w-4 h-4" aria-hidden />
                      </div>
                      <input
                        ref={searchInputRef}
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSearchFilters(true)}
                        placeholder="Rechercher (Ctrl+K)…"
                        aria-label="Recherche dans l’espace élève"
                        className="dash-search-field w-full rounded-xl py-2 pl-10 pr-24 text-sm text-stone-900 placeholder:text-stone-400 sm:py-2.5"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          aria-label="Effacer la recherche"
                          title="Effacer la recherche"
                          onClick={() => {
                            setSearchQuery('');
                            setSearchCategory('all');
                            setSearchDateRange('all');
                          }}
                          className="absolute inset-y-0 right-12 pr-2 flex items-center text-stone-400 hover:text-stone-700 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                        >
                          <FiX className="w-5 h-5" aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label={showSearchFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
                        title="Filtres de recherche"
                        onClick={() => setShowSearchFilters(!showSearchFilters)}
                        className={`absolute inset-y-0 right-0 pr-3 flex items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${
                          showSearchFilters || searchCategory !== 'all' || searchDateRange !== 'all'
                            ? 'text-violet-700'
                            : 'text-stone-400 hover:text-stone-600'
                        }`}
                      >
                        <FiFilter className="w-5 h-5" aria-hidden />
                      </button>
                    </div>

                    {showSearchFilters && (
                      <Card
                        variant="premium"
                        className="absolute top-full mt-2 w-full z-50 !p-4 border border-stone-200/90 ring-1 ring-violet-200/40"
                        hover={false}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-stone-900 text-sm">Filtres</h3>
                          <button
                            type="button"
                            aria-label="Fermer les filtres"
                            title="Fermer"
                            onClick={() => setShowSearchFilters(false)}
                            className="text-stone-400 hover:text-stone-700 p-1 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45"
                          >
                            <FiX className="w-5 h-5" aria-hidden />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                  if (cat.value !== 'all') {
                                    changeTab(cat.value);
                                  }
                                }}
                                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40 ${
                                  searchCategory === cat.value
                                    ? 'border-violet-500 bg-violet-50 text-violet-900'
                                    : 'border-stone-200 hover:border-violet-200 text-stone-700'
                                }`}
                              >
                                <Icon className="w-4 h-4 mb-1" />
                                {cat.label}
                              </button>
                            );
                          })}
                        </div>
                        <label htmlFor="student-search-period" className="block text-xs font-medium text-stone-600 mt-3 mb-1">
                          Période
                        </label>
                        <select
                          id="student-search-period"
                          aria-label="Période pour la recherche"
                          value={searchDateRange}
                          onChange={(e) => setSearchDateRange(e.target.value as typeof searchDateRange)}
                          className="w-full px-3 py-2.5 rounded-xl border border-stone-200/90 text-sm bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500/35"
                        >
                          <option value="all">Toutes les périodes</option>
                          <option value="week">7 derniers jours</option>
                          <option value="month">30 derniers jours</option>
                          <option value="semester">6 derniers mois</option>
                        </select>
                      </Card>
                    )}
                  </div>
                </div>
              </div>
            </header>

            <main className="dash-workspace flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-6 py-5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] scroll-smooth">
              <div className="mx-auto max-w-[1240px] space-y-5 sm:space-y-6">
                              <PremiumModuleHeader
                title={activeMeta.label}
                description={activeMeta.description}
                icon={ActiveTabIcon}
                gradient={activeMeta.color}
                badge="Élève"
              />

              <div className="animate-slide-up">
                  {activeTab === 'overview' && (
                    <>
                      <StudentOverview searchQuery={searchQuery} searchCategory={searchCategory} />
                      <PortalRoleModulesHub
                        tabs={tabs}
                        categories={STUDENT_MODULE_CATEGORIES}
                        onNavigate={(id) => changeTab(id as TabId)}
                      />
                    </>
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
