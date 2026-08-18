import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import { getTeacherEngagementKindLabel, getTeacherEngagementBadgeVariant } from '@/lib/teacherEngagementKind';
import {
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiBriefcase,
  FiBook,
  FiUsers,
  FiDollarSign,
  FiEdit,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { formatFCFA } from '../../utils/currency';
import TeacherDossierPanel from './TeacherDossierPanel';
import TeacherAdminDocumentsPanel from './TeacherAdminDocumentsPanel';

interface TeacherDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  onEdit?: () => void;
}

const TeacherDetailsModal: React.FC<TeacherDetailsModalProps> = ({
  isOpen,
  onClose,
  teacherId,
  onEdit,
}) => {
  const { data: teacher, isLoading } = useQuery({
    queryKey: ['teacher', teacherId],
    queryFn: () => adminApi.getTeacher(teacherId),
    enabled: isOpen && !!teacherId,
  });

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails de l'enseignant</h2>
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
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              title="Fermer"
              aria-label="Fermer"
            >
              <FiX className="w-5 h-5" aria-hidden />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Chargement des détails...</p>
          </div>
        ) : !teacher ? (
          <div className="text-center py-12">
            <FiAlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Enseignant non trouvé</h3>
            <p className="text-gray-600">L'enseignant demandé n'existe pas ou a été supprimé.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Informations personnelles */}
            <Card>
              <div className="flex items-start space-x-6">
                <Avatar
                  src={teacher.user?.avatar}
                  name={`${teacher.user?.firstName} ${teacher.user?.lastName}`}
                  size="xl"
                />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {teacher.user?.firstName} {teacher.user?.lastName}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center space-x-3">
                      <FiUser className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">ID Employé</p>
                        <p className="font-medium text-gray-900">{teacher.employeeId}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <FiMail className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">E-mail</p>
                        <p className="font-medium text-gray-900">{teacher.user?.email}</p>
                      </div>
                    </div>
                    {teacher.user?.phone && (
                      <div className="flex items-center space-x-3">
                        <FiPhone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Téléphone</p>
                          <p className="font-medium text-gray-900">{teacher.user.phone}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <Badge variant={teacher.user?.isActive ? 'success' : 'danger'}>
                        {teacher.user?.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Informations professionnelles */}
            <Card>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FiBriefcase className="w-5 h-5 mr-2 text-blue-600" />
                Informations Professionnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Spécialisation</p>
                  <Badge variant="info" className="text-base">
                    <FiBook className="w-4 h-4 mr-1 inline" />
                    {teacher.specialization}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Type d&apos;enseignant</p>
                  <Badge variant={getTeacherEngagementBadgeVariant(teacher.engagementKind)}>
                    {getTeacherEngagementKindLabel(teacher.engagementKind)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Type de contrat</p>
                  <p className="font-medium text-gray-900">
                    {teacher.contractType === 'CDI' ? 'CDI (Contrat à Durée Indéterminée)' :
                     teacher.contractType === 'CDD' ? 'CDD (Contrat à Durée Déterminée)' :
                     teacher.contractType === 'STAGE' ? 'Stage' :
                     teacher.contractType === 'INTERIM' ? 'Intérim' : teacher.contractType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date d'embauche</p>
                  <p className="font-medium text-gray-900">
                    {teacher.hireDate
                      ? format(new Date(teacher.hireDate), 'dd MMMM yyyy', { locale: fr })
                      : 'Non renseignée'}
                  </p>
                </div>
                {teacher.salary && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Salaire</p>
                    <p className="font-medium text-gray-900 flex items-center">
                      <FiDollarSign className="w-4 h-4 mr-1" />
                      {formatFCFA(teacher.salary)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {(teacher as any).bio && (
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Profil &amp; présentation</h3>
                <p className="text-gray-700 whitespace-pre-wrap text-sm">{(teacher as any).bio}</p>
              </Card>
            )}

            {/* Classes assignées */}
            {teacher.classes && teacher.classes.length > 0 && (
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FiUsers className="w-5 h-5 mr-2 text-purple-600" />
                  Classes Assignées ({teacher.classes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {teacher.classes.map((cls: any) => (
                    <div
                      key={cls.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-medium text-gray-900">{cls.name}</p>
                      <p className="text-sm text-gray-600">{cls.level} - {cls.academicYear}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cours enseignés */}
            {teacher.courses && teacher.courses.length > 0 && (
              <Card>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <FiBook className="w-5 h-5 mr-2 text-green-600" />
                  Matières enseignées ({teacher.courses.length})
                </h3>
                <div className="space-y-3">
                  {teacher.courses.map((course: any) => (
                    <div
                      key={course.id}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <p className="font-medium text-gray-900">{course.name}</p>
                      <p className="text-sm text-gray-600">
                        {course.code} — {course.class?.name || 'N/A'}
                        {course.weeklyHours != null ? (
                          <span className="text-emerald-800 font-medium"> · {course.weeklyHours} h/sem.</span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <TeacherAdminDocumentsPanel
              teacherId={teacherId}
              documents={(teacher as any).administrativeDocuments || []}
            />

            <TeacherDossierPanel teacherId={teacherId} />

            {/* Statistiques */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <div className="text-center">
                  <FiUsers className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {teacher.classes?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Classes</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <div className="text-center">
                  <FiBook className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {teacher.courses?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">Cours</p>
                </div>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <div className="text-center">
                  <FiCalendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {teacher.hireDate
                      ? Math.floor((new Date().getTime() - new Date(teacher.hireDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
                      : 0}
                  </p>
                  <p className="text-sm text-gray-600">Années d'expérience</p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TeacherDetailsModal;




