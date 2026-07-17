import path from 'path';
import { put, del, get } from '@vercel/blob';

const SENSITIVE_BLOB_FOLDER_PREFIXES = [
  'identity-documents/',
  'admission-documents/',
  'teacher-admin-documents/',
] as const;

/** Stockage Blob actif (Vercel injecte `BLOB_READ_WRITE_TOKEN` quand un store est lié). */
export function useBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

export function assertBlobConfiguredForVercel(): void {
  if (process.env.VERCEL === '1' && !useBlobStorage()) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN manquant. Créez un Blob store dans le projet Vercel (Storage → Blob), puis redéployez.',
    );
  }
}

export function isVercelBlobUrl(url: string): boolean {
  return /\.blob\.vercel-storage\.com/i.test(url);
}

export function blobPathnameFromStoredUrl(storedUrl: string): string | null {
  if (!isVercelBlobUrl(storedUrl)) return null;
  try {
    const u = new URL(storedUrl);
    return decodeURIComponent(u.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

export function isSensitiveBlobFolder(folder: string): boolean {
  const normalized = folder.replace(/^\/+|\/+$/g, '').toLowerCase();
  const withSlash = `${normalized}/`;
  return SENSITIVE_BLOB_FOLDER_PREFIXES.some(
    (prefix) => withSlash === prefix || withSlash.startsWith(prefix),
  );
}

export function isSensitiveBlobStoredUrl(storedUrl: string): boolean {
  const pathname = blobPathnameFromStoredUrl(storedUrl);
  if (!pathname) return false;
  const lower = pathname.toLowerCase();
  return SENSITIVE_BLOB_FOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function buildSafeUploadFilename(fieldname: string, originalname: string): string {
  const baseName = path.basename(originalname).replace(/[^\w.\-()+ ]/g, '_');
  const ext = path.extname(baseName).toLowerCase().slice(0, 12);
  const safeExt = /^\.[a-z0-9]+$/.test(ext) ? ext : '';
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${fieldname}-${uniqueSuffix}${safeExt}`;
}

export function folderForUploadField(fieldname: string): string {
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

export async function uploadBufferToBlob(
  folder: string,
  filename: string,
  body: Buffer,
  contentType?: string,
): Promise<string> {
  assertBlobConfiguredForVercel();
  const pathname = `${folder}/${filename}`;
  const sensitive = isSensitiveBlobFolder(folder);
  const contentTypeSafe = contentType || 'application/octet-stream';

  if (sensitive) {
    try {
      const privateResult = await put(pathname, body, {
        access: 'private',
        contentType: contentTypeSafe,
        addRandomSuffix: false,
      });
      return privateResult.url;
    } catch (error) {
      console.warn(
        '[blob] Échec upload privé — configurez un Blob store privé Vercel. Repli public (URL CDN ne sera pas exposée dans les réponses API).',
        error instanceof Error ? error.message : error,
      );
    }
  }

  const result = await put(pathname, body, {
    access: 'public',
    contentType: contentTypeSafe,
    addRandomSuffix: false,
  });
  return result.url;
}

/**
 * Lit un blob (privé d’abord, puis public pour les fichiers legacy).
 */
export async function readBlobContent(pathnameOrUrl: string): Promise<{
  stream: ReadableStream;
  contentType: string;
} | null> {
  const attempts: Array<'private' | 'public'> = isSensitiveBlobStoredUrl(pathnameOrUrl)
    || isSensitiveBlobFolder(pathnameOrUrl.split('/')[0] || '')
    ? ['private', 'public']
    : ['public', 'private'];

  for (const access of attempts) {
    try {
      const result = await get(pathnameOrUrl, { access });
      if (result?.statusCode === 200 && result.stream) {
        return {
          stream: result.stream,
          contentType: result.blob.contentType || 'application/octet-stream',
        };
      }
    } catch {
      /* essayer le mode suivant */
    }
  }
  return null;
}

export async function deleteBlobByUrl(url: string): Promise<void> {
  if (!isVercelBlobUrl(url)) return;
  try {
    await del(url);
  } catch {
    /* ignore — déjà supprimé ou inaccessible */
  }
}
