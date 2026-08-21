import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './client';

const QUEUE_KEY = 'ecole_offline_queue_v1';
const CACHE_PREFIX = 'ecole_offline_cache:';

export type OfflineQueueItem = {
  id: string;
  createdAt: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  path: string;
  body?: unknown;
  label?: string;
};

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: OfflineQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueOfflineAction(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt'>,
): Promise<OfflineQueueItem> {
  const entry: OfflineQueueItem = {
    ...item,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const q = await getOfflineQueue();
  q.push(entry);
  await saveQueue(q);
  return entry;
}

export async function flushOfflineQueue(): Promise<{ sent: number; failed: number }> {
  const q = await getOfflineQueue();
  if (q.length === 0) return { sent: 0, failed: 0 };
  const remaining: OfflineQueueItem[] = [];
  let sent = 0;
  let failed = 0;
  for (const item of q) {
    try {
      if (item.method === 'post') await api.post(item.path, item.body);
      else if (item.method === 'put') await api.put(item.path, item.body);
      else if (item.method === 'patch') await api.patch(item.path, item.body);
      else if (item.method === 'delete') await api.delete(item.path);
      sent += 1;
    } catch {
      remaining.push(item);
      failed += 1;
    }
  }
  await saveQueue(remaining);
  return { sent, failed };
}

export async function cacheGet<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  try {
    const data = await fetcher();
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch (e) {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (raw) {
      const parsed = JSON.parse(raw) as { data: T };
      return parsed.data;
    }
    throw e;
  }
}

/** Ping réseau simple (pas de NetInfo dans le projet). */
export async function probeOnline(): Promise<boolean> {
  try {
    await api.get('/health', { timeout: 4000 });
    return true;
  } catch {
    try {
      await api.get('/teacher/dashboard/kpis', { timeout: 4000 });
      return true;
    } catch {
      return false;
    }
  }
}
