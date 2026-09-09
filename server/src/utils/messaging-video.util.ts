import type { Message, Role } from '@prisma/client';
import prisma from './prisma';
import { buildJitsiMeetingUrl } from './student-risk-ai.util';
import {
  createInternalPlatformMessage,
  isPlatformMessagingRole,
  makeDmThreadKey,
  parentLinkedToTeacherUser,
} from './internal-messaging.util';

export type MessagingVideoRoomResult = {
  meetingUrl: string;
  threadKey: string;
  message: Message;
};

function parseDmThreadParticipants(threadKey: string): [string, string] | null {
  if (!threadKey.startsWith('dm_')) return null;
  const parts = threadKey.slice(3).split('__');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return parts[0] < parts[1] ? [parts[0], parts[1]] : [parts[1], parts[0]];
}

export async function assertMessagingThreadAccess(
  userId: string,
  threadKey: string,
  receiverId: string
): Promise<void> {
  const trimmedKey = threadKey.trim();
  const trimmedReceiver = receiverId.trim();
  if (!trimmedKey || !trimmedReceiver) {
    throw new Error('Conversation invalide');
  }

  const expectedDmKey = makeDmThreadKey(userId, trimmedReceiver);
  if (trimmedKey === expectedDmKey) return;

  const dmParts = parseDmThreadParticipants(trimmedKey);
  if (dmParts && (dmParts[0] === userId || dmParts[1] === userId)) {
    const peerId = dmParts[0] === userId ? dmParts[1] : dmParts[0];
    if (peerId !== trimmedReceiver) {
      throw new Error('Destinataire incompatible avec cette conversation');
    }
    return;
  }

  const existing = await prisma.message.findFirst({
    where: {
      threadKey: trimmedKey,
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { id: true },
  });
  if (!existing) {
    throw new Error('Conversation introuvable ou accès refusé');
  }
}

export async function assertMessagingVideoRecipientAccess(
  senderId: string,
  senderRole: Role,
  receiverId: string
): Promise<void> {
  const receiver = await prisma.user.findUnique({
    where: { id: receiverId },
    select: { id: true, role: true, isActive: true },
  });
  if (!receiver || !receiver.isActive) {
    throw new Error('Destinataire introuvable');
  }
  if (!isPlatformMessagingRole(receiver.role)) {
    throw new Error('Destinataire non autorisé pour la visioconférence');
  }

  if (senderRole === 'PARENT' && receiver.role === 'TEACHER') {
    const ok = await parentLinkedToTeacherUser(senderId, receiver.id);
    if (!ok) {
      throw new Error('Vous ne pouvez lancer un appel qu’avec les enseignants de vos enfants');
    }
  }
}

export function buildMessagingVideoMeetingUrl(threadKey: string): string {
  return buildJitsiMeetingUrl(threadKey, 'visio');
}

export async function createMessagingVideoRoom(params: {
  senderId: string;
  senderRole: Role;
  receiverId: string;
  threadKey: string;
}): Promise<MessagingVideoRoomResult> {
  const threadKey = params.threadKey.trim();
  const receiverId = params.receiverId.trim();

  await assertMessagingThreadAccess(params.senderId, threadKey, receiverId);
  await assertMessagingVideoRecipientAccess(params.senderId, params.senderRole, receiverId);

  const meetingUrl = buildMessagingVideoMeetingUrl(threadKey);
  const content = [
    'Appel vidéo proposé.',
    '',
    'Rejoignez la visioconférence :',
    meetingUrl,
    '',
    'Ce lien est associé à cette conversation.',
  ].join('\n');

  const message = await createInternalPlatformMessage({
    senderId: params.senderId,
    receiverId,
    subject: 'Appel vidéo',
    content,
    category: 'GENERAL',
    threadKey,
    attachmentUrls: [meetingUrl],
  });

  return { meetingUrl, threadKey, message };
}
