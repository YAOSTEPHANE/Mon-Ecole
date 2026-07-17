"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const router = express_1.default.Router();
const trackInclude = {
    _count: { select: { classes: true, availableOptions: true } },
};
// ——— Filières ———
router.get('/school-tracks', async (req, res) => {
    try {
        const { academicYear } = req.query;
        const where = {};
        if (typeof academicYear === 'string' && academicYear.trim()) {
            where.academicYear = academicYear.trim();
        }
        const rows = await prisma_1.default.schoolTrack.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: trackInclude,
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/school-tracks', async (req, res) => {
    try {
        const b = req.body;
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        const code = typeof b.code === 'string' ? b.code.trim() : '';
        if (!name || !code) {
            return res.status(400).json({ error: 'Nom et code requis' });
        }
        const row = await prisma_1.default.schoolTrack.create({
            data: {
                name,
                code,
                description: typeof b.description === 'string' ? b.description.trim() || null : null,
                academicYear: typeof b.academicYear === 'string' ? b.academicYear.trim() || null : null,
                levels: Array.isArray(b.levels) ? b.levels.map(String) : [],
                sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : Number(b.sortOrder) || 0,
            },
            include: trackInclude,
        });
        res.status(201).json(row);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('Unique constraint') ? 409 : 500;
        res.status(status).json({ error: status === 409 ? 'Code de filière déjà utilisé' : msg });
    }
});
router.patch('/school-tracks/:id', async (req, res) => {
    try {
        const existing = await prisma_1.default.schoolTrack.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Filière introuvable' });
        }
        const b = req.body;
        const data = {};
        if (typeof b.name === 'string' && b.name.trim())
            data.name = b.name.trim();
        if (typeof b.code === 'string' && b.code.trim())
            data.code = b.code.trim();
        if (b.description !== undefined) {
            data.description = typeof b.description === 'string' ? b.description.trim() || null : null;
        }
        if (b.academicYear !== undefined) {
            data.academicYear = typeof b.academicYear === 'string' ? b.academicYear.trim() || null : null;
        }
        if (Array.isArray(b.levels))
            data.levels = b.levels.map(String);
        if (b.sortOrder !== undefined)
            data.sortOrder = Number(b.sortOrder) || 0;
        const row = await prisma_1.default.schoolTrack.update({
            where: { id: req.params.id },
            data,
            include: trackInclude,
        });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/school-tracks/:id', async (req, res) => {
    try {
        const existing = await prisma_1.default.schoolTrack.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Filière introuvable' });
        }
        await prisma_1.default.schoolTrack.delete({ where: { id: req.params.id } });
        res.json({ message: 'Filière supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// ——— Catalogue d'options ———
router.get('/subject-options', async (_req, res) => {
    try {
        const rows = await prisma_1.default.subjectOption.findMany({
            orderBy: [{ name: 'asc' }],
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/subject-options', async (req, res) => {
    try {
        const b = req.body;
        const name = typeof b.name === 'string' ? b.name.trim() : '';
        const code = typeof b.code === 'string' ? b.code.trim() : '';
        if (!name || !code) {
            return res.status(400).json({ error: 'Nom et code requis' });
        }
        const row = await prisma_1.default.subjectOption.create({
            data: {
                name,
                code,
                description: typeof b.description === 'string' ? b.description.trim() || null : null,
                weeklyHours: b.weeklyHours === null || b.weeklyHours === undefined
                    ? null
                    : Number(b.weeklyHours),
                gradingCoefficient: b.gradingCoefficient === null || b.gradingCoefficient === undefined
                    ? null
                    : Number(b.gradingCoefficient),
            },
        });
        res.status(201).json(row);
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Erreur serveur';
        const status = msg.includes('Unique constraint') ? 409 : 500;
        res.status(status).json({ error: status === 409 ? 'Code d\'option déjà utilisé' : msg });
    }
});
router.patch('/subject-options/:id', async (req, res) => {
    try {
        const existing = await prisma_1.default.subjectOption.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Option introuvable' });
        }
        const b = req.body;
        const data = {};
        if (typeof b.name === 'string' && b.name.trim())
            data.name = b.name.trim();
        if (typeof b.code === 'string' && b.code.trim())
            data.code = b.code.trim();
        if (b.description !== undefined) {
            data.description = typeof b.description === 'string' ? b.description.trim() || null : null;
        }
        if (b.weeklyHours !== undefined) {
            data.weeklyHours = b.weeklyHours === null ? null : Number(b.weeklyHours);
        }
        if (b.gradingCoefficient !== undefined) {
            data.gradingCoefficient = b.gradingCoefficient === null ? null : Number(b.gradingCoefficient);
        }
        const row = await prisma_1.default.subjectOption.update({ where: { id: req.params.id }, data });
        res.json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/subject-options/:id', async (req, res) => {
    try {
        const existing = await prisma_1.default.subjectOption.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Option introuvable' });
        }
        await prisma_1.default.subjectOption.delete({ where: { id: req.params.id } });
        res.json({ message: 'Option supprimée' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
// ——— Options disponibles par filière ———
router.get('/school-tracks/:trackId/available-options', async (req, res) => {
    try {
        const track = await prisma_1.default.schoolTrack.findUnique({ where: { id: req.params.trackId } });
        if (!track) {
            return res.status(404).json({ error: 'Filière introuvable' });
        }
        const rows = await prisma_1.default.schoolTrackAvailableOption.findMany({
            where: { trackId: req.params.trackId },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            include: { option: true },
        });
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.post('/school-tracks/:trackId/available-options', async (req, res) => {
    try {
        const track = await prisma_1.default.schoolTrack.findUnique({ where: { id: req.params.trackId } });
        if (!track) {
            return res.status(404).json({ error: 'Filière introuvable' });
        }
        const b = req.body;
        const optionId = typeof b.optionId === 'string' ? b.optionId : '';
        if (!optionId) {
            return res.status(400).json({ error: 'optionId requis' });
        }
        const option = await prisma_1.default.subjectOption.findUnique({ where: { id: optionId } });
        if (!option) {
            return res.status(404).json({ error: 'Option introuvable' });
        }
        const existing = await prisma_1.default.schoolTrackAvailableOption.findFirst({
            where: { trackId: req.params.trackId, optionId },
        });
        if (existing) {
            return res.status(409).json({ error: 'Option déjà rattachée à cette filière' });
        }
        const row = await prisma_1.default.schoolTrackAvailableOption.create({
            data: {
                trackId: req.params.trackId,
                optionId,
                sortOrder: typeof b.sortOrder === 'number' ? b.sortOrder : Number(b.sortOrder) || 0,
                notes: typeof b.notes === 'string' ? b.notes.trim() || null : null,
            },
            include: { option: true },
        });
        res.status(201).json(row);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
router.delete('/school-tracks/:trackId/available-options/:linkId', async (req, res) => {
    try {
        const row = await prisma_1.default.schoolTrackAvailableOption.findFirst({
            where: { id: req.params.linkId, trackId: req.params.trackId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Lien introuvable' });
        }
        await prisma_1.default.schoolTrackAvailableOption.delete({ where: { id: row.id } });
        res.json({ message: 'Option retirée de la filière' });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-tracks.routes.js.map