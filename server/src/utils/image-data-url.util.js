"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchStoredImageAsDataUrl = fetchStoredImageAsDataUrl;
exports.fetchBrandingLogoDataUrl = fetchBrandingLogoDataUrl;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const app_branding_prisma_util_1 = require("./app-branding-prisma.util");
const blob_storage_util_1 = require("./blob-storage.util");
const school_context_util_1 = require("./school-context.util");
const upload_file_path_util_1 = require("./upload-file-path.util");
const MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};
function mimeFromBuffer(buf, ext) {
    if (ext && MIME_BY_EXT[ext])
        return MIME_BY_EXT[ext];
    if (buf.length >= 2 && buf[0] === 0x89 && buf[1] === 0x50)
        return 'image/png';
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8)
        return 'image/jpeg';
    if (buf.length >= 12 &&
        buf.slice(0, 4).toString() === 'RIFF' &&
        buf.slice(8, 12).toString() === 'WEBP') {
        return 'image/webp';
    }
    return 'application/octet-stream';
}
async function readLocalUpload(stored) {
    const localPath = (0, upload_file_path_util_1.localPathFromUploadUrl)(stored) ??
        (stored.startsWith('/')
            ? (0, upload_file_path_util_1.localPathFromUploadUrl)(`http://localhost${stored}`)
            : null);
    if (!localPath)
        return null;
    const buffer = await promises_1.default.readFile(localPath);
    return { buffer, ext: path_1.default.extname(localPath).toLowerCase() };
}
/**
 * Charge une image stockée (Blob, URL HTTP, `/uploads/...`) en data URL pour le PDF côté client.
 */
async function fetchStoredImageAsDataUrl(stored) {
    if (!stored?.trim())
        return null;
    const value = stored.trim();
    if (value.startsWith('data:'))
        return value;
    try {
        let buffer = null;
        let ext = '';
        const local = await readLocalUpload(value);
        if (local) {
            buffer = local.buffer;
            ext = local.ext;
        }
        else if (value.startsWith('http://') || value.startsWith('https://') || (0, blob_storage_util_1.isVercelBlobUrl)(value)) {
            const res = await fetch(value);
            if (!res.ok)
                return null;
            buffer = Buffer.from(await res.arrayBuffer());
            try {
                ext = path_1.default.extname(new URL(value).pathname).toLowerCase();
            }
            catch {
                ext = '';
            }
            const contentType = res.headers.get('content-type')?.split(';')[0]?.trim();
            if (contentType?.startsWith('image/') && buffer.length > 0) {
                return `data:${contentType};base64,${buffer.toString('base64')}`;
            }
        }
        if (!buffer || buffer.length === 0)
            return null;
        const mime = mimeFromBuffer(buffer, ext);
        if (!mime.startsWith('image/'))
            return null;
        return `data:${mime};base64,${buffer.toString('base64')}`;
    }
    catch {
        return null;
    }
}
/** Logo navigation / connexion en data URL (fetch serveur, sans CORS navigateur). */
async function fetchBrandingLogoDataUrl(schoolId) {
    const delegate = (0, app_branding_prisma_util_1.getAppBrandingDelegate)();
    if (!delegate)
        return null;
    const brandingId = schoolId ? await (0, school_context_util_1.brandingIdForSchool)(schoolId) : app_branding_prisma_util_1.APP_BRANDING_ID;
    const row = await delegate.findUnique({ where: { id: brandingId } });
    const logoUrl = row?.loginLogoUrl?.trim() || row?.navigationLogoUrl?.trim() || null;
    return fetchStoredImageAsDataUrl(logoUrl);
}
//# sourceMappingURL=image-data-url.util.js.map