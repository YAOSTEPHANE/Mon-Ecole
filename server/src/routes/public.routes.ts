import express from 'express';
import prisma from '../utils/prisma';
import { getAppBrandingDelegate, APP_BRANDING_ID } from '../utils/app-branding-prisma.util';
import {
  brandingIdForSchool,
  readSchoolSlugFromRequest,
  resolveSchoolBySlug,
} from '../utils/school-context.util';
import { ensureDefaultSchool } from '../utils/ensure-default-school.util';
import { toPublicBrandingShape } from '../utils/branding-assets.util';
import { prismaConnectionErrorMessage } from '../utils/production-env-diagnostics.util';
import { fneLookupLimiter } from '../middleware/rate-limit.middleware';
import {
  findSchoolOption,
  getFneFormOptions,
  searchFneMatricule,
  type FneCycle,
} from '../utils/fne-matricule-search.util';
import { getCurrentAcademicYear } from '../utils/report-card.util';
import {
  buildHonorRoll,
  getHonorRollSetting,
  listPublishedExamStats,
} from '../utils/public-academic-showcase.util';

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
  homePageImages: {} as Record<string, unknown>,
};

const router = express.Router();

/** Liste des établissements actifs (sélecteur public pré-inscription). */
router.get('/schools', async (_req, res) => {
  try {
    await ensureDefaultSchool();
    const schools = await prisma.school.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, shortName: true, isDefault: true },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
    res.json(schools);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    res.status(500).json({ error: message });
  }
});

