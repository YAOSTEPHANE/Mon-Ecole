import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * URL API Express (chemin `/api`).
 * Emulateur Android : 10.0.2.2 → machine hôte.
 * iOS simulateur / Expo Go : localhost.
 * Appareil physique : définir EXPO_PUBLIC_API_URL (IP LAN).
 */
export function getApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');
  if (fromEnv) return fromEnv;

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
}

/** Origine HTTP sans `/api` — Socket.IO. */
export function getRealtimeOrigin(): string {
  const api = getApiUrl();
  try {
    const u = new URL(api);
    return u.origin;
  } catch {
    return api.replace(/\/api$/i, '');
  }
}

export const APP_SCHEME = 'ecoleajour';
export const OAUTH_REDIRECT = `${APP_SCHEME}://oauth`;

export const appName =
  (Constants.expoConfig?.name as string | undefined) || 'École à jour';
