"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveStudentClassId = resolveStudentClassId;
exports.gradeToPayload = gradeToPayload;
exports.createGradeChangeRequest = createGradeChangeRequest;
exports.createReportCardChangeRequest = createReportCardChangeRequest;
exports.canUserApproveRequest = canUserApproveRequest;
exports.listPendingForUser = listPendingForUser;
exports.listRequestsByRequester = listRequestsByRequester;
exports.applyApprovedRequest = applyApprovedRequest;
exports.approveAcademicChangeRequest = approveAcademicChangeRequest;
exports.rejectAcademicChangeRequest = rejectAcademicChangeRequest;
exports.workflowStatusLabel = workflowStatusLabel;
const prisma_1 = __importDefault(require("./prisma"));
const staff_visible_modules_util_1 = require("./staff-visible-modules.util");
const parent_notify_util_1 = require("./parent-notify.util");
const ACTIVE_STATUSES = [
    'PENDING_MAIN_TEACHER',
    'PENDING_EDUCATOR',
    'PENDING_STUDIES_DIRECTOR',
];
async function resolveStudentClassId(studentId) {
    const student = await prisma_1.default.student.findUnique({
        where: { id: studentId },
        select: { classId: true },
    });
    return student?.classId ?? null;
}
const DUPLICATE_PENDING_MESSAGE = 'Une demande de modification est déjà en cours pour cet élément.';
function throwDuplicatePending() {
    throw Object.assign(new Error(DUPLICATE_PENDING_MESSAGE), { statusCode: 409 });
}
async function assertNoDuplicatePending(params) {
    const where = {
        status: { in: ACTIVE_STATUSES },
        target: params.target,
        kind: params.kind,
    };
    if (params.gradeId) {
        where.gradeId = params.gradeId;
    }
    else if (params.reportCardId) {
        where.reportCardId = params.reportCardId;
    }
    else if (params.studentId) {
        where.studentId = params.studentId;
    }
    const existing = await prisma_1.default.academicChangeRequest.findFirst({ where });
    if (existing) {
        throwDuplicatePending();
    }
}
async function assertNoDuplicateReportCardPending(params) {
    if (params.reportCardId) {
        await assertNoDuplicatePending({
            target: 'REPORT_CARD',
            kind: params.kind,
            reportCardId: params.reportCardId,
        });
        return;
    }
    const pending = await prisma_1.default.academicChangeRequest.findMany({
        where: {
            status: { in: ACTIVE_STATUSES },
            target: 'REPORT_CARD',
            kind: params.kind,
            studentId: params.studentId,
            reportCardId: null,
        },
    });
    const duplicateForSamePeriod = pending.some((row) => {
        const p = row.payload;
        return p.period === params.payload.period && p.academicYear === params.payload.academicYear;
    });
    if (duplicateForSamePeriod) {
        throwDuplicatePending();
    }
}
function gradeToPayload(grade) {
    return {
        studentId: grade.studentId,
        courseId: grade.courseId,
        teacherId: grade.teacherId,
        evaluationType: grade.evaluationType,
        title: grade.title,
        score: grade.score,
        maxScore: grade.maxScore,
        coefficient: grade.coefficient,
        date: grade.date.toISOString(),
        comments: grade.comments,
    };
}
async function createGradeChangeRequest(params) {
    await assertNoDuplicatePending({
        target: 'GRADE',
        kind: params.kind,
        gradeId: params.gradeId,
        studentId: params.gradeId ? undefined : params.studentId,
    });
    const classId = await resolveStudentClassId(params.studentId);
    return prisma_1.default.academicChangeRequest.create({
        data: {
            target: 'GRADE',
            kind: params.kind,
            status: 'PENDING_MAIN_TEACHER',
            studentId: params.studentId,
            classId,
            gradeId: params.gradeId ?? null,
            payload: params.payload,
            previousPayload: params.previousPayload
                ? params.previousPayload
                : undefined,
            requestedByUserId: params.requestedByUserId,
        },
    });
}
async function createReportCardChangeRequest(params) {
    await assertNoDuplicateReportCardPending({
        kind: params.kind,
        reportCardId: params.reportCardId,
        studentId: params.studentId,
        payload: params.payload,
    });
    const classId = await resolveStudentClassId(params.studentId);
    return prisma_1.default.academicChangeRequest.create({
        data: {
            target: 'REPORT_CARD',
            kind: params.kind,
            status: 'PENDING_MAIN_TEACHER',
            studentId: params.studentId,
            classId,
            reportCardId: params.reportCardId ?? null,
            payload: params.payload,
            previousPayload: params.previousPayload
                ? params.previousPayload
                : undefined,
            requestedByUserId: params.requestedByUserId,
        },
    });
}
async function isMainTeacherForClass(userId, classId) {
    if (!classId)
        return false;
    const teacher = await prisma_1.default.teacher.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!teacher)
        return false;
    const cls = await prisma_1.default.class.findUnique({
        where: { id: classId },
        select: { teacherId: true },
    });
    return cls?.teacherId === teacher.id;
}
async function isStudiesDirector(userId, role) {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN')
        return true;
    if (role !== 'STAFF')
        return false;
    const ctx = await (0, staff_visible_modules_util_1.getStaffMemberModuleContext)(userId);
    if (!ctx || ctx.staff.supportKind !== 'STUDIES_DIRECTOR')
        return false;
    return ctx.visibleModules.includes('validations');
}
async function canUserApproveRequest(userId, role, request) {
    switch (request.status) {
        case 'PENDING_MAIN_TEACHER':
            return isMainTeacherForClass(userId, request.classId);
        case 'PENDING_EDUCATOR':
            return role === 'EDUCATOR';
        case 'PENDING_STUDIES_DIRECTOR':
            return isStudiesDirector(userId, role);
        default:
            return false;
    }
}
async function listPendingForUser(userId, role) {
    const all = await prisma_1.default.academicChangeRequest.findMany({
        where: { status: { in: ACTIVE_STATUSES } },
        orderBy: { requestedAt: 'asc' },
        take: 200,
    });
    const filtered = [];
    for (const req of all) {
        if (await canUserApproveRequest(userId, role, req)) {
            filtered.push(req);
        }
    }
    return enrichRequests(filtered);
}
async function listRequestsByRequester(userId) {
    const rows = await prisma_1.default.academicChangeRequest.findMany({
        where: { requestedByUserId: userId },
        orderBy: { requestedAt: 'desc' },
        take: 100,
    });
    return enrichRequests(rows);
}
async function enrichRequests(requests) {
    if (requests.length === 0)
        return [];
    const studentIds = [...new Set(requests.map((r) => r.studentId))];
    const students = await prisma_1.default.student.findMany({
        where: { id: { in: studentIds } },
        include: {
            user: { select: { firstName: true, lastName: true } },
            class: { select: { id: true, name: true, level: true } },
        },
    });
    const studentMap = new Map(students.map((s) => [s.id, s]));
    return requests.map((r) => ({
        ...r,
        student: studentMap.get(r.studentId) ?? null,
    }));
}
async function applyGradeRequest(tx, kind, gradeId, payload, previousPayload) {
    if (kind === 'CREATE') {
        await tx.grade.create({
            data: {
                studentId: payload.studentId,
                courseId: payload.courseId,
                teacherId: payload.teacherId,
                evaluationType: payload.evaluationType,
                title: payload.title,
                score: payload.score,
                maxScore: payload.maxScore,
                coefficient: payload.coefficient,
                date: new Date(payload.date),
                comments: payload.comments ?? null,
            },
        });
        return;
    }
    if (!gradeId) {
        throw new Error('gradeId requis pour appliquer la modification');
    }
    if (kind === 'UPDATE') {
        await tx.grade.update({
            where: { id: gradeId },
            data: {
                title: payload.title,
                score: payload.score,
                maxScore: payload.maxScore,
                coefficient: payload.coefficient,
                date: new Date(payload.date),
                comments: payload.comments ?? null,
                evaluationType: payload.evaluationType,
            },
        });
        return;
    }
    if (kind === 'DELETE') {
        await tx.grade.delete({ where: { id: gradeId } });
        void previousPayload;
    }
}
async function applyReportCardRequest(tx, kind, reportCardId, payload) {
    if (kind === 'CREATE') {
        await tx.reportCard.create({
            data: {
                studentId: payload.studentId,
                period: payload.period,
                academicYear: payload.academicYear,
                average: payload.average,
                rank: payload.rank ?? null,
                comments: payload.comments ?? null,
                published: payload.published ?? false,
            },
        });
        return;
    }
    if (!reportCardId) {
        throw new Error('reportCardId requis pour appliquer la modification');
    }
    await tx.reportCard.update({
        where: { id: reportCardId },
        data: {
            average: payload.average,
            rank: payload.rank ?? null,
            comments: payload.comments ?? null,
        },
    });
}
async function applyApprovedRequest(requestId) {
    const request = await prisma_1.default.academicChangeRequest.findUnique({ where: { id: requestId } });
    if (!request || request.status !== 'APPROVED' || request.appliedAt) {
        return request;
    }
    const payload = request.payload;
    const previousPayload = request.previousPayload;
    await prisma_1.default.$transaction(async (tx) => {
        if (request.target === 'GRADE') {
            await applyGradeRequest(tx, request.kind, request.gradeId, payload, previousPayload);
        }
        else {
            await applyReportCardRequest(tx, request.kind, request.reportCardId, payload);
        }
        await tx.academicChangeRequest.update({
            where: { id: requestId },
            data: { appliedAt: new Date() },
        });
    });
    if (request.target === 'GRADE' &&
        (request.kind === 'CREATE' || request.kind === 'UPDATE')) {
        const gradePayload = payload;
        const course = await prisma_1.default.course.findUnique({
            where: { id: gradePayload.courseId },
            select: { name: true },
        });
        void (0, parent_notify_util_1.notifyParentsNewGrade)({
            studentId: gradePayload.studentId,
            courseName: course?.name ?? 'matière',
            score: gradePayload.score,
            maxScore: gradePayload.maxScore,
        }).catch((err) => console.error('notifyParentsNewGrade:', err));
    }
    return prisma_1.default.academicChangeRequest.findUnique({ where: { id: requestId } });
}
async function approveAcademicChangeRequest(params) {
    const request = await prisma_1.default.academicChangeRequest.findUnique({
        where: { id: params.requestId },
    });
    if (!request || !ACTIVE_STATUSES.includes(request.status)) {
        throw Object.assign(new Error('Demande introuvable ou déjà traitée.'), { statusCode: 404 });
    }
    const allowed = await canUserApproveRequest(params.userId, params.role, request);
    if (!allowed) {
        throw Object.assign(new Error('Vous n\'êtes pas autorisé à valider cette étape.'), { statusCode: 403 });
    }
    const now = new Date();
    let nextStatus = request.status;
    const data = {};
    switch (request.status) {
        case 'PENDING_MAIN_TEACHER':
            data.mainTeacherApprovedAt = now;
            data.mainTeacherApprovedByUserId = params.userId;
            data.mainTeacherNote = params.note ?? null;
            nextStatus = 'PENDING_EDUCATOR';
            break;
        case 'PENDING_EDUCATOR':
            data.educatorApprovedAt = now;
            data.educatorApprovedByUserId = params.userId;
            data.educatorNote = params.note ?? null;
            nextStatus = 'PENDING_STUDIES_DIRECTOR';
            break;
        case 'PENDING_STUDIES_DIRECTOR':
            data.studiesDirectorApprovedAt = now;
            data.studiesDirectorApprovedByUserId = params.userId;
            data.studiesDirectorNote = params.note ?? null;
            nextStatus = 'APPROVED';
            break;
        default:
            break;
    }
    data.status = nextStatus;
    const updated = await prisma_1.default.academicChangeRequest.update({
        where: { id: params.requestId },
        data,
    });
    if (nextStatus === 'APPROVED') {
        await applyApprovedRequest(updated.id);
    }
    return prisma_1.default.academicChangeRequest.findUnique({ where: { id: params.requestId } });
}
async function rejectAcademicChangeRequest(params) {
    const request = await prisma_1.default.academicChangeRequest.findUnique({
        where: { id: params.requestId },
    });
    if (!request || !ACTIVE_STATUSES.includes(request.status)) {
        throw Object.assign(new Error('Demande introuvable ou déjà traitée.'), { statusCode: 404 });
    }
    const allowed = await canUserApproveRequest(params.userId, params.role, request);
    if (!allowed) {
        throw Object.assign(new Error('Vous n\'êtes pas autorisé à rejeter cette demande.'), { statusCode: 403 });
    }
    return prisma_1.default.academicChangeRequest.update({
        where: { id: params.requestId },
        data: {
            status: 'REJECTED',
            rejectedAt: new Date(),
            rejectedByUserId: params.userId,
            rejectionReason: params.reason ?? null,
        },
    });
}
function workflowStatusLabel(status) {
    const labels = {
        PENDING_MAIN_TEACHER: 'En attente — professeur principal',
        PENDING_EDUCATOR: 'En attente — éducateur',
        PENDING_STUDIES_DIRECTOR: 'En attente — directeur des études',
        APPROVED: 'Approuvée et appliquée',
        REJECTED: 'Rejetée',
    };
    return labels[status];
}
//# sourceMappingURL=academic-change-request.util.js.map