"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useBlobStorage = useBlobStorage;
exports.assertBlobConfiguredForVercel = assertBlobConfiguredForVercel;
exports.isVercelBlobUrl = isVercelBlobUrl;
exports.blobPathnameFromStoredUrl = blobPathnameFromStoredUrl;
exports.isSensitiveBlobStoredUrl = isSensitiveBlobStoredUrl;
exports.buildSafeUploadFilename = buildSafeUploadFilename;
exports.folderForUploadField = folderForUploadField;
exports.uploadBufferToBlob = uploadBufferToBlob;
exports.deleteBlobByUrl = deleteBlobByUrl;
const path_1 = __importDefault(require("path"));
const blob_1 = require("@vercel/blob");
const SENSITIVE_BLOB_FOLDER_PREFIXES = [
    'identity-documents/',
    'admission-documents/',
    'teacher-admin-documents/',
];
/** Stockage Blob actif (Vercel injecte `BLOB_READ_WRITE_TOKEN` quand un store est lié). */
function useBlobStorage() {
    return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}
function assertBlobConfiguredForVercel() {
    if (process.env.VERCEL === '1' && !useBlobStorage()) {
        throw new Error('BLOB_READ_WRITE_TOKEN manquant. Créez un Blob store dans le projet Vercel (Storage → Blob), puis redéployez.');
    }
}
function isVercelBlobUrl(url) {
    return /\.blob\.vercel-storage\.com/i.test(url);
}
function blobPathnameFromStoredUrl(storedUrl) {
    if (!isVercelBlobUrl(storedUrl))
        return null;
    try {
        const u = new URL(storedUrl);
        return decodeURIComponent(u.pathname.replace(/^\//, ''));
    }
    catch {
        return null;
    }
}
function isSensitiveBlobStoredUrl(storedUrl) {
    const pathname = blobPathnameFromStoredUrl(storedUrl);
    if (!pathname)
        return false;
    const lower = pathname.toLowerCase();
    return SENSITIVE_BLOB_FOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}
function buildSafeUploadFilename(fieldname, originalname) {
    const baseName = path_1.default.basename(originalname).replace(/[^\w.\-()+ ]/g, '_');
    const ext = path_1.default.extname(baseName).toLowerCase().slice(0, 12);
    const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${fieldname}-${uniqueSuffix}${safeExt}`;
}
function folderForUploadField(fieldname) {
    switch (fieldname) {
        case 'avatar':
            return 'avatars';
        case 'assignment':
            return 'assignments';
        case 'course':
            return 'courses';
        case 'identityDocument':
            return 'identity-documents';
        case 'teacherAdminDocument':
            return 'teacher-admin-documents';
        case 'branding':
            return 'branding';
        case 'digitalLibrary':
            return 'digital-library';
        case 'elearning':
            return 'elearning';
        case 'term3ReportCard':
            return 'admission-documents';
        default:
            return 'general';
    }
}
async function uploadBufferToBlob(folder, filename, body, contentType) {
    assertBlobConfiguredForVercel();
    const pathname = `${folder}/${filename}`;
    const result = await (0, blob_1.put)(pathname, body, {
        access: 'public',
        contentType: contentType || 'application/octet-stream',
        addRandomSuffix: false,
    });
    return result.url;
}
async function deleteBlobByUrl(url) {
    if (!isVercelBlobUrl(url))
        return;
    try {
        await (0, blob_1.del)(url);
    }
    catch {
        /* ignore — déjà supprimé ou inaccessible */
    }
}
//# sourceMappingURL=blob-storage.util.js.map