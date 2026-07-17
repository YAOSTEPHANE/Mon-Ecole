"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchoolAccessDeniedError = void 0;
exports.isObjectId = isObjectId;
exports.studentBelongsToSchool = studentBelongsToSchool;
exports.assertStudentInSchool = assertStudentInSchool;
exports.assertClassInSchool = assertClassInSchool;
exports.assertTuitionFeeInSchool = assertTuitionFeeInSchool;
exports.assertPaymentInSchool = assertPaymentInSchool;
exports.scopedStudentWhere = scopedStudentWhere;
exports.scopedTuitionFeeWhere = scopedTuitionFeeWhere;
exports.scopedPaymentWhere = scopedPaymentWhere;
exports.scopedParentWhere = scopedParentWhere;
exports.assertParentInSchool = assertParentInSchool;
exports.mergeWhereWithSchoolScope = mergeWhereWithSchoolScope;
const prisma_1 = __importDefault(require("./prisma"));
const school_context_util_1 = require("./school-context.util");
class SchoolAccessDeniedError extends Error {
    constructor(message = 'Accès refusé pour cet établissement.') {
        super(message);
        this.status = 403;
        this.name = 'SchoolAccessDeniedError';
    }
}
exports.SchoolAccessDeniedError = SchoolAccessDeniedError;
const OBJECT_ID = /^[a-f\d]{24}$/i;
function isObjectId(value) {
    return OBJECT_ID.test(value);
}
/**
 * Vérifie l’appartenance à l’établissement (logique explicite, fiable MongoDB legacy).
 * Alignée sur studentScopeWhere : schoolId direct, classe rattachée, orphelins → établissement par défaut.
 */
async function studentBelongsToSchool(studentId, schoolId, isDefaultSchool = false) {
    if (!isObjectId(studentId))
        return false;
    const row = await prisma_1.default.student.findFirst({
        where: {
            id: studentId,
            ...(0, school_context_util_1.studentScopeWhere)(schoolId, isDefaultSchool),
        },
        select: { id: true },
    });
    return Boolean(row);
}
async function assertStudentInSchool(studentId, schoolId, isDefaultSchool = false) {
    if (!schoolId)
        throw new SchoolAccessDeniedError('Établissement actif requis (en-tête X-School-Id).');
    if (!(await studentBelongsToSchool(studentId, schoolId, isDefaultSchool))) {
        throw new SchoolAccessDeniedError('Élève introuvable dans cet établissement.');
    }
}
async function assertClassInSchool(classId, schoolId, isDefaultSchool = false) {
    if (!schoolId)
        throw new SchoolAccessDeniedError('Établissement actif requis (en-tête X-School-Id).');
    if (!isObjectId(classId))
        throw new SchoolAccessDeniedError('Classe invalide.');
    const row = await prisma_1.default.class.findFirst({
        where: { id: classId, ...(0, school_context_util_1.classScopeWhere)(schoolId, isDefaultSchool) },
        select: { id: true },
    });
    if (!row)
        throw new SchoolAccessDeniedError('Classe introuvable dans cet établissement.');
}
async function assertTuitionFeeInSchool(feeId, schoolId, isDefaultSchool = false) {
    if (!schoolId)
        throw new SchoolAccessDeniedError('Établissement actif requis (en-tête X-School-Id).');
    const row = await prisma_1.default.tuitionFee.findFirst({
        where: { id: feeId, student: (0, school_context_util_1.studentScopeWhere)(schoolId, isDefaultSchool) },
        select: { id: true },
    });
    if (!row)
        throw new SchoolAccessDeniedError('Frais introuvable dans cet établissement.');
}
async function assertPaymentInSchool(paymentId, schoolId, isDefaultSchool = false) {
    if (!schoolId)
        throw new SchoolAccessDeniedError('Établissement actif requis (en-tête X-School-Id).');
    const row = await prisma_1.default.payment.findFirst({
        where: { id: paymentId, student: (0, school_context_util_1.studentScopeWhere)(schoolId, isDefaultSchool) },
        select: { id: true },
    });
    if (!row)
        throw new SchoolAccessDeniedError('Paiement introuvable dans cet établissement.');
}
/** Filtre Prisma : élève rattaché à l’établissement actif. */
function scopedStudentWhere(schoolId) {
    return (0, school_context_util_1.studentScopeWhere)(schoolId);
}
/** Filtre Prisma : frais de scolarité des élèves de l’établissement. */
function scopedTuitionFeeWhere(schoolId) {
    return { student: (0, school_context_util_1.studentScopeWhere)(schoolId) };
}
/** Filtre Prisma : paiements des élèves de l’établissement. */
function scopedPaymentWhere(schoolId) {
    return { student: (0, school_context_util_1.studentScopeWhere)(schoolId) };
}
/** Filtre Prisma : parents ayant au moins un enfant dans l’établissement. */
function scopedParentWhere(schoolId) {
    return {
        students: {
            some: {
                student: (0, school_context_util_1.studentScopeWhere)(schoolId),
            },
        },
    };
}
async function assertParentInSchool(parentId, schoolId) {
    if (!schoolId)
        throw new SchoolAccessDeniedError('Établissement actif requis (en-tête X-School-Id).');
    if (!isObjectId(parentId))
        throw new SchoolAccessDeniedError('Parent invalide.');
    const row = await prisma_1.default.parent.findFirst({
        where: { id: parentId, ...scopedParentWhere(schoolId) },
        select: { id: true },
    });
    if (!row)
        throw new SchoolAccessDeniedError('Parent introuvable dans cet établissement.');
}
function mergeWhereWithSchoolScope(base, schoolScope) {
    const keys = Object.keys(base);
    if (keys.length === 0)
        return { ...schoolScope };
    return { AND: [base, schoolScope] };
}
//# sourceMappingURL=school-access-guard.util.js.map