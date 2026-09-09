import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { createMessagingVideoRoom } from '../utils/messaging-video.util';
import { makeDmThreadKey } from '../utils/internal-messaging.util';

export async function handleCreateMessagingVideoRoom(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { receiverId, threadKey } = req.body as {
      receiverId?: string;
      threadKey?: string;
    };

    if (!receiverId || typeof receiverId !== 'string' || !receiverId.trim()) {
      res.status(400).json({ error: 'receiverId requis' });
      return;
    }

    const trimmedReceiverId = receiverId.trim();
    const trimmedThreadKey =
      threadKey && typeof threadKey === 'string' && threadKey.trim().length > 0
        ? threadKey.trim()
        : makeDmThreadKey(req.user!.id, trimmedReceiverId);

    const result = await createMessagingVideoRoom({
      senderId: req.user!.id,
      senderRole: req.user!.role,
      receiverId: trimmedReceiverId,
      threadKey: trimmedThreadKey,
    });

    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    const status =
      message.includes('introuvable') ||
      message.includes('refusé') ||
      message.includes('incompatible') ||
      message.includes('autorisé') ||
      message.includes('enseignants')
        ? 403
        : 500;
    console.error('POST messaging/video-room:', error);
    res.status(status).json({ error: message });
  }
}
