import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parentApi } from '../../services/api';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import ImageUpload from '../ui/ImageUpload';
import {
  FiCalendar,
  FiBook,
  FiAlertCircle,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiSearch,
  FiFilter,
  FiFileText,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import AbsencePermissionRequestsPanel from '../attendance/AbsencePermissionRequestsPanel';
import DailyPresenceIndicator from '../attendance/DailyPresenceIndicator';

interface ChildAbsencesProps {
  studentId: string;
  searchQuery?: string;
}

type ChildAbsence = {
  id: string;
  date: string;
  status?: string;
  excused?: boolean;
  reason?: string | null;
  justificationDocuments?: string[];
  course?: { name?: string };
  teacher?: { user?: { firstName?: string; lastName?: string } };
};

const ChildAbsences = ({ studentId, searchQuery = '' }: ChildAbsencesProps) => {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedAbsence, setSelectedAbsence] = useState<ChildAbsence | null>(null);
  const [justificationReason, setJustificationReason] = useState('');

  const { data: absences, isLoading } = useQuery({
    queryKey: ['parent-child-absences', studentId],
    queryFn: () => parentApi.getChildAbsences(studentId),
  });

  const justifyMutation = useMutation({
    mutationFn: ({
      absenceId,
      documentUrl,
      reason,
    }: {
      absenceId: string;
      documentUrl: string;
      reason?: string;
    }) => parentApi.justifyChildAbsence(studentId, absenceId, documentUrl, reason),
    onSuccess: () => {
      toast.success('Justificatif envoyé — en attente de validation');
      queryClient.invalidateQueries({ queryKey: ['parent-child-absences', studentId] });
      setSelectedAbsence(null);
      setJustificationReason('');
    },
    onError: (e: { response?: { data?: { error?: string } } }) => {
      toast.error(e.response?.data?.error || 'Envoi impossible');
    },
  });

  const filteredAbsences = useMemo(() => {
    if (!absences) return [];

    let filtered = absences as ChildAbsence[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => {
        const courseName = a.course?.name?.toLowerCase() || '';
        const dateStr = format(new Date(a.date), 'dd MMMM yyyy', { locale: fr }).toLowerCase();
        return courseName.includes(query) || dateStr.includes(query);
      });
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'excused') {
        filtered = filtered.filter((a) => a.excused);
      } else if (filterStatus === 'unexcused') {
        filtered = filtered.filter((a) => !a.excused);
      } else {
        filtered = filtered.filter((a) => a.status === filterStatus);
      }
    }

    return filtered;
  }, [absences, searchQuery, filterStatus]);

  if (isLoading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Chargement des absences...</p>
        </div>
      </Card>
    );
  }

  const list = (absences as ChildAbsence[] | undefined) ?? [];
  const totalAbsences = list.length;
  const unexcusedAbsences = list.filter((a) => !a.excused).length;
  const excusedAbsences = list.filter((a) => a.excused).length;
  const lateCount = list.filter((a) => a.status === 'LATE').length;

  return (
    <div className="space-y-6">
      <DailyPresenceIndicator
        queryKey={['parent-child-daily-presence', studentId]}
        queryFn={() => parentApi.getChildDailyPresence(studentId, { limit: 14 })}
      />
      <AbsencePermissionRequestsPanel
        mode="parent"
        studentId={studentId}
        queryKey={['parent-child-absence-permission-requests', studentId]}
        fetchRequests={() => parentApi.getChildAbsencePermissionRequests(studentId)}
        createRequest={(data) => parentApi.createChildAbsencePermissionRequest(studentId, data)}
      />
      <Card className="border border-teal-200/80 bg-teal-50/50 p-3">
        <p className="text-xs leading-relaxed text-teal-950">
          <strong>Justifier :</strong> permission anticipée via le formulaire ci-dessus, ou dépôt
          d’un justificatif sur une absence déjà pointée (bouton « Justifier »). L’administration
          valide ensuite l’excuse.
        </p>
      </Card>

      {searchQuery && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200">
          <div className="flex items-center space-x-3">
            <FiSearch className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-semibold text-gray-900">
                Recherche: <span className="text-orange-600">&quot;{searchQuery}&quot;</span>
              </p>
              <p className="text-sm text-gray-600">{filteredAbsences.length} absence(s) trouvée(s)</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total absences</p>
              <p className="text-2xl font-bold text-gray-900">{totalAbsences}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <FiCalendar className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Justifiées</p>
              <p className="text-2xl font-bold text-green-600">{excusedAbsences}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Non justifiées</p>
              <p className="text-2xl font-bold text-red-600">{unexcusedAbsences}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
              <FiXCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En retard</p>
              <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
            </div>
            <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
              <FiClock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-2">
            <FiFilter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtrer par statut:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">Tous</option>
              <option value="excused">Justifiées</option>
              <option value="unexcused">Non justifiées</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">En retard</option>
            </select>
          </div>
        </div>
      </Card>

      {filteredAbsences.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <FiCalendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg mb-2">Aucune absence trouvée</p>
            <p className="text-sm">
              {searchQuery || filterStatus !== 'all'
                ? "Essayez avec d'autres critères de recherche"
                : 'Aucune absence enregistrée pour le moment'}
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Cours</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Enseignant</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Statut</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Justifiée</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Raison</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAbsences.map((absence) => (
                  <tr key={absence.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 text-gray-900">
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span>{format(new Date(absence.date), 'dd MMM yyyy', { locale: fr })}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <FiBook className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{absence.course?.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-gray-600">
                        {absence.teacher?.user?.firstName} {absence.teacher?.user?.lastName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          absence.status === 'PRESENT'
                            ? 'success'
                            : absence.status === 'LATE'
                              ? 'warning'
                              : 'danger'
                        }
                        size="sm"
                      >
                        {absence.status === 'PRESENT'
                          ? 'Présent'
                          : absence.status === 'LATE'
                            ? 'En retard'
                            : 'Absent'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={absence.excused ? 'success' : 'secondary'} size="sm">
                        {absence.excused ? 'Oui' : 'Non'}
                      </Badge>
                      {(absence.justificationDocuments?.length ?? 0) > 0 && !absence.excused ? (
                        <p className="mt-1 text-[10px] text-amber-700">Justificatif déposé</p>
                      ) : null}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{absence.reason || '-'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!absence.excused &&
                      (absence.status === 'ABSENT' || absence.status === 'LATE') ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedAbsence(absence);
                            setJustificationReason(absence.reason || '');
                          }}
                        >
                          <FiFileText className="mr-1 h-3.5 w-3.5" />
                          Justifier
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {unexcusedAbsences > 0 && (
        <Card className="border-l-4 border-orange-500">
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <FiAlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">Attention requise</h3>
              <p className="text-sm text-gray-700">
                Votre enfant a {unexcusedAbsences} absence(s) non justifiée(s). Déposez un
                justificatif via le bouton « Justifier » ou contactez l&apos;établissement.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={!!selectedAbsence}
        onClose={() => {
          setSelectedAbsence(null);
          setJustificationReason('');
        }}
        title="Justifier une absence"
        size="md"
      >
        {selectedAbsence ? (
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
                placeholder="Expliquez brièvement la raison de l'absence..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Document justificatif <span className="text-red-500">*</span>
              </label>
              <ImageUpload
                onUpload={(documentUrl) => {
                  if (justifyMutation.isPending) return;
                  justifyMutation.mutate({
                    absenceId: selectedAbsence.id,
                    documentUrl,
                    reason: justificationReason.trim() || undefined,
                  });
                }}
                type="assignment"
                uploadEndpoint="/upload/absence-justification"
                uploadFieldName="document"
                label="Télécharger le justificatif"
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-gray-200">
              <Button
                variant="secondary"
                onClick={() => {
                  setSelectedAbsence(null);
                  setJustificationReason('');
                }}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default ChildAbsences;
