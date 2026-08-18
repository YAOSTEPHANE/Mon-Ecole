import api from './client';
import { asList } from './parent';

export type DigitalResource = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
  kind?: string | null;
  subject?: string | null;
  level?: string | null;
  fileName?: string | null;
  onlineAccessEnabled?: boolean;
  tempDownloadEnabled?: boolean;
};

export const digitalLibraryApi = {
  list: async (params?: { q?: string; kind?: string }) => {
    const { data } = await api.get('/digital-library/resources', { params });
    return asList<DigitalResource>(data, ['resources', 'items', 'data']);
  },

  requestDownloadGrant: async (id: string) => {
    const { data } = await api.post(`/digital-library/resources/${id}/download-grant`);
    return data as { downloadUrl: string; expiresAt?: string; ttlHours?: number };
  },
};
