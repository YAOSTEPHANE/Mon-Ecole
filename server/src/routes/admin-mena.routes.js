"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../utils/prisma"));
const mena_export_util_1 = require("../utils/mena-export.util");
const fne_matricule_search_util_1 = require("../utils/fne-matricule-search.util");
const app_branding_prisma_util_1 = require("../utils/app-branding-prisma.util");
const school_context_util_1 = require("../utils/school-context.util");
const branding_assets_util_1 = require("../utils/branding-assets.util");
const router = express_1.default.Router();
function schoolCtx(req) {
    return {
        schoolId: req.schoolId,
        isDefault: req.school?.isDefault ?? false,
    };
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
/** Statut de la passerelle MENA (webhook configuré ou non). */
router.get('/mena/status', async (_req, res) => {
    try {
        const webhook = (0, mena_export_util_1.maskConfiguredMenaWebhook)();
        res.json({
            webhookConfigured: Boolean(webhook),
            webhookUrlMasked: webhook,
            note: webhook
                ? 'Un webhook MENA est configuré : l’envoi tentera une transmission HTTP automatique.'
                : 'Aucun MENA_WEBHOOK_URL configuré. Vous pouvez générer le dossier pour dépôt manuel (DESPS / SIGE).',
        });
    }
    catch (e) {
        console.error('GET /admin/mena/status:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/**
 * Options du formulaire FNE (années + établissements) + établissement par défaut de l’école.
 * Query: cycle=secondary|primary&q=
 */
router.get('/mena/fne-options', async (req, res) => {
    try {
        const { schoolId } = schoolCtx(req);
        const cycle = typeof req.query.cycle === 'string' && req.query.cycle === 'primary'
            ? 'primary'
            : 'secondary';
        const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
        const [opts, defaults] = await Promise.all([
            (0, fne_matricule_search_util_1.getFneFormOptions)(cycle),
            schoolFneDefaults(schoolId),
        ]);
        const matched = (0, fne_matricule_search_util_1.findSchoolOption)(opts.schools, defaults.schoolCode, defaults.schoolName);
        let schools = opts.schools;
        if (q) {
            schools = schools.filter((s) => s.name.toLowerCase().includes(q) || s.id.includes(q));
        }
        else if (matched) {
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
            schoolsTotal: opts.schools.length,
            formUrl: opts.formUrl,
            defaultEtablissementId: matched?.id ?? defaults.schoolCode ?? null,
            defaultEtablissementName: matched?.name ?? null,
            schoolCodeConfigured: defaults.schoolCode,
        });
    }
    catch (e) {
        console.error('GET /admin/mena/fne-options:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/**
 * Recherche de matricule FNE directement depuis School Manager (proxy vers SIGFNE).
 */
router.post('/mena/fne-lookup', async (req, res) => {
    try {
        const body = (req.body ?? {});
        const cycle = body.cycle === 'primary' ? 'primary' : 'secondary';
        const annee = typeof body.annee === 'string' ? body.annee.trim() : '';
        const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
        const prenoms = typeof body.prenoms === 'string' ? body.prenoms.trim() : '';
        const datenaiss = typeof body.datenaiss === 'string' ? body.datenaiss.trim() : '';
        let etablissement = typeof body.etablissement === 'string' ? body.etablissement.trim() : '';
        if (!etablissement) {
            const defaults = await schoolFneDefaults(req.schoolId);
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
    catch (e) {
        console.error('POST /admin/mena/fne-lookup:', e);
        const message = e instanceof Error ? e.message : 'Erreur serveur';
        const status = /critère|Sélectionnez|Indiquez/i.test(message) ? 400 : 502;
        res.status(status).json({ error: message });
    }
});
/** Aperçu du dossier élèves MENA (sans persistance). */
router.get('/mena/export-package', async (req, res) => {
    try {
        const { schoolId, isDefault } = schoolCtx(req);
        const academicYear = typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
        const format = typeof req.query.format === 'string' ? req.query.format.trim() : 'json';
        const pkg = await (0, mena_export_util_1.buildMenaStudentExportPackage)(schoolId, isDefault, academicYear || undefined);
        const checksum = (0, mena_export_util_1.checksumMenaPackage)(pkg);
        if (format === 'csv') {
            const csv = (0, mena_export_util_1.menaPackageToStudentsCsv)(pkg);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="mena-eleves-${academicYear || 'toutes'}.csv"`);
            return res.send(csv);
        }
        res.json({
            checksum,
            package: pkg,
        });
    }
    catch (e) {
        console.error('GET /admin/mena/export-package:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/**
 * Prépare le dossier élèves et tente l’envoi vers MENA si webhook configuré.
 * Enregistre toujours un historique local.
 */
router.post('/mena/transmit', async (req, res) => {
    try {
        const { schoolId, isDefault } = schoolCtx(req);
        const body = (req.body ?? {});
        const academicYear = typeof body.academicYear === 'string' ? body.academicYear.trim() || null : null;
        const forceExportOnly = Boolean(body.forceExportOnly);
        const pkg = await (0, mena_export_util_1.buildMenaStudentExportPackage)(schoolId, isDefault, academicYear || undefined);
        const checksum = (0, mena_export_util_1.checksumMenaPackage)(pkg);
        const webhookUrl = forceExportOnly ? null : (0, mena_export_util_1.getConfiguredMenaWebhookUrl)();
        let status = 'EXPORTED';
        let channel = 'EXPORT';
        let errorMessage = null;
        let webhookHttpStatus = null;
        let webhookUrlMasked = null;
        if (webhookUrl) {
            channel = 'BOTH';
            webhookUrlMasked = (0, mena_export_util_1.maskConfiguredMenaWebhook)();
            try {
                const push = await (0, mena_export_util_1.pushMenaPackageToWebhook)(pkg, webhookUrl);
                webhookHttpStatus = push.status;
                if (push.ok) {
                    status = 'SENT';
                }
                else {
                    status = 'FAILED';
                    errorMessage = `Webhook HTTP ${push.status}: ${push.bodyPreview || 'sans détail'}`;
                }
            }
            catch (err) {
                status = 'FAILED';
                errorMessage = err instanceof Error ? err.message : 'Échec webhook MENA';
            }
        }
        const summary = {
            etablissement: pkg.etablissement,
            effectifs: pkg.effectifs,
            elevesCount: pkg.eleves.length,
            academicYear: pkg.meta.academicYear,
            generatedAt: pkg.meta.generatedAt,
        };
        const record = await prisma_1.default.menaTransmission.create({
            data: {
                schoolId,
                academicYear: academicYear,
                status,
                channel,
                studentCount: pkg.eleves.length,
                packageChecksum: checksum,
                summary,
                payload: pkg,
                errorMessage,
                webhookUrlMasked,
                webhookHttpStatus,
                createdByUserId: req.user?.id ?? null,
            },
        });
        res.status(status === 'FAILED' ? 502 : 201).json({
            transmission: {
                id: record.id,
                status: record.status,
                channel: record.channel,
                studentCount: record.studentCount,
                packageChecksum: record.packageChecksum,
                academicYear: record.academicYear,
                errorMessage: record.errorMessage,
                webhookUrlMasked: record.webhookUrlMasked,
                webhookHttpStatus: record.webhookHttpStatus,
                createdAt: record.createdAt,
            },
            package: pkg,
            checksum,
            message: status === 'SENT'
                ? 'Dossier élèves transmis via le webhook MENA configuré.'
                : status === 'FAILED'
                    ? 'Échec de transmission webhook — le dossier reste disponible en export local.'
                    : 'Dossier élèves préparé pour dépôt manuel MENA / DESPS (aucun webhook configuré).',
        });
    }
    catch (e) {
        console.error('POST /admin/mena/transmit:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/** Historique des transmissions / exports MENA. */
router.get('/mena/transmissions', async (req, res) => {
    try {
        const { schoolId } = schoolCtx(req);
        const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
        const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
        const rows = await prisma_1.default.menaTransmission.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                academicYear: true,
                status: true,
                channel: true,
                studentCount: true,
                packageChecksum: true,
                errorMessage: true,
                webhookUrlMasked: true,
                webhookHttpStatus: true,
                createdAt: true,
                summary: true,
            },
        });
        res.json({ transmissions: rows });
    }
    catch (e) {
        console.error('GET /admin/mena/transmissions:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
/** Re-télécharger le payload d’une transmission. */
router.get('/mena/transmissions/:id', async (req, res) => {
    try {
        const { schoolId } = schoolCtx(req);
        const { id } = req.params;
        if (!/^[a-f\d]{24}$/i.test(id)) {
            return res.status(400).json({ error: 'Identifiant invalide' });
        }
        const row = await prisma_1.default.menaTransmission.findFirst({
            where: { id, schoolId },
        });
        if (!row) {
            return res.status(404).json({ error: 'Transmission introuvable' });
        }
        res.json(row);
    }
    catch (e) {
        console.error('GET /admin/mena/transmissions/:id:', e);
        res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=admin-mena.routes.js.map