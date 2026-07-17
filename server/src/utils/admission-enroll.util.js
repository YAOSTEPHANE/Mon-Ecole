"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrollStudentFromAdmission = enrollStudentFromAdmission;
const prisma_1 = __importDefault(require("./prisma"));
const admin_user_initial_password_util_1 = require("./admin-user-initial-password.util");
const digital_card_util_1 = require("./digital-card.util");
const parent_account_from_enrollment_util_1 = require("./parent-account-from-enrollment.util");
async function generateUniqueStudentId(firstName, lastName) {
    for (let i = 0; i < 20; i++) {
        const initials = `${firstName[0]?.toUpperCase() || 'X'}${lastName[0]?.toUpperCase() || 'X'}`;
        const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
        const candidate = `STU${initials}${random}`;
        const taken = await prisma_1.default.student.findUnique({ where: { studentId: candidate } });
        if (!taken)
            return candidate;
    }
    return `STU${Date.now().toString(36).toUpperCase()}`;
}
/**
 * Crée le compte élève à partir d’un dossier de pré-inscription accepté.
 */
async function enrollStudentFromAdmission(admissionId, reviewerUserId, body, req, contextSchoolId) {
    const admission = await prisma_1.default.admission.findUnique({
        where: { id: admissionId },
    });
    if (!admission) {
        throw Object.assign(new Error('Dossier introuvable'), { statusCode: 404 });
    }
    if (admission.status !== 'ACCEPTED') {
        throw Object.assign(new Error('Le dossier doit être au statut « Accepté » avant de créer le compte élève'), { statusCode: 400 });
    }
    if (admission.enrolledStudentId) {
        throw Object.assign(new Error('Un compte élève existe déjà pour ce dossier'), { statusCode: 400 });
    }
    const email = admission.email.trim().toLowerCase();
    const existingUser = await prisma_1.default.user.findUnique({ where: { email } });
    if (existingUser) {
        throw Object.assign(new Error('Cet email est déjà utilisé par un compte. Utilisez un autre email sur le dossier ou fusionnez manuellement.'), { statusCode: 400 });
    }
    let studentId = body.studentId ? String(body.studentId).trim() : '';
    if (!studentId && admission.matricule?.trim()) {
        studentId = admission.matricule.trim();
    }
    if (!studentId) {
        studentId = await generateUniqueStudentId(admission.firstName, admission.lastName);
    }
    else {
        const taken = await prisma_1.default.student.findUnique({ where: { studentId } });
        if (taken) {
            throw Object.assign(new Error("Ce numéro d'élève existe déjà"), { statusCode: 400 });
        }
    }
    const classId = body.classId || admission.proposedClassId || undefined;
    let schoolId = admission.schoolId ?? contextSchoolId ?? undefined;
    if (!schoolId && classId) {
        const cls = await prisma_1.default.class.findUnique({
            where: { id: classId },
            select: { schoolId: true },
        });
        schoolId = cls?.schoolId ?? contextSchoolId ?? undefined;
    }
    if (!schoolId && contextSchoolId) {
        schoolId = contextSchoolId;
    }
    const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(body.password);
    const user = await prisma_1.default.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName: admission.firstName,
            lastName: admission.lastName,
            phone: admission.phone ?? undefined,
            role: 'STUDENT',
            studentProfile: {
                create: {
                    studentId,
                    digitalCardPublicId: (0, digital_card_util_1.generateDigitalCardPublicId)(),
                    dateOfBirth: admission.dateOfBirth,
                    birthPlace: admission.birthPlace ?? undefined,
                    isRepeating: admission.isRepeating ?? false,
                    gender: admission.gender,
                    address: body.address ?? admission.address ?? undefined,
                    emergencyContact: body.emergencyContact ?? admission.parentName ?? undefined,
                    emergencyPhone: body.emergencyPhone ?? admission.parentPhone ?? undefined,
                    medicalInfo: body.medicalInfo ?? undefined,
                    classId: classId ?? undefined,
                    schoolId: schoolId ?? undefined,
                    stateAssignment: body.stateAssignment ?? 'NOT_STATE_ASSIGNED',
                },
            },
        },
        include: {
            studentProfile: {
                include: { class: true },
            },
        },
    });
    const createdStudent = user.studentProfile;
    if (!createdStudent) {
        throw Object.assign(new Error('Profil élève non créé'), { statusCode: 500 });
    }
    await prisma_1.default.admission.update({
        where: { id: admission.id },
        data: {
            status: 'ENROLLED',
            enrolledStudentId: createdStudent.id,
            reviewedById: reviewerUserId,
            reviewedAt: new Date(),
        },
    });
    if (req) {
        try {
            await prisma_1.default.securityEvent.create({
                data: {
                    userId: reviewerUserId,
                    type: 'admission_enrolled',
                    description: `Inscription finalisée: ${admission.reference} → ${studentId}`,
                    ipAddress: req.ip || req.socket?.remoteAddress,
                    userAgent: req.get?.('user-agent'),
                    severity: 'info',
                },
            });
        }
        catch {
            /* ignore */
        }
    }
    if (shouldSendSetupEmail) {
        try {
            await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, admission.firstName);
        }
        catch (inviteErr) {
            console.error('Invitation mot de passe (admission):', inviteErr);
        }
    }
    const parentAccount = await (0, parent_account_from_enrollment_util_1.ensureParentAccountForEnrolledStudent)({
        parentEmail: admission.parentEmail,
        parentName: admission.parentName,
        parentPhone: admission.parentPhone,
        studentId: createdStudent.id,
        studentUserEmail: email,
        relation: 'guardian',
    });
    const { password: _pw, ...userWithoutPassword } = user;
    return {
        message: 'Élève inscrit et compte créé',
        user: userWithoutPassword,
        reference: admission.reference,
        passwordSetupEmailSent: shouldSendSetupEmail,
        parentAccount,
    };
}
//# sourceMappingURL=admission-enroll.util.js.map