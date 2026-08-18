import api from './client';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string | null;
  avatar?: string | null;
};

export const authApi = {
  login: async (email: string, password: string, twoFactorCode?: string) => {
    const { data } = await api.post('/auth/login', {
      email,
      password,
      ...(twoFactorCode ? { twoFactorCode } : {}),
    });
    return data as { token: string; user: User; twoFactorEnabled?: boolean };
  },

  getMe: async () => {
    const { data } = await api.get('/auth/me');
    return data as User;
  },

  oauthProviders: async () => {
    const { data } = await api.get('/auth/oauth/providers');
    return data as { google: boolean; microsoft: boolean };
  },

  exchangeOAuthCode: async (code: string) => {
    const { data } = await api.post('/auth/oauth/exchange', { code });
    return data as { token: string };
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* la session locale est quand même effacée */
    }
  },
};
