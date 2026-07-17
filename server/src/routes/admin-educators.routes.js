"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const admin_user_initial_password_util_1 = require("../utils/admin-user-initial-password.util");
const password_util_1 = require("../utils/password.util");
const educator_class_assignment_util_1 = require("../utils/educator-class-assignment.util");
const router = express_1.default.Router();
// Rechercher un éducateur par NFC ID
router.get('/educators/nfc/:nfcId', async (req, res) => {
    try {
        const { nfcId } = req.params;
        const educator = await prisma_1.default.educator.findFirst({
            where: { nfcId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
        if (!educator) {
            return res.status(404).json({ error: 'Éducateur non trouvé' });
        }
        res.json(educator);
    }
    catch (error) {
        console.error('Error finding educator by NFC:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Lister tous les éducateurs
router.get('/educators', async (req, res) => {
    try {
        const educators = await prisma_1.default.educator.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
        });
        res.json(educators.map((e) => ({
            ...e,
            assignedClasses: e.classAssignments.map((a) => a.class),
        })));
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer un éducateur
router.post('/educators', [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('employeeId').notEmpty(),
    (0, express_validator_1.body)('specialization').notEmpty(),
    (0, express_validator_1.body)('hireDate').isISO8601(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { email, password, firstName, lastName, phone, employeeId, specialization, hireDate, contractType, salary, classIds: classIdsRaw, } = req.body;
        const classIds = (0, educator_class_assignment_util_1.parseEducatorClassIds)(classIdsRaw);
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        const existingEmployee = await prisma_1.default.educator.findUnique({
            where: { employeeId },
        });
        if (existingEmployee) {
            return res.status(400).json({ error: 'Ce numéro d\'employé existe déjà' });
        }
        const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(password);
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'EDUCATOR',
                educatorProfile: {
                    create: {
                        employeeId,
                        specialization,
                        hireDate: new Date(hireDate),
                        contractType: contractType || 'CDI',
                        salary,
                    },
                },
            },
            include: {
                educatorProfile: true,
            },
        });
        if (shouldSendSetupEmail) {
            try {
                await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, user.firstName);
            }
            catch (inviteErr) {
                console.error('Invitation mot de passe (éducateur):', inviteErr);
            }
        }
        const educatorId = user.educatorProfile?.id;
        if (educatorId && classIds.length > 0) {
            await (0, educator_class_assignment_util_1.syncEducatorClassAssignments)(educatorId, classIds);
        }
        const { password: _pw, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Obtenir un éducateur par ID
router.get('/educators/:id', async (req, res) => {
    try {
        const educator = await prisma_1.default.educator.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
        });
        if (!educator) {
            return res.status(404).json({ error: 'Éducateur non trouvé' });
        }
        res.json({
            ...educator,
            assignedClasses: educator.classAssignments.map((a) => a.class),
        });
    }
    catch (error) {
        console.error('Erreur dans /admin/educators/:id:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Mettre à jour un éducateur
router.put('/educators/:id', async (req, res) => {
    try {
        const { firstName, lastName, phone, specialization, contractType, salary, isActive, nfcId, classIds: classIdsRaw, } = req.body;
        const educator = await prisma_1.default.educator.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!educator) {
            return res.status(404).json({ error: 'Éducateur non trouvé' });
        }
        // Mettre à jour l'utilisateur
        await prisma_1.default.user.update({
            where: { id: educator.userId },
            data: {
                ...(firstName !== undefined && { firstName }),
                ...(lastName !== undefined && { lastName }),
                ...(phone !== undefined && { phone }),
                ...(isActive !== undefined && { isActive }),
            },
        });
        // Mettre à jour le profil éducateur
        const updatedEducator = await prisma_1.default.educator.update({
            where: { id: req.params.id },
            data: {
                ...(specialization !== undefined && { specialization }),
                ...(contractType !== undefined && { contractType }),
                ...(salary !== undefined && { salary }),
                ...(nfcId !== undefined && { nfcId: nfcId || null }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
        });
        if (classIdsRaw !== undefined) {
            await (0, educator_class_assignment_util_1.syncEducatorClassAssignments)(req.params.id, (0, educator_class_assignment_util_1.parseEducatorClassIds)(classIdsRaw));
        }
        const withAssignments = await prisma_1.default.educator.findUnique({
            where: { id: req.params.id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                        isActive: true,
                    },
                },
                ...educator_class_assignment_util_1.educatorClassAssignmentInclude,
            },
        });
        res.json({
            ...(withAssignments ?? updatedEducator),
            assignedClasses: (withAssignments ?? updatedEducator).classAssignments.map((a) => a.class),
        });
    }
    catch (error) {
        console.error('Erreur dans /admin/educators/:id PUT:', error);
        res.status(500).json({
            error: error.message || 'Erreur serveur',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
// Supprimer un éducateur
router.delete('/educators/:id', async (req, res) => {
    try {
        const educator = await prisma_1.default.educator.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!educator) {
            return res.status(404).json({ error: 'Éducateur non trouvé' });
        }
        // Utiliser une transaction pour supprimer toutes les relations dans le bon ordre
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Supprimer les évaluations de conduite créées par cet éducateur
            // Note: On ne supprime pas les évaluations, on les garde pour l'historique
            // Mais on pourrait mettre à jour evaluatedByRole si nécessaire
            // 2. Supprimer le profil éducateur
            await tx.educator.delete({
                where: { id: req.params.id },
            });
            // 3. Désactiver/anonymiser l'utilisateur associé : il peut être référencé
            // par des notifications, messages, logs ou évaluations de conduite.
            await tx.passwordResetToken.deleteMany({ where: { userId: educator.userId } });
            await tx.pushSubscription.deleteMany({ where: { userId: educator.userId } });
            await tx.schoolMember.deleteMany({ where: { userId: educator.userId } });
            await tx.user.update({
                where: { id: educator.userId },
                data: {
                    email: `deleted-educator-${educator.id}-${Date.now()}@deleted.local`,
                    firstName: 'Éducateur',
                    lastName: 'supprimé',
                    phone: null,
                    avatar: null,
                    isActive: false,
                },
            });
        });
        res.json({ message: 'Éducateur supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'éducateur:', error);
        res.status(500).json({
            error: error.message || 'Erreur lors de la suppression',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin-educators.routes.js.map