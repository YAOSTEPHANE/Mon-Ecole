"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCanAccessSensitiveUpload = userCanAccessSensitiveUpload;
const prisma_1 = __importDefault(require("./prisma"));
const sensitive_upload_path_util_1 = require("./sensitive-upload-path.util");
const ADMIN_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'STAFF']);
function urlMatchesStored(stored, requestPath) {
    const rel = (0, sensitive_upload_path_util_1.uploadRelativePathFromStoredUrl)(stored);
    if (!rel)
        return false;
    return (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(rel) === (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(requestPath);
}
/** Vérifie si l’utilisateur authentifié peut lire ce fichier sensible. */
async function userCanAccessSensitiveUpload(user, requestPath) {
    const path = (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(requestPath);
    if (!path)
        return false;
    const pathLower = path.toLowerCase();
    if (pathLower.includes('/identity-documents/')) {
        const doc = await prisma_1.default.identityDocument.findFirst({
            where: { fileUrl: { contains: path.split('/').pop() ?? '___none___' } },
            select: { studentId: true, student: { select: { userId: true, schoolId: true } } },
        });
        if (!doc)
            return false;
        if (user.role === 'STUDENT') {
            return doc.student.userId === user.id;
        }
        if (ADMIN_ROLES.has(user.role)) {
            if (user.role === 'SUPER_ADMIN')
                return true;
            if (!doc.student.schoolId)
                return user.role === 'ADMIN';
            const member = await prisma_1.default.schoolMember.findFirst({
                where: { userId: user.id, schoolId: doc.student.schoolId },
            });
            return !!member;
        }
        if (user.role === 'PARENT') {
            const link = await prisma_1.default.studentParent.findFirst({
                where: { parent: { userId: user.id }, studentId: doc.studentId },
            });
            return !!link;
        }
        return false;
    }
    if (pathLower.includes('/admission-documents/')) {
        return user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'STAFF';
    }
    if (pathLower.includes('/teacher-admin-documents/')) {
        if (user.role === 'SUPER_ADMIN')
            return true;
        if (ADMIN_ROLES.has(user.role))
            return true;
        if (user.role === 'TEACHER') {
            const filename = path.split('/').pop() ?? '';
            const teacher = await prisma_1.default.teacher.findFirst({
                where: { userId: user.id },
                select: { id: true },
            });
            if (!teacher)
                return false;
            const docs = await prisma_1.default.teacherAdministrativeDocument.findMany({
                where: { teacherId: teacher.id },
                select: { fileUrl: true },
            });
            return docs.some((d) => urlMatchesStored(d.fileUrl, path));
        }
        return false;
    }
    return false;
}
//# sourceMappingURL=upload-access-authorization.util.js.map