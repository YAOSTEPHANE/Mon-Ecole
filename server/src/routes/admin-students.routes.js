"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const upload_middleware_1 = require("../middleware/upload.middleware");
const admin_user_initial_password_util_1 = require("../utils/admin-user-initial-password.util");
const password_util_1 = require("../utils/password.util");
const digital_card_util_1 = require("../utils/digital-card.util");
const student_enrollment_dossier_util_1 = require("../utils/student-enrollment-dossier.util");
const upload_persist_util_1 = require("../utils/upload-persist.util");
const upload_access_token_util_1 = require("../utils/upload-access-token.util");
const qrcode_1 = __importDefault(require("qrcode"));
const school_context_util_1 = require("../utils/school-context.util");
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
const router = express_1.default.Router();
// ========== GESTION DES ÉLÈVES ==========
// Rechercher un élève par NFC ID
router.get('/students/nfc/:nfcId', async (req, res) => {
    try {
        const { nfcId } = req.params;
        const schoolId = req.schoolId;
        const student = await prisma_1.default.student.findFirst({
            where: {
                nfcId,
                ...(0, school_context_util_1.studentScopeWhere)(schoolId, req.school?.isDefault),
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
                    },
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                    },
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
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
        if (!student) {
            return res.status(404).json({ error: 'Aucun élève trouvé avec cet ID NFC' });
        }
        res.json(student);
    }
    catch (error) {
        console.error('Error fetching student by NFC ID:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Lister tous les élèves
router.get('/students', async (req, res) => {
    try {
        const { classId, isActive, enrollmentStatus } = req.query;
        const schoolId = req.schoolId;
        const students = await prisma_1.default.student.findMany({
            where: {
                ...(0, school_context_util_1.studentScopeWhere)(schoolId, req.school?.isDefault),
                ...(classId && { classId: classId }),
                ...(isActive !== undefined && { isActive: isActive === 'true' }),
                ...(enrollmentStatus &&
                    typeof enrollmentStatus === 'string' && {
                    enrollmentStatus: enrollmentStatus,
                }),
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
                    },
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                    },
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        res.json(students);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer un élève
router.post('/students', [
    (0, express_validator_1.body)('email').isEmail(),
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
    (0, express_validator_1.body)('firstName').notEmpty(),
    (0, express_validator_1.body)('lastName').notEmpty(),
    (0, express_validator_1.body)('studentId').notEmpty(),
    (0, express_validator_1.body)('dateOfBirth').isISO8601(),
    (0, express_validator_1.body)('gender').isIn(['MALE', 'FEMALE', 'OTHER']),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            const arr = errors.array();
            return res.status(400).json({
                error: arr.map((e) => e.msg).join(' · '),
                errors: arr,
            });
        }
        const { email, password, firstName, lastName, phone, studentId, dateOfBirth, birthPlace, isRepeating, gender, address, emergencyContact, emergencyPhone, emergencyContact2, emergencyPhone2, medicalInfo, allergies, specialNeeds, classId: classIdRaw, classGroupId: classGroupIdRaw, enrollmentDate, enrollmentStatus, stateAssignment, nationalMatricule, } = req.body;
        const classId = typeof classIdRaw === 'string' && classIdRaw.trim() ? classIdRaw.trim() : undefined;
        const classGroupId = typeof classGroupIdRaw === 'string' && classGroupIdRaw.trim() ? classGroupIdRaw.trim() : undefined;
        const schoolId = req.schoolId;
        if (classId && !(0, school_access_guard_util_1.isObjectId)(classId)) {
            return res.status(400).json({ error: 'Identifiant de classe invalide' });
        }
        if (classGroupId && !(0, school_access_guard_util_1.isObjectId)(classGroupId)) {
            return res.status(400).json({ error: 'Identifiant de groupe invalide' });
        }
        if (classId && schoolId) {
            const cls = await prisma_1.default.class.findFirst({
                where: { id: classId, schoolId },
                select: { id: true },
            });
            if (!cls) {
                return res.status(400).json({ error: 'Classe introuvable dans cet établissement' });
            }
        }
        // Vérifier si l'email existe déjà
        const existingUser = await prisma_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }
        // Vérifier si le studentId existe déjà
        const existingStudent = await prisma_1.default.student.findUnique({
            where: { studentId },
        });
        if (existingStudent) {
            return res.status(400).json({ error: 'Ce numéro d\'élève existe déjà' });
        }
        const { hashedPassword, shouldSendSetupEmail } = await (0, admin_user_initial_password_util_1.resolveAdminProvidedOrInvitePassword)(password);
        // Créer l'utilisateur et le profil élève
        const user = await prisma_1.default.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                phone,
                role: 'STUDENT',
                studentProfile: {
                    create: {
                        studentId,
                        dateOfBirth: new Date(dateOfBirth),
                        birthPlace: typeof birthPlace === 'string' && birthPlace.trim() ? birthPlace.trim() : undefined,
                        isRepeating: Boolean(isRepeating),
                        gender,
                        address,
                        emergencyContact,
                        emergencyPhone,
                        emergencyContact2,
                        emergencyPhone2,
                        medicalInfo,
                        allergies,
                        specialNeeds,
                        digitalCardPublicId: (0, digital_card_util_1.generateDigitalCardPublicId)(),
                        classId,
                        classGroupId,
                        schoolId: schoolId ?? undefined,
                        ...(enrollmentDate && { enrollmentDate: new Date(enrollmentDate) }),
                        ...(typeof nationalMatricule === 'string' && nationalMatricule.trim()
                            ? { nationalMatricule: nationalMatricule.trim().slice(0, 64) }
                            : {}),
                        ...(stateAssignment === 'STATE_ASSIGNED' || stateAssignment === 'NOT_STATE_ASSIGNED'
                            ? { stateAssignment }
                            : {}),
                        ...(enrollmentStatus &&
                            ['ACTIVE', 'SUSPENDED', 'GRADUATED', 'ARCHIVED'].includes(enrollmentStatus) && {
                            enrollmentStatus,
                        }),
                    },
                },
            },
            include: {
                studentProfile: {
                    include: {
                        class: true,
                    },
                },
            },
        });
        // Enregistrer l'événement de sécurité pour l'activité
        try {
            await prisma_1.default.securityEvent.create({
                data: {
                    userId: req.user?.id,
                    type: 'student_added',
                    description: `Élève créé: ${firstName} ${lastName} (${studentId})${classId ? ' - Classe assignée' : ''}`,
                    ipAddress: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('user-agent'),
                    severity: 'info',
                },
            });
        }
        catch (eventError) {
            // Ne pas faire échouer la création de l'élève si l'événement échoue
            console.error('Erreur lors de la création de l\'événement de sécurité:', eventError);
        }
        if (shouldSendSetupEmail) {
            try {
                await (0, admin_user_initial_password_util_1.inviteNewUserToSetPassword)(user.id, user.email, user.firstName);
            }
            catch (inviteErr) {
                console.error('Invitation mot de passe (élève):', inviteErr);
            }
        }
        const { password: _pw, ...userWithoutPassword } = user;
        res.status(201).json({ ...userWithoutPassword, passwordSetupEmailSent: shouldSendSetupEmail });
    }
    catch (error) {
        console.error('POST /admin/students:', error);
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
// Obtenir un élève par ID
router.get('/students/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({ error: 'Identifiant élève invalide' });
        }
        const schoolId = req.schoolId;
        const student = await prisma_1.default.student.findFirst({
            where: {
                id,
                ...(0, school_context_util_1.studentScopeWhere)(schoolId, req.school?.isDefault ?? false),
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
                    },
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        level: true,
                        academicYear: true,
                        trackId: true,
                        track: { select: { id: true, name: true, code: true } },
                    },
                },
                subjectOptions: {
                    include: { option: { select: { id: true, name: true, code: true } } },
                },
                parents: {
                    include: {
                        parent: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                        email: true,
                                        phone: true,
                                    },
                                },
                            },
                        },
                    },
                },
                schoolHistory: {
                    orderBy: { createdAt: 'desc' },
                },
                transfers: {
                    orderBy: { createdAt: 'desc' },
                    take: 80,
                },
                _count: {
                    select: {
                        grades: true,
                        absences: true,
                    },
                },
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        res.json(student);
    }
    catch (error) {
        console.error('GET /admin/students/:id:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
// Payload complet pour export PDF du dossier d'inscription élève
router.get('/students/:id/enrollment-dossier', async (req, res) => {
    try {
        const { id } = req.params;
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({ error: 'Identifiant élève invalide' });
        }
        const schoolId = req.schoolId;
        const inScope = await prisma_1.default.student.findFirst({
            where: {
                id,
                ...(0, school_context_util_1.studentScopeWhere)(schoolId, req.school?.isDefault ?? false),
            },
            select: { id: true },
        });
        if (!inScope) {
            return res.status(404).json({
                error: 'Élève introuvable dans cet établissement. Vérifiez l’établissement sélectionné dans le menu.',
            });
        }
        const payload = await (0, student_enrollment_dossier_util_1.buildStudentEnrollmentDossierPayload)(id);
        if (!payload) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        res.json(payload);
    }
    catch (error) {
        console.error('GET /admin/students/:id/enrollment-dossier:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
// Carte étudiant numérique (QR + lien public)
router.get('/students/:id/digital-card', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true, digitalCardPublicId: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        let publicId = student.digitalCardPublicId;
        if (!publicId) {
            publicId = (0, digital_card_util_1.generateDigitalCardPublicId)();
            await prisma_1.default.student.update({
                where: { id: student.id },
                data: { digitalCardPublicId: publicId },
            });
        }
        const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim() || 'http://localhost:3000';
        const cardPageUrl = `${frontendBase.replace(/\/+$/, '')}/carte-etudiant/${encodeURIComponent(publicId)}`;
        const qrDataUrl = await qrcode_1.default.toDataURL(cardPageUrl, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
        res.json({ publicId, cardPageUrl, qrDataUrl });
    }
    catch (error) {
        console.error('GET /admin/students/:id/digital-card:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Historique scolaire (ligne manuelle)
router.post('/students/:id/school-history', async (req, res) => {
    try {
        const { academicYear, className, classLevel, establishment, notes, classId } = req.body;
        if (!academicYear || typeof academicYear !== 'string') {
            return res.status(400).json({ error: 'Année scolaire requise' });
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const row = await prisma_1.default.studentSchoolHistory.create({
            data: {
                studentId: student.id,
                academicYear: String(academicYear).trim(),
                className: className != null ? String(className) : undefined,
                classLevel: classLevel != null ? String(classLevel) : undefined,
                establishment: establishment != null ? String(establishment) : undefined,
                notes: notes != null ? String(notes) : undefined,
                classId: typeof classId === 'string' && classId.length > 0 ? classId : undefined,
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        console.error('POST /admin/students/:id/school-history:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/students/:studentId/school-history/:historyId', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.studentId },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const row = await prisma_1.default.studentSchoolHistory.findFirst({
            where: { id: req.params.historyId, studentId: student.id },
        });
        if (!row) {
            return res.status(404).json({ error: 'Entrée introuvable' });
        }
        await prisma_1.default.studentSchoolHistory.delete({ where: { id: row.id } });
        res.json({ message: 'Entrée supprimée' });
    }
    catch (error) {
        console.error('DELETE school-history:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Transfert / mutation / réinscription / départ de classe
router.post('/students/:id/transfer', async (req, res) => {
    try {
        const { effectiveDate, reason, notes, transferType, toClassId } = req.body;
        const typeRaw = typeof transferType === 'string' ? transferType : 'CLASS_CHANGE';
        if (!['CLASS_CHANGE', 'REENROLLMENT', 'MUTATION', 'DEPARTURE'].includes(typeRaw)) {
            return res.status(400).json({ error: 'Type de mouvement invalide' });
        }
        if (!effectiveDate) {
            return res.status(400).json({ error: 'Date effective requise' });
        }
        const eff = new Date(effectiveDate);
        if (Number.isNaN(eff.getTime())) {
            return res.status(400).json({ error: 'Date invalide' });
        }
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true, classId: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const adminUser = req.user;
        const fromClassId = student.classId;
        if (typeRaw === 'DEPARTURE') {
            await prisma_1.default.studentTransfer.create({
                data: {
                    studentId: student.id,
                    fromClassId,
                    toClassId: null,
                    effectiveDate: eff,
                    transferType: 'DEPARTURE',
                    reason: reason != null ? String(reason) : undefined,
                    notes: notes != null ? String(notes) : undefined,
                    createdById: adminUser?.id,
                },
            });
            const updated = await prisma_1.default.student.update({
                where: { id: student.id },
                data: { classId: null },
                include: {
                    user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                    class: true,
                },
            });
            return res.status(201).json({ transfer: true, student: updated });
        }
        if (!toClassId || typeof toClassId !== 'string') {
            return res.status(400).json({ error: 'Classe de destination requise' });
        }
        const targetClass = await prisma_1.default.class.findUnique({ where: { id: toClassId } });
        if (!targetClass) {
            return res.status(400).json({ error: 'Classe de destination introuvable' });
        }
        await prisma_1.default.studentTransfer.create({
            data: {
                studentId: student.id,
                fromClassId,
                toClassId,
                effectiveDate: eff,
                transferType: typeRaw,
                reason: reason != null ? String(reason) : undefined,
                notes: notes != null ? String(notes) : undefined,
                createdById: adminUser?.id,
            },
        });
        const extra = { classId: toClassId };
        if (typeRaw === 'REENROLLMENT') {
            extra.enrollmentStatus = 'ACTIVE';
            extra.lastReenrollmentAt = new Date();
        }
        const updated = await prisma_1.default.student.update({
            where: { id: student.id },
            data: extra,
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                class: true,
            },
        });
        res.status(201).json({ transfer: true, student: updated });
    }
    catch (error) {
        console.error('POST /admin/students/:id/transfer:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Archivage dossier (ancien élève)
router.post('/students/:id/archive', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const updated = await prisma_1.default.student.update({
            where: { id: student.id },
            data: {
                enrollmentStatus: 'ARCHIVED',
                isActive: false,
                archivedAt: new Date(),
            },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                class: true,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('POST /admin/students/:id/archive:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Désarchivage dossier élève
router.post('/students/:id/unarchive', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true, enrollmentStatus: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        if (student.enrollmentStatus !== 'ARCHIVED') {
            return res.status(400).json({ error: 'Ce dossier n’est pas archivé' });
        }
        const updated = await prisma_1.default.student.update({
            where: { id: student.id },
            data: {
                enrollmentStatus: 'ACTIVE',
                isActive: true,
                archivedAt: null,
            },
            include: {
                user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
                class: true,
            },
        });
        res.json(updated);
    }
    catch (error) {
        console.error('POST /admin/students/:id/unarchive:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Documents d'identité d'un élève (admin)
router.get('/students/:id/identity-documents', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const documents = await prisma_1.default.identityDocument.findMany({
            where: { studentId: student.id },
            orderBy: { createdAt: 'desc' },
            include: {
                uploadedBy: {
                    select: { firstName: true, lastName: true, role: true, email: true },
                },
            },
        });
        res.json(documents.map((doc) => ({
            ...doc,
            fileUrl: (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(doc.fileUrl),
        })));
    }
    catch (error) {
        console.error('GET /admin/students/:id/identity-documents:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.delete('/students/:studentId/identity-documents/:docId', async (req, res) => {
    try {
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.studentId },
            select: { id: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const doc = await prisma_1.default.identityDocument.findFirst({
            where: { id: req.params.docId, studentId: student.id },
        });
        if (!doc) {
            return res.status(404).json({ error: 'Document introuvable' });
        }
        await prisma_1.default.identityDocument.delete({ where: { id: doc.id } });
        await (0, upload_persist_util_1.deleteStoredUploadUrl)(doc.fileUrl);
        res.json({ message: 'Document supprimé' });
    }
    catch (error) {
        console.error('DELETE admin identity-document:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
// Photo de profil élève (administration)
router.post('/students/:id/avatar', upload_middleware_1.upload.single('avatar'), async (req, res) => {
    try {
        if (!(0, school_access_guard_util_1.isObjectId)(req.params.id)) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(400).json({ error: 'Identifiant élève invalide' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const schoolId = req.schoolId;
        const student = await prisma_1.default.student.findFirst({
            where: {
                id: req.params.id,
                ...(0, school_context_util_1.studentScopeWhere)(schoolId, req.school?.isDefault),
            },
            select: { id: true, userId: true, user: { select: { avatar: true } } },
        });
        if (!student) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'avatars', { req });
        const previousAvatar = student.user?.avatar;
        await prisma_1.default.user.update({
            where: { id: student.userId },
            data: { avatar: fullUrl },
        });
        if (previousAvatar && previousAvatar !== fullUrl) {
            await (0, upload_persist_util_1.deleteStoredUploadUrl)(previousAvatar).catch(() => undefined);
        }
        res.json({
            message: 'Photo de l\'élève mise à jour',
            url: fullUrl,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        console.error('POST /admin/students/:id/avatar:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
// Mettre à jour un élève
router.put('/students/:id', async (req, res) => {
    try {
        const body = req.body;
        const { firstName, lastName, phone, avatar, address, emergencyContact, emergencyPhone, emergencyContact2, emergencyPhone2, medicalInfo, allergies, specialNeeds, birthPlace, isRepeating, dateOfBirth, gender, classId, classGroupId: classGroupIdRaw, isActive, nfcId, enrollmentStatus, stateAssignment, nationalMatricule, subjectOptionIds, } = body;
        const emptyToNull = (v) => {
            if (v === undefined)
                return undefined;
            if (v === null)
                return null;
            if (typeof v !== 'string')
                return undefined;
            const t = v.trim();
            return t.length === 0 ? null : t;
        };
        const student = await prisma_1.default.student.findUnique({
            where: { id: req.params.id },
            include: { user: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        if (enrollmentStatus !== undefined &&
            typeof enrollmentStatus === 'string' &&
            !['ACTIVE', 'SUSPENDED', 'GRADUATED', 'ARCHIVED'].includes(enrollmentStatus)) {
            return res.status(400).json({ error: 'Statut d\'inscription invalide' });
        }
        // Mettre à jour l'utilisateur
        if (firstName || lastName || phone !== undefined || avatar !== undefined) {
            await prisma_1.default.user.update({
                where: { id: student.userId },
                data: {
                    ...(typeof firstName === 'string' && firstName.trim() && { firstName: firstName.trim() }),
                    ...(typeof lastName === 'string' && lastName.trim() && { lastName: lastName.trim() }),
                    ...(phone !== undefined && {
                        phone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
                    }),
                    ...(avatar !== undefined && {
                        avatar: avatar === null || (typeof avatar === 'string' && avatar.trim() === '')
                            ? null
                            : String(avatar),
                    }),
                },
            });
        }
        const studentData = {};
        if (address !== undefined)
            studentData.address = emptyToNull(address) ?? null;
        if (emergencyContact !== undefined)
            studentData.emergencyContact = emptyToNull(emergencyContact) ?? null;
        if (emergencyPhone !== undefined)
            studentData.emergencyPhone = emptyToNull(emergencyPhone) ?? null;
        if (emergencyContact2 !== undefined)
            studentData.emergencyContact2 = emptyToNull(emergencyContact2) ?? null;
        if (emergencyPhone2 !== undefined)
            studentData.emergencyPhone2 = emptyToNull(emergencyPhone2) ?? null;
        if (medicalInfo !== undefined)
            studentData.medicalInfo = emptyToNull(medicalInfo) ?? null;
        if (allergies !== undefined)
            studentData.allergies = emptyToNull(allergies) ?? null;
        if (specialNeeds !== undefined)
            studentData.specialNeeds = emptyToNull(specialNeeds) ?? null;
        if (birthPlace !== undefined)
            studentData.birthPlace = emptyToNull(birthPlace) ?? null;
        if (isRepeating !== undefined)
            studentData.isRepeating = Boolean(isRepeating);
        if (dateOfBirth !== undefined && typeof dateOfBirth === 'string' && dateOfBirth.trim()) {
            studentData.dateOfBirth = new Date(dateOfBirth);
        }
        if (gender !== undefined &&
            typeof gender === 'string' &&
            ['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
            studentData.gender = gender;
        }
        if (classId !== undefined) {
            studentData.classId =
                typeof classId === 'string' && classId.trim().length > 0 ? classId.trim() : null;
        }
        if (classGroupIdRaw !== undefined) {
            const classGroupId = typeof classGroupIdRaw === 'string' && classGroupIdRaw.trim()
                ? classGroupIdRaw.trim()
                : null;
            if (classGroupId && !(0, school_access_guard_util_1.isObjectId)(classGroupId)) {
                return res.status(400).json({ error: 'Identifiant de groupe invalide' });
            }
            studentData.classGroupId = classGroupId;
        }
        if (stateAssignment !== undefined &&
            (stateAssignment === 'STATE_ASSIGNED' || stateAssignment === 'NOT_STATE_ASSIGNED')) {
            studentData.stateAssignment = stateAssignment;
        }
        if (nationalMatricule !== undefined) {
            studentData.nationalMatricule = emptyToNull(nationalMatricule)?.slice(0, 64) ?? null;
        }
        if (isActive !== undefined)
            studentData.isActive = Boolean(isActive);
        if (nfcId !== undefined) {
            studentData.nfcId = typeof nfcId === 'string' && nfcId.trim() ? nfcId.trim() : null;
        }
        if (enrollmentStatus !== undefined && typeof enrollmentStatus === 'string') {
            studentData.enrollmentStatus = enrollmentStatus;
        }
        const updatedStudent = await prisma_1.default.student.update({
            where: { id: req.params.id },
            data: studentData,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        avatar: true,
                    },
                },
                class: true,
                schoolHistory: { orderBy: { createdAt: 'desc' } },
                transfers: { orderBy: { createdAt: 'desc' }, take: 80 },
                subjectOptions: {
                    include: { option: { select: { id: true, name: true, code: true } } },
                },
            },
        });
        if (Array.isArray(subjectOptionIds)) {
            const academicYear = updatedStudent.class?.academicYear ??
                (typeof body.academicYear === 'string' && body.academicYear.trim()
                    ? body.academicYear.trim()
                    : new Date().getFullYear().toString());
            const ids = subjectOptionIds.map(String).filter(Boolean);
            await prisma_1.default.studentSubjectOption.deleteMany({
                where: { studentId: req.params.id, academicYear },
            });
            if (ids.length > 0) {
                await prisma_1.default.studentSubjectOption.createMany({
                    data: ids.map((optionId) => ({
                        studentId: req.params.id,
                        optionId,
                        academicYear,
                    })),
                });
            }
            const withOptions = await prisma_1.default.student.findUnique({
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
                        },
                    },
                    class: true,
                    schoolHistory: { orderBy: { createdAt: 'desc' } },
                    transfers: { orderBy: { createdAt: 'desc' }, take: 80 },
                    subjectOptions: {
                        include: { option: { select: { id: true, name: true, code: true } } },
                    },
                },
            });
            return res.json(withOptions ?? updatedStudent);
        }
        res.json(updatedStudent);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Supprimer un élève
router.delete('/students/:id', async (req, res) => {
    try {
        const studentId = req.params.id;
        const student = await prisma_1.default.student.findUnique({
            where: { id: studentId },
            include: { user: true },
        });
        if (!student) {
            return res.status(404).json({ error: 'Élève non trouvé' });
        }
        const identityDocsToDelete = await prisma_1.default.identityDocument.findMany({
            where: { studentId },
            select: { fileUrl: true },
        });
        // Utiliser une transaction pour supprimer toutes les relations dans le bon ordre
        await prisma_1.default.$transaction(async (tx) => {
            // 1. Supprimer les relations StudentParent
            await tx.studentParent.deleteMany({
                where: { studentId },
            });
            await tx.studentPickupAuthorization.deleteMany({
                where: { studentId },
            });
            await tx.parentConsent.deleteMany({
                where: { studentId },
            });
            // 2. Supprimer les absences associées
            await tx.absence.deleteMany({
                where: { studentId },
            });
            // 3. Supprimer les notes associées
            await tx.grade.deleteMany({
                where: { studentId },
            });
            // 4. Supprimer les assignments associés
            await tx.studentAssignment.deleteMany({
                where: { studentId },
            });
            await tx.elearningQuizAttempt.deleteMany({
                where: { studentId },
            });
            await tx.elearningLessonProgress.deleteMany({
                where: { studentId },
            });
            await tx.parentTeacherAppointment.deleteMany({
                where: { studentId },
            });
            await tx.reportCard.deleteMany({
                where: { studentId },
            });
            await tx.conduct.deleteMany({
                where: { studentId },
            });
            await tx.studentDisciplinaryRecord.deleteMany({
                where: { studentId },
            });
            await tx.extracurricularRegistration.deleteMany({
                where: { studentId },
            });
            await tx.studentOrientationFollowUp.deleteMany({
                where: { studentId },
            });
            await tx.studentOrientationPlacement.deleteMany({
                where: { studentId },
            });
            await tx.studentSubjectOption.deleteMany({
                where: { studentId },
            });
            await tx.staffModuleRecord.updateMany({
                where: { studentId },
                data: { studentId: null },
            });
            await tx.healthEmergencyLog.updateMany({
                where: { studentId },
                data: { studentId: null },
            });
            await tx.studentHealthDossier.deleteMany({
                where: { studentId },
            });
            await tx.studentVaccination.deleteMany({
                where: { studentId },
            });
            await tx.studentAllergyRecord.deleteMany({
                where: { studentId },
            });
            await tx.studentTreatment.deleteMany({
                where: { studentId },
            });
            await tx.infirmaryVisit.deleteMany({
                where: { studentId },
            });
            await tx.healthCampaignParticipation.deleteMany({
                where: { studentId },
            });
            await tx.payment.deleteMany({
                where: { studentId },
            });
            await tx.tuitionFee.deleteMany({
                where: { studentId },
            });
            await tx.identityDocument.deleteMany({
                where: { studentId },
            });
            await tx.studentSchoolHistory.deleteMany({
                where: { studentId },
            });
            await tx.studentTransfer.deleteMany({
                where: { studentId },
            });
            // Garde finale : certaines bases de prod ont des conduites historiques orphelines
            // qui bloquent la relation obligatoire ConductToStudent au moment du delete.
            await tx.conduct.deleteMany({
                where: { studentId },
            });
            // 5. Supprimer le profil élève
            await tx.student.delete({
                where: { id: studentId },
            });
            // 6. Désactiver/anonymiser l'utilisateur au lieu de le supprimer :
            // il peut rester référencé par des paiements, logs, messages ou historiques.
            await tx.passwordResetToken.deleteMany({ where: { userId: student.userId } });
            await tx.pushSubscription.deleteMany({ where: { userId: student.userId } });
            await tx.schoolMember.deleteMany({ where: { userId: student.userId } });
            await tx.user.update({
                where: { id: student.userId },
                data: {
                    email: `deleted-student-${student.id}-${Date.now()}@deleted.local`,
                    firstName: 'Élève',
                    lastName: 'supprimé',
                    phone: null,
                    avatar: null,
                    isActive: false,
                },
            });
        }, {
            maxWait: 10000,
            timeout: 30000,
        });
        for (const d of identityDocsToDelete) {
            await (0, upload_persist_util_1.deleteStoredUploadUrl)(d.fileUrl).catch((error) => {
                console.warn('Document identité élève non supprimé du stockage:', error);
            });
        }
        res.json({ message: 'Élève supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur lors de la suppression de l\'élève:', error);
        res.status(500).json({
            error: error.message || 'Erreur lors de la suppression',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin-students.routes.js.map