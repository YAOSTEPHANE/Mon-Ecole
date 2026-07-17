import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import {
  FiX,
  FiUser,
  FiBook,
  FiClipboard,
  FiCalendar,
  FiAward,
  FiEdit,
  FiAlertCircle,
  FiTrendingUp,
  FiTrendingDown,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getEvaluationTypeLabel } from '@/lib/evaluationTypes';

interface GradeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradeId: string;
  onEdit?: () => void;
}

const GradeDetailsModal: React.FC<GradeDetailsModalProps> = ({
  isOpen,
  onClose,
  gradeId,
  onEdit,
}) => {
  const { data: grade, isLoading } = useQuery({
    queryKey: ['grade', gradeId],
    queryFn: () => adminApi.getGrade(gradeId),
    enabled: isOpen && !!gradeId,
  });

  if (!isOpen) return null;

  const getGradeColor = (score: number, maxScore: number) => {
    const percentage = (score / maxScore) * 100;
    if (percentage >= 80) return 'from-green-500 to-green-600';
    if (percentage >= 60) return 'from-blue-500 to-blue-600';
    if (percentage >= 40) return 'from-yellow-500 to-yellow-600';
    return 'from-red-500 to-red-600';
  };

  const percentage = grade ? ((grade.score / grade.maxScore) * 100).toFixed(1) : '0';
  const gradeColor = grade ? getGradeColor(grade.score, grade.maxScore) : 'from-gray-500 to-gray-600';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails de la Note</h2>
          <div className="flex items-center space-x-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <FiEdit className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement des détails...</p>
          </div>
        ) : !grade ? (
          <div className="text-center py-12">
            <FiAlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Note non trouvée</h3>
            <p className="text-gray-600">La note demandée n'existe pas ou a été supprimée.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Grade Score - Large Display */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <div className="text-center py-6">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br ${gradeColor} mb-4 shadow-lg`}>
                  <FiAward className="w-12 h-12 text-white" />
                </div>
                <div className="mb-2">
                  <span className="text-5xl font-black text-gray-900">
                    {grade.score.toFixed(2)}
                  </span>
                  <span className="text-3xl font-bold text-gray-600"> / {grade.maxScore}</span>
                </div>
                <Badge className={`bg-gradient-to-r ${gradeColor} text-white text-lg px-4 py-2`}>
                  {percentage}%
                </Badge>
                <p className="mt-4 text-lg font-semibold text-gray-700">{grade.title}</p>
              </div>
            </Card>

            {/* Student Information */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiUser className="w-5 h-5 mr-2 text-blue-600" />
                Informations de l'Élève
              </h3>
              <div className="flex items-center space-x-4">
                <Avatar
                  src={grade.student?.user?.avatar}
                  name={`${grade.student?.user?.firstName} ${grade.student?.user?.lastName}`}
                  size="lg"
                />
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {grade.student?.user?.firstName} {grade.student?.user?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">ID: {grade.student?.studentId}</p>
                  {grade.student?.class && (
                    <Badge variant="info" className="mt-2">
                      {grade.student.class.name} - {grade.student.class.level}
                    </Badge>
                  )}
                </div>
              </div>
            </Card>

            {/* Grade Details */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiClipboard className="w-5 h-5 mr-2 text-purple-600" />
                Détails de l'Évaluation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Matière</p>
                  <div className="flex items-center space-x-2">
                    <FiBook className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">{grade.course?.name}</p>
                  </div>
                  {grade.course?.code && (
                    <p className="text-sm text-gray-600 mt-1">Code: {grade.course.code}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Type d'évaluation</p>
                  <Badge variant="secondary">
                    {getEvaluationTypeLabel(grade.evaluationType || grade.type || 'N/A')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <div className="flex items-center space-x-2">
                    <FiCalendar className="w-4 h-4 text-gray-400" />
                    <p className="font-medium text-gray-900">
                      {format(new Date(grade.date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Coefficient</p>
                  <p className="font-medium text-gray-900">{grade.coefficient || 1}</p>
                </div>
              </div>
            </Card>

            {/* Teacher Information */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiUser className="w-5 h-5 mr-2 text-green-600" />
                Enseignant
              </h3>
              <div className="flex items-center space-x-3">
                <Avatar
                  src={grade.teacher?.user?.avatar}
                  name={`${grade.teacher?.user?.firstName} ${grade.teacher?.user?.lastName}`}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {grade.teacher?.user?.firstName} {grade.teacher?.user?.lastName}
                  </p>
                  {grade.teacher?.specialization && (
                    <p className="text-sm text-gray-600">{grade.teacher.specialization}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Comments */}
            {grade.comments && (
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FiAlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                  Commentaires
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-gray-200">
                  {grade.comments}
                </p>
              </Card>
            )}

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    {parseFloat(percentage) >= 50 ? (
                      <FiTrendingUp className="w-6 h-6 text-blue-600" />
                    ) : (
                      <FiTrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{percentage}%</p>
                  <p className="text-sm text-gray-600">Pourcentage</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="text-center">
                  <FiAward className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {((grade.score / grade.maxScore) * 20).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600">Sur 20</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="text-center">
                  <FiClipboard className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{grade.coefficient || 1}</p>
                  <p className="text-sm text-gray-600">Coefficient</p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default GradeDetailsModal;