router.get('/app-branding', async (req, res) => {
  try {
    const appBranding = getAppBrandingDelegate();
    if (!appBranding) {
      console.error(
        '[app-branding] Client Prisma sans modèle AppBranding — cd server && npx prisma generate && npx prisma db push'
      );
      return res.json(EMPTY_PUBLIC_BRANDING);
    }

    let brandingId = APP_BRANDING_ID;
    const slug = readSchoolSlugFromRequest(req);
    if (slug) {
      const school = await resolveSchoolBySlug(slug);
      if (school) brandingId = await brandingIdForSchool(school.id);
    } else {
      const defaultSchoolId = await ensureDefaultSchool();
      brandingId = await brandingIdForSchool(defaultSchoolId);
    }

    const row = await appBranding.findUnique({ where: { id: brandingId } });
    if (!row) {
      return res.json(EMPTY_PUBLIC_BRANDING);
    }
    res.json(
      toPublicBrandingShape({
        navigationLogoUrl: row.navigationLogoUrl,
        loginLogoUrl: row.loginLogoUrl,
        faviconUrl: row.faviconUrl,
        appTitle: row.appTitle,
        appTagline: row.appTagline,
        currentAcademicYear:
          (row as { currentAcademicYear?: string | null }).currentAcademicYear ?? null,
        schoolDisplayName: row.schoolDisplayName ?? null,
        schoolAddress: row.schoolAddress ?? null,
        schoolPhone: row.schoolPhone ?? null,
        schoolEmail: row.schoolEmail ?? null,
        schoolWebsite: row.schoolWebsite ?? null,
        schoolPrincipal: row.schoolPrincipal ?? null,
        schoolCode: (row as { schoolCode?: string | null }).schoolCode ?? null,
        schoolDrena: (row as { schoolDrena?: string | null }).schoolDrena ?? null,
        schoolIepp: (row as { schoolIepp?: string | null }).schoolIepp ?? null,
        schoolStatus: (row as { schoolStatus?: string | null }).schoolStatus ?? null,
        schoolMilieu: (row as { schoolMilieu?: string | null }).schoolMilieu ?? null,
        schoolRegion: (row as { schoolRegion?: string | null }).schoolRegion ?? null,
        classroomCount: (row as { classroomCount?: number | null }).classroomCount ?? null,
        studiesDirectorPhotoUrl:
          (row as { studiesDirectorPhotoUrl?: string | null }).studiesDirectorPhotoUrl ?? null,
        studiesDirectorName:
          (row as { studiesDirectorName?: string | null }).studiesDirectorName ?? null,
        studiesDirectorOccasionBadge:
          (row as { studiesDirectorOccasionBadge?: string | null }).studiesDirectorOccasionBadge ??
          null,
        studiesDirectorMessageTitle:
          (row as { studiesDirectorMessageTitle?: string | null }).studiesDirectorMessageTitle ??
          null,
        studiesDirectorMessage:
          (row as { studiesDirectorMessage?: string | null }).studiesDirectorMessage ?? null,
        studiesDirectorClosing:
          (row as { studiesDirectorClosing?: string | null }).studiesDirectorClosing ?? null,
        studiesDirectorFooterLine:
          (row as { studiesDirectorFooterLine?: string | null }).studiesDirectorFooterLine ?? null,
        homePageImages: (row as { homePageImages?: unknown }).homePageImages ?? null,
      }),
    );
  } catch (error: unknown) {
    const dbMsg = prismaConnectionErrorMessage(error);
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

    const student = await prisma.student.findFirst({
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public/student-card:', error);
    res.status(500).json({ error: message });
  }
});

async function resolvePublicSchoolId(req: express.Request): Promise<string> {
  await ensureDefaultSchool();
  const slug = readSchoolSlugFromRequest(req);
  if (slug) {
    const school = await resolveSchoolBySlug(slug);
    if (school?.id) return school.id;
  }
  const defaultSchoolId = await ensureDefaultSchool();
  return defaultSchoolId;
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

/** Options publiques pour la recherche de matricule FNE (accueil élèves / familles). */
router.get('/fne-options', fneLookupLimiter, async (req, res) => {
  try {
    const schoolId = await resolvePublicSchoolId(req);
    const cycle: FneCycle =
      typeof req.query.cycle === 'string' && req.query.cycle === 'primary'
        ? 'primary'
        : 'secondary';

    const [opts, defaults] = await Promise.all([
      getFneFormOptions(cycle),
      schoolFneDefaults(schoolId),
    ]);
    const matched = findSchoolOption(opts.schools, defaults.schoolCode, defaults.schoolName);

    let schools = opts.schools;
    if (matched) {
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
      formUrl: opts.formUrl,
      defaultEtablissementId: matched?.id ?? defaults.schoolCode ?? null,
      defaultEtablissementName: matched?.name ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public/fne-options:', error);
    res.status(502).json({ error: message });
  }
});

/** Recherche publique de matricule FNE (proxy SIGFNE). */
router.post('/fne-lookup', fneLookupLimiter, async (req, res) => {
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('POST /public/fne-lookup:', error);
    const status = /critère|Sélectionnez|Indiquez/i.test(message) ? 400 : 502;
    res.status(status).json({ error: message });
  }
});

/** Taux d’admission officiels et palmarès (1er de chaque classe) pour la page d’accueil. */
router.get('/academic-results', async (req, res) => {
  try {
    const schoolId = await resolvePublicSchoolId(req);
    const brandingDelegate = getAppBrandingDelegate();
    let academicYear = getCurrentAcademicYear();
    if (brandingDelegate) {
      const brandingId = await brandingIdForSchool(schoolId);
      const row = await brandingDelegate.findUnique({ where: { id: brandingId } });
      const year = (row as { currentAcademicYear?: string | null } | null)?.currentAcademicYear;
      if (year && /^\d{4}-\d{4}$/.test(year)) academicYear = year;
    }

    const honorSetting = await getHonorRollSetting(schoolId);
    const honorYear = honorSetting?.academicYear || academicYear;
    const honorEnabled = honorSetting?.enabled ?? true;
    const [examStats, honorRoll] = await Promise.all([
      listPublishedExamStats({ schoolId, academicYear: honorYear }),
      honorEnabled
        ? buildHonorRoll({
            schoolId,
            academicYear: honorYear,
            period: honorSetting?.period,
          })
        : Promise.resolve(null),
    ]);

    res.json({
      academicYear: honorYear,
      examStats,
      honorRoll: honorEnabled ? honorRoll : null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /public/academic-results:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
