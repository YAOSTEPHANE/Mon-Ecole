"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHOOL_PRISMA_HINT = void 0;
exports.getSchoolDelegate = getSchoolDelegate;
exports.getSchoolMemberDelegate = getSchoolMemberDelegate;
exports.isSchoolPrismaReady = isSchoolPrismaReady;
const prisma_1 = __importDefault(require("./prisma"));
exports.SCHOOL_PRISMA_HINT = 'Client Prisma obsolète : arrêtez npm run dev, puis dans server exécutez npx prisma generate et relancez.';
function getSchoolDelegate() {
    const delegate = prisma_1.default.school;
    return delegate ?? null;
}
function getSchoolMemberDelegate() {
    const delegate = prisma_1.default.schoolMember;
    return delegate ?? null;
}
function isSchoolPrismaReady() {
    return getSchoolDelegate() != null && getSchoolMemberDelegate() != null;
}
//# sourceMappingURL=school-prisma.util.js.map