import type { Role } from '@prisma/client';
type AnnouncementTargets = {
    targetRole: Role | null;
    targetClassId: string | null;
};
/**
 * Utilisateurs actifs concernés par une annonce (classe ciblée et/ou rôle).
 */
export declare function getAnnouncementRecipientUserIds(a: AnnouncementTargets): Promise<string[]>;
export {};
//# sourceMappingURL=announcement-recipients.util.d.ts.map