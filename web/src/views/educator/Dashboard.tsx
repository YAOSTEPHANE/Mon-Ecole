import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import EducatorOverview from '../../components/educator/EducatorOverview';
import StudentsList from '../../components/educator/StudentsList';
import ConductManager from '../../components/educator/ConductManager';
import EducatorTeachersList from '../../components/educator/EducatorTeachersList';
import EducatorParentsList from '../../components/educator/EducatorParentsList';
import EducatorInternalMessaging from '../../components/educator/EducatorInternalMessaging';
import EducatorScheduleTab from '../../components/educator/EducatorScheduleTab';
import AcademicValidationPanel from '../../components/academic/AcademicValidationPanel';
import { FiLayout, FiUsers, FiShield, FiSearch, FiTrendingUp, FiCommand, FiCheckCircle, FiBookOpen, FiHeart, FiMessageSquare, FiCalendar, FiUserCheck, FiAlertTriangle } from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { inactiveModuleIconClass } from '../../lib/navModuleIconClass';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import PortalRoleModulesHub from '../../components/dashboard/PortalRoleModulesHub';
import { EDUCATOR_MODULE_CATEGORIES } from '@/lib/portalModuleCategories';
import AttendanceManager from '../../components/teacher/AttendanceManager';
import EducatorDisciplinePanel from '../../components/educator/EducatorDisciplinePanel';
import { useQuery } from '@tanstack/react-query';
import { educatorApi } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';

const VALID_TAB_IDS = ['overview', 'students', 'teachers', 'parents', 'messaging', 'schedule', 'attendance', 'conduct', 'discipline', 'validations'] as const;
type TabId = (typeof VALID_TAB_IDS)[number];

type TabDef = {
  id: TabId;
  label: string;
  icon: IconType;
  color: string;
  description: string;
};

