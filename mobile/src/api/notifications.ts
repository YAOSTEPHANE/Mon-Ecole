import api from './client';
import { notificationsPath } from '../lib/roles';

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  content: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
};

export async function fetchNotifications(role: string): Promise<AppNotification[]> {
  const { data } = await api.get(notificationsPath(role));
  return Array.isArray(data) ? data : [];
}

export async function markNotificationRead(role: string, id: string): Promise<void> {
  const base = notificationsPath(role);
  await api.put(`${base}/${id}/read`);
}

export async function markAllNotificationsRead(role: string): Promise<void> {
  const base = notificationsPath(role);
  await api.put(`${base}/read-all`);
}
