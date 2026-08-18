import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import {
  FiX,
  FiUser,
  FiBook,
  FiCalendar,
  FiEdit,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiLoader,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AbsenceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  absenceId: string;
  onEdit?: () => void;
}

const AbsenceDetailsModal: React.FC<AbsenceDetailsModalProps> = ({
  isOpen,
  onClose,
  absenceId,
  onEdit,
}) => {
  const queryClient = useQueryClient();
  const { data: absence, isLoading } = useQuery({
    queryKey: ['absence', absenceId],
    queryFn: () => adminApi.getAbsence(absenceId),
    enabled: isOpen && !!absenceId,
  });

  const notifyMutation = useMutation({
    mutationFn: () => adminApi.notifyAbsenceParents(absenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['absence', absenceId] });
      queryClient.invalidateQueries({ queryKey: ['admin-absences'] });
      toast.success('Notification envoyée aux parents');
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Envoi impossible'),
  });

  if (!isOpen) return null;

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { label: string; color: string; icon: any }> = {
      PRESENT: { label: 'Présent', color: 'bg-green-100 text-green-800', icon: FiCheckCircle },
      ABSENT: { label: 'Absent', color: 'bg-red-100 text-red-800', icon: FiXCircle },
      LATE: { label: 'Retard', color: 'bg-yellow-100 text-yellow-800', icon: FiClock },
      EXCUSED: { label: 'Excusé', color: 'bg-blue-100 text-blue-800', icon: FiCheckCircle },
    };
    return labels[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: FiAlertCircle };
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chargement..." size="lg">
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-gray-600">Chargement des détails de l'absence...</p>
        </div>
      </Modal>
    );
  }

  if (!absence) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erreur" size="lg">
        <div className="text-center py-8">
          <FiX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Absence non trouvée</p>
          <Button onClick={onClose} className="mt-6">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  const statusInfo = getStatusLabel(absence.status);
  const StatusIcon = statusInfo.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails de l'Absence</h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Modifier"
            >
              <FiEdit className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Student Info */}
        <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <Avatar
            src={absence.student?.user?.avatar}
            name={`${absence.student?.user?.firstName || ''} ${absence.student?.user?.lastName || ''}`}
            size="lg"
          />
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              {absence.student?.user?.firstName} {absence.student?.user?.lastName}
            </h3>
            <p className="text-sm text-gray-600">
              {absence.student?.class?.name || 'Classe non assignée'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              N° élève : {absence.student?.studentId || '—'}
            </p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiBook className="w-5 h-5 mr-2 text-blue-600" /> Informations Académiques
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Matière:</span>{' '}
                <Badge variant="info">{absence.course?.name || 'N/A'}</Badge>
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Code:</span> {absence.course?.code || 'N/A'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Enseignant:</span>{' '}
                {absence.teacher?.user?.firstName} {absence.teacher?.user?.lastName}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiCalendar className="w-5 h-5 mr-2 text-green-600" /> Informations de l'Absence
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Date:</span>{' '}
                {absence.date ? format(new Date(absence.date), 'dd/MM/yyyy', { locale: fr }) : 'N/A'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Statut:</span>{' '}
                <Badge className={statusInfo.color}>
                  <StatusIcon className="w-3 h-3 mr-1 inline" />
                  {statusInfo.label}
                </Badge>
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Justifiée:</span>{' '}
                {absence.excused ? (
                  <Badge className="bg-green-100 text-green-800">
                    <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                    Oui
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <FiXCircle className="w-3 h-3 mr-1 inline" />
                    Non
                  </Badge>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Reason */}
        {absence.reason && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiAlertCircle className="w-5 h-5 mr-2 text-orange-600" /> Raison
            </h4>
            <p className="text-sm text-gray-700">{absence.reason}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Pointage & retard</h4>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Source :</span>{' '}
              {absence.attendanceSource === 'BIOMETRIC'
                ? 'Biométrie'
                : absence.attendanceSource === 'NFC'
                  ? 'NFC'
                  : absence.attendanceSource === 'MANUAL'
                    ? 'Manuel'
                    : absence.attendanceSource || '—'}
            </p>
            {absence.status === 'LATE' && absence.minutesLate != null && (
              <p className="text-sm text-gray-700 mt-1">
                <span className="font-medium">Retard :</span> ~{absence.minutesLate} min
              </p>
            )}
            {absence.parentNotifiedAt && (
              <p className="text-xs text-green-700 mt-2">
                Parents notifiés le{' '}
                {format(new Date(absence.parentNotifiedAt), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </p>
            )}
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2">Justificatifs & suite</h4>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Certificat médical :</span>{' '}
              {absence.hasMedicalCertificate ? 'Oui' : 'Non'}
            </p>
            {Array.isArray(absence.justificationDocuments) && absence.justificationDocuments.length > 0 && (
              <ul className="mt-2 text-xs text-blue-700 list-disc list-inside space-y-1">
                {absence.justificationDocuments.map((url: string, i: number) => (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="underline break-all">
                      {url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {absence.sanctionNote && (
              <p className="text-sm text-gray-700 mt-2">
                <span className="font-medium">Sanction / mesure :</span> {absence.sanctionNote}
              </p>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <FiCalendar className="w-5 h-5 mr-2 text-purple-600" /> Informations Système
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Créée le:</span>{' '}
              {absence.createdAt ? format(new Date(absence.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
            </p>
            <p>
              <span className="font-medium">Modifiée le:</span>{' '}
              {absence.updatedAt ? format(new Date(absence.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="primary"
            className="bg-teal-600 hover:bg-teal-700"
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending}
          >
            {notifyMutation.isPending ? 'Envoi…' : 'Renvoyer alerte aux parents'}
          </Button>
          <Button onClick={onClose} variant="secondary">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AbsenceDetailsModal;






