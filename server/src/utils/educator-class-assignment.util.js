"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.educatorClassAssignmentInclude = void 0;
exports.parseEducatorClassIds = parseEducatorClassIds;
exports.getAssignedClassIds = getAssignedClassIds;
exports.getAssignedClassIdsForUserId = getAssignedClassIdsForUserId;
exports.syncEducatorClassAssignments = syncEducatorClassAssignments;
exports.isStudentInEducatorScope = isStudentInEducatorScope;
exports.isClassInEducatorScope = isClassInEducatorScope;
exports.studentClassFilter = studentClassFilter;
exports.classIdFilter = classIdFilter;
const prisma_1 = __importDefault(require("./prisma"));
const objectIdHex = /^[a-f0-9]{24}$/i;
function parseEducatorClassIds(raw) {
    if (!Array.isArray(raw))
        return [];
    const ids = raw
        .filter((id) => typeof id === 'string' && objectIdHex.test(id.trim()))
        .map((id) => id.trim());
    return [...new Set(ids)];
}
async function getAssignedClassIds(educatorId) {
    const rows = await prisma_1.default.educatorClassAssignment.findMany({
        where: { educatorId },
        select: { classId: true },
    });
    return rows.map((r) => r.classId);
}
async function getAssignedClassIdsForUserId(userId) {
    const educator = await prisma_1.default.educator.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!educator)
        return null;
    return getAssignedClassIds(educator.id);
}
async function syncEducatorClassAssignments(educatorId, classIds) {
    const unique = [...new Set(classIds)];
    if (unique.length === 0) {
        await prisma_1.default.educatorClassAssignment.deleteMany({ where: { educatorId } });
        return;
    }
    const existingClasses = await prisma_1.default.class.findMany({
        where: { id: { in: unique } },
        select: { id: true },
    });
    const validIds = new Set(existingClasses.map((c) => c.id));
    const invalid = unique.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
        throw new Error(`Classes introuvables : ${invalid.join(', ')}`);
    }
    await prisma_1.default.$transaction(async (tx) => {
        await tx.educatorClassAssignment.deleteMany({ where: { educatorId } });
        if (unique.length > 0) {
            await tx.educatorClassAssignment.createMany({
                data: unique.map((classId) => ({ educatorId, classId })),
            });
        }
    });
}
async function isStudentInEducatorScope(educatorUserId, studentId) {
    const classIds = await getAssignedClassIdsForUserId(educatorUserId);
    if (classIds === null || classIds.length === 0)
        return false;
    const student = await prisma_1.default.student.findFirst({
        where: { id: studentId, ...studentClassFilter(classIds) },
        select: { id: true },
    });
    return !!student;
}
async function isClassInEducatorScope(educatorUserId, classId) {
    const classIds = await getAssignedClassIdsForUserId(educatorUserId);
    if (!classIds?.length)
        return false;
    return classIds.includes(classId);
}
function studentClassFilter(classIds) {
    if (classIds.length === 0) {
        return { id: { in: [] } };
    }
    return { classId: { in: classIds }, isActive: true };
}
function classIdFilter(classIds) {
    if (classIds.length === 0) {
        return { id: { in: [] } };
    }
    return { id: { in: classIds } };
}
exports.educatorClassAssignmentInclude = {
    classAssignments: {
        include: {
            class: { select: { id: true, name: true, level: true, academicYear: true } },
        },
        orderBy: { createdAt: 'asc' },
    },
};
//# sourceMappingURL=educator-class-assignment.util.js.map