"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const upload_middleware_1 = require("../middleware/upload.middleware");
const upload_persist_util_1 = require("../utils/upload-persist.util");
const app_branding_prisma_util_1 = require("../utils/app-branding-prisma.util");
const school_context_util_1 = require("../utils/school-context.util");
const branding_assets_util_1 = require("../utils/branding-assets.util");
const home_page_images_util_1 = require("../utils/home-page-images.util");
const router = express_1.default.Router();
const CORE_SLOTS = new Set(['navigation', 'login', 'favicon', 'studiesDirector']);
function isAllowedBrandingSlot(slot) {
    return CORE_SLOTS.has(slot) || (0, home_page_images_util_1.isHomePageImageSlot)(slot);
}
function emptyBrandingResponse() {
    return {
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
}
function trimText(v, max) {
    if (v === undefined)
        return undefined;
    if (v === null)
        return null;
    if (typeof v !== 'string')
        return undefined;
    const t = v.trim();
    return t.length === 0 ? null : t.slice(0, max);
}
function trimLongText(v, max) {
    return trimText(v, max);
}
function normalizeAcademicYearSetting(v) {
    if (v === undefined)
        return undefined;
    if (v === null)
        return null;
    if (typeof v !== 'string')
        return undefined;
    const trimmed = v.trim();
    if (!trimmed)
        return null;
    const match = trimmed.match(/^(\d{4})\s*[-–/]\s*(\d{4})$/);
    if (!match) {
        throw new Error('Année scolaire invalide. Format attendu : 2026-2027.');
    }
    const start = parseInt(match[1], 10);
    const end = parseInt(match[2], 10);
    if (end !== start + 1) {
        throw new Error('Année scolaire invalide : l’année de fin doit suivre l’année de début.');
    }
    return `${start}-${end}`;
}
function toPublicShape(row) {
    return (0, branding_assets_util_1.toPublicBrandingShape)(row);
}
function delegateOr503(res) {
    const appBranding = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    if (!appBranding) {
        console.error('[app-branding] Client Prisma sans modèle AppBranding — cd server && npx prisma generate && npx prisma db push');
        res.status(503).json({ error: app_branding_prisma_util_1.APP_BRANDING_PRISMA_HINT });
        return null;
    }
    return appBranding;
}
/** Lecture (admin) — même contenu que l’endpoint public. */
router.get('/app-branding', async (req, res) => {
    try {
        const appBranding = delegateOr503(res);
        if (!appBranding)
            return;
        const brandingId = req.schoolId
            ? await (0, school_context_util_1.brandingIdForSchool)(req.schoolId)
            : app_branding_prisma_util_1.APP_BRANDING_ID;
        const row = await appBranding.findUnique({ where: { id: brandingId } });
        if (!row) {
            return res.json(emptyBrandingResponse());
        }
        res.json(toPublicShape(row));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('GET /admin/app-branding:', error);
        res.status(500).json({ error: message });
    }
});
router.put('/app-branding', async (req, res) => {
    try {
        const appBranding = delegateOr503(res);
        if (!appBranding)
            return;
        const brandingId = req.schoolId
            ? await (0, school_context_util_1.brandingIdForSchool)(req.schoolId)
            : app_branding_prisma_util_1.APP_BRANDING_ID;
        const body = req.body;
        const data = {};
        const title = trimText(body.appTitle, 120);
        const tagline = trimText(body.appTagline, 160);
        const currentAcademicYear = normalizeAcademicYearSetting(body.currentAcademicYear);
        if (title !== undefined)
            data.appTitle = title;
        if (tagline !== undefined)
            data.appTagline = tagline;
        if (currentAcademicYear !== undefined)
            data.currentAcademicYear = currentAcademicYear;
        const schoolName = trimText(body.schoolDisplayName, 200);
        const schoolAddr = trimText(body.schoolAddress, 500);
        const schoolPh = trimText(body.schoolPhone, 80);
        const schoolEm = trimText(body.schoolEmail, 120);
        const schoolWeb = trimText(body.schoolWebsite, 200);
        const schoolPr = trimText(body.schoolPrincipal, 120);
        const schoolCode = trimText(body.schoolCode, 32);
        const schoolDrena = trimText(body.schoolDrena, 120);
        const schoolIepp = trimText(body.schoolIepp, 120);
        const schoolRegion = trimText(body.schoolRegion, 120);
        let schoolStatus = undefined;
        if (body.schoolStatus !== undefined) {
            if (body.schoolStatus === null || body.schoolStatus === '') {
                schoolStatus = null;
            }
            else if (typeof body.schoolStatus === 'string' &&
                ['PUBLIC', 'PRIVATE', 'COMMUNITY'].includes(body.schoolStatus)) {
                schoolStatus = body.schoolStatus;
            }
            else {
                return res.status(400).json({ error: 'Statut établissement invalide (PUBLIC, PRIVATE, COMMUNITY)' });
            }
        }
        let schoolMilieu = undefined;
        if (body.schoolMilieu !== undefined) {
            if (body.schoolMilieu === null || body.schoolMilieu === '') {
                schoolMilieu = null;
            }
            else if (typeof body.schoolMilieu === 'string' &&
                ['URBAN', 'RURAL'].includes(body.schoolMilieu)) {
                schoolMilieu = body.schoolMilieu;
            }
            else {
                return res.status(400).json({ error: 'Milieu invalide (URBAN, RURAL)' });
            }
        }
        let classroomCount = undefined;
        if (body.classroomCount !== undefined) {
            if (body.classroomCount === null || body.classroomCount === '') {
                classroomCount = null;
            }
            else {
                const n = typeof body.classroomCount === 'number'
                    ? body.classroomCount
                    : Number(body.classroomCount);
                if (!Number.isFinite(n) || n < 0 || n > 10000) {
                    return res.status(400).json({ error: 'Nombre de salles invalide' });
                }
                classroomCount = Math.floor(n);
            }
        }
        if (schoolName !== undefined)
            data.schoolDisplayName = schoolName;
        if (schoolAddr !== undefined)
            data.schoolAddress = schoolAddr;
        if (schoolPh !== undefined)
            data.schoolPhone = schoolPh;
        if (schoolEm !== undefined)
            data.schoolEmail = schoolEm;
        if (schoolWeb !== undefined)
            data.schoolWebsite = schoolWeb;
        if (schoolPr !== undefined)
            data.schoolPrincipal = schoolPr;
        if (schoolCode !== undefined)
            data.schoolCode = schoolCode;
        if (schoolDrena !== undefined)
            data.schoolDrena = schoolDrena;
        if (schoolIepp !== undefined)
            data.schoolIepp = schoolIepp;
        if (schoolRegion !== undefined)
            data.schoolRegion = schoolRegion;
        if (schoolStatus !== undefined)
            data.schoolStatus = schoolStatus;
        if (schoolMilieu !== undefined)
            data.schoolMilieu = schoolMilieu;
        if (classroomCount !== undefined)
            data.classroomCount = classroomCount;
        const directorName = trimText(body.studiesDirectorName, 120);
        const directorOccasion = trimText(body.studiesDirectorOccasionBadge, 160);
        const directorTitle = trimText(body.studiesDirectorMessageTitle, 160);
        const directorMessage = trimLongText(body.studiesDirectorMessage, 20000);
        const directorClosing = trimText(body.studiesDirectorClosing, 500);
        const directorFooter = trimText(body.studiesDirectorFooterLine, 300);
        if (directorName !== undefined)
            data.studiesDirectorName = directorName;
        if (directorOccasion !== undefined)
            data.studiesDirectorOccasionBadge = directorOccasion;
        if (directorTitle !== undefined)
            data.studiesDirectorMessageTitle = directorTitle;
        if (directorMessage !== undefined)
            data.studiesDirectorMessage = directorMessage;
        if (directorClosing !== undefined)
            data.studiesDirectorClosing = directorClosing;
        if (directorFooter !== undefined)
            data.studiesDirectorFooterLine = directorFooter;
        const prev = await appBranding.findUnique({ where: { id: brandingId } });
        const applyUrlClear = async (key, bodyKey) => {
            if (!(bodyKey in body))
                return;
            const v = body[bodyKey];
            if (v === null) {
                const old = prev?.[key];
                if (old)
                    await (0, upload_persist_util_1.deleteStoredUploadUrl)(old);
                data[key] = null;
            }
        };
        await applyUrlClear('navigationLogoUrl', 'navigationLogoUrl');
        await applyUrlClear('loginLogoUrl', 'loginLogoUrl');
        await applyUrlClear('faviconUrl', 'faviconUrl');
        if ('studiesDirectorPhotoUrl' in body && body.studiesDirectorPhotoUrl === null) {
            const old = prev?.studiesDirectorPhotoUrl;
            if (old)
                await (0, upload_persist_util_1.deleteStoredUploadUrl)(old);
            data.studiesDirectorPhotoUrl = null;
        }
        if (body.homePageImages && typeof body.homePageImages === 'object' && !Array.isArray(body.homePageImages)) {
            const prevImages = (0, home_page_images_util_1.parseHomePageImages)(prev?.homePageImages);
            let nextImages = { ...prevImages };
            for (const [key, value] of Object.entries(body.homePageImages)) {
                if (!(0, home_page_images_util_1.isHomePageImageSlot)(key) || value !== null)
                    continue;
                const oldUrl = prevImages[key];
                if (oldUrl)
                    await (0, upload_persist_util_1.deleteStoredUploadUrl)(oldUrl);
                nextImages = (0, home_page_images_util_1.clearHomePageImageSlot)(nextImages, key);
            }
            data.homePageImages = nextImages;
        }
        if (Object.keys(data).length === 0) {
            const row = prev ??
                (await appBranding.create({
                    data: {
                        id: brandingId,
                        schoolId: req.schoolId ?? undefined,
                    },
                }));
            return res.json(toPublicShape(row));
        }
        const row = await appBranding.upsert({
            where: { id: brandingId },
            create: {
                id: brandingId,
                schoolId: req.schoolId ?? undefined,
                ...data,
            },
            update: data,
        });
        res.json(toPublicShape(row));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('PUT /admin/app-branding:', error);
        const status = message.startsWith('Année scolaire invalide') ? 400 : 500;
        res.status(status).json({ error: message });
    }
});
router.post('/app-branding/upload', (req, res, next) => {
    upload_middleware_1.brandingUpload.single('branding')(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : 'Upload invalide';
            return res.status(400).json({ error: message });
        }
        next();
    });
}, async (req, res) => {
    try {
        const appBranding = delegateOr503(res);
        if (!appBranding)
            return;
        const brandingId = req.schoolId
            ? await (0, school_context_util_1.brandingIdForSchool)(req.schoolId)
            : app_branding_prisma_util_1.APP_BRANDING_ID;
        const slot = String(req.query.slot || '').trim();
        if (!isAllowedBrandingSlot(slot)) {
            return res.status(400).json({
                error: 'Paramètre slot invalide (navigation, login, favicon, studiesDirector ou clé homePageImages)',
            });
        }
        if (!req.file) {
            return res.status(400).json({ error: 'Fichier manquant (champ branding)' });
        }
        const fileUrl = await (0, upload_persist_util_1.persistUploadedFile)(req.file, 'branding', { relative: true });
        const prev = await appBranding.findUnique({ where: { id: brandingId } });
        if ((0, home_page_images_util_1.isHomePageImageSlot)(slot)) {
            const prevImages = (0, home_page_images_util_1.parseHomePageImages)(prev?.homePageImages);
            const oldUrl = prevImages[slot];
            const nextImages = (0, home_page_images_util_1.mergeHomePageImageUpdate)(prevImages, slot, fileUrl);
            const row = await appBranding.upsert({
                where: { id: brandingId },
                create: {
                    id: brandingId,
                    schoolId: req.schoolId ?? undefined,
                    homePageImages: nextImages,
                },
                update: { homePageImages: nextImages },
            });
            if (oldUrl && oldUrl !== fileUrl) {
                await (0, upload_persist_util_1.deleteStoredUploadUrl)(oldUrl);
            }
            return res.json(toPublicShape(row));
        }
        let oldUrl;
        if (slot === 'navigation')
            oldUrl = prev?.navigationLogoUrl ?? undefined;
        else if (slot === 'login')
            oldUrl = prev?.loginLogoUrl ?? undefined;
        else if (slot === 'favicon')
            oldUrl = prev?.faviconUrl ?? undefined;
        else
            oldUrl = prev?.studiesDirectorPhotoUrl;
        const update = slot === 'navigation'
            ? { navigationLogoUrl: fileUrl }
            : slot === 'login'
                ? { loginLogoUrl: fileUrl }
                : slot === 'favicon'
                    ? { faviconUrl: fileUrl }
                    : { studiesDirectorPhotoUrl: fileUrl };
        const row = await appBranding.upsert({
            where: { id: brandingId },
            create: {
                id: brandingId,
                schoolId: req.schoolId ?? undefined,
                navigationLogoUrl: slot === 'navigation' ? fileUrl : null,
                loginLogoUrl: slot === 'login' ? fileUrl : null,
                faviconUrl: slot === 'favicon' ? fileUrl : null,
                studiesDirectorPhotoUrl: slot === 'studiesDirector' ? fileUrl : null,
            },
            update,
        });
        if (oldUrl && oldUrl !== fileUrl) {
            await (0, upload_persist_util_1.deleteStoredUploadUrl)(oldUrl);
        }
        res.json(toPublicShape(row));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Erreur serveur';
        console.error('POST /admin/app-branding/upload:', error);
        res.status(500).json({ error: message });
    }
});
exports.default = router;
//# sourceMappingURL=admin-app-branding.routes.js.map