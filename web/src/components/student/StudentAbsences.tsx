import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ImageUpload from '../ui/ImageUpload';
import { FiCalendar, FiBook, FiAlertCircle, FiCheckCircle, FiClock, FiFilter, FiUpload, FiFile } from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AbsencePermissionRequestsPanel from '../attendance/AbsencePermissionRequestsPanel';

type StudentAbsencesProps = {
  searchQuery?: string;
  searchDateRange?: 'all' | 'week' | 'month' | 'semester';
};

const StudentAbsences = ({
  searchQuery = '',
  searchDateRange = 'all',
}: StudentAbsencesProps) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'excused' | 'unexcused'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'all' | 'week' | 'month' | 'semester'>('all');
  const [selectedAbsence, setSelectedAbsence] = useState<any>(null);
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [justificationReason, setJustificationReason] = useState('');
  const queryClient = useQueryClient();

  const { data: absences, isLoading } = useQuery({
    queryKey: ['student-absences'],
    queryFn: () => studentApi.getAbsences(),
  });

  const justifyAbsenceMutation = useMutation({
    mutationFn: ({ absenceId, documentUrl, reason }: { absenceId: string; documentUrl: string; reason?: string }) =>
      studentApi.justifyAbsence(absenceId, documentUrl, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-absences'] });
      toast.success('Justificatif soumis avec succès');
      setShowJustifyModal(false);
      setSelectedAbsence(null);
      setJustificationReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la soumission du justificatif');
    },
  });

  const handleJustify = (documentUrl: string) => {
    if (selectedAbsence) {
      justifyAbsenceMutation.mutate({
        absenceId: selectedAbsence.id,
        documentUrl,
        reason: justificationReason || undefined,
      });
    }
  };

  const effectivePeriod =
    filterPeriod !== 'all' ? filterPeriod : searchDateRange !== 'all' ? searchDateRange : 'all';

  const filteredAbsences = useMemo(() => {
    if (!absences) return [];

    let filtered = absences.filter((absence: any) => {
      // Recherche par texte
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const courseName = absence.course?.name?.toLowerCase() || '';
        const dateStr = format(new Date(absence.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase();
        if (!courseName.includes(query) && !dateStr.includes(query)) {
          return false;
        }
      }

      // Filtre par statut
      if (filterStatus === 'excused' && !absence.excused) return false;
      if (filterStatus === 'unexcused' && absence.excused) return false;

      // Filtre par période (barre latérale ou filtres du header élève)
      const absenceDate = new Date(absence.date);
      const now = new Date();
      if (effectivePeriod === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (absenceDate < weekAgo) return false;
      } else if (effectivePeriod === 'month') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (absenceDate < monthAgo) return false;
      } else if (effectivePeriod === 'semester') {
        const semesterAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        if (absenceDate < semesterAgo) return false;
      }

      return true;
    });

    return filtered.sort((a: any, b: any) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [absences, searchQuery, filterStatus, effectivePeriod]);

  const stats = useMemo(() => {
    if (!absences) return { total: 0, excused: 0, unexcused: 0, thisMonth: 0 };
    
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    return {
      total: absences.length,
      excused: absences.filter((a: any) => a.excused).length,
      unexcused: absences.filter((a: any) => !a.excused).length,
      thisMonth: absences.filter((a: any) => new Date(a.date) >= monthAgo).length,
    };
  }, [absences]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          <p className="mt-4 text-gray-600">Chargement des absences...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <AbsencePermissionRequestsPanel
        mode="student"
        queryKey={['student-absence-permission-requests']}
        fetchRequests={studentApi.getAbsencePermissionRequests}
        createRequest={studentApi.createAbsencePermissionRequest}
        cancelRequest={studentApi.cancelAbsencePermissionRequest}
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card 
          className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
          style={{
            transform: 'translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white transform rotate-3 hover:rotate-6 transition-transform"
                style={{
                  boxShadow: '0 4px 12px rgba(147, 51, 234, 0.3)',
                }}
              >
                <FiCalendar className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-1">Absences enregistrées</p>
          </div>
        </Card>

        <Card 
          className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
          style={{
            transform: 'translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Justifiées</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white transform rotate-3 hover:rotate-6 transition-transform"
                style={{
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}
              >
                <FiCheckCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.excused}</p>
            <p className="text-xs text-gray-500 mt-1">Justifiées</p>
          </div>
        </Card>

        <Card 
          className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
          style={{
            transform: 'translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50 to-orange-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Non justifiées</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white transform rotate-3 hover:rotate-6 transition-transform"
                style={{
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)',
                }}
              >
                <FiAlertCircle className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.unexcused}</p>
            <p className="text-xs text-gray-500 mt-1">À justifier</p>
          </div>
        </Card>

        <Card 
          className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl"
          style={{
            transform: 'translateZ(0)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Ce mois</p>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white transform rotate-3 hover:rotate-6 transition-transform"
                style={{
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                }}
              >
                <FiClock className="w-6 h-6" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stats.thisMonth}</p>
            <p className="text-xs text-gray-500 mt-1">Derniers 30 jours</p>
          </div>
        </Card>
      </div>

      {/* Filtres */}
      <Card 
        className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300"
        style={{
          transform: 'translateZ(0)',
          transformStyle: 'preserve-3d',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10 flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FiFilter className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-semibold text-gray-700">Filtres :</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Statut :</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <option value="all">Tous</option>
              <option value="excused">Justifiées</option>
              <option value="unexcused">Non justifiées</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Période :</label>
            <select
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value as any)}
              className="px-4 py-2 bg-white border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <option value="all">Toutes</option>
              <option value="week">7 derniers jours</option>
              <option value="month">30 derniers jours</option>
              <option value="semester">6 derniers mois</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Liste des absences */}
      {filteredAbsences.length > 0 ? (
        <div className="space-y-4">
          {filteredAbsences.map((absence: any) => {
            const isExcused = absence.excused;
            const absenceDate = new Date(absence.date);
            const isRecent = new Date().getTime() - absenceDate.getTime() < 7 * 24 * 60 * 60 * 1000;

            return (
              <Card 
                key={absence.id}
                className="relative overflow-hidden group perspective-3d transform-gpu transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]"
                style={{
                  transform: 'translateZ(0)',
                  transformStyle: 'preserve-3d',
                  borderLeft: `4px solid ${isExcused ? '#10b981' : '#ef4444'}`,
                }}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
                  isExcused 
                    ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-green-100' 
                    : 'bg-gradient-to-br from-red-50 via-orange-50 to-red-100'
                }`}></div>
                
                <div 
                  className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `radial-gradient(ellipse at center, ${isExcused ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'} 0%, transparent 70%)`,
                    transform: 'translateZ(-30px)',
                    filter: 'blur(30px)',
                  }}
                ></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-white transform rotate-3 group-hover:rotate-6 transition-transform ${
                      isExcused 
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                        : 'bg-gradient-to-br from-red-500 to-orange-500'
                    }`}
                    style={{
                      boxShadow: `0 4px 12px ${isExcused ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                    }}
                    >
                      {isExcused ? (
                        <FiCheckCircle className="w-8 h-8" />
                      ) : (
                        <FiAlertCircle className="w-8 h-8" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 
                          className="font-bold text-lg text-gray-900 relative"
                          style={{
                            textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                            transform: 'translateZ(5px)',
                          }}
                        >
                          {absence.course?.name || 'Cours non spécifié'}
                        </h3>
                        {isRecent && (
                          <Badge variant="warning" size="sm">Récent</Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <FiCalendar className="w-4 h-4" />
                          <span className="font-medium">
                            {format(absenceDate, 'EEEE d MMMM yyyy', { locale: fr })}
                          </span>
                        </div>
                        {absence.teacher && (
                          <div className="flex items-center space-x-1">
                            <FiBook className="w-4 h-4" />
                            <span>
                              {absence.teacher.user?.firstName} {absence.teacher.user?.lastName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Badge 
                      variant={isExcused ? 'success' : 'danger'} 
                      size="md"
                      className="transform-gpu transition-transform duration-300 hover:scale-110"
                      style={{
                        boxShadow: `0 2px 8px ${isExcused ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      {isExcused ? 'Justifiée' : 'Non justifiée'}
                    </Badge>
                    {!isExcused && (
                      <Button
                        onClick={() => {
                          setSelectedAbsence(absence);
                          setShowJustifyModal(true);
                        }}
                        variant="secondary"
                        size="sm"
                        className="transform-gpu transition-transform duration-300 hover:scale-105"
                      >
                        <FiUpload className="w-4 h-4 mr-2" />
                        Justifier
                      </Button>
                    )}
                  </div>
                </div>

                {/* Justificatifs existants */}
                {absence.justificationDocuments && absence.justificationDocuments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Justificatifs soumis :</p>
                    <div className="flex flex-wrap gap-2">
                      {absence.justificationDocuments.map((docUrl: string, idx: number) => (
                        <a
                          key={idx}
                          href={docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm text-blue-700 transition-colors border border-blue-200"
                        >
                          <FiFile className="w-4 h-4" />
                          <span>Justificatif {idx + 1}</span>
                        </a>
                      ))}
                    </div>
                    {absence.justificationSubmittedAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Soumis le {format(new Date(absence.justificationSubmittedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                      </p>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiCalendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucune absence trouvée</p>
            <p className="text-sm">
              {absences && absences.length > 0 
                ? 'Aucune absence ne correspond aux filtres sélectionnés' 
                : 'Aucune absence enregistrée'}
            </p>
          </div>
        </Card>
      )}

      {/* Modal pour justifier une absence */}
      <Modal
        isOpen={showJustifyModal}
        onClose={() => {
          setShowJustifyModal(false);
          setSelectedAbsence(null);
          setJustificationReason('');
        }}
        title="Justifier une absence"
        size="md"
      >
        {selectedAbsence && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Cours</p>
              <p className="font-semibold text-gray-900">{selectedAbsence.course?.name || 'N/A'}</p>
              <p className="text-sm text-gray-600 mt-2 mb-1">Date</p>
              <p className="font-semibold text-gray-900">
                {format(new Date(selectedAbsence.date), 'dd MMMM yyyy', { locale: fr })}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Raison (optionnelle)
              </label>
              <textarea
                value={justificationReason}
                onChange={(e) => setJustificationReason(e.target.value)}
                placeholder="Expliquez brièvement la raison de votre absence..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 resize-none"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Document justificatif <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Téléchargez un document justificatif (certificat médical, justificatif, etc.)
              </p>
              <ImageUpload
                onUpload={handleJustify}
                type="assignment"
                label="Télécharger le justificatif"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowJustifyModal(false);
                  setSelectedAbsence(null);
                  setJustificationReason('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Styles CSS pour les effets 3D */}
      <style>{`
        .perspective-3d {
          perspective: 1000px;
        }
        
        .transform-gpu {
          transform: translateZ(0);
          will-change: transform;
          backface-visibility: hidden;
        }
      `}</style>
    </div>
  );
};

export default StudentAbsences;




