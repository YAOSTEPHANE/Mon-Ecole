"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSchoolContext = attachSchoolContext;
exports.attachSchoolContextOptional = attachSchoolContextOptional;
const school_context_util_1 = require("../utils/school-context.util");
const school_prisma_util_1 = require("../utils/school-prisma.util");
/**
 * Résout l’établissement actif (header X-School-Id ou établissement par défaut de l’utilisateur).
 * Les routes publiques peuvent l’utiliser sans authentification (query ?school=slug).
 */
async function attachSchoolContext(req, res, next) {
    try {
        const ctx = await (0, school_context_util_1.resolveActiveSchoolForRequest)(req);
        if (!ctx) {
            return res.status(400).json({
                error: 'Établissement introuvable ou accès refusé. Sélectionnez un collège dans le menu ou précisez ?school=slug.',
            });
        }
        req.schoolId = ctx.schoolId;
        req.school = ctx.school;
        next();
    }
    catch (error) {
        if (error instanceof school_context_util_1.SchoolPrismaNotReadyError) {
            console.error('[school] Client Prisma à régénérer —', school_prisma_util_1.SCHOOL_PRISMA_HINT);
            return res.status(503).json({ error: school_prisma_util_1.SCHOOL_PRISMA_HINT });
        }
        console.error('attachSchoolContext:', error);
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
}
/** Contexte optionnel : ne bloque pas si aucun établissement (stats globales super-admin). */
async function attachSchoolContextOptional(req, res, next) {
    try {
        const ctx = await (0, school_context_util_1.resolveActiveSchoolForRequest)(req);
        if (ctx) {
            req.schoolId = ctx.schoolId;
            req.school = ctx.school;
        }
        next();
    }
    catch (error) {
        console.error('attachSchoolContextOptional:', error);
        next();
    }
}
//# sourceMappingURL=school-context.middleware.js.map