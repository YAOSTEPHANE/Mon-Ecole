"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyParentTuitionBlock = emptyParentTuitionBlock;
exports.getAcademicYearsWithTuitionBlockForParent = getAcademicYearsWithTuitionBlockForParent;
exports.parentTuitionBlockFromYears = parentTuitionBlockFromYears;
const academicYear_util_1 = require("./academicYear.util");
/** Frais pris en compte pour le blocage « scolarité / inscription » côté portail parent. */
const SCOLARITY_FEE_TYPES = ['ENROLLMENT', 'TUITION'];
function emptyParentTuitionBlock() {
    return { active: false, hiddenAcademicYears: [] };
}
/**
 * Années scolaires pour lesquelles l'impayé inscription/scolarité dépasse la fin d'année (+ délai de grâce éventuel).
 */
async function getAcademicYearsWithTuitionBlockForParent(db, studentId, now = new Date()) {
    const feeRows = await db.tuitionFee.findMany({
        where: {
            studentId,
            feeType: { in: SCOLARITY_FEE_TYPES },
        },
        select: {
            academicYear: true,
            amount: true,
            isPaid: true,
            payments: {
                where: { status: 'COMPLETED' },
                select: { amount: true },
            },
        },
    });
    const distinctYears = new Set();
    for (const row of feeRows) {
        const ay = row.academicYear?.trim();
        if (!ay)
            continue;
        const paid = row.payments.reduce((sum, p) => sum + p.amount, 0);
        const remaining = row.amount - paid;
        const unpaid = !row.isPaid || remaining > 0.5;
        if (unpaid) {
            distinctYears.add(ay);
        }
    }
    let graceDays = parseInt(process.env.TUITION_BLOCK_GRACE_DAYS || '0', 10);
    if (!Number.isFinite(graceDays)) {
        graceDays = 0;
    }
    const graceMs = graceDays * 86400000;
    const blocked = new Set();
    for (const ay of distinctYears) {
        const end = (0, academicYear_util_1.schoolYearEndDateFromLabel)(ay);
        if (!end)
            continue;
        if (now.getTime() > end.getTime() + graceMs) {
            blocked.add(ay);
        }
    }
    return blocked;
}
function parentTuitionBlockFromYears(years) {
    const hiddenAcademicYears = [...years].sort();
    return {
        active: hiddenAcademicYears.length > 0,
        hiddenAcademicYears,
    };
}
//# sourceMappingURL=parent-academic-result-access.util.js.map