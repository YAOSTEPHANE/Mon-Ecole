import type { Role } from '@prisma/client';
/**
 * Utilisateurs à notifier lors de la publication d’une annonce (cible rôle et/ou classe).
 */
export declare function resolveAnnouncementRecipientUserIds(ann: {
    targetRole: Role | null;
    targetClassId: string | null;
}): Promise<string[]>;
/**
 * Après publication : notification in-app + e-mail + push web ; SMS optionnels si priorité urgente
 * et `ANNOUNCEMENT_URGENT_SMS=true`.
 */
export declare function notifyUsersAboutPublishedAnnouncement(announcementId: string): Promise<{
    count: number;
}>;
//# sourceMappingURL=announcement-publish-notify.util.d.ts.map