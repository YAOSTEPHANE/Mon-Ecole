"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const app_branding_prisma_util_1 = require("../utils/app-branding-prisma.util");
const school_context_util_1 = require("../utils/school-context.util");
const ensure_default_school_util_1 = require("../utils/ensure-default-school.util");
const branding_assets_util_1 = require("../utils/branding-assets.util");
const production_env_diagnostics_util_1 = require("../utils/production-env-diagnostics.util");
const rate_limit_middleware_1 = require("../middleware/rate-limit.middleware");
const fne_matricule_search_util_1 = require("../utils/fne-matricule-search.util");
const EMPTY_PUBLIC_BRANDING = {
    navigationLogoUrl: null,
    loginLogoUrl: null,
    faviconUrl: null,
    appTitle: null,
    appTagline: null,
    currentAcademicYear: null,
    schoolDisplayName: null,
    schoolAddress: null,
    schoolPhone: null,
    schoolEmail: null,
    schoolWebsite: null,
    schoolPrincipal: null,
    schoolCode: null,
    schoolDrena: null,
    schoolIepp: null,
    schoolStatus: null,
    schoolMilieu: null,
    schoolRegion: null,
    classroomCount: null,
    studiesDirectorPhotoUrl: null,
    studiesDirectorName: null,
    studiesDirectorOccasionBadge: null,
    studiesDirectorMessageTitle: null,
    studiesDirectorMessage: null,
    studiesDirectorClosing: null,
    studiesDirectorFooterLine: null,
    homePageImages: {},
};
const router = express_1.default.Router();
/** Liste des établissements actifs (sélecteur public pré-inscription). */
router.get('/schools', async (_req, res) => {
    try {
        await (0, ensure_default_school_util_1.ensureDefaultSchool)();
        const schools = await prisma_1.default.school.findMany({
            where: { isActive: true },
            select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
        res.json(schools);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        res.status(500).json({ error: message });
    }
});
router.get('/app-branding', async (req, res) => {
    try {
        const appBranding = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
        if (!appBranding) {
            console.error('[app-branding] Client Prisma sans modèle AppBranding — cd server && npx prisma generate && npx prisma db push');
            return res.json(EMPTY_PUBLIC_BRANDING);
        }
        let brandingId = app_branding_prisma_util_1.APP_BRANDING_ID;
        const slug = (0, school_context_util_1.readSchoolSlugFromRequest)(req);
        if (slug) {
            const school = await (0, school_context_util_1.resolveSchoolBySlug)(slug);
            if (school)
                brandingId = await (0, school_context_util_1.brandingIdForSchool)(school.id);
        }
        else {
            const defaultSchoolId = await (0, ensure_default_school_util_1.ensureDefaultSchool)();
            brandingId = await (0, school_context_util_1.brandingIdForSchool)(defaultSchoolId);
        }
        const row = await appBranding.findUnique({ where: { id: brandingId } });
        if (!row) {
            return res.json(EMPTY_PUBLIC_BRANDING);
        }
        res.json((0, branding_assets_util_1.toPublicBrandingShape)({
            navigationLogoUrl: row.navigationLogoUrl,
            loginLogoUrl: row.loginLogoUrl,
            faviconUrl: row.faviconUrl,
            appTitle: row.appTitle,
            appTagline: row.appTagline,
            currentAcademicYear: row.currentAcademicYear ?? null,
            schoolDisplayName: row.schoolDisplayName ?? null,
            schoolAddress: row.schoolAddress ?? null,
            schoolPhone: row.schoolPhone ?? null,
            schoolEmail: row.schoolEmail ?? null,
            schoolWebsite: row.schoolWebsite ?? null,
            schoolPrincipal: row.schoolPrincipal ?? null,
            schoolCode: row.schoolCode ?? null,
            schoolDrena: row.schoolDrena ?? null,
            schoolIepp: row.schoolIepp ?? null,
            schoolStatus: row.schoolStatus ?? null,
            schoolMilieu: row.schoolMilieu ?? null,
            schoolRegion: row.schoolRegion ?? null,
            classroomCount: row.classroomCount ?? null,
            studiesDirectorPhotoUrl: row.studiesDirectorPhotoUrl ?? null,
            studiesDirectorName: row.studiesDirectorName ?? null,
            studiesDirectorOccasionBadge: row.studiesDirectorOccasionBadge ??
                null,
            studiesDirectorMessageTitle: row.studiesDirectorMessageTitle ??
                null,
            studiesDirectorMessage: row.studiesDirectorMessage ?? null,
            studiesDirectorClosing: row.studiesDirectorClosing ?? null,
            studiesDirectorFooterLine: row.studiesDirectorFooterLine ?? null,
            homePageImages: row.homePageImages ?? null,
        }));
    }
    catch (error) {
        const dbMsg = (0, production_env_diagnostics_util_1.prismaConnectionErrorMessage)(error);
        if (dbMsg) {
            console.error('GET /public/app-branding: base de données injoignable');
            return res.status(503).json({ error: dbMsg });
        }
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('GET /public/app-branding:', error);
        res.status(500).json({ error: message });
    }
});
/**
 * Données minimales pour affichage de la carte étudiant (lien / QR public).
 * L’identifiant `publicId` est un secret de possession (comme un jeton).
 */
router.get('/student-card/:publicId', async (req, res) => {
    try {
        const publicId = String(req.params.publicId || '').trim();
        if (!publicId || publicId.length > 128) {
            return res.status(400).json({ error: 'Identifiant invalide' });
        }
        const student = await prisma_1.default.student.findFirst({
            where: { digitalCardPublicId: publicId },
            select: {
                studentId: true,
                isActive: true,
                enrollmentStatus: true,
                user: {
                    select: { firstName: true, lastName: true, avatar: true },
                },
                class: { select: { name: true, level: true, academicYear: true } },
            },
        });
        if (!student) {
            return res.status(404).json({ error: 'Carte introuvable' });
        }
        res.json({
            studentId: student.studentId,
            firstName: student.user.firstName,
            lastName: student.user.lastName,
            avatar: student.user.avatar,
            className: student.class?.name ?? null,
            classLevel: student.class?.level ?? null,
            academicYear: student.class?.academicYear ?? null,
            enrollmentStatus: student.enrollmentStatus,
            isActive: student.isActive,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('GET /public/student-card:', error);
        res.status(500).json({ error: message });
    }
});
async function resolvePublicSchoolId(req) {
    await (0, ensure_default_school_util_1.ensureDefaultSchool)();
    const slug = (0, school_context_util_1.readSchoolSlugFromRequest)(req);
    if (slug) {
        const school = await (0, school_context_util_1.resolveSchoolBySlug)(slug);
        if (school?.id)
            return school.id;
    }
    const defaultSchoolId = await (0, ensure_default_school_util_1.ensureDefaultSchool)();
    return defaultSchoolId;
}
async function schoolFneDefaults(schoolId) {
    const school = await prisma_1.default.school.findUnique({
        where: { id: schoolId },
        select: { name: true, shortName: true },
    });
    let schoolCode = null;
    let schoolDisplayName = null;
    const brandingDelegate = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    if (brandingDelegate) {
        const brandingId = await (0, school_context_util_1.brandingIdForSchool)(schoolId);
        const row = await brandingDelegate.findUnique({ where: { id: brandingId } });
        if (row) {
            const branding = (0, branding_assets_util_1.toPublicBrandingShape)(row);
            schoolCode = branding.schoolCode ?? null;
            schoolDisplayName = branding.schoolDisplayName ?? null;
        }
    }
    return {
        schoolCode,
        schoolName: schoolDisplayName || school?.name || school?.shortName || null,
    };
}
/** Options publiques pour la recherche de matricule FNE (accueil élèves / familles). */
router.get('/fne-options', rate_limit_middleware_1.fneLookupLimiter, async (req, res) => {
    try {
        const schoolId = await resolvePublicSchoolId(req);
        const cycle = typeof req.query.cycle === 'string' && req.query.cycle === 'primary'
            ? 'primary'
            : 'secondary';
        const [opts, defaults] = await Promise.all([
            (0, fne_matricule_search_util_1.getFneFormOptions)(cycle),
            schoolFneDefaults(schoolId),
        ]);
        const matched = (0, fne_matricule_search_util_1.findSchoolOption)(opts.schools, defaults.schoolCode, defaults.schoolName);
        let schools = opts.schools;
        if (matched) {
            const neighbors = opts.schools
                .filter((s) => /bouake|bouaké/i.test(s.name) && s.id !== matched.id)
                .slice(0, 40);
            schools = [matched, ...neighbors];
        }
        else {
            schools = opts.schools.filter((s) => /bouake|bouaké/i.test(s.name)).slice(0, 80);
        }
        res.json({
            cycle: opts.cycle,
            years: opts.years,
            schools,
            formUrl: opts.formUrl,
            defaultEtablissementId: matched?.id ?? defaults.schoolCode ?? null,
            defaultEtablissementName: matched?.name ?? null,
        });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('GET /public/fne-options:', error);
        res.status(502).json({ error: message });
    }
});
/** Recherche publique de matricule FNE (proxy SIGFNE). */
router.post('/fne-lookup', rate_limit_middleware_1.fneLookupLimiter, async (req, res) => {
    try {
        const schoolId = await resolvePublicSchoolId(req);
        const body = (req.body ?? {});
        const cycle = body.cycle === 'primary' ? 'primary' : 'secondary';
        const annee = typeof body.annee === 'string' ? body.annee.trim() : '';
        const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
        const prenoms = typeof body.prenoms === 'string' ? body.prenoms.trim() : '';
        const datenaiss = typeof body.datenaiss === 'string' ? body.datenaiss.trim() : '';
        let etablissement = typeof body.etablissement === 'string' ? body.etablissement.trim() : '';
        if (!etablissement) {
            const defaults = await schoolFneDefaults(schoolId);
            if (defaults.schoolCode)
                etablissement = defaults.schoolCode;
        }
        const result = await (0, fne_matricule_search_util_1.searchFneMatricule)({
            cycle,
            annee,
            nom,
            prenoms,
            datenaiss,
            etablissement,
        });
        res.json(result);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('POST /public/fne-lookup:', error);
        const status = /critère|Sélectionnez|Indiquez/i.test(message) ? 400 : 502;
        res.status(status).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=public.routes.js.map