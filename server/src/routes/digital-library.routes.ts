import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Role } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import prisma from '../utils/prisma';
import {
  canRoleAccessDigitalResource,
  getDigitalResourceForUser,
} from '../utils/digital-library.util';
import { isPathInsideUploadsRoot, localPathFromUploadUrl } from '../utils/upload-file-path.util';

const router = express.Router();

router.use(authenticate);

function streamResourceFile(
  res: express.Response,
  resource: { fileUrl: string; fileName?: string | null; mimeType?: string | null },
  disposition: 'inline' | 'attachment',
) {
  const localPath = localPathFromUploadUrl(resource.fileUrl);
  if (!localPath || !isPathInsideUploadsRoot(localPath) || !fs.existsSync(localPath)) {
    res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
    return;
  }
  const name = resource.fileName || path.basename(localPath);
  const mime = resource.mimeType || 'application/octet-stream';
  res.setHeader('Content-Type', mime);
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(name)}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  fs.createReadStream(localPath).pipe(res);
}

/** Catalogue accessible selon le rôle de l’utilisateur */
router.get('/resources', async (req: AuthRequest, res) => {
  try {
    const role = req.user!.role as Role;
    const { kind, q } = req.query;
    const rows = await prisma.digitalLibraryResource.findMany({
      where: {
        isActive: true,
        ...(kind && typeof kind === 'string' ? { kind: kind as never } : {}),
        ...(q && typeof q === 'string' && q.trim()
          ? {
              OR: [
                { title: { contains: q.trim() } },
                { author: { contains: q.trim() } },
                { subject: { contains: q.trim() } },
              ],
            }
          : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        author: true,
        description: true,
        kind: true,
        coverImageUrl: true,
        subject: true,
        level: true,
        onlineAccessEnabled: true,
        tempDownloadEnabled: true,
        downloadTtlHours: true,
        allowedRoles: true,
        publishedAt: true,
        fileName: true,
        mimeType: true,
        fileSizeBytes: true,
      },
    });
    const filtered = rows.filter((r) => canRoleAccessDigitalResource(role, r.allowedRoles));
    res.json(filtered);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

/** Lecture en ligne (PDF / flux autorisé) */
router.get('/resources/:id/view', async (req: AuthRequest, res) => {
  try {
    const resource = await getDigitalResourceForUser(req.params.id, req.user!.id, req.user!.role as Role);
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' });
    if (!resource.onlineAccessEnabled) {
      return res.status(403).json({ error: 'L’accès en ligne n’est pas activé pour cette ressource' });
    }
    streamResourceFile(res, resource, 'inline');
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

/** Crée un jeton de téléchargement temporaire */
router.post('/resources/:id/download-grant', async (req: AuthRequest, res) => {
  try {
    const resource = await getDigitalResourceForUser(req.params.id, req.user!.id, req.user!.role as Role);
    if (!resource) return res.status(404).json({ error: 'Ressource introuvable' });
    if (!resource.tempDownloadEnabled) {
      return res.status(403).json({ error: 'Le téléchargement temporaire n’est pas autorisé' });
    }

    const ttlHours = Math.min(Math.max(resource.downloadTtlHours || 48, 1), 168);
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const token = crypto.randomBytes(24).toString('hex');

    const grant = await prisma.digitalLibraryDownloadGrant.create({
      data: {
        resourceId: resource.id,
        userId: req.user!.id,
        token,
        expiresAt,
      },
    });

    const base = `${req.protocol}://${req.get('host')}`;
    res.status(201).json({
      grantId: grant.id,
      token: grant.token,
      expiresAt: grant.expiresAt,
      downloadUrl: `${base}/api/digital-library/download/${grant.token}`,
      ttlHours,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

/** Téléchargement via jeton temporaire (utilisateur authentifié, propriétaire du jeton) */
router.get('/download/:token', async (req: AuthRequest, res) => {
  try {
    const grant = await prisma.digitalLibraryDownloadGrant.findUnique({
      where: { token: req.params.token },
      include: { resource: true },
    });
    if (!grant || grant.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Lien de téléchargement invalide' });
    }
    if (grant.expiresAt < new Date()) {
      return res.status(410).json({ error: 'Ce lien de téléchargement a expiré' });
    }
    const resource = grant.resource;
    if (!resource.isActive) return res.status(404).json({ error: 'Ressource indisponible' });
    if (!canRoleAccessDigitalResource(req.user!.role as Role, resource.allowedRoles)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    if (!grant.downloadedAt) {
      await prisma.digitalLibraryDownloadGrant.update({
        where: { id: grant.id },
        data: { downloadedAt: new Date() },
      });
    }

    streamResourceFile(res, resource, 'attachment');
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
  }
});

export default router;
