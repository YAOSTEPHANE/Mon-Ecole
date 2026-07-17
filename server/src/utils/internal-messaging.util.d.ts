import type { Message, MessageCategory, Role } from '@prisma/client';
/** Rôles pouvant envoyer / recevoir des messages sur la plateforme. */
export declare const PLATFORM_MESSAGING_ROLES: Set<import(".prisma/client").$Enums.Role>;
export declare function isPlatformMessagingRole(role: string): role is Role;
/** Clé stable pour une conversation 1:1 entre deux utilisateurs */
export declare function makeDmThreadKey(userIdA: string, userIdB: string): string;
export declare function effectiveThreadKey(m: {
    threadKey: string | null;
    senderId: string;
    receiverId: string;
}): string;
export declare function notifyUserNewMessage(params: {
    receiverUserId: string;
    receiverRole: Role;
    senderDisplayName: string;
    subject: string | null;
    contentSnippet: string;
}): Promise<void>;
export declare function createInternalPlatformMessage(params: {
    senderId: string;
    receiverId: string;
    subject?: string | null;
    content: string;
    category?: MessageCategory;
    threadKey?: string | null;
    attachmentUrls?: string[];
}): Promise<Message>;
export declare function teacherTeachesClass(teacherUserId: string, classId: string): Promise<boolean>;
export declare function parentLinkedToTeacherUser(parentUserId: string, teacherUserId: string): Promise<boolean>;
export declare function teacherLinkedToParentUser(teacherUserId: string, parentUserId: string): Promise<boolean>;
//# sourceMappingURL=internal-messaging.util.d.ts.map