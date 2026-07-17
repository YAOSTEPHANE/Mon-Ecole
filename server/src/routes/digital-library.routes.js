"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const prisma_1 = __importDefault(require("../utils/prisma"));
const digital_library_util_1 = require("../utils/digital-library.util");
const upload_file_path_util_1 = require("../utils/upload-file-path.util");
const router = express_1.default.Router();
router.use(auth_middleware_1.authenticate);
function streamResourceFile(res, resource, disposition) {
    const localPath = (0, upload_file_path_util_1.localPathFromUploadUrl)(resource.fileUrl);
    if (!localPath || !(0, upload_file_path_util_1.isPathInsideUploadsRoot)(localPath) || !fs_1.default.existsSync(localPath)) {
        res.status(404).json({ error: 'Fichier introuvable sur le serveur' });
        return;
    }
    const name = resource.fileName || path_1.default.basename(localPath);
    const mime = resource.mimeType || 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(name)}"`);
    res.setHeader('Cache-Control', 'private, no-store');
    fs_1.default.createReadStream(localPath).pipe(res);
}
/** Catalogue accessible selon le rôle de l’utilisateur */
router.get('/resources', async (req, res) => {
    try {
        const role = req.user.role;
        const { kind, q } = req.query;
        const rows = await prisma_1.default.digitalLibraryResource.findMany({
            where: {
                isActive: true,
                ...(kind && typeof kind === 'string' ? { kind: kind } : {}),
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
        const filtered = rows.filter((r) => (0, digital_library_util_1.canRoleAccessDigitalResource)(role, r.allowedRoles));
        res.json(filtered);
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Lecture en ligne (PDF / flux autorisé) */
router.get('/resources/:id/view', async (req, res) => {
    try {
        const resource = await (0, digital_library_util_1.getDigitalResourceForUser)(req.params.id, req.user.id, req.user.role);
        if (!resource)
            return res.status(404).json({ error: 'Ressource introuvable' });
        if (!resource.onlineAccessEnabled) {
            return res.status(403).json({ error: 'L’accès en ligne n’est pas activé pour cette ressource' });
        }
        streamResourceFile(res, resource, 'inline');
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Crée un jeton de téléchargement temporaire */
router.post('/resources/:id/download-grant', async (req, res) => {
    try {
        const resource = await (0, digital_library_util_1.getDigitalResourceForUser)(req.params.id, req.user.id, req.user.role);
        if (!resource)
            return res.status(404).json({ error: 'Ressource introuvable' });
        if (!resource.tempDownloadEnabled) {
            return res.status(403).json({ error: 'Le téléchargement temporaire n’est pas autorisé' });
        }
        const ttlHours = Math.min(Math.max(resource.downloadTtlHours || 48, 1), 168);
        const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
        const token = crypto_1.default.randomBytes(24).toString('hex');
        const grant = await prisma_1.default.digitalLibraryDownloadGrant.create({
            data: {
                resourceId: resource.id,
                userId: req.user.id,
                token,
                expiresAt,
            },
        });
        const base = `${req.protocol}://${req.get('host')}`;
        const apiPrefix = process.env.VERCEL === '1' ? '' : '/api';
        res.status(201).json({
            grantId: grant.id,
            token: grant.token,
            expiresAt: grant.expiresAt,
            downloadUrl: `${base}${apiPrefix}/digital-library/download/${grant.token}`,
            ttlHours,
        });
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
/** Téléchargement via jeton temporaire (utilisateur authentifié, propriétaire du jeton) */
router.get('/download/:token', async (req, res) => {
    try {
        const grant = await prisma_1.default.digitalLibraryDownloadGrant.findUnique({
            where: { token: req.params.token },
            include: { resource: true },
        });
        if (!grant || grant.userId !== req.user.id) {
            return res.status(404).json({ error: 'Lien de téléchargement invalide' });
        }
        if (grant.expiresAt < new Date()) {
            return res.status(410).json({ error: 'Ce lien de téléchargement a expiré' });
        }
        const resource = grant.resource;
        if (!resource.isActive)
            return res.status(404).json({ error: 'Ressource indisponible' });
        if (!(0, digital_library_util_1.canRoleAccessDigitalResource)(req.user.role, resource.allowedRoles)) {
            return res.status(403).json({ error: 'Accès refusé' });
        }
        if (!grant.downloadedAt) {
            await prisma_1.default.digitalLibraryDownloadGrant.update({
                where: { id: grant.id },
                data: { downloadedAt: new Date() },
            });
        }
        streamResourceFile(res, resource, 'attachment');
    }
    catch (error) {
        res.status(500).json({ error: error instanceof Error ? error.message : 'Erreur serveur' });
    }
});
exports.default = router;
//# sourceMappingURL=digital-library.routes.js.map