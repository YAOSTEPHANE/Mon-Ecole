import express from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import type { SchoolContextRequest } from '../utils/school-context.util';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  buildMenaStudentExportPackage,
  checksumMenaPackage,
  getConfiguredMenaWebhookUrl,
  maskConfiguredMenaWebhook,
  menaPackageToStudentsCsv,
  pushMenaPackageToWebhook,
} from '../utils/mena-export.util';
import {
  findSchoolOption,
  getFneFormOptions,
  searchFneMatricule,
  type FneCycle,
} from '../utils/fne-matricule-search.util';
import { getAppBrandingDelegate } from '../utils/app-branding-prisma.util';
import { brandingIdForSchool } from '../utils/school-context.util';
import { toPublicBrandingShape } from '../utils/branding-assets.util';

const router = express.Router();

function schoolCtx(req: SchoolContextRequest) {
  return {
    schoolId: req.schoolId!,
    isDefault: req.school?.isDefault ?? false,
  };
}

async function schoolFneDefaults(schoolId: string) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, shortName: true },
  });
  let schoolCode: string | null = null;
  let schoolDisplayName: string | null = null;
  const brandingDelegate = getAppBrandingDelegate();
  if (brandingDelegate) {
    const brandingId = await brandingIdForSchool(schoolId);
    const row = await brandingDelegate.findUnique({ where: { id: brandingId } });
    if (row) {
      const branding = toPublicBrandingShape(row as Parameters<typeof toPublicBrandingShape>[0]);
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
router.get('/mena/status', async (_req: SchoolContextRequest, res) => {
  try {
    const webhook = maskConfiguredMenaWebhook();
    res.json({
      webhookConfigured: Boolean(webhook),
      webhookUrlMasked: webhook,
      note: webhook
        ? 'Un webhook MENA est configuré : l’envoi tentera une transmission HTTP automatique.'
        : 'Aucun MENA_WEBHOOK_URL configuré. Vous pouvez générer le dossier pour dépôt manuel (DESPS / SIGE).',
    });
  } catch (e) {
    console.error('GET /admin/mena/status:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Options du formulaire FNE (années + établissements) + établissement par défaut de l’école.
 * Query: cycle=secondary|primary&q=
 */
router.get('/mena/fne-options', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = schoolCtx(req);
    const cycle: FneCycle =
      typeof req.query.cycle === 'string' && req.query.cycle === 'primary'
        ? 'primary'
        : 'secondary';
    const q =
      typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

    const [opts, defaults] = await Promise.all([
      getFneFormOptions(cycle),
      schoolFneDefaults(schoolId),
    ]);

    const matched = findSchoolOption(opts.schools, defaults.schoolCode, defaults.schoolName);
    let schools = opts.schools;
    if (q) {
      schools = schools.filter(
        (s) => s.name.toLowerCase().includes(q) || s.id.includes(q)
      );
    } else if (matched) {
      const neighbors = opts.schools
        .filter((s) => /bouake|bouaké/i.test(s.name) && s.id !== matched.id)
        .slice(0, 40);
      schools = [matched, ...neighbors];
    } else {
      schools = opts.schools.filter((s) => /bouake|bouaké/i.test(s.name)).slice(0, 80);
    }

    res.json({
      cycle: opts.cycle,
      years: opts.years,
      portalYears: opts.portalYears,
      preferredYear: opts.preferredYear,
      schools,
      schoolsTotal: opts.schools.length,
      formUrl: opts.formUrl,
      defaultEtablissementId: matched?.id ?? defaults.schoolCode ?? null,
      defaultEtablissementName: matched?.name ?? null,
      schoolCodeConfigured: defaults.schoolCode,
    });
  } catch (e) {
    console.error('GET /admin/mena/fne-options:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Recherche de matricule FNE directement depuis École à jour (proxy vers SIGFNE).
 */
router.post('/mena/fne-lookup', async (req: SchoolContextRequest, res) => {
  try {
    const body = (req.body ?? {}) as {
      cycle?: string;
      annee?: string;
      nom?: string;
      prenoms?: string;
      datenaiss?: string;
      etablissement?: string;
    };

    const cycle: FneCycle = body.cycle === 'primary' ? 'primary' : 'secondary';
    const annee = typeof body.annee === 'string' ? body.annee.trim() : '';
    const nom = typeof body.nom === 'string' ? body.nom.trim() : '';
    const prenoms = typeof body.prenoms === 'string' ? body.prenoms.trim() : '';
    const datenaiss = typeof body.datenaiss === 'string' ? body.datenaiss.trim() : '';
    const etablissement =
      typeof body.etablissement === 'string' ? body.etablissement.trim() : '';

    const result = await searchFneMatricule({
      cycle,
      annee,
      nom,
      prenoms,
      datenaiss,
      etablissement,
    });

    res.json(result);
  } catch (e) {
    console.error('POST /admin/mena/fne-lookup:', e);
    const message = e instanceof Error ? e.message : 'Erreur serveur';
    const status = /critère|Sélectionnez|Indiquez/i.test(message) ? 400 : 502;
    res.status(status).json({ error: message });
  }
});

/** Aperçu du dossier élèves MENA (sans persistance). */
router.get('/mena/export-package', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId, isDefault } = schoolCtx(req);
    const academicYear =
      typeof req.query.academicYear === 'string' ? req.query.academicYear.trim() : '';
    const format = typeof req.query.format === 'string' ? req.query.format.trim() : 'json';

    const pkg = await buildMenaStudentExportPackage(
      schoolId,
      isDefault,
      academicYear || undefined
    );
    const checksum = checksumMenaPackage(pkg);

    if (format === 'csv') {
      const csv = menaPackageToStudentsCsv(pkg);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="mena-eleves-${academicYear || 'toutes'}.csv"`
      );
      return res.send(csv);
    }

    res.json({
      checksum,
      package: pkg,
    });
  } catch (e) {
    console.error('GET /admin/mena/export-package:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/**
 * Prépare le dossier élèves et tente l’envoi vers MENA si webhook configuré.
 * Enregistre toujours un historique local.
 */
router.post('/mena/transmit', async (req: SchoolContextRequest & AuthRequest, res) => {
  try {
    const { schoolId, isDefault } = schoolCtx(req);
    const body = (req.body ?? {}) as { academicYear?: string; forceExportOnly?: boolean };
    const academicYear =
      typeof body.academicYear === 'string' ? body.academicYear.trim() || null : null;
    const forceExportOnly = Boolean(body.forceExportOnly);

    const pkg = await buildMenaStudentExportPackage(
      schoolId,
      isDefault,
      academicYear || undefined
    );
    const checksum = checksumMenaPackage(pkg);
    const webhookUrl = forceExportOnly ? null : getConfiguredMenaWebhookUrl();

    let status = 'EXPORTED';
    let channel = 'EXPORT';
    let errorMessage: string | null = null;
    let webhookHttpStatus: number | null = null;
    let webhookUrlMasked: string | null = null;

    if (webhookUrl) {
      channel = 'BOTH';
      webhookUrlMasked = maskConfiguredMenaWebhook();
      try {
        const push = await pushMenaPackageToWebhook(pkg, webhookUrl);
        webhookHttpStatus = push.status;
        if (push.ok) {
          status = 'SENT';
        } else {
          status = 'FAILED';
          errorMessage = `Webhook HTTP ${push.status}: ${push.bodyPreview || 'sans détail'}`;
        }
      } catch (err) {
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

    const record = await prisma.menaTransmission.create({
      data: {
        schoolId,
        academicYear: academicYear,
        status,
        channel,
        studentCount: pkg.eleves.length,
        packageChecksum: checksum,
        summary: summary as Prisma.InputJsonValue,
        payload: pkg as unknown as Prisma.InputJsonValue,
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
      message:
        status === 'SENT'
          ? 'Dossier élèves transmis via le webhook MENA configuré.'
          : status === 'FAILED'
            ? 'Échec de transmission webhook — le dossier reste disponible en export local.'
            : 'Dossier élèves préparé pour dépôt manuel MENA / DESPS (aucun webhook configuré).',
    });
  } catch (e) {
    console.error('POST /admin/mena/transmit:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Historique des transmissions / exports MENA. */
router.get('/mena/transmissions', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = schoolCtx(req);
    const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : 20;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;

    const rows = await prisma.menaTransmission.findMany({
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
  } catch (e) {
    console.error('GET /admin/mena/transmissions:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

/** Re-télécharger le payload d’une transmission. */
router.get('/mena/transmissions/:id', async (req: SchoolContextRequest, res) => {
  try {
    const { schoolId } = schoolCtx(req);
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ error: 'Identifiant invalide' });
    }

    const row = await prisma.menaTransmission.findFirst({
      where: { id, schoolId },
    });
    if (!row) {
      return res.status(404).json({ error: 'Transmission introuvable' });
    }

    res.json(row);
  } catch (e) {
    console.error('GET /admin/mena/transmissions/:id:', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur serveur' });
  }
});

export default router;
