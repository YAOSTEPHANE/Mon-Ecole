export type AssignInvoicesResult = {
    updated: number;
    numbers: string[];
};
/**
 * Attribue des numéros de facture aux lignes de frais sans numéro (ordre chronologique).
 * Format : {prefix}-{annéeSanitisée}-{000001}
 */
export declare function assignTuitionFeeInvoiceNumbers(options: {
    prefix?: string;
    academicYear?: string | null;
    limit?: number;
}): Promise<AssignInvoicesResult>;
export type AutoReminderResult = {
    notifiedFees: number;
    parentNotifications: number;
};
/**
 * Notifications in-app (+ e-mail si configuré) pour échéances dépassées ou sous 7 jours.
 * Respecte un intervalle minimum entre deux envois par ligne de frais.
 */
export declare function runAutomaticTuitionReminders(options?: {
    minIntervalDays?: number;
    upcomingDays?: number;
}): Promise<AutoReminderResult>;
/** Notifie l'élève et les parents liés lors de la création ou mise à jour d'une ligne de frais. */
export declare function notifyTuitionFeeChanged(params: {
    studentId: string;
    period: string;
    academicYear: string;
    amount: number;
    dueDate: Date;
    kind: 'created' | 'updated';
    previousAmount?: number;
}): Promise<void>;
/** Marque un reçu « disponible » côté client PDF (référence stable). */
export declare function autoReceiptUrl(paymentReference: string): string;
//# sourceMappingURL=tuition-financial-automation.util.d.ts.map