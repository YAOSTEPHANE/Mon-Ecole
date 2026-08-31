import express from 'express';
import type { Prisma } from '@prisma/client';
import prisma from '../utils/prisma';
import { brandingUpload } from '../middleware/upload.middleware';
import { deleteStoredUploadUrl, persistUploadedFile } from '../utils/upload-persist.util';
import {
  getAppBrandingDelegate,
  APP_BRANDING_ID,
  APP_BRANDING_PRISMA_HINT,
} from '../utils/app-branding-prisma.util';
import type { SchoolContextRequest } from '../utils/school-context.util';
import { brandingIdForSchool } from '../utils/school-context.util';
import { toPublicBrandingShape } from '../utils/branding-assets.util';
import {
  parseAcademicTermDates,
  serializeAcademicTermDatesForApi,
} from '../utils/academic-term-dates.util';
import {
  clearHomePageImageSlot,
  HOME_PAGE_IMAGE_HIDDEN,
  isHomePageImageSlot,
  mergeHomePageImageUpdate,
  parseHomePageImages,
} from '../utils/home-page-images.util';
import { sanitizeAboutPageContent } from '../utils/about-page-content.util';

const router = express.Router();

const CORE_SLOTS = new Set(['navigation', 'login', 'favicon', 'studiesDirector']);

function isAllowedBrandingSlot(slot: string): boolean {
  return CORE_SLOTS.has(slot) || isHomePageImageSlot(slot);
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
    schoolMapsUrl: null,
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
    aboutPageContent: null,
    academicTermDates: null,
  };
}

function trimText(v: unknown, max: number): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length === 0 ? null : t.slice(0, max);
}

function trimLongText(v: unknown, max: number): string | null | undefined {
  return trimText(v, max);
}

function normalizeMapsUrl(v: unknown): string | null | undefined {
  const t = trimText(v, 1000);
  if (t === undefined) return undefined;
  if (t === null) return null;
  if (!/^https:\/\//i.test(t)) {
    throw new Error('Lien Maps invalide : utilisez une URL https (ex. lien Google Maps).');
  }
  return t;
}

