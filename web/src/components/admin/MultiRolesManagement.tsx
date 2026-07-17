import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import SearchBar from '../ui/SearchBar';
import FilterDropdown from '../ui/FilterDropdown';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import UserDetailsModal from './UserDetailsModal';
import EditUserModal from './EditUserModal';
import toast from 'react-hot-toast';
import { 
  FiUsers, 
  FiShield, 
  FiUserCheck, 
  FiAward, 
  FiUser,
  FiSearch,
  FiEdit,
  FiEye,
  FiCheck,
  FiX,
  FiMail,
  FiPhone,
  FiCalendar,
  FiTrendingUp,
  FiTrendingDown,
  FiLock,
  FiUnlock,
  FiRefreshCw,
  FiAlertCircle,
  FiCheckCircle,
  FiBook,
  FiBarChart,
  FiTrash2,
  FiDownload,
  FiFileText,
  FiBriefcase,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { ADM } from './adminModuleLayout';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

type Role = 'ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT' | 'EDUCATOR' | 'STAFF' | 'all';

/** Clés renvoyées par GET /admin/roles/stats (pluriel), alignées sur chaque rôle */
const ROLE_STATS_API_KEY: Record<
  Exclude<Role, 'all'>,
  'admins' | 'teachers' | 'students' | 'parents' | 'educators' | 'staff'
> = {
  ADMIN: 'admins',
  TEACHER: 'teachers',
  STUDENT: 'students',
  PARENT: 'parents',
  EDUCATOR: 'educators',
  STAFF: 'staff',
};

interface RoleConfig {
  id: Role;
  label: string;
  icon: typeof FiShield;
  color: string;
  description: string;
  permissions: string[];
}

const MultiRolesManagement = () => {
  const [selectedRole, setSelectedRole] = useState<Role>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<Role>('ADMIN');
  const queryClient = useQueryClient();

  // Fetch data
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users', selectedRole],
    queryFn: () => adminApi.getAllUsers({
      ...(selectedRole !== 'all' && { role: selectedRole }),
    }),
  });

  const { data: roleStats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-role-stats'],
    queryFn: adminApi.getRoleStats,
  });

  // Mutation pour changer le rôle
  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-stats'] });
      toast.success('Rôle mis à jour avec succès');
      setIsRoleModalOpen(false);
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du rôle');
    },
  });

  // Mutation pour activer/désactiver un utilisateur
  const toggleUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      adminApi.toggleUserStatus(userId, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-stats'] });
      toast.success('Statut utilisateur mis à jour avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
    },
  });

  // Mutation pour supprimer un utilisateur
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-role-stats'] });
      toast.success('Utilisateur supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression de l\'utilisateur');
    },
  });

  const roles: RoleConfig[] = [
    {
      id: 'ADMIN',
      label: 'Administrateur',
      icon: FiShield,
      color: 'from-red-500 to-red-600',
      description: 'Accès complet à toutes les fonctionnalités',
      permissions: [
        'Gestion des utilisateurs',
        'Gestion des classes',
        'Gestion des enseignants',
        'Gestion des élèves',
        'Génération de rapports',
        'Configuration du système',
        'Export des données',
      ],
    },
    {
      id: 'TEACHER',
      label: 'Enseignant',
      icon: FiUserCheck,
      color: 'from-blue-500 to-blue-600',
      description: 'Gestion des cours et évaluations',
      permissions: [
        'Gestion des cours',
        'Saisie des notes',
        'Gestion des absences',
        'Création de devoirs',
        'Consultation des classes',
        'Communication avec les élèves',
      ],
    },
    {
      id: 'STUDENT',
      label: 'Élève',
      icon: FiAward,
      color: 'from-green-500 to-green-600',
      description: 'Accès aux informations personnelles',
      permissions: [
        'Consultation des notes',
        'Consultation de l\'emploi du temps',
        'Consultation des devoirs',
        'Consultation des absences',
        'Téléchargement des documents',
      ],
    },
    {
      id: 'PARENT',
      label: 'Parent',
      icon: FiUser,
      color: 'from-purple-500 to-purple-600',
      description: 'Suivi des enfants',
      permissions: [
        'Consultation des notes des enfants',
        'Consultation des absences',
        'Consultation des devoirs',
        'Communication avec les enseignants',
        'Paiement des frais',
      ],
    },
    {
      id: 'EDUCATOR',
      label: 'Éducateur',
      icon: FiShield,
      color: 'from-indigo-500 to-indigo-600',
      description: 'Gestion de la conduite et du comportement',
      permissions: [
        'Évaluation de la conduite',
        'Suivi des élèves',
        'Gestion du comportement',
        'Communication avec les élèves',
        'Rapports de conduite',
      ],
    },
    {
      id: 'STAFF',
      label: 'Personnel administratif',
      icon: FiBriefcase,
      color: 'from-teal-500 to-teal-700',
      description: 'Administration, soutien, sécurité (hors enseignement)',
      permissions: [
        'Espace personnel dédié',
        'Compte géré depuis le module Personnel administratif',
      ],
    },
  ];

  // Filtrer les utilisateurs
  const filteredUsers = users?.filter((user: any) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.phone && user.phone.toLowerCase().includes(searchLower))
    );
  }) || [];

  /** Tableau utilisateurs : typographie compacte */
  const userTh =
    'text-left py-2 px-2.5 text-[10px] font-semibold text-gray-600 uppercase tracking-wide';
  const userTd = 'py-2 px-2.5 align-top';
  const userCellIcon = 'w-3 h-3 shrink-0 text-gray-400';

  const getRoleBadge = (role: string) => {
    const roleConfig = roles.find((r) => r.id === role);
    if (!roleConfig) return null;
    const Icon = roleConfig.icon;
    return (
      <Badge
        className={`bg-gradient-to-r ${roleConfig.color} text-white text-[10px] px-1.5 py-0 font-medium leading-tight`}
      >
        <Icon className="w-2.5 h-2.5 mr-0.5 inline shrink-0" />
        {roleConfig.label}
      </Badge>
    );
  };

  const handleRoleChange = (user: any) => {
    setSelectedUser(user);
    setNewRole(user.role);
    setIsRoleModalOpen(true);
  };

  const confirmRoleChange = () => {
    if (!selectedUser) return;
    if (newRole === selectedUser.role) {
      toast.error('Le rôle est identique');
      return;
    }
    updateRoleMutation.mutate({ userId: selectedUser.id, role: newRole });
  };

  const handleViewUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserDetailsModalOpen(true);
  };

  const handleEditUser = (userId: string) => {
    setSelectedUserId(userId);
    setIsEditUserModalOpen(true);
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    if (window.confirm(`Êtes-vous sûr de vouloir ${currentStatus ? 'désactiver' : 'activer'} cet utilisateur ?`)) {
      toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
    }
  };

  const handleDeleteUser = (userId: string, userName: string) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${userName}" ? Cette action est irréversible.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Export functions
  const exportUsersToCSV = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast.error('Aucun utilisateur à exporter');
      return;
    }

    try {
      const headers = ['Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Date de création'];
      const csvContent =
        '\ufeff' + // BOM for UTF-8
        headers.join(';') +
        '\n' +
        filteredUsers
          .map((user: any) =>
            [
              `"${user.firstName} ${user.lastName}"`,
              `"${user.email}"`,
              `"${user.phone || 'N/A'}"`,
              `"${user.role}"`,
              user.isActive ? 'Actif' : 'Inactif',
              format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr }),
            ].join(';')
          )
          .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Utilisateurs exportés en CSV avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      toast.error('Erreur lors de l\'export CSV');
    }
  };

  const exportUsersToJSON = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast.error('Aucun utilisateur à exporter');
      return;
    }

    try {
      const jsonData = filteredUsers.map((user: any) => ({
        id: user.id,
        nom: `${user.firstName} ${user.lastName}`,
        email: user.email,
        téléphone: user.phone || 'N/A',
        rôle: user.role,
        statut: user.isActive ? 'Actif' : 'Inactif',
        dateCréation: format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr }),
      }));

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `utilisateurs_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Utilisateurs exportés en JSON avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export JSON:', error);
      toast.error('Erreur lors de l\'export JSON');
    }
  };

  const exportUsersToPDF = () => {
    if (!filteredUsers || filteredUsers.length === 0) {
      toast.error('Aucun utilisateur à exporter');
      return;
    }

    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const currentDate = new Date().toLocaleDateString('fr-FR');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(59, 130, 246);
      doc.text('School Manager', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Rapport des Utilisateurs', 14, 30);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(`Généré le ${currentDate}`, 14, 37);

      const tableData = filteredUsers.map((user: any) => [
        `${user.firstName} ${user.lastName}`,
        user.email,
        user.phone || 'N/A',
        user.role,
        user.isActive ? 'Actif' : 'Inactif',
        format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr }),
      ]);

      if (typeof (doc as any).autoTable === 'function') {
        (doc as any).autoTable({
          head: [['Nom', 'Email', 'Téléphone', 'Rôle', 'Statut', 'Date de création']],
          body: tableData,
          startY: 45,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 7, cellPadding: 2 },
          margin: { left: 14, right: 14 },
        });
      }

      doc.save(`utilisateurs_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Utilisateurs exportés en PDF avec succès !');
    } catch (error: any) {
      console.error('Erreur lors de l\'export PDF:', error);
      toast.error(`Erreur lors de l'export PDF: ${error.message || 'Erreur inconnue'}`);
    }
  };

  return (
    <div className={ADM.pageRoot}>
      {/* Header avec statistiques */}
      <Card className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className={`text-indigo-50 ${ADM.heroTitle}`}>Gestion Multi-Rôles</h2>
            <p className="text-indigo-100/95 text-sm leading-snug mt-0.5">
              Gérez les rôles et permissions de tous les utilisateurs
            </p>
          </div>
          {statsLoading ? (
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white shrink-0"></div>
          ) : (
            <div className="hidden md:flex items-center gap-3 lg:gap-4 shrink-0 flex-wrap justify-end">
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{roleStats?.admins || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Administrateurs</div>
              </div>
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{roleStats?.teachers || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Enseignants</div>
              </div>
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{roleStats?.students || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Élèves</div>
              </div>
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{roleStats?.parents || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Parents</div>
              </div>
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{roleStats?.educators || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Éducateurs</div>
              </div>
              <div className="text-center">
                <div className={`text-indigo-50 ${ADM.heroStatNum}`}>{(roleStats as any)?.staff || 0}</div>
                <div className={`text-indigo-100 ${ADM.heroStatLbl}`}>Personnel admin.</div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Cartes des rôles */}
      <div className={ADM.grid6}>
        {roles.map((role) => {
          const Icon = role.icon;
          const count = roleStats ? (roleStats as any)[ROLE_STATS_API_KEY[role.id]] ?? 0 : 0;
          const isSelected = selectedRole === role.id;
          
          return (
            <Card
              key={role.id}
              className={`!p-2.5 sm:!p-3 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                isSelected ? `border-2 border-indigo-500 bg-gradient-to-br ${role.color} text-white` : ''
              }`}
              onClick={() => setSelectedRole(role.id)}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${role.color} flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-white/20' : ''
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-white" />
                </div>
                <div className={`text-right min-w-0 ${isSelected ? 'text-white' : 'text-gray-600'}`}>
                  <div className="text-base sm:text-lg font-bold tabular-nums leading-none">{count}</div>
                  <div
                    className={
                      isSelected
                        ? 'text-[10px] font-medium uppercase tracking-wide text-indigo-100/90'
                        : ADM.statLabel
                    }
                  >
                    utilisateurs
                  </div>
                </div>
              </div>
              <h3 className={`font-bold text-sm mb-1 leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                {role.label}
              </h3>
              <p
                className={`text-[11px] mb-1.5 leading-snug line-clamp-2 ${
                  isSelected ? 'text-indigo-100' : 'text-gray-600'
                }`}
              >
                {role.description}
              </p>
              {isSelected && (
                <div className="mt-2 pt-2 border-t border-white/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5 text-white/95">
                    Permissions
                  </p>
                  <ul className="space-y-0.5 max-h-32 overflow-y-auto pr-0.5">
                    {role.permissions.map((permission, idx) => (
                      <li key={idx} className="text-[10px] text-indigo-100/95 flex items-start gap-1 leading-snug">
                        <FiCheckCircle className="w-2.5 h-2.5 mt-0.5 shrink-0" />
                        <span>{permission}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Filtres */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher un utilisateur..."
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => setSelectedRole('all')}
            className={selectedRole === 'all' ? 'bg-indigo-50 border-indigo-500' : ''}
          >
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Tous les rôles
          </Button>
        </div>
      </Card>

      {/* Liste des utilisateurs */}
      <Card>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-gray-800">
              {selectedRole === 'all' ? 'Tous les utilisateurs' : roles.find(r => r.id === selectedRole)?.label}
            </h3>
            <Badge className="bg-indigo-100 text-indigo-800">
              {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={exportUsersToCSV}
              className="flex items-center"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button
              variant="secondary"
              onClick={exportUsersToJSON}
              className="flex items-center"
            >
              <FiDownload className="w-4 h-4 mr-2" />
              JSON
            </Button>
            <Button
              variant="secondary"
              onClick={exportUsersToPDF}
              className="flex items-center"
            >
              <FiFileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {usersLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement des utilisateurs...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <FiUsers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className={userTh}>Utilisateur</th>
                  <th className={userTh}>Rôle</th>
                  <th className={userTh}>Contact</th>
                  <th className={userTh}>Informations</th>
                  <th className={userTh}>Statut</th>
                  <th className={userTh}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className={userTd}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={user.avatar}
                          name={`${user.firstName} ${user.lastName}`}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 leading-tight truncate">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className={userTd}>{getRoleBadge(user.role)}</td>
                    <td className={userTd}>
                      <div className="space-y-0.5">
                        {user.phone && (
                          <div className="flex items-center gap-1.5 text-gray-600 leading-snug">
                            <FiPhone className={`${userCellIcon} mr-0`} />
                            <span className="break-all">{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-gray-600 leading-snug">
                          <FiMail className={userCellIcon} />
                          <span className="break-all">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className={userTd}>
                      <div className="space-y-0.5 text-gray-600 leading-snug">
                        {user.teacherProfile && (
                          <div className="flex items-center gap-1.5">
                            <FiBook className={userCellIcon} />
                            <span>{user.teacherProfile.specialization}</span>
                          </div>
                        )}
                        {user.studentProfile && (
                          <div className="flex items-center gap-1.5">
                            <FiAward className={userCellIcon} />
                            <span>{user.studentProfile.class?.name || 'Non assigné'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <FiCalendar className={userCellIcon} />
                          <span>
                            {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={userTd}>
                      {user.isActive ? (
                        <Badge className="bg-green-100 text-green-800 text-[10px] px-1.5 py-0">
                          <FiCheckCircle className="w-2.5 h-2.5 mr-0.5 inline" />
                          Actif
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-[10px] px-1.5 py-0">
                          <FiX className="w-2.5 h-2.5 mr-0.5 inline" />
                          Inactif
                        </Badge>
                      )}
                    </td>
                    <td className={userTd}>
                      <div className="flex items-center gap-0.5 flex-wrap">
                        <button
                          onClick={() => handleViewUser(user.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Voir les détails"
                        >
                          <FiEye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditUser(user.id)}
                          className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <FiEdit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRoleChange(user)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Changer le rôle"
                        >
                          <FiShield className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                          disabled={toggleUserStatusMutation.isPending}
                          className={`p-1 rounded-lg transition-colors disabled:opacity-50 ${
                            user.isActive
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.isActive ? 'Désactiver' : 'Activer'}
                        >
                          {user.isActive ? (
                            <FiLock className="w-3.5 h-3.5" />
                          ) : (
                            <FiUnlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                          disabled={deleteUserMutation.isPending}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Supprimer"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal pour changer le rôle */}
      <Modal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setSelectedUser(null);
        }}
        title="Changer le rôle de l'utilisateur"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
              <Avatar
                src={selectedUser.avatar}
                name={`${selectedUser.firstName} ${selectedUser.lastName}`}
                size="md"
              />
              <div>
                <h4 className="font-bold text-gray-800">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h4>
                <p className="text-sm text-gray-600">{selectedUser.email}</p>
                <div className="mt-2">
                  {getRoleBadge(selectedUser.role)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nouveau rôle <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {roles
                  .filter((role) => ['ADMIN', 'TEACHER', 'STUDENT', 'PARENT'].includes(role.id))
                  .map((role) => {
                  const Icon = role.icon;
                  const isSelected = newRole === role.id;
                  return (
                    <button
                      key={role.id}
                      onClick={() => setNewRole(role.id as Role)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-indigo-500 bg-gradient-to-br ${role.color} text-white`
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">{role.label}</div>
                          <div className={`text-xs ${isSelected ? 'text-white/90' : 'text-gray-500'}`}>
                            {role.description}
                          </div>
                        </div>
                        {isSelected && (
                          <FiCheck className="w-5 h-5 ml-auto" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {newRole !== selectedUser.role && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Attention</p>
                    <p>Le changement de rôle affectera les permissions et l'accès de cet utilisateur.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRoleModalOpen(false);
                  setSelectedUser(null);
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={confirmRoleChange}
                disabled={newRole === selectedUser.role || updateRoleMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <FiRefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mise à jour...
                  </>
                ) : (
                  <>
                    <FiCheck className="w-4 h-4 mr-2" />
                    Confirmer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* User Details Modal */}
      {selectedUserId && (
        <UserDetailsModal
          isOpen={isUserDetailsModalOpen}
          onClose={() => {
            setIsUserDetailsModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
          onEdit={() => {
            setIsUserDetailsModalOpen(false);
            setIsEditUserModalOpen(true);
          }}
          onToggleStatus={() => {
            const user = users?.find((u: any) => u.id === selectedUserId);
            if (user) {
              handleToggleUserStatus(selectedUserId, user.isActive);
            }
          }}
        />
      )}

      {/* Edit User Modal */}
      {selectedUserId && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUserId(null);
          }}
          userId={selectedUserId}
        />
      )}
    </div>
  );
};

export default MultiRolesManagement;

