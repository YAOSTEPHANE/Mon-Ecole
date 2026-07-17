"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const upload_access_token_util_1 = require("../utils/upload-access-token.util");
const upload_persist_util_1 = require("../utils/upload-persist.util");
const IDENTITY_TYPES = [
    'NATIONAL_ID',
    'BIRTH_CERTIFICATE',
    'PASSPORT',
    'RESIDENCE_PERMIT',
    'PHOTO_ID',
    'OTHER',
];
const TEACHER_ADMIN_DOC_TYPES = [
    'CONTRACT',
    'DIPLOMA_COPY',
    'HR_LETTER',
    'CERTIFICATE',
    'OTHER',
];
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
router.post('/avatar', upload_middleware_1.upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'avatars', { req });
        await prisma_1.default.user.update({
            where: { id: req.user.id },
            data: { avatar: fullUrl },
        });
        res.json({
            message: 'Avatar uploadé avec succès',
            url: fullUrl,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        res.status(500).json({ error: error.message });
    }
});
router.post('/assignment', upload_middleware_1.upload.single('assignment'), async (req, res) => {
    try {
        const role = req.user?.role;
        if (!role || !['TEACHER', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(403).json({ error: 'Seuls les enseignants et administrateurs peuvent joindre des fichiers aux devoirs' });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'assignments', { req });
        res.json({
            message: 'Fichier uploadé avec succès',
            url: fullUrl,
            filename: req.file.originalname,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        res.status(500).json({ error: error.message });
    }
});
router.post('/course', upload_middleware_1.upload.single('course'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'courses', { req });
        res.json({
            message: 'Image uploadée avec succès',
            url: fullUrl,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        res.status(500).json({ error: error.message });
    }
});
router.post('/identity-document', upload_middleware_1.identityUpload.single('identityDocument'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const role = req.user?.role;
        const { type, label, notes, studentId: bodyStudentId } = req.body;
        if (!type || !IDENTITY_TYPES.includes(type)) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(400).json({ error: 'Type de document invalide' });
        }
        let targetStudentId;
        if (role === 'ADMIN') {
            if (!bodyStudentId) {
                (0, upload_persist_util_1.discardUploadedFile)(req.file);
                return res.status(400).json({ error: 'studentId requis pour déposer le document sur un dossier élève' });
            }
            const st = await prisma_1.default.student.findUnique({ where: { id: String(bodyStudentId) } });
            if (!st) {
                (0, upload_persist_util_1.discardUploadedFile)(req.file);
                return res.status(404).json({ error: 'Élève introuvable' });
            }
            targetStudentId = st.id;
        }
        else if (role === 'STUDENT') {
            const st = await prisma_1.default.student.findFirst({ where: { userId: req.user.id } });
            if (!st) {
                (0, upload_persist_util_1.discardUploadedFile)(req.file);
                return res.status(404).json({ error: 'Profil élève introuvable' });
            }
            targetStudentId = st.id;
        }
        else {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(403).json({ error: 'Seuls les élèves et administrateurs peuvent déposer des pièces' });
        }
        const fileUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'identity-documents', { req });
        const doc = await prisma_1.default.identityDocument.create({
            data: {
                studentId: targetStudentId,
                type: type,
                label: type === 'OTHER' && label && String(label).trim()
                    ? String(label).trim().slice(0, 120)
                    : null,
                fileUrl,
                originalName: req.file.originalname.slice(0, 255),
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                notes: notes && String(notes).trim() ? String(notes).trim().slice(0, 500) : null,
                uploadedById: req.user.id,
            },
            include: {
                uploadedBy: { select: { firstName: true, lastName: true, role: true } },
            },
        });
        res.status(201).json({
            message: 'Document enregistré',
            document: {
                ...doc,
                fileUrl: (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(doc.fileUrl),
            },
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        console.error('POST /upload/identity-document:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/teacher-admin-document', upload_middleware_1.identityUpload.single('teacherAdminDocument'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        if (req.user?.role !== 'ADMIN') {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(403).json({ error: 'Réservé aux administrateurs' });
        }
        const { type, label, notes, teacherId: bodyTeacherId } = req.body;
        if (!bodyTeacherId) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(400).json({ error: 'teacherId requis' });
        }
        if (!type || !TEACHER_ADMIN_DOC_TYPES.includes(type)) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(400).json({ error: 'Type de document invalide' });
        }
        const t = await prisma_1.default.teacher.findUnique({ where: { id: String(bodyTeacherId) } });
        if (!t) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(404).json({ error: 'Enseignant introuvable' });
        }
        const fileUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'teacher-admin-documents', { req });
        const doc = await prisma_1.default.teacherAdministrativeDocument.create({
            data: {
                teacherId: t.id,
                type: type,
                label: type === 'OTHER' && label && String(label).trim()
                    ? String(label).trim().slice(0, 120)
                    : null,
                fileUrl,
                originalName: req.file.originalname.slice(0, 255),
                mimeType: req.file.mimetype,
                fileSize: req.file.size,
                notes: notes && String(notes).trim() ? String(notes).trim().slice(0, 500) : null,
                uploadedById: req.user.id,
            },
            include: {
                uploadedBy: { select: { firstName: true, lastName: true, role: true } },
            },
        });
        res.status(201).json({
            message: 'Document enregistré',
            document: {
                ...doc,
                fileUrl: (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(doc.fileUrl),
            },
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        console.error('POST /upload/teacher-admin-document:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/digital-library', upload_middleware_1.digitalLibraryUpload.single('digitalLibrary'), async (req, res) => {
    try {
        const role = req.user?.role;
        const userId = req.user?.id;
        if (!userId)
            return res.status(401).json({ error: 'Non authentifié' });
        let allowed = role === 'ADMIN' || role === 'SUPER_ADMIN';
        if (!allowed && role === 'STAFF') {
            const { assertStaffHasModule } = await import('../utils/staff-visible-modules.util');
            try {
                await assertStaffHasModule(userId, 'digital_library');
                allowed = true;
            }
            catch {
                allowed = false;
            }
        }
        if (!allowed) {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(403).json({ error: 'Droit insuffisant pour déposer une ressource numérique' });
        }
        if (!req.file)
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'digital-library', { req });
        res.json({
            message: 'Fichier déposé',
            url: fullUrl,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/elearning', upload_middleware_1.elearningUpload.single('elearning'), async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'TEACHER' && role !== 'ADMIN') {
            (0, upload_persist_util_1.discardUploadedFile)(req.file);
            return res.status(403).json({ error: 'Droit insuffisant' });
        }
        if (!req.file)
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        const fullUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'elearning', { req });
        res.json({
            message: 'Fichier déposé',
            url: fullUrl,
            filename: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
        });
    }
    catch (error) {
        (0, upload_persist_util_1.discardUploadedFile)(req.file);
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=upload.routes.js.map