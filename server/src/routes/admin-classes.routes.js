"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const prisma_1 = __importDefault(require("../utils/prisma"));
const school_context_util_1 = require("../utils/school-context.util");
const delete_class_util_1 = require("../utils/delete-class.util");
const router = express_1.default.Router();
// ========== GESTION DES CLASSES ==========
// Lister toutes les classes
router.get('/classes', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        const classes = await prisma_1.default.class.findMany({
            where: (0, school_context_util_1.classScopeWhere)(schoolId, req.school?.isDefault),
            include: {
                track: {
                    select: { id: true, name: true, code: true, academicYear: true },
                },
                teacher: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                students: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
                _count: {
                    select: {
                        students: true,
                    },
                },
            },
        });
        res.json(classes);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// Créer une classe
router.post('/classes', [
    (0, express_validator_1.body)('name').notEmpty(),
    (0, express_validator_1.body)('level').notEmpty(),
    (0, express_validator_1.body)('academicYear').notEmpty(),
], async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { name, level, room, capacity, academicYear, teacherId, trackId } = req.body;
        const schoolId = req.schoolId;
        const newClass = await prisma_1.default.class.create({
            data: {
                name,
                level,
                room,
                capacity: capacity || 30,
                academicYear,
                schoolId,
                teacherId,
                trackId: typeof trackId === 'string' && trackId.trim() ? trackId.trim() : undefined,
            },
            include: {
                track: {
                    select: { id: true, name: true, code: true, academicYear: true },
                },
                teacher: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(201).json(newClass);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.patch('/classes/:id', async (req, res) => {
    try {
        const existing = await prisma_1.default.class.findUnique({ where: { id: req.params.id } });
        if (!existing) {
            return res.status(404).json({ error: 'Classe introuvable' });
        }
        const b = req.body;
        const data = {};
        if (typeof b.name === 'string' && b.name.trim())
            data.name = b.name.trim();
        if (typeof b.level === 'string' && b.level.trim())
            data.level = b.level.trim();
        if (b.room !== undefined)
            data.room = typeof b.room === 'string' ? b.room.trim() || null : null;
        if (b.capacity !== undefined)
            data.capacity = Number(b.capacity) || 30;
        if (typeof b.academicYear === 'string' && b.academicYear.trim()) {
            data.academicYear = b.academicYear.trim();
        }
        if (b.teacherId !== undefined) {
            data.teacherId = typeof b.teacherId === 'string' && b.teacherId.trim() ? b.teacherId.trim() : null;
        }
        if (b.trackId !== undefined) {
            data.trackId = typeof b.trackId === 'string' && b.trackId.trim() ? b.trackId.trim() : null;
        }
        const updated = await prisma_1.default.class.update({
            where: { id: req.params.id },
            data,
            include: {
                track: { select: { id: true, name: true, code: true, academicYear: true } },
                teacher: {
                    include: {
                        user: { select: { firstName: true, lastName: true } },
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
router.delete('/classes/:id', async (req, res) => {
    try {
        const schoolId = req.schoolId;
        const classId = req.params.id;
        const unassignStudents = req.query.unassignStudents === 'true';
        const existing = await prisma_1.default.class.findFirst({
            where: {
                id: classId,
                ...(0, school_context_util_1.classScopeWhere)(schoolId, req.school?.isDefault),
            },
            select: { id: true, name: true },
        });
        if (!existing) {
            return res.status(404).json({ error: 'Classe introuvable' });
        }
        const studentCount = await prisma_1.default.student.count({
            where: { classId },
        });
        if (studentCount > 0) {
            if (!unassignStudents) {
                return res.status(409).json({
                    error: `Impossible de supprimer « ${existing.name} » : ${studentCount} élève(s) y sont encore inscrits. Réaffectez-les ou confirmez leur retrait de la classe.`,
                    studentCount,
                });
            }
            await prisma_1.default.student.updateMany({
                where: { classId },
                data: { classId: null, classGroupId: null },
            });
        }
        await (0, delete_class_util_1.deleteClassWithDependencies)(prisma_1.default, classId);
        res.json({
            ok: true,
            message: studentCount > 0
                ? `Classe supprimée (${studentCount} élève(s) retiré(s) de la classe)`
                : 'Classe supprimée',
            unassignedStudents: studentCount > 0 ? studentCount : 0,
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-classes.routes.js.map