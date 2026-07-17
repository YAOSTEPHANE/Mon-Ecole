"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_parent_school_guard_middleware_1 = require("../middleware/admin-parent-school-guard.middleware");
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
const admin_user_initial_password_util_1 = require("../utils/admin-user-initial-password.util");
const password_util_1 = require("../utils/password.util");
const router = express_1.default.Router();
router.use('/parents/:id', admin_parent_school_guard_middleware_1.guardAdminParentRoute);
router.use('/parents/:parentId', admin_parent_school_guard_middleware_1.guardAdminParentRoute);
const userPublic = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    avatar: true,
    isActive: true,
};
const PARENT_RELATIONS = ['father', 'mother', 'guardian', 'other'];
async function assertParentOwnsStudent(parentId, studentId) {
    const link = await prisma_1.default.studentParent.findFirst({
        where: { parentId, studentId },
        select: { id: true },
    });
    return Boolean(link);
}
router.get('/parents', async (req, res) => {
    try {
        const rows = await prisma_1.default.parent.findMany({
            where: (0, school_access_guard_util_1.scopedParentWhere)(req.schoolId),
            include: {
                user: { select: userPublic },
                _count: { select: { students: true, contacts: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('firstName').trim().notEmpty(),
    (0, express_validator_1.body)('lastName').trim().notEmpty(),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('phone').optional({ values: 'falsy' }).trim(),
    (0, express_validator_1.body)('profession').optional({ values: 'falsy' }).trim(),
    (0, express_validator_1.body)('studentId').isString().notEmpty(),
    (0, express_validator_1.body)('relation').optional().isIn(PARENT_RELATIONS),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email: rawEmail, firstName, lastName, password, phone, profession, studentId, relation, } = req.body;
        const email = rawEmail.trim().toLowerCase();
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(studentId, req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: { user: { select: { email: true } } },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève introuvable' });
        }
        const studentEmail = String(student.user?.email ?? '')
            .trim()
            .toLowerCase();
        if (studentEmail && studentEmail === email) {
            return res.status(400).json({
                error: "L'e-mail du parent ne peut pas être identique à celui de l'élève.",
            });
        }
        const rel = relation && PARENT_RELATIONS.includes(relation)
            ? relation
            : 'guardian';
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
            include: { parentProfile: true },
        });
        if (existingUser && existingUser.role !== 'PARENT') {
            return res.status(400).json({
                error: 'Cet e-mail est déjà utilisé par un compte avec un autre rôle.',
            });
        }
        let setupEmailSent = false;
        let parentId;
        if (existingUser) {
            const parent = existingUser.parentProfile ??
                (await prisma_1.default.parent.create({ data: { userId: existingUser.id } }));
            parentId = parent.id;
            const existingLink = await prisma_1.default.studentParent.findFirst({
                where: { parentId, studentId },
            });
            if (existingLink) {
                return res.status(409).json({
                    error: 'Ce parent est déjà rattaché à cet élève.',
                });
            }
            await prisma_1.default.user.update({
                where: { id: existingUser.id },
                data: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    ...(phone?.trim() ? { phone: phone.trim() } : {}),
                },
            });
            if (profession?.trim()) {
                await prisma_1.default.parent.update({
                    where: { id: parentId },
                    data: { profession: profession.trim() },
                });
            }
            await prisma_1.default.studentParent.create({
                data: { parentId, studentId, relation: rel },
            });
        }
        else {
            const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(password);
            const user = await prisma_1.default.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone?.trim() || undefined,
                    role: 'PARENT',
                    isActive: true,
                    parentProfile: {
                        create: {
                            ...(profession?.trim() ? { profession: profession.trim() } : {}),
                        },
                    },
                },
                include: { parentProfile: true },
            });
            if (!user.parentProfile) {
                return res.status(500).json({ error: 'Profil parent non créé' });
            }
            parentId = user.parentProfile.id;
            await prisma_1.default.studentParent.create({
                data: { parentId, studentId, relation: rel },
            });
            if (shouldSendSetupEmail) {
                try {
                    await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, user.firstName);
                    setupEmailSent = true;
                }
                catch (inviteErr) {
                    console.error('Invitation mot de passe (parent):', inviteErr);
                }
            }
        }
        const parent = await prisma_1.default.parent.findUnique({
            where: { id: parentId },
            include: {
                user: { select: userPublic },
                _count: { select: { students: true, contacts: true } },
            },
        });
        res.status(201).json({ parent, setupEmailSent, linkedExistingUser: Boolean(existingUser) });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/parents/:id', async (req, res) => {
    try {
        const parent = await prisma_1.default.parent.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: userPublic },
                contacts: { orderBy: { sortOrder: 'asc' } },
                interactionLogs: { orderBy: { createdAt: 'desc' }, take: 250 },
                consents: { orderBy: { updatedAt: 'desc' }, take: 100 },
                students: {
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, firstName: true, lastName: true } },
                                class: { select: { id: true, name: true, level: true } },
                                pickupAuthorizations: {
                                    where: { isActive: true },
                                    orderBy: { createdAt: 'desc' },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        res.json(parent);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents/:id/students', [(0, express_validator_1.body)('studentId').isString().notEmpty(), (0, express_validator_1.body)('relation').optional().isString()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const parent = await prisma_1.default.parent.findUnique({ where: { id: req.params.id } });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        const { studentId, relation } = req.body;
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(studentId, req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: { user: { select: { firstName: true, lastName: true } } },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève introuvable' });
        }
        const rel = relation && PARENT_RELATIONS.includes(relation)
            ? relation
            : 'guardian';
        const existing = await prisma_1.default.studentParent.findFirst({
            where: { parentId: parent.id, studentId },
        });
        if (existing) {
            return res.status(409).json({ error: 'Cet élève est déjà rattaché à ce parent' });
        }
        const link = await prisma_1.default.studentParent.create({
            data: {
                parentId: parent.id,
                studentId,
                relation: rel,
            },
            include: {
                student: {
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                        class: { select: { id: true, name: true, level: true } },
                    },
                },
            },
        });
        res.status(201).json(link);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/parents/:id/students/:studentId', async (req, res) => {
    try {
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(req.params.studentId, req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const link = await prisma_1.default.studentParent.findFirst({
            where: { parentId: req.params.id, studentId: req.params.studentId },
        });
        if (!link) {
            return res.status(404).json({ error: 'Lien parent-élève introuvable' });
        }
        await prisma_1.default.studentParent.delete({ where: { id: link.id } });
        res.json({ message: 'Lien supprimé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/parents/:id', async (req, res) => {
    try {
        const parent = await prisma_1.default.parent.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        const { firstName, lastName, phone, isActive, profession, preferredLocale, notifyEmail, notifySms, portalShowFees, portalShowGrades, portalShowAttendance, internalNotes, } = req.body;
        await prisma_1.default.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: parent.userId },
                data: {
                    ...(firstName !== undefined && { firstName }),
                    ...(lastName !== undefined && { lastName }),
                    ...(phone !== undefined && { phone: phone || null }),
                    ...(isActive !== undefined && { isActive: Boolean(isActive) }),
                },
            });
            await tx.parent.update({
                where: { id: req.params.id },
                data: {
                    ...(profession !== undefined && { profession: profession || null }),
                    ...(preferredLocale !== undefined && { preferredLocale: preferredLocale || null }),
                    ...(notifyEmail !== undefined && { notifyEmail: Boolean(notifyEmail) }),
                    ...(notifySms !== undefined && { notifySms: Boolean(notifySms) }),
                    ...(portalShowFees !== undefined && { portalShowFees: Boolean(portalShowFees) }),
                    ...(portalShowGrades !== undefined && { portalShowGrades: Boolean(portalShowGrades) }),
                    ...(portalShowAttendance !== undefined && {
                        portalShowAttendance: Boolean(portalShowAttendance),
                    }),
                    ...(internalNotes !== undefined && {
                        internalNotes: internalNotes === null || internalNotes === '' ? null : String(internalNotes),
                    }),
                },
            });
        });
        const updated = await prisma_1.default.parent.findUnique({
            where: { id: req.params.id },
            include: {
                user: { select: userPublic },
                contacts: { orderBy: { sortOrder: 'asc' } },
                interactionLogs: { orderBy: { createdAt: 'desc' }, take: 50 },
                consents: { orderBy: { updatedAt: 'desc' } },
                students: {
                    include: {
                        student: {
                            include: {
                                user: { select: { id: true, firstName: true, lastName: true } },
                                class: { select: { id: true, name: true } },
                                pickupAuthorizations: { orderBy: { createdAt: 'desc' } },
                            },
                        },
                    },
                },
            },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents/:id/contacts', [(0, express_validator_1.body)('label').trim().notEmpty(), (0, express_validator_1.body)('phone').optional().trim(), (0, express_validator_1.body)('email').optional().trim()], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const parent = await prisma_1.default.parent.findUnique({ where: { id: req.params.id } });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        const { label, phone, email, sortOrder } = req.body;
        const row = await prisma_1.default.parentContact.create({
            data: {
                parentId: req.params.id,
                label: String(label).trim(),
                phone: phone ? String(phone).trim() : null,
                email: email ? String(email).trim() : null,
                sortOrder: sortOrder != null ? Number(sortOrder) : 0,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/parents/:id/contacts/:contactId', async (req, res) => {
    try {
        const row = await prisma_1.default.parentContact.findFirst({
            where: { id: req.params.contactId, parentId: req.params.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Contact introuvable' });
        }
        await prisma_1.default.parentContact.delete({ where: { id: row.id } });
        res.json({ message: 'Contact supprimé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.get('/parents/:id/interactions', async (req, res) => {
    try {
        const rows = await prisma_1.default.parentInteraction.findMany({
            where: { parentId: req.params.id },
            orderBy: { createdAt: 'desc' },
            take: 300,
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents/:id/interactions', [(0, express_validator_1.body)('channel').isIn(['PHONE', 'EMAIL', 'SMS', 'MEETING', 'PORTAL_MESSAGE', 'WHATSAPP', 'OTHER'])], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const parent = await prisma_1.default.parent.findUnique({ where: { id: req.params.id } });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        const { channel, subject, body: textBody } = req.body;
        const row = await prisma_1.default.parentInteraction.create({
            data: {
                parentId: req.params.id,
                channel,
                subject: subject ? String(subject).slice(0, 200) : null,
                body: textBody ? String(textBody).slice(0, 8000) : null,
                createdByUserId: req.user?.id ?? null,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/parents/:id/interactions/:interactionId', async (req, res) => {
    try {
        const row = await prisma_1.default.parentInteraction.findFirst({
            where: { id: req.params.interactionId, parentId: req.params.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Interaction introuvable' });
        }
        await prisma_1.default.parentInteraction.delete({ where: { id: row.id } });
        res.json({ message: 'Interaction supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents/:id/consents/upsert', async (req, res) => {
    try {
        const parent = await prisma_1.default.parent.findUnique({ where: { id: req.params.id } });
        if (!parent) {
            return res.status(404).json({ error: 'Parent introuvable' });
        }
        const { studentId, consentType, granted, policyVersion, notes } = req.body;
        const allowed = [
            'IMAGE_PUBLICATION',
            'SCHOOL_TRIP',
            'MEDICAL_EMERGENCY',
            'DATA_PROCESSING',
            'COMMUNICATION_CHANNELS',
            'AUTHORIZED_PICKUP_POLICY',
        ];
        if (!consentType || !allowed.includes(consentType)) {
            return res.status(400).json({ error: 'consentType invalide' });
        }
        if (studentId) {
            try {
                await (0, school_access_guard_util_1.assertStudentInSchool)(String(studentId), req.schoolId, req.school?.isDefault ?? false);
            }
            catch (e) {
                if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                    return res.status(e.status).json({ error: e.message });
                }
                throw e;
            }
            const ok = await assertParentOwnsStudent(req.params.id, studentId);
            if (!ok) {
                return res.status(400).json({ error: 'Élève non lié à ce parent' });
            }
        }
        const existing = await prisma_1.default.parentConsent.findFirst({
            where: {
                parentId: req.params.id,
                consentType,
                ...(studentId ? { studentId } : { studentId: null }),
            },
        });
        if (existing) {
            const u = await prisma_1.default.parentConsent.update({
                where: { id: existing.id },
                data: {
                    granted: Boolean(granted),
                    policyVersion: policyVersion != null ? String(policyVersion).slice(0, 64) : null,
                    notes: notes != null ? String(notes).slice(0, 2000) : null,
                },
            });
            return res.json(u);
        }
        const c = await prisma_1.default.parentConsent.create({
            data: {
                parentId: req.params.id,
                studentId: studentId || null,
                consentType,
                granted: Boolean(granted),
                policyVersion: policyVersion != null ? String(policyVersion).slice(0, 64) : null,
                notes: notes != null ? String(notes).slice(0, 2000) : null,
            },
        });
        res.status(201).json(c);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/parents/:id/consents/:consentId', async (req, res) => {
    try {
        const row = await prisma_1.default.parentConsent.findFirst({
            where: { id: req.params.consentId, parentId: req.params.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Consentement introuvable' });
        }
        await prisma_1.default.parentConsent.delete({ where: { id: row.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/parents/:id/pickup-authorizations', async (req, res) => {
    try {
        const { studentId, authorizedName, relationship, phone, identityNote, validFrom, validUntil, isActive } = req.body;
        if (!studentId || !authorizedName) {
            return res.status(400).json({ error: 'studentId et authorizedName sont requis' });
        }
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(String(studentId), req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const ok = await assertParentOwnsStudent(req.params.id, studentId);
        if (!ok) {
            return res.status(403).json({ error: 'Élève non lié à ce parent' });
        }
        const row = await prisma_1.default.studentPickupAuthorization.create({
            data: {
                studentId,
                declaredByParentId: req.params.id,
                authorizedName: String(authorizedName).trim(),
                relationship: relationship ? String(relationship).slice(0, 120) : null,
                phone: phone ? String(phone).trim() : null,
                identityNote: identityNote ? String(identityNote).slice(0, 500) : null,
                validFrom: validFrom ? new Date(validFrom) : new Date(),
                validUntil: validUntil ? new Date(validUntil) : null,
                isActive: isActive !== false,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.put('/parents/:parentId/pickup-authorizations/:pickupId', async (req, res) => {
    try {
        const row = await prisma_1.default.studentPickupAuthorization.findFirst({
            where: { id: req.params.pickupId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Autorisation introuvable' });
        }
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(row.studentId, req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const ok = await assertParentOwnsStudent(req.params.parentId, row.studentId);
        if (!ok) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        const { authorizedName, relationship, phone, identityNote, validFrom, validUntil, isActive } = req.body;
        const updated = await prisma_1.default.studentPickupAuthorization.update({
            where: { id: row.id },
            data: {
                ...(authorizedName !== undefined && { authorizedName: String(authorizedName).trim() }),
                ...(relationship !== undefined && {
                    relationship: relationship ? String(relationship).slice(0, 120) : null,
                }),
                ...(phone !== undefined && { phone: phone ? String(phone).trim() : null }),
                ...(identityNote !== undefined && {
                    identityNote: identityNote ? String(identityNote).slice(0, 500) : null,
                }),
                ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : row.validFrom }),
                ...(validUntil !== undefined && {
                    validUntil: validUntil === null || validUntil === '' ? null : new Date(validUntil),
                }),
                ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            },
        });
        res.json(updated);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/parents/:parentId/pickup-authorizations/:pickupId', async (req, res) => {
    try {
        const row = await prisma_1.default.studentPickupAuthorization.findFirst({
            where: { id: req.params.pickupId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Autorisation introuvable' });
        }
        try {
            await (0, school_access_guard_util_1.assertStudentInSchool)(row.studentId, req.schoolId, req.school?.isDefault ?? false);
        }
        catch (e) {
            if (e instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
                return res.status(e.status).json({ error: e.message });
            }
            throw e;
        }
        const ok = await assertParentOwnsStudent(req.params.parentId, row.studentId);
        if (!ok) {
            return res.status(403).json({ error: 'Non autorisé' });
        }
        await prisma_1.default.studentPickupAuthorization.delete({ where: { id: row.id } });
        res.json({ message: 'Supprimé' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-parent.routes.js.map