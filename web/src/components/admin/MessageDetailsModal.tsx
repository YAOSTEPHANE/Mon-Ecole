import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Avatar from '../ui/Avatar';
import Input from '../ui/Input';
import toast from 'react-hot-toast';
import {
  FiX,
  FiUser,
  FiMail,
  FiClock,
  FiSend,
  FiLoader,
  FiTrash2,
  FiCornerUpRight,
  FiCheckCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MessageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: string;
  onReply?: (receiverId: string, subject: string) => void;
}

const MessageDetailsModal: React.FC<MessageDetailsModalProps> = ({
  isOpen,
  onClose,
  messageId,
  onReply,
}) => {
  const queryClient = useQueryClient();
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const { data: message, isLoading } = useQuery({
    queryKey: ['message', messageId],
    queryFn: () => adminApi.getMessage(messageId),
    enabled: isOpen && !!messageId,
  });

  const deleteMessageMutation = useMutation({
    mutationFn: adminApi.deleteMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Message supprimé avec succès');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de la suppression du message');
    },
  });

  const sendReplyMutation = useMutation({
    mutationFn: adminApi.sendMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      toast.success('Réponse envoyée avec succès');
      setReplyContent('');
      setShowReplyForm(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'envoi de la réponse');
    },
  });

  const handleReply = () => {
    if (!replyContent.trim()) {
      toast.error('Veuillez saisir un message');
      return;
    }

    if (!message) return;

    const subject = message.subject ? `Re: ${message.subject}` : 'Re: Message';

    sendReplyMutation.mutate({
      receiverId: message.sender.id,
      subject,
      content: replyContent.trim(),
    });
  };

  const handleDelete = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce message ?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  if (!isOpen) return null;

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Chargement..." size="lg">
        <div className="flex items-center justify-center py-12">
          <FiLoader className="w-8 h-8 animate-spin text-blue-500" />
          <p className="ml-3 text-gray-600">Chargement du message...</p>
        </div>
      </Modal>
    );
  }

  if (!message) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Erreur" size="lg">
        <div className="text-center py-8">
          <FiX className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg text-gray-700">Message non trouvé</p>
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
          <h2 className="text-2xl font-bold text-gray-900">Détails du Message</h2>
          <div className="flex items-center space-x-2">
            {onReply && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Répondre"
              >
                <FiCornerUpRight className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={handleDelete}
              disabled={deleteMessageMutation.isPending}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              title="Supprimer"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-4 mb-4">
            <Avatar
              src={message.sender.avatar}
              name={`${message.sender.firstName} ${message.sender.lastName}`}
              size="lg"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-bold text-gray-900">
                  {message.sender.firstName} {message.sender.lastName}
                </h3>
                <Badge className="bg-indigo-100 text-indigo-800">
                  {message.sender.role}
                </Badge>
                {message.read ? (
                  <Badge className="bg-green-100 text-green-800">
                    <FiCheckCircle className="w-3 h-3 mr-1 inline" />
                    Lu
                  </Badge>
                ) : (
                  <Badge className="bg-blue-100 text-blue-800">
                    Non lu
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-2">{message.sender.email}</p>
              <div className="flex items-center text-xs text-gray-500">
                <FiClock className="w-3 h-3 mr-1" />
                {format(new Date(message.createdAt), 'dd/MM/yyyy à HH:mm', { locale: fr })}
              </div>
            </div>
          </div>

          {message.subject && (
            <div className="mb-3">
              <h4 className="font-semibold text-gray-800 mb-1">Sujet:</h4>
              <p className="text-gray-700">{message.subject}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Message:</h4>
            <p className="text-gray-700 whitespace-pre-wrap">{message.content}</p>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-600">
              <FiUser className="w-4 h-4 mr-2" />
              <span className="font-medium">Destinataire:</span>
              <span className="ml-2">
                {message.receiver.firstName} {message.receiver.lastName} ({message.receiver.role})
              </span>
            </div>
          </div>
        </div>

        {/* Reply Form */}
        {showReplyForm && onReply && (
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-gray-800 mb-3">Répondre</h4>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Votre réponse..."
              rows={4}
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all mb-3"
            />
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
              >
                Annuler
              </Button>
              <Button
                onClick={handleReply}
                disabled={sendReplyMutation.isPending || !replyContent.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {sendReplyMutation.isPending ? (
                  <>
                    <FiLoader className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <FiSend className="w-4 h-4 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

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

export default MessageDetailsModal;