const EducatorDashboard = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs: TabDef[] = useMemo(
    () => [
      { id: 'overview', label: 'Vue d’ensemble', icon: FiLayout, color: 'from-violet-500 to-indigo-600', description: 'Indicateurs de conduite et priorités du jour' },
      { id: 'students', label: 'Élèves', icon: FiUsers, color: 'from-indigo-500 to-purple-600', description: 'Liste des élèves par classe' },
      { id: 'teachers', label: 'Enseignants', icon: FiBookOpen, color: 'from-blue-500 to-indigo-600', description: 'Liste des enseignants de l’établissement' },
      { id: 'parents', label: 'Parents', icon: FiHeart, color: 'from-rose-500 to-pink-600', description: 'Familles et contacts par classe' },
      { id: 'messaging', label: 'Messagerie', icon: FiMessageSquare, color: 'from-emerald-500 to-teal-600', description: 'Communication avec enseignants, parents et élèves' },
      { id: 'schedule', label: 'Emplois du temps', icon: FiCalendar, color: 'from-amber-500 to-orange-600', description: 'Plannings par classe et par enseignant' },
      { id: 'attendance', label: 'Appels', icon: FiUserCheck, color: 'from-cyan-500 to-teal-600', description: 'Appel de remplacement sur vos classes' },
      { id: 'conduct', label: 'Conduite', icon: FiShield, color: 'from-purple-500 to-fuchsia-600', description: 'Évaluations et historique comportemental' },
      { id: 'discipline', label: 'Discipline', icon: FiAlertTriangle, color: 'from-amber-700 to-orange-800', description: 'Sanctions et suivis disciplinaires' },
      { id: 'validations', label: 'Validations', icon: FiCheckCircle, color: 'from-blue-600 to-indigo-600', description: 'Valider les notes et moyennes (2e étape)' },
    ],
    []
  );

  useEffect(() => {
    const handleNavigateTab = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail && VALID_TAB_IDS.includes(detail as TabId)) {
        setActiveTab(detail as TabId);
        router.replace(`/educator?tab=${encodeURIComponent(detail)}`);
      }
    };

    window.addEventListener('navigate-tab', handleNavigateTab as EventListener);
    return () => {
      window.removeEventListener('navigate-tab', handleNavigateTab as EventListener);
    };
  }, [router]);

  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t && VALID_TAB_IDS.includes(t as TabId)) {
      setActiveTab(t as TabId);
    }
  }, [searchParams]);

  const { data: attendanceAlerts = [] } = useQuery({
    queryKey: ['educator-attendance-alerts'],
    queryFn: () => educatorApi.getAttendanceAlerts(),
    staleTime: 60_000,
  });

  const changeTab = (tabId: TabId) => {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', tabId);
    router.replace(`/educator?${params.toString()}`);
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
    <Layout user={user} onLogout={logout} role="EDUCATOR">
      <PremiumPortalShell variant="educator">
      <div className="min-h-screen flex">
        <aside className="hidden lg:flex w-64 flex-col shrink-0 sticky dash-sticky-under-header dash-h-under-header bg-white/92 backdrop-blur-xl border-r border-stone-200/90 shadow-[0_12px_40px_-20px_rgba(12,10,9,0.12)]">
          <div className="p-2.5 flex flex-col flex-1 min-h-0">
            <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider px-2 py-1.5 shrink-0">
              Éducateur
            </p>
            <nav className="space-y-1 flex-1 overflow-y-auto min-h-0 pr-0.5 text-xs leading-snug">
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="dash-command-bar sticky dash-sticky-under-header z-20 shrink-0">
            <div className="max-w-[1200px] mx-auto px-3 sm:px-6 py-2 sm:py-2.5">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
                  <div className="min-w-0">
                    <h1 className="font-display text-base sm:text-lg md:text-xl font-bold text-stone-900 tracking-tight leading-snug">
                      {getGreeting()}, {user?.firstName}
                    </h1>
                    <p className="text-stone-600 text-xs mt-0.5 line-clamp-1 max-w-md">
                      Conduite et accompagnement
                    </p>
                    <p className="dash-mobile-meta text-[11px] sm:text-xs text-stone-500 mt-1 tabular-nums">
                      {format(new Date(), "EEE d MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200/80 text-violet-950 text-xs font-semibold shrink-0 ring-1 ring-violet-900/5">
                    <FiTrendingUp className="w-3.5 h-3.5 text-violet-700" aria-hidden />
                    Éducateur
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
                    placeholder="Rechercher un élève, enseignant ou parent…"
                className="dash-search-field w-full rounded-xl pl-10 pr-3 py-2 sm:py-2.5 text-sm text-stone-900 placeholder:text-stone-400"
                    aria-label="Recherche dans l’espace éducateur"
                  />
                </div>
              </div>
            </div>
          </header>

          <main className="dash-workspace flex-1 overflow-y-auto overflow-x-hidden px-2.5 sm:px-6 py-4 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] scroll-smooth">
            <div className="max-w-[1200px] mx-auto space-y-4 sm:space-y-5">
                            <PremiumModuleHeader
                title={activeMeta.label}
                description={activeMeta.description}
                icon={ActiveTabIcon}
                gradient={activeMeta.color}
                badge="Éducateur"
              />

              <div className="animate-slide-up">
                {activeTab === 'overview' && (
                  <>
                    {attendanceAlerts.length > 0 && (
                      <Card className="mb-4 border border-orange-200 bg-orange-50/70 p-4">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <h3 className="flex items-center gap-2 text-sm font-bold text-stone-900">
                            <FiAlertTriangle className="h-4 w-4 text-orange-700" />
                            Absences non justifiées (21 j.)
                          </h3>
                          <Badge variant="warning">{attendanceAlerts.length}</Badge>
                        </div>
                        <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                          {attendanceAlerts.slice(0, 8).map((a: any) => (
                            <li key={a.id}>
                              <button
                                type="button"
                                className="flex w-full justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-stone-700 hover:bg-orange-100/80"
                                onClick={() => {
                                  const params = new URLSearchParams(searchParams?.toString() ?? '');
                                  params.set('tab', 'discipline');
                                  if (a.student?.id) params.set('studentId', a.student.id);
                                  router.replace(`/educator?${params.toString()}`);
                                  setActiveTab('discipline');
                                }}
                              >
                                <span className="min-w-0 truncate">
                                  {a.student?.user?.lastName} {a.student?.user?.firstName}
                                  {a.student?.class?.name ? ` · ${a.student.class.name}` : ''}
                                  {a.course?.name ? ` · ${a.course.name}` : ''}
                                </span>
                                <span className="shrink-0 text-xs text-stone-500">
                                  {a.date ? format(new Date(a.date), 'dd/MM', { locale: fr }) : ''}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs font-semibold text-orange-800 hover:underline"
                            onClick={() => changeTab('attendance')}
                          >
                            Ouvrir les appels →
                          </button>
                          <button
                            type="button"
                            className="text-xs font-semibold text-amber-900 hover:underline"
                            onClick={() => changeTab('discipline')}
                          >
                            Créer un suivi discipline →
                          </button>
                        </div>
                      </Card>
                    )}
                    <EducatorOverview searchQuery={searchQuery} />
                    <PortalRoleModulesHub
                      tabs={tabs}
                      categories={EDUCATOR_MODULE_CATEGORIES}
                      onNavigate={(id) => changeTab(id as TabId)}
                    />
                  </>
                )}
                {activeTab === 'students' && <StudentsList searchQuery={searchQuery} />}
                {activeTab === 'teachers' && <EducatorTeachersList searchQuery={searchQuery} />}
                {activeTab === 'parents' && <EducatorParentsList searchQuery={searchQuery} />}
                {activeTab === 'messaging' && <EducatorInternalMessaging />}
                {activeTab === 'schedule' && <EducatorScheduleTab />}
                {activeTab === 'attendance' && (
                  <AttendanceManager searchQuery={searchQuery} variant="educator" />
                )}
                {activeTab === 'conduct' && <ConductManager searchQuery={searchQuery} />}
                {activeTab === 'discipline' && <EducatorDisciplinePanel />}
                {activeTab === 'validations' && (
                  <AcademicValidationPanel title="Validations (éducateur)" />
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
      </PremiumPortalShell>
    </Layout>
  );
};

export default EducatorDashboard;
