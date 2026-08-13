import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import SearchBar from '../../components/ui/SearchBar';
import FilterDropdown from '../../components/ui/FilterDropdown';
import {
  FiUserPlus,
  FiUserCheck,
  FiBook,
  FiClipboard,
  FiCalendar,
  FiAlertCircle,
  FiArrowLeft,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiClock,
  FiUser,
  FiX,
  FiTrendingUp,
  FiEye,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiGlobe,
} from 'react-icons/fi';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';
import toast from 'react-hot-toast';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type ActivityType = 'all' | 'login' | 'security' | 'student_added' | 'grade_added' | 'absence_recorded' | 'assignment_created' | 'class_created' | 'teacher_added' | 'user_updated' | 'report_generated';

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
  details?: any;
  severity?: string;
  ipAddress?: string;
  success?: boolean;
}

const AllActivities = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ActivityType>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const itemsPerPage = 20;
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Fetch login logs
  const { data: loginLogs = [], refetch: refetchLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['admin-login-logs'],
    queryFn: () => adminApi.getLoginLogs({ limit: 200 }),
  });

  // Fetch security events
  const { data: securityEvents = [], refetch: refetchEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['admin-security-events'],
    queryFn: () => adminApi.getSecurityEvents({ limit: 200 }),
  });

  const isLoading = isLoadingLogs || isLoadingEvents;

  // Combine and transform data into activities
  const activities: Activity[] = useMemo(() => {
    const allActivities: Activity[] = [];

    // Transform login logs
    loginLogs.forEach((log: any) => {
      allActivities.push({
        id: `login-${log.id}`,
        type: 'login',
        title: log.success ? 'Connexion réussie' : 'Tentative de connexion échouée',
        description: log.success
          ? `${log.user?.firstName || ''} ${log.user?.lastName || ''} s'est connecté avec succès`
          : `Tentative de connexion échouée pour ${log.email}${log.reason ? ` - ${log.reason}` : ''}`,
        timestamp: new Date(log.createdAt),
        user: log.user ? `${log.user.firstName} ${log.user.lastName}` : log.email,
        details: log,
        success: log.success,
        ipAddress: log.ipAddress,
      });
    });

    // Transform security events
    securityEvents.forEach((event: any) => {
      // Détecter les types d'événements spécifiques pour les mapper correctement
      let activityType: ActivityType = 'security';
      let activityTitle = event.type;
      
      if (event.type === 'student_added') {
        activityType = 'student_added';
        activityTitle = 'Nouvel élève ajouté';
      } else if (event.type === 'teacher_added') {
        activityType = 'teacher_added';
        activityTitle = 'Nouvel enseignant ajouté';
      } else if (event.type === 'class_created') {
        activityType = 'class_created';
        activityTitle = 'Nouvelle classe créée';
      } else if (event.type === 'user_updated') {
        activityType = 'user_updated';
        activityTitle = 'Utilisateur modifié';
      }
      
      allActivities.push({
        id: `security-${event.id}`,
        type: activityType,
        title: activityTitle,
        description: event.description,
        timestamp: new Date(event.createdAt),
        user: event.user?.email,
        details: event,
        severity: event.severity,
        ipAddress: event.ipAddress,
      });
    });

    // Sort by timestamp (newest first)
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [loginLogs, securityEvents]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'login':
        return <FiUserCheck className="w-5 h-5" />;
      case 'security':
        return <FiShield className="w-5 h-5" />;
      case 'student_added':
        return <FiUserPlus className="w-5 h-5" />;
      case 'grade_added':
        return <FiClipboard className="w-5 h-5" />;
      case 'absence_recorded':
        return <FiAlertCircle className="w-5 h-5" />;
      case 'assignment_created':
        return <FiBook className="w-5 h-5" />;
      case 'class_created':
        return <FiCalendar className="w-5 h-5" />;
      case 'teacher_added':
        return <FiUserCheck className="w-5 h-5" />;
      case 'user_updated':
        return <FiUser className="w-5 h-5" />;
      case 'report_generated':
        return <FiClipboard className="w-5 h-5" />;
      default:
        return <FiUserCheck className="w-5 h-5" />;
    }
  };

  const getActivityColor = (type: ActivityType, severity?: string, success?: boolean) => {
    if (type === 'login') {
      return success ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600';
    }
    if (type === 'security') {
      switch (severity) {
        case 'critical':
          return 'from-red-500 to-red-600';
        case 'error':
          return 'from-orange-500 to-orange-600';
        case 'warning':
          return 'from-yellow-500 to-yellow-600';
        default:
          return 'from-blue-500 to-blue-600';
      }
    }
    switch (type) {
      case 'student_added':
        return 'from-blue-500 to-blue-600';
      case 'grade_added':
        return 'from-green-500 to-green-600';
      case 'absence_recorded':
        return 'from-orange-500 to-orange-600';
      case 'assignment_created':
        return 'from-purple-500 to-purple-600';
      case 'class_created':
        return 'from-cptb-blue to-cptb-blue-dark';
      case 'teacher_added':
        return 'from-teal-500 to-teal-600';
      case 'user_updated':
        return 'from-pink-500 to-pink-600';
      case 'report_generated':
        return 'from-yellow-500 to-yellow-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const getActivityTypeLabel = (type: ActivityType) => {
    const labels: Record<ActivityType, string> = {
      all: 'Toutes',
      login: 'Connexions',
      security: 'Sécurité',
      student_added: 'Élève ajouté',
      grade_added: 'Note ajoutée',
      absence_recorded: 'Absence enregistrée',
      assignment_created: 'Devoir créé',
      class_created: 'Classe créée',
      teacher_added: 'Enseignant ajouté',
      user_updated: 'Utilisateur modifié',
      report_generated: 'Rapport généré',
    };
    return labels[type] || type;
  };

  // Filter activities
  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((activity) => activity.type === selectedType);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (activity) =>
          activity.title.toLowerCase().includes(query) ||
          activity.description.toLowerCase().includes(query) ||
          activity.user?.toLowerCase().includes(query) ||
          activity.ipAddress?.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (selectedDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();

      switch (selectedDateRange) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((activity) => activity.timestamp >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((activity) => activity.timestamp >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((activity) => activity.timestamp >= filterDate);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter((activity) => activity.timestamp >= filterDate);
          break;
      }
    }

    // Sort by timestamp (newest first)
    return filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities, selectedType, searchQuery, selectedDateRange]);

  // Pagination
  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const activityTypeOptions = [
    { value: 'all', label: 'Toutes les activités' },
    { value: 'login', label: 'Connexions' },
    { value: 'security', label: 'Sécurité' },
    { value: 'student_added', label: 'Élève ajouté' },
    { value: 'grade_added', label: 'Note ajoutée' },
    { value: 'absence_recorded', label: 'Absence enregistrée' },
    { value: 'assignment_created', label: 'Devoir créé' },
    { value: 'class_created', label: 'Classe créée' },
    { value: 'teacher_added', label: 'Enseignant ajouté' },
    { value: 'user_updated', label: 'Utilisateur modifié' },
    { value: 'report_generated', label: 'Rapport généré' },
  ];

  const dateRangeOptions = [
    { value: 'all', label: 'Toutes les dates' },
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: '7 derniers jours' },
    { value: 'month', label: '30 derniers jours' },
    { value: 'year', label: 'Cette année' },
  ];

  const handleRefresh = () => {
    refetchLogs();
    refetchEvents();
    toast.success('Activités actualisées');
  };

  // Export functions
  const exportToCSV = () => {
    try {
      const headers = ['Type', 'Titre', 'Description', 'Utilisateur', 'Date', 'Adresse IP'];
      const csvContent =
        '\ufeff' +
        '# School Manager - Toutes les Activités\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        headers.join(';') +
        '\n' +
        filteredActivities
          .map((activity) =>
            [
              getActivityTypeLabel(activity.type),
              activity.title,
              activity.description,
              activity.user || 'N/A',
              format(activity.timestamp, 'dd/MM/yyyy à HH:mm', { locale: fr }),
              activity.ipAddress || 'N/A',
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `toutes-activites-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export CSV réussi !');
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportToJSON = () => {
    try {
      const jsonData = {
        application: 'School Manager',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: filteredActivities.length,
        activités: filteredActivities.map((activity) => ({
          type: getActivityTypeLabel(activity.type),
          titre: activity.title,
          description: activity.description,
          utilisateur: activity.user || null,
          date: format(activity.timestamp, 'dd/MM/yyyy à HH:mm', { locale: fr }),
          adresseIP: activity.ipAddress || null,
          sévérité: activity.severity || null,
          statut: activity.success !== undefined ? (activity.success ? 'Réussi' : 'Échoué') : null,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `toutes-activites-${format(new Date(), 'yyyy-MM-dd')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export JSON réussi !');
      setIsExportMenuOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');

      // Logo textuel stylisé
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(14, 10, 40, 12, 3, 3, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('SM', 34, 18, { align: 'center' });

      // Titre
      doc.setTextColor(59, 130, 246);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('School Manager', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Toutes les Activités', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate} - Total: ${filteredActivities.length} activités`, 60, 30);

      const useAutoTable = (options: any) => {
        if (typeof (doc as any).autoTable === 'function') {
          (doc as any).autoTable(options);
        } else if (typeof autoTable === 'function') {
          autoTable(doc, options);
        } else {
          throw new Error('autoTable is not available');
        }
      };

      const tableData = filteredActivities.map((activity) => [
        getActivityTypeLabel(activity.type),
        activity.title.substring(0, 25) + (activity.title.length > 25 ? '...' : ''),
        activity.description.substring(0, 35) + (activity.description.length > 35 ? '...' : ''),
        activity.user?.substring(0, 18) || 'N/A',
        format(activity.timestamp, 'dd/MM/yyyy HH:mm', { locale: fr }),
      ]);

      useAutoTable({
        startY: 38,
        head: [['Type', 'Titre', 'Description', 'Utilisateur', 'Date']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 7, cellPadding: 2 },
        margin: { left: 14, right: 14 },
      });

      doc.save(`toutes-activites-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Export PDF réussi !');
      setIsExportMenuOpen(false);
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const todayCount = useMemo(
    () =>
      filteredActivities.filter(
        (a) => format(a.timestamp, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
      ).length,
    [filteredActivities]
  );
  const weekAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);
  const weekCount = useMemo(
    () => filteredActivities.filter((a) => a.timestamp >= weekAgo).length,
    [filteredActivities, weekAgo]
  );

  return (
    <>
      <div className="space-y-6">
        {/* En-tête */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Activités</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Historique des connexions et événements du système
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              <FiRefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <div className="relative" ref={exportMenuRef}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              >
                <FiDownload className="w-4 h-4 mr-2" />
                Exporter
              </Button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                  <button
                    onClick={exportToCSV}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" /> CSV
                  </button>
                  <button
                    onClick={exportToJSON}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" /> JSON
                  </button>
                  <button
                    onClick={exportToPDF}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <FiDownload className="w-4 h-4" /> PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Recherche</label>
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Titre, utilisateur, IP..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
              <FilterDropdown
                options={activityTypeOptions}
                selected={selectedType}
                onChange={(value) => {
                  setSelectedType(value as ActivityType);
                  setCurrentPage(1);
                }}
                label="Type"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Période</label>
              <FilterDropdown
                options={dateRangeOptions}
                selected={selectedDateRange}
                onChange={(value) => {
                  setSelectedDateRange(value);
                  setCurrentPage(1);
                }}
                label="Période"
              />
            </div>
          </div>
          {(selectedType !== 'all' || selectedDateRange !== 'all' || searchQuery) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
              {selectedType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium">
                  {getActivityTypeLabel(selectedType)}
                  <button type="button" onClick={() => setSelectedType('all')} className="hover:text-indigo-900" title="Retirer le filtre type" aria-label="Retirer le filtre type">
                    <FiX className="w-3 h-3" aria-hidden />
                  </button>
                </span>
              )}
              {selectedDateRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                  {dateRangeOptions.find((o) => o.value === selectedDateRange)?.label}
                  <button type="button" onClick={() => setSelectedDateRange('all')} className="hover:text-gray-900" title="Retirer le filtre période" aria-label="Retirer le filtre période">
                    <FiX className="w-3 h-3" aria-hidden />
                  </button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                  « {searchQuery} »
                  <button type="button" onClick={() => setSearchQuery('')} className="hover:text-gray-900" title="Effacer la recherche" aria-label="Effacer la recherche">
                    <FiX className="w-3 h-3" aria-hidden />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedType('all');
                  setSelectedDateRange('all');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Tout effacer
              </button>
            </div>
          )}
        </Card>

        {/* Indicateurs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Total</p>
                <p className="text-xl font-bold text-gray-900">{filteredActivities.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50">
                <FiTrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Aujourd'hui</p>
                <p className="text-xl font-bold text-gray-900">{todayCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50">
                <FiClock className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">7 derniers jours</p>
                <p className="text-xl font-bold text-gray-900">{weekCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-violet-50">
                <FiCalendar className="w-5 h-5 text-violet-600" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">Types</p>
                <p className="text-xl font-bold text-gray-900">
                  {new Set(filteredActivities.map((a) => a.type)).size}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50">
                <FiFilter className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Liste des activités */}
        <Card className="overflow-hidden">
          <div>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-4 text-gray-600">Chargement des activités...</p>
              </div>
            ) : paginatedActivities.length === 0 ? (
              <div className="text-center py-12">
                <FiTrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">Aucune activité trouvée</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedType !== 'all' || selectedDateRange !== 'all'
                    ? 'Essayez de modifier vos filtres de recherche'
                    : "Aucune activité n'a été enregistrée pour le moment"}
                </p>
                {(searchQuery || selectedType !== 'all' || selectedDateRange !== 'all') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSelectedType('all');
                      setSelectedDateRange('all');
                      setSearchQuery('');
                      setCurrentPage(1);
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {paginatedActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedActivity(activity);
                        setIsDetailsModalOpen(true);
                      }}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getActivityColor(
                          activity.type,
                          activity.severity,
                          activity.success
                        )} flex items-center justify-center text-white flex-shrink-0`}
                      >
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900">{activity.title}</p>
                              <Badge variant="secondary" className="text-xs">
                                {getActivityTypeLabel(activity.type)}
                              </Badge>
                              {activity.severity && (
                                <Badge
                                  className={
                                    activity.severity === 'critical'
                                      ? 'bg-red-100 text-red-800'
                                      : activity.severity === 'error'
                                      ? 'bg-orange-100 text-orange-800'
                                      : activity.severity === 'warning'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }
                                >
                                  {activity.severity}
                                </Badge>
                              )}
                              {activity.success !== undefined && (
                                <Badge
                                  className={activity.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                                >
                                  {activity.success ? <FiCheckCircle className="w-3 h-3 mr-1 inline" /> : <FiXCircle className="w-3 h-3 mr-1 inline" />}
                                  {activity.success ? 'Réussi' : 'Échoué'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <FiClock className="w-3.5 h-3.5" />
                                {formatDistanceToNow(activity.timestamp, { addSuffix: true, locale: fr })}
                              </span>
                              <span>{format(activity.timestamp, 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                              {activity.user && (
                                <span className="flex items-center gap-1">
                                  <FiUser className="w-3.5 h-3.5" />
                                  {activity.user}
                                </span>
                              )}
                              {activity.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <FiGlobe className="w-3.5 h-3.5" />
                                  {activity.ipAddress}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedActivity(activity);
                              setIsDetailsModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Voir les détails"
                          >
                            <FiEye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between flex-wrap gap-4">
                    <p className="text-sm text-gray-600">
                      Affichage de {(currentPage - 1) * itemsPerPage + 1} à{' '}
                      {Math.min(currentPage * itemsPerPage, filteredActivities.length)} sur{' '}
                      {filteredActivities.length} activités
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        size="sm"
                      >
                        Précédent
                      </Button>
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 1 && page <= currentPage + 1)
                          )
                          .map((page, index, array) => (
                            <div key={page} className="flex items-center">
                              {index > 0 && array[index - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {page}
                              </button>
                            </div>
                          ))}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        size="sm"
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Modal Détails */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedActivity(null);
        }}
        title="Détails de l'activité"
      >
        {selectedActivity && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Type</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{getActivityTypeLabel(selectedActivity.type)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase">Date</dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {format(selectedActivity.timestamp, 'dd/MM/yyyy à HH:mm:ss', { locale: fr })}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Titre</dt>
                <dd className="mt-0.5 font-medium text-gray-900">{selectedActivity.title}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase">Description</dt>
                <dd className="mt-0.5 text-gray-700">{selectedActivity.description}</dd>
              </div>
              {selectedActivity.user && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Utilisateur</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">{selectedActivity.user}</dd>
                </div>
              )}
              {selectedActivity.ipAddress && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Adresse IP</dt>
                  <dd className="mt-0.5 font-mono text-sm text-gray-900">{selectedActivity.ipAddress}</dd>
                </div>
              )}
              {selectedActivity.severity && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Sévérité</dt>
                  <dd className="mt-0.5">
                    <Badge
                      variant={
                        selectedActivity.severity === 'critical'
                          ? 'danger'
                          : selectedActivity.severity === 'error'
                            ? 'warning'
                            : 'info'
                      }
                      size="sm"
                    >
                      {selectedActivity.severity}
                    </Badge>
                  </dd>
                </div>
              )}
              {selectedActivity.success !== undefined && (
                <div>
                  <dt className="text-xs font-medium text-gray-500 uppercase">Statut</dt>
                  <dd className="mt-0.5">
                    <Badge variant={selectedActivity.success ? 'success' : 'danger'} size="sm">
                      {selectedActivity.success ? (
                        <><FiCheckCircle className="w-3 h-3 mr-1 inline" /> Réussi</>
                      ) : (
                        <><FiXCircle className="w-3 h-3 mr-1 inline" /> Échoué</>
                      )}
                    </Badge>
                  </dd>
                </div>
              )}
            </dl>
            {selectedActivity.details && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Données brutes</p>
                <pre className="text-xs text-gray-600 overflow-auto max-h-48 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  {JSON.stringify(selectedActivity.details, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => { setIsDetailsModalOpen(false); setSelectedActivity(null); }}>
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default AllActivities;
