"use strict";
/** Agrégations financières paiements / impayés par classe, niveau, genre. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GENDER_LABELS = void 0;
exports.normalizeGender = normalizeGender;
exports.emptyMoneyBucket = emptyMoneyBucket;
exports.roundMoney = roundMoney;
exports.finalizeMoneyBuckets = finalizeMoneyBuckets;
exports.studentDimFrom = studentDimFrom;
exports.GENDER_LABELS = {
    MALE: 'Garçons',
    FEMALE: 'Filles',
    OTHER: 'Autre',
    UNKNOWN: 'Non renseigné',
};
function normalizeGender(raw) {
    if (raw === 'MALE' || raw === 'FEMALE' || raw === 'OTHER')
        return raw;
    return 'UNKNOWN';
}
function emptyMoneyBucket(key, label, level) {
    return {
        key,
        label,
        level,
        paidAmount: 0,
        paidCount: 0,
        unpaidAmount: 0,
        unpaidCount: 0,
        overdueAmount: 0,
        overdueCount: 0,
        studentsPaid: 0,
        studentsUnpaid: 0,
    };
}
function roundMoney(n) {
    return Math.round(n * 100) / 100;
}
function finalizeMoneyBuckets(map) {
    return [...map.values()]
        .map((b) => ({
        ...b,
        paidAmount: roundMoney(b.paidAmount),
        unpaidAmount: roundMoney(b.unpaidAmount),
        overdueAmount: roundMoney(b.overdueAmount),
    }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
}
function studentDimFrom(student) {
    return {
        gender: normalizeGender(student.gender),
        classId: student.classId ?? student.class?.id ?? null,
        className: student.class?.name ?? 'Sans classe',
        level: student.class?.level ?? 'Non assigné',
    };
}
//# sourceMappingURL=financial-breakdown.util.js.map