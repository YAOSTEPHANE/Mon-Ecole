import type { Prisma } from '@prisma/client';
/**
 * Utilisateurs pouvant être destinataires de la messagerie interne pour un établissement.
 * Ne se limite pas à school_members (souvent incomplet) : inclut aussi les profils rattachés à l’école.
 */
export declare function schoolMessagingRecipientUsersWhere(schoolId: string, isDefaultSchool?: boolean): Prisma.UserWhereInput;
//# sourceMappingURL=school-messaging-recipients.util.d.ts.map