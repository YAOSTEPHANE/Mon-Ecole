import crypto from 'crypto';
import { uploadAccessSigningMaterial } from './jwt.util';
import {
  blobPathnameFromStoredUrl,
  isSensitiveBlobStoredUrl,
  isVercelBlobUrl,
} from './blob-storage.util';
import {
  isSensitiveUploadPath,
  uploadRelativePathFromStoredUrl,
  normalizeUploadRequestPath,
} from './sensitive-upload-path.util';

const TTL_MS = 15 * 60 * 1000;

function hmacKey(): Buffer {
  return crypto
    .createHash('sha256')
    .update(`upload-access:${uploadAccessSigningMaterial()}`, 'utf8')
    .digest();
}

/**
 * Jeton court pour liens `<a href>` / `<img src>` sur fichiers sensibles (15 min).
 */
export function signUploadAccessToken(relativePath: string): string {
  const path = normalizeUploadRequestPath(relativePath);
  const exp = Date.now() + TTL_MS;
  const payload = `${path}|${exp}`;
  const sig = crypto.createHmac('sha256', hmacKey()).update(payload, 'utf8').digest('base64url');
  return `${exp}.${sig}`;
}

export function verifyUploadAccessToken(relativePath: string, token: string): boolean {
  if (!token?.includes('.')) return false;
  const path = normalizeUploadRequestPath(relativePath);
  const [expStr, sig] = token.split('.', 2);
  if (!sig) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const payload = `${path}|${exp}`;
  const expected = crypto.createHmac('sha256', hmacKey()).update(payload, 'utf8').digest('base64url');
  try {
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Ajoute `?access=` sur les URLs de fichiers sensibles (réponses API). */
export function withUploadAccessQuery(storedUrl: string): string {
  const rel = uploadRelativePathFromStoredUrl(storedUrl);
  if (!rel || !isSensitiveUploadPath(rel)) return storedUrl;

  const token = signUploadAccessToken(rel);
  const sep = storedUrl.includes('?') ? '&' : '?';
  return `${storedUrl}${sep}access=${encodeURIComponent(token)}`;
}

/** Chemin logique signé pour un blob Vercel sensible. */
export function blobAccessLogicalPath(pathname: string): string {
  const clean = pathname.replace(/^\/+/, '');
  return normalizeUploadRequestPath(`/uploads/${clean}`);
}

/**
 * URL utilisable par le client (img, lien).
 * Blobs sensibles : proxy authentifié (jamais l’URL CDN brute).
 * Fichiers locaux sensibles : jeton `?access=` court.
 */
export function resolveStoredFileAccessUrl(storedUrl: string): string {
  if (isSensitiveBlobStoredUrl(storedUrl)) {
    const pathname = blobPathnameFromStoredUrl(storedUrl);
    if (!pathname) return storedUrl;
    const logical = blobAccessLogicalPath(pathname);
    const token = signUploadAccessToken(logical);
    return `/api/upload/blob-content?pathname=${encodeURIComponent(pathname)}&access=${encodeURIComponent(token)}`;
  }
  if (isVercelBlobUrl(storedUrl)) {
    return storedUrl;
  }
  return withUploadAccessQuery(storedUrl);
}
