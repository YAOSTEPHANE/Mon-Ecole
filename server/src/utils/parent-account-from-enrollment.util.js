"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseParentDisplayName = parseParentDisplayName;
exports.ensureParentAccountForEnrolledStudent = ensureParentAccountForEnrolledStudent;
const prisma_1 = __importDefault(require("./prisma"));
const admin_user_initial_password_util_1 = require("./admin-user-initial-password.util");
const TITLE_PREFIX = /^(m\.?|mme\.?|mr\.?|mrs\.?|mlle\.?|madame|monsieur|papa|maman|père|mère|pere|mere)$/i;
/** Dérive prénom / nom à partir du libellé « parent / tuteur » du dossier. */
function parseParentDisplayName(raw) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed) {
        return { firstName: 'Parent', lastName: 'Tuteur' };
    }
    const parts = trimmed.split(/\s+/).filter(Boolean);
    const withoutTitles = parts.filter((p) => !TITLE_PREFIX.test(p.replace(/\./g, '')));
    const tokens = withoutTitles.length > 0 ? withoutTitles : parts;
    if (tokens.length === 1) {
        return { firstName: 'Parent', lastName: tokens[0] };
    }
    return {
        firstName: tokens.slice(0, -1).join(' '),
        lastName: tokens[tokens.length - 1],
    };
}
/**
 * Crée ou rattache un compte PARENT à partir des coordonnées du dossier d’inscription,
 * puis lie l’élève nouvellement inscrit.
 */
async function ensureParentAccountForEnrolledStudent(input) {
    const email = String(input.parentEmail ?? '')
        .trim()
        .toLowerCase();
    if (!email || !email.includes('@')) {
        return {
            attempted: false,
            created: false,
            linked: false,
            parentSetupEmailSent: false,
            skippedReason: 'parent_email_missing',
        };
    }
    const studentEmail = String(input.studentUserEmail ?? '')
        .trim()
        .toLowerCase();
    if (studentEmail && email === studentEmail) {
        return {
            attempted: true,
            created: false,
            linked: false,
            parentSetupEmailSent: false,
            skippedReason: 'same_email_as_student',
        };
    }
    const relation = input.relation ?? 'guardian';
    const { firstName, lastName } = parseParentDisplayName(input.parentName);
    const phone = input.parentPhone?.trim() || undefined;
    const existingUser = await prisma_1.default.user.findUnique({
        where: { email },
        include: { parentProfile: true },
    });
    if (existingUser) {
        if (existingUser.role !== 'PARENT') {
            return {
                attempted: true,
                created: false,
                linked: false,
                parentSetupEmailSent: false,
                skippedReason: 'email_used_by_other_role',
            };
        }
        const parent = existingUser.parentProfile ??
            (await prisma_1.default.parent.create({ data: { userId: existingUser.id } }));
        if (phone && !existingUser.phone) {
            await prisma_1.default.user.update({
                where: { id: existingUser.id },
                data: { phone },
            });
        }
        const existingLink = await prisma_1.default.studentParent.findFirst({
            where: { parentId: parent.id, studentId: input.studentId },
        });
        if (existingLink) {
            return {
                attempted: true,
                created: false,
                linked: true,
                parentSetupEmailSent: false,
                parentUserId: existingUser.id,
            };
        }
        await prisma_1.default.studentParent.create({
            data: {
                parentId: parent.id,
                studentId: input.studentId,
                relation,
            },
        });
        return {
            attempted: true,
            created: false,
            linked: true,
            parentSetupEmailSent: false,
            parentUserId: existingUser.id,
        };
    }
    const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(undefined);
    const parentUser = await prisma_1.default.user.create({
        data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            role: 'PARENT',
            isActive: true,
            parentProfile: { create: {} },
        },
    });
    const parentProfile = await prisma_1.default.parent.findUnique({
        where: { userId: parentUser.id },
    });
    if (!parentProfile) {
        throw new Error('Profil parent non créé');
    }
    await prisma_1.default.studentParent.create({
        data: {
            parentId: parentProfile.id,
            studentId: input.studentId,
            relation,
        },
    });
    let parentSetupEmailSent = false;
    if (shouldSendSetupEmail) {
        try {
            await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(parentUser.id, parentUser.email, firstName);
            parentSetupEmailSent = true;
        }
        catch (inviteErr) {
            console.error('Invitation mot de passe (parent):', inviteErr);
        }
    }
    return {
        attempted: true,
        created: true,
        linked: true,
        parentSetupEmailSent,
        parentUserId: parentUser.id,
    };
}
//# sourceMappingURL=parent-account-from-enrollment.util.js.map