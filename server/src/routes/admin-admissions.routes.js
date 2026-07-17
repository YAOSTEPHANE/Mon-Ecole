"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const password_util_1 = require("../utils/password.util");
const school_context_util_1 = require("../utils/school-context.util");
const admission_enroll_util_1 = require("../utils/admission-enroll.util");
const school_access_guard_util_1 = require("../utils/school-access-guard.util");
const router = express_1.default.Router();
async function admissionsWithEnrolledStudents(rows, mode) {
    const ids = [...new Set(rows.map((r) => r.enrolledStudentId).filter(Boolean))];
    if (ids.length === 0) {
        return rows.map((r) => ({ ...r, enrolledStudent: null }));
    }
    const include = mode === 'list'
        ? {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
            class: { select: { id: true, name: true, level: true } },
        }
        : mode === 'detail'
            ? {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
                class: true,
            }
            : {
                user: { select: { email: true, firstName: true, lastName: true } },
            };
    const students = await prisma_1.default.student.findMany({
        where: { id: { in: ids } },
        include,
    });
    const map = new Map(students.map((s) => [s.id, s]));
    return rows.map((r) => ({
        ...r,
        enrolledStudent: r.enrolledStudentId ? map.get(r.enrolledStudentId) ?? null : null,
    }));
}
router.get('/admissions', async (req, res) => {
    try {
        const { status, academicYear } = req.query;
        const schoolId = req.schoolId;
        const admissions = await prisma_1.default.admission.findMany({
            where: {
                ...(0, school_context_util_1.admissionScopeWhere)(schoolId, req.school?.isDefault),
                ...(status && typeof status === 'string' ? { status: status } : {}),
                ...(academicYear && typeof academicYear === 'string'
                    ? { academicYear: academicYear }
                    : {}),
            },
            include: {
                proposedClass: {
                    select: { id: true, name: true, level: true, academicYear: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const enriched = await admissionsWithEnrolledStudents(admissions, 'list');
        res.json(enriched);
    }
    catch (error) {
        console.error('GET /admissions:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/admissions/stats', async (req, res) => {
    try {
        const admissionWhere = (0, school_context_util_1.admissionScopeWhere)(req.schoolId, req.school?.isDefault);
        const [pending, underReview, accepted, total] = await Promise.all([
            prisma_1.default.admission.count({ where: { ...admissionWhere, status: 'PENDING' } }),
            prisma_1.default.admission.count({ where: { ...admissionWhere, status: 'UNDER_REVIEW' } }),
            prisma_1.default.admission.count({ where: { ...admissionWhere, status: 'ACCEPTED' } }),
            prisma_1.default.admission.count({ where: admissionWhere }),
        ]);
        res.json({ pending, underReview, accepted, total });
    }
    catch (error) {
        console.error('GET /admissions/stats:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.get('/admissions/:id', async (req, res) => {
    try {
        const admission = await prisma_1.default.admission.findFirst({
            where: {
                id: req.params.id,
                ...(0, school_context_util_1.admissionScopeWhere)(req.schoolId, req.school?.isDefault),
            },
            include: {
                proposedClass: true,
            },
        });
        if (!admission) {
            return res.status(404).json({ error: 'Dossier introuvable' });
        }
        const [enriched] = await admissionsWithEnrolledStudents([admission], 'detail');
        res.json(enriched);
    }
    catch (error) {
        console.error('GET /admissions/:id:', error);
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.patch('/admissions/:id', [
    (0, express_validator_1.body)('status')
        .optional()
        .isIn(['PENDING', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WAITLIST', 'ENROLLED'])
        .withMessage('Statut invalide'),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const existing = await prisma_1.default.admission.findFirst({
            where: {
                id: req.params.id,
                ...(0, school_context_util_1.admissionScopeWhere)(req.schoolId, req.school?.isDefault),
            },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Dossier introuvable' });
        }
        if (existing.status === 'ENROLLED' && req.body.status && req.body.status !== 'ENROLLED') {
            return res.status(400).json({ error: 'Impossible de modifier le statut d\'un dossier déjà inscrit' });
        }
        const { status, adminNotes, proposedClassId } = req.body;
        const adminId = req.user?.id;
        const nextProposedClassId = proposedClassId === '' || proposedClassId === null || proposedClassId === undefined
            ? null
            : String(proposedClassId);
        if (nextProposedClassId) {
            await (0, school_access_guard_util_1.assertClassInSchool)(nextProposedClassId, req.schoolId, req.school?.isDefault ?? false);
        }
        if (status === 'ENROLLED' && !existing.enrolledStudentId) {
            return res.status(400).json({
                error: 'Le statut « Inscrit » est attribué automatiquement après création du compte élève (action Inscrire).',
            });
        }
        const data = {
            ...(status !== undefined && { status }),
            ...(adminNotes !== undefined && { adminNotes: adminNotes === '' ? null : String(adminNotes) }),
            ...(proposedClassId !== undefined && {
                proposedClassId: nextProposedClassId,
            }),
            ...(status !== undefined &&
                status !== existing.status && {
                reviewedAt: new Date(),
                reviewedById: adminId,
            }),
        };
        const updated = await prisma_1.default.admission.update({
            where: { id: req.params.id },
            data,
            include: {
                proposedClass: { select: { id: true, name: true, level: true } },
            },
        });
        const [enriched] = await admissionsWithEnrolledStudents([updated], 'patch');
        try {
            await prisma_1.default.securityEvent.create({
                data: {
                    userId: adminId,
                    type: 'admission_updated',
                    description: `Dossier ${existing.reference}: ${status ?? existing.status}`,
                    ipAddress: req.ip || req.socket.remoteAddress,
                    userAgent: req.get('user-agent'),
                    severity: 'info',
                },
            });
        }
        catch (_) {
            /* ignore */
        }
        res.json(enriched);
    }
    catch (error) {
        console.error('PATCH /admissions/:id:', error);
        if (error instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
            return res.status(error.status).json({ error: error.message });
        }
        res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
});
router.post('/admissions/:id/enroll', [
    (0, express_validator_1.body)('password')
        .optional({ values: 'falsy' })
        .trim()
        .custom(password_util_1.optionalPasswordPolicyValidator)
        .withMessage(password_util_1.PASSWORD_POLICY_HINT),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const scopedAdmission = await prisma_1.default.admission.findFirst({
            where: {
                id: req.params.id,
                ...(0, school_context_util_1.admissionScopeWhere)(req.schoolId, req.school?.isDefault),
            },
            select: { id: true, proposedClassId: true },
        });
        if (!scopedAdmission) {
            return res.status(404).json({ error: 'Dossier introuvable' });
        }
        const classId = req.body?.classId || scopedAdmission.proposedClassId;
        if (classId) {
            await (0, school_access_guard_util_1.assertClassInSchool)(String(classId), req.schoolId, req.school?.isDefault ?? false);
        }
        const result = await (0, admission_enroll_util_1.enrollStudentFromAdmission)(req.params.id, req.user.id, req.body, req, req.schoolId);
        res.status(201).json(result);
    }
    catch (error) {
        const err = error;
        console.error('POST /admissions/:id/enroll:', error);
        if (error instanceof school_access_guard_util_1.SchoolAccessDeniedError) {
            return res.status(error.status).json({ error: error.message });
        }
        const code = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
        res.status(code).json({ error: err.message || 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-admissions.routes.js.map