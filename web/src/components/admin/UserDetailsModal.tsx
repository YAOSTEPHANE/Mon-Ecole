import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import {
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiEdit,
  FiShield,
  FiUserCheck,
  FiAward,
  FiBook,
  FiLoader,
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiUnlock,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onEdit?: () => void;
  onToggleStatus?: () => void;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onEdit,
  onToggleStatus,
}) => {
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => adminApi.getUser(userId),
    enabled: isOpen && !!userId,
  });

  if (!isOpen) return null;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { label: string; icon: any; color: string }> = {
      ADMIN: { label: 'Administrateur', icon: FiShield, color: 'from-red-500 to-red-600' },
      TEACHER: { label: 'Enseignant', icon: FiUserCheck, color: 'from-blue-500 to-blue-600' },
      STUDENT: { label: 'Élève', icon: FiAward, color: 'from-green-500 to-green-600' },
      PARENT: { label: 'Parent', icon: FiUser, color: 'from-purple-500 to-purple-600' },
    };
    return labels[role] || { label: role, icon: FiUser, color: 'from-gray-500 to-gray-600' };
  };

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chargement..." size="lg">
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-gray-600">Chargement des détails de l'utilisateur...</p>
        </div>
      </Modal>
    );
  }

  if (!user) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erreur" size="lg">
        <div className="text-center py-8">
          <FiX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Utilisateur non trouvé</p>
          <Button onClick={onClose} className="mt-6">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  const roleInfo = getRoleLabel(user.role);
  const RoleIcon = roleInfo.icon;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails de l'Utilisateur</h2>
          <div className="flex items-center space-x-2">
            {onToggleStatus && (
              <button
                onClick={onToggleStatus}
                className={`p-2 rounded-lg transition-colors ${
                  user.isActive
                    ? 'text-red-600 hover:bg-red-50'
                    : 'text-green-600 hover:bg-green-50'
                }`}
                title={user.isActive ? 'Désactiver' : 'Activer'}
              >
                {user.isActive ? (
                  <FiLock className="w-5 h-5" />
                ) : (
                  <FiUnlock className="w-5 h-5" />
                )}
              </button>
            )}
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
        </div>

        {/* User Info */}
        <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <Avatar
            src={user.avatar}
            name={`${user.firstName} ${user.lastName}`}
            size="lg"
          />
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="mt-2 flex items-center space-x-2">
              <Badge className={`bg-gradient-to-r ${roleInfo.color} text-white`}>
                <RoleIcon className="w-3 h-3 mr-1 inline" />
                {roleInfo.label}
              </Badge>
              {user.isActive ? (
                <Badge className="bg-green-100 text-green-800">
                  <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                  Actif
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <FiXCircle className="w-3 h-3 mr-1 inline" />
                  Inactif
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <FiUser className="w-5 h-5 mr-2 text-blue-600" /> Informations Personnelles
            </h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Email:</span> {user.email}
              </p>
              {user.phone && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Téléphone:</span> {user.phone}
                </p>
              )}
              <p className="text-sm text-gray-700">
                <span className="font-medium">Créé le:</span>{' '}
                {user.createdAt ? format(new Date(user.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Modifié le:</span>{' '}
                {user.updatedAt ? format(new Date(user.updatedAt), 'dd/MM/yyyy à HH:mm', { locale: fr }) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Role-specific information */}
          {user.teacherProfile && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <FiUserCheck className="w-5 h-5 mr-2 text-green-600" /> Informations Enseignant
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">ID Employé:</span> {user.teacherProfile.employeeId}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Spécialisation:</span>{' '}
                  <Badge variant="info">{user.teacherProfile.specialization}</Badge>
                </p>
                {user.teacherProfile.classes && user.teacherProfile.classes.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Classes:</span>{' '}
                    {user.teacherProfile.classes.map((c: any) => c.name).join(', ')}
                  </p>
                )}
                {user.teacherProfile.courses && user.teacherProfile.courses.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Cours:</span>{' '}
                    {user.teacherProfile.courses.length} cours
                  </p>
                )}
              </div>
            </div>
          )}

          {user.studentProfile && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <FiAward className="w-5 h-5 mr-2 text-green-600" /> Informations Élève
              </h4>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">ID Élève:</span> {user.studentProfile.studentId}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Classe:</span>{' '}
                  <Badge variant="info">
                    {user.studentProfile.class?.name || 'Non assigné'}
                  </Badge>
                </p>
                {user.studentProfile.parents && user.studentProfile.parents.length > 0 && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Parents:</span>{' '}
                    {user.studentProfile.parents.map((p: any) => 
                      `${p.parent.user.firstName} ${p.parent.user.lastName}`
                    ).join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {user.parentProfile && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                <FiUser className="w-5 h-5 mr-2 text-purple-600" /> Informations Parent
              </h4>
              <div className="space-y-2">
                {user.parentProfile.students && user.parentProfile.students.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Enfants:</p>
                    <ul className="space-y-1">
                      {user.parentProfile.students.map((s: any) => (
                        <li key={s.student.id} className="text-sm text-gray-600">
                          {s.student.user.firstName} {s.student.user.lastName} - {s.student.class?.name || 'N/A'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
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

export default UserDetailsModal;






