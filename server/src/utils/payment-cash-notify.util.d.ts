export type PendingCashPaymentNotifyPayload = {
    paymentId: string;
    amount: number;
    paymentReference?: string | null;
    studentFirstName: string;
    studentLastName: string;
    period?: string;
    academicYear?: string;
    payerRole: string;
};
/** Alertes admin + économe lors d’une déclaration espèces en attente de validation. */
export declare function notifyStaffOfPendingCashPayment(payload: PendingCashPaymentNotifyPayload): Promise<void>;
//# sourceMappingURL=payment-cash-notify.util.d.ts.map