import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import {
  FiX,
  FiBook,
  FiCalendar,
  FiEdit,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiLoader,
  FiFile,
  FiUsers,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AssignmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignmentId: string;
  onEdit?: () => void;
}

const AssignmentDetailsModal: React.FC<AssignmentDetailsModalProps> = ({
  isOpen,
  onClose,
  assignmentId,
  onEdit,
}) => {
  const { data: assignment, isLoading } = useQuery({
    queryKey: ['assignment', assignmentId],
    queryFn: () => adminApi.getAssignment(assignmentId),
    enabled: isOpen && !!assignmentId,
  });

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chargement..." size="lg">
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-gray-600">Chargement des détails du devoir...</p>
        </div>
      </Modal>
    );
  }

  if (!assignment) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erreur" size="lg">
        <div className="text-center py-8">
          <FiX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Devoir non trouvé</p>
          <Button onClick={onClose} className="mt-6">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  const submittedCount = assignment.students?.filter((s: any) => s.submitted).length || 0;
  const totalCount = assignment.students?.length || 0;
  const submissionRate = totalCount > 0 ? (submittedCount / totalCount) * 100 : 0;
  const isOverdue = new Date(assignment.dueDate) < new Date();
  const daysUntilDue = Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails du Devoir</h2>
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

        {/* Title and Status */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{assignment.title}</h3>
          <div className="flex items-center space-x-2">
            {isOverdue ? (
              <Badge className="bg-red-100 text-red-800">
                <FiAlertCircle className="w-3 h-3 mr-1 inline" />
                Échu
              </Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">
                <FiClock className="w-3 h-3 mr-1 inline" />
                {daysUntilDue > 0 ? `${daysUntilDue} jour(s) restant(s)` : 'Aujourd\'hui'}
              </Badge>
            )}
            <Badge className="bg-blue-100 text-blue-800">
              {assignment.course?.name || 'N/A'}
            </Badge>
            <Badge className="bg-indigo-100 text-indigo-800">
              {assignment.course?.class?.name || 'N/A'}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {assignment.description && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
              <FiFile className="w-5 h-5 mr-2 text-blue-600" /> Description
            </h4>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.description}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiCalendar className="w-5 h-5 mr-2 text-green-600" /> Informations
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Date d'échéance:</span>{' '}
                {assignment.dueDate ? format(new Date(assignment.dueDate), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Enseignant:</span>{' '}
                {assignment.teacher?.user?.firstName} {assignment.teacher?.user?.lastName}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Matière:</span>{' '}
                {assignment.course?.name || 'N/A'} ({assignment.course?.code || 'N/A'})
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiUsers className="w-5 h-5 mr-2 text-purple-600" /> Soumissions
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Soumissions:</span>
                <span className="font-bold text-gray-900">
                  {submittedCount} / {totalCount}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    submissionRate >= 80
                      ? 'bg-green-500'
                      : submissionRate >= 50
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${submissionRate}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600">
                Taux de soumission: {submissionRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Students List */}
        {assignment.students && assignment.students.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiUsers className="w-5 h-5 mr-2 text-indigo-600" /> Élèves Assignés ({totalCount})
            </h4>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {assignment.students.map((studentAssignment: any) => (
                <div
                  key={studentAssignment.studentId}
                  className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar
                      src={studentAssignment.student?.user?.avatar}
                      name={`${studentAssignment.student?.user?.firstName || ''} ${studentAssignment.student?.user?.lastName || ''}`}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {studentAssignment.student?.user?.firstName} {studentAssignment.student?.user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {studentAssignment.student?.studentId || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {studentAssignment.submitted ? (
                    <Badge className="bg-green-100 text-green-800">
                      <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                      Soumis
                    </Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-800">
                      <FiClock className="w-3 h-3 mr-1 inline" />
                      En attente
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attachments */}
        {assignment.attachments && assignment.attachments.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiFile className="w-5 h-5 mr-2 text-orange-600" /> Pièces jointes ({assignment.attachments.length})
            </h4>
            <div className="space-y-2">
              {assignment.attachments.map((attachment: string, index: number) => (
                <a
                  key={index}
                  href={attachment}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 p-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <FiFile className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700 truncate">{attachment}</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Timestamps */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
            <FiCalendar className="w-5 h-5 mr-2 text-purple-600" /> Informations Système
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
            <p>
              <span className="font-medium">Créé le:</span>{' '}
              {assignment.createdAt ? format(new Date(assignment.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
            </p>
            <p>
              <span className="font-medium">Modifié le:</span>{' '}
              {assignment.updatedAt ? format(new Date(assignment.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="secondary">
            Fermer
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignmentDetailsModal;






