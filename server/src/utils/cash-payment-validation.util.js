"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPendingCashPayments = listPendingCashPayments;
exports.validateCashPayment = validateCashPayment;
exports.rejectCashPayment = rejectCashPayment;
const prisma_1 = __importDefault(require("./prisma"));
const tuition_financial_automation_util_1 = require("./tuition-financial-automation.util");
const tuition_fee_paid_sync_util_1 = require("./tuition-fee-paid-sync.util");
const parent_notify_util_1 = require("./parent-notify.util");
const school_access_guard_util_1 = require("./school-access-guard.util");
const PENDING_CASH_INCLUDE = {
    tuitionFee: { select: { period: true, academicYear: true, amount: true } },
    student: {
        include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            class: { select: { name: true, level: true } },
        },
    },
    payer: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
};
async function listPendingCashPayments(client = prisma_1.default, schoolId) {
    return client.payment.findMany({
        where: {
            status: 'PENDING',
            paymentMethod: 'CASH',
            payerRole: { in: ['STUDENT', 'PARENT'] },
            ...(schoolId ? { student: { OR: [{ schoolId }, { class: { schoolId } }] } } : {}),
        },
        orderBy: { createdAt: 'asc' },
        include: PENDING_CASH_INCLUDE,
    });
}
function assertPendingCashFromPortal(payment) {
    if (payment.status !== 'PENDING') {
        throw Object.assign(new Error('Ce paiement n’est plus en attente de validation'), { status: 400 });
    }
    if (payment.paymentMethod !== 'CASH') {
        throw Object.assign(new Error('Seuls les paiements espèces déclarés en ligne sont validables ici'), {
            status: 400,
        });
    }
    if (payment.payerRole !== 'STUDENT' && payment.payerRole !== 'PARENT') {
        throw Object.assign(new Error('Paiement non éligible à cette validation'), { status: 400 });
    }
}
async function validateCashPayment(client, paymentId, validator, schoolId) {
    if (schoolId) {
        await (0, school_access_guard_util_1.assertPaymentInSchool)(paymentId, schoolId);
    }
    const payment = await client.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
        throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
    }
    assertPendingCashFromPortal(payment);
    const validationNote = `Validé par l'économe (${validator.name}) le ${new Date().toLocaleString('fr-FR')}`;
    const notes = payment.notes ? `${payment.notes} — ${validationNote}` : validationNote;
    const updated = await client.payment.update({
        where: { id: paymentId },
        data: {
            status: 'COMPLETED',
            transactionId: `CASH-VAL-${Date.now()}`,
            paidAt: new Date(),
            receiptUrl: (0, tuition_financial_automation_util_1.autoReceiptUrl)(payment.paymentReference || paymentId),
            notes,
        },
        include: PENDING_CASH_INCLUDE,
    });
    await (0, tuition_fee_paid_sync_util_1.syncTuitionFeePaidStatusForFeeId)(client, payment.tuitionFeeId);
    void (0, parent_notify_util_1.notifyParentCashPaymentValidated)(paymentId).catch((err) => console.error('notifyParentCashPaymentValidated:', err));
    return updated;
}
async function rejectCashPayment(client, paymentId, validator, reason, schoolId) {
    if (schoolId) {
        await (0, school_access_guard_util_1.assertPaymentInSchool)(paymentId, schoolId);
    }
    const payment = await client.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
        throw Object.assign(new Error('Paiement introuvable'), { status: 404 });
    }
    assertPendingCashFromPortal(payment);
    const rejectionNote = `Refusé par l'économe (${validator.name})${reason?.trim() ? ` : ${reason.trim()}` : ''}`;
    const notes = payment.notes ? `${payment.notes} — ${rejectionNote}` : rejectionNote;
    const updated = await client.payment.update({
        where: { id: paymentId },
        data: {
            status: 'CANCELLED',
            notes,
        },
        include: PENDING_CASH_INCLUDE,
    });
    void (0, parent_notify_util_1.notifyParentCashPaymentRejected)(paymentId, reason).catch((err) => console.error('notifyParentCashPaymentRejected:', err));
    return updated;
}
//# sourceMappingURL=cash-payment-validation.util.js.map