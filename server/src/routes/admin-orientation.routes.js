"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = express_1.default.Router();
const userBrief = { select: { id: true, firstName: true, lastName: true, email: true, role: true } };
function parseBool(v) {
    if (v === undefined)
        return undefined;
    if (v === true || v === 'true')
        return true;
    if (v === false || v === 'false')
        return false;
    return undefined;
}
// ---------- Filières ----------
router.get('/orientation/filieres', async (req, res) => {
    try {
        const publishedOnly = parseBool(req.query.publishedOnly);
        const where = publishedOnly === true ? { isPublished: true } : {};
        const rows = await prisma_1.default.orientationFiliere.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/filieres:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/filieres', async (req, res) => {
    try {
        const b = req.body;
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        const body = typeof b.body === 'string' ? b.body : '';
        if (!title || !String(body).trim()) {
            return res.status(400).json({ error: 'title et body sont requis.' });
        }
        const row = await prisma_1.default.orientationFiliere.create({
            data: {
                title,
                summary: typeof b.summary === 'string' && b.summary.trim() ? b.summary.trim() : null,
                body: String(body).trim(),
                levelHint: typeof b.levelHint === 'string' && b.levelHint.trim() ? b.levelHint.trim() : null,
                externalUrl: typeof b.externalUrl === 'string' && b.externalUrl.trim() ? b.externalUrl.trim() : null,
                sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : parseInt(String(b.sortOrder ?? 0), 10) || 0,
                isPublished: Boolean(b.isPublished),
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/filieres:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/filieres/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.title === 'string')
            data.title = b.title.trim();
        if (typeof b.summary === 'string')
            data.summary = b.summary.trim() === '' ? null : b.summary.trim();
        if (typeof b.body === 'string')
            data.body = b.body.trim();
        if (typeof b.levelHint === 'string')
            data.levelHint = b.levelHint.trim() === '' ? null : b.levelHint.trim();
        if (typeof b.externalUrl === 'string')
            data.externalUrl = b.externalUrl.trim() === '' ? null : b.externalUrl.trim();
        if (b.sortOrder !== undefined)
            data.sortOrder = parseInt(String(b.sortOrder), 10) || 0;
        if (b.isPublished !== undefined)
            data.isPublished = Boolean(b.isPublished);
        const row = await prisma_1.default.orientationFiliere.update({ where: { id }, data });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/filieres/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/filieres/:id', async (req, res) => {
    try {
        await prisma_1.default.orientationFiliere.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/filieres/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ---------- Partenariats ----------
const PART_KIND = ['UNIVERSITY', 'COMPANY', 'OTHER'];
router.get('/orientation/partnerships', async (req, res) => {
    try {
        const publishedOnly = parseBool(req.query.publishedOnly);
        const where = publishedOnly === true ? { isPublished: true } : {};
        const rows = await prisma_1.default.orientationPartnership.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { organizationName: 'asc' }],
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/partnerships:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/partnerships', async (req, res) => {
    try {
        const b = req.body;
        const organizationName = typeof b.organizationName === 'string' ? b.organizationName.trim() : '';
        const kind = typeof b.kind === 'string' && PART_KIND.includes(b.kind) ? b.kind : null;
        if (!organizationName || !kind) {
            return res.status(400).json({ error: 'organizationName et kind valides sont requis.' });
        }
        const row = await prisma_1.default.orientationPartnership.create({
            data: {
                organizationName,
                kind: kind,
                description: typeof b.description === 'string' && b.description.trim() ? b.description.trim() : null,
                website: typeof b.website === 'string' && b.website.trim() ? b.website.trim() : null,
                contactEmail: typeof b.contactEmail === 'string' && b.contactEmail.trim() ? b.contactEmail.trim() : null,
                sortOrder: parseInt(String(b.sortOrder ?? 0), 10) || 0,
                isPublished: Boolean(b.isPublished),
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/partnerships:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/partnerships/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.organizationName === 'string')
            data.organizationName = b.organizationName.trim();
        if (typeof b.kind === 'string' && PART_KIND.includes(b.kind)) {
            data.kind = b.kind;
        }
        if (typeof b.description === 'string')
            data.description = b.description.trim() === '' ? null : b.description.trim();
        if (typeof b.website === 'string')
            data.website = b.website.trim() === '' ? null : b.website.trim();
        if (typeof b.contactEmail === 'string')
            data.contactEmail = b.contactEmail.trim() === '' ? null : b.contactEmail.trim();
        if (b.sortOrder !== undefined)
            data.sortOrder = parseInt(String(b.sortOrder), 10) || 0;
        if (b.isPublished !== undefined)
            data.isPublished = Boolean(b.isPublished);
        const row = await prisma_1.default.orientationPartnership.update({ where: { id }, data });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/partnerships/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/partnerships/:id', async (req, res) => {
    try {
        await prisma_1.default.orientationPartnership.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/partnerships/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ---------- Tests d'aptitude ----------
router.get('/orientation/aptitude-tests', async (req, res) => {
    try {
        const publishedOnly = parseBool(req.query.publishedOnly);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
        const where = {
            ...(publishedOnly === true ? { isPublished: true } : {}),
            ...(academicYear ? { academicYear } : {}),
        };
        const rows = await prisma_1.default.orientationAptitudeTest.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/aptitude-tests:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/aptitude-tests', async (req, res) => {
    try {
        const b = req.body;
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        if (!title)
            return res.status(400).json({ error: 'title est requis.' });
        const row = await prisma_1.default.orientationAptitudeTest.create({
            data: {
                title,
                description: typeof b.description === 'string' && b.description.trim() ? b.description.trim() : null,
                provider: typeof b.provider === 'string' && b.provider.trim() ? b.provider.trim() : null,
                testUrl: typeof b.testUrl === 'string' && b.testUrl.trim() ? b.testUrl.trim() : null,
                registrationInfo: typeof b.registrationInfo === 'string' && b.registrationInfo.trim() ? b.registrationInfo.trim() : null,
                academicYear: typeof b.academicYear === 'string' && b.academicYear.trim() ? b.academicYear.trim() : null,
                registrationDeadline: b.registrationDeadline ? new Date(String(b.registrationDeadline)) : null,
                sortOrder: parseInt(String(b.sortOrder ?? 0), 10) || 0,
                isPublished: Boolean(b.isPublished),
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/aptitude-tests:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/aptitude-tests/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.title === 'string')
            data.title = b.title.trim();
        if (typeof b.description === 'string')
            data.description = b.description.trim() === '' ? null : b.description.trim();
        if (typeof b.provider === 'string')
            data.provider = b.provider.trim() === '' ? null : b.provider.trim();
        if (typeof b.testUrl === 'string')
            data.testUrl = b.testUrl.trim() === '' ? null : b.testUrl.trim();
        if (typeof b.registrationInfo === 'string')
            data.registrationInfo = b.registrationInfo.trim() === '' ? null : b.registrationInfo.trim();
        if (typeof b.academicYear === 'string')
            data.academicYear = b.academicYear.trim() === '' ? null : b.academicYear.trim();
        if (b.registrationDeadline !== undefined)
            data.registrationDeadline = b.registrationDeadline ? new Date(String(b.registrationDeadline)) : null;
        if (b.sortOrder !== undefined)
            data.sortOrder = parseInt(String(b.sortOrder), 10) || 0;
        if (b.isPublished !== undefined)
            data.isPublished = Boolean(b.isPublished);
        const row = await prisma_1.default.orientationAptitudeTest.update({ where: { id }, data });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/aptitude-tests/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/aptitude-tests/:id', async (req, res) => {
    try {
        await prisma_1.default.orientationAptitudeTest.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/aptitude-tests/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ---------- Conseils ----------
const AUDIENCES = ['ALL', 'PARENT', 'STUDENT'];
router.get('/orientation/advice', async (req, res) => {
    try {
        const publishedOnly = parseBool(req.query.publishedOnly);
        const where = publishedOnly === true ? { isPublished: true } : {};
        const rows = await prisma_1.default.orientationAdvice.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/advice:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/advice', async (req, res) => {
    try {
        const b = req.body;
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        const body = typeof b.body === 'string' ? b.body : '';
        const audience = typeof b.audience === 'string' && AUDIENCES.includes(b.audience)
            ? b.audience
            : 'ALL';
        if (!title || !String(body).trim())
            return res.status(400).json({ error: 'title et body sont requis.' });
        const row = await prisma_1.default.orientationAdvice.create({
            data: {
                title,
                body: String(body).trim(),
                audience: audience,
                sortOrder: parseInt(String(b.sortOrder ?? 0), 10) || 0,
                isPublished: Boolean(b.isPublished),
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/advice:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/advice/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.title === 'string')
            data.title = b.title.trim();
        if (typeof b.body === 'string')
            data.body = b.body.trim();
        if (typeof b.audience === 'string' && AUDIENCES.includes(b.audience)) {
            data.audience = b.audience;
        }
        if (b.sortOrder !== undefined)
            data.sortOrder = parseInt(String(b.sortOrder), 10) || 0;
        if (b.isPublished !== undefined)
            data.isPublished = Boolean(b.isPublished);
        const row = await prisma_1.default.orientationAdvice.update({ where: { id }, data });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/advice/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/advice/:id', async (req, res) => {
    try {
        await prisma_1.default.orientationAdvice.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/advice/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ---------- Suivi élève ----------
const FOLLOW_STATUSES = ['PLANNED', 'IN_PROGRESS', 'DONE', 'ARCHIVED'];
router.get('/orientation/follow-ups', async (req, res) => {
    try {
        const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
        const where = {
            ...(studentId ? { studentId } : {}),
            ...(academicYear ? { academicYear } : {}),
        };
        const rows = await prisma_1.default.studentOrientationFollowUp.findMany({
            where,
            orderBy: [{ updatedAt: 'desc' }],
            include: {
                student: { include: { user: userBrief } },
                counselor: { select: userBrief.select },
                createdBy: { select: userBrief.select },
            },
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/follow-ups:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/follow-ups', async (req, res) => {
    try {
        const b = req.body;
        const studentId = typeof b.studentId === 'string' ? b.studentId : '';
        const academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() : '';
        const title = typeof b.title === 'string' ? b.title.trim() : '';
        const status = typeof b.status === 'string' && FOLLOW_STATUSES.includes(b.status)
            ? b.status
            : 'PLANNED';
        if (!studentId || !academicYear || !title) {
            return res.status(400).json({ error: 'studentId, academicYear et title sont requis.' });
        }
        const counselorUserId = typeof b.counselorUserId === 'string' && b.counselorUserId.trim() ? b.counselorUserId.trim() : null;
        const row = await prisma_1.default.studentOrientationFollowUp.create({
            data: {
                studentId,
                academicYear,
                title,
                notes: typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null,
                status: status,
                nextAppointmentAt: b.nextAppointmentAt ? new Date(String(b.nextAppointmentAt)) : null,
                counselorUserId,
                createdById: req.user.id,
            },
            include: {
                student: { include: { user: userBrief } },
                counselor: { select: userBrief.select },
                createdBy: { select: userBrief.select },
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/follow-ups:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/follow-ups/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.academicYear === 'string')
            data.academicYear = b.academicYear.trim();
        if (typeof b.title === 'string')
            data.title = b.title.trim();
        if (typeof b.notes === 'string')
            data.notes = b.notes.trim() === '' ? null : b.notes.trim();
        if (typeof b.status === 'string' && FOLLOW_STATUSES.includes(b.status)) {
            data.status = b.status;
        }
        if (b.nextAppointmentAt !== undefined)
            data.nextAppointmentAt = b.nextAppointmentAt ? new Date(String(b.nextAppointmentAt)) : null;
        if (b.counselorUserId !== undefined) {
            data.counselor =
                b.counselorUserId === null || b.counselorUserId === ''
                    ? { disconnect: true }
                    : { connect: { id: String(b.counselorUserId) } };
        }
        const row = await prisma_1.default.studentOrientationFollowUp.update({
            where: { id },
            data,
            include: {
                student: { include: { user: userBrief } },
                counselor: { select: userBrief.select },
                createdBy: { select: userBrief.select },
            },
        });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/follow-ups/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/follow-ups/:id', async (req, res) => {
    try {
        await prisma_1.default.studentOrientationFollowUp.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/follow-ups/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
// ---------- Stages / apprentissages ----------
const PL_KIND = ['INTERNSHIP_SCHOOL', 'INTERNSHIP_COMPANY', 'APPRENTICESHIP'];
const PL_STAT = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
router.get('/orientation/placements', async (req, res) => {
    try {
        const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : '';
        const where = studentId ? { studentId } : {};
        const rows = await prisma_1.default.studentOrientationPlacement.findMany({
            where,
            orderBy: [{ startDate: 'desc' }],
            include: {
                student: { include: { user: userBrief } },
                createdBy: { select: userBrief.select },
            },
        });
        res.json(rows);
    }
    catch (e) {
        console.error('GET /admin/orientation/placements:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.post('/orientation/placements', async (req, res) => {
    try {
        const b = req.body;
        const studentId = typeof b.studentId === 'string' ? b.studentId : '';
        const organizationName = typeof b.organizationName === 'string' ? b.organizationName.trim() : '';
        const kind = typeof b.kind === 'string' && PL_KIND.includes(b.kind) ? b.kind : null;
        const startDate = b.startDate ? new Date(String(b.startDate)) : null;
        if (!studentId || !organizationName || !kind || !startDate || Number.isNaN(startDate.getTime())) {
            return res.status(400).json({ error: 'studentId, organizationName, kind et startDate valides sont requis.' });
        }
        const status = typeof b.status === 'string' && PL_STAT.includes(b.status)
            ? b.status
            : 'PLANNED';
        const row = await prisma_1.default.studentOrientationPlacement.create({
            data: {
                studentId,
                kind: kind,
                organizationName,
                roleOrSubject: typeof b.roleOrSubject === 'string' && b.roleOrSubject.trim() ? b.roleOrSubject.trim() : null,
                startDate,
                endDate: b.endDate ? new Date(String(b.endDate)) : null,
                status: status,
                supervisorContact: typeof b.supervisorContact === 'string' && b.supervisorContact.trim()
                    ? b.supervisorContact.trim()
                    : null,
                notes: typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim() : null,
                createdById: req.user.id,
            },
            include: {
                student: { include: { user: userBrief } },
                createdBy: { select: userBrief.select },
            },
        });
        res.status(201).json(row);
    }
    catch (e) {
        console.error('POST /admin/orientation/placements:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.put('/orientation/placements/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const b = req.body;
        const data = {};
        if (typeof b.organizationName === 'string')
            data.organizationName = b.organizationName.trim();
        if (typeof b.kind === 'string' && PL_KIND.includes(b.kind)) {
            data.kind = b.kind;
        }
        if (typeof b.roleOrSubject === 'string')
            data.roleOrSubject = b.roleOrSubject.trim() === '' ? null : b.roleOrSubject.trim();
        if (b.startDate)
            data.startDate = new Date(String(b.startDate));
        if (b.endDate !== undefined)
            data.endDate = b.endDate ? new Date(String(b.endDate)) : null;
        if (typeof b.status === 'string' && PL_STAT.includes(b.status)) {
            data.status = b.status;
        }
        if (typeof b.supervisorContact === 'string')
            data.supervisorContact = b.supervisorContact.trim() === '' ? null : b.supervisorContact.trim();
        if (typeof b.notes === 'string')
            data.notes = b.notes.trim() === '' ? null : b.notes.trim();
        const row = await prisma_1.default.studentOrientationPlacement.update({
            where: { id },
            data,
            include: {
                student: { include: { user: userBrief } },
                createdBy: { select: userBrief.select },
            },
        });
        res.json(row);
    }
    catch (e) {
        console.error('PUT /admin/orientation/placements/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
router.delete('/orientation/placements/:id', async (req, res) => {
    try {
        await prisma_1.default.studentOrientationPlacement.delete({ where: { id: req.params.id } });
        res.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE /admin/orientation/placements/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-orientation.routes.js.map