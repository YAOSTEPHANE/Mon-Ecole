"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const device_api_key_middleware_1 = require("../middleware/device-api-key.middleware");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const face_recognition_util_1 = require("../utils/face-recognition.util");
const face_punch_util_1 = require("../utils/face-punch.util");
const router = express_1.default.Router();
function hasDeviceApiKeyAttempt(req) {
    const header = req.headers['x-nfc-api-key'];
    const bodyKey = req.body?.apiKey;
    return ((typeof header === 'string' && header.length > 0) ||
        (typeof bodyKey === 'string' && bodyKey.length > 0));
}
function requireAdminOrDevice(req, res, next) {
    if (hasDeviceApiKeyAttempt(req))
        return (0, device_api_key_middleware_1.verifyDeviceApiKey)(req, res, next);
    return (0, auth_middleware_1.authenticate)(req, res, () => (0, auth_middleware_1.authorize)('ADMIN', 'SUPER_ADMIN')(req, res, next));
}
/** Statistiques d’enrôlement (admin). */
router.get('/stats', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'SUPER_ADMIN'), async (_req, res) => {
    try {
        const counts = await (0, face_recognition_util_1.countFaceEnrollments)();
        res.json({
            ...counts,
            matchThreshold: parseFloat(process.env.FACE_MATCH_THRESHOLD || '0.55'),
        });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/** Enregistrer / mettre à jour le visage d’une personne. */
router.post('/enroll', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'SUPER_ADMIN'), [
    (0, express_validator_1.body)('personType').isIn(['STUDENT', 'TEACHER', 'STAFF']),
    (0, express_validator_1.body)('personId').notEmpty(),
    (0, express_validator_1.body)('descriptor').isArray({ min: 128, max: 128 }),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        const personType = req.body.personType;
        const personId = String(req.body.personId);
        const descriptor = (0, face_recognition_util_1.parseFaceDescriptor)(req.body.descriptor);
        await (0, face_recognition_util_1.saveFaceDescriptor)(personType, personId, descriptor);
        res.json({
            ok: true,
            personType,
            personId,
            enrolledAt: new Date().toISOString(),
        });
    }
    catch (e) {
        const err = e;
        res.status(err.status ?? 500).json({ error: err.message || 'Erreur serveur' });
    }
});
/** Supprimer l’enrôlement facial. */
router.delete('/enroll/:personType/:personId', auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
    try {
        const personType = req.params.personType;
        if (!['STUDENT', 'TEACHER', 'STAFF'].includes(personType)) {
            return res.status(400).json({ error: 'personType invalide' });
        }
        await (0, face_recognition_util_1.clearFaceDescriptor)(personType, req.params.personId);
        res.json({ ok: true });
    }
    catch (e) {
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/** Identifier un visage sans pointer (admin / debug). */
router.post('/match', rate_limit_middleware_1.deviceBiometricLimiter, requireAdminOrDevice, [(0, express_validator_1.body)('descriptor').isArray({ min: 128, max: 128 }), (0, express_validator_1.body)('personType').optional().isIn(['STUDENT', 'TEACHER', 'STAFF'])], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        const descriptor = (0, face_recognition_util_1.parseFaceDescriptor)(req.body.descriptor);
        const match = await (0, face_recognition_util_1.findBestFaceMatch)(descriptor, {
            personType: req.body.personType,
        });
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Aucun visage correspondant dans la base.',
            });
        }
        res.json({ success: true, match });
    }
    catch (e) {
        const err = e;
        res.status(err.status ?? 500).json({ error: err.message || 'Erreur serveur' });
    }
});
/** Pointage par reconnaissance faciale (terminal ou interface admin). */
router.post('/punch', rate_limit_middleware_1.deviceBiometricLimiter, requireAdminOrDevice, [
    (0, express_validator_1.body)('descriptor').isArray({ min: 128, max: 128 }),
    (0, express_validator_1.body)('courseId').optional().isString(),
    (0, express_validator_1.body)('date').optional().isISO8601(),
    (0, express_validator_1.body)('personType').optional().isIn(['STUDENT', 'TEACHER', 'STAFF']),
    (0, express_validator_1.body)('notifyParentsOnSave').optional().isBoolean(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty())
            return res.status(400).json({ errors: errors.array() });
        const descriptor = (0, face_recognition_util_1.parseFaceDescriptor)(req.body.descriptor);
        const match = await (0, face_recognition_util_1.findBestFaceMatch)(descriptor, {
            personType: req.body.personType,
        });
        if (!match) {
            return res.status(404).json({
                success: false,
                error: 'Visage non reconnu. Enregistrez le profil ou réessayez.',
            });
        }
        const result = await (0, face_punch_util_1.executeFacePunch)({
            match,
            courseId: req.body.courseId,
            at: req.body.date ? new Date(req.body.date) : new Date(),
            notifyParents: req.body.notifyParentsOnSave !== false,
            recordedByUserId: req.user?.id,
        });
        res.status(200).json(result);
    }
    catch (e) {
        const err = e;
        const code = err.status ?? err.statusCode ?? 500;
        res.status(code).json({
            success: false,
            error: err.message || 'Pointage impossible',
        });
    }
});
exports.default = router;
//# sourceMappingURL=face.routes.js.map