"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const notify_important_util_1 = require("../utils/notify-important.util");
const router = express_1.default.Router();
const recordInclude = {
    student: {
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
            class: { select: { id: true, name: true, level: true } },
        },
    },
    recordedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
};
async function parentUserIdsForStudent(studentId) {
    const links = await prisma_1.default.studentParent.findMany({
        where: { studentId },
        include: { parent: { select: { userId: true } } },
    });
    return [...new Set(links.map((l) => l.parent.userId).filter(Boolean))];
}
function parseCategory(raw) {
    const allowed = [
        'VERBAL_WARNING',
        'WRITTEN_WARNING',
        'REPRIMAND',
        'TEMPORARY_EXCLUSION',
        'DISCIPLINE_COUNCIL_HEARING',
        'DISCIPLINE_COUNCIL_DECISION',
        'BEHAVIOR_CONTRACT',
        'OTHER',
    ];
    const s = typeof raw === 'string' ? raw.trim() : '';
    return allowed.includes(s) ? s : null;
}
// --- Règlement intérieur ---
router.get('/discipline/rulebooks', async (_req, res) => {
    try {
        const rows = await prisma_1.default.schoolDisciplinaryRulebook.findMany({
            orderBy: [{ sortOrder: 'asc' }, { effectiveFrom: 'desc' }],
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/discipline/rulebooks:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/discipline/rulebooks', async (req, res) => {
    try {
        const adminId = req.user.id;
        const { title, content, academicYear, effectiveFrom, isPublished, sortOrder, } = req.body;
        const text = typeof content === 'string' ? content.trim() : '';
        if (!text) {
            return res.status(400).json({ error: 'Le contenu du règlement est requis.' });
        }
        const row = await prisma_1.default.schoolDisciplinaryRulebook.create({
            data: {
                title: typeof title === 'string' && title.trim() ? title.trim() : 'Règlement intérieur',
                content: text,
                academicYear: typeof academicYear === 'string' && academicYear.trim() ? academicYear.trim() : null,
                effectiveFrom: effectiveFrom ? new Date(String(effectiveFrom)) : new Date(),
                isPublished: Boolean(isPublished),
                sortOrder: Math.max(0, parseInt(String(sortOrder ?? '0'), 10) || 0),
                createdById: adminId,
            },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/discipline/rulebooks:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/discipline/rulebooks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, academicYear, effectiveFrom, isPublished, sortOrder, } = req.body;
        const existing = await prisma_1.default.schoolDisciplinaryRulebook.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Document introuvable.' });
        const row = await prisma_1.default.schoolDisciplinaryRulebook.update({
            where: { id },
            data: {
                ...(typeof title === 'string' ? { title: title.trim() || existing.title } : {}),
                ...(typeof content === 'string' ? { content: content.trim() } : {}),
                ...(academicYear !== undefined
                    ? {
                        academicYear: academicYear === null || academicYear === ''
                            ? null
                            : String(academicYear).trim() || null,
                    }
                    : {}),
                ...(effectiveFrom !== undefined
                    ? { effectiveFrom: effectiveFrom ? new Date(String(effectiveFrom)) : existing.effectiveFrom }
                    : {}),
                ...(isPublished !== undefined ? { isPublished: Boolean(isPublished) } : {}),
                ...(sortOrder !== undefined
                    ? { sortOrder: Math.max(0, parseInt(String(sortOrder), 10) || 0) }
                    : {}),
            },
            include: {
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/discipline/rulebooks/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/discipline/rulebooks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.schoolDisciplinaryRulebook.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/discipline/rulebooks/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// --- Actes disciplinaires ---
router.get('/discipline/records', async (req, res) => {
    try {
        const { studentId, classId, academicYear, category, limit: limRaw, offset: offRaw, } = req.query;
        const take = Math.min(200, Math.max(1, parseInt(String(limRaw ?? '50'), 10) || 50));
        const skip = Math.max(0, parseInt(String(offRaw ?? '0'), 10) || 0);
        const where = {};
        if (typeof studentId === 'string' && studentId)
            where.studentId = studentId;
        if (typeof academicYear === 'string' && academicYear)
            where.academicYear = academicYear;
        const cat = typeof category === 'string' ? parseCategory(category) : null;
        if (cat)
            where.category = cat;
        if (typeof classId === 'string' && classId) {
            where.student = { classId };
        }
        const [rows, total] = await Promise.all([
            prisma_1.default.studentDisciplinaryRecord.findMany({
                where,
                orderBy: { incidentDate: 'desc' },
                skip,
                take,
                include: recordInclude,
            }),
            prisma_1.default.studentDisciplinaryRecord.count({ where }),
        ]);
        res.json({ records: rows, total, skip, take });
    }
    catch (e) {
        console.error('GET /admin/discipline/records:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/discipline/records', async (req, res) => {
    try {
        const adminId = req.user.id;
        const body = req.body;
        const studentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
        const academicYear = typeof body.academicYear === 'string' ? body.academicYear.trim() : '';
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        const category = parseCategory(body.category);
        if (!studentId || !academicYear || !title || !category) {
            return res.status(400).json({
                error: 'studentId, academicYear, title et category (valide) sont requis.',
            });
        }
        const st = await prisma_1.default.student.findUnique({ where: { id: studentId }, select: { id: true } });
        if (!st)
            return res.status(404).json({ error: 'Élève introuvable.' });
        const description = typeof body.description === 'string' && body.description.trim()
            ? body.description.trim()
            : null;
        const incidentDate = body.incidentDate ? new Date(String(body.incidentDate)) : new Date();
        if (Number.isNaN(incidentDate.getTime())) {
            return res.status(400).json({ error: 'Date d’incident invalide.' });
        }
        const exclusionStartDate = body.exclusionStartDate != null && String(body.exclusionStartDate).trim() !== ''
            ? new Date(String(body.exclusionStartDate))
            : null;
        const exclusionEndDate = body.exclusionEndDate != null && String(body.exclusionEndDate).trim() !== ''
            ? new Date(String(body.exclusionEndDate))
            : null;
        const councilSessionDate = body.councilSessionDate != null && String(body.councilSessionDate).trim() !== ''
            ? new Date(String(body.councilSessionDate))
            : null;
        const councilDecisionSummary = typeof body.councilDecisionSummary === 'string' && body.councilDecisionSummary.trim()
            ? body.councilDecisionSummary.trim()
            : null;
        const behaviorContractGoals = typeof body.behaviorContractGoals === 'string' && body.behaviorContractGoals.trim()
            ? body.behaviorContractGoals.trim()
            : null;
        const behaviorContractReviewAt = body.behaviorContractReviewAt != null && String(body.behaviorContractReviewAt).trim() !== ''
            ? new Date(String(body.behaviorContractReviewAt))
            : null;
        let behaviorContractStatus;
        if (category === 'BEHAVIOR_CONTRACT') {
            const raw = typeof body.behaviorContractStatus === 'string' ? body.behaviorContractStatus : '';
            if (raw === 'ACTIVE' || raw === 'COMPLETED' || raw === 'CANCELLED') {
                behaviorContractStatus = raw;
            }
            else {
                behaviorContractStatus = 'ACTIVE';
            }
        }
        else {
            behaviorContractStatus = null;
        }
        const notifyParents = Boolean(body.notifyParents);
        const row = await prisma_1.default.studentDisciplinaryRecord.create({
            data: {
                studentId,
                academicYear,
                category,
                title,
                description,
                incidentDate,
                exclusionStartDate: exclusionStartDate && !Number.isNaN(exclusionStartDate.getTime())
                    ? exclusionStartDate
                    : null,
                exclusionEndDate: exclusionEndDate && !Number.isNaN(exclusionEndDate.getTime()) ? exclusionEndDate : null,
                councilSessionDate: councilSessionDate && !Number.isNaN(councilSessionDate.getTime())
                    ? councilSessionDate
                    : null,
                councilDecisionSummary,
                behaviorContractGoals,
                behaviorContractReviewAt: behaviorContractReviewAt && !Number.isNaN(behaviorContractReviewAt.getTime())
                    ? behaviorContractReviewAt
                    : null,
                behaviorContractStatus: category === 'BEHAVIOR_CONTRACT' ? (behaviorContractStatus ?? 'ACTIVE') : null,
                parentNotifiedAt: notifyParents ? new Date() : null,
                recordedById: adminId,
            },
            include: recordInclude,
        });
        if (notifyParents) {
            const uids = await parentUserIdsForStudent(studentId);
            if (uids.length > 0) {
                const label = row.student.user
                    ? `${row.student.user.firstName} ${row.student.user.lastName}`.trim()
                    : 'Votre enfant';
                await (0, notify_important_util_1.notifyUsersImportant)(uids, {
                    type: 'conduct',
                    title: 'Suivi disciplinaire',
                    content: `${label} — ${title}. Connectez-vous au portail famille pour le détail.`,
                    link: '/parent?tab=conduct',
                });
            }
        }
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/discipline/records:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/discipline/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;
        const existing = await prisma_1.default.studentDisciplinaryRecord.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: 'Acte introuvable.' });
        const category = body.category !== undefined ? parseCategory(body.category) : existing.category;
        if (!category)
            return res.status(400).json({ error: 'Catégorie invalide.' });
        const next = {
            ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
            ...(body.description !== undefined
                ? {
                    description: body.description === null || body.description === ''
                        ? null
                        : String(body.description).trim(),
                }
                : {}),
            ...(body.academicYear !== undefined
                ? { academicYear: String(body.academicYear).trim() }
                : {}),
            category,
            ...(body.incidentDate !== undefined
                ? { incidentDate: new Date(String(body.incidentDate)) }
                : {}),
            ...(body.exclusionStartDate !== undefined
                ? {
                    exclusionStartDate: body.exclusionStartDate === null || body.exclusionStartDate === ''
                        ? null
                        : new Date(String(body.exclusionStartDate)),
                }
                : {}),
            ...(body.exclusionEndDate !== undefined
                ? {
                    exclusionEndDate: body.exclusionEndDate === null || body.exclusionEndDate === ''
                        ? null
                        : new Date(String(body.exclusionEndDate)),
                }
                : {}),
            ...(body.councilSessionDate !== undefined
                ? {
                    councilSessionDate: body.councilSessionDate === null || body.councilSessionDate === ''
                        ? null
                        : new Date(String(body.councilSessionDate)),
                }
                : {}),
            ...(body.councilDecisionSummary !== undefined
                ? {
                    councilDecisionSummary: body.councilDecisionSummary === null || body.councilDecisionSummary === ''
                        ? null
                        : String(body.councilDecisionSummary).trim(),
                }
                : {}),
            ...(body.behaviorContractGoals !== undefined
                ? {
                    behaviorContractGoals: body.behaviorContractGoals === null || body.behaviorContractGoals === ''
                        ? null
                        : String(body.behaviorContractGoals).trim(),
                }
                : {}),
            ...(body.behaviorContractReviewAt !== undefined
                ? {
                    behaviorContractReviewAt: body.behaviorContractReviewAt === null || body.behaviorContractReviewAt === ''
                        ? null
                        : new Date(String(body.behaviorContractReviewAt)),
                }
                : {}),
        };
        if (body.behaviorContractStatus !== undefined) {
            const s = String(body.behaviorContractStatus);
            if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'CANCELLED') {
                next.behaviorContractStatus = s;
            }
            else if (body.behaviorContractStatus === null) {
                next.behaviorContractStatus = null;
            }
        }
        const row = await prisma_1.default.studentDisciplinaryRecord.update({
            where: { id },
            data: next,
            include: recordInclude,
        });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/discipline/records/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/discipline/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma_1.default.studentDisciplinaryRecord.delete({ where: { id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/discipline/records/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-discipline.routes.js.map