function normalizeAcademicYearSetting(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const trimmed = v.trim();
  if (!trimmed) return null;
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

function toPublicShape(row: Parameters<typeof toPublicBrandingShape>[0]) {
  return toPublicBrandingShape(row);
}

function delegateOr503(res: express.Response) {
  const appBranding = getAppBrandingDelegate();
  if (!appBranding) {
    console.error(
      '[app-branding] Client Prisma sans modèle AppBranding — cd server && npx prisma generate && npx prisma db push'
    );
    res.status(503).json({ error: APP_BRANDING_PRISMA_HINT });
    return null;
  }
  return appBranding;
}

/** Lecture (admin) — même contenu que l’endpoint public. */
router.get('/app-branding', async (req: SchoolContextRequest, res) => {
  try {
    const appBranding = delegateOr503(res);
    if (!appBranding) return;

    const brandingId = req.schoolId
      ? await brandingIdForSchool(req.schoolId)
      : APP_BRANDING_ID;
    const row = await appBranding.findUnique({ where: { id: brandingId } });
    if (!row) {
      return res.json(emptyBrandingResponse());
    }
    res.json(toPublicShape(row as Parameters<typeof toPublicBrandingShape>[0]));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('GET /admin/app-branding:', error);
    res.status(500).json({ error: message });
  }
});

router.put('/app-branding', async (req: SchoolContextRequest, res) => {
  try {
    const appBranding = delegateOr503(res);
    if (!appBranding) return;

    const brandingId = req.schoolId
      ? await brandingIdForSchool(req.schoolId)
      : APP_BRANDING_ID;

    const body = req.body as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    const title = trimText(body.appTitle, 120);
    const tagline = trimText(body.appTagline, 160);
    const currentAcademicYear = normalizeAcademicYearSetting(body.currentAcademicYear);
    if (title !== undefined) data.appTitle = title;
    if (tagline !== undefined) data.appTagline = tagline;
    if (currentAcademicYear !== undefined) data.currentAcademicYear = currentAcademicYear;

    const schoolName = trimText(body.schoolDisplayName, 200);
    const schoolAddr = trimText(body.schoolAddress, 800);
    let schoolMapsUrl: string | null | undefined;
    try {
      schoolMapsUrl = normalizeMapsUrl(body.schoolMapsUrl);
    } catch (mapsErr) {
      return res.status(400).json({
        error: mapsErr instanceof Error ? mapsErr.message : 'Lien Maps invalide',
      });
    }
    const schoolPh = trimText(body.schoolPhone, 80);
    const schoolEm = trimText(body.schoolEmail, 120);
    const schoolWeb = trimText(body.schoolWebsite, 200);
    const schoolPr = trimText(body.schoolPrincipal, 120);
    const schoolCode = trimText(body.schoolCode, 32);
    const schoolDrena = trimText(body.schoolDrena, 120);
    const schoolIepp = trimText(body.schoolIepp, 120);
    const schoolRegion = trimText(body.schoolRegion, 120);
    let schoolStatus: string | null | undefined = undefined;
    if (body.schoolStatus !== undefined) {
      if (body.schoolStatus === null || body.schoolStatus === '') {
        schoolStatus = null;
      } else if (
        typeof body.schoolStatus === 'string' &&
        ['PUBLIC', 'PRIVATE', 'COMMUNITY'].includes(body.schoolStatus)
      ) {
        schoolStatus = body.schoolStatus;
      } else {
        return res.status(400).json({ error: 'Statut établissement invalide (PUBLIC, PRIVATE, COMMUNITY)' });
      }
    }
    let schoolMilieu: string | null | undefined = undefined;
    if (body.schoolMilieu !== undefined) {
      if (body.schoolMilieu === null || body.schoolMilieu === '') {
        schoolMilieu = null;
      } else if (
        typeof body.schoolMilieu === 'string' &&
        ['URBAN', 'RURAL'].includes(body.schoolMilieu)
      ) {
        schoolMilieu = body.schoolMilieu;
      } else {
        return res.status(400).json({ error: 'Milieu invalide (URBAN, RURAL)' });
      }
    }
    let classroomCount: number | null | undefined = undefined;
    if (body.classroomCount !== undefined) {
      if (body.classroomCount === null || body.classroomCount === '') {
        classroomCount = null;
      } else {
        const n =
          typeof body.classroomCount === 'number'
            ? body.classroomCount
            : Number(body.classroomCount);
        if (!Number.isFinite(n) || n < 0 || n > 10_000) {
          return res.status(400).json({ error: 'Nombre de salles invalide' });
        }
        classroomCount = Math.floor(n);
      }
    }
    if (schoolName !== undefined) data.schoolDisplayName = schoolName;
    if (schoolAddr !== undefined) data.schoolAddress = schoolAddr;
    if (schoolMapsUrl !== undefined) data.schoolMapsUrl = schoolMapsUrl;
    if (schoolPh !== undefined) data.schoolPhone = schoolPh;
    if (schoolEm !== undefined) data.schoolEmail = schoolEm;
    if (schoolWeb !== undefined) data.schoolWebsite = schoolWeb;
    if (schoolPr !== undefined) data.schoolPrincipal = schoolPr;
    if (schoolCode !== undefined) data.schoolCode = schoolCode;
    if (schoolDrena !== undefined) data.schoolDrena = schoolDrena;
    if (schoolIepp !== undefined) data.schoolIepp = schoolIepp;
    if (schoolRegion !== undefined) data.schoolRegion = schoolRegion;
    if (schoolStatus !== undefined) data.schoolStatus = schoolStatus;
    if (schoolMilieu !== undefined) data.schoolMilieu = schoolMilieu;
    if (classroomCount !== undefined) data.classroomCount = classroomCount;

    const directorName = trimText(body.studiesDirectorName, 120);
    const directorOccasion = trimText(body.studiesDirectorOccasionBadge, 160);
    const directorTitle = trimText(body.studiesDirectorMessageTitle, 160);
    const directorMessage = trimLongText(body.studiesDirectorMessage, 20_000);
    const directorClosing = trimText(body.studiesDirectorClosing, 500);
    const directorFooter = trimText(body.studiesDirectorFooterLine, 300);
    if (directorName !== undefined) data.studiesDirectorName = directorName;
    if (directorOccasion !== undefined) data.studiesDirectorOccasionBadge = directorOccasion;
    if (directorTitle !== undefined) data.studiesDirectorMessageTitle = directorTitle;
    if (directorMessage !== undefined) data.studiesDirectorMessage = directorMessage;
    if (directorClosing !== undefined) data.studiesDirectorClosing = directorClosing;
    if (directorFooter !== undefined) data.studiesDirectorFooterLine = directorFooter;

    const prev = await appBranding.findUnique({ where: { id: brandingId } });

    const applyUrlClear = async (
      key: 'navigationLogoUrl' | 'loginLogoUrl' | 'faviconUrl',
      bodyKey: string,
    ) => {
      if (!(bodyKey in body)) return;
      const v = body[bodyKey];
      if (v === null) {
        const old = prev?.[key];
        if (old) await deleteStoredUploadUrl(old);
        data[key] = null;
      }
    };

    await applyUrlClear('navigationLogoUrl', 'navigationLogoUrl');
    await applyUrlClear('loginLogoUrl', 'loginLogoUrl');
    await applyUrlClear('faviconUrl', 'faviconUrl');
    if ('studiesDirectorPhotoUrl' in body && body.studiesDirectorPhotoUrl === null) {
      const old = (prev as { studiesDirectorPhotoUrl?: string | null } | null)?.studiesDirectorPhotoUrl;
      if (old) await deleteStoredUploadUrl(old);
      data.studiesDirectorPhotoUrl = null;
    }

    if (body.homePageImages && typeof body.homePageImages === 'object' && !Array.isArray(body.homePageImages)) {
      const prevImages = parseHomePageImages(
        (prev as { homePageImages?: unknown } | null)?.homePageImages,
      );
      let nextImages = { ...prevImages };
      for (const [key, value] of Object.entries(body.homePageImages as Record<string, unknown>)) {
        if (!isHomePageImageSlot(key)) continue;
        if (value === null) {
          const oldUrl = prevImages[key];
          if (oldUrl && oldUrl !== HOME_PAGE_IMAGE_HIDDEN) await deleteStoredUploadUrl(oldUrl);
          nextImages = clearHomePageImageSlot(nextImages, key);
          continue;
        }
        if (value === HOME_PAGE_IMAGE_HIDDEN) {
          const oldUrl = prevImages[key];
          if (oldUrl && oldUrl !== HOME_PAGE_IMAGE_HIDDEN) await deleteStoredUploadUrl(oldUrl);
          nextImages = { ...nextImages, [key]: HOME_PAGE_IMAGE_HIDDEN };
        }
      }
      data.homePageImages = nextImages as Prisma.InputJsonValue;
    }

    if (body.aboutPageContent !== undefined) {
      if (body.aboutPageContent === null) {
        data.aboutPageContent = null;
      } else {
        const sanitized = sanitizeAboutPageContent(body.aboutPageContent);
        if (!sanitized) {
          return res.status(400).json({ error: 'Contenu « À propos » invalide' });
        }
        data.aboutPageContent = sanitized as Prisma.InputJsonValue;
      }
    }

    if (body.academicTermDates !== undefined) {
      if (body.academicTermDates === null) {
        data.academicTermDates = null;
      } else {
        const parsed = parseAcademicTermDates(body.academicTermDates);
        if (!parsed) {
          return res.status(400).json({ error: 'Dates de trimestres invalides' });
        }
        data.academicTermDates = serializeAcademicTermDatesForApi(parsed) as Prisma.InputJsonValue;
      }
    }

    if (Object.keys(data).length === 0) {
      const row =
        prev ??
        (await appBranding.create({
          data: {
            id: brandingId,
            schoolId: req.schoolId ?? undefined,
          },
        }));
      return res.json(toPublicShape(row as Parameters<typeof toPublicBrandingShape>[0]));
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

    // Garder le nom School aligné avec le nom d’affichage (sélecteur établissement, listes publiques).
    if (typeof schoolName === 'string' && schoolName.trim()) {
      const schoolId = req.schoolId || (row as { schoolId?: string | null }).schoolId || brandingId;
      try {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { id: true, shortName: true },
        });
        if (school) {
          await prisma.school.update({
            where: { id: school.id },
            data: {
              name: schoolName.trim(),
              ...(!school.shortName?.trim() ? { shortName: schoolName.trim() } : {}),
            },
          });
        }
      } catch (syncErr) {
        console.warn('Sync School.name depuis schoolDisplayName:', syncErr);
      }
    }

    // Sync adresse / téléphone / email établissement (fiche School).
    if (
      schoolAddr !== undefined ||
      schoolPh !== undefined ||
      schoolEm !== undefined ||
      schoolWeb !== undefined
    ) {
      const schoolId = req.schoolId || (row as { schoolId?: string | null }).schoolId || brandingId;
      try {
        const school = await prisma.school.findUnique({
          where: { id: schoolId },
          select: { id: true },
        });
        if (school) {
          const schoolPatch: Prisma.SchoolUpdateInput = {};
          if (schoolAddr !== undefined) schoolPatch.address = schoolAddr;
          if (schoolPh !== undefined) schoolPatch.phone = schoolPh;
          if (schoolEm !== undefined) schoolPatch.email = schoolEm;
          if (schoolWeb !== undefined) schoolPatch.website = schoolWeb;
          await prisma.school.update({ where: { id: school.id }, data: schoolPatch });
        }
      } catch (syncErr) {
        console.warn('Sync School.address depuis branding:', syncErr);
      }
    }

    res.json(toPublicShape(row as Parameters<typeof toPublicBrandingShape>[0]));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('PUT /admin/app-branding:', error);
    const status = message.startsWith('Année scolaire invalide') ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

router.post('/app-branding/upload', (req, res, next) => {
  brandingUpload.single('branding')(req, res, (err) => {
    if (err) {
      const message = err instanceof Error ? err.message : 'Upload invalide';
      return res.status(400).json({ error: message });
    }
    next();
  });
}, async (req: SchoolContextRequest, res) => {
  try {
    const appBranding = delegateOr503(res);
    if (!appBranding) return;

    const brandingId = req.schoolId
      ? await brandingIdForSchool(req.schoolId)
      : APP_BRANDING_ID;

    const slot = String(req.query.slot || '').trim();
    if (!isAllowedBrandingSlot(slot)) {
      return res.status(400).json({
        error:
          'Paramètre slot invalide (navigation, login, favicon, studiesDirector ou clé homePageImages)',
      });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Fichier manquant (champ branding)' });
    }

    const fileUrl = await persistUploadedFile(req.file, 'branding', { relative: true });
    const prev = await appBranding.findUnique({ where: { id: brandingId } });

    if (isHomePageImageSlot(slot)) {
      const prevImages = parseHomePageImages(
        (prev as { homePageImages?: unknown } | null)?.homePageImages,
      );
      const oldUrl = prevImages[slot];
      const nextImages = mergeHomePageImageUpdate(prevImages, slot, fileUrl);

      const row = await appBranding.upsert({
        where: { id: brandingId },
        create: {
          id: brandingId,
          schoolId: req.schoolId ?? undefined,
          homePageImages: nextImages as Prisma.InputJsonValue,
        },
        update: { homePageImages: nextImages as Prisma.InputJsonValue },
      });

      if (oldUrl && oldUrl !== fileUrl) {
        await deleteStoredUploadUrl(oldUrl);
      }

      return res.json(toPublicShape(row as Parameters<typeof toPublicBrandingShape>[0]));
    }

    let oldUrl: string | null | undefined;
    if (slot === 'navigation') oldUrl = prev?.navigationLogoUrl ?? undefined;
    else if (slot === 'login') oldUrl = prev?.loginLogoUrl ?? undefined;
    else if (slot === 'favicon') oldUrl = prev?.faviconUrl ?? undefined;
    else oldUrl = (prev as { studiesDirectorPhotoUrl?: string | null } | null)?.studiesDirectorPhotoUrl;

    const update: Prisma.AppBrandingUpdateInput =
      slot === 'navigation'
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
      await deleteStoredUploadUrl(oldUrl);
    }

    res.json(toPublicShape(row as Parameters<typeof toPublicBrandingShape>[0]));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    console.error('POST /admin/app-branding/upload:', error);
    res.status(500).json({ error: message });
  }
});

export default router;
