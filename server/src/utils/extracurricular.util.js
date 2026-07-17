"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPortalOfferingWhere = buildPortalOfferingWhere;
exports.registerStudentForExtracurricular = registerStudentForExtracurricular;
const prisma_1 = __importDefault(require("./prisma"));
async function buildPortalOfferingWhere(studentId, academicYear) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isActive: true, enrollmentStatus: true },
    });
    if (!student?.isActive || student.enrollmentStatus !== 'ACTIVE') {
        return null;
    }
    const classOr = [{ classId: null }];
    if (student.classId) {
        classOr.push({ classId: student.classId });
    }
    return {
        isPublished: true,
        isActive: true,
        ...(academicYear?.trim() ? { academicYear: academicYear.trim() } : {}),
        OR: classOr,
    };
}
async function registerStudentForExtracurricular(studentId, offeringId) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        select: { classId: true, isActive: true, enrollmentStatus: true },
    });
    if (!student?.isActive || student.enrollmentStatus !== 'ACTIVE') {
        throw new Error('Élève inactif ou non inscrit.');
    }
    const offering = await prisma_1.default.extracurricularOffering.findFirst({
        where: { id: offeringId, isPublished: true, isActive: true },
    });
    if (!offering) {
        throw new Error('Activité introuvable ou fermée aux inscriptions.');
    }
    if (offering.classId && offering.classId !== student.classId) {
        throw new Error("Cette activité n'est pas proposée pour la classe de l'élève.");
    }
    if (offering.registrationDeadline && new Date() > offering.registrationDeadline) {
        throw new Error('La date limite d’inscription est dépassée.');
    }
    const confirmed = await prisma_1.default.extracurricularRegistration.count({
        where: { offeringId, status: 'CONFIRMED' },
    });
    const max = offering.maxParticipants;
    const status = max != null && max > 0 && confirmed >= max ? 'WAITLIST' : 'CONFIRMED';
    const registration = await prisma_1.default.extracurricularRegistration.create({
        data: {
            offeringId,
            studentId,
            status,
        },
        include: {
            offering: {
                select: {
                    id: true,
                    title: true,
                    kind: true,
                    category: true,
                    startAt: true,
                    endAt: true,
                },
            },
            student: {
                include: {
                    user: { select: { firstName: true, lastName: true } },
                },
            },
        },
    });
    return { registration, status };
}
//# sourceMappingURL=extracurricular.util.js.map