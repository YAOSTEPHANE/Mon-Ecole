import api from './client';

export const authApi = {
  login: async (email: string, password: string, twoFactorCode?: string) => {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
        ...(twoFactorCode ? { twoFactorCode } : {}),
      });
      if (response.data && response.data.user) {
        return response.data;
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('Erreur API login:', error);
      if (error.response) {
        throw error;
      } else {
        throw new Error('Impossible de se connecter au serveur. Vérifiez que le serveur est démarré.');
      }
    }
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
  },
  register: async (data: any) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  updateMe: async (data: any) => {
    const response = await api.put('/auth/me', data);
    return response.data;
  },
  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },
  /** Échange code OAuth → cookie HttpOnly (web). Pas de JWT dans le corps. */
  exchangeOAuthCode: async (code: string): Promise<{ ok?: boolean; token?: string }> => {
    const response = await api.post('/auth/oauth/exchange', { code });
    return response.data as { ok?: boolean; token?: string };
  },
  setupTwoFactor: async () => {
    const response = await api.post('/auth/2fa/setup');
    return response.data as { otpauthUrl: string; qrCodeDataUrl: string };
  },
  verifyTwoFactor: async (code: string) => {
    const response = await api.post('/auth/2fa/verify', { code });
    return response.data as { ok: boolean; enabled: boolean };
  },
  disableTwoFactor: async (password: string) => {
    const response = await api.post('/auth/2fa/disable', { password });
    return response.data as { ok: boolean; enabled: boolean };
  },
  /** Export JSON RGPD (téléchargement navigateur). */
  downloadGdprExport: async (): Promise<Blob> => {
    const response = await api.get('/auth/gdpr/export', { responseType: 'blob' });
    return response.data as Blob;
  },
  requestGdprErasure: async (details?: string) => {
    const response = await api.post('/auth/gdpr/erasure-request', { details });
    return response.data as { message: string };
  },
};
