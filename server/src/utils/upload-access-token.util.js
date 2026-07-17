"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUploadAccessToken = signUploadAccessToken;
exports.verifyUploadAccessToken = verifyUploadAccessToken;
exports.withUploadAccessQuery = withUploadAccessQuery;
exports.resolveStoredFileAccessUrl = resolveStoredFileAccessUrl;
const crypto_1 = __importDefault(require("crypto"));
const jwt_util_1 = require("./jwt.util");
const blob_storage_util_1 = require("./blob-storage.util");
const sensitive_upload_path_util_1 = require("./sensitive-upload-path.util");
const TTL_MS = 15 * 60 * 1000;
function hmacKey() {
    return crypto_1.default
        .createHash('sha256')
        .update(`upload-access:${(0, jwt_util_1.uploadAccessSigningMaterial)()}`, 'utf8')
        .digest();
}
/**
 * Jeton court pour liens `<a href>` / `<img src>` sur fichiers sensibles (15 min).
 */
function signUploadAccessToken(relativePath) {
    const path = (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(relativePath);
    const exp = Date.now() + TTL_MS;
    const payload = `${path}|${exp}`;
    const sig = crypto_1.default.createHmac('sha256', hmacKey()).update(payload, 'utf8').digest('base64url');
    return `${exp}.${sig}`;
}
function verifyUploadAccessToken(relativePath, token) {
    if (!token?.includes('.'))
        return false;
    const path = (0, sensitive_upload_path_util_1.normalizeUploadRequestPath)(relativePath);
    const [expStr, sig] = token.split('.', 2);
    if (!sig)
        return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp < Date.now())
        return false;
    const payload = `${path}|${exp}`;
    const expected = crypto_1.default.createHmac('sha256', hmacKey()).update(payload, 'utf8').digest('base64url');
    try {
        const a = Buffer.from(sig, 'utf8');
        const b = Buffer.from(expected, 'utf8');
        if (a.length !== b.length)
            return false;
        return crypto_1.default.timingSafeEqual(a, b);
    }
    catch {
        return false;
    }
}
/** Ajoute `?access=` sur les URLs de fichiers sensibles (réponses API). */
function withUploadAccessQuery(storedUrl) {
    const rel = (0, sensitive_upload_path_util_1.uploadRelativePathFromStoredUrl)(storedUrl);
    if (!rel || !(0, sensitive_upload_path_util_1.isSensitiveUploadPath)(rel))
        return storedUrl;
    const token = signUploadAccessToken(rel);
    const sep = storedUrl.includes('?') ? '&' : '?';
    return `${storedUrl}${sep}access=${encodeURIComponent(token)}`;
}
/**
 * URL utilisable par le client (img, lien). Blob Vercel : URL CDN directe.
 * Fichiers locaux sensibles : jeton `?access=` court.
 */
function resolveStoredFileAccessUrl(storedUrl) {
    if ((0, blob_storage_util_1.isVercelBlobUrl)(storedUrl)) {
        return storedUrl;
    }
    return withUploadAccessQuery(storedUrl);
}
//# sourceMappingURL=upload-access-token.util.js.map