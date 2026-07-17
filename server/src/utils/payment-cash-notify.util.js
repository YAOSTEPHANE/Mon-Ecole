"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyStaffOfPendingCashPayment = notifyStaffOfPendingCashPayment;
const notify_important_util_1 = require("./notify-important.util");
const staff_notify_util_1 = require("./staff-notify.util");
const CASH_NOTIFY_STAFF_MODULES = [
    'treasury',
    'payments_mgmt',
    'fees_mgmt',
    'counter',
    'notifications_mgmt',
];
async function resolveCashPaymentRecipientIds() {
    const adminIds = await (0, staff_notify_util_1.resolveActiveAdminUserIds)();
    const staffIds = await (0, staff_notify_util_1.resolveStaffUserIdsWithAnyModule)(CASH_NOTIFY_STAFF_MODULES);
    return [...new Set([...adminIds, ...staffIds])];
}
/** Alertes admin + économe lors d’une déclaration espèces en attente de validation. */
async function notifyStaffOfPendingCashPayment(payload) {
    const recipients = await resolveCashPaymentRecipientIds();
    if (recipients.length === 0)
        return;
    const studentName = `${payload.studentFirstName} ${payload.studentLastName}`.trim();
    const ref = payload.paymentReference?.trim() || payload.paymentId.slice(-8);
    const periodLabel = payload.period && payload.academicYear
        ? ` (${payload.period}, ${payload.academicYear})`
        : '';
    const amountStr = `${Math.round(payload.amount)} FCFA`;
    const title = 'Paiement espèces à valider';
    const content = `${studentName} — ${amountStr}${periodLabel} — déclaration ${payload.payerRole === 'PARENT' ? 'parent' : 'élève'} ` +
        `(réf. ${ref}). Validez après encaissement au guichet.`;
    await (0, notify_important_util_1.notifyUsersImportant)(recipients, {
        type: 'payment_pending_cash',
        title,
        content,
        link: '/staff?tab=payments_mgmt',
        email: undefined,
    });
}
//# sourceMappingURL=payment-cash-notify.util.js.map