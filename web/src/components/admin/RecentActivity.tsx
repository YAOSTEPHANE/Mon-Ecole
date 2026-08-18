import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import SearchBar from '../ui/SearchBar';
import FilterDropdown from '../ui/FilterDropdown';
import {
  FiUserPlus,
  FiUserCheck,
  FiBook,
  FiClipboard,
  FiCalendar,
  FiAlertCircle,
  FiEye,
  FiDownload,
  FiRefreshCw,
  FiFilter,
  FiX,
  FiShield,
  FiLock,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiGlobe,
  FiTrendingUp,
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

type ActivityType = 'all' | 'login' | 'security' | 'student' | 'grade' | 'absence' | 'assignment' | 'class' | 'teacher';

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

const RecentActivity = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ActivityType>('all');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  // Fetch login logs
  const { data: loginLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['admin-login-logs'],
    queryFn: () => adminApi.getLoginLogs({ limit: 50 }),
    refetchInterval:
      autoRefresh && typeof document !== 'undefined' && document.visibilityState === 'visible'
        ? 60_000
        : false,
  });

  // Fetch security events
  const { data: securityEvents = [], refetch: refetchEvents } = useQuery({
    queryKey: ['admin-security-events'],
    queryFn: () => adminApi.getSecurityEvents({ limit: 50 }),
    refetchInterval:
      autoRefresh && typeof document !== 'undefined' && document.visibilityState === 'visible'
        ? 60_000
        : false,
  });

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
          ? `${log.user?.firstName || ''} ${log.user?.lastName || ''} s'est connecté`
          : `Tentative de connexion échouée pour ${log.email}`,
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
        activityType = 'student';
        activityTitle = 'Nouvel élève ajouté';
      } else if (event.type === 'teacher_added') {
        activityType = 'teacher';
        activityTitle = 'Nouvel enseignant ajouté';
      } else if (event.type === 'class_created') {
        activityType = 'class';
        activityTitle = 'Nouvelle classe créée';
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
    return allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);
  }, [loginLogs, securityEvents]);

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
          activity.user?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [activities, selectedType, searchQuery]);

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'login':
        return <FiUserCheck className="w-5 h-5" />;
      case 'security':
        return <FiShield className="w-5 h-5" />;
      case 'student':
        return <FiUserPlus className="w-5 h-5" />;
      case 'grade':
        return <FiClipboard className="w-5 h-5" />;
      case 'absence':
        return <FiAlertCircle className="w-5 h-5" />;
      case 'assignment':
        return <FiBook className="w-5 h-5" />;
      case 'class':
        return <FiCalendar className="w-5 h-5" />;
      case 'teacher':
        return <FiUserCheck className="w-5 h-5" />;
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
      case 'student':
        return 'from-blue-500 to-blue-600';
      case 'grade':
        return 'from-green-500 to-green-600';
      case 'absence':
        return 'from-orange-500 to-orange-600';
      case 'assignment':
        return 'from-purple-500 to-purple-600';
      case 'class':
        return 'from-indigo-500 to-indigo-600';
      case 'teacher':
        return 'from-teal-500 to-teal-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

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
        '# École à jour - Activité Récente\n' +
        `# Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}\n` +
        '#\n' +
        headers.join(';') +
        '\n' +
        filteredActivities
          .map((activity) =>
            [
              activity.type,
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
      link.setAttribute('download', `activite-recente-${format(new Date(), 'yyyy-MM-dd')}.csv`);
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
        application: 'École à jour',
        logo: 'SM',
        dateExport: format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr }),
        total: filteredActivities.length,
        activités: filteredActivities.map((activity) => ({
          type: activity.type,
          titre: activity.title,
          description: activity.description,
          utilisateur: activity.user || null,
          date: format(activity.timestamp, 'dd/MM/yyyy à HH:mm', { locale: fr }),
          adresseIP: activity.ipAddress || null,
        })),
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `activite-recente-${format(new Date(), 'yyyy-MM-dd')}.json`);
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
      doc.text('École à jour', 60, 18);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('Activité Récente', 60, 25);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 60, 30);

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
        activity.type,
        activity.title.substring(0, 30) + (activity.title.length > 30 ? '...' : ''),
        activity.description.substring(0, 40) + (activity.description.length > 40 ? '...' : ''),
        activity.user?.substring(0, 20) || 'N/A',
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

      doc.save(`activite-recente-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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

  return (
    <>
      <Card className="relative overflow-visible group perspective-1000">
        {/* Effets de fond (contenus pour ne pas couper les menus déroulants) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
              transform: 'translateZ(-30px)',
              filter: 'blur(30px)',
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <h3 className="text-xl font-bold text-gray-900">Activité Récente</h3>
              <Badge variant="info" size="sm" className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                {filteredActivities.length} activités
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                className="flex items-center space-x-2"
              >
                <FiRefreshCw className="w-4 h-4" />
              </Button>
              <div className="relative" ref={exportMenuRef}>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center space-x-2"
                >
                  <FiDownload className="w-4 h-4" />
                  <span>Exporter</span>
                </Button>
                {isExportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    <button
                      onClick={exportToCSV}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Export CSV</span>
                    </button>
                    <button
                      onClick={exportToJSON}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Export JSON</span>
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Export PDF</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Rechercher une activité..."
              />
            </div>
            <FilterDropdown
              label="Type"
              selected={selectedType}
              onChange={(value) => setSelectedType(value as ActivityType)}
              options={[
                { value: 'all', label: 'Toutes' },
                { value: 'login', label: 'Connexions' },
                { value: 'security', label: 'Sécurité' },
                { value: 'student', label: 'Élèves' },
                { value: 'grade', label: 'Notes' },
                { value: 'absence', label: 'Absences' },
                { value: 'assignment', label: 'Devoirs' },
                { value: 'class', label: 'Classes' },
                { value: 'teacher', label: 'Enseignants' },
              ]}
            />
          </div>

          {/* Active filters */}
          {(selectedType !== 'all' || searchQuery) && (
            <div className="mb-4 flex flex-wrap gap-2">
              {selectedType !== 'all' && (
                <Badge className="bg-blue-100 text-blue-800 flex items-center space-x-1">
                  <FiFilter className="w-3 h-3" />
                  <span>Type: {selectedType}</span>
                  <button
                    onClick={() => setSelectedType('all')}
                    className="ml-1 hover:text-blue-900"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {searchQuery && (
                <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
                  <span>Recherche: "{searchQuery}"</span>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-green-900"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Activities List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12">
                <FiTrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Aucune activité trouvée</p>
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-all duration-300 border-l-4 border-transparent hover:border-blue-500 group cursor-pointer transform hover:scale-[1.02] hover:shadow-md"
                  onClick={() => {
                    setSelectedActivity(activity);
                    setIsDetailsModalOpen(true);
                  }}
                >
                  <div
                    className={`w-12 h-12 rounded-lg bg-gradient-to-br ${getActivityColor(
                      activity.type,
                      activity.severity,
                      activity.success
                    )} flex items-center justify-center text-white flex-shrink-0 shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}
                  >
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-semibold text-gray-900">{activity.title}</p>
                          {activity.severity && (
                            <Badge
                              className={`${
                                activity.severity === 'critical'
                                  ? 'bg-red-100 text-red-800'
                                  : activity.severity === 'error'
                                  ? 'bg-orange-100 text-orange-800'
                                  : activity.severity === 'warning'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {activity.severity}
                            </Badge>
                          )}
                          {activity.success !== undefined && (
                            <Badge
                              className={activity.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            >
                              {activity.success ? (
                                <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                              ) : (
                                <FiXCircle className="w-3 h-3 mr-1 inline" />
                              )}
                              {activity.success ? 'Réussi' : 'Échoué'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <FiClock className="w-3 h-3" />
                            <span>
                              {formatDistanceToNow(activity.timestamp, {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                          </span>
                          {activity.user && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center space-x-1">
                                <FiUser className="w-3 h-3" />
                                <span>{activity.user}</span>
                              </span>
                            </>
                          )}
                          {activity.ipAddress && (
                            <>
                              <span className="text-gray-300">•</span>
                              <span className="flex items-center space-x-1">
                                <FiGlobe className="w-3 h-3" />
                                <span>{activity.ipAddress}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedActivity(activity);
                          setIsDetailsModalOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Voir les détails"
                      >
                        <FiEye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => router.push('/admin/activities')}
              className="w-full text-center text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors hover:underline flex items-center justify-center space-x-2"
            >
              <span>Voir toutes les activités</span>
              <FiTrendingUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedActivity(null);
        }}
        title="Détails de l'Activité"
      >
        {selectedActivity && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Type</p>
                <p className="font-semibold text-gray-800">{selectedActivity.type}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Titre</p>
                <p className="font-semibold text-gray-800">{selectedActivity.title}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg col-span-2">
                <p className="text-sm text-gray-600 mb-1">Description</p>
                <p className="font-semibold text-gray-800">{selectedActivity.description}</p>
              </div>
              {selectedActivity.user && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Utilisateur</p>
                  <p className="font-semibold text-gray-800">{selectedActivity.user}</p>
                </div>
              )}
              {selectedActivity.ipAddress && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Adresse IP</p>
                  <p className="font-semibold text-gray-800">{selectedActivity.ipAddress}</p>
                </div>
              )}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Date</p>
                <p className="font-semibold text-gray-800">
                  {format(selectedActivity.timestamp, 'dd/MM/yyyy à HH:mm:ss', { locale: fr })}
                </p>
              </div>
              {selectedActivity.severity && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Sévérité</p>
                  <Badge
                    className={`${
                      selectedActivity.severity === 'critical'
                        ? 'bg-red-100 text-red-800'
                        : selectedActivity.severity === 'error'
                        ? 'bg-orange-100 text-orange-800'
                        : selectedActivity.severity === 'warning'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedActivity.severity}
                  </Badge>
                </div>
              )}
            </div>
            {selectedActivity.details && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Informations détaillées</p>
                <pre className="text-xs text-gray-700 overflow-auto max-h-40">
                  {JSON.stringify(selectedActivity.details, null, 2)}
                </pre>
              </div>
            )}
            <div className="flex justify-end pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedActivity(null);
                }}
              >
                Fermer
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default RecentActivity;
