/**
 * Utilitaires pour l'envoi de SMS.
 * Si TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_PHONE_NUMBER sont définis, envoi via l’API Twilio.
 * Sinon, journalisation console (mode développement).
 */
export declare function isTwilioConfigured(): boolean;
/**
 * Envoie un SMS
 */
export declare const sendSMS: (phoneNumber: string, message: string) => Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
/**
 * Valide un numéro de téléphone
 */
export declare const isValidPhoneNumber: (phoneNumber: string) => boolean;
/**
 * Formate un numéro de téléphone
 */
export declare const formatPhoneNumber: (phoneNumber: string) => string;
//# sourceMappingURL=sms.util.d.ts.map