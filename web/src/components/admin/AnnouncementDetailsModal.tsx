import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import FilterDropdown from '../ui/FilterDropdown';
import toast from 'react-hot-toast';
import {
  FiX,
  FiUser,
  FiClock,
  FiLoader,
  FiTrash2,
  FiEdit,
  FiSave,
  FiAlertCircle,
  FiCheckCircle,
  FiBook,
  FiCalendar,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AnnouncementDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcementId: string;
}

const AnnouncementDetailsModal: React.FC<AnnouncementDetailsModalProps> = ({
  isOpen,
  onClose,
  announcementId,
}) => {
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetRole: '',
    targetClass: '',
    priority: 'normal',
    expiresAt: '',
  });

  const { data: announcement, isLoading } = useQuery({
    queryKey: ['announcement', announcementId],
    queryFn: () => adminApi.getAnnouncement(announcementId),
    enabled: isOpen && !!announcementId,
  });

  const { data: classes } = useQuery({
    queryKey: ['classes'],
    queryFn: adminApi.getClasses,
    enabled: isOpen,
  });

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        targetRole: announcement.targetRole || '',
        targetClass: announcement.targetClassId || '',
        priority: announcement.priority || 'normal',
        expiresAt: announcement.expiresAt
          ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
          : '',
      });
    }
  }, [announcement]);

  const updateAnnouncementMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateAnnouncement(announcementId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['announcement', announcementId] });
      toast.success('Annonce mise à jour avec succès');
      setIsEditMode(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la mise à jour de l\'annonce');
    },
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: adminApi.deleteAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success('Annonce supprimée avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression de l\'annonce');
    },
  });

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    updateAnnouncementMutation.mutate({
      title: formData.title.trim(),
      content: formData.content.trim(),
      targetRole: formData.targetRole || null,
      targetClass: formData.targetClass || null,
      priority: formData.priority,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
    });
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      deleteAnnouncementMutation.mutate(announcementId);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap: Record<string, { label: string; color: string }> = {
      low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
      normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
      high: { label: 'Haute', color: 'bg-yellow-100 text-yellow-800' },
      urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' },
    };
    const priorityInfo = priorityMap[priority] || priorityMap.normal;
    return <Badge className={priorityInfo.color}>{priorityInfo.label}</Badge>;
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chargement..." size="lg">
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-gray-600">Chargement de l'annonce...</p>
        </div>
      </Modal>
    );
  }

  if (!announcement) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erreur" size="lg">
        <div className="text-center py-8">
          <FiX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Annonce non trouvée</p>
          <Button onClick={onClose} className="mt-6">
            Fermer
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h2 className="text-2xl font-bold text-gray-900">Détails de l'Annonce</h2>
          <div className="flex items-center space-x-2">
            {!isEditMode && (
              <button
                onClick={() => setIsEditMode(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Modifier"
              >
                <FiEdit className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleteAnnouncementMutation.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Supprimer"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isEditMode ? (
          /* Edit Mode */
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Titre <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Titre de l'annonce"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contenu <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Contenu de l'annonce"
                rows={6}
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-pink-500/20 focus:border-pink-500 transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle cible</label>
                <FilterDropdown
                  value={formData.targetRole}
                  onChange={(value) => setFormData({ ...formData, targetRole: value })}
                  options={[
                    { value: '', label: 'Tous les rôles' },
                    { value: 'ADMIN', label: 'Administrateurs' },
                    { value: 'TEACHER', label: 'Enseignants' },
                    { value: 'STUDENT', label: 'Élèves' },
                    { value: 'PARENT', label: 'Parents' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Classe cible</label>
                <FilterDropdown
                  value={formData.targetClass}
                  onChange={(value) => setFormData({ ...formData, targetClass: value })}
                  options={[
                    { value: '', label: 'Toutes les classes' },
                    ...(classes?.map((c: any) => ({ value: c.id, label: c.name })) || []),
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Priorité</label>
                <FilterDropdown
                  value={formData.priority}
                  onChange={(value) => setFormData({ ...formData, priority: value })}
                  options={[
                    { value: 'low', label: 'Basse' },
                    { value: 'normal', label: 'Normale' },
                    { value: 'high', label: 'Haute' },
                    { value: 'urgent', label: 'Urgente' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Date d'expiration</label>
                <Input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditMode(false);
                  if (announcement) {
                    setFormData({
                      title: announcement.title || '',
                      content: announcement.content || '',
                      targetRole: announcement.targetRole || '',
                      targetClass: announcement.targetClassId || '',
                      priority: announcement.priority || 'normal',
                      expiresAt: announcement.expiresAt
                        ? new Date(announcement.expiresAt).toISOString().slice(0, 16)
                        : '',
                    });
                  }
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateAnnouncementMutation.isPending}
                className="bg-pink-600 hover:bg-pink-700"
              >
                {updateAnnouncementMutation.isPending ? (
                  <>
                    <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <FiSave className="w-4 h-4 mr-2" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-start space-x-4 mb-4">
                <Avatar
                  src={announcement.author.avatar}
                  name={`${announcement.author.firstName} ${announcement.author.lastName}`}
                  size="lg"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {announcement.author.firstName} {announcement.author.lastName}
                    </h3>
                    <Badge className="bg-indigo-100 text-indigo-800">
                      {announcement.author.role}
                    </Badge>
                    {announcement.published ? (
                      <Badge className="bg-green-100 text-green-800">
                        <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                        Publiée
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        Brouillon
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{announcement.author.email}</p>
                  <div className="flex items-center text-xs text-gray-500">
                    <FiClock className="w-3 h-3 mr-1" />
                    {format(new Date(announcement.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <h4 className="font-semibold text-gray-800 mb-1">Titre:</h4>
                <p className="text-gray-700">{announcement.title}</p>
              </div>

              <div className="mb-3">
                <h4 className="font-semibold text-gray-800 mb-2">Contenu:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </div>

              <div className="flex items-center space-x-4 flex-wrap gap-2">
                {getPriorityBadge(announcement.priority)}
                {announcement.targetRole && (
                  <Badge className="bg-indigo-100 text-indigo-800">
                    {announcement.targetRole}
                  </Badge>
                )}
                {announcement.targetClassRelation && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <FiBook className="w-3 h-3 mr-1 inline" />
                    {announcement.targetClassRelation.name}
                  </Badge>
                )}
                {announcement.expiresAt && (
                  <div className="flex items-center text-sm text-gray-600">
                    <FiCalendar className="w-4 h-4 mr-1" />
                    Expire le: {format(new Date(announcement.expiresAt), 'dd/MM/yyyy', { locale: fr })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!isEditMode && (
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button onClick={onClose} variant="secondary">
              Fermer
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AnnouncementDetailsModal;






