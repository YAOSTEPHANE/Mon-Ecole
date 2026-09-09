'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { FiExternalLink, FiVideo } from 'react-icons/fi';
import Button from '../ui/Button';

type Props = {
  threadKey: string;
  receiverId: string;
  peerName?: string;
  className?: string;
  variant?: 'outline' | 'primary';
  invalidateKeys?: string[][];
  createVideoRoom: (payload: { threadKey: string; receiverId: string }) => Promise<{
    meetingUrl: string;
  }>;
};

export default function MessagingVideoCallButton({
  threadKey,
  receiverId,
  peerName,
  className,
  variant = 'outline',
  invalidateKeys = [],
  createVideoRoom,
}: Props) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => createVideoRoom({ threadKey, receiverId }),
    onSuccess: (data) => {
      toast.success('Lien visio envoyé dans la conversation');
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Impossible de démarrer l’appel vidéo';
      toast.error(message);
    },
  });

  return (
    <Button
      type="button"
      variant={variant}
      className={`text-xs shrink-0 ${className ?? ''}`}
      disabled={mutation.isPending}
      onClick={() => mutation.mutate()}
      title={peerName ? `Appel vidéo avec ${peerName}` : 'Démarrer un appel vidéo'}
    >
      <FiVideo className="w-3.5 h-3.5 mr-1.5" />
      {mutation.isPending ? 'Création…' : 'Appel vidéo'}
      <FiExternalLink className="w-3 h-3 ml-1 opacity-70" />
    </Button>
  );
}
