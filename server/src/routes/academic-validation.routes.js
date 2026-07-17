"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const auth_middleware_1 = require("../middleware/auth.middleware");
const academic_change_request_util_1 = require("../utils/academic-change-request.util");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
const APPROVER_ROLES = new Set(['TEACHER', 'EDUCATOR', 'ADMIN', 'SUPER_ADMIN', 'STAFF']);
router.get('/pending', async (req, res) => {
    try {
        const role = req.user.role;
        if (!APPROVER_ROLES.has(role)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        const rows = await (0, academic_change_request_util_1.listPendingForUser)(req.user.id, role);
        res.json(rows.map((r) => ({
            ...r,
            statusLabel: (0, academic_change_request_util_1.workflowStatusLabel)(r.status),
        })));
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.get('/my-requests', async (req, res) => {
    try {
        const rows = await (0, academic_change_request_util_1.listRequestsByRequester)(req.user.id);
        res.json(rows.map((r) => ({
            ...r,
            statusLabel: (0, academic_change_request_util_1.workflowStatusLabel)(r.status),
        })));
    }
    catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.post('/:id/approve', [(0, express_validator_1.body)('note').optional().isString().isLength({ max: 2000 })], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const role = req.user.role;
        if (!APPROVER_ROLES.has(role)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        const updated = await (0, academic_change_request_util_1.approveAcademicChangeRequest)({
            requestId: req.params.id,
            userId: req.user.id,
            role,
            note: req.body.note,
        });
        res.json({
            ...updated,
            statusLabel: updated ? (0, academic_change_request_util_1.workflowStatusLabel)(updated.status) : undefined,
        });
    }
    catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error
            ? Number(error.statusCode)
            : 500;
        res.status(statusCode).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
router.post('/:id/reject', [(0, express_validator_1.body)('reason').optional().isString().isLength({ max: 2000 })], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const role = req.user.role;
        if (!APPROVER_ROLES.has(role)) {
            return res.status(403).json({ error: 'Accès non autorisé' });
        }
        const updated = await (0, academic_change_request_util_1.rejectAcademicChangeRequest)({
            requestId: req.params.id,
            userId: req.user.id,
            role,
            reason: req.body.reason,
        });
        res.json({
            ...updated,
            statusLabel: (0, academic_change_request_util_1.workflowStatusLabel)(updated.status),
        });
    }
    catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error
            ? Number(error.statusCode)
            : 500;
        res.status(statusCode).json({
            error: error instanceof Error ? error.message : 'Erreur serveur',
        });
    }
});
exports.default = router;
//# sourceMappingURL=academic-validation.routes.js.map