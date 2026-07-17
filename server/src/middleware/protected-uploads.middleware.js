"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protectSensitiveUploads = protectSensitiveUploads;
const jwt_util_1 = require("../utils/jwt.util");
const upload_access_token_util_1 = require("../utils/upload-access-token.util");
const sensitive_upload_path_util_1 = require("../utils/sensitive-upload-path.util");
const upload_access_authorization_util_1 = require("../utils/upload-access-authorization.util");
const prisma_1 = __importDefault(require("../utils/prisma"));
function requestUploadPath(req) {
    const base = (req.baseUrl || '').replace(/\/api\/uploads$/, '/uploads');
    const segment = req.path || req.url.split('?')[0] || '';
    const combined = `${base}${segment}`.replace(/\\/g, '/');
    if (combined.includes('/uploads/')) {
        const idx = combined.indexOf('/uploads/');
        return (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(combined.slice(idx));
    }
    return (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(`/uploads${combined.startsWith('/') ? combined : `/${combined}`}`);
}
async function resolveUserFromBearer(req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return null;
    try {
        const decoded = (0, jwt_util_1.verifyAccessToken)(token);
        const user = await prisma_1.default.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, email: true, role: true, isActive: true },
        });
        if (!user?.isActive)
            return null;
        return { id: user.id, email: user.email, role: user.role };
    }
    catch {
        return null;
    }
}
/**
 * Bloque l’accès anonyme aux pièces d’identité, bulletins d’admission, dossiers RH enseignants.
 * Autorise : jeton signé `?access=` (15 min) ou session Bearer + contrôle métier.
 */
async function protectSensitiveUploads(req, res, next) {
    const uploadPath = requestUploadPath(req);
    if (!(0, sensitive_upload_path_util_1.isSensitiveUploadPath)(uploadPath)) {
        next();
        return;
    }
    const accessToken = typeof req.query.access === 'string'
        ? req.query.access
        : typeof req.query.fileAccess === 'string'
            ? req.query.fileAccess
            : undefined;
    if (accessToken && (0, upload_access_token_util_1.verifyUploadAccessToken)(uploadPath, accessToken)) {
        next();
        return;
    }
    const pathLower = uploadPath.toLowerCase();
    if (pathLower.includes('/identity-documents/')) {
        res.status(401).json({ error: 'Accès au fichier refusé. Connectez-vous ou utilisez un lien valide.' });
        return;
    }
    const user = await resolveUserFromBearer(req);
    if (user && (await (0, upload_access_authorization_util_1.userCanAccessSensitiveUpload)(user, uploadPath))) {
        next();
        return;
    }
    res.status(401).json({ error: 'Accès au fichier refusé. Connectez-vous ou utilisez un lien valide.' });
}
//# sourceMappingURL=protected-uploads.middleware.js.map