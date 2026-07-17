"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportCardClientPhotoUrl = reportCardClientPhotoUrl;
const blob_storage_util_1 = require("./blob-storage.util");
const upload_access_token_util_1 = require("./upload-access-token.util");
/**
 * URL photo utilisable par le front (PDF bulletin) : chemin relatif `/uploads/...`,
 * jeton pour pièces d'identité, ou URL Blob publique.
 */
function reportCardClientPhotoUrl(stored) {
    if (!stored?.trim())
        return null;
    const value = stored.trim();
    if (value.startsWith('data:') || value.startsWith('blob:'))
        return value;
    if ((0, blob_storage_util_1.isVercelBlobUrl)(value))
        return value;
    let pathname = value;
    if (value.startsWith('http://') || value.startsWith('https://')) {
        try {
            pathname = new URL(value).pathname;
        }
        catch {
            return (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(value);
        }
    }
    if (!pathname.startsWith('/'))
        pathname = `/${pathname}`;
    pathname = pathname.replace(/^\/api\/uploads/i, '/uploads');
    if (pathname.includes('/identity-documents/')) {
        return (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(pathname);
    }
    if (pathname.includes('/uploads/')) {
        return pathname;
    }
    return (0, upload_access_token_util_1.resolveStoredFileAccessUrl)(value);
}
//# sourceMappingURL=report-card-photo-url.util.js.map