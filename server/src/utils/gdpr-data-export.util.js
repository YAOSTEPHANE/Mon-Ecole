"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGdprDataExport = buildGdprDataExport;
const prisma_1 = __importDefault(require("./prisma"));
const student_sensitive_crypto_util_1 = require("./student-sensitive-crypto.util");
function stripPassword(row) {
    const { password: _p, ...rest } = row;
    return rest;
}
/**
 * Assemble un export structuré des données personnelles liées au compte (RGPD — portabilité).
 * Les mots de passe et secrets techniques ne sont jamais inclus.
 */
async function buildGdprDataExport(userId) {
    const user = await prisma_1.default.user.findUnique({
        where: { id: userId },
    });
    if (!user) {
        throw new Error('Utilisateur introuvable');
    }
    const account = stripPassword(user);
    const [notifications, loginLogs, pushSubscriptions, auditLogs, sentMessages, receivedMessages] = await Promise.all([
        prisma_1.default.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 500,
        }),
        prisma_1.default.loginLog.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }),
        prisma_1.default.pushSubscription.findMany({
            where: { userId },
        }),
        prisma_1.default.auditLog.findMany({
            where: { actorUserId: userId },
            orderBy: { createdAt: 'desc' },
            take: 400,
        }),
        prisma_1.default.message.findMany({
            where: { senderId: userId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }),
        prisma_1.default.message.findMany({
            where: { receiverId: userId },
            orderBy: { createdAt: 'desc' },
            take: 200,
        }),
    ]);
    const base = {
        exportedAt: new Date().toISOString(),
        schemaVersion: 1,
        legalNotice: 'Export généré pour exercer votre droit d’accès / à la portabilité (RGPD). ' +
            'Certaines données peuvent devoir être conservées par l’établissement pour obligations légales ou pédagogiques ; ' +
            'l’effacement complet peut être refusé ou différé dans ces cas.',
        account,
        notifications,
        loginLogs,
        pushSubscriptions,
        auditLogsActions: auditLogs,
        messages: { sent: sentMessages, received: receivedMessages },
    };
    if (user.role === 'STUDENT') {
        const student = await prisma_1.default.student.findUnique({
            where: { userId },
            include: {
                class: true,
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (student) {
            const sid = student.id;
            const [grades, absences, studentAssignments, conducts, payments, tuitionFees, reportCards, identityDocuments,] = await Promise.all([
                prisma_1.default.grade.findMany({
                    where: { studentId: sid },
                    take: 600,
                    orderBy: { date: 'desc' },
                    include: { course: { select: { id: true, name: true, code: true } } },
                }),
                prisma_1.default.absence.findMany({
                    where: { studentId: sid },
                    take: 400,
                    orderBy: { date: 'desc' },
                    include: { course: { select: { id: true, name: true, code: true } } },
                }),
                prisma_1.default.studentAssignment.findMany({
                    where: { studentId: sid },
                    take: 250,
                    orderBy: { updatedAt: 'desc' },
                    include: {
                        assignment: { select: { id: true, title: true, description: true, dueDate: true } },
                    },
                }),
                prisma_1.default.conduct.findMany({
                    where: { studentId: sid },
                    take: 80,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma_1.default.payment.findMany({
                    where: { studentId: sid },
                    take: 150,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma_1.default.tuitionFee.findMany({
                    where: { studentId: sid },
                    take: 100,
                    orderBy: { dueDate: 'desc' },
                }),
                prisma_1.default.reportCard.findMany({
                    where: { studentId: sid },
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                }),
                prisma_1.default.identityDocument.findMany({
                    where: { studentId: sid },
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                }),
            ]);
            base.studentProfile = (0, student_sensitive_crypto_util_1.decryptStudentRecord)(student);
            base.studentAcademicData = {
                grades,
                absences,
                studentAssignments,
                conducts,
                payments,
                tuitionFees,
                reportCards,
                identityDocuments,
            };
        }
    }
    if (user.role === 'PARENT') {
        const parent = await prisma_1.default.parent.findUnique({
            where: { userId },
            include: {
                contacts: true,
                consents: { take: 100 },
                interactionLogs: { take: 200, orderBy: { createdAt: 'desc' } },
                students: {
                    include: {
                        student: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        firstName: true,
                                        lastName: true,
                                        phone: true,
                                    },
                                },
                                class: { select: { id: true, name: true, level: true } },
                                pickupAuthorizations: { take: 50 },
                            },
                        },
                    },
                },
                appointments: {
                    take: 100,
                    orderBy: { scheduledStart: 'desc' },
                },
            },
        });
        if (parent) {
            const { students: childLinks, ...parentMeta } = parent;
            base.parentProfile = {
                ...parentMeta,
                students: childLinks.map((sp) => ({
                    relation: sp.relation,
                    student: sp.student
                        ? (0, student_sensitive_crypto_util_1.decryptStudentRecord)(sp.student)
                        : null,
                })),
            };
        }
    }
    if (user.role === 'TEACHER') {
        const teacher = await prisma_1.default.teacher.findUnique({
            where: { userId },
            include: {
                classes: { take: 50 },
                courses: { take: 80 },
                leaves: { take: 50, orderBy: { createdAt: 'desc' } },
                performanceReviews: { take: 50, orderBy: { createdAt: 'desc' } },
            },
        });
        if (teacher) {
            base.teacherProfile = teacher;
        }
    }
    if (user.role === 'EDUCATOR') {
        const educator = await prisma_1.default.educator.findUnique({
            where: { userId },
        });
        if (educator) {
            base.educatorProfile = educator;
        }
    }
    if (user.role === 'STAFF') {
        const staff = await prisma_1.default.staffMember.findUnique({
            where: { userId },
            include: {
                jobDescription: true,
                attendances: { take: 200, orderBy: { attendanceDate: 'desc' } },
            },
        });
        if (staff) {
            base.staffProfile = staff;
        }
    }
    return base;
}
//# sourceMappingURL=gdpr-data-export.util.js.map