import axios from 'axios';
import { getApiUrl } from '../config';
import { getStoredToken, clearStoredToken } from '../lib/session';

const api = axios.create({
  baseURL: getApiUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Recalcule la base au cas où EXPO_PUBLIC_API_URL change en hot reload
  config.baseURL = getApiUrl();
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error?.response?.status === 401) {
      await clearStoredToken();
    }
    return Promise.reject(error);
  },
);

export default api;
