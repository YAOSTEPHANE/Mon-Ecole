import { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../contexts/AuthContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Layout from '../../components/Layout';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { PremiumPortalShell, PremiumModuleHeader } from '../../components/dashboard/premium';
import DashboardTabLoading from '../../components/dashboard/DashboardTabLoading';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import AdminTabLogoCard from '../../components/admin/AdminTabLogoCard';
import SchoolSwitcher from '../../components/admin/SchoolSwitcher';
import AccountHeaderControls from '../../components/AccountHeaderControls';
import type { PersonnelCategoryFilter } from '../../components/admin/staff/StaffPersonnelModule';
import { 
  FiLayout, 
  FiUsers, 
  FiBook, 
  FiUserCheck, 
  FiSettings,
  FiLink,
  FiBarChart,
  FiCalendar,
  FiBell,
  FiSearch,
  FiAward,
  FiBriefcase,
  FiShield,
  FiZap,
  FiDollarSign,
  FiWifi,
  FiActivity,
  FiInbox,
  FiUserPlus,
  FiLayers,
  FiEdit3,
  FiFileText,
  FiGift,
  FiCreditCard,
  FiCheckSquare,
  FiPackage,
  FiBookOpen,
  FiTool,
  FiPieChart,
  FiCommand,
  FiArrowRight,
  FiMenu,
  FiChevronLeft,
  FiChevronRight,
  FiGitBranch,
  FiHeart,
  FiClipboard,
  FiAlertTriangle,
  FiMap,
  FiNavigation,
  FiMonitor,
  FiHome,
  FiTarget,
  FiTrendingUp,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import { useSchool } from '../../contexts/SchoolContext';
import {
  ADMIN_VALID_TAB_IDS,
  filterTabsByVisibleModules,
  isAdminModuleId,
} from '../../lib/adminModules';

const StudentsList = dynamic(() => import('../../components/admin/StudentsList'), { loading: () => <DashboardTabLoading />, ssr: false });
const ClassesList = dynamic(() => import('../../components/admin/ClassesList'), { loading: () => <DashboardTabLoading />, ssr: false });
const TeachersList = dynamic(() => import('../../components/admin/TeachersList'), { loading: () => <DashboardTabLoading />, ssr: false });
const StaffPersonnelModule = dynamic(() => import('../../components/admin/staff/StaffPersonnelModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ParentGuardiansModule = dynamic(() => import('../../components/admin/parents/ParentGuardiansModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AdminOpsDashboard = dynamic(() => import('../../components/admin/ops-dashboard/AdminOpsDashboard'), { loading: () => <DashboardTabLoading />, ssr: false });
const AllActivities = dynamic(() => import('./AllActivities'), { loading: () => <DashboardTabLoading />, ssr: false });
const AllNotifications = dynamic(() => import('./AllNotifications'), { loading: () => <DashboardTabLoading />, ssr: false });
const CompleteManagement = dynamic(() => import('../../components/admin/CompleteManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const MultiRolesManagement = dynamic(() => import('../../components/admin/MultiRolesManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const PedagogicalTracking = dynamic(() => import('../../components/admin/PedagogicalTracking'), { loading: () => <DashboardTabLoading />, ssr: false });
const CommunicationHubModule = dynamic(() => import('../../components/admin/CommunicationHubModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AdvancedAnalytics = dynamic(() => import('../../components/admin/AdvancedAnalytics'), { loading: () => <DashboardTabLoading />, ssr: false });
const ScheduleManagement = dynamic(() => import('../../components/admin/ScheduleManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const AcademicManagement = dynamic(() => import('../../components/admin/AcademicManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const GradingEvaluationManagement = dynamic(() => import('../../components/admin/GradingEvaluationManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const FeesManagementModule = dynamic(() => import('../../components/admin/FeesManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AdministrativeManagement = dynamic(() => import('../../components/admin/AdministrativeManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const AdmissionsManagementModule = dynamic(() => import('../../components/admin/AdmissionsManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const SecurityPrivacyManagement = dynamic(() => import('../../components/admin/SecurityPrivacyManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const PerformanceManagement = dynamic(() => import('../../components/admin/PerformanceManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const TuitionFeesManagement = dynamic(() => import('../../components/admin/TuitionFeesManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const PaymentsManagement = dynamic(() => import('../../components/admin/PaymentsManagement'), { loading: () => <DashboardTabLoading />, ssr: false });
const AccountingManagementModule = dynamic(() => import('../../components/admin/AccountingManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AccessControlModule = dynamic(() => import('../../components/admin/AccessControlModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const PointageEleves = dynamic(() => import('../../components/admin/PointageEleves'), { loading: () => <DashboardTabLoading />, ssr: false });
const AttendanceManagementModule = dynamic(() => import('../../components/admin/AttendanceManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const HRManagementModule = dynamic(() => import('../../components/admin/hr/HRManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const LibraryManagementModule = dynamic(() => import('../../components/admin/library/LibraryManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const HealthManagementModule = dynamic(() => import('../../components/admin/health/HealthManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ElearningHub = dynamic(() => import('../../components/elearning/ElearningHub'), { loading: () => <DashboardTabLoading />, ssr: false });
const MaterialManagementModule = dynamic(() => import('../../components/admin/material/MaterialManagementModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const DisciplineAdminModule = dynamic(() => import('../../components/admin/DisciplineAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ExtracurricularAdminModule = dynamic(() => import('../../components/admin/ExtracurricularAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const CampusServicesModule = dynamic(() => import('../../components/admin/CampusServicesModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const SchoolOperationsHub = dynamic(() => import('../../components/admin/SchoolOperationsHub'), { loading: () => <DashboardTabLoading />, ssr: false });
const OrientationAdminModule = dynamic(() => import('../../components/admin/OrientationAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ExamsAdminModule = dynamic(() => import('../../components/admin/ExamsAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const SchoolCalendarAdminModule = dynamic(() => import('../../components/admin/SchoolCalendarAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const CertificatesAdminModule = dynamic(() => import('../../components/admin/CertificatesAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ScholarshipsAdminModule = dynamic(() => import('../../components/admin/ScholarshipsAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const TeacherTrainingAdminModule = dynamic(() => import('../../components/admin/TeacherTrainingAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AlumniAdminModule = dynamic(() => import('../../components/admin/AlumniAdminModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const ReportsStatisticsModule = dynamic(() => import('../../components/admin/reports/ReportsStatisticsModule'), { loading: () => <DashboardTabLoading />, ssr: false });
const AddStudentModal = dynamic(() => import('../../components/admin/AddStudentModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const AddClassModal = dynamic(() => import('../../components/admin/AddClassModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const AddTeacherModal = dynamic(() => import('../../components/admin/AddTeacherModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const GenerateReportModal = dynamic(() => import('../../components/admin/GenerateReportModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const ExportDataModal = dynamic(() => import('../../components/admin/ExportDataModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const SettingsModal = dynamic(() => import('../../components/admin/SettingsModal'), { loading: () => <DashboardTabLoading />, ssr: false });
const IntegrationsSettingsPanel = dynamic(() => import('../../components/admin/IntegrationsSettingsPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const AdminWorkspacesPanel = dynamic(() => import('../../components/admin/AdminWorkspacesPanel'), { loading: () => <DashboardTabLoading />, ssr: false });
const SchoolsManagementPanel = dynamic(() => import('../../components/admin/SchoolsManagementPanel'), { loading: () => <DashboardTabLoading />, ssr: false });

const VALID_TAB_IDS = ADMIN_VALID_TAB_IDS;

type TabItem = {
  id: string;
  label: string;
  icon: IconType;
  color: string;
  description: string;
};

const SIDEBAR_COLLAPSED_KEY = 'admin-dashboard-sidebar-collapsed';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const { isMultiSchool, activeSchool } = useSchool();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const path = pathname ?? '';
    if (path.includes('/activities')) {
      setActiveTab('activities');
      return;
    }
    if (path.includes('/notifications')) {
      setActiveTab('notifications');
      return;
    }
    const rawTab = searchParams?.get('tab');
    if (rawTab === 'educators') {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', 'staff-personnel');
      if (!params.get('personnel')) params.set('personnel', 'educator');
      router.replace(`/admin?${params.toString()}`);
      setActiveTab('staff-personnel');
      return;
    }
    const tab = rawTab;
    if (tab && VALID_TAB_IDS.includes(tab as (typeof VALID_TAB_IDS)[number])) {
      setActiveTab(tab);
      return;
    }
    setActiveTab('dashboard');
  }, [pathname, searchParams, router]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddTeacherModalOpen, setIsAddTeacherModalOpen] = useState(false);
  const [isGenerateReportModalOpen, setIsGenerateReportModalOpen] = useState(false);
  const [isExportDataModalOpen, setIsExportDataModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<'school' | 'academic' | 'notifications' | 'security' | 'user' | 'system'>('school');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1') {
        setSidebarCollapsed(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  const schoolsTab: TabItem = {
    id: 'schools',
    label: 'Établissements',
    icon: FiHome,
    color: 'from-amber-600 to-orange-700',
    description: 'Créer et gérer plusieurs collèges sur la plateforme',
  };

  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: FiLayout, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Vue d’ensemble et indicateurs' },
    ...(user?.role === 'SUPER_ADMIN' ? [schoolsTab] : []),
    { id: 'activities', label: 'Activités', icon: FiActivity, color: 'from-sky-500 to-sky-600', description: 'Historique des activités récentes' },
    { id: 'notifications', label: 'Notifications', icon: FiInbox, color: 'from-amber-500 to-amber-600', description: 'Toutes les notifications' },
    { id: 'students', label: 'Élèves', icon: FiUsers, color: 'from-green-500 to-green-600', description: 'Gestion des élèves' },
    { id: 'alumni', label: 'Anciens élèves', icon: FiAward, color: 'from-slate-600 to-slate-800', description: 'Élèves archivés, diplômés et réintégration' },
    { id: 'academic', label: 'Gestion académique', icon: FiLayers, color: 'from-cptb-blue to-cptb-blue-mid', description: 'Classes, matières, emploi du temps et calendrier' },
    { id: 'grading', label: 'Notation & évaluation', icon: FiEdit3, color: 'from-fuchsia-500 to-fuchsia-600', description: 'Notes, moyennes, bulletins PDF et rapports' },
    { id: 'exams', label: 'Examens blancs & officiels', icon: FiTarget, color: 'from-fuchsia-500 to-pink-600', description: 'BEPC, BAC, questionnaires et sessions' },
    { id: 'classes', label: 'Classes', icon: FiBook, color: 'from-purple-500 to-purple-600', description: 'Gestion des classes' },
    { id: 'teachers', label: 'Enseignants', icon: FiUserCheck, color: 'from-cptb-blue-mid to-cptb-blue-dark', description: 'Gestion des enseignants' },
    {
      id: 'staff-personnel',
      label: 'Personnel',
      icon: FiGitBranch,
      color: 'from-teal-600 to-emerald-800',
      description: 'Administration, soutien, éducateurs, organigramme, fiches de poste et présences',
    },
    {
      id: 'parent-guardians',
      label: 'Parents & tuteurs',
      icon: FiHeart,
      color: 'from-rose-500 to-orange-500',
      description: 'Profils, portail, contacts, journal, consentements et autorisations de récupération',
    },
    { id: 'management', label: 'Gestion complète', icon: FiBarChart, color: 'from-cyan-500 to-cyan-600', description: 'Notes, absences, devoirs et bulletins' },
    { id: 'roles', label: 'Multi-rôles', icon: FiUsers, color: 'from-pink-500 to-pink-600', description: 'Utilisateurs et rôles' },
    {
      id: 'workspaces',
      label: 'Espaces & modules',
      icon: FiLayers,
      color: 'from-cptb-blue to-cptb-blue-dark',
      description: 'Créer des espaces et attribuer modules et fonctionnalités',
    },
    { id: 'pedagogical', label: 'Suivi pédagogique', icon: FiAward, color: 'from-yellow-500 to-yellow-600', description: 'Suivi pédagogique et indicateurs' },
    {
      id: 'discipline',
      label: 'Discipline & règlement',
      icon: FiAlertTriangle,
      color: 'from-amber-700 to-orange-800',
      description: 'Règlement intérieur, sanctions, exclusions, conseils de discipline et contrats',
    },
    {
      id: 'extracurricular',
      label: 'Activités parascolaires',
      icon: FiMap,
      color: 'from-teal-600 to-emerald-700',
      description: 'Clubs, sports, culture, sorties, voyages, inscriptions et calendrier des événements',
    },
    {
      id: 'orientation',
      label: 'Orientation',
      icon: FiNavigation,
      color: 'from-cptb-blue to-cptb-blue-dark',
      description: 'Filières, tests d’aptitude, conseils, partenariats, suivi des élèves, stages et apprentissages',
    },
    { id: 'calendar', label: 'Calendrier scolaire', icon: FiCalendar, color: 'from-orange-500 to-orange-600', description: 'Jours fériés, vacances, examens et réunions' },
    { id: 'communication', label: 'Communication', icon: FiBell, color: 'from-rose-500 to-rose-600', description: 'Messagerie, alertes, circulaires, actualités et demandes' },
    { id: 'library', label: 'Bibliothèque', icon: FiBookOpen, color: 'from-sky-600 to-cptb-blue', description: 'Catalogue, emprunts, réservations, pénalités et inventaire' },
    { id: 'health', label: 'Infirmerie & santé', icon: FiHeart, color: 'from-rose-500 to-pink-600', description: 'Dossiers médicaux, visites, campagnes sanitaires et urgences' },
    { id: 'elearning', label: 'E-learning', icon: FiMonitor, color: 'from-cptb-blue to-cptb-blue-mid', description: 'Plateforme d’apprentissage, classes virtuelles et ressources numériques' },
    { id: 'material', label: 'Gestion matérielle', icon: FiTool, color: 'from-slate-500 to-slate-700', description: 'Salles, inventaire, maintenance et allocations de matériel' },
    { id: 'reports', label: 'Rapports & statistiques', icon: FiPieChart, color: 'from-cyan-500 to-blue-700', description: 'Tableaux de bord, finances, académique, inscriptions et performances' },
    { id: 'analytics', label: 'Analytique avancée', icon: FiBarChart, color: 'from-emerald-500 to-emerald-600', description: 'Statistiques et analyses' },
    { id: 'schedule', label: 'Emploi du temps', icon: FiCalendar, color: 'from-orange-500 to-orange-600', description: 'Emplois du temps' },
    { id: 'pointage', label: 'Pointage des élèves', icon: FiUserCheck, color: 'from-emerald-500 to-emerald-600', description: 'Carte scolaire, empreinte digitale ou appel manuel' },
    { id: 'attendance', label: 'Gestion des présences', icon: FiCheckSquare, color: 'from-teal-500 to-cyan-600', description: 'Appel, absences, rapports d’assiduité et notifications aux parents' },
    { id: 'hr', label: 'Ressources humaines', icon: FiPackage, color: 'from-rose-500 to-pink-600', description: 'Contrats, paie mensuelle, avantages, évaluations et congés' },
    { id: 'training', label: 'Formation continue', icon: FiTrendingUp, color: 'from-indigo-500 to-violet-600', description: 'Formations des enseignants, organismes et volumes horaires' },
    { id: 'administrative', label: 'Gestion administrative', icon: FiBriefcase, color: 'from-teal-500 to-teal-600', description: 'Vue d’ensemble administrative' },
    { id: 'certificates', label: 'Certificats & attestations', icon: FiFileText, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Attestations de scolarité, fréquentation, radiation et réussite' },
    { id: 'admissions', label: 'Inscriptions & admissions', icon: FiUserPlus, color: 'from-cptb-blue to-cptb-blue-dark', description: 'Pré-inscriptions en ligne et finalisation des dossiers' },
    { id: 'fees', label: 'Gestion des frais', icon: FiCreditCard, color: 'from-teal-500 to-teal-600', description: 'Facturation, paiements, rappels, reçus et historique' },
    { id: 'tuition-fees', label: 'Frais de scolarité', icon: FiDollarSign, color: 'from-amber-500 to-amber-600', description: 'Frais de scolarité' },
    { id: 'scholarships', label: 'Bourses & aides', icon: FiGift, color: 'from-cptb-gold to-cptb-gold-dark', description: 'Remises fixes ou en pourcentage sur la facturation' },
    { id: 'payments', label: 'Paiements', icon: FiDollarSign, color: 'from-green-500 to-green-600', description: 'Paiements reçus' },
    {
      id: 'accounting',
      label: 'Comptabilité',
      icon: FiClipboard,
      color: 'from-slate-600 to-slate-800',
      description: 'Grand livre, journal, bilan simplifié, budget, dépenses, fournisseurs, petite caisse et exports',
    },
    { id: 'nfc-scanner', label: "Contrôle d'accès", icon: FiWifi, color: 'from-cyan-500 to-cyan-600', description: 'Badges, biométrie, entrées/sorties, visiteurs, CCTV et alarme' },
    { id: 'security', label: 'Sécurité & confidentialité', icon: FiShield, color: 'from-red-500 to-red-600', description: 'Sécurité et confidentialité' },
    { id: 'performance', label: 'Performance & rapidité', icon: FiZap, color: 'from-yellow-500 to-yellow-600', description: 'Performance et monitoring' },
    { id: 'settings', label: 'Paramètres', icon: FiSettings, color: 'from-gray-500 to-gray-600', description: 'Paramètres de l’établissement' },
    {
      id: 'integrations',
      label: 'Intégrations',
      icon: FiLink,
      color: 'from-teal-500 to-cyan-600',
      description: 'Connecter MENA, bornes NFC, paiements, WhatsApp et e-mail',
    },
  ];

  const { data: workspaceContext } = useQuery({
    queryKey: ['admin-workspace-context'],
    queryFn: () => adminApi.getAdminWorkspaceContext(),
    staleTime: 60_000,
  });

  const visibleModules = (workspaceContext as { visibleModules?: string[] } | undefined)?.visibleModules;
  const workspaceRestricted = (workspaceContext as { unrestricted?: boolean } | undefined)?.unrestricted === false;

  const effectiveVisibleModules = useMemo(() => {
    if (!visibleModules?.length) return visibleModules;
    const allowed = new Set(visibleModules);
    if (allowed.has('educators')) allowed.add('staff-personnel');
    return [...allowed];
  }, [visibleModules]);

  const personnelCategoryFilter = useMemo((): PersonnelCategoryFilter => {
    const p = searchParams?.get('personnel');
    if (p === 'educator') return 'EDUCATOR';
    if (p === 'staff') return 'STAFF';
    return 'all';
  }, [searchParams]);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const filteredTabs = useMemo(
    () =>
      filterTabsByVisibleModules(tabs, effectiveVisibleModules, {
        alwaysInclude: [
          ...(isSuperAdmin ? ['schools'] : []),
          'integrations',
          'settings',
        ],
      }),
    [tabs, effectiveVisibleModules, isSuperAdmin],
  );

  const mainTabs = filteredTabs.filter((t) => t.id !== 'activities' && t.id !== 'notifications');
  const bottomTabs = filteredTabs.filter((t) => t.id === 'activities' || t.id === 'notifications');
  const activeTabMeta = filteredTabs.find((t) => t.id === activeTab) ?? filteredTabs[0] ?? tabs[0];
  const ActiveTabIcon = activeTabMeta.icon;
  const quickActions = useMemo(
    () => [
      { label: 'Ajouter un élève', action: () => setIsAddStudentModalOpen(true) },
      { label: 'Créer une classe', action: () => setIsAddClassModalOpen(true) },
      { label: 'Ajouter un enseignant', action: () => setIsAddTeacherModalOpen(true) },
      { label: 'Exporter des données', action: () => setIsExportDataModalOpen(true) },
    ],
    []
  );

  useEffect(() => {
    if (!effectiveVisibleModules?.length) return;
    if (isSuperAdmin && activeTab === 'schools') return;
    const moduleId = activeTab === 'educators' ? 'staff-personnel' : activeTab;
    const allowed =
      effectiveVisibleModules.includes(moduleId) ||
      (activeTab === 'educators' && effectiveVisibleModules.includes('educators'));
    if (!isAdminModuleId(activeTab) && activeTab !== 'educators') return;
    if (!allowed) {
      setActiveTab('dashboard');
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set('tab', 'dashboard');
      params.delete('personnel');
      params.delete('action');
      router.replace(`/admin?${params.toString()}`);
    }
  }, [activeTab, effectiveVisibleModules, router, searchParams, isSuperAdmin]);

  const changeTab = (
    tabId: string,
    options?: {
      personnel?: 'educator' | 'staff';
      action?: 'add-educator';
      admissionsTab?: 'preinscriptions' | 'reenrollments';
    },
  ) => {
    const resolvedId = tabId === 'educators' ? 'staff-personnel' : tabId;
    setActiveTab(resolvedId);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', resolvedId);
    if (options?.personnel) {
      params.set('personnel', options.personnel);
    } else if (resolvedId !== 'staff-personnel') {
      params.delete('personnel');
    } else if (tabId === 'educators') {
      params.set('personnel', 'educator');
    }
    if (options?.action) {
      params.set('action', options.action);
    } else {
      params.delete('action');
    }
    if (options?.admissionsTab) {
      params.set('admissionsTab', options.admissionsTab);
    } else if (resolvedId !== 'admissions') {
      params.delete('admissionsTab');
    }
    router.replace(`/admin?${params.toString()}`);
  };

  return (
    <Layout
      user={user}
      onLogout={logout}
      role="ADMIN"
      hideHeader
    >
      <PremiumPortalShell variant="admin">
      <div className="flex min-w-0 max-w-full dash-min-h-under-header w-full items-stretch overflow-x-clip">
        <AdminSidebar
          mainTabs={mainTabs}
          bottomTabs={bottomTabs}
          activeTab={activeTab}
          onTabChange={changeTab}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((o) => !o)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        />

        <div className="flex min-w-0 max-w-full flex-1 flex-col">
          {activeTab === 'dashboard' ? null : (
          <header className="dash-command-bar z-20 shrink-0 bg-white">
            <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
              <button
                type="button"
                onClick={() => setSidebarOpen((o) => !o)}
                className="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl text-stone-700 hover:bg-stone-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 lg:hidden"
                aria-label="Ouvrir le menu de navigation"
              >
                <FiMenu className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSidebarCollapsed((c) => !c)}
                className="hidden min-h-10 min-w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200/90 bg-white p-2 text-stone-600 hover:bg-amber-50/40 lg:flex"
                aria-expanded={!sidebarCollapsed}
                aria-label={
                  sidebarCollapsed ? 'Développer le menu latéral' : 'Réduire le menu latéral'
                }
              >
                {sidebarCollapsed ? (
                  <FiChevronRight className="h-4 w-4" aria-hidden />
                ) : (
                  <FiChevronLeft className="h-4 w-4" aria-hidden />
                )}
              </button>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-800">
                {isMultiSchool && activeSchool ? activeSchool.name : activeTabMeta.label}
              </p>
              <div className="relative hidden w-44 shrink-0 md:block lg:w-64">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-400">
                  <FiSearch className="h-4 w-4" aria-hidden />
                </div>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
                    }
                  }}
                  placeholder="Rechercher…"
                  aria-label="Recherche globale, valider avec Entrée"
                  autoComplete="off"
                  className="dash-search-field w-full rounded-xl py-2 pl-10 pr-3 text-sm text-stone-900 placeholder:text-stone-400"
                />
              </div>
              <SchoolSwitcher className="hidden sm:flex" />
              <AccountHeaderControls
                user={user}
                role="ADMIN"
                onLogout={logout}
                onOpenSettings={() => {
                  setSettingsModalTab('school');
                  setIsSettingsModalOpen(true);
                }}
              />
            </div>
          </header>
          )}

          <main
            className={`dash-workspace flex-1 min-w-0 overflow-y-auto overflow-x-hidden scroll-smooth ${
              activeTab === 'dashboard'
                ? 'bg-white p-0'
                : 'px-2.5 sm:px-6 py-2.5 sm:py-6 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
            }`}
          >
            <div
              className={`${
                activeTab === 'dashboard'
                  ? 'max-w-none'
                  : 'max-w-[1240px] mx-auto space-y-5 sm:space-y-6'
              } min-w-0`}
            >
              {activeTab !== 'dashboard' ? (
              <PremiumModuleHeader
                title={activeTabMeta.label}
                description={activeTabMeta.description}
                icon={ActiveTabIcon}
                gradient={activeTabMeta.color}
                badge="Admin"
                actions={
                  <>
                    {quickActions.slice(0, 2).map((qa) => (
                      <button
                        key={qa.label}
                        type="button"
                        onClick={qa.action}
                        className="inline-flex w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-stone-900 to-stone-800 px-3 py-2 text-xs font-semibold text-amber-50 shadow-sm transition-colors hover:from-stone-800 hover:to-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 sm:w-auto sm:justify-start sm:py-1.5"
                      >
                        <span className="truncate">{qa.label}</span>
                        <FiArrowRight className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      </button>
                    ))}
                  </>
                }
              />
              ) : null}

              

              {workspaceRestricted && activeTab !== 'workspaces' ? (
                <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-950">
                  Votre accès est limité aux modules des espaces qui vous sont assignés. Gérez les attributions dans{' '}
                  <button
                    type="button"
                    className="font-semibold underline underline-offset-2"
                    onClick={() => changeTab('workspaces')}
                  >
                    Espaces & modules
                  </button>
                  .
                </div>
              ) : null}

              {activeTab === 'activities' ? (
                <AllActivities />
              ) : activeTab === 'notifications' ? (
                <AllNotifications />
              ) : activeTab === 'dashboard' && (
                <div className="min-h-full">
                  {isSuperAdmin ? (
                    <Card className="p-4 border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-orange-50/60">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold text-stone-900">Multi-établissements</h2>
                          <p className="text-sm text-stone-600 mt-1">
                            Créez un nouveau collège, gérez les slugs et les liens de pré-inscription publics.
                          </p>
                        </div>
                        <Button type="button" onClick={() => changeTab('schools')}>
                          <FiHome className="mr-2" />
                          Gérer les établissements
                        </Button>
                      </div>
                    </Card>
                  ) : null}
                  <AdminOpsDashboard
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    onNavigate={changeTab}
                    onExport={() => setIsExportDataModalOpen(true)}
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    avatar={user?.avatar}
                    roleLabel={user?.role === 'SUPER_ADMIN' ? 'Super administrateur' : 'Administrateur'}
                    user={user ?? undefined}
                    onLogout={logout}
                    onOpenSettings={() => {
                      setSettingsModalTab('school');
                      setIsSettingsModalOpen(true);
                    }}
                    onOpenSidebar={() => setSidebarOpen(true)}
                    modules={filteredTabs.filter((t) => t.id !== 'dashboard')}
                  />
                </div>
              )}
              {activeTab === 'students' && <StudentsList searchQuery={searchQuery} />}
              {activeTab === 'alumni' && <AlumniAdminModule />}
              {activeTab === 'academic' && <AcademicManagement />}
              {activeTab === 'grading' && <GradingEvaluationManagement />}
              {activeTab === 'exams' && <ExamsAdminModule />}
              {activeTab === 'classes' && <ClassesList searchQuery={searchQuery} />}
              {activeTab === 'teachers' && <TeachersList searchQuery={searchQuery} />}
              {activeTab === 'staff-personnel' && (
                <StaffPersonnelModule initialCategoryFilter={personnelCategoryFilter} />
              )}
              {activeTab === 'parent-guardians' && <ParentGuardiansModule />}
              {activeTab === 'management' && <CompleteManagement />}
              {activeTab === 'roles' && <MultiRolesManagement />}
              {activeTab === 'schools' && user?.role === 'SUPER_ADMIN' && <SchoolsManagementPanel />}
              {activeTab === 'workspaces' && <AdminWorkspacesPanel />}
              {activeTab === 'pedagogical' && <PedagogicalTracking />}
              {activeTab === 'discipline' && <DisciplineAdminModule />}
              {activeTab === 'extracurricular' && <ExtracurricularAdminModule />}
              {activeTab === 'campus' && (
                <div className="space-y-8">
                  <CampusServicesModule />
                  <SchoolOperationsHub />
                </div>
              )}
              {activeTab === 'orientation' && <OrientationAdminModule />}
              {activeTab === 'calendar' && <SchoolCalendarAdminModule />}
              {activeTab === 'communication' && <CommunicationHubModule />}
              {activeTab === 'library' && <LibraryManagementModule />}
              {activeTab === 'health' && <HealthManagementModule />}
              {activeTab === 'elearning' && <ElearningHub mode="admin" />}
              {activeTab === 'material' && <MaterialManagementModule />}
              {activeTab === 'reports' && <ReportsStatisticsModule />}
              {activeTab === 'analytics' && <AdvancedAnalytics />}
              {activeTab === 'schedule' && <ScheduleManagement />}
              {activeTab === 'pointage' && <PointageEleves />}
              {activeTab === 'attendance' && <AttendanceManagementModule />}
              {activeTab === 'hr' && <HRManagementModule />}
              {activeTab === 'training' && <TeacherTrainingAdminModule />}
              {activeTab === 'administrative' && <AdministrativeManagement />}
              {activeTab === 'certificates' && <CertificatesAdminModule />}
              {activeTab === 'admissions' && <AdmissionsManagementModule />}
              {activeTab === 'fees' && <FeesManagementModule />}
              {activeTab === 'tuition-fees' && <TuitionFeesManagement />}
              {activeTab === 'scholarships' && <ScholarshipsAdminModule />}
              {activeTab === 'payments' && <PaymentsManagement />}
              {activeTab === 'accounting' && <AccountingManagementModule />}
              {activeTab === 'nfc-scanner' && <AccessControlModule />}
              {activeTab === 'security' && <SecurityPrivacyManagement />}
              {activeTab === 'performance' && <PerformanceManagement />}
              {activeTab === 'integrations' && <IntegrationsSettingsPanel />}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  <Card variant="premium" className="bg-gradient-to-r from-slate-700 to-slate-800 text-white border-none">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-3xl font-black mb-2">Paramètres</h2>
                        <p className="text-gray-200 text-lg">
                          Configurez votre établissement scolaire
                        </p>
                      </div>
                      <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
                        <FiSettings className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  </Card>
                  
                  <AdminTabLogoCard
                    onOpenFullSettings={() => {
                      setSettingsModalTab('school');
                      setIsSettingsModalOpen(true);
                    }}
                  />

                  <Card variant="premium" className="border border-teal-200 bg-teal-50/40">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-2">
                      <div>
                        <h3 className="text-lg font-bold text-teal-950">Intégrations externes</h3>
                        <p className="text-sm text-teal-900/80">
                          Connecter MENA, bornes NFC, paiements, WhatsApp et e-mail sans fichier technique.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams?.toString() ?? '');
                          params.set('tab', 'integrations');
                          router.push(`/admin?${params.toString()}`);
                        }}
                        className="shrink-0 bg-teal-700 hover:bg-teal-800 text-white"
                      >
                        <FiLink className="w-4 h-4 mr-2" />
                        Ouvrir Intégrations
                      </Button>
                    </div>
                  </Card>

                  <Card variant="premium">
                    <div className="text-center py-12">
                      <FiSettings className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Gestion des Paramètres</h3>
                      <p className="text-gray-600 mb-6">
                        Accédez à tous les paramètres de configuration de votre établissement
                      </p>
                      <Button
                        onClick={() => {
                          setSettingsModalTab('school');
                          setIsSettingsModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-8 py-4 text-lg"
                      >
                        <FiSettings className="w-5 h-5 mr-2" />
                        Ouvrir les Paramètres
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddStudentModalOpen}
        onClose={() => setIsAddStudentModalOpen(false)}
      />
      <AddClassModal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
      />
      <AddTeacherModal
        isOpen={isAddTeacherModalOpen}
        onClose={() => setIsAddTeacherModalOpen(false)}
      />
      <GenerateReportModal
        isOpen={isGenerateReportModalOpen}
        onClose={() => setIsGenerateReportModalOpen(false)}
      />
      <ExportDataModal
        isOpen={isExportDataModalOpen}
        onClose={() => setIsExportDataModalOpen(false)}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen}
        initialTab={settingsModalTab}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      </PremiumPortalShell>
    </Layout>
  );
};

export default AdminDashboard;

