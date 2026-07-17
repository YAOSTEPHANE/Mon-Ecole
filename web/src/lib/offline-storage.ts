/**
 * Persistance locale (IndexedDB) pour consultation hors ligne des données essentielles.
 * Les clés sont cloisonnées par utilisateur + établissement.
 */

import type { SyncQueueBody } from './offline-formdata';

const DB_NAME = 'gs-offline-v1';
const DB_VERSION = 2;
const STORE = 'kv';
const BLOB_STORE = 'sync-blobs';
const USER_KEY = 'snapshot:user';
const SYNC_QUEUE_KEY = 'sync-queue:items';
const SCOPE_KEY = 'cache-scope';

export type SyncQueueItem = {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: SyncQueueBody;
  headers: Record<string, string>;
  label: string;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
  error?: string;
  retries: number;
};

type CacheScope = { userId: string; schoolId: string };

let activeScope: CacheScope = { userId: '', schoolId: '' };
let dbPromise: Promise<IDBDatabase> | null = null;

export function setOfflineCacheScope(userId: string, schoolId = ''): void {
  activeScope = {
    userId: userId || '',
    schoolId: schoolId || '',
  };
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SCOPE_KEY, JSON.stringify(activeScope));
    } catch {
      /* ignore */
    }
  }
}

export function getOfflineCacheScope(): CacheScope {
  if (activeScope.userId) return activeScope;
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(SCOPE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheScope;
        if (parsed?.userId) {
          activeScope = {
            userId: String(parsed.userId),
            schoolId: String(parsed.schoolId || ''),
          };
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!activeScope.schoolId && typeof window !== 'undefined') {
    activeScope = {
      ...activeScope,
      schoolId: localStorage.getItem('activeSchoolId') || '',
    };
  }
  return activeScope;
}

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB indisponible'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error ?? new Error('IDB open'));
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
        if (!db.objectStoreNames.contains(BLOB_STORE)) {
          db.createObjectStore(BLOB_STORE);
        }
      };
    });
  }
  return dbPromise;
}

async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => resolve((r.result as T) ?? null);
    });
  } catch {
    return null;
  }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

async function idbDelete(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

function scopedKey(base: string): string {
  const scope = getOfflineCacheScope();
  const user = scope.userId || 'anon';
  const school = scope.schoolId || 'noschool';
  return `u:${user}|s:${school}|${base}`;
}

export async function saveUserSnapshot(user: unknown): Promise<void> {
  await idbSet(scopedKey(USER_KEY), user);
}

export async function loadUserSnapshot<T>(): Promise<T | null> {
  return idbGet<T>(scopedKey(USER_KEY));
}

export async function clearUserSnapshot(): Promise<void> {
  await idbDelete(scopedKey(USER_KEY));
}

/** Clé stable pour une requête GET (pathname + query), cloisonnée par session. */
export function apiCacheKey(method: string, pathnameWithSearch: string): string {
  const scope = getOfflineCacheScope();
  const user = scope.userId || 'anon';
  const school = scope.schoolId || 'noschool';
  return `${user}|${school}|${method.toUpperCase()}|${pathnameWithSearch}`;
}

export async function saveApiCacheEntry(key: string, payload: unknown): Promise<void> {
  await idbSet(`api:${key}`, {
    savedAt: Date.now(),
    payload,
  });
}

export async function loadApiCacheEntry<T>(key: string): Promise<{ savedAt: number; payload: T } | null> {
  const raw = await idbGet<{ savedAt: number; payload: T }>(`api:${key}`);
  return raw ?? null;
}

export async function clearApiCacheEntry(key: string): Promise<void> {
  await idbDelete(`api:${key}`);
}

export async function clearAllOfflineCaches(): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORE, BLOB_STORE], 'readwrite');
      tx.objectStore(STORE).clear();
      if (db.objectStoreNames.contains(BLOB_STORE)) {
        tx.objectStore(BLOB_STORE).clear();
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
  activeScope = { userId: '', schoolId: '' };
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SCOPE_KEY);
    } catch {
      /* ignore */
    }
  }
}

export async function saveSyncBlob(blobKey: string, blob: Blob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.objectStore(BLOB_STORE).put(blob, scopedKey(blobKey));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    throw new Error('Impossible d’enregistrer le fichier localement.');
  }
}

export async function loadSyncBlob(blobKey: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const r = tx.objectStore(BLOB_STORE).get(scopedKey(blobKey));
      r.onerror = () => reject(r.error);
      r.onsuccess = () => resolve((r.result as Blob) ?? null);
    });
  } catch {
    return null;
  }
}

export async function deleteSyncBlob(blobKey: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      tx.objectStore(BLOB_STORE).delete(scopedKey(blobKey));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export async function deleteSyncBlobs(blobKeys: string[]): Promise<void> {
  await Promise.all(blobKeys.map((key) => deleteSyncBlob(key)));
}

export async function loadSyncQueueItems(): Promise<SyncQueueItem[]> {
  const items = await idbGet<SyncQueueItem[]>(scopedKey(SYNC_QUEUE_KEY));
  return Array.isArray(items) ? items : [];
}

export async function saveSyncQueueItems(items: SyncQueueItem[]): Promise<void> {
  await idbSet(scopedKey(SYNC_QUEUE_KEY), items);
}

export async function clearSyncQueueItems(): Promise<void> {
  await idbDelete(scopedKey(SYNC_QUEUE_KEY));
}
