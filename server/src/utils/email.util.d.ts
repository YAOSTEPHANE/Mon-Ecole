/**
 * Génère un token de réinitialisation de mot de passe
 */
export declare const generateResetToken: () => string;
/**
 * Crée et sauvegarde un token de réinitialisation dans la base de données
 * @param expiresInHours durée de validité (défaut 1 h pour « mot de passe oublié »)
 */
export declare const createPasswordResetToken: (userId: string, expiresInHours?: number) => Promise<string>;
/**
 * Vérifie si un token de réinitialisation est valide
 */
export declare const verifyResetToken: (token: string) => Promise<{
    valid: boolean;
    userId?: string;
}>;
/**
 * Marque un token comme utilisé
 */
export declare const markTokenAsUsed: (token: string) => Promise<void>;
/** URL du front (première origine CORS) — liens dans e-mails / notifications push */
export declare function getPublicFrontendBase(): string;
export declare function isSmtpConfigured(): boolean;
/**
 * E-mail HTML/text générique (alertes importantes).
 */
export declare function sendTransactionalHtmlEmail(to: string, subject: string, text: string, html: string): Promise<{
    ok: boolean;
}>;
/**
 * Génère le lien de réinitialisation de mot de passe
 */
export declare const getResetPasswordUrl: (token: string) => string;
/**
 * Envoie un email de réinitialisation de mot de passe (SMTP si configuré, sinon log console).
 */
export declare const sendPasswordResetEmail: (email: string, token: string, firstName: string) => Promise<void>;
/**
 * E-mail envoyé lorsqu’un compte est créé sans mot de passe : même page que la réinitialisation.
 */
export declare const sendWelcomeSetPasswordEmail: (email: string, token: string, firstName: string) => Promise<void>;
/**
 * Envoie un email de message
 */
export declare const sendMessageEmail: (email: string, subject: string, content: string, senderName: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export type AttendanceEmailPayload = {
    to: string;
    parentFirstName: string;
    studentFullName: string;
    statusLabel: string;
    courseLine: string;
    dateStr: string;
    timeStr: string;
    senderName: string;
    /** Détail optionnel (ex. durée du retard) */
    detailLine?: string;
    punchPhase?: 'CHECK_IN' | 'CHECK_OUT';
};
/**
 * Courriel aux parents lors d’un pointage (présence / absence).
 */
export declare const sendAttendanceNotificationEmail: (payload: AttendanceEmailPayload) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
export type TeacherLeaveDecisionPayload = {
    to: string;
    teacherFirstName: string;
    decision: 'APPROVED' | 'REJECTED';
    leaveTypeLabel: string;
    startDateStr: string;
    endDateStr: string;
    adminComment?: string | null;
};
/**
 * Courriel à l’enseignant lorsque la direction approuve ou refuse une demande de congé.
 */
export declare const sendTeacherLeaveDecisionEmail: (payload: TeacherLeaveDecisionPayload) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
//# sourceMappingURL=email.util.d.ts.map