export type NewAdmissionNotifyPayload = {
    reference: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    desiredLevel: string;
    academicYear: string;
    parentName?: string | null;
    parentPhone?: string | null;
    parentEmail?: string | null;
    matricule?: string | null;
};
export type AdmissionNotificationRecipients = {
    emails: string[];
    adminPanelUserIds: string[];
    staffPanelUserIds: string[];
};
/** Destinataires e-mail + notifications pour une nouvelle pré-inscription. */
export declare function resolveAdmissionNotificationRecipients(): Promise<AdmissionNotificationRecipients>;
/** @deprecated Utiliser resolveAdmissionNotificationRecipients */
export declare function resolveAdminNotificationEmails(): Promise<string[]>;
export declare function notifyAdminsOfNewAdmission(admission: NewAdmissionNotifyPayload): Promise<void>;
//# sourceMappingURL=admission-notify.util.d.ts.map