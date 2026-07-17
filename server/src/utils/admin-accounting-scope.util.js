"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveAccountingScope = resolveAccountingScope;
exports.resolvePaymentStudentScope = resolvePaymentStudentScope;
exports.assertSupplierInSchool = assertSupplierInSchool;
exports.assertSchoolExpenseInSchool = assertSchoolExpenseInSchool;
exports.assertPettyCashInSchool = assertPettyCashInSchool;
exports.assertBudgetLineInSchool = assertBudgetLineInSchool;
const school_context_util_1 = require("./school-context.util");
const prisma_1 = __importDefault(require("./prisma"));
function resolveAccountingScope(req) {
    const schoolId = req.schoolId;
    const isDefault = req.school?.isDefault ?? false;
    return { schoolId, isDefault, where: (0, school_context_util_1.accountingScopeWhere)(schoolId, isDefault) };
}
function resolvePaymentStudentScope(req) {
    const { schoolId, isDefault } = resolveAccountingScope(req);
    return (0, school_context_util_1.studentScopeWhere)(schoolId, isDefault);
}
async function assertSupplierInSchool(id, req) {
    const { where } = resolveAccountingScope(req);
    const row = await prisma_1.default.supplier.findFirst({ where: { id, ...where }, select: { id: true } });
    return Boolean(row);
}
async function assertSchoolExpenseInSchool(id, req) {
    const { where } = resolveAccountingScope(req);
    const row = await prisma_1.default.schoolExpense.findFirst({
        where: { id, ...where },
        select: { id: true },
    });
    return Boolean(row);
}
async function assertPettyCashInSchool(id, req) {
    const { where } = resolveAccountingScope(req);
    const row = await prisma_1.default.pettyCashMovement.findFirst({
        where: { id, ...where },
        select: { id: true },
    });
    return Boolean(row);
}
async function assertBudgetLineInSchool(id, req) {
    const { where } = resolveAccountingScope(req);
    const row = await prisma_1.default.budgetLine.findFirst({
        where: { id, ...where },
        select: { id: true },
    });
    return Boolean(row);
}
//# sourceMappingURL=admin-accounting-scope.util.js.map